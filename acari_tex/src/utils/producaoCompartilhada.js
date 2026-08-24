// src/utils/producaoCompartilhada.js
import { calcularEficiencia, resolverSam } from '@/utils/calculosProducao'

// ── HORA ──────────────────────────────────────────────
export function horaParaMinutos(hora) {
  if (!hora || typeof hora !== 'string') return 0
  const [h, m] = hora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutosParaHora(minutos) {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function gerarSequenciaHoras(inicio, fim) {
  const inicioMin = horaParaMinutos(inicio)
  const fimMin = horaParaMinutos(fim)
  if (!inicio || !fim || fimMin <= inicioMin) return []

  const sequencia = []
  let atual = inicioMin
  while (atual < fimMin) {
    sequencia.push(minutosParaHora(atual))
    atual += 60
  }
  return sequencia
}

// ── TEMPO UTILIZADO REAL (RELÓGIO), SEM SOMAR ETAPAS ──────
/**
 * REGRA CENTRAL (PCP têxtil): o "tempo utilizado" de uma OP (ou de uma
 * etapa/registro dentro dela) é o tempo efetivamente decorrido do
 * primeiro ao último registro — NUNCA a soma aritmética dos tempos de
 * cada etapa/registro.
 *
 * Ex.: Etapa A das 07:00-09:00 (120min), Etapa B das 09:00-12:00 (180min),
 * Etapa Final das 12:00-16:00 (240min) → tempo utilizado = 07:00 até 16:00
 * = 540min, e NUNCA 120+180+240 = 540... (nesse caso coincide, mas em
 * qualquer cenário com sobreposição/lacunas a soma pura gera valores
 * irreais). O cálculo abaixo sempre usa o intervalo de relógio.
 *
 * `entradas` é uma lista de { hora, tempoProduzido }, de onde:
 *   - início = menor horário informado;
 *   - fim = maior (horário + duração do próprio registro daquele slot).
 * O resultado é limitado (nunca ultrapassa) ao tempo máximo do
 * expediente do dia, quando informado.
 */
export function calcularTempoUtilizadoPorIntervalo(entradas, tempoMaximoDia = null) {
  if (!Array.isArray(entradas) || !entradas.length) return 0

  let inicioMin = Infinity
  let fimMin = -Infinity

  for (const entrada of entradas) {
    if (!entrada?.hora) continue
    const inicioSlot = horaParaMinutos(entrada.hora)
    const fimSlot = inicioSlot + Number(entrada.tempoProduzido || 60)
    if (inicioSlot < inicioMin) inicioMin = inicioSlot
    if (fimSlot > fimMin) fimMin = fimSlot
  }

  if (!isFinite(inicioMin) || !isFinite(fimMin)) return 0

  const bruto = Math.max(0, fimMin - inicioMin)
  return tempoMaximoDia != null ? Math.min(bruto, tempoMaximoDia) : bruto
}

// ── MINUTOS DISPONÍVEIS DO DIA (regra por dia da semana) ──
function parseDataLocal(data) {
  if (data instanceof Date) return new Date(data.getTime())
  if (typeof data === 'string') {
    const partes = data.split('-')
    if (partes.length === 3) {
      const [ano, mes, dia] = partes.map(Number)
      if (ano && mes && dia) return new Date(ano, mes - 1, dia)
    }
    const tentativa = new Date(data)
    if (!isNaN(tentativa)) return tentativa
  }
  return new Date()
}

export function minutosDisponiveisDia(data) {
  const d = parseDataLocal(data)
  d.setHours(0, 0, 0, 0)
  const diaSemana = d.getDay() // 0 = domingo … 6 = sábado

  if (diaSemana >= 1 && diaSemana <= 4) return 540 // segunda a quinta
  if (diaSemana === 5) return 480 // sexta
  return 0 // sábado e domingo
}

// ── ETAPA FINAL ───────────────────────────────────────
export function isEtapaFinal(linha) {
  if (!linha?.descricao) return false
  const d = linha.descricao.toLowerCase()
  if (d.includes('revisão intermediaria') || d.includes('revisao intermediaria')) return false
  return (
    d.includes('final') || d.includes('revisão final') || d.includes('revisao final') ||
    d.includes('revisão') || d.includes('revisao') ||
    d.includes('acabamento') || d.includes('qualidade') ||
    d.includes('revisar peça pronta') || d.includes('expedição') || d.includes('expedicao')
  )
}

// ── ETAPAS / TEMPO PADRÃO / TEMPO DE REFERÊNCIA ───────
export function buscarEtapa(etapasPorId, etapaId, opId = null) {
  if (!etapaId || !etapasPorId) return null
  const candidatas = etapasPorId.get(etapaId) || []
  if (opId != null && opId !== '') {
    const match = candidatas.find(e => e.id_da_op === opId)
    if (match) return match
  }
  return candidatas[0] || null
}

export function resolverTempoPadrao(linha) {
  // O tempo padrão usado aqui é o da ETAPA (producao_etapa.tempo_padrao),
  // capturado no momento do lançamento e guardado em `linha.tempoPadrao`
  // (ver construção das linhas no componente). Ele é fixo por lançamento
  // — uma troca de etapa/função durante o dia não altera retroativamente
  // os lançamentos já registrados, pois cada um carrega o seu próprio
  // tempo padrão. O tempo padrão da PEÇA (peca.tempo_padrao) é outro
  // conceito — fica isolado em `linha.tempoPadraoPeca` e NUNCA é lido
  // aqui; serve só a indicadores de capacidade/planejamento da OP.
  return Number(linha?.tempoPadrao || 0)
}

/**
 * Resolve o tempo de referência do funcionário para a etapa/OP da linha.
 *
 * PRIORIDADE DE BUSCA:
 *   1. Override manual do usuário (linha.modoTempo === 'referencia' &&
 *      linha.referenciaSelecionadaId) — este é o valor escolhido no dropdown
 *      pela tela de Registro de Produção e tem PRIORIDADE ABSOLUTA.
 *   2. Tempo de referência do backend: busca na etapa (filtrando por OP)
 *      o registro que pertence ao funcionário (id_funcionario === email).
 *   3. null (sem referência — usa tempo padrão da ficha).
 *
 * NUNCA usa o tempo de outro profissional, de outra OP ou de outra etapa.
 *
 * @param {Object} funcionario - Dados do funcionário (precisa de .email)
 * @param {Object} linha - Linha de produção (precisa de .etapaId, .opId,
 *   opcionalmente .modoTempo e .referenciaSelecionadaId)
 * @param {Map} etapasPorId - Índice de etapas por id_da_funcao
 * @param {Object} [overrides] - Overrides do usuário (opcional, usado pelo
 *   ProducaoDia.vue para respeitar seleções do dropdown do Registro de Produção)
 * @returns {number|null} Tempo de referência em minutos ou null
 */
export function resolverTempoReferencia(funcionario, linha, etapasPorId, overrides = null) {
  // ═══════════════════════════════════════════════════════════════
  // REGRA DE PRIORIDADE:
  //   1. Override manual (dropdown) — via `overrides` ou propriedades da linha
  //      (modoTempo/referenciaSelecionadaId). PRIORIDADE ABSOLUTA.
  //   2. Referência específica do profissional para aquela PEÇA/OP
  //      (busca na etapa filtrando por OP).
  //   3. Referência do profissional para a mesma PEÇA (qualquer OP)
  //      — usa o registro mais recente encontrado.
  //   4. null → usa tempo padrão da ficha.
  //
  // NUNCA usa o tempo de outro profissional.
  // ═══════════════════════════════════════════════════════════════

  // 1. Override manual (dropdown)
  const modoTempo = overrides?.modoTempo || linha?.modoTempo
  const refId = overrides?.referenciaSelecionadaId || linha?.referenciaSelecionadaId

  if (modoTempo === 'referencia' && refId) {
    const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
    const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
    if (Array.isArray(refs)) {
      // Buscar primeiro pelo r.id (PK do banco) — necessário quando
      // um profissional tem VÁRIOS tempos de referência para a mesma
      // etapa/OP (cada um com r.id diferente, mas o mesmo r.id_funcionario).
      // Usar String() porque $event.target.value retorna STRING, mas r.id
      // do banco é NUMBER. Sem isso, a referência nunca é encontrada.
      const refIdBusca = String(refId)
      let ref = refs.find(r => r && String(r.id) === refIdBusca)
      // Fallback: buscar por id_funcionario (compatibilidade).
      if (!ref) ref = refs.find(r => r && r.id_funcionario === refId)
      if (ref) {
        const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
        if (t > 0) return t
      }
    }
  }

  // 2. Referência específica do profissional para a PEÇA/OP
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
  if (Array.isArray(refs) && funcionario?.email) {
    const ref = refs.find(r => r && r.id_funcionario === funcionario.email)
    if (ref) {
      const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
      if (t > 0) return t
    }
  }

  // 3. Referência do profissional para a mesma PEÇA (qualquer OP)
  //    Busca nas todas as etapas com o mesmo id_da_funcao que possuam
  //    referência deste profissional.
  if (funcionario?.email && linha?.etapaId && etapasPorId) {
    const candidatas = etapasPorId.get(linha.etapaId) || []
    let ultimoT = 0
    for (const candidata of candidatas) {
      const candidataRefs = candidata?.tempo_referencia || candidata?.etapa?.tempo_referencia || []
      if (!Array.isArray(candidataRefs)) continue
      const ref = candidataRefs.find(r => r && r.id_funcionario === funcionario.email)
      if (ref) {
        const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
        if (t > 0) ultimoT = t
      }
    }
    if (ultimoT > 0) return ultimoT
  }

  // 4. Sem referência → usa tempo padrão da ficha
  return null
}

/**
 * Resolve o tempo efetivo (referência ou ficha) considerando overrides.
 *
 * @param {Object} funcionario
 * @param {Object} linha
 * @param {Map} etapasPorId
 * @param {Object} [overrides] - Overrides do usuário (modoTempo/referenciaSelecionadaId)
 * @returns {number} Tempo efetivo em minutos
 */
export function resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides = null) {
  const tempoReferencia = resolverTempoReferencia(funcionario, linha, etapasPorId, overrides)
  return resolverSam({ tempoReferencia, tempoPadrao: resolverTempoPadrao(linha, etapasPorId) })
}

// ── AUXILIAR: SELEÇÃO DA ETAPA REPRESENTATIVA DA OP ─────
/**
 * IMPORTANTE (SOLUÇÃO DO PROBLEMA DE DUPLICAÇÃO DE ETAPAS):
 * Como a mesma peça passa por várias etapas (ex: Costura -> Revisão -> Acabamento),
 * NÃO PODEMOS somar o tempo, a quantidade ou os SAMs de todas as etapas.
 * Caso contrário, 40 peças a 60 min se tornariam 120 peças a 180 min.
 *
 * Esta função recebe todas as linhas de uma mesma OP e escolhe a linha/etapa
 * REPRESENTATIVA oficial daquela produção (priorizando Etapas Finais ou com maior produção).
 */
function obterLinhasRepresentativasPorOp(linhas) {
  const linhasPorOp = new Map()

  for (const linha of linhas) {
    if (!linha?.opId) continue
    if (!linhasPorOp.has(linha.opId)) {
      linhasPorOp.set(linha.opId, [])
    }
    linhasPorOp.get(linha.opId).push(linha)
  }

  const result = new Map()

  for (const [opId, listaLinhas] of linhasPorOp.entries()) {
    // 1. Tenta encontrar uma etapa final marcada
    let escolhida = listaLinhas.find(l => isEtapaFinal(l))

    // 2. Se não houver etapa final explícita, escolhe a linha com maior quantidade de peças produzidas
    if (!escolhida) {
      escolhida = listaLinhas.reduce((max, atual) => {
        const qtdMax = Object.values(max.registros || {}).reduce((s, r) => s + Number(r?.quantidade || 0), 0)
        const qtdAtual = Object.values(atual.registros || {}).reduce((s, r) => s + Number(r?.quantidade || 0), 0)
        return qtdAtual > qtdMax ? atual : max
      }, listaLinhas[0])
    }

    result.set(opId, escolhida)
  }

  return result
}

/**
 * Igual à função acima, mas GLOBAL: considera as linhas de TODOS OS
 * FUNCIONÁRIOS que trabalharam na mesma OP.
 *
 * Por quê isso é necessário: a seleção por funcionário (acima) já evita
 * que UM MESMO funcionário tenha suas etapas somadas. Mas quando etapas
 * diferentes da mesma OP são feitas por FUNCIONÁRIOS diferentes (ex.:
 * funcionário 1 faz a Etapa A, funcionário 2 faz a Etapa B, funcionário 3
 * faz a Etapa Final), a consolidação por OP precisa continuar tratando a
 * OP como uma única unidade — escolhendo a etapa final (ou, na ausência
 * dela, a etapa de maior produção) como representante de TODA a OP, e
 * ignorando as demais etapas/funcionários no cômputo de tempo e
 * quantidade daquela OP.
 *
 * Retorna: Map opId -> [{ funcionario, linha }, ...] apenas com os
 * participantes da etapa representativa escolhida.
 */
function obterParticipantesRepresentativosGlobalPorOp(funcionariosDia) {
  const participantesPorOp = new Map()

  for (const funcionario of funcionariosDia || []) {
    for (const linha of funcionario?.linhas || []) {
      if (!linha?.opId) continue
      if (!calcularTotalLinha(linha, funcionario)) continue // sem produção, ignora

      if (!participantesPorOp.has(linha.opId)) participantesPorOp.set(linha.opId, [])
      participantesPorOp.get(linha.opId).push({ funcionario, linha })
    }
  }

  const resultado = new Map()

  for (const [opId, participantes] of participantesPorOp.entries()) {
    // 1. Etapa final tem prioridade absoluta: a OP "fechou" quando chegou nela
    let selecionados = participantes.filter(p => isEtapaFinal(p.linha))

    // 2. Sem etapa final registrada: usa a etapa com maior produção somada
    //    (entre todos os funcionários que passaram por ela) como
    //    representante provisório da OP
    if (!selecionados.length) {
      const producaoPorEtapa = new Map()
      for (const p of participantes) {
        const chaveEtapa = p.linha.etapaId ?? p.linha.descricao ?? '—'
        const qtd = calcularTotalLinha(p.linha, p.funcionario)
        producaoPorEtapa.set(chaveEtapa, (producaoPorEtapa.get(chaveEtapa) || 0) + qtd)
      }

      let etapaVencedora = null
      let maiorQtd = -1
      for (const [chaveEtapa, qtd] of producaoPorEtapa.entries()) {
        if (qtd > maiorQtd) {
          maiorQtd = qtd
          etapaVencedora = chaveEtapa
        }
      }

      selecionados = participantes.filter(p => (p.linha.etapaId ?? p.linha.descricao ?? '—') === etapaVencedora)
    }

    resultado.set(opId, selecionados)
  }

  return resultado
}

// ── AUSÊNCIA / TEMPO TRABALHADO ───────────────────────
export function funcionarioAusenteDiaInteiro(funcionario) {
  return funcionario?.ausencia?.tipo === 'dia_inteiro'
}

export function calcularMinutosAusenciaFuncionario(funcionario, tempoDisponivelDia) {
  const ausencia = funcionario?.ausencia
  if (!ausencia) return 0
  if (ausencia.tipo === 'dia_inteiro') return tempoDisponivelDia

  if (ausencia.tipo === 'parcial' && Array.isArray(ausencia.periodos)) {
    let total = 0
    for (const periodo of ausencia.periodos) {
      if (!periodo?.inicio || !periodo?.fim) continue
      const ini = horaParaMinutos(periodo.inicio)
      const fim = horaParaMinutos(periodo.fim)
      if (fim > ini) total += (fim - ini)
    }
    return Math.min(total, tempoDisponivelDia)
  }
  return 0
}

export function calcularMinutosDisponiveisFuncionario(funcionario, tempoDisponivelDia) {
  const ausente = calcularMinutosAusenciaFuncionario(funcionario, tempoDisponivelDia)
  return Math.max((tempoDisponivelDia || 0) - ausente, 0)
}

export function horaBloqueadaPorAusencia(funcionario, hora) {
  const ausencia = funcionario?.ausencia
  if (!ausencia) return false
  if (ausencia.tipo === 'dia_inteiro') return true
  if (ausencia.tipo !== 'parcial' || !Array.isArray(ausencia.periodos)) return false

  const slotIni = horaParaMinutos(hora)
  const slotFim = slotIni + 60
  return ausencia.periodos.some(p => {
    if (!p?.inicio || !p?.fim) return false
    const pIni = horaParaMinutos(p.inicio)
    const pFim = horaParaMinutos(p.fim)
    return pIni < slotFim && pFim > slotIni
  })
}

// ── TOTAIS ────────────────────────────────────────────
export function calcularTotalLinha(linha, funcionario = null) {
  if (!linha?.registros) return 0
  return Object.entries(linha.registros).reduce((s, [hora, r]) => {
    if (funcionario && horaBloqueadaPorAusencia(funcionario, hora)) return s
    return s + Number(r?.quantidade || 0)
  }, 0)
}

export function calcularTempoUtilizadoLinha(linha, funcionario = null) {
  if (!linha?.registros) return 0
  return Object.entries(linha.registros).reduce((soma, [hora, reg]) => {
    if (funcionario && horaBloqueadaPorAusencia(funcionario, hora)) return soma
    if (reg && reg.quantidade > 0) return soma + (reg.tempoProduzido || 60)
    return soma
  }, 0)
}

export function calcularPecasFinalizadasFuncionario(funcionario) {
  if (!Array.isArray(funcionario?.linhas)) return 0
  return funcionario.linhas.reduce((soma, linha) => {
    if (!isEtapaFinal(linha)) return soma
    return soma + calcularTotalLinha(linha, funcionario)
  }, 0)
}

// ── EFICIÊNCIA POR ETAPA (linha) E POR REGISTRO ───────
export function calcularEficienciaLinhaPadrao(linha, funcionario, etapasPorId) {
  const sam = resolverTempoPadrao(linha, etapasPorId)
  let producaoPonderada = 0
  let tempoTrabalhado = 0

  for (const [hora, reg] of Object.entries(linha?.registros || {})) {
    if (funcionario && horaBloqueadaPorAusencia(funcionario, hora)) continue
    if (reg && reg.quantidade > 0) {
      producaoPonderada += reg.quantidade * sam
      tempoTrabalhado += reg.tempoProduzido || 60
    }
  }
  return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
}

export function calcularEficienciaLinhaReferencia(funcionario, linha, etapasPorId, overrides = null) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides)
  let producaoPonderada = 0
  let tempoTrabalhado = 0
  for (const [hora, reg] of Object.entries(linha?.registros || {})) {
    if (funcionario && horaBloqueadaPorAusencia(funcionario, hora)) continue
    if (reg && reg.quantidade > 0) {
      producaoPonderada += reg.quantidade * sam
      tempoTrabalhado += reg.tempoProduzido || 60
    }
  }
  return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado })
}

