/**
 * utils/producaoCalculos.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA das regras de cálculo de produção no backend.
 *
 * Consumidores:
 *   - Services/relatorioProducaoService.js (relatórios de produção)
 *   - Services/analiseProfissionalService.js (análise individual)
 *
 * REGRA OFICIAL (idêntica ao analiseProfissionalService.js e ao frontend):
 *
 *   Para cada lançamento:
 *
 *     Tempo Ficha     = quantidade × Tempo Padrão da ETAPA
 *     Tempo Fábrica   = quantidade × SAM
 *
 *     SAM (hierarquia):
 *       1. Tempo de Referência do profissional + OP + etapa;
 *       2. Tempo de Referência do profissional + etapa (qualquer OP);
 *       3. Tempo Padrão da etapa (padrao_ficha).
 *
 *     A referência é escolhida pela DATA DA PRODUÇÃO:
 *       1. exatamente na data;
 *       2. anterior mais recente;
 *       3. sem data (mais recente por criadoEm/id);
 *       4. futura mais próxima;
 *       5. fallback → Tempo Padrão da etapa.
 *
 *   EFICIÊNCIA (idêntica ao calculosProducao.js do frontend):
 *
 *     Eficiência (%) = Σ(Quantidade × SAM) × 100 ÷ (Funcionários × Tempo Trabalhado)
 *     Eficiência Ficha (%) = Σ(Quantidade × Tempo Padrão da etapa) × 100 ÷ (... )
 *
 *     - Arredondamento com Math.round() (inteiro), igual ao frontend.
 *     - Lançamentos com quantidade <= 0 NÃO entram na eficiência.
 *     - tempo_produzido ausente/<= 0 → 60 minutos (compatibilidade).
 *     - Nunca retorna NaN/Infinity (divisão por zero → 0).
 *
 *   PRODUÇÃO CONCLUÍDA (relatórios):
 *     Somente a etapa final do fluxo de cada OP (regra única isEtapaFinal de
 *     utils/etapaFinal.js; quando a OP tem mais de uma etapa final no fluxo,
 *     vale a ÚLTIMA; a etapa `peca_final` configurada no estabelecimento,
 *     quando casar exatamente, tem prioridade). Estornos (quantidade < 0)
 *     são preservados e o saldo por chave pode zerar a produção concluída.
 *
 *   DATAS:
 *     - `dateToSP` (America/Sao_Paulo) define o DIA de cada lançamento,
 *       a agregação por dia, os filtros de metas e a fronteira de consulta.
 *     - `parseDataUTC` converte YYYY-MM-DD em meia-noite UTC (preserva o dia).
 *     - Intervalo de consulta é [gte, lt): o dataFim entra INTEIRO.
 */

const { isEtapaFinal } = require('./etapaFinal')

const FUSO_SP = 'America/Sao_Paulo'
const MS_DIA = 24 * 60 * 60 * 1000
const TEMPO_PADRAO_LANCAMENTO = 60 // minutos, compatibilidade com lançamentos antigos
/**
 * São Paulo é UTC-3 fixo (sem horário de verão desde 2019).
 * Margem usada para AMPLIAR a janela de consulta do banco e depois filtrar
 * o dia exato em memória — garante que lançamentos reais gravados à noite
 * em SP (que caem no dia UTC seguinte) não sejam perdidos, sem trazer
 * registros codificados por meia-noite UTC do dia seguinte.
 */
const MARGEM_FUSO_MS = 3 * 60 * 60 * 1000

// ══════════════════════════════════════════════════════════════════════════════
// DATA / FUSO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Converte Date para YYYY-MM-DD no fuso de São Paulo.
 *
 * Usado para definir o DIA da produção, das metas e dos agrupamentos.
 */
function dateToSP(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sv-SE', { timeZone: FUSO_SP }).format(d)
}

/**
 * Dia da produção para referências cadastrais (data_medicao, criadoEm, etc.).
 *
 * IMPORTANTÍSSIMO: datas armazenadas como meia-noite UTC representam o DIA
 * da produção. Usar os componentes UTC (e não America/Sao_Paulo) evita que
 * `2026-10-02T00:00:00.000Z` vire `2026-10-01` no Brasil (deslocamento de
 * um dia). Mesma estratégia do analiseProfissionalService e do
 * tempoReferencia.js do frontend.
 */
