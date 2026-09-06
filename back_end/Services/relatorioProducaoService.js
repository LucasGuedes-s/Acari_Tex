/**
 * relatorioProducaoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço de geração de Relatórios de Produção (semanal, quinzenal, mensal).
 *
 * FÓRMULA OFICIAL DE EFICIÊNCIA (idêntica ao frontend):
 *   Eficiência (%) = (Σ Peças × SAM) × 100 ÷ (Funcionários × Tempo Trabalhado)
 *
 * SAM = TempoReferência do funcionário para a etapa (quando existir);
 *       caso contrário, TempoPadrão da Ficha Técnica.
 *
 * RESOLUÇÃO DO TEMPO DE REFERÊNCIA (prioridade):
 *   1. TempoReferência do profissional para a OP/etapa atual (mais recente)
 *   2. TempoReferência do profissional para a mesma etapa em qualquer OP
 *   3. Fallback → TempoPadrão da ficha técnica
 *
 * MINUTOS DISPONÍVEIS POR DIA:
 *   Segunda a Quinta: 540 min (9h)
 *   Sexta: 480 min (8h)
 *   Sábado/Domingo: 0
 */

const { PrismaClient } = require('@prisma/client')
const PDFDocument = require('pdfkit')
const prisma = new PrismaClient()

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const FUSO_SP = 'America/Sao_Paulo'

const CORES = {
  primaria: '#0D6632',
  primariaEscura: '#084D24',
  primariaClara: '#E7F8EF',
  texto: '#052E14',
  textoSuave: '#648F73',
  linha: '#DCEAE3',
  branco: '#FFFFFF',
  fundoCard: '#F7FCF9',
  alto: '#0C6B34',
  medio: '#8A6E00',
  baixo: '#B12626',
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS DE DATA / FUSO HORÁRIO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Converte Date para string no fuso de São Paulo: YYYY-MM-DD
 */
function dateToSP(date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: FUSO_SP }).format(date)
}

/**
 * Retorna Date em SP no início do dia (00:00:00.000)
 */
function inicioDiaSP(date) {
  const str = dateToSP(date)
  const [ano, mes, dia] = str.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0))
}

/**
 * Retorna Date em SP no fim do dia (23:59:59.999)
 */
function fimDiaSP(date) {
  const str = dateToSP(date)
  const [ano, mes, dia] = str.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999))
}

/**
 * Converte string YYYY-MM-DD para Date UTC meia-noite
 */
function parseDataUTC(dataStr) {
  const [ano, mes, dia] = dataStr.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0))
}

/**
 * Minutos disponíveis por dia (regra do sistema)
 * Seg-Qua: 540 min (9h), Sex: 480 min (8h), Sáb/Dom: 0
 */
function minutosDisponiveisDia(date) {
  const str = dateToSP(date)
  const [ano, mes, dia] = str.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  const diaSemana = d.getDay()
  if (diaSemana >= 1 && diaSemana <= 4) return 540
  if (diaSemana === 5) return 480
  return 0
}

/**
 * Formata data para DD/MM/YYYY
 */
