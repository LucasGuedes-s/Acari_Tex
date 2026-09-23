// Campos candidatos onde a data da referência pode vir do backend.
// AJUSTAR conforme o retorno real de /pecas.
const CAMPOS_DATA_REFERENCIA = ['data_medicao', 'criadoEm', 'data_referencia', 'data', 'data_registro', 'created_at', 'createdAt']

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

  // Datetime com hora real (ex.: created_at): usa o dia local do usuário.
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

/**
 * Regra única de escolha (usada por RegistroDeProducao e ProducaoDia).
 * `refs` já deve ser a lista da ETAPA (e portanto da OP) da linha.
 * Ordem: 1) mesma data  2) mais recente ANTERIOR à data
 *        3) sem data (legado)  4) futura mais próxima (último recurso).
 * Empate: mantém o comportamento antigo (primeiro do array).
 */
export function escolherReferenciaPorData(refs, { funcionarioId, dataConsulta }) {
  if (!Array.isArray(refs) || !funcionarioId) return null

  const candidatas = refs
    .filter(r => r && r.id_funcionario === funcionarioId && tempoDaReferencia(r) > 0)
    .map((ref, ordem) => ({ ref, ordem, data: extrairDataReferencia(ref) }))

  if (!candidatas.length) return null

  const alvo = normalizarDataReferencia(dataConsulta)
  if (!alvo) return candidatas[0].ref

  const datadas = candidatas.filter(c => c.data)
  const semData = candidatas.filter(c => !c.data)

  const naData = datadas.filter(c => c.data === alvo)
  if (naData.length) {
    if (naData.length === 1) return naData[0].ref
    return naData.sort((a, b) => {
      const ca = a.ref?.criadoEm || ''
      const cb = b.ref?.criadoEm || ''
      return cb.localeCompare(ca) // mais recente primeiro
    })[0].ref
  }

  const anteriores = datadas
    .filter(c => c.data < alvo)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.ordem - b.ordem))
  if (anteriores.length) return anteriores[0].ref

  if (semData.length) return semData[0].ref

  const futuras = datadas
    .filter(c => c.data > alvo)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem))
  return futuras[0]?.ref ?? null
}