function dataLocalSP(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Normaliza qualquer valor de data de REFERÊNCIA para YYYY-MM-DD.
 * Aceita Date, "YYYY-MM-DD", "DD/MM/YYYY" e ISO "YYYY-MM-DDT00:00:00Z".
 */
function normalizarDataReferencia(valor) {
  if (valor == null || valor === '') return null

  if (valor instanceof Date) {
    return dataLocalSP(valor)
  }

  const s = String(valor).trim()
  if (!s) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s
  }

  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`
  }

  // DATE serializado como meia-noite UTC: preservar o dia original.
  const utcMidnight = s.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$/)
  if (utcMidnight) {
    return utcMidnight[1]
  }

  const date = new Date(s)
  if (isNaN(date.getTime())) return null
  return dataLocalSP(date)
}

/**
 * Extrai a data da referência (mesma ordem de campos usada no frontend).
 */
function extrairDataReferencia(ref) {
  const campos = [
    'data_medicao',
    'criadoEm',
    'data_referencia',
    'data',
    'data_registro',
    'created_at',
    'createdAt',
    'data_cadastro',
    'data_criacao',
  ]

  for (const campo of campos) {
    const data = normalizarDataReferencia(ref?.[campo])
    if (data) return data
  }

  return null
}

/**
 * Tempo (minutos/peça) de uma referência. > 0 senão 0.
 */
function tempoDaReferencia(ref) {
  const valor = ref?.tempo_minutos ?? ref?.tempo_por_peca ?? 0
  const numero = Number(valor)
  return Number.isFinite(numero) && numero > 0 ? numero : 0
}

/**
 * Dia da produção (data_inicio) como YYYY-MM-DD (componentes UTC —
 * data_inicio é gravada como meia-noite UTC, ver dataLocalSP).
 */
function dataProducaoSP(data) {
  if (!data) return ''
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data
  }
  return normalizarDataReferencia(data) || ''
}

/**
 * Converte YYYY-MM-DD em Date meia-noite UTC (preserva o dia informado).
 * Retorna null quando a data é inválida ou inexistente (ex.: 2026-02-30).
 */
function parseDataUTC(dataISO) {
  if (!dataISO || typeof dataISO !== 'string') return null

  const partes = dataISO.split('-').map(Number)
  if (partes.length !== 3) return null

  const [ano, mes, dia] = partes
  if (!ano || !mes || !dia) return null

  const data = new Date(Date.UTC(ano, mes - 1, dia))

  const valido =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia

  return valido ? data : null
}

/**
 * Valida "YYYY-MM-DD" (formato + data existente no calendário).
 */
function dataISOValida(dataISO) {
  return parseDataUTC(dataISO) != null
}

/**
 * DIA DA PRODUÇÃO (regra híbrida oficial).
 *
 * O banco guarda data_inicio de DUAS formas:
 *   1. Meia-noite UTC representando o DIA (apontamentos do socket:
 *      dataReferencia == data_inicio == Date.UTC(dia)) → o dia é o próprio
 *      dia UTC (usar America/Sao_Paulo aqui deslocaria um dia — o bug
 *      clássico de "produção do dia 01 aparecendo no dia anterior");
 *   2. Instante real (estornos e criações manuais: new Date()) → o dia é a
 *      data local em São Paulo.
 *
 * Se o instante é exatamente meia-noite UTC → caso 1; caso contrário → caso 2.
 */
function diaDaProducao(data) {
  if (!data) return ''

  const d = data instanceof Date ? data : new Date(data)
  if (isNaN(d.getTime())) return ''

  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return dataLocalSP(d) // componentes UTC preservam o dia gravado
  }

  return dateToSP(d) // instante real → fuso de São Paulo
}

/**
 * Intervalo de consulta [gte, lt) em meia-noite UTC:
 * o dataFim entra INTEIRO (evita perder registros do último dia).
 */
function rangeConsulta(dataInicio, dataFim) {
  const gte = parseDataUTC(dataInicio)
  if (!gte) throw new Error(`Data inicial inválida: ${dataInicio}`)

  const fim = parseDataUTC(dataFim)
  if (!fim) throw new Error(`Data final inválida: ${dataFim}`)

  return { gte, lt: new Date(fim.getTime() + MS_DIA) }
}

/**
 * Intervalo de consulta AMPLIADO pela margem de fuso (±3h).
 *
 * Consultar o banco com esta janela e depois filtrar os dias com
 * `diaDaProducao` + `noPeriodo` garante rigor absoluto:
 *   - lançamentos de 20:00–23:59 (SP) do último dia (que caem no dia UTC
 *     seguinte) NÃO são perdidos;
 *   - lançamentos codificados por meia-noite UTC do dia seguinte NÃO são
 *     contabilizados (filtrados em memória).
 */
function rangeConsultaAmpliada(dataInicio, dataFim) {
  const { gte, lt } = rangeConsulta(dataInicio, dataFim)
  return {
    gte: new Date(gte.getTime() - MARGEM_FUSO_MS),
    lt: new Date(lt.getTime() + MARGEM_FUSO_MS),
  }
}

/**
 * Verifica se o dia (YYYY-MM-DD) pertence ao período INCLUSIVO.
 */
function noPeriodo(diaStr, dataInicio, dataFim) {
  if (!diaStr) return false
  return diaStr >= dataInicio && diaStr <= dataFim
}

/**
 * ISO YYYY-MM-DD de um Date meia-noite UTC.
 */
function isoUTC(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

/**
 * YYYY-MM-DD → DD/MM/YYYY
 */
function formatarBR(dataISO) {
  if (!dataISO) return ''
  const [ano, mes, dia] = String(dataISO).split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : ''
}

// ══════════════════════════════════════════════════════════════════════════════
// ARREDONDAMENTO / FÓRMULAS OFICIAIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Arredonda para 2 casas (tempos). Eficiência NÃO usa round2 —
 * eficiência usa Math.round(), igual ao calculosProducao.js do frontend.
 */
const round2 = value => Math.round((Number(value) || 0) * 100) / 100

/**
 * FÓRMULA OFICIAL de eficiência (idêntica ao frontend).
 *
 *   Eficiência (%) = producaoPonderada × 100 ÷ (funcionarios × tempoTrabalhado)
 *
 * producaoPonderada = Σ(quantidade × SAM). Para um único funcionário,
 * funcionarios = 1 (padrão). Divisão por zero → 0 (nunca NaN/Infinity).
 */
function calcularEficiencia({
  producaoPonderada = 0,
  funcionarios = 1,
  tempoTrabalhado = 0,
} = {}) {
  const divisor = (Number(funcionarios) || 0) * (Number(tempoTrabalhado) || 0)
  if (!divisor) return 0
  return Math.round(((Number(producaoPonderada) || 0) * 100) / divisor)
}

/**
 * Capacidade = (Funcionários × Tempo Trabalhado) ÷ SAM (floor).
 */
function calcularCapacidade({ tempoTrabalhado = 0, sam = 0, funcionarios = 1 } = {}) {
  const referencia = Number(sam) || 0
  if (!referencia) return 0
  return Math.floor(((Number(funcionarios) || 0) * (Number(tempoTrabalhado) || 0)) / referencia)
}

/**
 * Tempo trabalhado de um lançamento (compatibilidade: 60 min quando ausente).
 */
function tempoTrabalhadoDoLancamento(prod) {
  const tempo = Number(prod.tempo_produzido)
  return Number.isFinite(tempo) && tempo > 0 ? tempo : TEMPO_PADRAO_LANCAMENTO
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOLUÇÃO DO SAM (TEMPO DE REFERÊNCIA / TEMPO FÁBRICA)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * "Recência" comparável de uma referência: criadoEm → data_medicao → id.
 */
function valorRecenciaRef(ref) {
  if (!ref) return -Infinity
  for (const campo of ['criadoEm', 'data_medicao']) {
    if (!ref[campo]) continue
    const t = new Date(ref[campo]).getTime()
    if (!isNaN(t)) return t
  }
  const idNum = Number(ref.id)
  return isNaN(idNum) ? -Infinity : idNum
}

/**
 * Desempate entre referências de mesma data: mais recente (criadoEm/id).
 */
function escolherMaisRecenteSemAlvo(candidatas) {
  if (!candidatas.length) return null
  return candidatas.reduce((melhor, atual) => {
    if (!melhor) return atual

    if (atual.data && melhor.data) {
      if (atual.data > melhor.data) return atual
      if (atual.data < melhor.data) return melhor
    }

    if (atual.data && !melhor.data) return atual
    if (!atual.data && melhor.data) return melhor

    return valorRecenciaRef(atual.ref) > valorRecenciaRef(melhor.ref) ? atual : melhor
  }, null)
}

/**
 * Escolhe UMA referência de acordo com a data da produção:
 *   1. exatamente na data;
 *   2. anterior mais recente;
 *   3. sem data;
 *   4. futura mais próxima.
 */
function escolherReferenciaPorData(refs, dataConsulta) {
  if (!Array.isArray(refs)) return null

  const candidatas = refs
    .filter(ref => ref && tempoDaReferencia(ref) > 0)
    .map((ref, ordem) => ({ ref, ordem, data: extrairDataReferencia(ref) }))

  if (!candidatas.length) return null

  const alvo = normalizarDataReferencia(dataConsulta)

  if (!alvo) {
    return escolherMaisRecenteSemAlvo(candidatas)?.ref || null
  }

  const datadas = candidatas.filter(c => c.data)
  const semData = candidatas.filter(c => !c.data)

  // 1. Exatamente na data.
  const naData = datadas.filter(c => c.data === alvo)
  if (naData.length) {
    return naData.length === 1 ? naData[0].ref : escolherMaisRecenteSemAlvo(naData)?.ref || null
  }

  // 2. Anterior mais recente.
  const anteriores = datadas
    .filter(c => c.data < alvo)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.ordem - b.ordem))
  if (anteriores.length) {
    return anteriores[0].ref
  }

  // 3. Sem data (mais recente).
  if (semData.length) {
    return escolherMaisRecenteSemAlvo(semData)?.ref || null
  }

  // 4. Futura mais próxima.
  const futuras = datadas
    .filter(c => c.data > alvo)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem))

  return futuras[0]?.ref || null
}

/**
 * Monta o resultado padronizado da resolução do SAM.
 */
function montarResultadoSAM(ref, origem, tempoPadrao) {
  const tempoReferencia = tempoDaReferencia(ref)

  if (tempoReferencia > 0) {
    return {
      tempo: tempoReferencia,
      origem,
      referenciaId: ref?.id ?? null,
      dataReferencia: extrairDataReferencia(ref),
      opId: ref?.opId ?? null,
    }
  }

  return {
    tempo: Number(tempoPadrao) || 0,
    origem: 'padrao_ficha',
    referenciaId: null,
    dataReferencia: null,
    opId: null,
  }
}

/**
 * Resolve o SAM de UM lançamento.
 *
 * Prioridade:
 *   1. Tempo Referência do profissional + OP + etapa  → origem 'peca';
 *   2. Tempo Referência do profissional + etapa       → origem 'ultimo_registrado';
 *   3. Tempo Padrão da etapa                          → origem 'padrao_ficha'.
 *
 * Dentro de cada nível aplica escolherReferenciaPorData (data da produção).
 * Referências de UMA OP nunca vazam para produção de outra OP.
 *
 * @param {Object} params
 * @param {Array}  params.refs           TempoReferencia[] DA ETAPA (qualquer funcionário)
 * @param {string} params.funcionarioEmail  Funcionário do lançamento
 * @param {number|null} params.idOp      OP do lançamento
 * @param {string} params.dataProducao   YYYY-MM-DD do lançamento
 * @param {number} params.tempoPadrao    Tempo padrão da etapa
 */
function resolverSAMPorProducao({ refs, funcionarioEmail, idOp, dataProducao, tempoPadrao }) {
  const lista = Array.isArray(refs) ? refs : []
  const email = funcionarioEmail == null ? '' : String(funcionarioEmail)

  const doFuncionario = lista.filter(ref => {
    if (!ref) return false
    return String(ref.id_funcionario ?? '') === email
  })

  const opIdNumero = idOp == null ? null : Number(idOp)

  // 1. Referência específica da OP (opId pode vir número ou string).
  if (opIdNumero != null) {
    const refsDaOP = doFuncionario.filter(ref => ref.opId != null && Number(ref.opId) === opIdNumero)
    if (refsDaOP.length) {
      const refOP = escolherReferenciaPorData(refsDaOP, dataProducao)
      if (refOP) return montarResultadoSAM(refOP, 'peca', tempoPadrao)
    }
  }

  // 2. Referência geral da etapa (sem OP).
  const refsGerais = doFuncionario.filter(ref => ref.opId == null)
  if (refsGerais.length) {
    const refGeral = escolherReferenciaPorData(refsGerais, dataProducao)
    if (refGeral) return montarResultadoSAM(refGeral, 'ultimo_registrado', tempoPadrao)
  }

  // 3. Fallback: Tempo Padrão da ficha/etapa.
  return montarResultadoSAM(null, 'padrao_ficha', tempoPadrao)
}

/**
 * Agrupa TempoReferencia[] por etapa: Map<id_da_funcao, TempoReferencia[]>.
 */
function agruparReferenciasPorEtapa(tempoReferencia) {
  const mapa = new Map()
  for (const ref of tempoReferencia || []) {
    const idFuncao = ref.id_da_funcao
    if (!mapa.has(idFuncao)) mapa.set(idFuncao, [])
    mapa.get(idFuncao).push(ref)
  }
  return mapa
}

// ══════════════════════════════════════════════════════════════════════════════
// DEDUPLICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Remove lançamentos duplicados de produção.
 *
 * A duplicidade surge de sincronização offline/reapontamentos que não
 * bateram com a chave única do banco:
 *   (id_funcionario, id_da_funcao, id_da_op, dataReferencia, hora_registro, tipoRegistro)
 *
 * Regras:
 *   - Chave: funcionário + OP + etapa + dia (dataReferencia; sem ela,
 *     data_inicio) no fuso SP + hora registrada + tipo de registro.
 *   - Estornos (quantidade_pecas < 0) NUNCA são descartados.
 *   - Entre duplicatas mantém o registro de MAIOR id (mais recente).
 *
 * @returns {{ producoes: Array, removidos: number }}
 */
function removerProducoesDuplicadas(producoes) {
  const melhores = new Map()

  const chaveDe = prod =>
    [
      prod.id_funcionario,
      prod.id_da_op,
      prod.id_da_funcao,
      prod.dataReferencia
        ? dateToSP(prod.dataReferencia)
        : prod.data_inicio
          ? dateToSP(prod.data_inicio)
          : '',
      prod.hora_registro ?? '',
      prod.tipoRegistro ?? 'principal',
    ].join('|')

  for (const prod of producoes || []) {
    // Estorno: preservar sempre.
    if (Number(prod.quantidade_pecas || 0) < 0) continue

    const chave = chaveDe(prod)
    const atual = melhores.get(chave)

    if (!atual || Number(prod.id_da_producao) > Number(atual.id_da_producao)) {
      melhores.set(chave, prod)
    }
  }

  const filtradas = (producoes || []).filter(p => {
    if (Number(p.quantidade_pecas || 0) < 0) return true // estorno: preservar
    return melhores.get(chaveDe(p)) === p
  })

  return { producoes: filtradas, removidos: (producoes || []).length - filtradas.length }
}

// ══════════════════════════════════════════════════════════════════════════════
// ETAPA FINAL (produção concluída)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Decide quais etapas representam a CONCLUSÃO de cada OP.
 *
 * Prioridade:
 *   1. `peca_final` configurada no estabelecimento: descrição casando
 *      exatamente (normalizada) com uma etapa final da OP;
 *   2. caso contrário, entre as etapas da OP que casam com a regra única
 *      `isEtapaFinal` (utils/etapaFinal.js), vale a ÚLTIMA do fluxo
 *      (ordem em PecasEtapas).
 *
 * @returns {Map<number, Set<number>>} Map<id_da_op, Set<id_da_funcao>>
 */
function montarEtapasFinaisPorOp({ opsComEtapas, pecaFinalConfigurada }) {
  const normalizar = texto =>
    (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

  const pecaFinalNorm = normalizar(pecaFinalConfigurada)
  const resultado = new Map()

  for (const op of opsComEtapas || []) {
    const etapasFinais = (op.etapas || []).filter(e => isEtapaFinal(e.etapa?.descricao))
    if (!etapasFinais.length) continue

    let escolhidas = etapasFinais

    if (pecaFinalNorm) {
      const exata = etapasFinais.filter(e => normalizar(e.etapa.descricao) === pecaFinalNorm)
      if (exata.length) escolhidas = exata
    }

    if (escolhidas.length > 1) {
      escolhidas = [escolhidas[escolhidas.length - 1]]
    }

    resultado.set(op.id_da_op, new Set(escolhidas.map(e => e.id_da_funcao)))
  }

  return resultado
}

// ══════════════════════════════════════════════════════════════════════════════
// AGREGAÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analisa lançamentos de produção (JÁ DEDUPLICADOS) e consolida:
 *
 *   - resumo geral (produção registrada, concluída, tempos, eficiências);
 *   - agregação por dia;
 *   - agregação por funcionário;
 *   - agregação por OP;
 *   - agregação por etapa;
 *   - detalhes auditáveis por lançamento (opcional).
 *
 * @param {Array}  producoesValidas Lançamentos SEM duplicatas
 * @param {Object} opcoes
 * @param {Map}    opcoes.etapasReferenciaMap  Map<id_da_funcao, TempoReferencia[]>
 * @param {Map}    [opcoes.opsMap]             Map<id_da_op, { descricao, quantidade_pecas }>
 * @param {Map}    [opcoes.etapasFinaisPorOp]  Map<id_da_op, Set<id_da_funcao>>
 * @param {Map}    [opcoes.metasPorDia]        Map<YYYY-MM-DD, Map<id_da_op, meta>>
 * @param {boolean} [opcoes.incluirDetalhes]   Gera a lista auditável de lançamentos
 */
function analisarLancamentos(
  producoesValidas,
  {
    etapasReferenciaMap = new Map(),
    opsMap = new Map(),
    etapasFinaisPorOp = new Map(),
    metasPorDia = new Map(),
    incluirDetalhes = false,
  } = {}
) {
  const diasMap = new Map()
  const funcionariosMap = new Map()
  const opsConsolidado = new Map()
  const etapasConsolidado = new Map()

  const detalhes = incluirDetalhes ? [] : null

  let producaoRegistradaTotal = 0
  let producaoConcluidaTotal = 0
  let tempoTrabalhadoTotal = 0
  let tempoFichaTotal = 0
  let tempoReferenciaTotal = 0

  let registros = 0
  let registrosIgnorados = 0

  // Saldo líquido (positivos − estornos) por lançamento-chave.
  // Usado para zerar a produção concluída quando tudo foi estornado.
  const saldoPorChave = new Map()
  for (const prod of producoesValidas || []) {
    const chave = [
      prod.id_da_op,
      prod.id_da_funcao,
      prod.id_funcionario,
      diaDaProducao(prod.data_inicio),
      prod.hora_registro ?? '',
    ].join('|')
    saldoPorChave.set(chave, (saldoPorChave.get(chave) || 0) + Number(prod.quantidade_pecas || 0))
  }

  for (const prod of producoesValidas || []) {
    const funcEmail = prod.id_funcionario
    const etapaId = prod.id_da_funcao
    const idOp = prod.id_da_op
    const quantidade = Number(prod.quantidade_pecas) || 0
    const etapaTempoPadrao = Number(prod.producao_etapa?.tempo_padrao) || 0

    // DIA DA PRODUÇÃO: regra híbrida oficial (ver diaDaProducao).
    // Meia-noite UTC → componentes UTC; instante real → fuso de São Paulo.
    const diaStr = diaDaProducao(prod.data_inicio)
    const horaStr = prod.hora_registro ?? (prod.horaNumero != null ? `${String(prod.horaNumero).padStart(2, '0')}:00` : null)

    const saldoLiquido =
      saldoPorChave.get([idOp, etapaId, funcEmail, diaStr, prod.hora_registro ?? ''].join('|')) || 0

    // ── Lançamentos inválidos/estornos: não entram nos totais, mas podem
    //    aparecer nos detalhes para auditoria. ──
    if (quantidade <= 0) {
      registrosIgnorados++

      if (incluirDetalhes) {
        detalhes.push({
          id: prod.id_da_producao ?? prod.id ?? null,
          data: diaStr,
          hora: horaStr,
          dataHora: prod.data_inicio ? new Date(prod.data_inicio).toISOString() : null,
          profissional: prod.producao_funcionario?.nome || funcEmail,
          funcionarioEmail: funcEmail,
          op: idOp,
          etapa: prod.producao_etapa?.descricao || 'Sem etapa',
          quantidade,
          tempoFicha: 0,
          tempoReferencia: 0,
          tempoFabrica: 0,
          tempoTrabalhado: 0,
          eficiencia: 0,
          sam: 0,
          origemTempo: 'estorno',
          referenciaId: null,
          etapaFinal: false,
          saldoLiquido,
          calculado: false,
        })
      }
      continue
    }

    const tempoProduzido = tempoTrabalhadoDoLancamento(prod)

    // ── SAM oficial para ESTE lançamento ──
    const refs = etapasReferenciaMap.get(etapaId) || []
    const samRes = resolverSAMPorProducao({
      refs,
      funcionarioEmail: funcEmail,
      idOp,
      dataProducao: diaStr,
      tempoPadrao: etapaTempoPadrao,
    })
    const sam = Number(samRes?.tempo) || 0

    const tempoFicha = quantidade * etapaTempoPadrao
    const tempoReferencia = quantidade * sam

    // ── Produção concluída: etapa final da OP + saldo líquido ──
    const idsEtapasFinais = etapasFinaisPorOp.get(idOp)
    const ehEtapaFinalDaOp = idsEtapasFinais?.has(etapaId) || false
    const quantidadeConcluida = ehEtapaFinalDaOp && saldoLiquido > 0 ? quantidade : 0

    // ── Totais gerais ──
    producaoRegistradaTotal += quantidade
    producaoConcluidaTotal += quantidadeConcluida
    tempoTrabalhadoTotal += tempoProduzido
    tempoFichaTotal += tempoFicha
    tempoReferenciaTotal += tempoReferencia
    registros++

    // ── Por dia ──
    if (!diasMap.has(diaStr)) {
      diasMap.set(diaStr, {
        data: diaStr,
        producao: 0,
        producaoConcluida: 0,
        meta: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
        funcionariosSet: new Set(),
        registros: 0,
      })
    }
    const dia = diasMap.get(diaStr)
    dia.producao += quantidade
    dia.producaoConcluida += quantidadeConcluida
    dia.meta += metasPorDia.get(diaStr)?.get(idOp) || 0
    dia.tempoTrabalhado += tempoProduzido
    dia.tempoFicha += tempoFicha
    dia.tempoReferencia += tempoReferencia
    dia.funcionariosSet.add(funcEmail)
    dia.registros++

    // ── Por funcionário ──
    if (!funcionariosMap.has(funcEmail)) {
      funcionariosMap.set(funcEmail, {
        email: funcEmail,
        nome: prod.producao_funcionario?.nome || funcEmail,
        foto: prod.producao_funcionario?.foto || null,
        producaoRegistrada: 0,
        producaoConcluida: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
        diasTrabalhadosSet: new Set(),
        opsIdsSet: new Set(),
        etapasIdsSet: new Set(),
        registros: 0,
      })
    }
    const func = funcionariosMap.get(funcEmail)
    func.producaoRegistrada += quantidade
    func.producaoConcluida += quantidadeConcluida
    func.tempoTrabalhado += tempoProduzido
    func.tempoFicha += tempoFicha
    func.tempoReferencia += tempoReferencia
    func.diasTrabalhadosSet.add(diaStr)
    func.opsIdsSet.add(idOp)
    func.etapasIdsSet.add(etapaId)
    func.registros++

    // ── Por OP ──
    if (!opsConsolidado.has(idOp)) {
      const opInfo = opsMap.get(idOp)
      opsConsolidado.set(idOp, {
        idOp,
        descricao: opInfo?.descricao || `OP ${idOp}`,
        metaTotal: opInfo?.quantidade_pecas || 0,
        producaoRegistrada: 0,
        producaoConcluida: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
        funcionariosSet: new Set(),
        etapasSet: new Set(),
        registros: 0,
        primeiraData: diaStr,
        ultimaData: diaStr,
      })
    }
    const opCons = opsConsolidado.get(idOp)
    opCons.producaoRegistrada += quantidade
    opCons.producaoConcluida += quantidadeConcluida
    opCons.tempoTrabalhado += tempoProduzido
    opCons.tempoFicha += tempoFicha
    opCons.tempoReferencia += tempoReferencia
    opCons.funcionariosSet.add(funcEmail)
    opCons.etapasSet.add(etapaId)
    opCons.registros++
    if (diaStr) {
      if (!opCons.primeiraData || diaStr < opCons.primeiraData) opCons.primeiraData = diaStr
      if (diaStr > opCons.ultimaData) opCons.ultimaData = diaStr
    }

    // ── Por etapa ──
    const etapaKey = String(etapaId)
    const etapaDesc = prod.producao_etapa?.descricao || 'Sem etapa'
    if (!etapasConsolidado.has(etapaKey)) {
      etapasConsolidado.set(etapaKey, {
        idEtapa: etapaId,
        descricao: etapaDesc,
        tempoPadrao: etapaTempoPadrao,
        producaoRegistrada: 0,
        producaoConcluida: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
        funcionariosSet: new Set(),
        opsSet: new Set(),
        registros: 0,
        samSet: new Set(),
        origens: new Set(),
      })
    }
    const etapaC = etapasConsolidado.get(etapaKey)
    etapaC.producaoRegistrada += quantidade
    etapaC.producaoConcluida += quantidadeConcluida
    etapaC.tempoTrabalhado += tempoProduzido
    etapaC.tempoFicha += tempoFicha
    etapaC.tempoReferencia += tempoReferencia
    etapaC.funcionariosSet.add(funcEmail)
    etapaC.opsSet.add(idOp)
    etapaC.registros++
    etapaC.samSet.add(Math.round(sam * 1000) / 1000)
    if (samRes?.origem) etapaC.origens.add(samRes.origem)

    // ── Detalhe auditável ──
    if (incluirDetalhes) {
      detalhes.push({
        id: prod.id_da_producao ?? prod.id ?? null,
        data: diaStr,
        hora: horaStr,
        dataHora: prod.data_inicio ? new Date(prod.data_inicio).toISOString() : null,
        profissional: prod.producao_funcionario?.nome || funcEmail,
        funcionarioEmail: funcEmail,
        op: idOp,
        etapa: etapaDesc,
        quantidade,
        tempoFicha: round2(tempoFicha),
        tempoReferencia: round2(tempoReferencia),
        tempoFabrica: round2(tempoReferencia),
        tempoTrabalhado: tempoProduzido,
        eficiencia: calcularEficiencia({ producaoPonderada: tempoReferencia, tempoTrabalhado: tempoProduzido }),
        sam: round2(sam),
        origemTempo: samRes?.origem || 'padrao_ficha',
        referenciaId: samRes?.referenciaId ?? null,
        etapaFinal: ehEtapaFinalDaOp,
        saldoLiquido,
        calculado: true,
      })
    }
  }

  // ── Saída: por dia ──
  const porDia = [...diasMap.values()]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(d => ({
      data: d.data,
      producao: d.producao,
      producaoConcluida: d.producaoConcluida,
      meta: d.meta,
      funcionarios: d.funcionariosSet.size,
      profissionais: d.funcionariosSet.size,
      registros: d.registros,
      tempoTrabalhado: round2(d.tempoTrabalhado),
      tempoFicha: round2(d.tempoFicha),
      tempoReferencia: round2(d.tempoReferencia),
      eficiencia: calcularEficiencia({ producaoPonderada: d.tempoReferencia, tempoTrabalhado: d.tempoTrabalhado }),
      eficienciaFicha: calcularEficiencia({ producaoPonderada: d.tempoFicha, tempoTrabalhado: d.tempoTrabalhado }),
      tempoMedioPorPeca: d.producao > 0 ? round2(d.tempoTrabalhado / d.producao) : 0,
      tempoReferenciaMedio: d.producao > 0 ? round2(d.tempoReferencia / d.producao) : 0,
    }))

  // ── Saída: por funcionário ──
  const funcionarios = [...funcionariosMap.values()]
    .map(f => ({
      email: f.email,
      nome: f.nome,
      foto: f.foto,
      producao: f.producaoRegistrada,
      producaoRegistrada: f.producaoRegistrada,
      producaoConcluida: f.producaoConcluida,
      tempoTrabalhado: round2(f.tempoTrabalhado),
      tempoFicha: round2(f.tempoFicha),
      tempoReferencia: round2(f.tempoReferencia),
      eficiencia: calcularEficiencia({ producaoPonderada: f.tempoReferencia, tempoTrabalhado: f.tempoTrabalhado }),
      eficienciaReferencia: calcularEficiencia({ producaoPonderada: f.tempoReferencia, tempoTrabalhado: f.tempoTrabalhado }),
      eficienciaFicha: calcularEficiencia({ producaoPonderada: f.tempoFicha, tempoTrabalhado: f.tempoTrabalhado }),
      diasTrabalhados: f.diasTrabalhadosSet.size,
      opsTrabalhadas: f.opsIdsSet.size,
      etapasTrabalhadas: f.etapasIdsSet.size,
      registros: f.registros,
    }))
    .sort(
      (a, b) =>
        b.producaoConcluida - a.producaoConcluida ||
        b.producaoRegistrada - a.producaoRegistrada ||
        b.eficienciaReferencia - a.eficienciaReferencia
    )

  // ── Saída: por OP ──
  const ops = [...opsConsolidado.values()]
    .map(o => {
      const samMedio = o.producaoRegistrada > 0 ? o.tempoReferencia / o.producaoRegistrada : 0
      return {
        idOp: o.idOp,
        descricao: o.descricao,
        metaTotal: o.metaTotal,
        producao: o.producaoConcluida,
        producaoConcluida: o.producaoConcluida,
        producaoRegistrada: o.producaoRegistrada,
        profissionais: o.funcionariosSet.size,
        etapas: o.etapasSet.size,
        tempoTrabalhado: round2(o.tempoTrabalhado),
        tempoFicha: round2(o.tempoFicha),
        tempoReferencia: round2(o.tempoReferencia),
        tempoReferenciaMedio: round2(samMedio),
        tempoMedioPorPeca: o.producaoRegistrada > 0 ? round2(o.tempoTrabalhado / o.producaoRegistrada) : 0,
        capacidade: calcularCapacidade({ tempoTrabalhado: o.tempoTrabalhado, sam: samMedio }),
        eficiencia: calcularEficiencia({ producaoPonderada: o.tempoReferencia, tempoTrabalhado: o.tempoTrabalhado }),
        eficienciaFicha: calcularEficiencia({ producaoPonderada: o.tempoFicha, tempoTrabalhado: o.tempoTrabalhado }),
        registros: o.registros,
        primeiraData: o.primeiraData,
        ultimaData: o.ultimaData,
      }
    })
    .sort((a, b) => b.producaoConcluida - a.producaoConcluida || b.producaoRegistrada - a.producaoRegistrada || a.idOp - b.idOp)

  // ── Saída: por etapa ──
  const porEtapa = [...etapasConsolidado.values()]
    .map(e => {
      const samMedio = e.producaoRegistrada > 0 ? e.tempoReferencia / e.producaoRegistrada : 0
      const origemTempoReferencia = e.origens.has('peca')
        ? 'peca'
        : e.origens.has('ultimo_registrado')
          ? 'ultimo_registrado'
          : 'padrao_ficha'
      return {
        idEtapa: e.idEtapa,
        descricao: e.descricao,
        tempoPadrao: round2(e.tempoPadrao),
        producao: e.producaoRegistrada,
        producaoRegistrada: e.producaoRegistrada,
        producaoConcluida: e.producaoConcluida,
        profissionais: e.funcionariosSet.size,
        ops: e.opsSet.size,
        tempoTrabalhado: round2(e.tempoTrabalhado),
        tempoFicha: round2(e.tempoFicha),
        tempoReferencia: round2(e.tempoReferencia),
        tempoReferenciaMedio: round2(samMedio),
        trVariavel: e.samSet.size > 1,
        origemTempoReferencia,
        eficiencia: calcularEficiencia({ producaoPonderada: e.tempoReferencia, tempoTrabalhado: e.tempoTrabalhado }),
        eficienciaFicha: calcularEficiencia({ producaoPonderada: e.tempoFicha, tempoTrabalhado: e.tempoTrabalhado }),
        registros: e.registros,
      }
    })
    .sort((a, b) => b.producaoRegistrada - a.producaoRegistrada || a.idEtapa - b.idEtapa)

  if (incluirDetalhes) {
    detalhes.sort((a, b) => {
      if (a.data !== b.data) return (a.data || '').localeCompare(b.data || '')
      return (a.hora || '').localeCompare(b.hora || '')
    })
  }

  const resumo = {
    producaoRegistrada: producaoRegistradaTotal,
    producaoConcluida: producaoConcluidaTotal,
    metaTotal: porDia.reduce((s, d) => s + d.meta, 0),
    tempoTrabalhado: round2(tempoTrabalhadoTotal),
    tempoFicha: round2(tempoFichaTotal),
    tempoReferencia: round2(tempoReferenciaTotal),
    eficiencia: calcularEficiencia({ producaoPonderada: tempoReferenciaTotal, tempoTrabalhado: tempoTrabalhadoTotal }),
    eficienciaFicha: calcularEficiencia({ producaoPonderada: tempoFichaTotal, tempoTrabalhado: tempoTrabalhadoTotal }),
    tempoMedioPorPeca: producaoRegistradaTotal > 0 ? round2(tempoTrabalhadoTotal / producaoRegistradaTotal) : 0,
    tempoReferenciaMedio: producaoRegistradaTotal > 0 ? round2(tempoReferenciaTotal / producaoRegistradaTotal) : 0,
    profissionais: funcionariosMap.size,
    ops: opsConsolidado.size,
    etapas: etapasConsolidado.size,
    diasTrabalhados: porDia.filter(d => d.producao > 0).length,
    diasConProducaoConcluida: porDia.filter(d => d.producaoConcluida > 0).length,
    registros,
    registrosIgnorados,
  }

  return { resumo, porDia, funcionarios, ops, porEtapa, detalhes }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Datas / fuso
  FUSO_SP,
  MS_DIA,
  MARGEM_FUSO_MS,
  dateToSP,
  dataLocalSP,
  dataProducaoSP,
  diaDaProducao,
  noPeriodo,
  normalizarDataReferencia,
  extrairDataReferencia,
  tempoDaReferencia,
  parseDataUTC,
  dataISOValida,
  rangeConsulta,
  rangeConsultaAmpliada,
  noPeriodo,
  isoUTC,
  formatarBR,

  // Fórmulas oficiais
  round2,
  calcularEficiencia,
  calcularCapacidade,
  tempoTrabalhadoDoLancamento,

  // SAM / Tempo Referência
  valorRecenciaRef,
  escolherMaisRecenteSemAlvo,
  escolherReferenciaPorData,
  montarResultadoSAM,
  resolverSAMPorProducao,
  agruparReferenciasPorEtapa,

  // Duplicidades / etapa final
  removerProducoesDuplicadas,
  montarEtapasFinaisPorOp,

  // Agregação
  analisarLancamentos,
}
