// src/db.js
// Banco local (IndexedDB via Dexie) para persistência offline-first
// dos apontamentos de produção e da meta do dia.
//
// ESTRATÉGIA (revisada):
// - O SERVIDOR é a fonte de verdade. Toda vez que chega uma resposta dele
//   (via buscar-meta-dia ou via evento em tempo real), os valores recebidos
//   são aplicados na tela e gravados localmente como `synced: true`.
// - Uma edição do usuário grava local IMEDIATAMENTE como `synced: false` e
//   tenta emitir ao servidor. Só passa a `synced: true` quando o servidor
//   confirmar (callback/ack do socket).
// - Ao buscar dados (reconexão, mudança de data, refresh da página), cada
//   registro é resolvido INDIVIDUALMENTE: se aquele registro específico
//   (mesmo funcionário + etapa + linha + HORA) está pendente local, o valor
//   local é mantido na tela (para não perder o que o usuário digitou e
//   ainda não foi confirmado); caso contrário, o valor do servidor
//   prevalece e substitui o local.
// - A granularidade da pendência é por HORA, nunca pelo dia inteiro — isso
//   evita que uma única edição pendente "congele" a tela inteira e
//   impeça novas OPs/etapas vindas do servidor de aparecer.

import Dexie from 'dexie'

export const db = new Dexie('acariTexApontamento')

db.version(1).stores({
  // Uma linha por (estabelecimento, data, funcionarioId, etapaId, hora, tipoRegistro, linhaId)
  producoes:
    'id, estabelecimento, data, funcionarioId, etapaId, opId, hora, tipoRegistro, linhaId, synced, updatedAt',

  // Uma linha por (estabelecimento, data) — guarda a estrutura do dia
  // (OPs ativas + esqueleto de funcionarios/linhas). Os VALORES de produção
  // ficam só em `producoes`.
  metasDia: 'id, estabelecimento, data, synced, updatedAt',
})

/**
 * Id determinístico de um registro de produção. A hora entra exatamente no
 * formato 'HH:MM' usado pelo front (mesmo formato gravado no back, conforme
 * confirmado) — nunca normalizar/reformatar aqui, só repassar a string como
 * veio, para garantir que o id bate dos dois lados (gravação e leitura).
 */
export function gerarIdProducao({
  estabelecimento,
  data,
  funcionarioId,
  etapaId,
  opId,
  hora,
  tipoRegistro,
}) {
  return [
    estabelecimento,
    data,
    funcionarioId,
    etapaId,
    opId,
    hora,
    tipoRegistro,
  ]
    .map(v => String(v ?? ''))
    .join('::')
}

export function gerarIdMetaDia({ estabelecimento, data }) {
  return `${estabelecimento}::${data}`
}

/**
 * Upsert local de um registro de produção (chamado em toda digitação do
 * usuário). Marca synced=false — só volta a true quando o servidor
 * confirmar via callback do socket.
 */
export async function salvarProducaoLocal(registro) {
  const id = gerarIdProducao(registro)

  await db.producoes.put({
    ...registro,
    id,
    synced: false,
    updatedAt: Date.now(),
  })

  return id
}

/** Marca um conjunto de ids como sincronizados após confirmação do servidor. */
export async function marcarProducoesSincronizadas(ids) {
  if (!ids?.length) return
  await db.producoes.where('id').anyOf(ids).modify({ synced: true })
}

/** Retorna todos os registros pendentes (ainda não confirmados) de um dia. */
export async function buscarProducoesPendentes(estabelecimento, data) {
  return db.producoes
    .where({ estabelecimento, data })
    .filter(p => !p.synced)
    .toArray()
}

/** Retorna todos os registros locais de um dia (pendentes ou não). */
export async function buscarProducoesDoDia(estabelecimento, data) {
  return db.producoes.where({ estabelecimento, data }).toArray()
}

/**
 * Checa se EXISTE pendência local para um registro específico
 * (funcionário + etapa + linha + hora). Esta é a unidade de granularidade
 * usada para decidir, registro a registro, se o valor do servidor pode
 * sobrescrever a tela ou não.
 */
export async function buscarProducaoPendentePorChave(chave) {
  const id = gerarIdProducao(chave)
  const existente = await db.producoes.get(id)
  return existente && !existente.synced ? existente : null
}

/**
 * Grava (ou atualiza) localmente um registro vindo do servidor, sempre como
 * synced=true. Chamar SOMENTE depois de confirmar (via
 * buscarProducaoPendentePorChave) que não há edição local pendente para
 * essa mesma chave — senão o valor do servidor sobrescreveria uma edição
 * do usuário ainda não confirmada.
 */
export async function aceitarProducaoDoServidor(registroServidor) {
  const id = gerarIdProducao(registroServidor)

  await db.producoes.put({
    ...registroServidor,
    id,
    synced: true,
    updatedAt: Date.now(),
  })
}

/** Upsert local da estrutura do dia (OPs ativas + esqueleto de linhas). */
export async function salvarMetaDiaLocal({ estabelecimento, data, payload }) {
  const id = gerarIdMetaDia({ estabelecimento, data })

  await db.metasDia.put({
    id,
    estabelecimento,
    data,
    payload,
    synced: false,
    updatedAt: Date.now(),
  })

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

/**
 * Grava localmente a estrutura do dia vinda do servidor (sempre aceita —
 * a estrutura, diferente dos valores de produção, não tem granularidade
 * fina de pendência: ela é sempre a versão mais recente do servidor).
 */
export async function aceitarMetaDiaDoServidor({ estabelecimento, data, payload }) {
  const id = gerarIdMetaDia({ estabelecimento, data })

  await db.metasDia.put({
    id,
    estabelecimento,
    data,
    payload,
    synced: true,
    updatedAt: Date.now(),
  })
}