function formatarData(data) {
  const str = dateToSP(data)
  const [ano, mes, dia] = str.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Formata data para YYYY-MM-DD
 */
function formatarDataISO(data) {
  return dateToSP(data)
}

// ══════════════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function normalizar(texto = '') {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

// ══════════════════════════════════════════════════════════════════════════════
// ETAPA FINAL (regra do frontend)
// ══════════════════════════════════════════════════════════════════════════════

function isEtapaFinal(descricao) {
  if (!descricao) return false
  const d = normalizar(descricao)
  if (d.includes('revisao intermediaria') || d.includes('revisão intermediaria')) return false
  return (
    d.includes('final') ||
    d.includes('revisão final') || d.includes('revisao final') ||
    d.includes('revisão') || d.includes('revisao') ||
    d.includes('acabamento') ||
    d.includes('qualidade') ||
    d.includes('revisar peça pronta') ||
    d.includes('expedição') || d.includes('expedicao')
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLUÇÃO DO TEMPO DE REFERÊNCIA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Valor comparável de "recência" de um registro de TempoReferencia.
 */
function valorRecenciaRef(ref) {
  if (!ref) return -Infinity
  const candidatosData = [ref.criadoEm, ref.data_medicao]
  for (const c of candidatosData) {
    if (!c) continue
    const t = new Date(c).getTime()
    if (!isNaN(t)) return t
  }
  const idNum = Number(ref.id)
  return isNaN(idNum) ? -Infinity : idNum
}

function escolherRefMaisRecente(refs) {
  if (!Array.isArray(refs) || !refs.length) return null
  return refs.reduce((maisRecente, atual) => {
    if (!maisRecente) return atual
    return valorRecenciaRef(atual) > valorRecenciaRef(maisRecente) ? atual : maisRecente
  }, null)
}

function extrairTempoRef(ref) {
  return Number(ref?.tempo_minutos ?? ref?.tempo_por_peca ?? 0)
}

/**
 * Resolve o SAM (Standard Allowed Minutes) para um registro de produção.
 *
 * @param {string} funcionarioEmail - Email do funcionário
 * @param {number} idDaFuncao - ID da etapa
 * @param {number|null} idDaOp - ID da OP (opcional)
 * @param {Map} etapasReferenciaMap - Map<idDaFuncao, TempoReferencia[]>
 * @returns {{ tempo: number, origem: string|null }}
 */
function resolverSAM(funcionarioEmail, idDaFuncao, idDaOp, tempoPadraoEtapa, etapasReferenciaMap) {
  const refs = etapasReferenciaMap.get(idDaFuncao) || []

  // 1. TempoReferência do profissional para a OP/etapa específica
  if (idDaOp != null) {
    const refsOp = refs.filter(r => r.id_funcionario === funcionarioEmail && r.opId === idDaOp)
    const escolhido = escolherRefMaisRecente(refsOp)
    if (escolhido) {
      const t = extrairTempoRef(escolhido)
      if (t > 0) return { tempo: t, origem: 'peca' }
    }
  }

  // 2. TempoReferência do profissional para a mesma etapa (qualquer OP)
  const refsFunc = refs.filter(r => r.id_funcionario === funcionarioEmail)
  const escolhido = escolherRefMaisRecente(refsFunc)
  if (escolhido) {
    const t = extrairTempoRef(escolhido)
    if (t > 0) return { tempo: t, origem: 'ultimo_registrado' }
  }

  // 3. Fallback → TempoPadrão da ficha técnica
  return { tempo: tempoPadraoEtapa || 0, origem: null }
}

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULO DE EFICIÊNCIA (idêntico ao frontend)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Eficiência (%) = (Σ Peças × SAM) × 100 ÷ (Funcionários × Tempo Trabalhado)
 */
function calcularEficiencia({ producaoPonderada = 0, funcionarios = 1, tempoTrabalhado = 0 }) {
  const divisor = (funcionarios || 0) * (tempoTrabalhado || 0)
  if (!divisor) return 0
  return Math.round((producaoPonderada * 100) / divisor)
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFINIÇÃO DO PERÍODO
// ══════════════════════════════════════════════════════════════════════════════

function resolverPeriodo(params) {
  const { tipo, dataInicial, dataFinal, mes, ano, quinzena } = params

  if (tipo === 'personalizado' && dataInicial && dataFinal) {
    return {
      inicio: parseDataUTC(dataInicial),
      fim: parseDataUTC(dataFinal),
      tipoLabel: 'Relatório Personalizado',
      periodoLabel: `${formatarData(parseDataUTC(dataInicial))} a ${formatarData(parseDataUTC(dataFinal))}`,
    }
  }

  if (tipo === 'semanal' && dataInicial && dataFinal) {
    return {
      inicio: parseDataUTC(dataInicial),
      fim: parseDataUTC(dataFinal),
      tipoLabel: 'Relatório Semanal',
      periodoLabel: `${formatarData(parseDataUTC(dataInicial))} a ${formatarData(parseDataUTC(dataFinal))}`,
    }
  }

  if (tipo === 'quinzenal' && mes && ano) {
    const mesNum = parseInt(mes, 10)
    const anoNum = parseInt(ano, 10)
    const quinzenaNum = parseInt(quinzena || '1', 10)

    let inicioDia, fimDia
    if (quinzenaNum === 1) {
      inicioDia = 1
      fimDia = 15
    } else {
      inicioDia = 16
      const ultimoDiaMes = new Date(anoNum, mesNum, 0).getDate()
      fimDia = ultimoDiaMes
    }

    const inicio = new Date(Date.UTC(anoNum, mesNum - 1, inicioDia, 0, 0, 0))
    const fim = new Date(Date.UTC(anoNum, mesNum - 1, fimDia, 23, 59, 59, 999))

    return {
      inicio,
      fim,
      tipoLabel: 'Relatório Quinzenal',
      periodoLabel: `${formatarData(inicio)} a ${formatarData(fim)}`,
    }
  }

  if (tipo === 'mensal' && mes && ano) {
    const mesNum = parseInt(mes, 10)
    const anoNum = parseInt(ano, 10)
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate()

    const inicio = new Date(Date.UTC(anoNum, mesNum - 1, 1, 0, 0, 0))
    const fim = new Date(Date.UTC(anoNum, mesNum - 1, ultimoDia, 23, 59, 59, 999))

    return {
      inicio,
      fim,
      tipoLabel: 'Relatório Mensal',
      periodoLabel: `${MESES[mesNum - 1]}/${anoNum}`,
    }
  }

  throw new Error('Parâmetros de período inválidos. Envie tipo + datas ou tipo + mês + ano.')
}

function montarNomeArquivo(tipo, params) {
  const { dataInicial, dataFinal, mes, ano, quinzena } = params
  const now = formatarDataISO(new Date())

  if (tipo === 'semanal' && dataInicial && dataFinal) {
    return `relatorio-producao-semanal-${dataInicial}-a-${dataFinal}.pdf`
  }
  if (tipo === 'quinzenal' && mes && ano) {
    const q = parseInt(quinzena || '1', 10)
    const inicio = q === 1 ? `${ano}-${String(mes).padStart(2, '0')}-01` : `${ano}-${String(mes).padStart(2, '0')}-16`
    const fimDia = q === 1 ? 15 : new Date(parseInt(ano), parseInt(mes), 0).getDate()
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimDia).padStart(2, '0')}`
    return `relatorio-producao-quinzenal-${inicio}-a-${fim}.pdf`
  }
  if (tipo === 'mensal' && mes && ano) {
    return `relatorio-producao-mensal-${ano}-${String(mes).padStart(2, '0')}.pdf`
  }
  if (tipo === 'personalizado' && dataInicial && dataFinal) {
    return `relatorio-producao-${dataInicial}-a-${dataFinal}.pdf`
  }
  return `relatorio-producao-${now}.pdf`
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSOLIDAÇÃO DE PRODUÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Busca todas as produções do período e consolida por dia, funcionário, OP e etapa.
 * Aplica a mesma lógica de cálculo do frontend (producaoCompartilhada.js).
 */
async function buscarEConsolidar(cnpj, inicio, fim) {
  // ═══ Buscar dados do banco ═══
  const [estabelecimento, producoes, todosTempoRef] = await Promise.all([
    prisma.estabelecimento.findUnique({
      where: { cnpj },
      select: { tempo_de_producao: true, nome: true, peca_final: true },
    }),
    prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: { gte: inicio, lte: fim },
      },
      include: {
        producao_funcionario: { select: { email: true, nome: true, foto: true } },
        producao_etapa: {
          select: {
            id_da_funcao: true,
            descricao: true,
            tempo_padrao: true,
          },
        },
        producao_peca: {
          select: {
            id_da_op: true,
            descricao: true,
            tempo_padrao: true,
          },
        },
      },
      orderBy: [
        { id_funcionario: 'asc' },
        { horaNumero: 'asc' },
      ],
    }),
    prisma.tempoReferencia.findMany({
      where: { estabelecimentoCnpj: cnpj },
      select: {
        id: true,
        id_funcionario: true,
        id_da_funcao: true,
        tempo_minutos: true,
        tempo_por_peca: true,
        criadoEm: true,
        data_medicao: true,
        opId: true,
      },
    }),
  ])

  if (!estabelecimento) {
    throw new Error('Estabelecimento não encontrado.')
  }

  if (producoes.length === 0) {
    return { dados: null, nomeArquivo: null }
  }

  // ═══ Montar Map de TempoReferência ═══
  // Map<idDaFuncao, TempoReferencia[]>
  const etapasReferenciaMap = new Map()
  for (const ref of todosTempoRef) {
    const idFuncao = ref.id_da_funcao
    if (!etapasReferenciaMap.has(idFuncao)) {
      etapasReferenciaMap.set(idFuncao, [])
    }
    etapasReferenciaMap.get(idFuncao).push(ref)
  }

  // ═══ Buscar metas do período ═══
  const metas = await prisma.metaDia.findMany({
    where: {
      estabelecimentoCnpj: cnpj,
      data: { gte: inicio, lte: fim },
    },
    include: {
      pecas: {
        select: {
          id_da_op: true,
          meta: true,
        },
      },
    },
  })

  // Map<YYYY-MM-DD, Map<id_da_op, meta>>
  const metasPorDia = new Map()
  for (const meta of metas) {
    const diaStr = dateToSP(meta.data)
    if (!metasPorDia.has(diaStr)) metasPorDia.set(diaStr, new Map())
    for (const p of meta.pecas || []) {
      metasPorDia.get(diaStr).set(p.id_da_op, p.meta || 0)
    }
  }

  // ═══ Buscar OPs do período ═══
  const opIds = [...new Set(producoes.map(p => p.id_da_op))]
  const ops = await prisma.pecasOP.findMany({
    where: {
      id_Estabelecimento: cnpj,
      id_da_op: { in: opIds },
    },
    select: {
      id_da_op: true,
      descricao: true,
      quantidade_pecas: true,
      tempo_padrao: true,
    },
  })
  const opsMap = new Map(ops.map(o => [o.id_da_op, o]))

  // ═══ Buscar funcionários ativos ═══
  const funcionariosAtivos = await prisma.usuarios.count({
    where: { estabelecimentoCnpj: cnpj, status: 'ativo' },
  })

  // ═══ Consolidação diária ═══
  // Map<YYYY-MM-DD, { producao, meta, eficiencia, funcionarios: Set, registros: [] }>
  const diasMap = new Map()

  // ═══ Consolidação por funcionário ═══
  // Map<email, { nome, foto, producao, meta, eficiencia, diasTrabalhados, tempoRegistrado, tempoFicha, tempoReferencia }>
  const funcionariosMap = new Map()

  // ═══ Consolidação por OP ═══
  // Map<id_da_op, { descricao, producao, meta, eficiencia, tempoTrabalhado, tempoFicha, tempoReferencia }>
  const opsConsolidado = new Map()

  // ═══ Consolidação por etapa ═══
  // Map<descricao, { producao, meta, eficiencia, tempoTrabalhado, tempoFicha }>
  const etapasConsolidado = new Map()

  // ═══ Processar cada registro de produção ═══
  for (const prod of producoes) {
    const funcEmail = prod.id_funcionario
    const funcNome = prod.producao_funcionario?.nome || funcEmail
    const funcFoto = prod.producao_funcionario?.foto || null
    const etapaId = prod.id_da_funcao
    const etapaDesc = prod.producao_etapa?.descricao || 'Sem Etapa'
    const etapaTempoPadrao = prod.producao_etapa?.tempo_padrao ?? 0
    const idOp = prod.id_da_op
    const quantidade = prod.quantidade_pecas || 0
    const tempoProduzido = prod.tempo_produzido || 60

    // Resolver SAM (mesma lógica do frontend)
    const sam = resolverSAM(funcEmail, etapaId, idOp, etapaTempoPadrao, etapasReferenciaMap)
    const tempoEfetivo = sam.tempo || etapaTempoPadrao || 0

    // Dia da produção
    const diaStr = dateToSP(prod.data_inicio)
    const diaDate = prod.data_inicio

    // ── Inicializar dia ──
    if (!diasMap.has(diaStr)) {
      diasMap.set(diaStr, {
        data: diaStr,
        date: diaDate,
        producao: 0,
        meta: 0,
        eficiencia: 0,
        funcionariosSet: new Set(),
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
      })
    }
    const dia = diasMap.get(diaStr)
    dia.producao += quantidade
    dia.funcionariosSet.add(funcEmail)
    dia.tempoTrabalhado += tempoProduzido
    dia.tempoFicha += quantidade * (etapaTempoPadrao || 0)
    dia.tempoReferencia += quantidade * tempoEfetivo

    // Meta do dia para esta OP
    const metaDiaOp = metasPorDia.get(diaStr)?.get(idOp) || 0
    dia.meta += metaDiaOp

    // ── Inicializar funcionário ──
    if (!funcionariosMap.has(funcEmail)) {
      funcionariosMap.set(funcEmail, {
        email: funcEmail,
        nome: funcNome,
        foto: funcFoto,
        producao: 0,
        eficienciaFicha: 0,
        eficienciaReferencia: 0,
        diasTrabalhadosSet: new Set(),
        tempoRegistrado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
      })
    }
    const func = funcionariosMap.get(funcEmail)
    func.producao += quantidade
    func.diasTrabalhadosSet.add(diaStr)
    func.tempoRegistrado += tempoProduzido
    func.tempoFicha += quantidade * (etapaTempoPadrao || 0)
    func.tempoReferencia += quantidade * tempoEfetivo

    // ── Inicializar OP ──
    if (!opsConsolidado.has(idOp)) {
      const opInfo = opsMap.get(idOp)
      opsConsolidado.set(idOp, {
        idOp,
        descricao: opInfo?.descricao || `OP ${idOp}`,
        metaTotal: opInfo?.quantidade_pecas || 0,
        producao: 0,
        eficiencia: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
        funcionariosSet: new Set(),
      })
    }
    const opCons = opsConsolidado.get(idOp)
    opCons.producao += quantidade
    opCons.funcionariosSet.add(funcEmail)
    opCons.tempoTrabalhado += tempoProduzido
    opCons.tempoFicha += quantidade * (etapaTempoPadrao || 0)
    opCons.tempoReferencia += quantidade * tempoEfetivo

    // ── Inicializar etapa ──
    const etapaKey = normalizar(etapaDesc)
    if (!etapasConsolidado.has(etapaKey)) {
      etapasConsolidado.set(etapaKey, {
        descricao: etapaDesc,
        producao: 0,
        eficiencia: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
      })
    }
    const etapaC = etapasConsolidado.get(etapaKey)
    etapaC.producao += quantidade
    etapaC.tempoTrabalhado += tempoProduzido
    etapaC.tempoFicha += quantidade * (etapaTempoPadrao || 0)
    etapaC.tempoReferencia += quantidade * tempoEfetivo
  }

  // ═══ Calcular eficiências ═══

  // Por dia
  for (const [, dia] of diasMap) {
    dia.eficiencia = dia.tempoTrabalhado > 0
      ? Math.round((dia.tempoReferencia / dia.tempoTrabalhado) * 10000) / 100
      : 0
    dia.funcionarios = dia.funcionariosSet.size
  }

  // Por funcionário
  for (const [, func] of funcionariosMap) {
    func.eficienciaFicha = func.tempoRegistrado > 0
      ? Math.round((func.tempoFicha / func.tempoRegistrado) * 10000) / 100
      : 0
    func.eficienciaReferencia = func.tempoRegistrado > 0
      ? Math.round((func.tempoReferencia / func.tempoRegistrado) * 10000) / 100
      : 0
    func.diasTrabalhados = func.diasTrabalhadosSet.size
  }

  // Por OP
  for (const [, opC] of opsConsolidado) {
    opC.eficiencia = opC.tempoTrabalhado > 0
      ? Math.round((opC.tempoReferencia / opC.tempoTrabalhado) * 10000) / 100
      : 0
    opC.funcionarios = opC.funcionariosSet.size
  }

  // Por etapa
  for (const [, etapaC] of etapasConsolidado) {
    etapaC.eficiencia = etapaC.tempoTrabalhado > 0
      ? Math.round((etapaC.tempoReferencia / etapaC.tempoTrabalhado) * 10000) / 100
      : 0
  }

  // ═══ Totais gerais ═══
  const dias = [...diasMap.values()].sort((a, b) => a.data.localeCompare(b.data))
  const producaoTotal = dias.reduce((s, d) => s + d.producao, 0)
  const metaTotal = dias.reduce((s, d) => s + d.meta, 0)
  const tempoTrabalhadoTotal = dias.reduce((s, d) => s + d.tempoTrabalhado, 0)
  const tempoFichaTotal = dias.reduce((s, d) => s + d.tempoFicha, 0)
  const tempoReferenciaTotal = dias.reduce((s, d) => s + d.tempoReferencia, 0)
  const eficienciaGeral = tempoTrabalhadoTotal > 0
    ? Math.round((tempoReferenciaTotal / tempoTrabalhadoTotal) * 10000) / 100
    : 0
  const eficienciaGeralFicha = tempoTrabalhadoTotal > 0
    ? Math.round((tempoFichaTotal / tempoTrabalhadoTotal) * 10000) / 100
    : 0

  // ═══ Ranking de funcionários ═══
  const rankingFuncionarios = [...funcionariosMap.values()]
    .sort((a, b) => b.producao - a.producao)

  // ═══ Melhor/pior dia ═══
  const diasComProducao = dias.filter(d => d.producao > 0)
  const melhorDia = diasComProducao.length > 0
    ? diasComProducao.reduce((max, d) => d.eficiencia > max.eficiencia ? d : max, diasComProducao[0])
    : null
  const piorDia = diasComProducao.length > 0
    ? diasComProducao.reduce((min, d) => d.eficiencia < min.eficiencia ? d : min, diasComProducao[0])
    : null

  // ═══ Melhor funcionário ═══
  const funcsComProd = rankingFuncionarios.filter(f => f.producao > 0)
  const melhorFuncionario = funcsComProd.length > 0
    ? funcsComProd.reduce((max, f) => f.eficienciaReferencia > max.eficienciaReferencia ? f : max, funcsComProd[0])
    : null

  return {
    dados: {
      producaoTotal,
      metaTotal,
      eficienciaGeral,
      eficienciaGeralFicha,
      funcionariosAtivos,
      funcionariosComProducao: rankingFuncionarios.filter(f => f.producao > 0).length,
      opsCount: opsConsolidado.size,
      diasTrabalhados: diasComProducao.length,
      tempoTrabalhadoTotal,
      tempoFichaTotal,
      tempoReferenciaTotal,
      dias,
      rankingFuncionarios,
      melhorDia,
      piorDia,
      melhorFuncionario,
      ops: [...opsConsolidado.values()].sort((a, b) => b.producao - a.producao),
      etapas: [...etapasConsolidado.values()].sort((a, b) => b.producao - a.producao),
    },
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GERAÇÃO DO PDF
// ══════════════════════════════════════════════════════════════════════════════

function gerarPDF(dados, periodoLabel, tipoLabel, nomeEstabelecimento) {
  return new Promise((resolve, reject) => {
    const chunks = []

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 45, right: 45 },
      bufferPages: true,
      info: {
        Title: `${tipoLabel} - ${periodoLabel}`,
        Author: nomeEstabelecimento || 'Linha Tex',
        Subject: 'Relatório de Produção',
      },
    })

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const LARGURA_UTIL = doc.page.width - 90
    const COR = {
      primaria: '#0D6632',
      primariaEscura: '#084D24',
      primariaClara: '#E7F8EF',
      texto: '#052E14',
      textoSuave: '#648F73',
      linha: '#DCEAE3',
      branco: '#FFFFFF',
      fundoCard: '#F7FCF9',
      alto: '#0C6B34',
      medio: '#8A6E00',
      baixo: '#B12626',
    }

    // ── Helper: quebra de página ──
    let yAtual = 50
    const MARGEM_BOTTOM = 50

    function verificarPagina(alturaNecessaria) {
      if (yAtual + alturaNecessaria > doc.page.height - MARGEM_BOTTOM) {
        doc.addPage()
        yAtual = 50
        return true
      }
      return false
    }

    // ── Helper: cor por eficiência ──
    function corEficiencia(valor) {
      if (valor >= 100) return COR.alto
      if (valor >= 75) return COR.medio
      if (valor > 0) return COR.baixo
      return COR.textoSuave
    }

    // ── Helper: formatação ──
    function fmtQtd(v) {
      return Number(v || 0).toLocaleString('pt-BR')
    }
    function fmtPct(v) {
      return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    }
    function fmtMinutos(min) {
      const total = Math.round(Number(min || 0))
      const horas = Math.floor(total / 60)
      const minutos = total % 60
      if (horas > 0) return `${horas}h ${String(minutos).padStart(2, '0')}min`
      return `${minutos}min`
    }

    // ══════════════════════════════════════════════════════════════
    // CABEÇALHO
    // ══════════════════════════════════════════════════════════════
    doc.rect(0, 0, doc.page.width, 70).fill(COR.primaria)
    doc.rect(0, 70, doc.page.width, 2).fill(COR.primariaEscura)

    doc.fontSize(20).font('Helvetica-Bold').fillColor(COR.branco)
    doc.text('LINHA TEX', 45, 18, { width: LARGURA_UTIL })

    doc.fontSize(14).font('Helvetica-Bold')
    doc.text('RELATÓRIO DE PRODUÇÃO', 45, 38, { width: LARGURA_UTIL })

    doc.fontSize(9).font('Helvetica').fillColor('#B0D4C0')
    doc.text(`Período: ${periodoLabel}`, 45, 54, { width: LARGURA_UTIL / 2 })
    doc.text(`Tipo: ${tipoLabel}`, 45 + LARGURA_UTIL / 2, 54, { width: LARGURA_UTIL / 2 })

    yAtual = 85

    // ══════════════════════════════════════════════════════════════
    // FÓRMULA UTILIZADA
    // ══════════════════════════════════════════════════════════════
    verificarPagina(50)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
    doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
    doc.text('Fórmula utilizada', 55, yAtual + 2)
    yAtual += 18

    doc.rect(45, yAtual, LARGURA_UTIL, 28).fill(COR.fundoCard)
    doc.rect(45, yAtual, LARGURA_UTIL, 28).lineWidth(0.5).stroke(COR.linha)

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COR.primariaEscura)
    doc.text('Eficiência (%) = (Σ Peças × SAM × 100) ÷ (Funcionários × Tempo Trabalhado)', 52, yAtual + 5, { width: LARGURA_UTIL - 14 })

    doc.fontSize(7.5).font('Helvetica').fillColor(COR.textoSuave)
    doc.text('SAM = Tempo de Referência do funcionário para a etapa ou, quando não houver, o Tempo Padrão da Ficha Técnica.', 52, yAtual + 17, { width: LARGURA_UTIL - 14 })

    yAtual += 36

    // ══════════════════════════════════════════════════════════════
    // RESUMO EXECUTIVO
    // ══════════════════════════════════════════════════════════════
    verificarPagina(60)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
    doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
    doc.text('Resumo Executivo', 55, yAtual + 2)
    yAtual += 18

    const cardsResumo = [
      { label: 'PRODUÇÃO TOTAL', valor: fmtQtd(dados.producaoTotal), cor: COR.texto },
      { label: 'META TOTAL', valor: fmtQtd(dados.metaTotal), cor: COR.texto },
      { label: 'EFICIÊNCIA', valor: fmtPct(dados.eficienciaGeral), cor: corEficiencia(dados.eficienciaGeral) },
      { label: 'FUNCIONÁRIOS', valor: `${dados.funcionariosComProducao}/${dados.funcionariosAtivos}`, cor: COR.texto },
      { label: 'OPs', valor: String(dados.opsCount), cor: COR.texto },
      { label: 'DIAS TRABALHADOS', valor: String(dados.diasTrabalhados), cor: COR.texto },
    ]

    const cardsPorLinha = 3
    const espacoCard = 6
    const larguraCard = (LARGURA_UTIL - espacoCard * (cardsPorLinha - 1)) / cardsPorLinha
    const alturaCard = 36

    for (let i = 0; i < cardsResumo.length; i++) {
      const linha = Math.floor(i / cardsPorLinha)
      const coluna = i % cardsPorLinha
      const card = cardsResumo[i]

      if (coluna === 0 && i > 0) yAtual += alturaCard + espacoCard

      const x = 45 + coluna * (larguraCard + espacoCard)
      verificarPagina(alturaCard + 4)

      doc.roundedRect(x, yAtual, larguraCard, alturaCard, 3).fill(COR.fundoCard)
      doc.roundedRect(x, yAtual, larguraCard, alturaCard, 3).lineWidth(0.3).stroke(COR.linha)

      doc.fontSize(7).font('Helvetica').fillColor(COR.textoSuave)
      doc.text(card.label, x + 6, yAtual + 6, { width: larguraCard - 12 })

      doc.fontSize(14).font('Helvetica-Bold').fillColor(card.cor)
      doc.text(card.valor, x + 6, yAtual + 18, { width: larguraCard - 12 })
    }

    yAtual += alturaCard + 14

    // ══════════════════════════════════════════════════════════════
    // RESUMO DIÁRIO
    // ══════════════════════════════════════════════════════════════
    verificarPagina(40)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
    doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
    doc.text('Resumo Diário', 55, yAtual + 2)
    yAtual += 18

    const colunasDiario = [
      { header: 'Data', width: 60, align: 'left' },
      { header: 'Dia', width: 45, align: 'left' },
      { header: 'Produção', width: 55, align: 'right' },
      { header: 'Meta', width: 50, align: 'right' },
      { header: 'Eficiência', width: 60, align: 'right' },
      { header: 'Funcionários', width: 55, align: 'right' },
    ]

    // Cabeçalho da tabela
    doc.rect(45, yAtual, LARGURA_UTIL, 16).fill(COR.primaria)
    let xCol = 45
    for (const col of colunasDiario) {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COR.branco)
      doc.text(col.header, xCol + 4, yAtual + 4.5, { width: col.width - 8, align: col.align })
      xCol += col.width
    }
    yAtual += 16

    // Linhas
    for (let i = 0; i < dados.dias.length; i++) {
      const dia = dados.dias[i]
      verificarPagina(14)

      const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
      doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

      const dataSP = dia.date ? dateToSP(dia.date) : dia.data
      const [ano, mes, diaNum] = dataSP.split('-').map(Number)
      const dateObj = new Date(ano, mes - 1, diaNum)
      const nomeDia = DIAS_SEMANA[dateObj.getDay()]

      const linha = [
        { texto: `${diaNum}/${String(mes).padStart(2, '0')}`, align: 'left' },
        { texto: nomeDia, align: 'left' },
        { texto: fmtQtd(dia.producao), align: 'right' },
        { texto: dia.meta > 0 ? fmtQtd(dia.meta) : '—', align: 'right' },
        { texto: dia.producao > 0 ? fmtPct(dia.eficiencia) : '—', align: 'right', cor: dia.producao > 0 ? corEficiencia(dia.eficiencia) : COR.textoSuave },
        { texto: String(dia.funcionarios), align: 'right' },
      ]

      xCol = 45
      let colIdx = 0
      for (const col of colunasDiario) {
        doc.fontSize(7.5).font('Helvetica').fillColor(linha[colIdx].cor || COR.texto)
        doc.text(linha[colIdx].texto, xCol + 4, yAtual + 3.5, { width: col.width - 8, align: col.align })
        xCol += col.width
        colIdx++
      }
      yAtual += 14
    }

    yAtual += 10

    // ══════════════════════════════════════════════════════════════
    // RANKING DE FUNCIONÁRIOS
    // ══════════════════════════════════════════════════════════════
    if (dados.rankingFuncionarios.length > 0) {
      verificarPagina(40)

      doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
      doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
      doc.text('Ranking de Produção', 55, yAtual + 2)
      yAtual += 18

      const colunasRanking = [
        { header: 'Pos.', width: 30, align: 'center' },
        { header: 'Funcionário', width: 120, align: 'left' },
        { header: 'Produção', width: 55, align: 'right' },
        { header: 'Efic. Ficha', width: 55, align: 'right' },
        { header: 'Efic. Ref.', width: 55, align: 'right' },
        { header: 'Dias', width: 30, align: 'right' },
      ]

      doc.rect(45, yAtual, LARGURA_UTIL, 16).fill(COR.primaria)
      xCol = 45
      for (const col of colunasRanking) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COR.branco)
        doc.text(col.header, xCol + 4, yAtual + 4.5, { width: col.width - 8, align: col.align })
        xCol += col.width
      }
      yAtual += 16

      const rankingLimitado = dados.rankingFuncionarios.slice(0, 20)
      for (let i = 0; i < rankingLimitado.length; i++) {
        const func = rankingLimitado[i]
        verificarPagina(14)

        const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
        doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

        const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
        const linha = [
          { texto: medalha, align: 'center' },
          { texto: func.nome || func.email, align: 'left' },
          { texto: fmtQtd(func.producao), align: 'right' },
          { texto: func.producao > 0 ? fmtPct(func.eficienciaFicha) : '—', align: 'right', cor: func.producao > 0 ? corEficiencia(func.eficienciaFicha) : COR.textoSuave },
          { texto: func.producao > 0 ? fmtPct(func.eficienciaReferencia) : '—', align: 'right', cor: func.producao > 0 ? corEficiencia(func.eficienciaReferencia) : COR.textoSuave },
          { texto: String(func.diasTrabalhados), align: 'right' },
        ]

        xCol = 45
        let colIdx = 0
        for (const col of colunasRanking) {
          doc.fontSize(7.5).font('Helvetica').fillColor(linha[colIdx].cor || COR.texto)
          doc.text(linha[colIdx].texto, xCol + 4, yAtual + 3.5, { width: col.width - 8, align: col.align })
          xCol += col.width
          colIdx++
        }
        yAtual += 14
      }

      yAtual += 10
    }

    // ══════════════════════════════════════════════════════════════
    // PRODUÇÃO POR OP
    // ══════════════════════════════════════════════════════════════
    if (dados.ops.length > 0) {
      verificarPagina(40)

      doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
      doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
      doc.text('Produção por OP', 55, yAtual + 2)
      yAtual += 18

      const colunasOp = [
        { header: 'OP', width: 40, align: 'center' },
        { header: 'Descrição', width: 110, align: 'left' },
        { header: 'Produção', width: 55, align: 'right' },
        { header: 'Meta', width: 50, align: 'right' },
        { header: 'Eficiência', width: 60, align: 'right' },
        { header: 'Funcionários', width: 50, align: 'right' },
      ]

      doc.rect(45, yAtual, LARGURA_UTIL, 16).fill(COR.primariaEscura)
      xCol = 45
      for (const col of colunasOp) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COR.branco)
        doc.text(col.header, xCol + 4, yAtual + 4.5, { width: col.width - 8, align: col.align })
        xCol += col.width
      }
      yAtual += 16

      for (let i = 0; i < dados.ops.length; i++) {
        const op = dados.ops[i]
        verificarPagina(14)

        const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
        doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

        const linha = [
          { texto: String(op.idOp), align: 'center' },
          { texto: (op.descricao || '—').substring(0, 40), align: 'left' },
          { texto: fmtQtd(op.producao), align: 'right' },
          { texto: op.metaTotal > 0 ? fmtQtd(op.metaTotal) : '—', align: 'right' },
          { texto: op.producao > 0 ? fmtPct(op.eficiencia) : '—', align: 'right', cor: op.producao > 0 ? corEficiencia(op.eficiencia) : COR.textoSuave },
          { texto: String(op.funcionarios), align: 'right' },
        ]

        xCol = 45
        let colIdx = 0
        for (const col of colunasOp) {
          doc.fontSize(7.5).font('Helvetica').fillColor(linha[colIdx].cor || COR.texto)
          doc.text(linha[colIdx].texto, xCol + 4, yAtual + 3.5, { width: col.width - 8, align: col.align })
          xCol += col.width
          colIdx++
        }
        yAtual += 14
      }

      yAtual += 10
    }

    // ══════════════════════════════════════════════════════════════
    // PRODUÇÃO POR ETAPA
    // ══════════════════════════════════════════════════════════════
    if (dados.etapas.length > 0) {
      verificarPagina(40)

      doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
      doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
      doc.text('Produção por Etapa', 55, yAtual + 2)
      yAtual += 18

      const colunasEtapa = [
        { header: 'Etapa', width: 150, align: 'left' },
        { header: 'Produção', width: 60, align: 'right' },
        { header: 'Eficiência', width: 70, align: 'right' },
      ]

      doc.rect(45, yAtual, LARGURA_UTIL, 16).fill(COR.primariaEscura)
      xCol = 45
      for (const col of colunasEtapa) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COR.branco)
        doc.text(col.header, xCol + 4, yAtual + 4.5, { width: col.width - 8, align: col.align })
        xCol += col.width
      }
      yAtual += 16

      for (let i = 0; i < dados.etapas.length; i++) {
        const etapa = dados.etapas[i]
        verificarPagina(14)

        const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
        doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

        const linha = [
          { texto: etapa.descricao || '—', align: 'left' },
          { texto: fmtQtd(etapa.producao), align: 'right' },
          { texto: etapa.producao > 0 ? fmtPct(etapa.eficiencia) : '—', align: 'right', cor: etapa.producao > 0 ? corEficiencia(etapa.eficiencia) : COR.textoSuave },
        ]

        xCol = 45
        let colIdx = 0
        for (const col of colunasEtapa) {
          doc.fontSize(7.5).font('Helvetica').fillColor(linha[colIdx].cor || COR.texto)
          doc.text(linha[colIdx].texto, xCol + 4, yAtual + 3.5, { width: col.width - 8, align: col.align })
          xCol += col.width
          colIdx++
        }
        yAtual += 14
      }

      yAtual += 10
    }

    // ══════════════════════════════════════════════════════════════
    // ANÁLISE DO PERÍODO
    // ══════════════════════════════════════════════════════════════
    verificarPagina(80)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
    doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
    doc.text('Análise do Período', 55, yAtual + 2)
    yAtual += 18

    // Cards de análise
    const analiseCards = []

    if (dados.melhorDia) {
      const dataSP = dateToSP(dados.melhorDia.date)
      const [ano, mes, diaNum] = dataSP.split('-').map(Number)
      const nomeDia = DIAS_SEMANA[new Date(ano, mes - 1, diaNum).getDay()]
      analiseCards.push({
        titulo: '🏆 Melhor Dia',
        campos: [
          { label: 'Data', valor: `${diaNum}/${String(mes).padStart(2, '0')} (${nomeDia})` },
          { label: 'Produção', valor: fmtQtd(dados.melhorDia.producao) },
          { label: 'Eficiência', valor: fmtPct(dados.melhorDia.eficiencia), cor: corEficiencia(dados.melhorDia.eficiencia) },
        ],
      })
    }

    if (dados.piorDia) {
      const dataSP = dateToSP(dados.piorDia.date)
      const [ano, mes, diaNum] = dataSP.split('-').map(Number)
      const nomeDia = DIAS_SEMANA[new Date(ano, mes - 1, diaNum).getDay()]
      analiseCards.push({
        titulo: '📉 Pior Dia',
        campos: [
          { label: 'Data', valor: `${diaNum}/${String(mes).padStart(2, '0')} (${nomeDia})` },
          { label: 'Produção', valor: fmtQtd(dados.piorDia.producao) },
          { label: 'Eficiência', valor: fmtPct(dados.piorDia.eficiencia), cor: corEficiencia(dados.piorDia.eficiencia) },
        ],
      })
    }

    if (dados.melhorFuncionario) {
      analiseCards.push({
        titulo: '🏆 Melhor Funcionário',
        campos: [
          { label: 'Nome', valor: dados.melhorFuncionario.nome },
          { label: 'Produção', valor: fmtQtd(dados.melhorFuncionario.producao) },
          { label: 'Eficiência', valor: fmtPct(dados.melhorFuncionario.eficienciaReferencia), cor: corEficiencia(dados.melhorFuncionario.eficienciaReferencia) },
        ],
      })
    }

    const cardsAnalisePorLinha = 3
    const larguraCardAnalise = (LARGURA_UTIL - 8 * (cardsAnalisePorLinha - 1)) / cardsAnalisePorLinha

    for (let i = 0; i < analiseCards.length; i++) {
      const card = analiseCards[i]
      const coluna = i % cardsAnalisePorLinha
      if (coluna === 0 && i > 0) yAtual += 56
      if (coluna === 0) verificarPagina(52)

      const x = 45 + coluna * (larguraCardAnalise + 8)
      doc.roundedRect(x, yAtual, larguraCardAnalise, 52, 3).fill(COR.fundoCard)
      doc.roundedRect(x, yAtual, larguraCardAnalise, 52, 3).lineWidth(0.3).stroke(COR.linha)

      doc.fontSize(8).font('Helvetica-Bold').fillColor(COR.primariaEscura)
      doc.text(card.titulo, x + 6, yAtual + 5, { width: larguraCardAnalise - 12 })

      for (let j = 0; j < card.campos.length; j++) {
        const campo = card.campos[j]
        doc.fontSize(7).font('Helvetica').fillColor(COR.textoSuave)
        doc.text(campo.label, x + 6, yAtual + 18 + j * 12, { width: larguraCardAnalise - 12 })
        doc.fontSize(9).font('Helvetica-Bold').fillColor(campo.cor || COR.texto)
        doc.text(campo.valor, x + 6, yAtual + 26 + j * 12, { width: larguraCardAnalise - 12 })
      }
    }

    yAtual += 62

    // ══════════════════════════════════════════════════════════════
    // RODAPÉ EM TODAS AS PÁGINAS
    // ══════════════════════════════════════════════════════════════
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)

      // Linha separadora
      doc.moveTo(45, doc.page.height - 35)
        .lineTo(doc.page.width - 45, doc.page.height - 35)
        .lineWidth(0.3)
        .stroke(COR.linha)

      doc.fontSize(7).font('Helvetica').fillColor(COR.textoSuave)
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: FUSO_SP })}`,
        45, doc.page.height - 28,
        { width: LARGURA_UTIL / 2 }
      )
      doc.text(
        `Página ${i + 1} de ${totalPages}`,
        45 + LARGURA_UTIL / 2, doc.page.height - 28,
        { width: LARGURA_UTIL / 2, align: 'right' }
      )
    }

    doc.end()
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

async function gerarRelatorioProducao(cnpj, params) {
  // 1. Resolver período
  const periodo = resolverPeriodo(params)

  // 2. Buscar e consolidar dados
  const { dados } = await buscarEConsolidar(cnpj, periodo.inicio, periodo.fim)

  if (!dados) {
    return {
      pdf: null,
      nomeArquivo: null,
      vazio: true,
      mensagem: 'Nenhum registro de produção encontrado para o período informado.',
    }
  }

  // 3. Buscar nome do estabelecimento
  const estab = await prisma.estabelecimento.findUnique({
    where: { cnpj },
    select: { nome: true },
  })

  // 4. Gerar PDF
  const pdfBuffer = await gerarPDF(dados, periodo.periodoLabel, periodo.tipoLabel, estab?.nome)
  const nomeArquivo = montarNomeArquivo(params.tipo, params)

  return {
    pdf: pdfBuffer,
    nomeArquivo,
    vazio: false,
  }
}

module.exports = {
  gerarRelatorioProducao,
}
