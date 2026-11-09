/**
 * dashboardProducaoService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Evolução diária da produção para o gráfico do Dashboard.
 *
 * NÃO recria nenhuma regra: toda a consolidação (SAM, hierarquia do Tempo de
 * Referência, dedupe, etapas finais, fuso de São Paulo) vem de
 * `relatorioProducaoService.calcularRelatorio()` → `utils/producaoCalculos.js`.
 * Este service apenas:
 *   1. resolve a janela de dias;
 *   2. chama a consolidação oficial (6 consultas, sem N+1);
 *   3. recorta os tempos por dia e calcula as eficiências a partir dos TOTAIS
 *      do dia;
 *   4. preenche com zeros os dias sem apontamento.
 *
 * ── Os tempos do dia ─────────────────────────────────────────────────────────
 *   tempoPadrao      = Σ(qtd × Tempo Padrão da peça/etapa)
 *   tempoReferencia  = Σ(qtd × Tempo de Referência INDIVIDUAL válido)
 *                      (sem referência cadastrada → não entra; nada é inventado)
 *   tempoUtilizado   = Σ(qtd × SAM), com SAM = MENOR entre Ficha e Referência
 *                      (mesma regra da tela). Só é exposto se a consolidação
 *                      oficial o fornecer.
 *   tempoEfetivado   = jornada DO DIA × funcionários que apontaram no dia
 *                      (pessoas × tempo; nunca o tempo de uma pessoa só).
 *
 *   A jornada do dia parte de `estabelecimento.tempo_de_producao` (ex.: 540
 *   min) e é REDUZIDA quando a fábrica trabalhou menos: o limite é o horário
 *   real da REVISÃO FINAL naquele dia (início do primeiro slot até o fim do
 *   último slot). Cada slot vale 1 hora, independentemente de quantos minutos
 *   o profissional lançou nele: com a divisão automática (30/30) entre
 *   etapas, `tempo_produzido` da revisão final pode ser 30, mas o slot
 *   continua sendo a hora inteira.
 *
 *   `tempoRegistrado` (Σ tempo_produzido) continua exposto só como informação
 *   de auditoria, nunca como denominador da eficiência.
 *
 * ── Eficiências ──────────────────────────────────────────────────────────────
 *   eficienciaPadrao     = tempoPadrao     × 100 ÷ tempoEfetivado
 *   eficienciaReferencia = tempoReferencia × 100 ÷ tempoEfetivado
 *   eficienciaUtilizada  = tempoUtilizado  × 100 ÷ tempoEfetivado
 *
 *   Cada uma com o seu numerador — nunca uma a partir da outra — e nunca pela
 *   média das eficiências dos dias. Denominador zero devolve `null` (sem
 *   dados), jamais 100% artificial. Arredondamento: 1 casa decimal, igual à
 *   tela de apontamento.
 *
 * ── Peças ────────────────────────────────────────────────────────────────────
 *   quantidadePecas → peças CONCLUÍDAS (etapa final da OP + saldo líquido)
 *   pecasApontadas  → todas as peças apontadas (todas as etapas)
 */

const {
  calcularRelatorio,
  resolverPeriodo,
} = require('./relatorioProducaoService')

const {
  dateToSP,
  parseDataUTC,
  isoUTC,
} = require('../utils/producaoCalculos')

const DIAS_PADRAO = 7
const DIAS_MIN = 1
const DIAS_MAX = 90
const INTERVALO_MAX_DIAS = 366

// Mesmo fallback de `OP.services.js` e `Relatorios.services.js`.
const MINUTOS_JORNADA_PADRAO = 480

// Cada apontamento ocupa um slot de 1 hora, qualquer que seja o `tempo_produzido`.
const SLOT_MINUTOS = 60

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/

const round2 = valor => Math.round((Number(valor) || 0) * 100) / 100

/** Número arredondado ou `null` quando o campo não existe na consolidação. */
function numeroOuNulo(valor) {
  if (valor === undefined || valor === null) return null
  const n = Number(valor)
  return Number.isFinite(n) ? round2(n) : null
}

/**
 * Valida e normaliza os parâmetros da rota.
 *
 * Regras:
 *   - `dataInicio` + `dataFim` (YYYY-MM-DD) têm prioridade sobre `dias`;
 *   - `dias` (1..90, padrão 7) conta o dia de hoje e os anteriores;
 *   - intervalo máximo de 366 dias para manter o payload sob controle.
 *
 * @returns {{ ok: true, params: Object } | { ok: false, status: number, message: string }}
 */
