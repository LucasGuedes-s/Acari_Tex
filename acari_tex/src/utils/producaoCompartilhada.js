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
  if (!inicio || !fim || fimMin <= inicioMin) return inicio ? [inicio] : []

  const sequencia = []
  let atual = inicioMin
  while (atual < fimMin) {
    sequencia.push(minutosParaHora(atual))
    atual += 60
  }
  sequencia.push(fim)
  return sequencia
}

export function minutosDisponiveisDia(configHorarios) {
  const horasManha = gerarSequenciaHoras(configHorarios.manha.inicio, configHorarios.manha.fim)
  const horasTarde = gerarSequenciaHoras(configHorarios.tarde.inicio, configHorarios.tarde.fim)
  return (horasManha.length + horasTarde.length) * 60
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
  if (!etapaId) return null
  const candidatas = etapasPorId.get(etapaId) || []
  if (opId != null && opId !== '') {
    const match = candidatas.find(e => e.id_da_op === opId)
    if (match) return match
  }
  return candidatas[0] || null
}

export function resolverTempoPadrao(linha, etapasPorId) {
  if (linha?.tempoPadrao) return Number(linha.tempoPadrao)
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  return Number(etapa?.tempo_padrao ?? etapa?.etapa?.tempo_padrao ?? 0)
}

export function resolverTempoReferencia(funcionario, linha, etapasPorId) {
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
  if (!Array.isArray(refs) || !funcionario?.email) return null

  const ref = refs.find(r => r && r.id_funcionario === funcionario.email)
  if (!ref) return null

  const t = Number(ref.tempo_minutos ?? ref.tempo_por_peca ?? 0)
  return t > 0 ? t : null
}

export function resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId) {
  const tempoReferencia = resolverTempoReferencia(funcionario, linha, etapasPorId)
  return resolverSam({ tempoReferencia, tempoPadrao: resolverTempoPadrao(linha, etapasPorId) })
}

// ── AUSÊNCIA / TEMPO TRABALHADO ───────────────────────
export function funcionarioAusenteDiaInteiro(funcionario) {
  return funcionario?.ausencia?.tipo === 'dia_inteiro'
}

export function calcularMinutosAusenciaFuncionario(funcionario, configHorarios) {
  const ausencia = funcionario?.ausencia
  if (!ausencia) return 0
  if (ausencia.tipo === 'dia_inteiro') return minutosDisponiveisDia(configHorarios)

  if (ausencia.tipo === 'parcial' && Array.isArray(ausencia.periodos)) {
    const janelas = [
      [horaParaMinutos(configHorarios.manha.inicio), horaParaMinutos(configHorarios.manha.fim)],
      [horaParaMinutos(configHorarios.tarde.inicio), horaParaMinutos(configHorarios.tarde.fim)],
    ]
    let total = 0
    for (const periodo of ausencia.periodos) {
      if (!periodo?.inicio || !periodo?.fim) continue
      const pIni = horaParaMinutos(periodo.inicio)
      const pFim = horaParaMinutos(periodo.fim)
      for (const [jIni, jFim] of janelas) {
        const ini = Math.max(pIni, jIni)
        const fim = Math.min(pFim, jFim)
        if (fim > ini) total += (fim - ini)
      }
    }
    return total
  }
  return 0
}

export function calcularMinutosDisponiveisFuncionario(funcionario, configHorarios) {
  const totalPadrao = minutosDisponiveisDia(configHorarios)
  const ausente = calcularMinutosAusenciaFuncionario(funcionario, configHorarios)
  return Math.max(totalPadrao - ausente, 0)
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

// ── EFICIÊNCIA (Ficha e Referência) ───────────────────
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

export function calcularEficienciaLinhaReferencia(funcionario, linha, etapasPorId) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
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

export function calcularEficienciaRegistroReferencia(quantidade, tempoProduzido, linha, funcionario, etapasPorId) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
  if (!quantidade || !tempoProduzido || !sam) return 0
  return calcularEficiencia({ producaoPonderada: quantidade * sam, funcionarios: 1, tempoTrabalhado: tempoProduzido })
}

