'use strict';

/**
 * Importação de Ordem de Produção a partir de PDF — SEM inteligência artificial.
 *
 * Responsabilidades:
 *  - extrair o texto de um PDF digital (PDF.js / pdfjs-dist);
 *  - aplicar regras determinísticas (rótulos + expressões regulares) para
 *    identificar os campos que já existem no cadastro de OP do Linha Tex;
 *  - relacionar as etapas encontradas no documento com as etapas já
 *    cadastradas no estabelecimento (nunca criando etapa por aqui).
 *
 * Nenhum dado é persistido neste serviço — a análise é somente leitura.
 * A persistência acontece apenas no fluxo existente de cadastro de OP.
 */

// PDF.js (pdfjs-dist) — o mesmo motor dos navegadores, na versão legacy
// compatível com o CommonJS do backend. Escolhido porque o pdf-parse traz um
// pdf.js de 2018 que falha em PDFs válidos (inclusive nos gerados pelo próprio
// sistema).
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MB
const TEXTO_MINIMO_CARACTERES = 30; // menos que isso => provável PDF digitalizado (imagem)

function erroImportacao(codigo, mensagem) {
  const err = new Error(mensagem);
  err.codigo = codigo;
  return err;
}

// ─────────────────────────────────────────────────────────────
// Texto
// ─────────────────────────────────────────────────────────────

async function extrairTextoPdf(buffer) {
  if (!buffer || !buffer.length) {
    throw erroImportacao('ARQUIVO_VAZIO', 'O arquivo enviado está vazio.');
  }

  const assinatura = buffer.slice(0, 5).toString('latin1');
  if (assinatura !== '%PDF-') {
    throw erroImportacao(
      'ARQUIVO_INVALIDO',
      'O arquivo enviado não parece ser um PDF válido.'
    );
  }

  let documento;
  try {
    documento = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;
  } catch (e) {
    if (e && e.name === 'PasswordException') {
      throw erroImportacao(
        'PDF_PROTEGIDO',
        'O PDF está protegido por senha. Remova a proteção e tente novamente.'
      );
    }
    throw erroImportacao(
      'PDF_CORROMPIDO',
      'Não foi possível ler o PDF. O arquivo pode estar corrompido.'
    );
  }

  let texto = '';
  let paginas = 0;
  try {
    paginas = documento.numPages;
    for (let p = 1; p <= paginas; p++) {
      const pagina = await documento.getPage(p);
      const conteudo = await pagina.getTextContent();
      texto += montarTextoDaPagina(conteudo) + '\n';
      pagina.cleanup();
    }
  } catch (e) {
    throw erroImportacao(
      'PDF_CORROMPIDO',
      'Não foi possível ler o conteúdo do PDF. O arquivo pode estar corrompido.'
    );
  } finally {
    try {
      await documento.destroy();
    } catch (e) {
      /* libera recursos mesmo se a destruição falhar */
    }
  }

  texto = texto
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (texto.length < TEXTO_MINIMO_CARACTERES) {
    const err = erroImportacao(
      'SEM_TEXTO',
      'O PDF não possui texto selecionável (páginas digitalizadas como imagem). ' +
        'A extração automática por OCR ainda não está disponível — preencha os dados manualmente.'
    );
    err.semTextoExtraivel = true;
    throw err;
  }

  return { texto, paginas, caracteres: texto.length };
}