function validarParametros(query = {}) {
  const { dias, dataInicio, dataFim } = query

  const temInicio = dataInicio !== undefined && dataInicio !== ''
  const temFim = dataFim !== undefined && dataFim !== ''

  if (temInicio !== temFim) {
    return {
      ok: false,
      status: 400,
      message: 'Envie dataInicio e dataFim juntas (formato YYYY-MM-DD).',
    }
  }

  if (temInicio && temFim) {
    if (!DATA_REGEX.test(String(dataInicio)) || !DATA_REGEX.test(String(dataFim))) {
      return {
        ok: false,
        status: 400,
        message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-10-29).',
      }
    }

    const inicio = parseDataUTC(String(dataInicio))
    const fim = parseDataUTC(String(dataFim))

    if (!inicio || !fim) {
      return {
        ok: false,
        status: 400,
        message: 'Data inválida ou inexistente no calendário.',
      }
    }

    if (inicio > fim) {
      return {
        ok: false,
        status: 400,
        message: 'dataInicio deve ser menor ou igual a dataFim.',
      }
    }

    const totalDias = Math.round((fim - inicio) / 86400000) + 1

    if (totalDias > INTERVALO_MAX_DIAS) {
      return {
        ok: false,
        status: 400,
        message: `Intervalo máximo de ${INTERVALO_MAX_DIAS} dias.`,
      }
    }

    return {
      ok: true,
      params: {
        dataInicio: String(dataInicio),
        dataFim: String(dataFim),
        dias: totalDias,
      },
    }
  }

  // Só `dias` (ou nada) → janela móvel terminando hoje (fuso de São Paulo).
  let diasNum = DIAS_PADRAO

  if (dias !== undefined && dias !== '') {
    if (!/^\d+$/.test(String(dias).trim())) {
      return {
        ok: false,
        status: 400,
        message: 'Parâmetro "dias" deve ser um número inteiro.',
      }
    }

    diasNum = parseInt(dias, 10)

    if (diasNum < DIAS_MIN || diasNum > DIAS_MAX) {
      return {
        ok: false,
        status: 400,
        message: `Parâmetro "dias" deve estar entre ${DIAS_MIN} e ${DIAS_MAX}.`,
      }
    }
  }

  return { ok: true, params: { dias: diasNum, dataInicio: null, dataFim: null } }
}

/**
 * Janela efetiva do gráfico.
 * Quando só `dias` é informado, o último dia é HOJE no fuso de São Paulo.
 */
function resolverJanela({ dias, dataInicio, dataFim }) {
  if (dataInicio && dataFim) {
    return { dataInicio, dataFim, dias: Math.round((parseDataUTC(dataFim) - parseDataUTC(dataInicio)) / 86400000) + 1 }
  }

  const hoje = dateToSP(new Date())
  const fim = parseDataUTC(hoje)
  const inicio = new Date(fim.getTime() - (dias - 1) * 86400000)

  return { dataInicio: isoUTC(inicio), dataFim: isoUTC(fim), dias }
}

/**
 * Lista todos os dias da janela (inclusive dias sem apontamento).
 */
function listarDias(dataInicio, dataFim) {
  const dias = []
  const inicio = parseDataUTC(dataInicio)
  const fim = parseDataUTC(dataFim)

  if (!inicio || !fim) return dias

  for (let t = inicio.getTime(); t <= fim.getTime(); t += 86400000) {
    dias.push(isoUTC(new Date(t)))
  }

  return dias
}

/**
 * Eficiência de um critério: `null` quando falta numerador ou denominador.
 * Sem tempo efetivado (divisão por zero) ou sem tempo do critério o correto
 * é "sem dados", não 0% nem 100%. Arredonda em 1 casa decimal, como a tela.
 */
function eficienciaOuNulo(numerador, tempoEfetivado) {
  if (!(Number(numerador) > 0)) return null
  if (!(Number(tempoEfetivado) > 0)) return null
  return Math.round(((Number(numerador) * 100) / Number(tempoEfetivado)) * 10) / 10
}

/**
 * "HH:MM" → minutos desde a meia-noite (null se inválido).
 */
