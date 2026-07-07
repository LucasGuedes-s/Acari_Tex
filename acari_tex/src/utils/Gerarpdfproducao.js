/**
 * gerarPdfProducao.js
 * ─────────────────────────────────────────────────────────────────────────
 * Geração do PDF de "Relatório de Produção".
 *
 * Responsabilidade única deste arquivo: receber um objeto de dados JÁ
 * MONTADO (ver formato abaixo) e desenhar o PDF. Nenhuma função aqui busca
 * dados da tela, da store ou de qualquer API — tudo chega por parâmetro.
 *
 * Formato esperado de `dados`:
 * {
 *   emitidoEm: Date,
 *   estabelecimento: string,        // opcional
 *   dataProducao: 'YYYY-MM-DD',     // opcional
 *   turno: string,                  // opcional ("Manhã" | "Tarde")
 *   observacoesGerais: string,      // opcional
 *   ops: [
 *     {
 *       numero: string,             // id_da_op
 *       titulo: string,             // descrição/produto
 *       cliente: string,            // opcional, só entra se existir
 *       meta: number,
 *       producaoRealizada: number,
 *       funcionariosAlocados: number,
 *       eficienciaFicha: number,        // %
 *       eficienciaReferencia: number,   // %
 *       tempoUtilizado: number,         // minutos — usado só para montar a
 *                                       // explicação do cálculo, não vira
 *                                       // mais um "indicador" no PDF
 *       observacoes: string,            // opcional
 *
 *       // Opcional: produção separada por turno. Quando presentes, cada
 *       // um tem o MESMO formato do resumo da OP (producaoRealizada,
 *       // funcionariosAlocados, eficienciaFicha, eficienciaReferencia,
 *       // tempoUtilizado). Se nenhum dos dois vier preenchido, a seção
 *       // "Produção por Turno" simplesmente não é desenhada.
 *       manha: { producaoRealizada, funcionariosAlocados, eficienciaFicha, eficienciaReferencia, tempoUtilizado },
 *       tarde: { producaoRealizada, funcionariosAlocados, eficienciaFicha, eficienciaReferencia, tempoUtilizado },
 *
 *       funcionarios: [
 *         {
 *           nome, etapa,
 *           tempoUtilizado,              // minutos
 *           tempoReferencia,             // minutos (ref. individual ou padrão) — SAM, exibido com casas decimais
 *           producaoRealizada,
 *           eficienciaFicha, eficienciaReferencia, // %
 *         }
 *       ],
 *       etapas: [
 *         { descricao, tempoPadrao, tempoUtilizado, funcionariosAlocados, producao, eficiencia }
 *         // tempoPadrao é o SAM da etapa e é exibido com casas decimais
 *         // (ex.: "0,85 min"), nunca arredondado para minuto inteiro.
 *       ],
 *     }
 *   ]
 * }
 *
 * Observação: os campos capacidadeFicha/capacidadeReferencia/tempoDisponivel/
 * ocupacao ainda são aceitos no objeto `dados` (por compatibilidade), mas
 * não são mais exibidos no relatório — o relatório foi simplificado para
 * focar em produção e eficiência.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '@/assets/Logo.png'
import { FORMULA_EFICIENCIA_TEXTO, FORMULA_EFICIENCIA_EXPLICACAO } from '@/utils/calculosProducao'

/* ============================================================
 * CONSTANTES DE LAYOUT E ESTILO
 * ============================================================ */
const PAGINA = { largura: 210, altura: 297 } // A4 em mm

const MARGEM = 14
const LARGURA_UTIL = PAGINA.largura - MARGEM * 2
const ALTURA_CABECALHO = 32
const ALTURA_RODAPE = 16

const COR = {
  primaria: [13, 102, 50],
  primariaEscura: [8, 77, 36],
  primariaClara: [231, 248, 239],
  texto: [5, 46, 20],
  textoSuave: [100, 143, 115],
  linha: [220, 238, 227],
  branco: [255, 255, 255],
  fundoCard: [247, 252, 249],
  alto: [12, 107, 52],
  medio: [138, 106, 0],
  baixo: [177, 38, 38],
}

