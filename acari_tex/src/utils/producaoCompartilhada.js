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
  // capturado no momento do lançamento e guardado em `linha.tempoPadrao`.
  // O tempo padrão da PEÇA (peca.tempo_padrao) fica isolado em
  // `linha.tempoPadraoPeca` e NUNCA é lido aqui.
  return Number(linha?.tempoPadrao || 0)
}

// ══════════════════════════════════════════════════════════════
// RESOLUÇÃO DO TEMPO DE REFERÊNCIA — FONTE ÚNICA
// ══════════════════════════════════════════════════════════════
//
// Esta é a ÚNICA função que decide qual TempoReferencia é usado em
// qualquer lugar do sistema (cálculo de eficiência, totais, médias,
// cards, gráficos, ranking, exportação para Excel, exibição na tela).
// Nenhuma outra função deve reimplementar essa busca — todas as demais
// (inclusive `resolverTempoReferencia`, mantida por compatibilidade)
// delegam para cá.
//
// ORDEM DE PRIORIDADE:
//   1. Override manual do usuário (dropdown do Registro de Produção)
//      → origem: 'manual'
//   2. TempoReferencia do PROFISSIONAL para a OP/etapa atual.
//      Se houver mais de um registro, usa o MAIS RECENTE (por data de
//      cadastro quando disponível, senão pelo id do registro).
//      → origem: 'peca'  (profissional + OP)
//   3. TempoReferencia do PROFISSIONAL para a MESMA ETAPA em qualquer
//      outra OP. Se houver mais de um, usa o MAIS RECENTE.
//      → origem: 'ultimo_registrado' (profissional + etapa)
//   4. Nenhum encontrado → usa o Tempo Padrão da Ficha.
//      → origem: null
//
// NUNCA usa o tempo de outro profissional.

// Valor comparável de "recência" de um registro de tempo de referência.
// Usa a primeira data de cadastro disponível; na ausência de qualquer
// data, usa o id numérico do registro como proxy (id maior = mais
// recente), assumindo ids autoincrementais do banco.
function valorRecenciaRef(ref) {
  if (!ref) return -Infinity
  const candidatosData = [ref.criado_em, ref.data_criacao, ref.createdAt, ref.created_at, ref.data_cadastro]
  for (const c of candidatosData) {
    if (!c) continue
    const t = new Date(c).getTime()
    if (!isNaN(t)) return t
  }
  const idNum = Number(ref.id)
  return isNaN(idNum) ? -Infinity : idNum
}

// Retorna o registro mais recente de uma lista (ou null se vazia).
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
 * Resolve o tempo de referência do funcionário retornando também a
 * ORIGEM e o registro utilizado. Esta é a função central: qualquer
 * outro ponto do sistema (cálculo, exibição, exportação) deve ler o
 * valor a partir daqui — nunca reimplementar a busca.
 *
 * @returns {{ tempo: number|null, origem: string|null, registroId: string|number|null, nomeFunc: string|null }}
 */
export function resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides = null) {
  // 1. Override manual (dropdown) — PRIORIDADE ABSOLUTA
  const modoTempo = overrides?.modoTempo || linha?.modoTempo
  const refId = overrides?.referenciaSelecionadaId || linha?.referenciaSelecionadaId

  if (modoTempo === 'referencia' && refId) {
    const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
    const refs = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
    if (Array.isArray(refs)) {
      const refIdBusca = String(refId)
      // String() porque $event.target.value retorna STRING, mas r.id do
      // banco é NUMBER.
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

  // 2. TempoReferencia do PROFISSIONAL + OP/ETAPA atual — se houver mais
  //    de um registro, usa o mais recente.
  const etapa = buscarEtapa(etapasPorId, linha?.etapaId, linha?.opId)
  const refsDaEtapaOp = etapa?.tempo_referencia || etapa?.etapa?.tempo_referencia || []
  if (Array.isArray(refsDaEtapaOp) && funcionario?.email) {
    const refsDoProfissional = refsDaEtapaOp.filter(r => r && r.id_funcionario === funcionario.email)
    const escolhido = escolherRefMaisRecente(refsDoProfissional)
    if (escolhido) {
      const t = extrairTempoRef(escolhido)
      if (t > 0) {
        return { tempo: t, origem: 'peca', registroId: escolhido.id ?? null, nomeFunc: funcionario?.nome || null }
      }
    }
  }

  // 3. TempoReferencia do PROFISSIONAL para a MESMA ETAPA em qualquer
  //    outra OP — reúne todos os candidatos e usa o mais recente entre
  //    TODOS eles (não apenas o último encontrado na iteração).
  if (funcionario?.email && linha?.etapaId && etapasPorId) {
    const candidatasEtapa = etapasPorId.get(linha.etapaId) || []
    const todosOsRefsDoProfissional = []
    for (const candidata of candidatasEtapa) {
      const refsCandidata = candidata?.tempo_referencia || candidata?.etapa?.tempo_referencia || []
      if (!Array.isArray(refsCandidata)) continue
      for (const r of refsCandidata) {
        if (r && r.id_funcionario === funcionario.email) todosOsRefsDoProfissional.push(r)
      }
    }
    const escolhido = escolherRefMaisRecente(todosOsRefsDoProfissional)
    if (escolhido) {
      const t = extrairTempoRef(escolhido)
      if (t > 0) {
        return { tempo: t, origem: 'ultimo_registrado', registroId: escolhido.id ?? null, nomeFunc: funcionario?.nome || null }
      }
    }
  }

  // 4. Sem referência → usa tempo padrão da ficha
  return { tempo: null, origem: null, registroId: null, nomeFunc: null }
}

/**
 * Mantida por compatibilidade de nome — delega 100% para
 * `resolverTempoReferenciaComOrigem`, garantindo que o valor usado no
 * CÁLCULO seja sempre idêntico ao valor mostrado na INTERFACE. Não
 * existe mais nenhuma lógica duplicada entre exibição e cálculo.
 *
 * @returns {number|null} Tempo de referência em minutos ou null
 */
export function resolverTempoReferencia(funcionario, linha, etapasPorId, overrides = null) {
  return resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides).tempo
}

/**
 * Variante com assinatura por objeto nomeado, útil para chamadas
 * externas (ex.: relatórios/exportação) que preferem passar os ids
 * diretamente em vez de montar os objetos `funcionario`/`linha`.
 *
 * @returns {{ valor: number|null, origem: string|null, registroId: string|number|null }}
 */
export function resolverTempoReferenciaCentral({ funcionario, linha, etapasPorId, overrides = null } = {}) {
  const r = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides)
  return { valor: r.tempo, origem: r.origem, registroId: r.registroId, nomeFunc: r.nomeFunc }
}