export function calcularEficienciaRegistroPadrao(quantidade, tempoProduzido, linha, etapasPorId) {
  const sam = resolverTempoPadrao(linha, etapasPorId)
  if (!quantidade || !tempoProduzido || !sam) return 0
  return calcularEficiencia({ producaoPonderada: quantidade * sam, funcionarios: 1, tempoTrabalhado: tempoProduzido })
}

export function calcularEficienciaRegistroReferencia(quantidade, tempoProduzido, linha, funcionario, etapasPorId, overrides = null) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides)
  if (!quantidade || !tempoProduzido || !sam) return 0
  return calcularEficiencia({ producaoPonderada: quantidade * sam, funcionarios: 1, tempoTrabalhado: tempoProduzido })
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA POR FUNCIONÁRIO × OP
// ══════════════════════════════════════════════════════════════

/**
 * Agrupa a produção de UM funcionário por OP.
 * 
 * REGRA DE OURO (SEM DUPLICAÇÃO DE ETAPAS):
 * Uma OP contém várias etapas operacionais para a mesma peça. Para evitar duplicar/triplicar
 * a quantidade, os minutos trabalhados e o tempo de referência (SAM), esta função seleciona
 * UMA ÚNICA ETAPA REPRESENTATIVA da OP e ignora o acúmulo das etapas secundárias.
 */
