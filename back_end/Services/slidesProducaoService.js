/**
 * slidesProducaoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dados da tela "Slides de Produção" (painel/TV da fábrica).
 *
 * NÃO existe fórmula nova aqui. Todo número de eficiência, tempo e produção
 * vem de `relatorioProducaoService.calcularRelatorio()` →
 * `utils/producaoCalculos.js`, que é a fonte única do backend e espelha
 * `acari_tex/src/utils/calculosProducao.js`:
 *
 *   Eficiência (%) = Σ(Quantidade × SAM) × 100 ÷ (Funcionários × Tempo Trabalhado)
 *   SAM = MENOR tempo válido entre Tempo Padrão da etapa e Tempo de Referência
 *         do profissional (OP/etapa → etapa → padrão), escolhido pela data.
 *
 * Este service apenas:
 *   1. resolve o DIA (padrão: hoje no fuso de São Paulo);
 *   2. chama a consolidação oficial (6 consultas, sem N+1);
 *   3. agrega os DETALHES por hora × etapa e por profissional (contagem de
 *      peças e etapas executadas — nenhuma eficiência é recalculada);
 *   4. devolve o pacote dos slides, com os mesmos números das telas de
 *      Relatórios e de Análise Individual.
 *
 * Regras preservadas da consolidação oficial:
 *   - dedupe de lançamentos (mantém o mais recente);
 *   - estornos/quantidade 0 fora dos totais (`calculado: false`);
 *   - produção concluída = etapa final da OP + saldo líquido;
 *   - tempos ausentes não são inventados.
 */

const { PrismaClient } = require('@prisma/client')

const { calcularRelatorio, resolverPeriodo } = require('./relatorioProducaoService')
const { dateToSP, parseDataUTC, round2, calcularEficiencia } = require('../utils/producaoCalculos')
// Regra única de "etapa final" (a mesma que gera `producaoConcluida` na
// consolidação). Usada só para MARCAR a etapa no módulo da OP.
const { isEtapaFinal } = require('../utils/etapaFinal')

const prisma = new PrismaClient()

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Meta da hora: 100% = a pessoa entregou 60 min de tempo aplicado (SAM)
 * dentro de 1 hora trabalhada. É o mesmo critério de eficiência do sistema,
 * só que lido como "cumpriu a hora". Nada é recalculado: usa
 * `eficienciaTempoAplicado`, que já aplica ficha OU referência, o que for menor.
 */
const META_HORA_PERCENTUAL = 100

/** Jornada padrão quando o estabelecimento não tem tempo de produção cadastrado. */
const JORNADA_PADRAO_MIN = 540

/**
 * Dia padrão do painel: hoje no fuso de São Paulo.
 */
function dataPadrao() {
  return dateToSP(new Date())
}

/**
 * Valida/normaliza o parâmetro `data` (YYYY-MM-DD).
 * @returns {{ ok: true, data: string } | { ok: false, status: number, message: string }}
 */
function validarData(data) {
  if (data === undefined || data === null || data === '') {
    return { ok: true, data: dataPadrao() }
  }

  const valor = String(data).trim()

  if (!DATA_REGEX.test(valor) || !parseDataUTC(valor)) {
    return {
      ok: false,
      status: 400,
      message: 'Data inválida. Use YYYY-MM-DD (ex: 2026-03-06).',
    }
  }

  return { ok: true, data: valor }
}

/**
 * "08:00" / "8" / "0815" → "08:00" (hora cheia do expediente).
 * A produção é agrupada por HORA; minutos não geram buckets diferentes.
 */
function chaveHora(hora) {
  if (hora == null || hora === '') return null

  const texto = String(hora).trim()

  if (/^\d{1,2}:\d{2}$/.test(texto)) {
    const [h] = texto.split(':')
    return `${String(Number(h)).padStart(2, '0')}:00`
  }

  if (/^\d{1,2}$/.test(texto)) {
    return `${String(Number(texto)).padStart(2, '0')}:00`
  }

  if (/^\d{3,4}$/.test(texto)) {
    return `${String(Number(texto.slice(0, texto.length - 2))).padStart(2, '0')}:00`
  }

  return null
}

/**
 * Rótulo legível do dia (fuso de São Paulo).
 */
function rotuloDia(dataISO) {
  try {
    const formatador = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
    // Meio-dia UTC evita qualquer risco de virada de dia na formatação.
    return formatador.format(new Date(`${dataISO}T12:00:00Z`))
  } catch (err) {
    return dataISO
  }
}

