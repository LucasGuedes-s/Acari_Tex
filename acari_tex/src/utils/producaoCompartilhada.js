// src/utils/producaoCompartilhada.js
import {
  calcularEficiencia,
  calcularEficienciaExata,
  resolverSam,
} from '@/utils/calculosProducao'
import { escolherReferenciaPorData } from '@/utils/tempoReferencia'

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

/**
 * Mesma definição da tela de apontamento: gera as horas cheias a partir do
 * início e INCLUI a hora final (ex.: 08:00→11:30 = 08,09,10,11:30).
 * As chaves de `registros` da tela seguem exatamente esta sequência.
 */
export function gerarSequenciaHoras(inicio, fim) {
  if (!inicio) return []
  const inicioMin = horaParaMinutos(inicio)
  const fimMin = horaParaMinutos(fim)
  if (!fim || fimMin <= inicioMin) return [inicio]

  const sequencia = []
  let atual = inicioMin
  while (atual < fimMin) {
    sequencia.push(minutosParaHora(atual))
    atual += 60
  }
  sequencia.push(fim)
  return sequencia
}

// ── TEMPO TRABALHADO = SOMA DOS MINUTOS REGISTRADOS ───────
// Cada funcionário tem no máximo 60 min por hora (regra da tela), então
// somar os minutos é o tempo real trabalhado: não conta almoço nem
// buracos entre lançamentos e multiplica corretamente por pessoa.
export function somarMinutosRegistrados(entradas) {
  if (!Array.isArray(entradas)) return 0
  return entradas.reduce((s, e) => s + (Number(e?.tempoProduzido) || 0), 0)
}

/** @deprecated Mantida só por compatibilidade de import: agora SOMA os minutos. */
export function calcularTempoUtilizadoPorIntervalo(entradas) {
  return somarMinutosRegistrados(entradas)
}

// ── MINUTOS DISPONÍVEIS DO DIA ────────────────────────
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

/**
 * Minutos disponíveis no dia.
 * - Com `janelas` ({ manha:{inicio,fim}, tarde:{inicio,fim} }) usa a MESMA
 *   regra da tela: nº de slots das janelas × 60.
 * - Sem `janelas`, usa a regra legada por dia da semana (seg–qui 540,
 *   sex 480, fim de semana 0). Não use este valor como TETO do tempo
 *   trabalhado: hora extra no fim de semana é válida.
 */
export function minutosDisponiveisDia(data, janelas = null) {
  if (janelas?.manha && janelas?.tarde) {
    const qtd =
      gerarSequenciaHoras(janelas.manha.inicio, janelas.manha.fim).length +
      gerarSequenciaHoras(janelas.tarde.inicio, janelas.tarde.fim).length
    return qtd * 60
  }
  const d = parseDataLocal(data)
  d.setHours(0, 0, 0, 0)
  const diaSemana = d.getDay()
  if (diaSemana >= 1 && diaSemana <= 4) return 540
  if (diaSemana === 5) return 480
  return 0
}