/* ============================================================
 * FUNÇÃO PRINCIPAL (única exportação pública)
 * ============================================================ */
export async function gerarPdfProducao(dados) {
  const logo = await carregarImagem(logoUrl).catch(() => null)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const contexto = { dados, logo }

  desenharFundoDePagina(doc, contexto)
  let y = ALTURA_CABECALHO + 10

  y = desenharFormulaUtilizada(doc, contexto, y)

  const ops = Array.isArray(dados.ops) ? dados.ops : []

  if (!ops.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...COR.textoSuave)
    doc.text('Nenhuma OP ativa para este dia.', MARGEM, y)
  }

  ops.forEach((op, index) => {
    if (index > 0) {
      doc.addPage()
      desenharFundoDePagina(doc, contexto)
      y = ALTURA_CABECALHO + 10
    }
    y = desenharSecaoOp(doc, contexto, op, y)
  })

  if (dados.observacoesGerais) {
    y = verificarQuebraDePagina(doc, contexto, y, 30)
    desenharObservacoes(doc, y, 'Observações Gerais', dados.observacoesGerais)
  }

  finalizarRodapes(doc, contexto)
  doc.save(montarNomeArquivo(dados))
}

/* ============================================================
 * CABEÇALHO / MARCA D'ÁGUA / RODAPÉ (repetidos em todas as páginas)
 * ============================================================ */
function desenharFundoDePagina(doc, contexto) {
  desenharMarcaDagua(doc, contexto)
  desenharCabecalho(doc, contexto)
}

function desenharCabecalho(doc, { dados, logo }) {
  doc.setFillColor(...COR.primaria)
  doc.rect(0, 0, PAGINA.largura, ALTURA_CABECALHO, 'F')
  doc.setFillColor(...COR.primariaEscura)
  doc.rect(0, ALTURA_CABECALHO, PAGINA.largura, 1.2, 'F')

  let xTexto = MARGEM
  if (logo) {
    const alturaLogo = 16
    const larguraLogo = alturaLogo * (logo.width / logo.height || 1)
    doc.addImage(logo, 'PNG', MARGEM, (ALTURA_CABECALHO - alturaLogo) / 2, larguraLogo, alturaLogo)
    xTexto = MARGEM + larguraLogo + 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COR.branco)
  doc.text('Relatório de Produção', xTexto, 14)

  const linhasSubtitulo = []
  if (dados.estabelecimento) linhasSubtitulo.push(`Estabelecimento: ${dados.estabelecimento}`)
  if (dados.dataProducao) linhasSubtitulo.push(`Data da produção: ${formatarData(dados.dataProducao)}`)
  if (dados.turno) linhasSubtitulo.push(`Turno: manhã/tarde`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(linhasSubtitulo.join('   •   '), xTexto, 21)

  const emissao = dados.emitidoEm instanceof Date ? dados.emitidoEm : new Date()
  doc.setFontSize(8)
  doc.text(`Emitido em ${formatarDataHora(emissao)}`, PAGINA.largura - MARGEM, 14, { align: 'right' })
}

function desenharMarcaDagua(doc, { logo }) {
  if (!logo) return

  const largura = 130
  const altura = largura * (logo.height / logo.width || 1)
  const x = (PAGINA.largura - largura) / 2
  const y = (PAGINA.altura - altura) / 2

  doc.saveGraphicsState()
  try {
    if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.06 }))
  } catch (erro) {
    // Ambientes sem suporte a GState seguem sem opacidade reduzida —
    // preferível a quebrar a geração do PDF por causa do efeito visual.
  }
  doc.addImage(logo, 'PNG', x, y, largura, altura)
  doc.restoreGraphicsState()
}

function finalizarRodapes(doc, contexto) {
  const total = doc.internal.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina)
    desenharRodape(doc, contexto, pagina, total)
  }
}

function desenharRodape(doc, contexto, pagina, total) {
  const y = PAGINA.altura - 10

  doc.setDrawColor(...COR.linha)
  doc.setLineWidth(0.3)
  doc.line(MARGEM, y - 4, PAGINA.largura - MARGEM, y - 4)

  const emissao = contexto.dados.emitidoEm instanceof Date ? contexto.dados.emitidoEm : new Date()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COR.textoSuave)
  doc.text(`Gerado em ${formatarDataHora(emissao)}`, MARGEM, y)
  doc.text(`Página ${pagina} de ${total}`, PAGINA.largura - MARGEM, y, { align: 'right' })
}

