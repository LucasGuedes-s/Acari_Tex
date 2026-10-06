/**
 * relatorioProducaoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Relatórios de Produção (JSON detalhado + PDF).
 *
 * FONTES DE REGRA (sem duplicar lógica):
 *   - utils/producaoCalculos.js → fonte ÚNICA das regras de cálculo
 *     (datas fuso SP, dedupe, SAM/Tempo Fábrica, eficiência, etapa final,
 *     agregações por dia/funcionário/OP/etapa e detalhes auditáveis).
 *   - utils/etapaFinal.js → regra única de "etapa final" (consumida via
 *     utils/producaoCalculos.js).
 *
 * Com isso, relatórios e análise profissional (analiseProfissionalService.js)
 * usam EXATAMENTE as mesmas regras para os mesmos registros:
 * mesma deduplicação, mesmo SAM (referência OP → etapa → padrão, escolhida
 * pela data da produção), mesma eficiência (Math.round) e mesma fronteira
 * de período ([gte, lt) — o último dia entra INTEIRO).
 *
 * PRODUÇÃO CONCLUÍDA (regra dos relatórios):
 *   Totais "concluídos" contabilizam somente a etapa final do fluxo da OP
 *   (regra única isEtapaFinal; peca_final configurada tem prioridade).
 *   Produção de etapas intermediárias aparece como "registrada" e na
 *   seção "Produção por Etapa". Estornos (quantidade < 0) são preservados
 *   e podem zerar a produção concluída via saldo por chave.
 *
 * EFICIÊNCIA:
 *   Eficiência (%) = Σ(Quantidade × SAM) × 100 ÷ (Funcionários × Tempo Trabalhado)
 *   Lançamentos com quantidade <= 0 não entram; tempo_produzido ausente → 60 min.
 */

const { PrismaClient } = require('@prisma/client')
const PDFDocument = require('pdfkit')

const {
  // Datas / fuso
  FUSO_SP,
  dateToSP,
  parseDataUTC,
  dataISOValida,
  rangeConsulta,
  rangeConsultaAmpliada,
  noPeriodo,
  diaDaProducao,
  formatarBR,
  // Fórmulas / regras
  round2,
  calcularEficiencia,
  resolverSAMPorProducao,
  agruparReferenciasPorEtapa,
  removerProducoesDuplicadas,
  montarEtapasFinaisPorOp,
  analisarLancamentos,
} = require('../utils/producaoCalculos')

const prisma = new PrismaClient()

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

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
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const FORMULA_EFICIENCIA =
  'Eficiência (%) = (Σ Peças × SAM × 100) ÷ (Funcionários × Tempo Trabalhado)'

// Log de debug opt-in (não polui produção): RELATORIO_DEBUG=1
const DEBUG = process.env.RELATORIO_DEBUG === '1'
const debugLog = (...args) => {
  if (DEBUG) console.log('[relatorioProducao]', ...args)
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFINIÇÃO DO PERÍODO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve o período a partir dos parâmetros validados pelo controller.
 *
 * Tipos: diario | semanal | quinzenal | mensal | personalizado.
 *
 * Retorna SEMPRE datas ISO (YYYY-MM-DD) + Dates UTC de meia-noite. A consulta
 * usa intervalo [gte, lt): o último dia entra INTEIRO (23:59:59.999),
 * corrigindo o bug antigo de perder registros do dataFim.
 */
function resolverPeriodo(params) {
  const { tipo, dataInicial, dataFinal, mes, ano, quinzena } = params

  if ((tipo === 'personalizado' || tipo === 'semanal') && dataInicial && dataFinal) {
    const inicio = parseDataUTC(dataInicial)
    const fim = parseDataUTC(dataFinal)

    if (!inicio || !fim) {
      throw new Error(`Data inválida ou inexistente: ${!inicio ? dataInicial : dataFinal}.`)
    }

    return {
      tipo,
      dataInicio: dataInicial,
      dataFim: dataFinal,
      inicio,
      fim,
      tipoLabel: tipo === 'semanal' ? 'Relatório Semanal' : 'Relatório Personalizado',
      periodoLabel: `${formatarBR(dataInicial)} a ${formatarBR(dataFinal)}`,
    }
  }

  if (tipo === 'diario' && dataInicial) {
    const inicio = parseDataUTC(dataInicial)

    if (!inicio) {
      throw new Error(`Data inválida ou inexistente: ${dataInicial}.`)
    }

    return {
      tipo,
      dataInicio: dataInicial,
      dataFim: dataInicial,
      inicio,
      fim: inicio,
      tipoLabel: 'Relatório Diário',
      periodoLabel: formatarBR(dataInicial),
    }
  }

  if ((tipo === 'quinzenal' || tipo === 'mensal') && mes && ano) {
    const mesNum = parseInt(mes, 10)
    const anoNum = parseInt(ano, 10)
    const ultimoDia = new Date(Date.UTC(anoNum, mesNum, 0)).getUTCDate()

    let inicioDia = 1
    let fimDia = ultimoDia

    if (tipo === 'quinzenal') {
      const quinzenaNum = parseInt(quinzena || '1', 10)
      if (quinzenaNum === 1) {
        fimDia = 15
      } else {
        inicioDia = 16
      }
    }

    const dataInicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(inicioDia).padStart(2, '0')}`
    const dataFim = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(fimDia).padStart(2, '0')}`

    const inicio = parseDataUTC(dataInicio)
    const fim = parseDataUTC(dataFim)

    if (!inicio || !fim) {
      throw new Error(`Período inválido: ${dataInicio} a ${dataFim}.`)
    }

    return {
      tipo,
      dataInicio,
      dataFim,
      inicio,
      fim,
      tipoLabel:
        tipo === 'quinzenal'
          ? `Relatório Quinzenal (${parseInt(quinzena || '1', 10)}ª quinzena)`
          : 'Relatório Mensal',
      periodoLabel:
        tipo === 'quinzenal'
          ? `${formatarBR(dataInicio)} a ${formatarBR(dataFim)}`
          : `${MESES[mesNum - 1]}/${anoNum}`,
    }
  }

  throw new Error('Parâmetros de período inválidos. Envie tipo + datas ou tipo + mês + ano.')
}