export function agruparProducaoFuncionarioPorOp(funcionario, etapasPorId, data = null, overrides = null) {
  // Tempo máximo do expediente do dia (540min seg-qui / 480min sexta).
  // Se `data` não for informada, mantém o padrão seg-qui (540) por
  // compatibilidade com chamadas existentes que ainda não passam a data.
  const tempoMaximoDia = data != null ? minutosDisponiveisDia(data) : 540

  const linhasRepresentativas = obterLinhasRepresentativasPorOp(funcionario?.linhas || [])
  const grupos = []

  for (const [opId, linha] of linhasRepresentativas.entries()) {
    const samFicha = resolverTempoPadrao(linha, etapasPorId)
    const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides)

    let quantidadeProduzida = 0
    let tempoNecessarioFicha = 0
    let tempoNecessarioReferencia = 0
    const horariosSet = new Set()
    const etapasSet = new Set()
    const entradasParaTempo = []

    for (const [hora, reg] of Object.entries(linha.registros || {})) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

      quantidadeProduzida += reg.quantidade
      tempoNecessarioFicha += reg.quantidade * samFicha
      tempoNecessarioReferencia += reg.quantidade * samReferencia
      horariosSet.add(hora)
      etapasSet.add(linha.descricao || linha.etapaId || '—')
      entradasParaTempo.push({ hora, tempoProduzido: reg.tempoProduzido })
    }

    // Tempo utilizado = intervalo de relógio (primeiro → último registro),
    // NUNCA soma dos registros/etapas, e sempre limitado à jornada do dia.
    const tempoProduzido = calcularTempoUtilizadoPorIntervalo(entradasParaTempo, tempoMaximoDia)

    if (tempoProduzido > 0) {
      grupos.push({
        opId,
        quantidadeProduzida,
        tempoProduzido,
        tempoNecessarioFicha,
        tempoNecessarioReferencia,
        horariosConsiderados: [...horariosSet].sort((a, b) => horaParaMinutos(a) - horaParaMinutos(b)),
        etapas: [...etapasSet],
      })
    }
  }

  return grupos
}