// Reconstrói o texto de uma página a partir dos itens do PDF.js,
// inserindo quebras de linha quando o eixo Y muda e espaços quando há
// separação horizontal entre trechos (mantém "Label: valor" legível).
function montarTextoDaPagina(conteudo) {
  const itens = (conteudo && conteudo.items) || [];
  let texto = '';
  let linha = '';
  let yAnterior = null;
  let xFim = null;

  for (const item of itens) {
    if (!item || typeof item.str !== 'string') {
      if (item && item.hasEOL) {
        texto += linha + '\n';
        linha = '';
        yAnterior = null;
        xFim = null;
      }
      continue;
    }

    const y = item.transform ? item.transform[5] : null;
    const x = item.transform ? item.transform[4] : null;

    if (yAnterior !== null && y !== null) {
      if (Math.abs(y - yAnterior) > 2) {
        texto += linha + '\n';
        linha = '';
        xFim = null;
      } else if (xFim !== null && x !== null && x - xFim > 0.5 && linha) {
        linha += ' ';
      }
    }

    linha += item.str;
    yAnterior = y;
    xFim = x !== null && typeof item.width === 'number' ? x + item.width : null;

    if (item.hasEOL) {
      texto += linha + '\n';
      linha = '';
      yAnterior = null;
      xFim = null;
    }
  }

  texto += linha;
  return texto;
}

// ─────────────────────────────────────────────────────────────
// Normalização (preserva a posição dos caracteres para permitir
// buscar rótulo em "plano" e ler o valor no texto original)
// ─────────────────────────────────────────────────────────────

function normalizar(texto) {
  return String(texto || '')
    .replace(/[\u00C0-\u024F]/g, (c) => {
      const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return base.length === 1 ? base : c;
    })
    .toLowerCase();
}

function semAcento(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function colapsar(texto) {
  return String(texto || '').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────
// Parsers (devem retornar null quando o valor não for válido)
// ─────────────────────────────────────────────────────────────

const SEM_VALOR = /^(nao definida|nao definido|n\/?d|s\/?i|nenhum|nenhuma|nenhuma observacao|sem informacao|-|—|\.{1,3})$/;

function textoLivre(bruto) {
  let v = colapsar(bruto);
  if (!v) return null;

  // corta se o valor trouxer outro rótulo no meio (ex.: "Camiseta Quantidade: 5")
  const corte = v.search(
    /\s(?:quantidade|descricao|cliente|marca|pedido|valor|preco|entrega|data|tempo|observac|referencia|codigo|op)\s*[:\-–]/i
  );
  if (corte > 0) v = v.slice(0, corte).trim();

  if (v.length < 2) return null;
  if (/^[\d\s.,/:-]+$/.test(v)) return null; // nada só de números/pontuação
  if (SEM_VALOR.test(semAcento(v))) return null;
  if (v.length > 160) v = v.slice(0, 160).trim();
  return v;
}

function inteiroPositivo(bruto) {
  const m = String(bruto || '').match(/\d[\d./,\s]*/);
  if (!m) return null;
  let s = m[0].replace(/\s/g, '');
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(/[.,]/g, '');
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 100000000) return null;
  return n;
}

function moeda(bruto) {
  const m = String(bruto || '').replace(/r\$/gi, ' ').match(/\d[\d.,]*/);
  if (!m) return null;
  const s = m[0];
  let n;
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s)) n = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(s)) n = s.replace(/,/g, ''); // 1,234.56
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) n = s.replace(/\./g, ''); // 1.500
  else if (/^\d+,\d{1,2}$/.test(s)) n = s.replace(',', '.'); // 4,50
  else if (/^\d+\.\d{1,2}$/.test(s)) n = s; // 4.50
  else n = s.replace(/[.,]/g, '');
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0 || v > 10000000) return null;
  return v;
}

function decimal(bruto) {
  const m = String(bruto || '').match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0 || v > 100000) return null;
  return v;
}

const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function dataIso(bruto) {
  const s = semAcento(bruto);
  let d, mes, ano;
  let m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    d = Number(m[1]);
    mes = Number(m[2]);
    ano = Number(m[3]);
  } else {
    m = s.match(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de)?\s+(\d{2,4})/);
    if (!m) return null;
    d = Number(m[1]);
    mes = MESES[m[2]];
    ano = Number(m[3]);
    if (!mes) return null;
  }
  if (ano < 100) ano += ano < 70 ? 2000 : 1900;
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || ano < 2000 || ano > 2100) return null;
  const dt = new Date(Date.UTC(ano, mes - 1, d));
  if (dt.getUTCDate() !== d || dt.getUTCMonth() !== mes - 1) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function observacao(bruto) {
  let v = colapsar(bruto);
  if (!v) return null;
  if (SEM_VALOR.test(semAcento(v))) return null;
  if (/^[:\-–|]+$/.test(v)) return null;
  if (v.length > 500) v = v.slice(0, 500).trim();
  return v;
}

