// src/db.js
// Banco local (IndexedDB via Dexie) — offline-first para apontamentos.
//
// ESTRATÉGIA:
// - Servidor é fonte de verdade para ESTRUTURA (OPs, funcionários, linhas).
// - Cada registro de produção (funcionário + OP + etapa + hora + tipo) tem
//   sua própria chave determinística — pendência é granular por registro,
//   nunca pelo dia inteiro.
// - opId FAZ PARTE da chave: etapa final da OP-A jamais conflita com
//   etapa final da OP-B, mesmo que tenham o mesmo id_da_funcao.

import Dexie from 'dexie'

export const db = new Dexie('acariTexApontamento')

db.version(1).stores({
  producoes:
    'id, estabelecimento, data, funcionarioId, opId, etapaId, hora, tipoRegistro, synced, updatedAt',
  metasDia:
    'id, estabelecimento, data, synced, updatedAt',
})

/**
 * Chave determinística — inclui opId para que a mesma etapa em OPs
 * diferentes nunca colida. A hora entra exatamente como 'HH:MM'
 * (confirmado igual ao banco), sem nenhuma reformatação.
 */
export function gerarIdProducao({
  estabelecimento,
  data,
  funcionarioId,
  opId,
  etapaId,
  hora,
  tipoRegistro,
}) {
  return [estabelecimento, data, funcionarioId, opId, etapaId, hora, tipoRegistro]
    .map(v => String(v ?? ''))
    .join('::')
}

export function gerarIdMetaDia({ estabelecimento, data }) {
  return `${estabelecimento}::${data}`
}

export async function salvarProducaoLocal(registro) {
  const id = gerarIdProducao(registro)
  await db.producoes.put({ ...registro, id, synced: false, updatedAt: Date.now() })
  return id
}

export async function marcarProducoesSincronizadas(ids) {
  if (!ids?.length) return
  await db.producoes.where('id').anyOf(ids).modify({ synced: true })
}

export async function buscarProducoesPendentes(estabelecimento, data) {
  return db.producoes
    .where({ estabelecimento, data })
    .filter(p => !p.synced)
    .toArray()
}

export async function buscarProducoesDoDia(estabelecimento, data) {
  return db.producoes.where({ estabelecimento, data }).toArray()
}

export async function buscarProducaoPendentePorChave(chave) {
  const id = gerarIdProducao(chave)
  const existente = await db.producoes.get(id)
  return existente && !existente.synced ? existente : null
}

export async function aceitarProducaoDoServidor(registro) {
  const id = gerarIdProducao(registro)
  await db.producoes.put({ ...registro, id, synced: true, updatedAt: Date.now() })
}

export async function salvarMetaDiaLocal({ estabelecimento, data, payload }) {
  const id = gerarIdMetaDia({ estabelecimento, data })
  await db.metasDia.put({ id, estabelecimento, data, payload, synced: false, updatedAt: Date.now() })
  return id
}

export async function marcarMetaDiaSincronizada(estabelecimento, data) {
  const id = gerarIdMetaDia({ estabelecimento, data })
  await db.metasDia.update(id, { synced: true })
}

export async function buscarMetaDiaLocal(estabelecimento, data) {
  const id = gerarIdMetaDia({ estabelecimento, data })
  return db.metasDia.get(id)
}

export async function buscarMetaDiaPendente(estabelecimento, data) {
  const meta = await buscarMetaDiaLocal(estabelecimento, data)
  return meta && !meta.synced ? meta : null
}

export async function aceitarMetaDiaDoServidor({ estabelecimento, data, payload }) {
  const id = gerarIdMetaDia({ estabelecimento, data })
  await db.metasDia.put({ id, estabelecimento, data, payload, synced: true, updatedAt: Date.now() })
}