// ── ETAPA FINAL (fonte única; a tela também deve importar esta) ──
function normalizarTexto(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function isEtapaFinal(linha) {
  if (!linha?.descricao) return false
  const d = normalizarTexto(linha.descricao) // sem acentos
  if (d.includes('revisao intermediaria')) return false
  return (
    d.includes('final') ||
    d.includes('revisao') ||
    d.includes('acabamento') ||
    d.includes('qualidade') ||
    d.includes('revisar peca pronta') ||
    d.includes('expedicao')
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

/**
 * Tempo Ficha da ETAPA (producao_etapa.tempo_padrao), guardado em
 * `linha.tempoPadrao`. Se a linha ainda não tiver, cai para o cadastro da
 * etapa (mesmo comportamento da tela). O tempo da PEÇA nunca é lido aqui.
 */
export function resolverTempoPadrao(linha, etapasPorId = null) {
  if (linha?.tempoPadrao) return Number(linha.tempoPadrao)
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  return Number(etapa?.tempo_padrao ?? etapa?.etapa?.tempo_padrao ?? 0)
}

// ══════════════════════════════════════════════════════════════
// RESOLUÇÃO DO TEMPO DE REFERÊNCIA — FONTE ÚNICA
// ══════════════════════════════════════════════════════════════
// ORDEM DE PRIORIDADE:
//   1. Override manual (dropdown) .......................... origem 'manual'
//   2. Referência do PROFISSIONAL na OP/etapa, por data .... origem 'peca'
//   3. Referência do PROFISSIONAL na mesma etapa (outra OP)  origem 'ultimo_registrado'
//   4. Nenhuma → null (o SAM cai para o Tempo Ficha)
// NUNCA usa o tempo de outro profissional.
//
// O SAM final é sempre resolverSam(): o MENOR entre ficha e referência.

function extrairTempoRef(ref) {
  return Number(ref?.tempo_minutos ?? ref?.tempo_por_peca ?? 0)
}

/**
 * @returns {{ tempo: number|null, origem: string|null, registroId: string|number|null, nomeFunc: string|null }}
 */
export function resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides = null, dataConsulta = null) {
  // 1. Override manual — prioridade absoluta
  const modoTempo = overrides?.modoTempo || linha?.modoTempo
  const refId = overrides?.referenciaSelecionadaId || linha?.referenciaSelecionadaId

  if (modoTempo === 'referencia' && refId) {
    const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
    const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
    if (Array.isArray(refs)) {
      const refIdBusca = String(refId) // value do select é string; r.id é number
      let ref = refs.find(r => r && String(r.id) === refIdBusca)
      if (!ref) ref = refs.find(r => r && r.id_funcionario === refId)
      if (ref) {
        const t = extrairTempoRef(ref)
        if (t > 0) {
          return { tempo: t, origem: 'manual', registroId: ref.id ?? null, nomeFunc: funcionario?.nome || null }
        }
      }
    }
  }

  // 2. Profissional + OP/etapa atual, escolhido por data
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  const refsDaEtapaOp = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
  if (Array.isArray(refsDaEtapaOp) && funcionario?.email) {
    const escolhido = escolherReferenciaPorData(refsDaEtapaOp, {
      funcionarioId: funcionario.email,
      dataConsulta,
    })
    if (escolhido) {
      const t = extrairTempoRef(escolhido)
      if (t > 0) {
        return { tempo: t, origem: 'peca', registroId: escolhido.id ?? null, nomeFunc: funcionario?.nome || null }
      }
    }
  }

  // 3. Profissional + mesma etapa em qualquer outra OP
  if (funcionario?.email && linha?.etapaId && etapasPorId) {
    const candidatasEtapa = etapasPorId.get(linha.etapaId) || []
    const todosOsRefsDaEtapa = []
    for (const candidata of candidatasEtapa) {
      const refsCandidata = candidata?.tempo_referencia || candidata?.etapa?.tempo_referencia || []
      if (Array.isArray(refsCandidata)) todosOsRefsDaEtapa.push(...refsCandidata)
    }
    const escolhido = escolherReferenciaPorData(todosOsRefsDaEtapa, {
      funcionarioId: funcionario.email,
      dataConsulta,
    })
    if (escolhido) {
      const t = extrairTempoRef(escolhido)
      if (t > 0) {
        return { tempo: t, origem: 'ultimo_registrado', registroId: escolhido.id ?? null, nomeFunc: funcionario?.nome || null }
      }
    }
  }

  // 4. Sem referência
  return { tempo: null, origem: null, registroId: null, nomeFunc: null }
}

/** @returns {number|null} */
export function resolverTempoReferencia(funcionario, linha, etapasPorId, overrides = null, dataConsulta = null) {
  return resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides, dataConsulta).tempo
}

export function resolverTempoReferenciaCentral({ funcionario, linha, etapasPorId, overrides = null, dataConsulta = null } = {}) {
  const r = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides, dataConsulta)
  return { valor: r.tempo, origem: r.origem, registroId: r.registroId, nomeFunc: r.nomeFunc }
}

/**
 * SAM efetivo da linha = MENOR entre Tempo Ficha e Tempo Referência
 * (mesma regra da tela, via resolverSam).
 */
export function resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides = null, dataConsulta = null) {
  const tempoReferencia = resolverTempoReferencia(funcionario, linha, etapasPorId, overrides, dataConsulta)
  return resolverSam({ tempoReferencia, tempoPadrao: resolverTempoPadrao(linha, etapasPorId) })
}

export function obterDetalhesTempoReferenciaFuncionario(funcionario, etapasPorId, dataConsulta = null) {
  const resultado = []
  for (const linha of funcionario?.linhas || []) {
    if (!linha?.opId) continue
    const { tempo: tempoRef, origem } = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, null, dataConsulta)
    resultado.push({
      etapa: linha.descricao || linha.etapaId || '—',
      opId: linha.opId,
      tempoRef,
      origem,
      tempoFicha: resolverTempoPadrao(linha, etapasPorId),
    })
  }
  return resultado
}

