// TESTE: produção concluída dos relatórios (etapa final + dedupe)
// Execute com: node tests/relatorioProducao_test.js
//
// Valida, sem banco:
//   1. montarEtapasFinaisPorOp  → regra de etapa final por OP
//   2. removerProducoesDuplicadas → dedupe de lançamentos
//   3. isEtapaFinal (utils/etapaFinal.js) → regra única do backend

const {
  montarEtapasFinaisPorOp,
  removerProducoesDuplicadas,
} = require('../Services/relatorioProducaoService')
const { isEtapaFinal } = require('../utils/etapaFinal')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
    (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

// ─────────────────────────────────────────────────────────────
// 1. isEtapaFinal (regra única, agora com expedição)
// ─────────────────────────────────────────────────────────────
verificar('final → true', isEtapaFinal('Revisão Final'), true)
verificar('revisão intermediaria → false', isEtapaFinal('Revisão Intermediaria'), false)
verificar('costura → false', isEtapaFinal('Costura'), true === false)
verificar('expedição → true', isEtapaFinal('Expedição'), true)
verificar('expedicao sem acento → true', isEtapaFinal('expedicao'), true)
verificar('acabamento → true', isEtapaFinal('Acabamento'), true)
verificar('qualidade → true', isEtapaFinal('Controle de Qualidade'), true)
verificar('vazio → false', isEtapaFinal(''), false)
verificar('null → false', isEtapaFinal(null), false)

// ─────────────────────────────────────────────────────────────
// 2. montarEtapasFinaisPorOp — exemplo do relatório do usuário:
//    Costura 100 → Revisão 95 → Acabamento 95 → Revisão Final 90
//    ⇒ produzida concluída = 90 (somente "Revisão Final")
// ─────────────────────────────────────────────────────────────
const opsExemplo = [
  {
    id_da_op: 1,
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Costura' } },        // não final
      { id_da_funcao: 20, etapa: { descricao: 'Revisão' } },        // final (regra), mas não é a última
      { id_da_funcao: 30, etapa: { descricao: 'Acabamento' } },     // final (regra), mas não é a última
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },  // última final → escolhida
    ],
  },
  {
    id_da_op: 2,
    etapas: [
      { id_da_funcao: 11, etapa: { descricao: 'Costura' } },
      { id_da_funcao: 21, etapa: { descricao: 'Revisão Intermediaria' } }, // excluída pela regra
    ],
  },
]

const semConfig = montarEtapasFinaisPorOp({ opsComEtapas: opsExemplo, pecaFinalConfigurada: null })
verificar('OP1 sem peca_final → só etapa 40 (Revisão Final)', [...(semConfig.get(1) || [])], [40])
verificar('OP2 sem etapa final → não entra no mapa', semConfig.has(2), false)

const comConfig = montarEtapasFinaisPorOp({
  opsComEtapas: opsExemplo,
  pecaFinalConfigurada: 'Acabamento',
})
verificar('OP1 com peca_final=Acabamento → só etapa 30', [...(comConfig.get(1) || [])], [30])

// ─────────────────────────────────────────────────────────────
// 3. removerProducoesDuplicadas
//    - duplicata de sincronização offline (mesma chave, ids diferentes)
//    - estornos (qtd < 0) nunca descartados
// ─────────────────────────────────────────────────────────────
const registros = [
  { id_da_producao: 1, id_funcionario: 'a@x.com', id_da_op: 1, id_da_funcao: 40, quantidade_pecas: 5, dataReferencia: new Date('2026-09-10'), data_inicio: new Date('2026-09-10'), hora_registro: '09:00', tipoRegistro: 'principal' },
  // duplicata offline: mesmíssima chave, id maior (reapontamento)
  { id_da_producao: 2, id_funcionario: 'a@x.com', id_da_op: 1, id_da_funcao: 40, quantidade_pecas: 5, dataReferencia: new Date('2026-09-10'), data_inicio: new Date('2026-09-10'), hora_registro: '09:00', tipoRegistro: 'principal' },
  // estorno: nunca descartar
  { id_da_producao: 3, id_funcionario: 'a@x.com', id_da_op: 1, id_da_funcao: 40, quantidade_pecas: -2, dataReferencia: new Date('2026-09-10'), data_inicio: new Date('2026-09-10'), hora_registro: '10:00', tipoRegistro: 'principal' },
  // registro legado sem dataReferencia/tipoRegistro (dedupe por data_inicio)
  { id_da_producao: 4, id_funcionario: 'b@x.com', id_da_op: 2, id_da_funcao: 40, quantidade_pecas: 3, dataReferencia: null, data_inicio: new Date('2026-09-11T03:00:00Z'), hora_registro: '09:30', tipoRegistro: null },
  { id_da_producao: 5, id_funcionario: 'b@x.com', id_da_op: 2, id_da_funcao: 40, quantidade_pecas: 3, dataReferencia: null, data_inicio: new Date('2026-09-11T03:00:00Z'), hora_registro: '09:30', tipoRegistro: null },
]

const { producoes: dedupe, removidos } = removerProducoesDuplicadas(registros)
verificar('duplicatas removidas', removidos, 2)
verificar('sobreviventes são os de maior id', dedupe.map(p => p.id_da_producao), [2, 3, 5])
verificar('estorno preservado', dedupe.some(p => p.id_da_producao === 3), true)

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`)
process.exit(falhas === 0 ? 0 : 1)