/**
 * Resolve o tempo efetivo (referência ou ficha) considerando overrides.
 */
export function resolverTempoEfetivoReferencia(funcionario, linha, etapasPorId, overrides = null) {
  const tempoReferencia = resolverTempoReferencia(funcionario, linha, etapasPorId, overrides)
  return resolverSam({ tempoReferencia, tempoPadrao: resolverTempoPadrao(linha, etapasPorId) })
}

/**
 * Retorna detalhes completos do tempo de referência para CADA linha
 * de produção de um profissional. Útil para exibição/transparência.
 */
export function obterDetalhesTempoReferenciaFuncionario(funcionario, etapasPorId) {
  const resultado = []
  for (const linha of funcionario?.linhas || []) {
    if (!linha?.opId) continue
    const { tempo: tempoRef, origem } = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId)
    const tempoFicha = resolverTempoPadrao(linha)
    resultado.push({
      etapa: linha.descricao || linha.etapaId || '—',
      opId: linha.opId,
      tempoRef,
      origem,
      tempoFicha,
    })
  }
  return resultado
}

// ── AUXILIAR: SELEÇÃO DA ETAPA REPRESENTATIVA DA OP ─────
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
export function agruparProducaoFuncionarioPorOp(funcionario, etapasPorId, data = null, overrides = null) {
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
export function calcularTotaisFuncionarioDia(funcionario, etapasPorId, overrides = null) {
  let quantidade = 0
  let tempoRegistrado = 0
  let tempoFicha = 0
  let tempoReferencia = 0

  const detalhesReferencia = []
  const temposRefDistintos = new Map()

  for (const linha of funcionario?.linhas || []) {
    if (!linha?.opId) continue

    const samFicha = resolverTempoPadrao(linha, etapasPorId)
    const { tempo: tempoRefLinha, origem } = resolverTempoReferenciaComOrigem(funcionario, linha, etapasPorId, overrides)
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

  const resumoRef = [...temposRefDistintos.values()]

  return {
    quantidade,
    tempoRegistrado,
    tempoFicha,
    tempoReferencia,
    eficienciaFicha,
    eficienciaReferencia,
    detalhesReferencia,
    resumoRef,
    formulaFicha: `${tempoFicha} ÷ ${tempoRegistrado} × 100 = ${eficienciaFicha}%`,
    formulaReferencia: `${tempoReferencia} ÷ ${tempoRegistrado} × 100 = ${eficienciaReferencia}%`,
  }
}

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
export function calcularEficienciaGeralTurma(funcionariosDia, etapasPorId, referencia = false) {
  const gruposOp = agruparProducaoPorOp(funcionariosDia, etapasPorId).filter(g => g.producao > 0)
  return calcularEficienciaMediaPonderadaOps(gruposOp, referencia)
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA DA TURMA — MULTI-OP (CONSOLIDAÇÃO)
// ══════════════════════════════════════════════════════════════
export function agruparProducaoPorOp(funcionariosDia, etapasPorId, data = null) {
  const tempoMaximoDia = data != null ? minutosDisponiveisDia(data) : 540

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

        grupo.producao += reg.quantidade
        grupo.tempoProduzidoFicha += reg.quantidade * samFicha
        grupo.tempoProduzidoReferencia += reg.quantidade * samReferencia
        entradasParaTempo.push({ hora, tempoProduzido: reg.tempoProduzido })
      }
    }

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

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA EXATA (SEM ARREDONDAMENTO) — PARA CÁLCULO DE MÉDIAS
// ══════════════════════════════════════════════════════════════
export function calcularEficienciaOpExata(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return (grupoOp.tempoProduzidoFicha / grupoOp.tempoTrabalhadoRegistrado) * 100
}

export function calcularEficienciaOpReferenciaExata(grupoOp) {
  if (!grupoOp?.tempoTrabalhadoRegistrado) return 0
  return (grupoOp.tempoProduzidoReferencia / grupoOp.tempoTrabalhadoRegistrado) * 100
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

export function calcularEficienciaMediaPonderadaOps(gruposOp, referencia = false) {
  if (!gruposOp?.length) return 0

  const eficiencias = gruposOp
    .filter(grupo => grupo?.tempoTrabalhadoRegistrado > 0)
    .map(grupo => referencia
      ? calcularEficienciaOpReferenciaExata(grupo)
      : calcularEficienciaOpExata(grupo))

  if (!eficiencias.length) return 0
  const soma = eficiencias.reduce((s, e) => s + e, 0)
  return Math.round((soma / eficiencias.length) * 100) / 100
}

// ══════════════════════════════════════════════════════════════
// EFICIÊNCIA GERAL DA TURMA — FÓRMULA CORRETA
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