// ── AUXILIAR: SELEÇÃO DA ETAPA REPRESENTATIVA DA OP ─────
function obterLinhasRepresentativasPorOp(linhas) {
  const linhasPorOp = new Map()

  for (const linha of linhas) {
    if (!linha?.opId) continue
    if (!linhasPorOp.has(linha.opId)) linhasPorOp.set(linha.opId, [])
    linhasPorOp.get(linha.opId).push(linha)
  }

  const result = new Map()

  for (const [opId, listaLinhas] of linhasPorOp.entries()) {
    let escolhida = listaLinhas.find(l => isEtapaFinal(l))

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

function obterParticipantesRepresentativosGlobalPorOp(funcionariosDia) {
  const participantesPorOp = new Map()

  for (const funcionario of funcionariosDia || []) {
    for (const linha of funcionario?.linhas || []) {
      if (!linha?.opId) continue
      if (!calcularTotalLinha(linha, funcionario)) continue

      if (!participantesPorOp.has(linha.opId)) participantesPorOp.set(linha.opId, [])
      participantesPorOp.get(linha.opId).push({ funcionario, linha })
    }
  }

  const resultado = new Map()

  for (const [opId, participantes] of participantesPorOp.entries()) {
    let selecionados = participantes.filter(p => isEtapaFinal(p.linha))

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

/**
 * Minutos de ausência. Com `janelas` ({manha,tarde}) a ausência é limitada
 * às janelas de trabalho (um período 12:00–13:00 de almoço não é descontado),
 * igual à tela. Sem `janelas`, usa o comportamento antigo.
 */
export function calcularMinutosAusenciaFuncionario(funcionario, tempoDisponivelDia, janelas = null) {
  const ausencia = funcionario?.ausencia
  if (!ausencia) return 0
  if (ausencia.tipo === 'dia_inteiro') return tempoDisponivelDia

  if (ausencia.tipo === 'parcial' && Array.isArray(ausencia.periodos)) {
    const faixas = janelas?.manha && janelas?.tarde
      ? [
        [horaParaMinutos(janelas.manha.inicio), horaParaMinutos(janelas.manha.fim)],
        [horaParaMinutos(janelas.tarde.inicio), horaParaMinutos(janelas.tarde.fim)],
      ]
      : null

    let total = 0
    for (const periodo of ausencia.periodos) {
      if (!periodo?.inicio || !periodo?.fim) continue
      const pIni = horaParaMinutos(periodo.inicio)
      const pFim = horaParaMinutos(periodo.fim)

      if (faixas) {
        for (const [jIni, jFim] of faixas) {
          const ini = Math.max(pIni, jIni)
          const fim = Math.min(pFim, jFim)
          if (fim > ini) total += fim - ini
        }
      } else if (pFim > pIni) {
        total += pFim - pIni
      }
    }
    return Math.min(total, tempoDisponivelDia)
  }
  return 0
}

export function calcularMinutosDisponiveisFuncionario(funcionario, tempoDisponivelDia, janelas = null) {
  const ausente = calcularMinutosAusenciaFuncionario(funcionario, tempoDisponivelDia, janelas)
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

export function calcularEficienciaLinhaReferencia(funcionario, linha, etapasPorId, overrides = null, dataConsulta = null) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides, dataConsulta)
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

export function calcularEficienciaRegistroReferencia(quantidade, tempoProduzido, linha, funcionario, etapasPorId, overrides = null, dataConsulta = null) {
  const sam = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides, dataConsulta)
  if (!quantidade || !tempoProduzido || !sam) return 0
  return calcularEficiencia({ producaoPonderada: quantidade * sam, funcionarios: 1, tempoTrabalhado: tempoProduzido })
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA POR FUNCIONÁRIO × OP
// ══════════════════════════════════════════════════════════════
export function agruparProducaoFuncionarioPorOp(funcionario, etapasPorId, data = null, overrides = null) {
  // `data` = data selecionada na tela; decide qual registro histórico de
  // Tempo de Referência vale. NÃO limita mais o tempo trabalhado.
  const dataConsulta = data

  const linhasRepresentativas = obterLinhasRepresentativasPorOp(funcionario?.linhas || [])
  const grupos = []

  for (const [opId, linha] of linhasRepresentativas.entries()) {
    const samFicha = resolverTempoPadrao(linha, etapasPorId)
    const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides, dataConsulta)

    let quantidadeProduzida = 0
    let tempoNecessarioFicha = 0
    let tempoNecessarioReferencia = 0
    let tempoProduzido = 0
    const horariosSet = new Set()
    const etapasSet = new Set()

    for (const [hora, reg] of Object.entries(linha.registros || {})) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

      quantidadeProduzida += reg.quantidade
      tempoNecessarioFicha += reg.quantidade * samFicha
      tempoNecessarioReferencia += reg.quantidade * samReferencia
      tempoProduzido += Number(reg.tempoProduzido)
      horariosSet.add(hora)
      etapasSet.add(linha.descricao || linha.etapaId || '—')
    }

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
export function calcularTotaisFuncionarioDia(funcionario, etapasPorId, overrides = null, dataConsulta = null) {
  let quantidade = 0
  let tempoRegistrado = 0
  let tempoFicha = 0
  let tempoReferencia = 0

  const detalhesReferencia = []
  const temposRefDistintos = new Map()

  for (const linha of funcionario?.linhas || []) {
    if (!linha?.opId) continue

    const samFicha = resolverTempoPadrao(linha, etapasPorId)
    const { tempo: tempoRefLinha, origem } = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides, dataConsulta)
    const samReferencia = resolverSam({ tempoReferencia: tempoRefLinha, tempoPadrao: samFicha })

    let temProducaoLinha = false
    for (const [hora, reg] of Object.entries(linha.registros || {})) {
      if (horaBloqueadaPorAusencia(funcionario, hora)) continue
      if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

      temProducaoLinha = true
      quantidade += reg.quantidade
      tempoRegistrado += reg.tempoProduzido
      tempoFicha += reg.quantidade * samFicha
      tempoReferencia += reg.quantidade * samReferencia
    }
    if (temProducaoLinha) {
      const etapaDesc = linha.descricao || linha.etapaId || '—'
      detalhesReferencia.push({
        etapa: etapaDesc,
        opId: linha.opId,
        tempoRef: tempoRefLinha,
        origem,
        tempoFicha: samFicha,
      })
      const chave = `${linha.opId || 'sem-op'}::${etapaDesc}`
      if (!temposRefDistintos.has(chave)) {
        temposRefDistintos.set(chave, {
          etapa: etapaDesc,
          opId: linha.opId,
          tempoRef: tempoRefLinha,
          origem,
          tempoPadrao: samFicha,
        })
      }
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
    detalhesReferencia,
    resumoRef: [...temposRefDistintos.values()],
    formulaFicha: `${tempoFicha} ÷ ${tempoRegistrado} × 100 = ${eficienciaFicha}%`,
    formulaReferencia: `${tempoReferencia} ÷ ${tempoRegistrado} × 100 = ${eficienciaReferencia}%`,
  }
}

export function calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, referencia = false, overrides = null, dataConsulta = null) {
  const totais = calcularTotaisFuncionarioDia(funcionario, etapasPorId, overrides, dataConsulta)
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
// EFICIÊNCIA DA TURMA — MULTI-OP (CONSOLIDAÇÃO)
// ══════════════════════════════════════════════════════════════
// tempoTrabalhadoRegistrado = Σ dos minutos de TODOS os participantes
// (pessoas × tempo). Assim a eficiência não é inflada quando várias
// pessoas trabalham ao mesmo tempo.
export function agruparProducaoPorOp(funcionariosDia, etapasPorId, data = null) {
  const dataConsulta = data

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

    for (const { funcionario, linha } of participantes) {
      const samFicha = resolverTempoPadrao(linha, etapasPorId)
      const samReferencia = resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, null, dataConsulta)
      grupo.temposPadraoDistintos.add(samFicha)

      for (const [hora, reg] of Object.entries(linha.registros || {})) {
        if (horaBloqueadaPorAusencia(funcionario, hora)) continue
        if (!reg || !reg.quantidade || !reg.tempoProduzido) continue

        grupo.producao += reg.quantidade
        grupo.tempoProduzidoFicha += reg.quantidade * samFicha
        grupo.tempoProduzidoReferencia += reg.quantidade * samReferencia
        grupo.tempoTrabalhadoRegistrado += Number(reg.tempoProduzido)
      }
    }

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

// ── EFICIÊNCIA EXATA (SEM ARREDONDAMENTO) ─────────────
export function calcularEficienciaOpExata(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return calcularEficienciaExata({
    producaoPonderada: grupoOp.tempoProduzidoFicha,
    funcionarios: 1,
    tempoTrabalhado: grupoOp.tempoTrabalhadoRegistrado,
  })
}

export function calcularEficienciaOpReferenciaExata(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return calcularEficienciaExata({
    producaoPonderada: grupoOp.tempoProduzidoReferencia,
    funcionarios: 1,
    tempoTrabalhado: grupoOp.tempoTrabalhadoRegistrado,
  })
}

export function resumoConsolidadoOp(grupoOp) {
  if (!grupoOp) return null
  return {
    opId: grupoOp.opId,
    producao: grupoOp.producao,
    tempoTrabalhado: Math.round(grupoOp.tempoTrabalhadoRegistrado * 100) / 100,
    tempoPadraoTotal: Math.round(grupoOp.tempoProduzidoFicha * 100) / 100,
    tempoReferenciaTotal: Math.round(grupoOp.tempoProduzidoReferencia * 100) / 100,
    eficienciaFicha: calcularEficienciaOpExata(grupoOp),
    eficienciaReferencia: calcularEficienciaOpReferenciaExata(grupoOp),
  }
}

/**
 * Agora REALMENTE ponderada: Σ (peças × SAM) ÷ Σ tempo trabalhado de todas
 * as OPs. Uma OP com 10 min deixa de pesar o mesmo que uma de 500 min.
 */
export function calcularEficienciaMediaPonderadaOps(gruposOp, referencia = false) {
  if (!gruposOp?.length) return 0

  let ponderado = 0
  let tempo = 0
  for (const g of gruposOp) {
    if (!(g?.tempoTrabalhadoRegistrado > 0)) continue
    ponderado += referencia ? g.tempoProduzidoReferencia : g.tempoProduzidoFicha
    tempo += g.tempoTrabalhadoRegistrado
  }
  if (!tempo) return 0
  return Math.round(calcularEficienciaExata({ producaoPonderada: ponderado, funcionarios: 1, tempoTrabalhado: tempo }) * 100) / 100
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA GERAL DA TURMA — FÓRMULA ÚNICA
// ══════════════════════════════════════════════════════════════
export function calcularResumoEficienciaGeral(funcionariosDia, etapasPorId, data = null) {
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

  capacidadeFichaTotal = Math.round(capacidadeFichaTotal * 100) / 100
  capacidadeReferenciaTotal = Math.round(capacidadeReferenciaTotal * 100) / 100
  tempoProduzidoTotal = Math.round(tempoProduzidoTotal * 100) / 100

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

/** Delega para calcularResumoEficienciaGeral: um único número para a turma. */
export function calcularEficienciaGeralTurma(funcionariosDia, etapasPorId, referencia = false, data = null) {
  const r = calcularResumoEficienciaGeral(funcionariosDia, etapasPorId, data)
  return referencia ? r.eficienciaReferencia : r.eficienciaFicha
}

// ══════════════════════════════════════════════════════════════
// REGRA DE ALERTA E OUTRAS REGRAS
// ══════════════════════════════════════════════════════════════
export function calcularEficienciaLinhaComRegra(linha, funcionario, etapasPorId, tipoDeProducao, dataConsulta = null) {
  return tipoDeProducao === 'fabrica'
    ? calcularEficienciaLinhaPadrao(linha, funcionario, etapasPorId)
    : calcularEficienciaLinhaReferencia(funcionario, linha, etapasPorId, null, dataConsulta)
}

export function resolverTempoEfetivoComRegra(funcionario, linha, etapasPorId, tipoDeProducao, dataConsulta = null) {
  return tipoDeProducao === 'fabrica'
    ? resolverTempoPadrao(linha, etapasPorId)
    : resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, null, dataConsulta)
}

export function calcularPecasPorHora(linha, funcionario, etapasPorId, tipoDeProducao, dataConsulta = null) {
  const tempoEfetivo = resolverTempoEfetivoComRegra(funcionario, linha, etapasPorId, tipoDeProducao, dataConsulta)
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

export function calcularEficienciaFuncionarioPorModo(funcionario, etapasPorId, modo, overrides = null, dataConsulta = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, modo === 'referencia', overrides, dataConsulta)
}

// ══════════════════════════════════════════════════════════════
// COMPATIBILIDADE
// ══════════════════════════════════════════════════════════════
export function calcularEficienciaFuncionarioPadrao(funcionario, etapasPorId, overrides = null, dataConsulta = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, false, overrides, dataConsulta)
}

export function calcularEficienciaFuncionarioReferencia(funcionario, etapasPorId, overrides = null, dataConsulta = null) {
  return calcularEficienciaGeralFuncionarioPorOp(funcionario, etapasPorId, true, overrides, dataConsulta)
}