function montarNomeArquivo(tipo, params) {
  const { dataInicial, dataFinal, mes, ano, quinzena } = params
  const agora = dateToSP(new Date())

  if ((tipo === 'semanal' || tipo === 'personalizado') && dataInicial && dataFinal) {
    return `relatorio-producao-${tipo}-${dataInicial}-a-${dataFinal}.pdf`
  }
  if (tipo === 'diario' && dataInicial) {
    return `relatorio-producao-diario-${dataInicial}.pdf`
  }
  if (tipo === 'quinzenal' && mes && ano) {
    const q = parseInt(quinzena || '1', 10)
    const inicio = q === 1 ? `${ano}-${String(mes).padStart(2, '0')}-01` : `${ano}-${String(mes).padStart(2, '0')}-16`
    const fimDia = q === 1 ? 15 : new Date(Date.UTC(parseInt(ano), parseInt(mes), 0)).getUTCDate()
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimDia).padStart(2, '0')}`
    return `relatorio-producao-quinzenal-${inicio}-a-${fim}.pdf`
  }
  if (tipo === 'mensal' && mes && ano) {
    return `relatorio-producao-mensal-${ano}-${String(mes).padStart(2, '0')}.pdf`
  }
  return `relatorio-producao-${agora}.pdf`
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTA + CONSOLIDAÇÃO (núcleo compartilhado por JSON e PDF)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Monta o contexto de cálculo (1 consulta por tabela, sem N+1) e consolida
 * os lançamentos com as regras oficiais de utils/producaoCalculos.js.
 *
 * @returns {Object} { periodo, estabelecimento, consolidado, duplicadosRemovidos }
 */
async function calcularRelatorio(cnpj, periodo, { incluirDetalhes = false } = {}) {
  // Janela ampliada (±3h): captura lançamentos reais gravados à noite em SP
  // que caem no dia UTC seguinte; o recorte exato do período é feito em
  // memória com diaDaProducao + noPeriodo (rigor de fuso).
  const { gte, lt } = rangeConsultaAmpliada(periodo.dataInicio, periodo.dataFim)

  const [
    estabelecimento,
    producoes,
    todosTempoRef,
    metas,
    funcionariosAtivos,
  ] = await Promise.all([
    prisma.estabelecimento.findUnique({
      where: { cnpj },
      select: { nome: true, peca_final: true, tempo_de_producao: true },
    }),

    prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpj,
        // [gte, lt): inclui o dataFim INTEIRO (correção de fuso/fronteira).
        data_inicio: { gte, lt },
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
        // dataReferencia, tipoRegistro, hora_registro, horaNumero e
        // tempo_produzido são escalares de Producao — o Prisma já os retorna.
      },
      orderBy: [
        { id_funcionario: 'asc' },
        { data_inicio: 'asc' },
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
      orderBy: { id: 'asc' },
    }),

    prisma.metaDia.findMany({
      where: {
        estabelecimentoCnpj: cnpj,
        // Filtro espelha a mesma fronteira [gte, lt) da produção.
        data: { gte, lt },
      },
      include: {
        pecas: { select: { id_da_op: true, meta: true } },
      },
    }),

    prisma.usuarios.count({
      where: { estabelecimentoCnpj: cnpj, status: 'ativo' },
    }),
  ])

  if (!estabelecimento) {
    const err = new Error('Estabelecimento não encontrado.')
    err.statusCode = 404
    throw err
  }

  // ═══ Filtro EXATO de período em memória (regra híbrida de fuso) ═══
  // Mantém apenas lançamentos cujo DIA DA PRODUÇÃO (regra híbrida)
  // pertence ao período solicitado, INCLUSIVE as fronteiras.
  const producoesNoPeriodo = producoes.filter(p =>
    noPeriodo(diaDaProducao(p.data_inicio), periodo.dataInicio, periodo.dataFim)
  )

  debugLog(
    `período ${periodo.dataInicio} → ${periodo.dataFim} | gte=${gte.toISOString()} lt=${lt.toISOString()} | lançamentos=${producoes.length} (no período: ${producoesNoPeriodo.length})`
  )

  // ═══ Map de referências por etapa (id_da_funcao → TempoReferencia[]) ═══
  const etapasReferenciaMap = agruparReferenciasPorEtapa(todosTempoRef)

  // ═══ Metas por dia/OP (mesmo fuso SP da produção) ═══
  // A meta pertence ao DIA configurado (armazenado como meia-noite local
  // pelo metaDia.service). Usar o mesmo diaDaProducao evita deslocar a
  // meta para o dia anterior.
  const metasPorDia = new Map()
  for (const meta of metas) {
    const diaStr = diaDaProducao(meta.data)
    if (!metasPorDia.has(diaStr)) metasPorDia.set(diaStr, new Map())
    for (const p of meta.pecas || []) {
      metasPorDia.get(diaStr).set(p.id_da_op, p.meta || 0)
    }
  }

  // ═══ OPs envolvidas (uma única consulta) ═══
  const opIds = [...new Set(producoes.map(p => p.id_da_op).filter(id => id != null))]

  let opsMap = new Map()
  let etapasFinaisPorOp = new Map()

  if (opIds.length) {
    const [ops, opsComEtapas] = await Promise.all([
      prisma.pecasOP.findMany({
        where: { id_Estabelecimento: cnpj, id_da_op: { in: opIds } },
        select: {
          id_da_op: true,
          descricao: true,
          quantidade_pecas: true,
          tempo_padrao: true,
        },
      }),
      prisma.pecasOP.findMany({
        where: { id_Estabelecimento: cnpj, id_da_op: { in: opIds } },
        select: {
          id_da_op: true,
          etapas: {
            select: {
              id_da_funcao: true,
              etapa: { select: { descricao: true } },
            },
          },
        },
      }),
    ])

    opsMap = new Map(ops.map(o => [o.id_da_op, o]))
    etapasFinaisPorOp = montarEtapasFinaisPorOp({
      opsComEtapas,
      pecaFinalConfigurada: estabelecimento.peca_final,
    })
  }

  // ═══ Dedupe oficial (mesma regra da análise profissional) ═══
  const { producoes: producoesValidas, removidos: duplicadosRemovidos } =
    removerProducoesDuplicadas(producoesNoPeriodo)

  debugLog(
    `após dedupe: ${producoesValidas.length} lançamentos (${duplicadosRemovidos} duplicado(s) removido(s))`
  )

  // ═══ Consolidação com as regras oficiais ═══
  const consolidado = analisarLancamentos(producoesValidas, {
    etapasReferenciaMap,
    opsMap,
    etapasFinaisPorOp,
    metasPorDia,
    incluirDetalhes,
  })

  debugLog(
    `resumo: registradas=${consolidado.resumo.producaoRegistrada} concluídas=${consolidado.resumo.producaoConcluida} eficiência=${consolidado.resumo.eficiencia}%`
  )

  return {
    periodo,
    estabelecimento,
    consolidado,
    duplicadosRemovidos,
    funcionariosAtivos,
  }
}

/**
 * Perfil por profissional (produção por dia e por OP) derivado dos detalhes
 * auditáveis — sem consultas extras ao banco.
 */
function montarPerfilPorProfissional(detalhes) {
  const perfil = new Map()

  for (const d of detalhes) {
    if (!d.calculado) continue

    if (!perfil.has(d.funcionarioEmail)) {
      perfil.set(d.funcionarioEmail, {
        email: d.funcionarioEmail,
        nome: d.profissional,
        producao: 0,
        tempoTrabalhado: 0,
        tempoReferencia: 0,
        dias: new Map(),
        ops: new Map(),
        etapas: new Set(),
      })
    }

    const p = perfil.get(d.funcionarioEmail)
    p.producao += d.quantidade
    p.tempoTrabalhado += d.tempoTrabalhado
    p.tempoReferencia += d.tempoReferencia
    p.etapas.add(d.etapa)

    if (!p.dias.has(d.data)) {
      p.dias.set(d.data, { data: d.data, producao: 0, tempoTrabalhado: 0, tempoReferencia: 0 })
    }
    const diaP = p.dias.get(d.data)
    diaP.producao += d.quantidade
    diaP.tempoTrabalhado += d.tempoTrabalhado
    diaP.tempoReferencia += d.tempoReferencia

    if (!p.ops.has(d.op)) {
      p.ops.set(d.op, { idOp: d.op, producao: 0, tempoTrabalhado: 0, tempoReferencia: 0 })
    }
    const opP = p.ops.get(d.op)
    opP.producao += d.quantidade
    opP.tempoTrabalhado += d.tempoTrabalhado
    opP.tempoReferencia += d.tempoReferencia
  }

  return [...perfil.values()]
    .map(p => ({
      email: p.email,
      nome: p.nome,
      producao: p.producao,
      tempoTrabalhado: round2(p.tempoTrabalhado),
      tempoReferencia: round2(p.tempoReferencia),
      eficiencia: calcularEficiencia({ producaoPonderada: p.tempoReferencia, tempoTrabalhado: p.tempoTrabalhado }),
      etapas: [...p.etapas],
      porDia: [...p.dias.values()]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map(d => ({
          data: d.data,
          producao: d.producao,
          tempoTrabalhado: round2(d.tempoTrabalhado),
          tempoReferencia: round2(d.tempoReferencia),
          eficiencia: calcularEficiencia({ producaoPonderada: d.tempoReferencia, tempoTrabalhado: d.tempoTrabalhado }),
        })),
      porOP: [...p.ops.values()]
        .sort((a, b) => b.producao - a.producao)
        .map(o => ({
          idOp: o.idOp,
          producao: o.producao,
          tempoTrabalhado: round2(o.tempoTrabalhado),
          tempoReferencia: round2(o.tempoReferencia),
          eficiencia: calcularEficiencia({ producaoPonderada: o.tempoReferencia, tempoTrabalhado: o.tempoTrabalhado }),
        })),
    }))
    .sort((a, b) => b.producao - a.producao || a.nome.localeCompare(b.nome))
}

/**
 * Relatório completo em JSON (dados detalhados e auditáveis).
 * Mesmos números do PDF — ambos usam calcularRelatorio().
 */
async function gerarRelatorioCompleto(cnpj, params) {
  const periodo = resolverPeriodo(params)
  const { estabelecimento, consolidado, duplicadosRemovidos, funcionariosAtivos } =
    await calcularRelatorio(cnpj, periodo, { incluirDetalhes: true })

  const { resumo, porDia, funcionarios, ops, porEtapa, detalhes } = consolidado

  return {
    periodo: {
      tipo: periodo.tipo,
      label: periodo.periodoLabel,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
    },

    estabelecimento: {
      cnpj,
      nome: estabelecimento.nome,
      etapaFinalConfigurada: estabelecimento.peca_final || null,
    },

    resumo: {
      // Compat: nome antigo "producaoTotal" = peças concluídas (etapa final).
      pecas: resumo.producaoConcluida,
      producaoTotal: resumo.producaoConcluida,
      producaoRegistrada: resumo.producaoRegistrada,
      profissionais: resumo.profissionais,
      funcionariosAtivos,
      ops: resumo.ops,
      etapas: resumo.etapas,
      diasTrabalhados: resumo.diasTrabalhados,
      metaTotal: resumo.metaTotal,
      tempoTrabalhado: resumo.tempoTrabalhado,
      tempoFicha: resumo.tempoFicha,
      tempoReferencia: resumo.tempoReferencia,
      tempoFabrica: resumo.tempoReferencia,
      eficiencia: resumo.eficiencia,
      eficienciaFicha: resumo.eficienciaFicha,
      tempoMedioPorPeca: resumo.tempoMedioPorPeca,
      tempoReferenciaMedio: resumo.tempoReferenciaMedio,
      registros: resumo.registros,
      registrosIgnorados: resumo.registrosIgnorados,
      duplicadosRemovidos,
      formula: {
        eficiencia: FORMULA_EFICIENCIA,
        sam: 'SAM = Tempo de Referência do profissional para a OP/etapa; sem referência, o último valor registrado da etapa; sem nenhum, o Tempo Padrão da etapa (Tempo Fábrica).',
        producaoConcluida:
          'Produção concluída considera somente a etapa final do fluxo de cada OP; etapas intermediárias aparecem em producaoRegistrada e porEtapa.',
      },
    },

    porProfissional: montarPerfilPorProfissional(detalhes),

    rankingFuncionarios: funcionarios.map((f, indice) => ({
      ...f,
      posicao: indice + 1,
    })),

    porOP: ops,
    ops,
    porEtapa: porEtapa.map(e => ({ ...e, etapa: e.descricao })),
    etapas: porEtapa.map(e => ({ descricao: e.descricao, producao: e.producaoRegistrada, eficiencia: e.eficiencia })),
    porDia,
    dias: porDia,

    melhorDia: porDia.filter(d => d.producaoConcluida > 0)
      .reduce((max, d) => (!max || d.eficiencia > max.eficiencia ? d : max), null),
    piorDia: porDia.filter(d => d.producaoConcluida > 0)
      .reduce((min, d) => (!min || d.eficiencia < min.eficiencia ? d : min), null),

    detalhes,

    vazio: resumo.registros === 0,
  }
}

/**
 * Relatório em PDF (mesmos números do JSON).
 */
async function gerarRelatorioProducao(cnpj, params) {
  const periodo = resolverPeriodo(params)
  const { estabelecimento, consolidado, funcionariosAtivos } = await calcularRelatorio(cnpj, periodo, {
    incluirDetalhes: false,
  })

  const { resumo, porDia, funcionarios, ops, porEtapa } = consolidado

  if (resumo.registros === 0 && resumo.producaoRegistrada === 0) {
    return {
      pdf: null,
      nomeArquivo: null,
      vazio: true,
      mensagem: 'Nenhum registro de produção encontrado para o período informado.',
    }
  }

  // ── Adaptar o consolidado para o formato do PDF (compatibilidade) ──
  const dados = {
    producaoTotal: resumo.producaoConcluida,
    metaTotal: resumo.metaTotal,
    eficienciaGeral: resumo.eficiencia,
    eficienciaGeralFicha: resumo.eficienciaFicha,
    funcionariosAtivos,
    funcionariosComProducao: funcionarios.length,
    opsCount: ops.length,
    diasTrabalhados: porDia.filter(d => d.producaoConcluida > 0).length,
    producaoRegistradaTotal: resumo.producaoRegistrada,
    tempoTrabalhadoTotal: resumo.tempoTrabalhado,
    tempoFichaTotal: resumo.tempoFicha,
    tempoReferenciaTotal: resumo.tempoReferencia,

    dias: porDia.map(d => ({
      ...d,
      date: parseDataUTC(d.data),
    })),

    rankingFuncionarios: funcionarios.map(f => ({
      nome: f.nome,
      email: f.email,
      foto: f.foto,
      producao: f.producaoRegistrada,
      producaoConcluida: f.producaoConcluida,
      eficienciaFicha: f.eficienciaFicha,
      eficienciaReferencia: f.eficienciaReferencia,
      diasTrabalhados: f.diasTrabalhados,
    })),

    melhorDia: porDia.filter(d => d.producaoConcluida > 0)
      .reduce((max, d) => (!max || d.eficiencia > max.eficiencia ? d : max), null),
    piorDia: porDia.filter(d => d.producaoConcluida > 0)
      .reduce((min, d) => (!min || d.eficiencia < min.eficiencia ? d : min), null),

    melhorFuncionario: funcionarios
      .filter(f => f.producaoConcluida > 0)
      .reduce(
        (max, f) =>
          !max ||
          f.producaoConcluida > max.producaoConcluida ||
          (f.producaoConcluida === max.producaoConcluida && f.eficienciaReferencia > max.eficienciaReferencia)
            ? f
            : max,
        null
      ),

    ops: ops.map(o => ({
      idOp: o.idOp,
      descricao: o.descricao,
      producao: o.producaoConcluida,
      producaoRegistrada: o.producaoRegistrada,
      metaTotal: o.metaTotal,
      eficiencia: o.eficiencia,
      funcionarios: o.profissionais,
    })),

    etapas: porEtapa.map(e => ({
      descricao: e.descricao,
      producao: e.producaoRegistrada,
      eficiencia: e.eficiencia,
    })),
  }

  const pdfBuffer = await gerarPDF(dados, periodo.periodoLabel, periodo.tipoLabel, estabelecimento.nome)
  const nomeArquivo = montarNomeArquivo(periodo.tipo, params)

  return {
    pdf: pdfBuffer,
    nomeArquivo,
    vazio: false,
    dados,
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
    const COR = CORES

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

    // ── Helpers: diagramação (somente render; nenhuma regra de dados) ──
    const MARGEM_ESQ = 45

    // Escala as larguras definidas para que a tabela preencha TODA a largura
    // útil, mantendo as proporções. Antes, as colunas somavam ~390pt contra
    // ~505pt úteis, deixando uma faixa vazia à direita da tabela.
    function escalarColunas(colunas) {
      const soma = colunas.reduce((s, c) => s + c.width, 0)
      const fator = LARGURA_UTIL / soma
      return colunas.map(c => ({ ...c, width: c.width * fator }))
    }

    // Altura real de um texto com a largura dada ( considera quebras de
    // linha). Base de todos os layouts dinâmicos — nada é posicionado por
    // offset fixo "no chute".
    function medirAlturaTexto(texto, largura, tamanho, fonte = 'Helvetica') {
      doc.font(fonte).fontSize(tamanho)
      return doc.heightOfString(String(texto), { width: largura })
    }

    // Garante célula de UMA linha: textos longos recebem reticências em vez
    // de quebrar e colidir com a linha seguinte (linhas têm altura fixa).
    function cortarParaUmaLinha(texto, largura) {
      const str = String(texto)
      if (doc.widthOfString(str) <= largura) return str
      let cortado = str
      while (cortado.length > 1 && doc.widthOfString(`${cortado}…`) > largura) {
        cortado = cortado.slice(0, -1)
      }
      return `${cortado.trimEnd()}…`
    }

    function desenharCabecalhoTabela(colunas, corFundo, y) {
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 16).fill(corFundo)
      let x = MARGEM_ESQ
      for (const col of colunas) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COR.branco)
        doc.text(cortarParaUmaLinha(col.header, col.width - 8), x + 4, y + 4.5, {
          width: col.width - 8,
          align: col.align,
          lineBreak: false,
        })
        x += col.width
      }
      return y + 16
    }

    function desenharLinhaTabela(colunas, celulas, y, fillColor) {
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 14).fill(fillColor)
      let x = MARGEM_ESQ
      for (let i = 0; i < colunas.length; i++) {
        const col = colunas[i]
        const celula = celulas[i]
        doc.fontSize(7.5).font('Helvetica').fillColor(celula.cor || COR.texto)
        doc.text(cortarParaUmaLinha(celula.texto, col.width - 8), x + 4, y + 3.5, {
          width: col.width - 8,
          align: col.align,
          lineBreak: false,
        })
        x += col.width
      }
      return y + 14
    }

    // ── Helper: formatação ──
    function fmtQtd(v) {
      return Number(v || 0).toLocaleString('pt-BR')
    }
    function fmtPct(v) {
      return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
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

    // Caixa com altura conforme o conteúdo real: cada parágrafo ocupa seu
    // próprio bloco (medido), sem offsets fixos que colidem quando o texto
    // quebra em mais de uma linha.
    const larguraTextoCaixa = LARGURA_UTIL - 14
    const notaSam =
      'SAM = Tempo de Referência do funcionário para a OP/etapa; sem referência, o último valor registrado da etapa; sem nenhum, o Tempo Padrão da Ficha Técnica (Tempo Fábrica).'
    const notaEtapaFinal =
      'Produção concluída considera somente a etapa final do fluxo de cada OP; etapas intermediárias aparecem apenas em "Produção por Etapa".'

    const alturaFormula = medirAlturaTexto(FORMULA_EFICIENCIA, larguraTextoCaixa, 8.5, 'Helvetica-Bold')
    const alturaNotaSam = medirAlturaTexto(notaSam, larguraTextoCaixa, 7.5)
    const alturaNotaEtapaFinal = medirAlturaTexto(notaEtapaFinal, larguraTextoCaixa, 7.5)
    const alturaCaixa = 8 + alturaFormula + 5 + alturaNotaSam + 4 + alturaNotaEtapaFinal + 8

    doc.rect(45, yAtual, LARGURA_UTIL, alturaCaixa).fill(COR.fundoCard)
    doc.rect(45, yAtual, LARGURA_UTIL, alturaCaixa).lineWidth(0.5).stroke(COR.linha)

    let yCaixa = yAtual + 8

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COR.primariaEscura)
    doc.text(FORMULA_EFICIENCIA, 52, yCaixa, { width: larguraTextoCaixa })
    yCaixa += alturaFormula + 5

    doc.fontSize(7.5).font('Helvetica').fillColor(COR.textoSuave)
    doc.text(notaSam, 52, yCaixa, { width: larguraTextoCaixa })
    yCaixa += alturaNotaSam + 4

    doc.text(notaEtapaFinal, 52, yCaixa, { width: larguraTextoCaixa })

    yAtual += alturaCaixa + 8

    // ══════════════════════════════════════════════════════════════
    // RESUMO EXECUTIVO
    // ══════════════════════════════════════════════════════════════
    verificarPagina(60)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COR.texto)
    doc.rect(45, yAtual, 3, 14).fill(COR.primaria)
    doc.text('Resumo Executivo', 55, yAtual + 2)
    yAtual += 18

    const cardsResumo = [
      { label: 'PRODUÇÃO CONCLUÍDA', valor: fmtQtd(dados.producaoTotal), cor: COR.texto },
      { label: 'PRODUÇÃO REGISTRADA', valor: fmtQtd(dados.producaoRegistradaTotal), cor: COR.textoSuave },
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

    const colunasDiario = escalarColunas([
      { header: 'Data', width: 55, align: 'left' },
      { header: 'Dia', width: 45, align: 'left' },
      { header: 'Concluídas', width: 58, align: 'right' },
      { header: 'Apontadas', width: 58, align: 'right' },
      { header: 'Meta', width: 50, align: 'right' },
      { header: 'Eficiência', width: 60, align: 'right' },
      { header: 'Funcionários', width: 55, align: 'right' },
    ])

    // Reserva cabeçalho + 2 linhas: evita cabeçalho órfão no fim da página.
    verificarPagina(44)
    yAtual = desenharCabecalhoTabela(colunasDiario, COR.primaria, yAtual)

    for (let i = 0; i < dados.dias.length; i++) {
      const dia = dados.dias[i]
      verificarPagina(14)

      const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
      doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

      const dataSP = dia.data
      const [ano, mes, diaNum] = dataSP.split('-').map(Number)
      const nomeDia = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, diaNum)).getUTCDay()]

      const linha = [
        { texto: `${diaNum}/${String(mes).padStart(2, '0')}`, align: 'left' },
        { texto: nomeDia, align: 'left' },
        { texto: fmtQtd(dia.producaoConcluida), align: 'right' },
        { texto: fmtQtd(dia.producao), align: 'right', cor: COR.textoSuave },
        { texto: dia.meta > 0 ? fmtQtd(dia.meta) : '—', align: 'right' },
        { texto: dia.producao > 0 ? fmtPct(dia.eficiencia) : '—', align: 'right', cor: dia.producao > 0 ? corEficiencia(dia.eficiencia) : COR.textoSuave },
        { texto: String(dia.funcionarios), align: 'right' },
      ]

      yAtual = desenharLinhaTabela(colunasDiario, linha, yAtual, fillColor)
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

      const colunasRanking = escalarColunas([
        { header: 'Pos.', width: 30, align: 'center' },
        { header: 'Funcionário', width: 110, align: 'left' },
        { header: 'Concluídas', width: 55, align: 'right' },
        { header: 'Apontadas', width: 55, align: 'right' },
        { header: 'Efic. Ficha', width: 55, align: 'right' },
        { header: 'Efic. Ref.', width: 55, align: 'right' },
        { header: 'Dias', width: 30, align: 'right' },
      ])

      verificarPagina(44)
      yAtual = desenharCabecalhoTabela(colunasRanking, COR.primaria, yAtual)

      const rankingLimitado = dados.rankingFuncionarios.slice(0, 20)
      for (let i = 0; i < rankingLimitado.length; i++) {
        const func = rankingLimitado[i]
        verificarPagina(14)

        const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
        doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

        // Sem emoji de medalha: as fontes padrão do PDF não possuem esses
        // glifos e eles renderizavam como caracteres quebrados. Posição
        // numérica é limpa e alinhada com a coluna.
        const posicao = String(i + 1)
        const linha = [
          { texto: posicao, align: 'center' },
          { texto: func.nome || func.email, align: 'left' },
          { texto: fmtQtd(func.producaoConcluida), align: 'right' },
          { texto: fmtQtd(func.producao), align: 'right', cor: COR.textoSuave },
          { texto: func.producao > 0 ? fmtPct(func.eficienciaFicha) : '—', align: 'right', cor: func.producao > 0 ? corEficiencia(func.eficienciaFicha) : COR.textoSuave },
          { texto: func.producao > 0 ? fmtPct(func.eficienciaReferencia) : '—', align: 'right', cor: func.producao > 0 ? corEficiencia(func.eficienciaReferencia) : COR.textoSuave },
          { texto: String(func.diasTrabalhados), align: 'right' },
        ]

        yAtual = desenharLinhaTabela(colunasRanking, linha, yAtual, fillColor)
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

      const colunasOp = escalarColunas([
        { header: 'OP', width: 40, align: 'center' },
        { header: 'Descrição', width: 100, align: 'left' },
        { header: 'Concluídas', width: 55, align: 'right' },
        { header: 'Apontadas', width: 55, align: 'right' },
        { header: 'Meta', width: 50, align: 'right' },
        { header: 'Eficiência', width: 60, align: 'right' },
        { header: 'Funcionários', width: 50, align: 'right' },
      ])

      verificarPagina(44)
      yAtual = desenharCabecalhoTabela(colunasOp, COR.primariaEscura, yAtual)

      for (let i = 0; i < dados.ops.length; i++) {
        const op = dados.ops[i]
        verificarPagina(14)

        const fillColor = i % 2 === 0 ? COR.fundoCard : COR.branco
        doc.rect(45, yAtual, LARGURA_UTIL, 14).fill(fillColor)

        const linha = [
          { texto: String(op.idOp), align: 'center' },
          { texto: op.descricao || '—', align: 'left' },
          { texto: fmtQtd(op.producao), align: 'right' },
          { texto: fmtQtd(op.producaoRegistrada), align: 'right', cor: COR.textoSuave },
          { texto: op.metaTotal > 0 ? fmtQtd(op.metaTotal) : '—', align: 'right' },
          { texto: op.producao > 0 ? fmtPct(op.eficiencia) : '—', align: 'right', cor: op.producao > 0 ? corEficiencia(op.eficiencia) : COR.textoSuave },
          { texto: String(op.funcionarios), align: 'right' },
        ]

        yAtual = desenharLinhaTabela(colunasOp, linha, yAtual, fillColor)
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
      yAtual += 16

      const notaEtapas =
        'Apontamentos de todas as etapas do fluxo (inclui etapas intermediárias) — NÃO somar como produção concluída.'
      doc.fontSize(7.5).font('Helvetica').fillColor(COR.textoSuave)
      doc.text(notaEtapas, 55, yAtual + 1, { width: LARGURA_UTIL - 10 })
      // Avança pela altura REAL da nota (quebra em 2 linhas não colide com a tabela).
      yAtual += medirAlturaTexto(notaEtapas, LARGURA_UTIL - 10, 7.5) + 6

      const colunasEtapa = escalarColunas([
        { header: 'Etapa', width: 150, align: 'left' },
        { header: 'Produção', width: 60, align: 'right' },
        { header: 'Eficiência', width: 70, align: 'right' },
      ])

      verificarPagina(44)
      yAtual = desenharCabecalhoTabela(colunasEtapa, COR.primariaEscura, yAtual)

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

        yAtual = desenharLinhaTabela(colunasEtapa, linha, yAtual, fillColor)
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

    const analiseCards = []

    if (dados.melhorDia) {
      const [ano, mes, diaNum] = dados.melhorDia.data.split('-').map(Number)
      const nomeDia = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, diaNum)).getUTCDay()]
      analiseCards.push({
        titulo: 'Melhor Dia',
        campos: [
          { label: 'Data', valor: `${diaNum}/${String(mes).padStart(2, '0')} (${nomeDia})` },
          { label: 'Concluídas', valor: fmtQtd(dados.melhorDia.producaoConcluida) },
          { label: 'Eficiência', valor: fmtPct(dados.melhorDia.eficiencia), cor: corEficiencia(dados.melhorDia.eficiencia) },
        ],
      })
    }

    if (dados.piorDia) {
      const [ano, mes, diaNum] = dados.piorDia.data.split('-').map(Number)
      const nomeDia = DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, diaNum)).getUTCDay()]
      analiseCards.push({
        titulo: 'Pior Dia',
        campos: [
          { label: 'Data', valor: `${diaNum}/${String(mes).padStart(2, '0')} (${nomeDia})` },
          { label: 'Concluídas', valor: fmtQtd(dados.piorDia.producaoConcluida) },
          { label: 'Eficiência', valor: fmtPct(dados.piorDia.eficiencia), cor: corEficiencia(dados.piorDia.eficiencia) },
        ],
      })
    }

    if (dados.melhorFuncionario) {
      analiseCards.push({
        titulo: 'Melhor Funcionário',
        campos: [
          { label: 'Nome', valor: dados.melhorFuncionario.nome },
          { label: 'Concluídas', valor: fmtQtd(dados.melhorFuncionario.producaoConcluida) },
          { label: 'Eficiência', valor: fmtPct(dados.melhorFuncionario.eficienciaReferencia), cor: corEficiencia(dados.melhorFuncionario.eficienciaReferencia) },
        ],
      })
    }

    // Cards em FLUXO vertical: título, label e valor cada um no seu bloco,
    // com alturas MEDIDAS pelo texto real (nome grande quebra em 2 linhas e
    // o card cresce — nada de offsets fixos, que eram a causa da sobreposição).
    const cardsAnalisePorLinha = 3
    const espacoCardAnalise = 8
    const larguraCardAnalise = (LARGURA_UTIL - espacoCardAnalise * (cardsAnalisePorLinha - 1)) / cardsAnalisePorLinha
    const larguraTextoCard = larguraCardAnalise - 12
    const CARD_RESPIRO = 6 // padding vertical interno
    const CARD_GAP_TITULO = 6 // título → primeiro label
    const CARD_GAP_LABEL_VALOR = 1.5
    const CARD_GAP_CAMPO = 5 // valor → label seguinte
    const CARD_ALTURA_MINIMA = 52

    /**
     * Mede um card e devolve os segmentos já posicionados verticalmente.
     * A mesma medição alimenta o desenho, então medição e render nunca
     * divergem — cada bloco tem seu próprio espaço garantido.
     */
    function montarCardAnalise(card) {
      const segmentos = []
      let y = CARD_RESPIRO

      const alturaTitulo = medirAlturaTexto(card.titulo, larguraTextoCard, 8, 'Helvetica-Bold')
      segmentos.push({ texto: card.titulo, tamanho: 8, fonte: 'Helvetica-Bold', cor: COR.primariaEscura, dy: y })
      y += alturaTitulo + CARD_GAP_TITULO

      for (const campo of card.campos) {
        const alturaLabel = medirAlturaTexto(campo.label, larguraTextoCard, 7, 'Helvetica')
        segmentos.push({ texto: campo.label, tamanho: 7, fonte: 'Helvetica', cor: COR.textoSuave, dy: y })
        y += alturaLabel + CARD_GAP_LABEL_VALOR

        const alturaValor = medirAlturaTexto(campo.valor, larguraTextoCard, 9, 'Helvetica-Bold')
        segmentos.push({ texto: campo.valor, tamanho: 9, fonte: 'Helvetica-Bold', cor: campo.cor || COR.texto, dy: y })
        y += alturaValor + CARD_GAP_CAMPO
      }

      const alturaConteudo = y - CARD_GAP_CAMPO + CARD_RESPIRO
      return { segmentos, altura: Math.max(alturaConteudo, CARD_ALTURA_MINIMA) }
    }

    for (let i = 0; i < analiseCards.length; i += cardsAnalisePorLinha) {
      const linhaCards = analiseCards.slice(i, i + cardsAnalisePorLinha).map(montarCardAnalise)
      const alturaLinha = Math.max(...linhaCards.map(c => c.altura))

      // O card nunca é partido: se a linha não couber, vai inteira para a próxima página.
      verificarPagina(alturaLinha + 2)

      linhaCards.forEach((card, coluna) => {
        const x = 45 + coluna * (larguraCardAnalise + espacoCardAnalise)

        doc.roundedRect(x, yAtual, larguraCardAnalise, alturaLinha, 3).fill(COR.fundoCard)
        doc.roundedRect(x, yAtual, larguraCardAnalise, alturaLinha, 3).lineWidth(0.3).stroke(COR.linha)

        for (const seg of card.segmentos) {
          doc.font(seg.fonte).fontSize(seg.tamanho).fillColor(seg.cor)
          doc.text(seg.texto, x + 6, yAtual + seg.dy, { width: larguraTextoCard })
        }
      })

      yAtual += alturaLinha + 8
    }

    // ══════════════════════════════════════════════════════════════
    // RODAPÉ EM TODAS AS PÁGINAS
    // ══════════════════════════════════════════════════════════════
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)

      // CAUSA DAS PÁGINAS EM BRANCO: o rodapé é desenhado DENTRO da margem
      // inferior da página. O PDFKit trata todo doc.text() como fluxo e,
      // quando "y + altura da linha > margem inferior", cria uma página nova
      // A CADA chamada — o que acrescentava 2 páginas vazias por página de
      // conteúdo ao final do relatório. Zerar a margem inferior apenas
      // durante o rodapé mantém o texto na própria página (e restaura em
      // seguida, para não afetar mais nada).
      const margemInferiorOriginal = doc.page.margins.bottom
      doc.page.margins.bottom = 0

      doc.moveTo(45, doc.page.height - 35)
        .lineTo(doc.page.width - 45, doc.page.height - 35)
        .lineWidth(0.3)
        .stroke(COR.linha)

      doc.fontSize(7).font('Helvetica').fillColor(COR.textoSuave)
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: FUSO_SP })}`,
        45, doc.page.height - 28,
        { width: LARGURA_UTIL / 2, lineBreak: false }
      )
      doc.text(
        `Página ${i + 1} de ${totalPages}`,
        45 + LARGURA_UTIL / 2, doc.page.height - 28,
        { width: LARGURA_UTIL / 2, align: 'right', lineBreak: false }
      )

      doc.page.margins.bottom = margemInferiorOriginal
    }

    doc.end()
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  gerarRelatorioProducao,
  gerarRelatorioCompleto,
  calcularRelatorio,
  resolverPeriodo,
  montarNomeArquivo,
  gerarPDF,

  // Exportados para testes (tests/relatorioProducao_test.js)
  montarEtapasFinaisPorOp,
  removerProducoesDuplicadas,

  // Reaproveitados por outros serviços/testes — mesma fonte de regra:
  // utils/producaoCalculos.js (reexportados por compatibilidade).
  dateToSP,
  parseDataUTC,
  rangeConsulta,
  calcularEficiencia,
  resolverSAM: (funcionarioEmail, idDaFuncao, idDaOp, tempoPadraoEtapa, etapasReferenciaMap) =>
    resolverSAMPorProducao({
      refs: etapasReferenciaMap.get(idDaFuncao) || [],
      funcionarioEmail,
      idOp: idDaOp,
      dataProducao: null,
      tempoPadrao: tempoPadraoEtapa,
    }).tempo,
}
