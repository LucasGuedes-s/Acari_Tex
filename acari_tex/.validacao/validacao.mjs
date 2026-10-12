/**
 * Validação do src/utils/requestControl.js — importa o ARQUIVO REAL (fonte em
 * data URL, pois o projeto não é ESM). Roda: node .validacao/validacao.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fonte = readFileSync(new URL('../src/utils/requestControl.js', import.meta.url), 'utf8')
const modulo = await import('data:text/javascript;base64,' + Buffer.from(fonte).toString('base64'))
const { compartilhar, invalidar, chaveGet, agrupar, isCancelado } = modulo

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
let executou = 0
const resultados = []
const ok = (nome, detalhe = '') => { resultados.push(`  OK  ${nome}${detalhe ? ' — ' + detalhe : ''}`) }

async function main () {
  // ── 1. Chamadas idênticas simultâneas → UMA execução, mesma Promise ──
  const chavePecas = chaveGet('/pecas')
  const executorPecas = async () => {
    executou++
    await dormir(50)
    return { data: { peca: 'lista' } }
  }
  const [a, b, c] = await Promise.all([
    compartilhar(chavePecas, executorPecas),
    compartilhar(chavePecas, executorPecas),
    compartilhar(chavePecas, executorPecas)
  ])
  assert.equal(executou, 1, 'esperava UMA requisição para 3 chamadas idênticas')
  assert.equal(a, b)
  assert.equal(b, c)
  ok('dedupe de chamadas idênticas', '3 chamadas → 1 requisição, mesma Promise')

  // ── 2. Após terminar, a chave fica livre (nova chamada = nova execução) ──
  await compartilhar(chavePecas, executorPecas)
  assert.equal(executou, 2)
  ok('liberação da chave ao finalizar')

  // ── 3. Filtros diferentes → consultas diferentes (em paralelo) ──
  const k1 = chaveGet('/producao/equipe', { filtro: '2026-10-07' })
  const k2 = chaveGet('/producao/equipe', { filtro: '2026-10-08' })
  assert.notEqual(k1, k2)
  let exec1 = 0
  let exec2 = 0
  const p1 = compartilhar(k1, async () => { exec1++; await dormir(40); return 'd1' })
  const p2 = compartilhar(k2, async () => { exec2++; await dormir(40); return 'd2' })
  await dormir(5) // executors rodam em microtask
  assert.equal(exec1, 1, 'filtro 1 deve ter executado')
  assert.equal(exec2, 1, 'filtro diferente deve gerar NOVA consulta')
  assert.deepEqual(await Promise.all([p1, p2]), ['d1', 'd2'])
  // mesma chave, mesma consulta
  const p3 = compartilhar(k2, async () => { exec2++; return 'd2-novo' })
  await dormir(5) // executor roda em microtask
  assert.equal(exec2, 2)
  assert.equal(await p3, 'd2-novo')
  ok('filtros diferentes → consultas diferentes; iguais → compartilhadas')

  // ── 4. Resposta antiga nunca sobrescreve a nova (padrão seq dos componentes) ──
  const estado = { filtro: null, chamada: 0 }
  const carregar = async (filtro, atraso) => {
    const seq = (estado.chamada = estado.chamada + 1)
    const res = await compartilhar(chaveGet('/producao/equipe', { filtro }), async () => {
      await dormir(atraso)
      return filtro
    })
    if (seq !== estado.chamada) return // resposta antiga: ignora
    estado.filtro = res
  }
  await Promise.all([
    carregar('2026-10-07', 80), // antiga, resposta LENTA
    carregar('2026-10-08', 10)  // nova, resposta RÁPIDA
  ])
  await dormir(120)
  assert.equal(estado.filtro, '2026-10-08', 'resposta antiga sobrescreveu a nova!')
  ok('resposta antiga ignorada', 'filtro antigo (lento) não sobrescreve o novo')

  // ── 5. invalidar(): pós-mutação/evento de socket não reaproveita em andamento ──
  let execEvento = 0
  const kEvt = chaveGet('/intercorrencias')
  const antesDoEvento = compartilhar(kEvt, async () => { execEvento++; await dormir(60); return 'antes' })
  invalidar(kEvt)
  const depoisDoEvento = compartilhar(kEvt, async () => { execEvento++; await dormir(10); return 'depois' })
  await dormir(5) // executors rodam em microtask
  assert.equal(execEvento, 2, 'evento deve exigir nova requisição')
  assert.notEqual(antesDoEvento, depoisDoEvento)
  assert.equal(await depoisDoEvento, 'depois')
  assert.equal(await antesDoEvento, 'antes') // ainda resolve para quem esperava
  ok('invalidação pós-evento', 'em andamento não é reaproveitada')

  // ── 6. Rejeição não deixa a chave presa ──
  const kFalha = chaveGet('/falha')
  await assert.rejects(
    compartilhar(kFalha, async () => { throw new Error('boom') }),
    /boom/
  )
  const aposFalha = await compartilhar(kFalha, async () => 'recuperado')
  assert.equal(aposFalha, 'recuperado')
  ok('erro não deixa a chave presa')

  // ── 7. agrupar(): rajada de eventos Socket.IO → UMA execução ──
  let disparos = 0
  const agrupado = agrupar(() => { disparos++ }, 60)
  for (let i = 0; i < 10; i++) agrupado()
  assert.equal(disparos, 0, 'não deve executar antes da janela')
  await dormir(120)
  assert.equal(disparos, 1, `esperava 1 execução na rajada, veio ${disparos}`)
  ok('agrupamento de eventos Socket.IO', '10 eventos → 1 atualização')

  // ── 8. isCancelado ──
  assert.equal(isCancelado({ code: 'ERR_CANCELED' }), true)
  assert.equal(isCancelado({ name: 'CanceledError' }), true)
  assert.equal(isCancelado(new Error('timeout')), false)
  ok('isCancelado identifica abortos próprios')

  console.log('\nValidação do requestControl.js:\n' + resultados.join('\n'))
  console.log(`\n${resultados.length}/8 cenários passaram.\n`)
}

main().catch((err) => {
  console.error('\nFALHOU:', err.message)
  process.exit(1)
})