// ─────────────────────────────────────────────────────────────
// Busca por rótulo (label:) — devolve o valor lido da linha,
// ou da linha seguinte quando o rótulo estiver sozinho na linha
// ─────────────────────────────────────────────────────────────

function extrairPorRotulo(plano, texto, fontes, parser) {
  for (const fonte of fontes) {
    const re = new RegExp(fonte, 'gi');
    let m;
    while ((m = re.exec(plano)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const inicio = m.index + m[0].length;
      const nl = texto.indexOf('\n', inicio);
      const fim = nl === -1 ? texto.length : nl;
      const resto = texto.slice(inicio, fim);

      let valor = parser(resto);
      if (valor === null && resto.trim() === '') {
        const seguintes = texto.slice(fim + 1).split('\n');
        for (const linha of seguintes) {
          if (!linha.trim()) continue;
          valor = parser(linha);
          break;
        }
      }
      if (valor !== null && valor !== undefined) return valor;
    }
  }
  return null;
}

// rótulos que NÃO podem servir de "descrição" (ex.: "Valor por Peça:", "Quantidade de Peças:")
const NAO_E_DESCRICAO = '(?<!\\b(?:por|da|de|do|no|na|em|com)\\s)';

// ─────────────────────────────────────────────────────────────
// Extração dos campos
// ─────────────────────────────────────────────────────────────

function extrairDadosOp(texto, etapasEstabelecimento = []) {
  const plano = normalizar(texto);

  const campos = {
    descricao: null,
    quantidade_pecas: null,
    valor_peca: null,
    data_entrega: null,
    pedido_por: null,
    tempo_padrao: null,
    observacoes: null,
  };

  const informacoes = {
    numero_op: null,
    referencia: null,
  };

  // Número da OP (não possui campo próprio: o id_da_op é gerado pelo sistema)
  informacoes.numero_op = extrairPorRotulo(
    plano,
    texto,
    [
      '\\bordem\\s+de\\s+producao\\s*(?:n[\\u00ba\\u00b0o.]*)?\\s*[:\\-#]?\\s*',
      '\\b(?:n[\\u00ba\\u00b0o]?\\s*da\\s*op|op)\\s*(?:n[\\u00ba\\u00b0o.]*)?\\s*[:\\-#]\\s*',
      '\\bop\\s+',
    ],
    inteiroPositivo
  );

  // Referência / código do produto (sem campo próprio — apenas informativo)
  informacoes.referencia = extrairPorRotulo(
    plano,
    texto,
    [
      'referencia\\s*(?:do\\s*produto|da\\s*peca)?\\s*[:\\-#.]\\s*',
      '\\bref\\.?\\s*[:\\-#]\\s*',
      'codigo\\s*(?:do\\s*produto|do\\s*item|de\\s*referencia|peca)?\\s*[:\\-#.]\\s*',
      '\\bcod\\.?\\s*[:\\-#]\\s*',
    ],
    textoLivre
  );

  // Descrição da peça
  campos.descricao = extrairPorRotulo(
    plano,
    texto,
    [
      'descricao\\s*(?:da|do|de)?\\s*(?:peca|produto|item|ordem)?\\s*[:\\-–]\\s*',
      `${NAO_E_DESCRICAO}\\b(?:pecas|peca|produto|modelo|item)\\s*[:\\-–]\\s*`,
    ],
    textoLivre
  );

  // Quantidade de peças
  campos.quantidade_pecas = extrairPorRotulo(
    plano,
    texto,
    [
      'quantidade\\s*(?:total\\s*)?(?:de\\s*)?(?:pecas|peca|unidades|itens|pares)?\\s*[:\\-–]\\s*',
      '\\bqtde?\\s*[:\\-–]\\s*',
      'n[\\u00ba\\u00b0o]?\\s*de\\s*(?:pecas|peca|unidades)\\s*[:\\-–]\\s*',
      '\\b(?:pecas|pares|unidades)\\s*[:\\-–]\\s*',
    ],
    inteiroPositivo
  );

  // "500 peças" / "500 pçs" quando não houver rótulo explícito
  if (campos.quantidade_pecas === null) {
    const m = plano.match(
      /(\d[\d./,\s]*)\s*(?:unid(?:ades)?|un|pca[s]?|peca[s]?|pares|itens)\b/
    );
    if (m) {
      const v = inteiroPositivo(texto.slice(m.index, m.index + m[0].length));
      if (v !== null) campos.quantidade_pecas = v;
    }
  }

  // Valor da peça
  campos.valor_peca = extrairPorRotulo(
    plano,
    texto,
    [
      'valor\\s*(?:unitario|por\\s*peca|da\\s*peca|total)?\\s*[:\\-–]\\s*',
      'preco\\s*(?:unitario|da\\s*peca)?\\s*[:\\-–]\\s*',
    ],
    moeda
  );

  // Data de entrega
  campos.data_entrega = extrairPorRotulo(
    plano,
    texto,
    [
      'data\\s*de\\s*entrega\\s*[:\\-–]\\s*',
      'previsao\\s*de\\s*entrega\\s*[:\\-–]\\s*',
      '\\bentrega\\s*[:\\-–]\\s*',
      'data\\s*limite\\s*[:\\-–]\\s*',
    ],
    dataIso
  );

  // Cliente / marca (pedido_por)
  campos.pedido_por = extrairPorRotulo(
    plano,
    texto,
    [
      'pedido\\s*por\\s*[:\\-–]\\s*',
      '\\bcliente\\s*[:\\-–]\\s*',
      '\\bmarca\\s*[:\\-–]\\s*',
      'comprador\\s*[:\\-–]\\s*',
    ],
    textoLivre
  );

  // Tempo padrão (min)
  campos.tempo_padrao = extrairPorRotulo(
    plano,
    texto,
    [
      'tempo\\s*padrao\\s*\\(?\\s*min\\)?\\s*[:\\-–]\\s*',
      'tempo\\s*padrao\\s*[:\\-–]\\s*',
      'tempo\\s*medio\\s*(?:min)?\\s*[:\\-–]\\s*',
    ],
    decimal
  );

  // Observações
  campos.observacoes = extrairPorRotulo(
    plano,
    texto,
    ['observacoes?\\s*[:\\-–]\\s*', '\\bobs\\.?\\s*[:\\-–]\\s*'],
    observacao
  );

  const etapas = identificarEtapas(texto, etapasEstabelecimento);

  const camposNaoEncontrados = Object.keys(campos).filter(
    (k) => campos[k] === null || campos[k] === undefined
  );

  return {
    campos,
    camposNaoEncontrados,
    informacoes,
    etapas: etapas.encontradas,
    etapasNaoReconhecidas: etapas.naoReconhecidas,
  };
}

// ─────────────────────────────────────────────────────────────
// Etapas: relaciona com as etapas já cadastradas no
// estabelecimento (nunca cria etapa duplicada por aqui)
// ─────────────────────────────────────────────────────────────

function identificarEtapas(texto, etapasEstabelecimento) {
  const plano = normalizar(texto);

  const base = (Array.isArray(etapasEstabelecimento) ? etapasEstabelecimento : [])
    .filter((e) => e && e.descricao)
    .map((e) => ({
      id_da_funcao: e.id_da_funcao,
      descricao: e.descricao,
      chave: semAcento(e.descricao).replace(/\s+/g, ' ').trim().toLowerCase(),
      tempo_padrao: e.tempo_padrao ?? null,
    }))
    .filter((e) => e.chave);

  const encontradas = [];
  const trechosOcupados = [];

  // primeiro os nomes mais longos, para não perder "Costura Reto" por "Costura"
  const ordenadas = [...base].sort((a, b) => b.chave.length - a.chave.length);
  for (const et of ordenadas) {
    let inicio = 0;
    let idx = -1;
    while ((idx = plano.indexOf(et.chave, inicio)) !== -1) {
      const fim = idx + et.chave.length;
      const antes = idx === 0 ? ' ' : plano[idx - 1];
      const depois = fim >= plano.length ? ' ' : plano[fim];
      const borda = !/[a-z0-9]/.test(antes) && !/[a-z0-9]/.test(depois);
      const sobreposto = trechosOcupados.some(([a, b]) => idx < b && fim > a);
      if (borda && !sobreposto) {
        trechosOcupados.push([idx, fim]);
        encontradas.push({ ...et, indice: idx, tempo_documento: tempoProximo(plano, fim) });
        break;
      }
      inicio = idx + 1;
    }
  }
  encontradas.sort((a, b) => a.indice - b.indice);

  const secao = lerSecaoDeEtapas(plano, texto);
  const naoReconhecidas = [];
  if (secao) {
    const partes = secao.conteudo
      .split(/\s*(?:→|->|=>|>|»|\||,|;|\n|\d+[.)])\s*/)
      .map((p) => colapsar(p))
      .filter((p) => p.length >= 3 && p.length <= 60)
      .slice(0, 20);

    for (const parte of partes) {
      const chave = semAcento(parte).toLowerCase();
      if (base.some((b) => b.chave === chave || chave.includes(b.chave))) continue; // já coberta acima
      if (naoReconhecidas.includes(parte)) continue;
      naoReconhecidas.push(parte);
      if (naoReconhecidas.length >= 12) break;
    }
  }

  return {
    encontradas: encontradas.map(({ indice, ...resto }) => resto),
    naoReconhecidas,
  };
}