/* ============================================================
 * QUEBRA DE PÁGINA MANUAL (para conteúdo fora do autoTable)
 * ============================================================ */
function verificarQuebraDePagina(doc, contexto, y, alturaNecessaria) {
  const limite = PAGINA.altura - ALTURA_RODAPE - 6
  if (y + alturaNecessaria <= limite) return y

  doc.addPage()
  desenharFundoDePagina(doc, contexto)
  return ALTURA_CABECALHO + 10
}

/* ============================================================
 * SEÇÃO DE UMA OP (info + cards + tabelas + observações)
 * ============================================================ */
function desenharSecaoOp(doc, contexto, op, yInicial) {
  let y = yInicial

  y = verificarQuebraDePagina(doc, contexto, y, 18)
  doc.setFillColor(...COR.primariaClara)
  doc.roundedRect(MARGEM, y, LARGURA_UTIL, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COR.primariaEscura)
  doc.text(`OP ${op.numero ?? '—'} · ${op.titulo || 'Sem descrição'}`, MARGEM + 4, y + 8)
  y += 18

  y = verificarQuebraDePagina(doc, contexto, y, 26)
  y = desenharTituloSecao(doc, 'Informações da OP', y)
  y = desenharInformacoes(doc, contexto, montarInformacoesOp(op), y) + 4

  y = verificarQuebraDePagina(doc, contexto, y, 34)
  y = desenharTituloSecao(doc, 'Resumo Geral', y)
  y = desenharCards(doc, contexto, montarCardsResumo(op), y) + 4

  if (op.funcionarios?.length) {
    y = verificarQuebraDePagina(doc, contexto, y, 20)
    y = desenharTituloSecao(doc, 'Funcionários', y)
    y = desenharTabelaFuncionarios(doc, contexto, op, y) + 6
  }

  if (op.etapas?.length) {
    y = verificarQuebraDePagina(doc, contexto, y, 20)
    y = desenharTituloSecao(doc, 'Etapas', y)
    y = desenharTabelaEtapas(doc, contexto, op, y) + 6
  }

  if (op.observacoes) {
    y = verificarQuebraDePagina(doc, contexto, y, 24)
    y = desenharObservacoes(doc, y, 'Observações', op.observacoes)
  }

  return y
}

function desenharTituloSecao(doc, texto, y) {
  doc.setFillColor(...COR.primaria)
  doc.rect(MARGEM, y, 2.2, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...COR.texto)
  doc.text(texto, MARGEM + 5, y + 5)
  return y + 11
}

/**
 * Seção "Fórmula utilizada" — exibida uma única vez, logo abaixo do
 * cabeçalho, antes de qualquer OP. Deixa explícito para quem lê o
 * relatório exatamente como a eficiência foi calculada, evitando
 * qualquer dúvida sobre a origem dos percentuais mostrados adiante.
 */
function desenharFormulaUtilizada(doc, contexto, yInicial) {
  let y = verificarQuebraDePagina(doc, contexto, yInicial, 30)
  y = desenharTituloSecao(doc, 'Fórmula utilizada', y)

  doc.setFillColor(...COR.fundoCard)
  doc.setDrawColor(...COR.linha)
  const alturaCaixa = 12
  doc.roundedRect(MARGEM, y, LARGURA_UTIL, alturaCaixa, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COR.primariaEscura)
  doc.text(FORMULA_EFICIENCIA_TEXTO, MARGEM + 4, y + 7.5, { maxWidth: LARGURA_UTIL - 8 })

  y += alturaCaixa + 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COR.textoSuave)
  FORMULA_EFICIENCIA_EXPLICACAO.forEach(linha => {
    y = verificarQuebraDePagina(doc, contexto, y, 6)
    const linhasQuebradas = doc.splitTextToSize(`•  ${linha}`, LARGURA_UTIL)
    doc.text(linhasQuebradas, MARGEM, y)
    y += linhasQuebradas.length * 4.2
  })

  return y + 4
}

