// TESTE: análise individual de profissionais (agregação pura, sem banco)
// Execute com: node tests/analiseProfissional_test.js
//
// Valida, sem banco:
//   1. resolverPeriodoAnterior / rangeConsulta → fronteiras de período
//   2. escolherUsuarioPorEmail → match case-insensitive dentro do estabelecimento
//   3. agregarProducoes → SAM (OP+func → func → padrão), dedupe externo,
//      eficiência Tempo Fábrica/Ficha, capacidade, por dia e por OP
//   4. montarEvolucao → sem inventar percentuais quando não há dados anteriores

const {
  formatarBR,
  rangeConsulta,
  resolverPeriodoAnterior,
  escolherUsuarioPorEmail,
  agregarProducoes,
  montarEvolucao,
} = require('../Services/analiseProfissionalService')
const { removerProducoesDuplicadas } = require('../Services/relatorioProducaoService')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
    (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

const dia = (y, m, d, hora = 0) => new Date(Date.UTC(y, m - 1, d, hora))

function producaoBase({ op, etapa, qtd, tempo, data, hora = '09:00', id = 1 }) {
  return {
    id_da_producao: id,
    id_funcionario: 'joao@empresa.com',
    id_da_op: op,
    id_da_funcao: etapa,
    quantidade_pecas: qtd,
    tempo_produzido: tempo,
    data_inicio: data,
    dataReferencia: data,
    hora_registro: hora,
    tipoRegistro: 'principal',
    producao_funcionario: { nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: etapa, descricao: 'Costura', tempo_padrao: 1 },
    producao_peca: { id_da_op: op, descricao: `OP ${op}`, tempo_padrao: 1 },
  }
}

// TempoReferência: OP 100/etapa 10 → 0.5; etapa 10 sem OP → 0.6
const refs = [
  { id: 1, id_funcionario: 'joao@empresa.com', id_da_funcao: 10, opId: 100, tempo_minutos: 0.5, tempo_por_peca: null, criadoEm: dia(2026, 9, 1), data_medicao: dia(2026, 9, 1) },
  { id: 2, id_funcionario: 'joao@empresa.com', id_da_funcao: 10, opId: null, tempo_minutos: 0.6, tempo_por_peca: null, criadoEm: dia(2026, 9, 2), data_medicao: dia(2026, 9, 2) },
]
const etapasReferenciaMap = new Map([[10, refs]])

// ─────────────────────────────────────────────────────────────
// 1. Datas / períodos
// ─────────────────────────────────────────────────────────────
verificar('formatarBR', formatarBR('2026-09-01'), '01/09/2026')

const range = rangeConsulta('2026-09-01', '2026-09-30')
verificar('range gte = meia-noite UTC', range.gte.toISOString(), '2026-09-01T00:00:00.000Z')
verificar('range lt = dia seguinte (inclui dataFim inteiro)', range.lt.toISOString(), '2026-10-01T00:00:00.000Z')

const prev = resolverPeriodoAnterior('2026-09-01', '2026-09-30')
verificar('período anterior (30 dias) — início', prev.inicio, '2026-08-02')
verificar('período anterior (30 dias) — fim', prev.fim, '2026-08-31')

const prev7 = resolverPeriodoAnterior('2026-09-08', '2026-09-14')
verificar('período anterior (7 dias)', `${prev7.inicio}→${prev7.fim}`, '2026-09-01→2026-09-07')

// ─────────────────────────────────────────────────────────────
// 2. Email case-insensitive
// ─────────────────────────────────────────────────────────────
const usuarios = [
  { email: 'Joao@Empresa.com', nome: 'João' },
  { email: 'maria@empresa.com', nome: 'Maria' },
]
verificar('match case-insensitive', escolherUsuarioPorEmail(usuarios, 'joao@empresa.com')?.email, 'Joao@Empresa.com')
verificar('outro estabelecimento não afeta (filtro vem do where)', escolherUsuarioPorEmail(usuarios, 'pedro@x.com'), null)

// ─────────────────────────────────────────────────────────────
// 3. agregarProducoes — SAM e eficiências
//    OP 100: TR individual 0.5; OP 200: sem TR de OP → 0.6 (etapa);
//    OP 300: sem TR nenhum → padrão da etapa 1.0
// ─────────────────────────────────────────────────────────────
const producoes = [
  producaoBase({ op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10), id: 1 }), // sam 0.5 → efRef 100/60*... = 83.33
  producaoBase({ op: 200, etapa: 10, qtd: 50, tempo: 45, data: dia(2026, 9, 11), id: 2 }),  // sam 0.6 → ponderado 30 / 45 = 66.67
  producaoBase({ op: 300, etapa: 20, qtd: 10, tempo: 30, data: dia(2026, 9, 12), id: 3 }),  // sam 1.0 (padrão) → 10/30 = 33.33
]

const ctx = {
  referenciasPorEtapa: etapasReferenciaMap,
  funcionarioEmail: 'joao@empresa.com',
  opsMap: new Map([[100, { id_da_op: 100, descricao: 'Camiseta branca', quantidade_pecas: 500 }]]),
}
const agregado = agregarProducoes(producoes, ctx)

verificar('producaoTotal', agregado.resumo.producaoTotal, 160)
verificar('registros', agregado.resumo.registros, 3)
verificar('opsTrabalhadas', agregado.resumo.opsTrabalhadas, 3)
verificar('etapasTrabalhadas', agregado.resumo.etapasTrabalhadas, 2)
verificar('horasTrabalhadas (135min)', agregado.resumo.horasTrabalhadas, 2.25)