/**
 * Agrupa os lançamentos válidos por HORA, com a quantidade de cada etapa.
 * Horas sem produção simplesmente não existem na lista — o painel nunca
 * mostra um horário vazio como se fosse apontamento real.
 */
function montarPorHora(detalhes) {
  const mapa = new Map()

  for (const item of detalhes || []) {
    if (!item || item.calculado === false) continue
    if (!(Number(item.quantidade) > 0)) continue

    const hora = chaveHora(item.hora)
    if (!hora) continue

    if (!mapa.has(hora)) {
      mapa.set(hora, { hora, total: 0, etapas: new Map() })
    }

    const bucket = mapa.get(hora)
    const etapa = item.etapa || 'Sem etapa'

    bucket.total += Number(item.quantidade)
    bucket.etapas.set(etapa, (bucket.etapas.get(etapa) || 0) + Number(item.quantidade))
  }

  return [...mapa.values()]
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map(bucket => ({
      hora: bucket.hora,
      total: bucket.total,
      etapas: [...bucket.etapas.entries()]
        .map(([etapa, quantidade]) => ({ etapa, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade || a.etapa.localeCompare(b.etapa)),
    }))
}

/**
 * Horário de MAIOR e de MENOR volume do dia (null quando não há produção).
 * Empate: o primeiro horário do expediente vence.
 */
function montarHorarios(porHora) {
  if (!porHora.length) return { pico: null, vale: null }

  const resumir = bucket => ({ hora: bucket.hora, total: bucket.total })

  let pico = porHora[0]
  let vale = porHora[0]

  for (const bucket of porHora) {
    if (bucket.total > pico.total) pico = bucket
    if (bucket.total < vale.total) vale = bucket
  }

  return {
    pico: resumir(pico),
    vale: resumir(vale),
  }
}

/**
 * Etapas executadas por profissional (quantidade por etapa), dos detalhes
 * auditáveis da consolidação oficial.
 */
function montarEtapasPorProfissional(detalhes) {
  const mapa = new Map()

  for (const item of detalhes || []) {
    if (!item || item.calculado === false) continue
    if (!(Number(item.quantidade) > 0)) continue

    const chave = item.funcionarioEmail
    if (!chave) continue

    if (!mapa.has(chave)) mapa.set(chave, new Map())
    const etapas = mapa.get(chave)
    const etapa = item.etapa || 'Sem etapa'

    etapas.set(etapa, (etapas.get(etapa) || 0) + Number(item.quantidade))
  }

  return mapa
}

/**
 * TODAS as etapas cadastradas no estabelecimento (uma única consulta).
 *
 * É isso que garante o requisito "nenhuma etapa cadastrada fica invisível":
 * a consolidação só conhece etapas que tiveram apontamento no dia, então o
 * cadastro é buscado à parte e usado para completar as linhas com zero.
 */
async function carregarEtapasCadastradas(cnpj) {
  return prisma.etapa.findMany({
    where: { id_Estabelecimento: cnpj },
    select: {
      id_da_funcao: true,
      descricao: true,
      tempo_padrao: true,
      grupoEtapa: { select: { nome: true } },
    },
    orderBy: [{ descricao: 'asc' }],
  })
}

/**
 * Metadados das OPs do dia (etapas do fluxo, entrega, status, peças previstas).
 * Os números de produção continuam vindo da consolidação oficial.
 */
async function carregarOpsDetalhe(cnpj, ids) {
  const lista = (ids || []).filter(id => id !== null && id !== undefined)
  if (!lista.length) return new Map()

  const ops = await prisma.pecasOP.findMany({
    where: { id_Estabelecimento: cnpj, id_da_op: { in: lista } },
    select: {
      id_da_op: true,
      descricao: true,
      quantidade_pecas: true,
      data_de_entrega: true,
      status: true,
      etapas: {
        select: {
          id_da_funcao: true,
          etapa: { select: { descricao: true } },
        },
      },
    },
  })

  return new Map(ops.map(o => [o.id_da_op, o]))
}

/**
 * Data de entrega da OP em ISO (YYYY-MM-DD) — o cadastro guarda texto livre
 * (ISO, DD/MM/AAAA ou vazio). Data impossível de ler vira null: nada é
 * inventado e a OP nunca é marcada como atrasada sem data confiável.
 */
const DATA_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/

function normalizarDataEntrega(valor) {
  if (!valor) return null

  const texto = String(valor).trim()
  if (!texto) return null

  const br = texto.match(DATA_BR_REGEX)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  if (DATA_REGEX.test(texto.slice(0, 10)) && parseDataUTC(texto.slice(0, 10))) {
    return texto.slice(0, 10)
  }

  return null
}

/**
 * Situação da OP para o painel:
 *   concluida → a etapa final já cobriu a meta do dia
 *   atrasada  → ainda em andamento e a entrega venceu antes de hoje
 *   andamento → todo o resto (inclui OP sem meta: nunca é "concluída")
 */
function situacaoOp({ metaTotal, producaoConcluida, dataEntrega, hoje }) {
  if (Number(metaTotal) > 0 && Number(producaoConcluida) >= Number(metaTotal)) {
    return 'concluida'
  }
  if (dataEntrega && hoje && dataEntrega < hoje) return 'atrasada'
  return 'andamento'
}

/**
 * Módulos por OP: cada OP do dia com suas etapas, peças e eficiência oficial.
 *
 * As peças por etapa saem dos detalhes auditáveis; a eficiência de cada etapa
 * usa `calcularEficiencia` (a MESMA função da consolidação), com o tempo
 * trabalhado somado do jeito que a consolidação soma por etapa.
 */
function montarPorOp(ops, detalhes, { opsDetalhe, hoje } = {}) {
  const mapa = new Map()

  for (const item of detalhes || []) {
    if (!item || item.calculado === false) continue
    if (!(Number(item.quantidade) > 0)) continue
    if (item.op === null || item.op === undefined) continue

    if (!mapa.has(item.op)) mapa.set(item.op, new Map())
    const etapas = mapa.get(item.op)
    const chave = item.etapa || 'Sem etapa'

    if (!etapas.has(chave)) {
      etapas.set(chave, {
        etapa: chave,
        final: isEtapaFinal(chave),
        producao: 0,
        tempoTrabalhado: 0,
        tempoAplicado: 0,
        profissionais: new Set(),
      })
    }

    const etapa = etapas.get(chave)
    etapa.producao += Number(item.quantidade)
    etapa.tempoTrabalhado += Number(item.tempoTrabalhado) || 0
    etapa.tempoAplicado += Number(item.tempoReferencia) || 0
    if (item.funcionarioEmail) etapa.profissionais.add(item.funcionarioEmail)
  }

  return (ops || [])
    .map(op => {
      const etapas = [...(mapa.get(op.idOp)?.values() || [])]
        .map(e => ({
          etapa: e.etapa,
          final: e.final,
          producao: e.producao,
          profissionais: e.profissionais.size,
          tempoTrabalhado: round2(e.tempoTrabalhado),
          tempoAplicado: round2(e.tempoAplicado),
          eficiencia: calcularEficiencia({
            producaoPonderada: e.tempoAplicado,
            tempoTrabalhado: e.tempoTrabalhado,
          }),
        }))
        .sort(
          (a, b) => b.producao - a.producao || a.etapa.localeCompare(b.etapa)
        )

      const cadastro = opsDetalhe?.get(op.idOp) || null
      const dataEntrega = normalizarDataEntrega(cadastro?.data_de_entrega)
      const etapasFluxo = (cadastro?.etapas || [])
        .map(e => ({
          idEtapa: e.id_da_funcao,
          etapa: e.etapa?.descricao || 'Sem etapa',
          final: isEtapaFinal(e.etapa?.descricao),
        }))
        .sort((a, b) => a.idEtapa - b.idEtapa)

      return {
        idOp: op.idOp,
        descricao: op.descricao,
        meta: op.metaTotal || 0,
        quantidadePecas: cadastro?.quantidade_pecas ?? null,
        dataEntrega,
        situacao: situacaoOp({
          metaTotal: op.metaTotal,
          producaoConcluida: op.producaoConcluida,
          dataEntrega,
          hoje,
        }),
        statusCadastro: cadastro?.status || null,
        etapasFluxo,
        producao: op.producaoRegistrada,
        producaoConcluida: op.producaoConcluida,
        profissionais: op.profissionais,
        etapas: op.etapas,
        tempoTrabalhado: op.tempoTrabalhado,
        tempoAplicado: op.tempoReferencia,
        eficiencia: op.eficienciaTempoAplicado,
        eficienciaTempoPadrao: op.eficienciaTempoPadrao,
        eficienciaTempoReferencia: op.eficienciaTempoReferencia,
        percentualMeta:
          op.metaTotal > 0 ? round2((op.producaoConcluida / op.metaTotal) * 100) : null,
        listaEtapas: etapas,
      }
    })
    .sort(
      (a, b) =>
        b.producao - a.producao || String(a.descricao).localeCompare(String(b.descricao))
    )
}

/**
 * Peças de cada etapa hora a hora ("08:00 → 100, 09:00 → 34").
 * Reaproveita os mesmos buckets de `montarPorHora` — só reindexa por etapa.
 */
function montarHorasPorEtapa(porHora) {
  const mapa = new Map()

  for (const bucket of porHora || []) {
    for (const item of bucket.etapas || []) {
      if (!mapa.has(item.etapa)) mapa.set(item.etapa, [])
      mapa.get(item.etapa).push({ hora: bucket.hora, quantidade: item.quantidade })
    }
  }

  return mapa
}

/**
 * Quem trabalhou em cada etapa, com peças e eficiência DAQUELE recorte.
 *
 * A eficiência usa `calcularEficiencia` — a mesma função da consolidação —
 * sobre o tempo aplicado (ficha ou referência, o menor) e o tempo trabalhado
 * somados do mesmo jeito que a consolidação soma por etapa.
 */
function montarPessoasPorEtapa(detalhes, funcionarios) {
  const fotos = new Map((funcionarios || []).map(f => [f.email, f.foto]))
  const mapa = new Map()

  for (const item of detalhes || []) {
    if (!item || item.calculado === false) continue
    if (!(Number(item.quantidade) > 0)) continue

    const email = item.funcionarioEmail
    if (!email) continue

    const chaveEtapa = item.etapa || 'Sem etapa'
    if (!mapa.has(chaveEtapa)) mapa.set(chaveEtapa, new Map())
    const pessoas = mapa.get(chaveEtapa)

    if (!pessoas.has(email)) {
      pessoas.set(email, {
        email,
        nome: item.profissional || email,
        foto: fotos.get(email) || null,
        producao: 0,
        tempoTrabalhado: 0,
        tempoAplicado: 0,
      })
    }

    const pessoa = pessoas.get(email)
    pessoa.producao += Number(item.quantidade)
    pessoa.tempoTrabalhado += Number(item.tempoTrabalhado) || 0
    pessoa.tempoAplicado += Number(item.tempoReferencia) || 0
  }

  const saida = new Map()

  for (const [etapa, pessoas] of mapa) {
    saida.set(
      etapa,
      [...pessoas.values()]
        .map(p => ({
          ...p,
          tempoTrabalhado: round2(p.tempoTrabalhado),
          tempoAplicado: round2(p.tempoAplicado),
          eficiencia: calcularEficiencia({
            producaoPonderada: p.tempoAplicado,
            tempoTrabalhado: p.tempoTrabalhado,
          }),
        }))
        .sort(
          (a, b) =>
            (b.eficiencia || 0) - (a.eficiencia || 0) ||
            b.producao - a.producao ||
            String(a.nome).localeCompare(String(b.nome))
        )
    )
  }

  return saida
}

/**
 * Colunas de hora CONTÍNUAS entre a primeira e a última hora apontada.
 * A fábrica não aponta em todo horário (intervalo, café), e a tabela do
 * painel precisa mostrar o expediente inteiro — não uma lista esburacada.
 * Nada é inventado: horário sem lançamento aparece como vazio/zero.
 */
function preencherHoras(horas) {
  if (!horas.length) return []

  const primeira = Number(String(horas[0]).slice(0, 2))
  const ultima = Number(String(horas[horas.length - 1]).slice(0, 2))

  const saida = []
  for (let h = primeira; h <= ultima; h += 1) {
    // Horário sem lançamento entra como coluna sem produção ("") — a
    // fábrica tem intervalo e a tabela precisa do expediente inteiro.
    saida.push(`${String(h).padStart(2, '0')}:00`)
  }

  return saida
}

/**
 * Tabela do painel: etapas nas linhas × horários nas colunas.
 *
 * É um PIVOT dos mesmos lançamentos já agrupados em `porHora` — nenhuma
 * quantidade nova é calculada aqui. O total da linha usa a produção oficial
 * da etapa (consolidação), então a tabela nunca discorda dos relatórios.
 */
function montarMatriz(porHora, etapas) {
  const horas = preencherHoras((porHora || []).map(b => b.hora))
  const mapa = new Map()

  for (const bucket of porHora || []) {
    for (const item of bucket.etapas || []) {
      if (!mapa.has(item.etapa)) mapa.set(item.etapa, new Map())
      const linha = mapa.get(item.etapa)
      linha.set(bucket.hora, (linha.get(bucket.hora) || 0) + item.quantidade)
    }
  }

  const linhas = (etapas || []).map(e => {
    const linha = mapa.get(e.etapa) || new Map()
    return {
      idEtapa: e.idEtapa,
      etapa: e.etapa,
      cadastrada: e.cadastrada !== false,
      eficiencia: e.eficiencia,
      participacao: e.participacao,
      profissionais: e.profissionais,
      total: e.producao,
      // null = nenhum apontamento naquele horário (a tela mostra "—").
      celulas: horas.map(hora => (linha.has(hora) ? linha.get(hora) : null)),
    }
  })

  const totaisHora = horas.map((hora, i) =>
    linhas.reduce((soma, l) => soma + (l.celulas[i] || 0), 0)
  )

  return {
    horas,
    linhas,
    totaisHora,
    total: linhas.reduce((soma, l) => soma + (l.total || 0), 0),
  }
}

/**
 * Todas as etapas: primeiro as CADASTRADAS (ordem estável de cadastro, mesmo
 * com zero peças), depois as que aparecem na produção sem cadastro no
 * estabelecimento. A consolidação só devolve etapas com apontamento — é
 * exatamente por isso que algumas desapareciam do painel.
 */
function montarEtapasCompletas(etapasProducao, etapasCadastradas, etapasDoDia = new Set()) {
  const porNome = new Map((etapasProducao || []).map(e => [e.etapa, e]))
  const nomesCadastrados = new Set()

  // O cadastro acumula variações de escrita e registros repetidos (a mesma
  // etapa criada de novo em outra OP). Nome idêntico vira UMA linha só —
  // continua aparecendo, mas o painel não repete a mesma etapa.
  const vistosCadastro = new Set()
  const cadastroUnico = (etapasCadastradas || []).filter(c => {
    const chave = String(c.descricao || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (!chave || vistosCadastro.has(chave)) return false
    vistosCadastro.add(chave)
    return true
  })

  const cadastradas = cadastroUnico.map(c => {
    const nome = c.descricao
    nomesCadastrados.add(nome)

    const base = porNome.get(nome)
    const emUsoNoDia = etapasDoDia.has(nome)

    if (base) {
      return {
        ...base,
        cadastrada: true,
        grupo: c.grupoEtapa?.nome || null,
        emUsoNoDia,
      }
    }

    // Etapa cadastrada sem nenhum apontamento no dia: zero de verdade.
    return {
      idEtapa: c.id_da_funcao,
      etapa: nome,
      cadastrada: true,
      grupo: c.grupoEtapa?.nome || null,
      // Etapa do fluxo de alguma OP do dia, mesmo sem peça apontada ainda.
      emUsoNoDia,
      producao: 0,
      producaoConcluida: 0,
      profissionais: 0,
      ops: 0,
      tempoTrabalhado: 0,
      tempoFicha: 0,
      tempoReferencia: 0,
      tempoPadraoUnitario: c.tempo_padrao ?? null,
      eficiencia: 0,
      eficienciaTempoPadrao: 0,
      eficienciaTempoReferencia: 0,
      eficienciaTempoAplicado: 0,
      tempoAplicado: 0,
      samMedio: 0,
      bateuMeta: false,
      participacao: 0,
      porHora: [],
      pessoas: [],
    }
  })

  const semCadastro = (etapasProducao || [])
    .filter(e => !nomesCadastrados.has(e.etapa))
    .map(e => ({ ...e, cadastrada: false, grupo: null, emUsoNoDia: true }))

  // Ordem do painel: quem produziu primeiro (leitura imediata na TV), depois
  // as etapas cadastradas zeradas, em ordem alfabética.
  const comProducao = [...cadastradas, ...semCadastro]
    .filter(e => Number(e.producao) > 0)
    .sort(
      (a, b) =>
        b.producao - a.producao || String(a.etapa).localeCompare(String(b.etapa), 'pt-BR')
    )

  const zeradas = [...cadastradas, ...semCadastro]
    .filter(e => !(Number(e.producao) > 0))
    .sort((a, b) => String(a.etapa).localeCompare(String(b.etapa), 'pt-BR'))

  return [...comProducao, ...zeradas]
}

/**
 * Peças FINALIZADAS × peças PROCESSADAS.
 *
 * `producaoConcluida` da consolidação só soma a etapa final de cada OP
 * (`peca_final` do estabelecimento, ou a última etapa que casa com
 * `isEtapaFinal`). A soma de corte + costura + revisão NUNCA é peça finalizada.
 *
 * Quando nenhuma OP do dia tem etapa final identificável, o painel informa
 * que o total não está disponível em vez de exibir um número inventado.
 */
function montarFinalizacao({ pecaFinalConfigurada, porOp, etapas, producaoConcluida }) {
  const nomesFinais = new Set()
  let opsComFinal = 0

  for (const op of porOp || []) {
    const finais = (op.etapasFluxo || []).filter(e => e.final)
    if (!finais.length) continue
    opsComFinal += 1
    for (const e of finais) nomesFinais.add(e.etapa)
  }

  const etapasFinais = (etapas || [])
    .filter(e => nomesFinais.has(e.etapa))
    .map(e => ({
      etapa: e.etapa,
      producao: e.producao,
      producaoConcluida: e.producaoConcluida,
      profissionais: e.profissionais,
      eficiencia: e.eficiencia,
    }))

  return {
    disponivel: opsComFinal > 0,
    motivo: opsComFinal > 0 ? null : 'sem_etapa_final',
    pecas: Number(producaoConcluida) || 0,
    configurada: pecaFinalConfigurada || null,
    etapasFinais,
    opsComEtapaFinal: opsComFinal,
    opsSemEtapaFinal: (porOp || []).length - opsComFinal,
  }
}

/**
 * Payload completo do painel de slides.
 *
 * @param {string} cnpj  estabelecimento (sempre de req.user.cnpj)
 * @param {Object} params  saída de `validarData`
 */
async function obterPainelProducao(cnpj, params) {
  const data = params.data

  const periodo = resolverPeriodo({ tipo: 'diario', dataInicial: data })

  const {
    estabelecimento,
    consolidado,
    duplicadosRemovidos,
    funcionariosAtivos,
  } = await calcularRelatorio(cnpj, periodo, { incluirDetalhes: true })

  const { resumo, funcionarios, porEtapa, detalhes, ops } = consolidado

  // Jornada do estabelecimento (limite de tempo de UMA pessoa por dia).
  const jornadaMinutos = Number(estabelecimento.tempo_de_producao) > 0
    ? Number(estabelecimento.tempo_de_producao)
    : JORNADA_PADRAO_MIN

  // ═══ Evolução durante o dia (hora × etapa) ═══
  const porHora = montarPorHora(detalhes)
  const horarios = montarHorarios(porHora)
  // Horário sem apontamento continua no eixo do gráfico (intervalo/almoço).
  const horasDoDia = preencherHoras(porHora.map(b => b.hora))

  const horasPorEtapa = montarHorasPorEtapa(porHora)
  const pessoasPorEtapa = montarPessoasPorEtapa(detalhes, funcionarios)

  // ═══ Etapas (todas as que tiveram apontamento no dia) ═══
  const totalApontado = resumo.producaoRegistrada

  const etapas = porEtapa.map(e => ({
    idEtapa: e.idEtapa,
    etapa: e.descricao,
    producao: e.producaoRegistrada,
    producaoConcluida: e.producaoConcluida,
    profissionais: e.profissionais,
    ops: e.ops,
    tempoTrabalhado: e.tempoTrabalhado,
    tempoFicha: e.tempoFicha,
    tempoReferencia: e.tempoReferencia,
    tempoPadraoUnitario: e.tempoPadrao,
    // Eficiência oficial da etapa (mesma regra dos relatórios).
    eficiencia: e.eficienciaTempoAplicado,
    eficienciaTempoPadrao: e.eficienciaTempoPadrao,
    eficienciaTempoReferencia: e.eficienciaTempoReferencia,
    eficienciaTempoAplicado: e.eficienciaTempoAplicado,
    tempoAplicado: e.tempoReferencia,
    samMedio: e.tempoReferenciaMedio,
    bateuMeta: Number(e.eficienciaTempoAplicado) >= META_HORA_PERCENTUAL,
    participacao:
      totalApontado > 0 ? round2((e.producaoRegistrada / totalApontado) * 100) : 0,
    // Quebra da etapa: hora a hora e quem trabalhou nela.
    porHora: horasPorEtapa.get(e.descricao) || [],
    pessoas: pessoasPorEtapa.get(e.descricao) || [],
  }))

  // ═══ Profissionais do dia (eficiências oficiais, nada recalculado) ═══
  // Ranking por EFICIÊNCIA (tempo aplicado = ficha ou referência, o menor),
  // nunca por quantidade de peças: etapa com SAM alto não vira "melhor".
  const etapasPorProfissional = montarEtapasPorProfissional(detalhes)

  const profissionais = [...funcionarios]
    .sort(
      (a, b) =>
        (b.eficienciaTempoAplicado || 0) - (a.eficienciaTempoAplicado || 0) ||
        b.producaoRegistrada - a.producaoRegistrada ||
        String(a.nome).localeCompare(String(b.nome))
    )
    .map((f, indice) => {
      const etapasFunc = etapasPorProfissional.get(f.email) || new Map()
      const eficiencia = f.eficienciaTempoAplicado

      return {
        posicao: indice + 1,
        email: f.email,
        nome: f.nome,
        foto: f.foto,
        producao: f.producaoRegistrada,
        producaoConcluida: f.producaoConcluida,
        tempoTrabalhado: f.tempoTrabalhado,
        // O dia de UMA pessoa termina na jornada: o painel nunca mostra
        // 10h de alguém que só tem 8h52 de expediente.
        tempoNoDia: Math.min(f.tempoTrabalhado, jornadaMinutos),
        tempoAplicado: f.tempoReferencia,
        tempoFicha: f.tempoFicha,
        tempoReferencia: f.tempoReferencia,
        // Eficiência individual: mesmo critério do Relatório/Análise.
        eficiencia,
        eficienciaTempoPadrao: f.eficienciaTempoPadrao,
        eficienciaTempoReferencia: f.eficienciaTempoReferencia,
        eficienciaTempoAplicado: f.eficienciaTempoAplicado,
        // Bateu a meta da hora (100% = 60 min aplicados por hora trabalhada).
        metaHora: META_HORA_PERCENTUAL,
        bateuMeta: Number(eficiencia) >= META_HORA_PERCENTUAL,
        etapasExecutadas: etapasFunc.size,
        etapas: [...etapasFunc.entries()]
          .map(([etapa, quantidade]) => ({ etapa, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade || a.etapa.localeCompare(b.etapa)),
        ops: f.opsTrabalhadas,
        registros: f.registros,
      }
    })

  // ═══ Destaques do dia (a partir dos mesmos números) ═══
  const comProducao = profissionais.filter(p => p.producao > 0)
  const comEficiencia = comProducao.filter(p => Number(p.eficiencia) > 0)

  const maiorEficiencia = comEficiencia.length ? comEficiencia[0] : null

  // Quem bateu a meta da hora — o slide de profissionais celebra com a foto.
  const naMeta = profissionais.filter(p => p.bateuMeta)

  // ═══ Módulos por OP (etapas do fluxo, entrega, status) ═══
  const opsDetalhe = await carregarOpsDetalhe(
    cnpj,
    ops.map(op => op.idOp)
  )
  const porOp = montarPorOp(ops, detalhes, {
    opsDetalhe,
    hoje: dateToSP(new Date()),
  })

  // Etapas que fazem parte do fluxo das OPs do dia — essas são acompanhadas
  // mesmo que ainda não tenham peça apontada.
  const etapasDoDia = new Set()
  for (const detalhe of opsDetalhe.values()) {
    for (const e of detalhe.etapas || []) {
      if (e.etapa?.descricao) etapasDoDia.add(e.etapa.descricao)
    }
  }

  // ═══ Etapas cadastradas (para o zero aparecer no painel) ═══
  const etapasCadastradas = await carregarEtapasCadastradas(cnpj)
  const porEtapaCompleto = montarEtapasCompletas(etapas, etapasCadastradas, etapasDoDia)
  const totalEtapasCadastradas = porEtapaCompleto.filter(e => e.cadastrada).length

  // Etapas que o painel acompanha: as que produziram hoje + as do fluxo das
  // OPs do dia (estas entram com zero até começarem). As demais cadastradas
  // não somem: vão para a página "etapas sem produção".
  const etapasPainel = porEtapaCompleto.filter(e => Number(e.producao) > 0 || e.emUsoNoDia)

  // ═══ Tabela hora × etapa (pivot dos mesmos lançamentos) ═══
  const matriz = montarMatriz(porHora, etapasPainel)

  // ═══ Peças finalizadas (nunca a soma das etapas) ═══
  const finalizacao = montarFinalizacao({
    pecaFinalConfigurada: estabelecimento.peca_final,
    porOp,
    etapas,
    producaoConcluida: resumo.producaoConcluida,
  })

  // ═══ Resumo do slide 1 (todos os campos vêm da consolidação) ═══
  const metaTotal = resumo.metaTotal

  return {
    data,
    dataLabel: rotuloDia(data),
    estabelecimento: {
      nome: estabelecimento.nome,
      etapaFinalConfigurada: estabelecimento.peca_final || null,
      jornadaMinutos,
    },

    resumo: {
      pecasConcluidas: resumo.producaoConcluida,
      pecasApontadas: resumo.producaoRegistrada,
      profissionais: resumo.profissionais,
      profissionaisAtivos: funcionariosAtivos,
      etapasComProducao: etapas.length,
      etapasCadastradas: totalEtapasCadastradas,
      ops: ops.length,
      registros: resumo.registros,
      registrosIgnorados: resumo.registrosIgnorados,
      duplicadosRemovidos,
      // Tempo oficial somado (base dos percentuais). A tela nunca mostra isso
      // como "relógio do dia": uma pessoa tem no máximo `jornadaMinutos`.
      tempoTrabalhado: resumo.tempoTrabalhado,
      tempoMedioPorPessoa:
        resumo.profissionais > 0
          ? round2(resumo.tempoTrabalhado / resumo.profissionais)
          : 0,
      jornadaMinutos,
      tempoFicha: resumo.tempoFicha,
      tempoReferencia: resumo.tempoReferencia,
      tempoReferenciaPuro: resumo.tempoReferenciaPuro,
      // Número principal do painel = eficiência oficial (Tempo Aplicado).
      eficienciaGeral: resumo.eficienciaGeral,
      eficienciaTempoPadrao: resumo.eficienciaTempoPadrao,
      eficienciaTempoReferencia: resumo.eficienciaTempoReferencia,
      eficienciaTempoAplicado: resumo.eficienciaTempoAplicado,
      referenciaCobertura:
        resumo.producaoRegistrada > 0
          ? round2((resumo.quantidadeComReferencia / resumo.producaoRegistrada) * 100)
          : null,
      metaTotal,
      percentualMeta:
        metaTotal > 0 ? round2((resumo.producaoConcluida / metaTotal) * 100) : null,
      tempoMedioPorPeca: resumo.tempoMedioPorPeca,
      regraTempoUtilizado: resumo.regraTempoUtilizado,
      metaHora: META_HORA_PERCENTUAL,
      profissionaisNaMeta: profissionais.filter(p => p.bateuMeta).length,
    },

    porEtapa: etapas,
    // Todas as etapas do estabelecimento (cadastradas sem produção = 0).
    porEtapaCompleto,
    etapasCadastradas: totalEtapasCadastradas,
    // Tabela do painel: etapas × horários.
    matriz,
    // Eixo de horas do dia (contínuo) para o gráfico por etapa.
    horasDoDia,
    finalizacao,
    porOp,
    porHora,
    horarios,
    profissionais,
    destaques: {
      maiorEficiencia,
      naMeta,
      quantidadeNaMeta: naMeta.length,
    },

    regras: {
      eficiencia:
        'Σ(quantidade x SAM) x 100 / tempo trabalhado, com SAM = menor tempo valido entre tempo padrao da etapa e tempo de referencia do profissional',
      eficienciaTempoPadrao: 'Σ(quantidade x tempo padrao da etapa) x 100 / tempo trabalhado',
      eficienciaTempoReferencia:
        'Σ(quantidade x tempo de referencia valido) x 100 / tempo trabalhado (sem referencia = 0, nunca o padrao)',
      eficienciaTempoAplicado: 'Σ(quantidade x SAM) x 100 / tempo trabalhado',
      eficienciaGeral: 'consolidado do tempo aplicado por totais, nunca media de percentuais',
      pecasConcluidas:
        'somente a etapa final da OP (peca_final do estabelecimento ou ultima etapa que casa com isEtapaFinal); nunca a soma das etapas',
      pecasApontadas: 'todas as etapas do fluxo (peca processada, nao finalizada)',
      finalizacaoIndisponivel:
        'sem etapa final identificavel nas OPs do dia o total de finalizadas nao e exibido',
      porHora: 'horarios com apontamento no dia, agrupados por hora cheia',
      metaHora:
        '100% = 1 hora de tempo aplicado por hora trabalhada (eficienciaTempoAplicado)',
      rankingProfissionais:
        'ordenado por eficienciaTempoAplicado (ficha ou referencia, o menor), nunca por pecas',
      jornada: 'tempo de UMA pessoa por dia (estabelecimento.tempo_de_producao)',
      etapas:
        'slide de producao individual so com etapas que tiveram producao no dia; as cadastradas sem producao ficam na pagina de etapas ociosas (cadastro completo, nao oculto)',
      matriz: 'tabela hora x etapa: pivot dos mesmos lancamentos de porHora',
      situacaoOp:
        'concluida quando a etapa final cobre a meta do dia; atrasada quando a entrega venceu e a OP nao concluiu',
      origem: 'relatorioProducaoService.calcularRelatorio -> utils/producaoCalculos.js',
    },

    vazio: resumo.registros === 0,
  }
}

module.exports = {
  obterPainelProducao,
  validarData,
  chaveHora,
  montarPorHora,
  montarHorarios,
  montarMatriz,
  montarEtapasCompletas,
  montarFinalizacao,
  normalizarDataEntrega,
  situacaoOp,
  DATA_REGEX,
}