/* ── Informações da OP (grade de 2 colunas) ────────────────── */
function montarInformacoesOp(op) {
  const linhas = [
    { label: 'Número da OP', valor: op.numero },
    { label: 'Produto / Descrição', valor: op.titulo },
    { label: 'Cliente', valor: op.cliente },
    { label: 'Quantidade (meta do dia)', valor: formatarQtd(op.meta) },
    { label: 'Produção realizada', valor: formatarQtd(op.producaoRealizada) },
    { label: 'Funcionários alocados', valor: formatarNumero(op.funcionariosAlocados) },
    { label: 'Tempo disponível', valor: formatarMinutos(op.tempoDisponivel) },
    { label: 'Tempo utilizado', valor: formatarMinutos(op.tempoUtilizado) },
  ]
  return linhas.filter(l => l.valor !== undefined && l.valor !== null && l.valor !== '')
}

function desenharInformacoes(doc, contexto, itens, yInicial) {
  const colunas = 2
  const larguraColuna = LARGURA_UTIL / colunas
  const alturaLinha = 9
  let y = yInicial

  itens.forEach((item, i) => {
    const coluna = i % colunas
    if (coluna === 0) y = verificarQuebraDePagina(doc, contexto, y, alturaLinha)
    if (coluna === 0 && i > 0) y += alturaLinha

    const x = MARGEM + coluna * larguraColuna

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...COR.textoSuave)
    doc.text(item.label, x, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...COR.texto)
    doc.text(String(item.valor), x, y + 4.8)
  })

  return y + alturaLinha
}

/* ── Resumo Geral (cards) ───────────────────────────────────── */
function montarCardsResumo(op) {
  const cards = [
    { label: 'Produção prevista', valor: formatarQtd(op.meta) },
    { label: 'Produção realizada', valor: formatarQtd(op.producaoRealizada) },
    { label: 'Eficiência (Ficha)', valor: formatarPct(op.eficienciaFicha), tipo: 'eficiencia', bruto: op.eficienciaFicha },
    { label: 'Eficiência (Referência)', valor: formatarPct(op.eficienciaReferencia), tipo: 'eficiencia', bruto: op.eficienciaReferencia },
    { label: 'Funcionários', valor: formatarNumero(op.funcionariosAlocados) },
    { label: 'Capacidade (Ficha)', valor: formatarQtd(op.capacidadeFicha) },
    { label: 'Tempo disponível', valor: formatarMinutos(op.tempoDisponivel) },
    { label: 'Tempo utilizado', valor: formatarMinutos(op.tempoUtilizado) },
    { label: 'Ocupação', valor: formatarPct(op.ocupacao), tipo: 'eficiencia', bruto: op.ocupacao },
  ]
  return cards.filter(c => c.valor !== undefined && c.valor !== null && c.valor !== '')
}

function desenharCards(doc, contexto, cards, yInicial) {
  const porLinha = 4
  const espaco = 3
  const larguraCard = (LARGURA_UTIL - espaco * (porLinha - 1)) / porLinha
  const alturaCard = 20
  let y = yInicial

  cards.forEach((card, i) => {
    const coluna = i % porLinha
    if (coluna === 0) y = verificarQuebraDePagina(doc, contexto, y, alturaCard)
    if (coluna === 0 && i > 0) y += alturaCard + espaco

    const x = MARGEM + coluna * (larguraCard + espaco)

    doc.setFillColor(...COR.fundoCard)
    doc.setDrawColor(...COR.linha)
    doc.roundedRect(x, y, larguraCard, alturaCard, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COR.textoSuave)
    doc.text(card.label, x + 3, y + 6, { maxWidth: larguraCard - 6 })

    const cor = card.tipo === 'eficiencia' ? corPorEficiencia(card.bruto) : COR.texto
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...cor)
    doc.text(String(card.valor), x + 3, y + 15.5)
  })

  return y + alturaCard
}

function corPorEficiencia(pct) {
  const valor = Number(pct) || 0
  if (valor >= 100) return COR.alto
  if (valor >= 75) return COR.medio
  if (valor > 0) return COR.baixo
  return COR.textoSuave
}