// tempoReferencia total = 100×0.5 + 50×0.6 + 10×1.0 = 90 → 90/135 = 66.67 → Math.round = 67
verificar('eficiência Tempo Fábrica (67)', agregado.resumo.eficienciaReferencia, 67)
// tempoFicha total = 100×1 + 50×1 + 10×1 = 160 → 160/135 = 118.52 → Math.round = 119
verificar('eficiência Ficha (119)', agregado.resumo.eficienciaFicha, 119)
// tempo médio = 135/160 = 0.84
verificar('tempoMedioPorPeca (0.84)', agregado.resumo.tempoMedioPorPeca, 0.84)
// TR médio ponderado = 90/160 = 0.56
verificar('tempoReferenciaMedio (0.56)', agregado.resumo.tempoReferenciaMedio, 0.56)

const op100 = agregado.porOp.find(r => r.idOp === 100)
verificar('porOp OP100: descrição do opsMap', op100.descricaoOp, 'Camiseta branca')
verificar('porOp OP100: TR individual (0.5)', op100.tempoReferenciaIndividual, 0.5)
verificar('porOp OP100: origem TR = peca', op100.origemTempoReferencia, 'peca')
verificar('porOp OP100: padrão da etapa (1)', op100.tempoPadrao, 1)
verificar('porOp OP100: realizado/peça (0.6)', op100.tempoRealizadoPorPeca, 0.6)
verificar('porOp OP100: eficiência Tempo Fábrica (83)', op100.eficienciaReferencia, 83)
// capacidade = floor(60 / 0.5) = 120
verificar('porOp OP100: capacidade (120)', op100.capacidade, 120)

const op200 = agregado.porOp.find(r => r.idOp === 200)
verificar('porOp OP200: TR cai na referência da etapa (0.6)', op200.tempoReferenciaIndividual, 0.6)
verificar('porOp OP200: origem TR = ultimo_registrado', op200.origemTempoReferencia, 'ultimo_registrado')

const op300 = agregado.porOp.find(r => r.idOp === 300)
verificar('porOp OP300: TR = padrão da etapa (1)', op300.tempoReferenciaIndividual, 1)
verificar('porOp OP300: origem TR = padrao_ficha', op300.origemTempoReferencia, 'padrao_ficha')

verificar('porOp ordenado por produção desc', agregado.porOp.map(r => r.idOp), [100, 200, 300])
// A chave do dia segue a REGRA HÍBRIDA OFICIAL: data_inicio gravada como
// meia-noite UTC preserva o dia gravado (componentes UTC) — o dia 10 fica
// no dia 10, sem deslocamento de fuso.
verificar('porDia: dias presentes (dia gravado preservado)', agregado.porDia.map(d => d.data),
  ['2026-09-10', '2026-09-11', '2026-09-12'])
verificar('porDia dia1: eficiência (83)', agregado.porDia[0].eficienciaReferencia, 83)

// ─────────────────────────────────────────────────────────────
// 3b. Dedupe + estorno integrados à agregação
// ─────────────────────────────────────────────────────────────
const comDuplicata = [
  producaoBase({ op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10), hora: '09:00', id: 1 }),
  producaoBase({ op: 100, etapa: 10, qtd: 120, tempo: 60, data: dia(2026, 9, 10), hora: '09:00', id: 9 }), // duplicata (mantém maior id)
  producaoBase({ op: 100, etapa: 10, qtd: -20, tempo: 10, data: dia(2026, 9, 10), hora: '10:00', id: 10 }), // estorno
]
const { producoes: dedupe } = removerProducoesDuplicadas(comDuplicata)
verificar('dedupe: mantém 2 lançamentos', dedupe.length, 2)
const agregado2 = agregarProducoes(dedupe, ctx)
// Lançamentos com qtd <= 0 (estorno) não entram nos totais da análise
// individual; duplicata removida mantém o maior id (120).
verificar('duplicata removida: producaoTotal = 120', agregado2.resumo.producaoTotal, 120)

// ─────────────────────────────────────────────────────────────
// 4. montarEvolucao — sem inventar percentuais
// ─────────────────────────────────────────────────────────────
const atualVazio = { resumo: { producaoTotal: 0, registros: 0, eficienciaReferencia: 0, tempoMedioPorPeca: 0, tempoReferenciaMedio: 0 } }
const anteriorSemDados = { resumo: { producaoTotal: 0, registros: 0, eficienciaReferencia: 0, tempoMedioPorPeca: 0, tempoReferenciaMedio: 0 } }
const evolucaoSem = montarEvolucao(atualVazio, anteriorSemDados, { inicio: '2026-08-02', fim: '2026-08-31' })
verificar('evolução sem dados anteriores: temDadosAnteriores', evolucaoSem.temDadosAnteriores, false)
verificar('evolução sem dados anteriores: variacaoPontos null', evolucaoSem.variacaoPontos, null)
verificar('evolução sem dados anteriores: eficienciaAnterior null', evolucaoSem.eficienciaReferenciaAnterior, null)

const atual = { resumo: { producaoTotal: 160, registros: 3, eficienciaReferencia: 84.2, tempoMedioPorPeca: 0.84, tempoReferenciaMedio: 0.56 } }
const anterior = { resumo: { producaoTotal: 90, registros: 2, eficienciaReferencia: 80.1, tempoMedioPorPeca: 0.9, tempoReferenciaMedio: 0.6 } }
const evolucao = montarEvolucao(atual, anterior, { inicio: '2026-08-02', fim: '2026-08-31' })
verificar('evolução: variacaoPontos (+4.1)', evolucao.variacaoPontos, 4.1)
verificar('evolução: produção anterior', evolucao.producaoAnterior, 90)
verificar('evolução: temDadosAnteriores', evolucao.temDadosAnteriores, true)

console.log(falhas === 0 ? '\n✅ Todos os testes passaram.' : `\n❌ ${falhas} verificação(ões) falharam.`)
process.exit(falhas === 0 ? 0 : 1)