export function calcularEficienciaFuncionarioPadrao(funcionario, configHorarios, etapasPorId) {
  if (!funcionario?.linhas?.length) return 0
  let producaoPonderada = 0
  for (const linha of funcionario.linhas) {
    if (!linha?.registros) continue
    const sam = resolverTempoPadrao(linha, etapasPorId)
    for (const [hora, reg] of Object.entries(linha.registros)) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (reg && reg.quantidade > 0) producaoPonderada += reg.quantidade * sam
    }
  }
  const tempoDisponivel = calcularMinutosDisponiveisFuncionario(funcionario, configHorarios)
  if (!tempoDisponivel) return 0
  return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivel })
}

export function calcularEficienciaFuncionarioReferencia(funcionario, configHorarios, etapasPorId) {
  if (!funcionario?.linhas?.length) return 0
  let producaoPonderada = 0
  for (const linha of funcionario.linhas) {
    if (!linha?.registros) continue
    const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
    for (const [hora, reg] of Object.entries(linha.registros)) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (reg && reg.quantidade > 0) producaoPonderada += reg.quantidade * sam
    }
  }
  const tempoDisponivel = calcularMinutosDisponiveisFuncionario(funcionario, configHorarios)
  if (!tempoDisponivel) return 0
  return calcularEficiencia({ producaoPonderada, funcionarios: 1, tempoTrabalhado: tempoDisponivel })
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA DA TURMA — multi-OP
// ══════════════════════════════════════════════════════════════

/**
 * Agrupa a produção do dia por OP (todos os funcionários, todas as
 * linhas/etapas). Para cada OP retorna:
 *   - producao: peças produzidas nela;
 *   - tempoProduzidoFicha / tempoProduzidoReferencia: minutos GANHOS
 *     (quantidade × SAM da etapa) — o NUMERADOR da eficiência;
 *   - tempoTrabalhadoRegistrado: minutos de RELÓGIO efetivamente
 *     lançados nos registros dessa OP — o DENOMINADOR.
 *
 * Correção de bug: o denominador usa o tempo REGISTRADO na própria OP,
 * nunca a capacidade do turno inteiro do funcionário. Se o
 * funcionário produziu em 2 OPs no mesmo dia, cada uma recebe só o
 * tempo que ele de fato lançou nela — sem duplicar a capacidade do
 * turno para cada OP que ele tocou.
 */