/* ── Tabelas (jspdf-autotable) ──────────────────────────────── */
function desenharTabelaFuncionarios(doc, contexto, op, yInicial) {
  const corpo = op.funcionarios.map(f => [
    f.nome || '—',
    f.etapa || '—',
    formatarMinutos(f.tempoUtilizado),
    formatarMinutos(f.tempoReferencia),
    formatarQtd(f.producaoRealizada),
    formatarPct(f.eficienciaFicha),
    formatarPct(f.eficienciaReferencia),
  ])

  autoTable(doc, {
    startY: yInicial,
    margin: { left: MARGEM, right: MARGEM, top: ALTURA_CABECALHO + 6, bottom: ALTURA_RODAPE + 6 },
    styles: { fontSize: 8.5, cellPadding: 2.6, textColor: COR.texto, lineColor: COR.linha, lineWidth: 0.1 },
    alternateRowStyles: { fillColor: COR.fundoCard },
    theme: 'striped',
    head: [['Funcionário', 'Etapa', 'Tempo utilizado', 'Tempo ref./padrão', 'Produção', 'Efic. Ficha', 'Efic. Ref.']],
    body: corpo,
    headStyles: { fillColor: COR.primaria, textColor: COR.branco, fontStyle: 'bold' },
    didDrawPage: () => desenharFundoDePagina(doc, contexto),
  })

  return doc.lastAutoTable.finalY
}

function desenharTabelaEtapas(doc, contexto, op, yInicial) {
  const corpo = op.etapas.map(e => [
    e.descricao || '—',
    formatarMinutos(e.tempoPadrao),
    formatarMinutos(e.tempoUtilizado),
    formatarNumero(e.funcionariosAlocados),
    formatarQtd(e.producao),
    formatarPct(e.eficiencia),
  ])

  autoTable(doc, {
    startY: yInicial,
    margin: { left: MARGEM, right: MARGEM, top: ALTURA_CABECALHO + 6, bottom: ALTURA_RODAPE + 6 },
    styles: { fontSize: 8.5, cellPadding: 2.6, textColor: COR.texto, lineColor: COR.linha, lineWidth: 0.1 },
    alternateRowStyles: { fillColor: COR.fundoCard },
    theme: 'striped',
    head: [['Etapa', 'Tempo padrão', 'Tempo utilizado', 'Funcionários', 'Produção', 'Eficiência']],
    body: corpo,
    headStyles: { fillColor: COR.primariaEscura, textColor: COR.branco, fontStyle: 'bold' },
    didDrawPage: () => desenharFundoDePagina(doc, contexto),
  })

  return doc.lastAutoTable.finalY
}

/* ── Observações ────────────────────────────────────────────── */
function desenharObservacoes(doc, yInicial, titulo, texto) {
  let y = desenharTituloSecao(doc, titulo, yInicial)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...COR.texto)
  const linhas = doc.splitTextToSize(texto, LARGURA_UTIL)
  doc.text(linhas, MARGEM, y)
  return y + linhas.length * 5 + 4
}

/* ============================================================
 * HELPERS GERAIS
 * ============================================================ */
function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function formatarNumero(v) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '0'
  return Number(v).toLocaleString('pt-BR')
}

function formatarQtd(v) {
  return `${formatarNumero(v)} peças`
}

function formatarPct(v) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '—'
  return `${formatarNumero(v)}%`
}

function formatarMinutos(min) {
  if (min === undefined || min === null || Number.isNaN(Number(min))) return '—'
  const total = Math.round(Number(min))
  const horas = Math.floor(total / 60)
  const minutos = total % 60
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, '0')}min`
  return `${minutos}min`
}

function formatarData(data) {
  if (!data) return ''
  const [ano, mes, dia] = String(data).split('-')
  if (!ano || !mes || !dia) return String(data)
  return `${dia}/${mes}/${ano}`
}

function formatarDataHora(data) {
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function montarNomeArquivo(dados) {
  const dataParte = dados.dataProducao ? String(dados.dataProducao).replaceAll('-', '') : 'sem-data'
  return `relatorio-producao-${dataParte}.pdf`
}