// procura "2 min" / "(3,5 min)" logo após a etapa no documento
function tempoProximo(plano, fim) {
  const trecho = plano.slice(fim, fim + 40);
  const m = trecho.match(/^\s*[\(:\-–]?\s*(\d+(?:[.,]\d+)?)\s*(?:min|m)\b/);
  if (!m) return null;
  const v = Number(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

// localiza o bloco "Etapas:" / "Processo de Produção:" e devolve o conteúdo
function lerSecaoDeEtapas(plano, texto) {
  const re =
    /(?:^|\n)[ \t]*(?:etapas?(?:\s*de\s*producao)?|processo(?:\s*de\s*producao)?|roteiro(?:\s*de\s*producao)?|sequencia(?:\s*de\s*producao)?|linha\s*de\s*producao)[ \t]*[:\-–]?[ \t]*/i;
  const m = re.exec(plano);
  if (!m) return null;

  const inicio = m.index + m[0].length;
  const fimLinha = texto.indexOf('\n', inicio);
  const linhas = [];

  const mesmaLinha = texto.slice(inicio, fimLinha === -1 ? texto.length : fimLinha).trim();
  if (mesmaLinha) linhas.push(mesmaLinha);

  let cursor = fimLinha === -1 ? texto.length : fimLinha + 1;
  while (linhas.length < 12 && cursor < texto.length) {
    const nl = texto.indexOf('\n', cursor);
    const linha = texto.slice(cursor, nl === -1 ? texto.length : nl);
    if (!linha.trim()) break; // bloco encerra em linha vazia
    if (/^\s*\w+\s*[:\-]\s*\S/.test(linha) && linhas.length > 0) break; // novo rótulo
    if (linha.trim()) linhas.push(linha.trim());
    if (nl === -1) break;
    cursor = nl + 1;
  }

  const conteudo = linhas.join('\n').trim();
  if (!conteudo) return null;
  return { conteudo };
}

module.exports = {
  extrairTextoPdf,
  extrairDadosOp,
  identificarEtapas,
  normalizar,
  TAMANHO_MAXIMO_BYTES,
  TEXTO_MINIMO_CARACTERES,
};