function horaParaMinutos(hora) {
  if (!hora || typeof hora !== 'string') return null
  const [h, m] = hora.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/**
 * Jornada REAL de cada dia, derivada da etapa final ("Revisão Final").
 *
 * O dia vai do início do PRIMEIRO slot ao fim do ÚLTIMO slot da etapa final.
 * Cada slot dura SLOT_MINUTOS (1 h) — NÃO o `tempoTrabalhado` do lançamento:
 * com a divisão automática de minutos entre etapas (30/30), usar o tempo do
 * lançamento encurtaria o dia em 30 min.
 *
 *   ex.: revisão final 08:00 … 14:00 (slots de 1 h) → 08:00 às 15:00 → 420 min
 *
 * Regras:
 *   - nunca ultrapassa `jornadaConfigurada`;
 *   - dia sem apontamento na etapa final → mantém a jornada configurada
 *     (não há informação para reduzir; nada é inventado);
 *   - estornos/quantidade zero (`calculado: false`) ficam fora.
 *
 * @param {Array} detalhes lançamentos auditáveis da consolidação oficial
 * @param {number} jornadaConfigurada minutos/dia do estabelecimento
 * @returns {Map<string, number>} dia (YYYY-MM-DD) → minutos de jornada
 */
function calcularJornadaPorDia(detalhes, jornadaConfigurada) {
  const janelas = new Map() // dia → { inicio, fim }

  for (const item of detalhes || []) {
    if (!item || item.calculado === false || !(Number(item.quantidade) > 0)) continue
    if (!item.etapaFinal) continue

    const inicio = horaParaMinutos(item.hora)
    if (inicio == null) continue

    const fim = inicio + SLOT_MINUTOS
    const atual = janelas.get(item.data)

    if (!atual) {
      janelas.set(item.data, { inicio, fim })
    } else {
      if (inicio < atual.inicio) atual.inicio = inicio
      if (fim > atual.fim) atual.fim = fim
    }
  }

  const jornadas = new Map()

  for (const [dia, janela] of janelas) {
    const span = Math.max(0, janela.fim - janela.inicio)
    if (!span) continue
    // A revisão final não pode esticar o dia além da jornada configurada.
    jornadas.set(dia, Math.min(span, jornadaConfigurada))
  }

  return jornadas
}

/**
 * Evolução diária da produção + resumo acumulado.
 *
 * @param {string} cnpj  estabelecimento (sempre de req.user.cnpj)
 * @param {Object} params  saída de `validarParametros`
 */
async function obterEvolucaoProducao(cnpj, params) {
  const janela = resolverJanela(params)

  const periodo = resolverPeriodo({
    tipo: 'personalizado',
    dataInicial: janela.dataInicio,
    dataFinal: janela.dataFim,
  })

  // ═══ Consolidação OFICIAL (uma passada, 6 consultas em paralelo) ═══
  const { consolidado, estabelecimento } = await calcularRelatorio(cnpj, periodo, {
    incluirDetalhes: true,
  })

  const minutosJornada = Number(estabelecimento?.tempo_de_producao) || MINUTOS_JORNADA_PADRAO

  const porDia = new Map(consolidado.porDia.map(d => [d.data, d]))

  // ═══ Jornada REAL de cada dia (limitada pelo horário da revisão final) ═══
  const jornadaPorDia = calcularJornadaPorDia(consolidado.detalhes, minutosJornada)

  // ═══ Dias do calendário (inclusive zerados) ═══
  const evolucao = listarDias(janela.dataInicio, janela.dataFim).map(data => {
    const d = porDia.get(data)

    const quantidadePecas = d ? d.producaoConcluida : 0
    const pecasApontadas = d ? d.producao : 0
    const tempoPadrao = round2(d ? d.tempoFicha : 0)
    const tempoReferencia = round2(d ? d.tempoReferenciaPuro : 0)
    const tempoUtilizado = numeroOuNulo(d?.tempoUtilizado)
    const quantidadeComReferencia = d ? d.quantidadeComReferencia : 0
    const registros = d ? d.registros : 0
    const profissionais = d ? d.funcionarios : 0

    const jornadaDia = jornadaPorDia.get(data) ?? minutosJornada

    // TEMPO EFETIVADO = jornada do dia × profissionais que apontaram nele.
    const tempoEfetivado = round2(profissionais * jornadaDia)
    const tempoRegistrado = round2(d ? d.tempoTrabalhado : 0)

    return {
      data,
      quantidadePecas,
      pecasApontadas,
      tempoPadrao,
      tempoReferencia,
      tempoUtilizado,
      tempoEfetivado,
      eficienciaPadrao: eficienciaOuNulo(tempoPadrao, tempoEfetivado),
      eficienciaReferencia: eficienciaOuNulo(tempoReferencia, tempoEfetivado),
      // Eficiência oficial da tela (SAM = menor entre ficha e referência).
      eficienciaUtilizada: eficienciaOuNulo(tempoUtilizado, tempoEfetivado),
      profissionais,
      minutosJornada,
      jornadaDia,
      tempoRegistrado,
      registros,
      temProducao: registros > 0,
      referenciaCobertura:
        pecasApontadas > 0
          ? round2((quantidadeComReferencia / pecasApontadas) * 100)
          : null,
    }
  })

  // ═══ Resumo: razão dos TOTAIS (nunca média das eficiências diárias) ═══
  const r = consolidado.resumo

  const totalPecas = r.producaoConcluida
  const totalPecasApontadas = r.producaoRegistrada
  const tempoPadraoTotal = round2(r.tempoFicha)
  const tempoReferenciaTotal = round2(r.tempoReferenciaPuro)
  const tempoUtilizadoTotal = numeroOuNulo(r.tempoUtilizado)
  const funcionariosDia = evolucao.reduce((soma, d) => soma + d.profissionais, 0)
  const tempoEfetivadoTotal = round2(
    evolucao.reduce((soma, d) => soma + d.tempoEfetivado, 0)
  )
  const tempoRegistradoTotal = round2(evolucao.reduce((soma, d) => soma + d.tempoRegistrado, 0))

  const diasComProducao = evolucao.filter(d => d.temProducao).length
  const diasComReferencia = evolucao.filter(d => d.tempoReferencia > 0).length

  return {
    periodo: {
      dataInicio: janela.dataInicio,
      dataFim: janela.dataFim,
      dias: janela.dias,
      periodoLabel: periodo.periodoLabel,
    },
    resumo: {
      totalPecas,
      totalPecasApontadas,
      tempoPadraoTotal,
      tempoReferenciaTotal,
      tempoUtilizadoTotal,
      tempoEfetivadoTotal,
      minutosJornada,
      funcionariosDia,
      tempoRegistradoTotal,
      eficienciaPadrao: eficienciaOuNulo(tempoPadraoTotal, tempoEfetivadoTotal),
      eficienciaReferencia: eficienciaOuNulo(tempoReferenciaTotal, tempoEfetivadoTotal),
      eficienciaUtilizada: eficienciaOuNulo(tempoUtilizadoTotal, tempoEfetivadoTotal),
      diasComProducao,
      diasComReferencia,
      diasSemProducao: evolucao.length - diasComProducao,
      referenciaCobertura:
        totalPecasApontadas > 0
          ? round2((r.quantidadeComReferencia / totalPecasApontadas) * 100)
          : null,
      registros: r.registros,
    },
    regras: {
      tempoPadrao: 'soma(quantidade x tempo padrao da peca/etapa)',
      tempoReferencia:
        'soma(quantidade x tempo de referencia individual valido); pecas sem referencia nao entram, entao a eficiencia de referencia e subestimada quando a cobertura for menor que 100%',
      tempoUtilizado: 'soma(quantidade x menor entre tempo ficha e tempo de referencia)',
      tempoEfetivado:
        'jornada do dia (tempo_de_producao, reduzida pelo horario da revisao final, slots de 1h) x funcionarios que apontaram',
      eficienciaPadrao: 'tempoPadrao / tempoEfetivado * 100',
      eficienciaReferencia: 'tempoReferencia / tempoEfetivado * 100',
      eficienciaUtilizada: 'tempoUtilizado / tempoEfetivado * 100 (mesma regra da tela)',
      arredondamento: '1 casa decimal',
      quantidadePecas: 'pecas concluidas (etapa final da OP + saldo liquido)',
      pecasApontadas: 'todas as pecas apontadas, de todas as etapas',
      regraTempoUtilizado: r.regraTempoUtilizado,
      ausenciaReferencia: 'dias sem referencia cadastrada nao geram percentual',
    },
    evolucao,
  }
}

module.exports = {
  obterEvolucaoProducao,
  validarParametros,
  resolverJanela,
  listarDias,
  calcularJornadaPorDia,
  DIAS_PADRAO,
  DIAS_MIN,
  DIAS_MAX,
  SLOT_MINUTOS,
}