export function agruparProducaoPorOp(funcionariosDia, etapasPorId) {
  const gruposMap = new Map()

  for (const funcionario of funcionariosDia || []) {
    for (const linha of funcionario.linhas || []) {
      if (!linha.opId) continue

      let grupo = gruposMap.get(linha.opId)
      if (!grupo) {
        grupo = {
          opId: linha.opId,
          producao: 0,
          temposPadraoDistintos: new Set(), // sinaliza OP com etapas/SAMs diferentes
          tempoProduzidoFicha: 0,
          tempoProduzidoReferencia: 0,
          tempoTrabalhadoRegistrado: 0,
        }
        gruposMap.set(linha.opId, grupo)
      }

      const samFicha = resolverTempoPadrao(linha, etapasPorId)
      const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
      grupo.temposPadraoDistintos.add(samFicha)

      for (const [hora, reg] of Object.entries(linha.registros || {})) {
        if (horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

        grupo.producao += reg.quantidade
        grupo.tempoProduzidoFicha += reg.quantidade * samFicha
        grupo.tempoProduzidoReferencia += reg.quantidade * samReferencia
        grupo.tempoTrabalhadoRegistrado += reg.tempoProduzido
      }
    }
  }

  return [...gruposMap.values()]
}

/** Tempo padrão "médio" de exibição — na prática é o próprio earned/produção,
 *  então se a OP tiver etapas com SAMs diferentes o valor mostrado já é a
 *  média corretamente ponderada pelo volume de cada etapa. */
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

/**
 * Média ponderada das OPs: soma dos minutos GANHOS de todas as OPs ÷
 * soma dos minutos de RELÓGIO lançados em todas elas. Uma OP com 900
 * peças a 0,45min pesa naturalmente mais que uma com 20 peças a
 * 1,80min — nunca é uma média aritmética simples dos percentuais.
 */
export function calcularEficienciaMediaPonderadaOps(gruposOp, referencia = false) {
  if (!gruposOp?.length) return 0
  let numerador = 0
  let denominador = 0
  for (const grupo of gruposOp) {
    numerador += referencia ? grupo.tempoProduzidoReferencia : grupo.tempoProduzidoFicha
    denominador += grupo.tempoTrabalhadoRegistrado
  }
  if (!denominador) return 0
  return calcularEficiencia({ producaoPonderada: numerador, funcionarios: 1, tempoTrabalhado: denominador })
}

/**
 * Eficiência GERAL da turma (o número de cabeçalho). Numerador = total
 * de minutos ganhos (quantidade × SAM) de TODA a produção do dia,
 * qualquer OP. Denominador = tempo efetivamente DISPONÍVEL dos
 * funcionários que produziram, respeitando turno e ausências (mesma
 * regra que já valia por funcionário — calcularMinutosDisponiveisFuncionario).
 *
 * Por usar tempo disponível (não só o tempo registrado), esta métrica
 * penaliza ociosidade dentro do turno — por isso pode ficar um pouco
 * abaixo da "média ponderada das OPs" (que só olha os minutos
 * realmente lançados, já que tempo ocioso não pertence a nenhuma OP).
 * É a correção direta da média aritmética simples que existia antes:
 * agora cada funcionário pesa pelo tempo que teve disponível, não por
 * "1 pessoa = 1 voto" no percentual.
 */
export function calcularEficienciaGeralTurma(funcionariosDia, configHorarios, etapasPorId, referencia = false) {
  const produtivos = (funcionariosDia || []).filter(func =>
    (func.linhas || []).reduce((s, l) => s + calcularTotalLinha(l, func), 0) > 0
  )
  if (!produtivos.length) return 0

  let numerador = 0
  let denominador = 0

  for (const funcionario of produtivos) {
    for (const linha of funcionario.linhas || []) {
      if (!linha?.registros) continue
      const sam = referencia
        ? resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId)
        : resolverTempoPadrao(linha, etapasPorId)

      for (const [hora, reg] of Object.entries(linha.registros)) {
        if (horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (reg && reg.quantidade > 0) numerador += reg.quantidade * sam
      }
    }
    denominador += calcularMinutosDisponiveisFuncionario(funcionario, configHorarios)
  }

  if (!denominador) return 0
  return calcularEficiencia({ producaoPonderada: numerador, funcionarios: 1, tempoTrabalhado: denominador })
}
// ══════════════════════════════════════════════════════════════
// REGRA DE ALERTA — Ficha (fábrica) vs Referência com fallback
// ══════════════════════════════════════════════════════════════
// Reaproveita 100% das funções já existentes. Só escolhe QUAL delas
// usar, conforme a regra de negócio pedida:
//   tipo_de_producao === 'fabrica' -> sempre Ficha (SAM da etapa)
//   qualquer outro tipo            -> Referência do funcionário, com
//                                     fallback automático para Ficha já
//                                     embutido em resolverSam (ver
//                                     resolverTempoEfetivoReferencia)
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

/**
 * Métricas de "peças por hora" para exibir no alerta — usa o mesmo
 * tempo efetivo (SAM ou Referência, conforme a regra acima) e o mesmo
 * tempo trabalhado já usado no cálculo de eficiência da linha.
 */
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