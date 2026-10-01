// src/utils/tempoReferencia.js
//
// Fonte ÚNICA da lógica de "qual registro de Tempo de Referência vale
// para qual data selecionada na tela". Usado tanto pelo Registro de
// Produção (ApontamentoDia.vue) quanto pelo Painel de Profissionais
// (via producaoCompartilhada.js), garantindo que os dois lugares
// escolham exatamente o mesmo registro para a mesma data.
//
// Regra de prioridade (para um funcionário/etapa com histórico):
//   1. Registro exatamente na data consultada.
//   2. Se não houver, o mais recente ANTERIOR à data consultada.
//   3. Se não houver nenhum anterior, um registro sem data (legado).
//   4. Em último caso, a data futura mais próxima.
//   5. Sem data de consulta informada: usa sempre o mais recente
//      disponível (comportamento de fallback/compatibilidade).

// Campos candidatos onde a data da referência pode vir do backend.
// 'data_medicao' é o campo confirmado no retorno real de /pecas — deve
// vir primeiro. 'criadoEm' é o segundo fallback confirmado (mesma
// origem). Os demais ficam por segurança para variações futuras da API.
const CAMPOS_DATA_REFERENCIA = [
  'data_medicao', 'criadoEm',
  'data_referencia', 'data', 'data_registro', 'created_at', 'createdAt', 'data_cadastro', 'data_criacao',
]

function dataLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Converte qualquer formato suportado para 'YYYY-MM-DD' (ou null). */
export function normalizarDataReferencia(valor) {
  if (valor == null || valor === '') return null
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : dataLocal(valor)

  const s = String(valor).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`

  // Coluna DATE serializada como meia-noite UTC: a data é a do próprio texto.
  // (Converter para local deslocaria para o dia anterior no Brasil.)
  m = s.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$/)
  if (m) return m[1]

  // Datetime com hora real (ex.: data_medicao, criadoEm): usa o dia
  // local do usuário — coerente com o <input type="date"> da tela.
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : dataLocal(d)
}

export function extrairDataReferencia(ref) {
  for (const campo of CAMPOS_DATA_REFERENCIA) {
    const data = normalizarDataReferencia(ref?.[campo])
    if (data) return data
  }
  return null
}

export function tempoDaReferencia(ref) {
  return Number(ref?.tempo_minutos ?? ref?.tempo_por_peca ?? 0)
}

/** Escolhe o "mais recente" dentro de um conjunto de candidatas, sem
 * um alvo de data (usado quando dataConsulta não foi informada, ou
 * como desempate quando há mais de um registro na mesma data). */
function escolherMaisRecenteSemAlvo(candidatas) {
  const melhor = candidatas.reduce((atualMelhor, atual) => {
    if (!atualMelhor) return atual
    if (atual.data && atualMelhor.data) {
      return atual.data > atualMelhor.data ? atual : atualMelhor
    }
    if (atual.data && !atualMelhor.data) return atual
    if (!atual.data && atualMelhor.data) return atualMelhor

    const idAtual = Number(atual.ref?.id)
    const idMelhor = Number(atualMelhor.ref?.id)
    if (!isNaN(idAtual) && !isNaN(idMelhor)) return idAtual > idMelhor ? atual : atualMelhor
    return atual.ordem > atualMelhor.ordem ? atual : atualMelhor
  }, null)
  return melhor?.ref ?? null
}

/**
 * Regra única de escolha (usada por ApontamentoDia.vue e por
 * producaoCompartilhada.js). `refs` já deve ser a lista da ETAPA (e
 * portanto da OP) da linha — a função filtra internamente por
 * `funcionarioId`.
 */
export function escolherReferenciaPorData(refs, { funcionarioId, dataConsulta } = {}) {
  if (!Array.isArray(refs) || !funcionarioId) return null

  const candidatas = refs
    .filter(r => r && r.id_funcionario === funcionarioId && tempoDaReferencia(r) > 0)
    .map((ref, ordem) => ({ ref, ordem, data: extrairDataReferencia(ref) }))

  if (!candidatas.length) return null

  const alvo = normalizarDataReferencia(dataConsulta)

  // Sem data de consulta: mantém o comportamento de "sempre o mais
  // recente" (usado por chamadas que ainda não repassam a data).
  if (!alvo) return escolherMaisRecenteSemAlvo(candidatas)

  const datadas = candidatas.filter(c => c.data)
  const semData = candidatas.filter(c => !c.data)

  const naData = datadas.filter(c => c.data === alvo)
  if (naData.length) {
    return naData.length === 1 ? naData[0].ref : escolherMaisRecenteSemAlvo(naData)
  }

  const anteriores = datadas
    .filter(c => c.data < alvo)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.ordem - b.ordem))
  if (anteriores.length) return anteriores[0].ref

  if (semData.length) return escolherMaisRecenteSemAlvo(semData)

  const futuras = datadas
    .filter(c => c.data > alvo)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem))
  return futuras[0]?.ref ?? null
}