export function calcularEficienciaFuncionarioNaOp(grupoOpFuncionario, referencia = false) {
  if (!grupoOpFuncionario?.tempoProduzido) return 0
  const necessario = referencia
    ? grupoOpFuncionario.tempoNecessarioReferencia
    : grupoOpFuncionario.tempoNecessarioFicha
  return calcularEficiencia({
    producaoPonderada: necessario,
    funcionarios: 1,
    tempoTrabalhado: grupoOpFuncionario.tempoProduzido,
  })
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA INDIVIDUAL DO DIA — TEMPOS ACUMULADOS (NUNCA MÉDIA)
// ══════════════════════════════════════════════════════════════
//
// Regra (Cronoanálise): a eficiência de um funcionário representa o
// desempenho dele DURANTE TODO O DIA, não a média de percentuais de
// OPs separadas. Por isso percorremos TODOS os lançamentos de
// produção do funcionário no dia (qualquer OP, qualquer etapa, sem
// selecionar "etapa representativa" nem recortar por intervalo de
// relógio — aqui não há risco de inflar nada, pois cada lançamento é
// um registro de produção genuinamente distinto daquele funcionário),
// acumulamos os três tempos, e SÓ NO FINAL calculamos uma única razão:
//
//   Eficiência Ficha      = Tempo Ficha Total      ÷ Tempo Registrado Total × 100
//   Eficiência Referência = Tempo Referência Total ÷ Tempo Registrado Total × 100
export function calcularTotaisFuncionarioDia(funcionario, etapasPorId, overrides = null) {
  let quantidade = 0
  let tempoRegistrado = 0
  let tempoFicha = 0
  let tempoReferencia = 0

  for (const linha of funcionario?.linhas || []) {
    if (!linha?.opId) continue

    const samFicha = resolverTempoPadrao(linha, etapasPorId)
    const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides)

    for (const [hora, reg] of Object.entries(linha.registros || {})) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

      quantidade += reg.quantidade
      tempoRegistrado += reg.tempoProduzido
      tempoFicha += reg.quantidade * samFicha
      tempoReferencia += reg.quantidade * samReferencia
    }
  }

  quantidade = Math.round(quantidade * 100) / 100
  tempoRegistrado = Math.round(tempoRegistrado * 100) / 100
  tempoFicha = Math.round(tempoFicha * 100) / 100
  tempoReferencia = Math.round(tempoReferencia * 100) / 100

  const eficienciaFicha = calcularEficiencia({ producaoPonderada: tempoFicha, funcionarios: 1, tempoTrabalhado: tempoRegistrado })
  const eficienciaReferencia = calcularEficiencia({ producaoPonderada: tempoReferencia, funcionarios: 1, tempoTrabalhado: tempoRegistrado })

  return {
    quantidade,
    tempoRegistrado,
    tempoFicha,
    tempoReferencia,
    eficienciaFicha,
    eficienciaReferencia,
    formulaFicha: `${tempoFicha} ÷ ${tempoRegistrado} × 100 = ${eficienciaFicha}%`,
    formulaReferencia: `${tempoReferencia} ÷ ${tempoRegistrado} × 100 = ${eficienciaReferencia}%`,
  }
}

/**
 * MANTIDA POR COMPATIBILIDADE DE NOME — a lógica interna mudou: antes
 * fazia média simples das eficiências de cada OP do funcionário (o que
 * está proibido: nunca calcular eficiência fazendo média de
 * percentuais). Agora delega para `calcularTotaisFuncionarioDia`, que
 * soma os tempos do dia inteiro e calcula uma única razão.
 */
export function calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, referencia = false, overrides = null) {
  const totais = calcularTotaisFuncionarioDia(funcionario, etapasPorId, overrides)
  return referencia ? totais.eficienciaReferencia : totais.eficienciaFicha
}

export function detalharEficienciaPorFuncionarioEOp(funcionariosDia, etapasPorId, nomeDaOp = (id) => id, data = null) {
  const linhas = []

  for (const funcionario of funcionariosDia || []) {
    const grupos = agruparProducaoFuncionarioPorOp(funcionario, etapasPorId, data)
      .filter(g => g.tempoProduzido > 0)

    for (const g of grupos) {
      const eficienciaFicha = calcularEficienciaFuncionarioNaOp(g, false)
      const eficienciaReferencia = calcularEficienciaFuncionarioNaOp(g, true)
      const temReferenciaDistinta = g.tempoNecessarioReferencia !== g.tempoNecessarioFicha

      const tempoConsiderado = temReferenciaDistinta ? g.tempoNecessarioReferencia : g.tempoNecessarioFicha
      const eficienciaPrincipal = temReferenciaDistinta ? eficienciaReferencia : eficienciaFicha
      const tempoConsideradoArred = Math.round(tempoConsiderado * 100) / 100

      linhas.push({
        opId: g.opId,
        opNome: nomeDaOp(g.opId),
        funcionario: funcionario.nome || funcionario.email,
        funcionarioEmail: funcionario.email,
        etapa: g.etapas.join(', '),
        quantidadeProduzida: g.quantidadeProduzida,
        tempoUtilizado: Math.round(g.tempoProduzido * 100) / 100,
        tempoConsiderado: tempoConsideradoArred,
        tipoTempoConsiderado: temReferenciaDistinta ? 'referência' : 'padrão',
        eficiencia: eficienciaPrincipal,
        eficienciaFicha,
        eficienciaReferencia,
        formula: `${tempoConsideradoArred} ÷ ${Math.round(g.tempoProduzido * 100) / 100} × 100 = ${eficienciaPrincipal}%`,
        tempoEfetivamenteProduzido: Math.round(g.tempoProduzido * 100) / 100,
        horariosConsiderados: g.horariosConsiderados,
      })
    }
  }

  return linhas
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA DA TURMA
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA DA EQUIPE — MESMA BASE DO RESUMO CONSOLIDADO DAS OPs
// ══════════════════════════════════════════════════════════════
//
// Mantida por compatibilidade de nome para telas/relatórios que já
// chamam esta função diretamente. NÃO tem fórmula própria: agrupa a
// produção do dia por OP e delega para `calcularEficienciaMediaPonderadaOps`
// — a MESMA função usada no resumo consolidado das OPs — para que não
// exista uma segunda implementação da eficiência da equipe em lugar
// nenhum do sistema.
export function calcularEficienciaGeralTurma(funcionariosDia, etapasPorId, referencia = false) {
  const gruposOp = agruparProducaoPorOp(funcionariosDia, etapasPorId).filter(g => g.producao > 0)
  return calcularEficienciaMediaPonderadaOps(gruposOp, referencia)
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA DA TURMA — MULTI-OP (CONSOLIDAÇÃO)
// ══════════════════════════════════════════════════════════════

/**
 * Agrupa a produção do dia por OP considerando TODOS OS FUNCIONÁRIOS.
 *
 * REGRA DE TRATAMENTO DE MULTI-ETAPAS (OP = UNIDADE ÚNICA):
 * Uma OP não pode ter seu tempo/quantidade/referência inflados pela soma
 * das suas várias etapas — nem quando uma única etapa é feita por vários
 * funcionários, nem quando etapas diferentes são feitas por funcionários
 * diferentes. Por isso a OP inteira usa apenas a ETAPA REPRESENTATIVA
 * GLOBAL (a etapa final, quando atingida; ou a de maior produção, quando
 * ainda não atingiu a etapa final) — ver obterParticipantesRepresentativosGlobalPorOp.
 * O tempo utilizado é o intervalo de relógio (primeiro → último
 * registro), nunca a soma dos tempos de cada etapa/funcionário, e é
 * sempre limitado à jornada máxima do dia (540min seg-qui / 480min sexta).
 */
export function agruparProducaoPorOp(funcionariosDia, etapasPorId, data = null) {
  // Tempo máximo do expediente do dia (540min seg-qui / 480min sexta).
  // Se `data` não for informada, mantém o padrão seg-qui (540) por
  // compatibilidade com chamadas existentes que ainda não passam a data.
  const tempoMaximoDia = data != null ? minutosDisponiveisDia(data) : 540

  // A OP é tratada como UNIDADE ÚNICA: independentemente de quantos
  // funcionários/etapas passaram por ela, usamos apenas os participantes
  // da etapa representativa GLOBAL (etapa final, ou a de maior produção
  // na ausência de etapa final). Isso evita somar tempo/produção de
  // etapas distintas feitas por funcionários diferentes.
  const participantesPorOp = obterParticipantesRepresentativosGlobalPorOp(funcionariosDia)
  const gruposMap = new Map()

  for (const [opId, participantes] of participantesPorOp.entries()) {
    const grupo = {
      opId,
      producao: 0,
      temposPadraoDistintos: new Set(),
      tempoProduzidoFicha: 0,
      tempoProduzidoReferencia: 0,
      tempoTrabalhadoRegistrado: 0,
    }

    const entradasParaTempo = []

    for (const { funcionario, linha } of participantes) {
      const samFicha = resolverTempoPadrao(linha, etapasPorId)
      const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
      grupo.temposPadraoDistintos.add(samFicha)

      for (const [hora, reg] of Object.entries(linha.registros || {})) {
        if (horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

        // Quantidade e tempos ponderados: somam-se apenas entre
        // funcionários que trabalharam na MESMA etapa representativa da
        // OP (produção genuinamente aditiva), nunca entre etapas diferentes.
        grupo.producao += reg.quantidade
        grupo.tempoProduzidoFicha += reg.quantidade * samFicha
        grupo.tempoProduzidoReferencia += reg.quantidade * samReferencia
        entradasParaTempo.push({ hora, tempoProduzido: reg.tempoProduzido })
      }
    }

    // Tempo utilizado da OP = intervalo de relógio (primeiro → último
    // registro da etapa representativa), NUNCA soma dos tempos das
    // etapas/funcionários, e sempre limitado à jornada do dia.
    grupo.tempoTrabalhadoRegistrado = calcularTempoUtilizadoPorIntervalo(entradasParaTempo, tempoMaximoDia)

    gruposMap.set(opId, grupo)
  }

  return [...gruposMap.values()]
}

export function tempoPadraoMedioOp(grupoOp, referencia = false) {
  if (!grupoOp?.producao) return 0
  const earned = referencia ? grupoOp.tempoProduzidoReferencia : grupoOp.tempoProduzidoFicha
  return Math.round((earned / grupoOp.producao) * 100) / 100
}

export function calcularEficienciaOpAgrupada(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return calcularEficiencia({
    producaoPonderada: grupoOp.tempoProduzidoFicha,
    funcionarios: 1,
    tempoTrabalhado: grupoOp.tempoTrabalhadoRegistrado,
  })
}

export function calcularEficienciaOpAgrupadaReferencia(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return calcularEficiencia({
    producaoPonderada: grupoOp.tempoProduzidoReferencia,
    funcionarios: 1,
    tempoTrabalhado: grupoOp.tempoTrabalhadoRegistrado,
  })
}

export function resumoConsolidadoOp(grupoOp) {
  if (!grupoOp) return null
  console.log(grupoOp)
  return {
    opId: grupoOp.opId,
    producao: grupoOp.producao,
    tempoTrabalhado: Math.round(grupoOp.tempoTrabalhadoRegistrado * 100) / 100,
    tempoPadraoTotal: Math.round(grupoOp.tempoProduzidoFicha * 100) / 100,
    tempoReferenciaTotal: Math.round(grupoOp.tempoProduzidoReferencia * 100) / 100,
    eficienciaFicha: calcularEficienciaOpAgrupada(grupoOp),
    eficienciaReferencia: calcularEficienciaOpAgrupadaReferencia(grupoOp),
  }
}

export function calcularEficienciaMediaPonderadaOps(gruposOp, referencia = false) {
  // MÉDIA SIMPLES das eficiências de cada OP — mantida por compatibilidade
  // com telas que ainda usam esta função para exibir resumo por OP.
  // Para a eficiência GERAL DA TURMA, usar calcularResumoEficienciaGeral.
  if (!gruposOp?.length) return 0

  const eficiencias = gruposOp
    .filter(grupo => grupo?.tempoTrabalhadoRegistrado > 0)
    .map(grupo => referencia
      ? calcularEficienciaOpAgrupadaReferencia(grupo)
      : calcularEficienciaOpAgrupada(grupo))

  if (!eficiencias.length) return 0
  const soma = eficiencias.reduce((s, e) => s + e, 0)
  return Math.round((soma / eficiencias.length) * 100) / 100
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA GERAL DA TURMA — FÓRMULA CORRETA
// ══════════════════════════════════════════════════════════════
//
// A eficiência geral é calculada como:
//
//   Eficiência Geral Ficha =
//     Σ(Capacidade ficha de cada OP) ÷ Σ(Tempo produzido de cada OP) × 100
//
//   Eficiência Geral Referência =
//     Σ(Capacidade referência de cada OP) ÷ Σ(Tempo produzido de cada OP) × 100
//
// Onde:
//   - Capacidade ficha da OP = Σ(quantidade × tempo padrão/SAM)
//   - Capacidade referência da OP = Σ(quantidade × tempo referência)
//   - Tempo produzido da OP = intervalo de relógio (primeiro → último registro)
//
// IMPORTANTE: NÃO é média simples de porcentagens.
// NÃO soma 540 min por funcionário.
// Usa os valores brutos (minutos/capacidades) antes de transformar em %.

/**
 * Calcula o resumo completo de eficiência geral da turma.
 *
 * Retorna:
 * {
 *   capacidadeFichaTotal: number,    // Σ capacidade ficha de todas as OPs
 *   capacidadeReferenciaTotal: number, // Σ capacidade referência de todas as OPs
 *   tempoProduzidoTotal: number,     // Σ tempo produzido de todas as OPs
 *   eficienciaFicha: number,         // Eficiência geral ficha (%)
 *   eficienciaReferencia: number,    // Eficiência geral referência (%)
 *   formulaFicha: string,            // Fórmula para exibição
 *   formulaReferencia: string,       // Fórmula para exibição
 *   opsConsideradas: number          // Qtd de OPs com produção
 * }
 *
 * @param {Array} funcionariosDia - Lista de funcionários do dia
 * @param {Map} etapasPorId - Índice de etapas
 * @param {string|number|null} data - Data filtrada (para calcular turno)
 */
export function calcularResumoEficienciaGeral(funcionariosDia, etapasPorId, data = null) {
  // Agrupa produção por OP — já trata etapa representativa e
  // evita duplicação entre etapas/funcionários.
  const gruposOp = agruparProducaoPorOp(funcionariosDia, etapasPorId, data)
    .filter(g => g.producao > 0)

  let capacidadeFichaTotal = 0
  let capacidadeReferenciaTotal = 0
  let tempoProduzidoTotal = 0

  for (const grupo of gruposOp) {
    capacidadeFichaTotal += grupo.tempoProduzidoFicha
    capacidadeReferenciaTotal += grupo.tempoProduzidoReferencia
    tempoProduzidoTotal += grupo.tempoTrabalhadoRegistrado
  }

  // Arredondamento
  capacidadeFichaTotal = Math.round(capacidadeFichaTotal * 100) / 100
  capacidadeReferenciaTotal = Math.round(capacidadeReferenciaTotal * 100) / 100
  tempoProduzidoTotal = Math.round(tempoProduzidoTotal * 100) / 100

  // Eficiência = Capacidade Total ÷ Tempo Produzido Total × 100
  const eficienciaFicha = tempoProduzidoTotal > 0
    ? Math.round((capacidadeFichaTotal / tempoProduzidoTotal) * 10000) / 100
    : 0
  const eficienciaReferencia = tempoProduzidoTotal > 0
    ? Math.round((capacidadeReferenciaTotal / tempoProduzidoTotal) * 10000) / 100
    : 0

  return {
    capacidadeFichaTotal,
    capacidadeReferenciaTotal,
    tempoProduzidoTotal,
    eficienciaFicha,
    eficienciaReferencia,
    formulaFicha: `${capacidadeFichaTotal} ÷ ${tempoProduzidoTotal} × 100 = ${eficienciaFicha}%`,
    formulaReferencia: `${capacidadeReferenciaTotal} ÷ ${tempoProduzidoTotal} × 100 = ${eficienciaReferencia}%`,
    opsConsideradas: gruposOp.length,
  }
}

// ══════════════════════════════════════════════════════════════
// REGRA DE ALERTA E OUTRAS REGRAS
// ══════════════════════════════════════════════════════════════
export function calcularEficienciaLinhaComRegra(linha, funcionario, etapasPorId, tipoDeProducao) {
  return tipoDeProducao === 'fabrica'
    ? calcularEficienciaLinhaPadrao(linha, funcionario, etapasPorId)
    : calcularEficienciaLinhaReferencia(funcionario, linha, etapasPorId)
}

export function resolverTempoEfetivoComRegra(funcionario, linha, etapasPorId, tipoDeProducao) {
  return tipoDeProducao === 'fabrica'
    ? resolverTempoPadrao(linha, etapasPorId)
    : resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
}

export function calcularPecasPorHora(linha, funcionario, etapasPorId, tipoDeProducao) {
  const tempoEfetivo = resolverTempoEfetivoComRegra(funcionario, linha, etapasPorId, tipoDeProducao)
  const esperadoPorHora = tempoEfetivo ? Math.round((60 / tempoEfetivo) * 10) / 10 : 0

  let quantidade = 0
  let tempoTrabalhado = 0
  for (const [hora, reg] of Object.entries(linha?.registros || {})) {
    if (horaBloqueadaPorAusencia(funcionario, hora)) continue
    if (reg && reg.quantidade > 0 && reg.tempoProduzido > 0) {
      quantidade += reg.quantidade
      tempoTrabalhado += reg.tempoProduzido
    }
  }

  const registradoPorHora = tempoTrabalhado ? Math.round((quantidade / tempoTrabalhado) * 60 * 10) / 10 : 0

  return { tempoEfetivo, esperadoPorHora, registradoPorHora, quantidade, tempoTrabalhado }
}

export function calcularEficienciaFuncionarioPorModo(funcionario, etapasPorId, modo, overrides = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, modo === 'referencia', overrides)
}

// ══════════════════════════════════════════════════════════════
// COMPATIBILIDADE
// ══════════════════════════════════════════════════════════════
export function calcularEficienciaFuncionarioPadrao(funcionario, etapasPorId, overrides = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, false, overrides)
}

export function calcularEficienciaFuncionarioReferencia(funcionario, etapasPorId, overrides = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, true, overrides)
}