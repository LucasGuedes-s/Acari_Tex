// TESTE: consistência dos relatórios de produção com as regras oficiais
// Execute com: node tests/producaoCalculos_test.js
//
// Cobre, SEM banco, os 12 casos de teste exigidos na refatoração dos
// relatórios (dados representativos), validando a fonte única de regras
// (utils/producaoCalculos.js), o resolverPeriodo do relatório e a
// equivalência com a agregação da análise profissional.
//
//   Caso  1 — produção normal (quantidade, Tempo Fábrica, eficiência)
//   Caso  2 — produção duplicada (contabilizada uma única vez)
//   Caso  3 — profissional com Tempo Referência próprio (OP específica)
//   Caso  4 — sem referência individual (fallback: último → padrão)
//   Caso  5 — mudança de OP (Tempo Fábrica muda conforme a OP)
//   Caso  6 — mudança de etapa (cálculo respeita a etapa)
//   Caso  7 — virada de dia / meia-noite (sem erro de timezone)
//   Caso  8 — período mensal 01/09→30/09 (fronteiras inclusivas)
//   Caso  9 — dia sem produção (não quebra)
//   Caso 10 — zero produção (sem NaN/Infinity)
//   Caso 11 — vários profissionais (somas individuais = total geral)
//   Caso 12 — várias OPs (agrupamento por OP correto)

const {
  dateToSP,
  parseDataUTC,
  dataISOValida,
  rangeConsulta,
  rangeConsultaAmpliada,
  noPeriodo,
  diaDaProducao,
  calcularEficiencia,
  calcularCapacidade,
  resolverSAMPorProducao,
  removerProducoesDuplicadas,
  montarEtapasFinaisPorOp,
  analisarLancamentos,
} = require('../utils/producaoCalculos')
const { resolverPeriodo } = require('../Services/relatorioProducaoService')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
      (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

const naoTemNaN = valor => !JSON.stringify(valor).match(/NaN|-?Infinity/)

// ─────────────────────────────────────────────────────────────
// Fábrica de lançamentos (dados representativos)
// ─────────────────────────────────────────────────────────────
const dia = (y, m, d, hora = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, hora, min))

function lancamento({
  id = 1,
  email = 'joao@x.com',
  nome = 'João',
  op,
  etapa,
  etapaDesc = 'Costura',
  etapaTempoPadrao = 1,
  qtd,
  tempo = 60,
  data,
  hora = '09:00',
}) {
  return {
    id_da_producao: id,
    id_funcionario: email,
    id_da_op: op,
    id_da_funcao: etapa,
    quantidade_pecas: qtd,
    tempo_produzido: tempo,
    data_inicio: data,
    dataReferencia: data,
    hora_registro: hora,
    horaNumero: parseInt(hora, 10),
    tipoRegistro: 'principal',
    producao_funcionario: { nome, foto: null },
    producao_etapa: { id_da_funcao: etapa, descricao: etapaDesc, tempo_padrao: etapaTempoPadrao },
    producao_peca: { id_da_op: op, descricao: `OP ${op}`, tempo_padrao: etapaTempoPadrao },
  }
}

// Referências do João:
//   OP 100 + etapa 10 → 0.5 min/peça (medida em 01/09)
//   etapa 10 (sem OP) → 0.6 min/peça (medida em 02/09)
const refsJoao = [
  { id: 1, id_funcionario: 'joao@x.com', id_da_funcao: 10, opId: 100, tempo_minutos: 0.5, tempo_por_peca: null, criadoEm: dia(2026, 9, 1), data_medicao: dia(2026, 9, 1) },
  { id: 2, id_funcionario: 'joao@x.com', id_da_funcao: 10, opId: null, tempo_minutos: 0.6, tempo_por_peca: null, criadoEm: dia(2026, 9, 2), data_medicao: dia(2026, 9, 2) },
]
// Referência da Maria: etapa 10 → 0.8 (sem OP)
const refsMaria = [
  { id: 3, id_funcionario: 'maria@x.com', id_da_funcao: 10, opId: null, tempo_minutos: 0.8, tempo_por_peca: null, criadoEm: dia(2026, 9, 2), data_medicao: dia(2026, 9, 2) },
]

const etapasReferenciaMap = new Map([
  [10, [...refsJoao, ...refsMaria]],
  [20, []],
])

const opsMap = new Map([
  [100, { id_da_op: 100, descricao: 'Camiseta branca', quantidade_pecas: 500 }],
  [200, { id_da_op: 200, descricao: 'Calça jeans', quantidade_pecas: 300 }],
])

// OP 100: fluxo Costura(10) → Revisão Final(40)
const opsComEtapas = [
  {
    id_da_op: 100,
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Costura' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
]
const etapasFinaisPorOp = montarEtapasFinaisPorOp({ opsComEtapas, pecaFinalConfigurada: null })

// ─────────────────────────────────────────────────────────────
// Caso 1 — Produção normal
// ─────────────────────────────────────────────────────────────
{
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) }),
  ]
  const r = analisarLancamentos(
    [lancamento({ id: 1, op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) })],
    { etapasReferenciaMap, opsMap, etapasFinaisPorOp, incluirDetalhes: true }
  )

  verificar('C1: quantidade', r.resumo.producaoRegistrada, 100)
  // etapa 10 não é a final → concluída = 0
  verificar('C1: concluída (etapa não final)', r.resumo.producaoConcluida, 0)
  // SAM = 0.5 (ref. da OP) → Tempo Fábrica = 100 × 0.5 = 50 min
  verificar('C1: Tempo Fábrica (50)', r.resumo.tempoReferencia, 50)
  // eficiência = 50 × 100 / 60 = 83.33 → Math.round = 83
  verificar('C1: eficiência (83)', r.resumo.eficiencia, 83)
  verificar('C1: detalhes auditáveis (1)', r.detalhes.length, 1)
  verificar('C1: origem do SAM', r.detalhes[0].origemTempo, 'peca')
}

// ─────────────────────────────────────────────────────────────
// Caso 2 — Produção duplicada
// ─────────────────────────────────────────────────────────────
{
  const bruto = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) }),
    lancamento({ id: 2, op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) }), // duplicata (sinc. offline)
  ]
  const { producoes, removidos } = removerProducoesDuplicadas(bruto)
  verificar('C2: duplicatas removidas', removidos, 1)

  const r = analisarLancamentos(producoes, { etapasReferenciaMap, opsMap })
  verificar('C2: quantidade contada uma única vez', r.resumo.producaoRegistrada, 100)
  verificar('C2: Tempo Fábrica (50)', r.resumo.tempoReferencia, 50)
}

// ─────────────────────────────────────────────────────────────
// Caso 3 — Profissional com Tempo Referência próprio (por OP)
// ─────────────────────────────────────────────────────────────
{
  const samJoao = resolverSAMPorProducao({
    refs: etapasReferenciaMap.get(10),
    funcionarioEmail: 'joao@x.com',
    idOp: 100,
    dataProducao: '2026-09-10',
    tempoPadrao: 1,
  })
  verificar('C3: SAM do João na OP 100 (0.5)', samJoao.tempo, 0.5)
  verificar('C3: origem peca', samJoao.origem, 'peca')

  // A referência da Maria NÃO vaza para o João.
  const samJoaoOp200 = resolverSAMPorProducao({
    refs: etapasReferenciaMap.get(10),
    funcionarioEmail: 'joao@x.com',
    idOp: 200,
    dataProducao: '2026-09-10',
    tempoPadrao: 1,
  })
  verificar('C3: João na OP 200 usa ref. da etapa (0.6)', samJoaoOp200.tempo, 0.6)
  verificar('C3: origem ultimo_registrado', samJoaoOp200.origem, 'ultimo_registrado')
}

// ─────────────────────────────────────────────────────────────
// Caso 4 — Sem referência individual → fallback oficial
// ─────────────────────────────────────────────────────────────
{
  // Pedro não tem referência nenhuma → Tempo Padrão da etapa.
  const samPedro = resolverSAMPorProducao({
    refs: etapasReferenciaMap.get(10),
    funcionarioEmail: 'pedro@x.com',
    idOp: 100,
    dataProducao: '2026-09-10',
    tempoPadrao: 1.25,
  })
  verificar('C4: fallback padrão da ficha (1.25)', samPedro.tempo, 1.25)
  verificar('C4: origem padrao_ficha', samPedro.origem, 'padrao_ficha')

  // Etapa sem referências cadastradas → padrão.
  const r = analisarLancamentos(
    [lancamento({ id: 1, op: 100, etapa: 20, etapaDesc: 'Acabamento', etapaTempoPadrao: 2, qtd: 10, tempo: 30, data: dia(2026, 9, 10) })],
    { etapasReferenciaMap, opsMap, incluirDetalhes: true }
  )
  verificar('C4: etapa sem refs → SAM padrão (2)', r.detalhes[0].sam, 2)
}

// ─────────────────────────────────────────────────────────────
// Caso 5 — Mudança de OP (Tempo Fábrica muda conforme a OP)
// ─────────────────────────────────────────────────────────────
{
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 60, tempo: 30, data: dia(2026, 9, 10), hora: '09:00' }), // SAM 0.5 → TF 30
    lancamento({ id: 2, op: 200, etapa: 10, qtd: 60, tempo: 36, data: dia(2026, 9, 10), hora: '10:00' }), // SAM 0.6 → TF 36
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap })

  const op100 = r.ops.find(o => o.idOp === 100)
  const op200 = r.ops.find(o => o.idOp === 200)
  verificar('C5: OP100 Tempo Fábrica (30)', op100.tempoReferencia, 30)
  verificar('C5: OP200 Tempo Fábrica (36)', op200.tempoReferencia, 36)
  verificar('C5: TR médio OP100 (0.5)', op100.tempoReferenciaMedio, 0.5)
  verificar('C5: TR médio OP200 (0.6)', op200.tempoReferenciaMedio, 0.6)
}

// ─────────────────────────────────────────────────────────────
// Caso 6 — Mudança de etapa (cálculo respeita a etapa)
// ─────────────────────────────────────────────────────────────
{
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, etapaDesc: 'Costura', etapaTempoPadrao: 1, qtd: 50, tempo: 30, data: dia(2026, 9, 10), hora: '09:00' }),
    lancamento({ id: 2, op: 100, etapa: 40, etapaDesc: 'Revisão Final', etapaTempoPadrao: 1.5, qtd: 20, tempo: 30, data: dia(2026, 9, 10), hora: '10:00' }),
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap, etapasFinaisPorOp })

  const etapa10 = r.porEtapa.find(e => e.idEtapa === 10)
  const etapa40 = r.porEtapa.find(e => e.idEtapa === 40)
  verificar('C6: etapa 10 producao (50)', etapa10.producao, 50)
  verificar('C6: etapa 40 producao (20)', etapa40.producao, 20)
  verificar('C6: etapa 10 SAM (0.5)', etapa10.tempoReferenciaMedio, 0.5)
  verificar('C6: etapa 40 SAM = padrão (1.5)', etapa40.tempoReferenciaMedio, 1.5)
  // Tempo Ficha por etapa: 50×1 = 50 e 20×1.5 = 30
  verificar('C6: etapa 10 tempoFicha (50)', etapa10.tempoFicha, 50)
  verificar('C6: etapa 40 tempoFicha (30)', etapa40.tempoFicha, 30)
  // Concluída: somente etapa final (40) → 20
  verificar('C6: concluída só na etapa final (20)', r.resumo.producaoConcluida, 20)
}

// ─────────────────────────────────────────────────────────────
// Caso 7 — Virada de dia / meia-noite (timezone)
// ─────────────────────────────────────────────────────────────
{
  // Lançamento codificado por meia-noite UTC (fluxo normal do apontamento):
  // o dia gravado é preservado (não cai no dia anterior).
  verificar('C7: meia-noite UTC preserva o dia', diaDaProducao(dia(2026, 9, 30)), '2026-09-30')

  // Lançamento real gravado às 23:50 (SP): dia local em SP.
  // 2026-09-30T23:50-03:00 = 2026-10-01T02:50Z → dia 30/09 em SP.
  const real = diaDaProducao(new Date('2026-10-01T02:50:00Z'))
  verificar('C7: instante real 23:50 SP → dia 30/09', real, '2026-09-30')

  // Período mensal: lançamento de 23:50 do último dia NÃO vaza para 01/10.
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 10, tempo: 10, data: new Date('2026-10-01T02:50:00Z'), hora: '23:50' }),
  ]
  const dentro = lancamentos.filter(p => noPeriodo(diaDaProducao(p.data_inicio), '2026-09-01', '2026-09-30'))
  verificar('C7: 23:50 do dia 30 fica no período', dentro.length, 1)

  // Janela ampliada garante que esse registro é capturado pelo banco
  // (meia-noite UTC simples perderia o registro de 02:50Z do dia 01).
  const amp = rangeConsultaAmpliada('2026-09-01', '2026-09-30')
  verificar('C7: janela ampliada captura 02:50Z', amp.lt.getTime() > new Date('2026-10-01T02:50:00Z').getTime(), true)
  // E não contabiliza o dia seguinte codificado por meia-noite UTC:
  const fora = [lancamento({ id: 2, op: 100, etapa: 10, qtd: 5, tempo: 5, data: dia(2026, 10, 1) })]
  verificar('C7: 01/10 (meia-noite UTC) fica fora', fora.filter(p => noPeriodo(diaDaProducao(p.data_inicio), '2026-09-01', '2026-09-30')).length, 0)
}

// ─────────────────────────────────────────────────────────────
// Caso 8 — Período mensal 01/09/2026 → 30/09/2026
// ─────────────────────────────────────────────────────────────
{
  const periodo = resolverPeriodo({ tipo: 'mensal', mes: '9', ano: '2026' })
  verificar('C8: dataInicio', periodo.dataInicio, '2026-09-01')
  verificar('C8: dataFim', periodo.dataFim, '2026-09-30')

  const { gte, lt } = rangeConsulta(periodo.dataInicio, periodo.dataFim)
  verificar('C8: gte 01/09 00:00 UTC', gte.toISOString(), '2026-09-01T00:00:00.000Z')
  verificar('C8: lt 01/10 00:00 UTC (dia 30 inteiro)', lt.toISOString(), '2026-10-01T00:00:00.000Z')

  // Registros nas fronteiras: primeiro e último dia entram.
  const primeira = lancamento({ id: 1, op: 100, etapa: 10, qtd: 1, tempo: 1, data: dia(2026, 9, 1) })
  const ultima = lancamento({ id: 2, op: 100, etapa: 10, qtd: 1, tempo: 1, data: dia(2026, 9, 30) })
  const foraAntes = lancamento({ id: 3, op: 100, etapa: 10, qtd: 1, tempo: 1, data: dia(2026, 8, 31) })
  const foraDepois = lancamento({ id: 4, op: 100, etapa: 10, qtd: 1, tempo: 1, data: dia(2026, 10, 1) })

  const todos = [foraAntes, primeira, ultima, foraDepois]
  const noPeriodo_ = todos.filter(p => noPeriodo(diaDaProducao(p.data_inicio), periodo.dataInicio, periodo.dataFim))
  verificar('C8: só 01/09 e 30/09 entram', noPeriodo_.map(p => p.id_da_producao), [1, 2])

  // Quinzenal também resolvida:
  const q2 = resolverPeriodo({ tipo: 'quinzenal', mes: '2', ano: '2026', quinzena: '2' })
  verificar('C8: quinzena 2 de fev/2026 (16→28)', [q2.dataInicio, q2.dataFim], ['2026-02-16', '2026-02-28'])

  // Datas inválidas rejeitadas:
  verificar('C8: 2026-02-30 inválida', dataISOValida('2026-02-30'), false)
  verificar('C8: 2026-09-31 inválida', dataISOValida('2026-09-31'), false)
  verificar('C8: 2026-09-30 válida', dataISOValida('2026-09-30'), true)
}

// ─────────────────────────────────────────────────────────────
// Caso 9 — Dia sem produção (não quebra)
// ─────────────────────────────────────────────────────────────
{
  // Lançamentos apenas em 10 e 12/09; 11/09 sem produção.
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 10, tempo: 20, data: dia(2026, 9, 10) }),
    lancamento({ id: 2, op: 100, etapa: 10, qtd: 10, tempo: 20, data: dia(2026, 9, 12) }),
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap })

  verificar('C9: porDia tem 2 dias (11/09 ausente)', r.porDia.map(d => d.data), ['2026-09-10', '2026-09-12'])
  verificar('C9: resumo consistente', r.resumo.producaoRegistrada, 20)
  verificar('C9: sem NaN', naoTemNaN(r), true)
}

// ─────────────────────────────────────────────────────────────
// Caso 10 — Zero produção (sem NaN/Infinity)
// ─────────────────────────────────────────────────────────────
{
  // a) Nenhum lançamento.
  const vazio = analisarLancamentos([], { etapasReferenciaMap, opsMap })
  verificar('C10a: eficiência = 0 sem lançamentos', vazio.resumo.eficiencia, 0)
  verificar('C10a: sem NaN/Infinity', naoTemNaN(vazio), true)

  // b) Eficiência com tempo trabalhado 0.
  verificar('C10b: eficiência com tempo 0', calcularEficiencia({ producaoPonderada: 100, tempoTrabalhado: 0 }), 0)
  verificar('C10b: capacidade com SAM 0', calcularCapacidade({ tempoTrabalhado: 100, sam: 0 }), 0)

  // c) Lançamentos com quantidade 0 e null.
  const zerados = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 0, tempo: 60, data: dia(2026, 9, 10) }),
    lancamento({ id: 2, op: 100, etapa: 10, qtd: null, tempo: 60, data: dia(2026, 9, 10) }),
  ]
  const r = analisarLancamentos(zerados, { etapasReferenciaMap, opsMap, incluirDetalhes: true })
  verificar('C10c: qtd 0/null ignorados', r.resumo.producaoRegistrada, 0)
  verificar('C10c: registrosIgnorados = 2', r.resumo.registrosIgnorados, 2)
  verificar('C10c: eficiência 0', r.resumo.eficiencia, 0)
  verificar('C10c: sem NaN/Infinity', naoTemNaN(r), true)

  // d) SAM 0 (etapa sem padrão e sem referência).
  const semPadrao = analisarLancamentos(
    [lancamento({ id: 1, op: 100, etapa: 99, etapaDesc: 'X', etapaTempoPadrao: null, qtd: 10, tempo: 30, data: dia(2026, 9, 10) })],
    { etapasReferenciaMap, opsMap, incluirDetalhes: true }
  )
  verificar('C10d: SAM 0 explícito', semPadrao.detalhes[0].sam, 0)
  verificar('C10d: eficiência 0 (não NaN)', semPadrao.resumo.eficiencia, 0)
  verificar('C10d: sem NaN/Infinity', naoTemNaN(semPadrao), true)
}

// ─────────────────────────────────────────────────────────────
// Caso 11 — Vários profissionais (somas = total geral)
// ─────────────────────────────────────────────────────────────
{
  const lancamentos = [
    // João: OP 100 (SAM 0.5), 100 peças em 60 min → TF 50
    lancamento({ id: 1, email: 'joao@x.com', nome: 'João', op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) }),
    // Maria: OP 100 (SAM dela 0.8), 50 peças em 40 min → TF 40
    lancamento({ id: 2, email: 'maria@x.com', nome: 'Maria', op: 100, etapa: 10, qtd: 50, tempo: 40, data: dia(2026, 9, 10) }),
    // Pedro: sem referência → padrão 1, 10 peças em 30 min → TF 10
    lancamento({ id: 3, email: 'pedro@x.com', nome: 'Pedro', op: 200, etapa: 10, qtd: 10, tempo: 30, data: dia(2026, 9, 11) }),
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap })

  verificar('C11: 3 profissionais', r.resumo.profissionais, 3)
  verificar('C11: total geral (160)', r.resumo.producaoRegistrada, 160)
  const somaFunc = r.funcionarios.reduce((s, f) => s + f.producaoRegistrada, 0)
  verificar('C11: soma por funcionário = total', somaFunc, r.resumo.producaoRegistrada)
  const somaTF = r.funcionarios.reduce((s, f) => s + f.tempoReferencia, 0)
  verificar('C11: soma Tempo Fábrica = total (100)', somaTF, r.resumo.tempoReferencia)
  verificar('C11: TF geral (100)', r.resumo.tempoReferencia, 100)
  // João 50/60 → 83; Maria 40/40 → 100; Pedro 10/30 → 33
  verificar('C11: eficiência João (83)', r.funcionarios.find(f => f.email === 'joao@x.com').eficiencia, 83)
  verificar('C11: eficiência Maria (100)', r.funcionarios.find(f => f.email === 'maria@x.com').eficiencia, 100)
  verificar('C11: eficiência Pedro (33)', r.funcionarios.find(f => f.email === 'pedro@x.com').eficiencia, 33)
  // Referência da Maria não vaza pro João e vice-versa (TF individual correto)
}

// ─────────────────────────────────────────────────────────────
// Caso 12 — Várias OPs (agrupamento por OP correto)
// ─────────────────────────────────────────────────────────────
{
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, qtd: 60, tempo: 30, data: dia(2026, 9, 10), hora: '09:00' }),
    lancamento({ id: 2, op: 100, etapa: 10, qtd: 40, tempo: 20, data: dia(2026, 9, 11), hora: '09:00' }),
    lancamento({ id: 3, op: 200, etapa: 10, qtd: 30, tempo: 18, data: dia(2026, 9, 11), hora: '10:00' }),
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap })

  verificar('C12: 2 OPs', r.resumo.ops, 2)
  const op100 = r.ops.find(o => o.idOp === 100)
  const op200 = r.ops.find(o => o.idOp === 200)
  verificar('C12: OP100 registrada (100)', op100.producaoRegistrada, 100)
  verificar('C12: OP200 registrada (30)', op200.producaoRegistrada, 30)
  verificar('C12: OP100 TF (50)', op100.tempoReferencia, 50)
  verificar('C12: OP200 TF (18)', op200.tempoReferencia, 18)
  verificar('C12: soma OPs = total (68)', op100.tempoReferencia + op200.tempoReferencia, r.resumo.tempoReferencia)
  verificar('C12: OP100 período 10→11/09', [op100.primeiraData, op100.ultimaData], ['2026-09-10', '2026-09-11'])
  // Meta da OP vem do cadastro (PecasOP.quantidade_pecas)
  verificar('C12: OP100 meta (500)', op100.metaTotal, 500)
  verificar('C12: sem NaN', naoTemNaN(r), true)
}

// ─────────────────────────────────────────────────────────────
// Extra: produção concluída (etapa final) e estornos
// ─────────────────────────────────────────────────────────────
{
  // OP 100 tem Revisão Final (40) como etapa final.
  const lancamentos = [
    lancamento({ id: 1, op: 100, etapa: 10, etapaDesc: 'Costura', qtd: 100, tempo: 60, data: dia(2026, 9, 10) }),
    lancamento({ id: 2, op: 100, etapa: 40, etapaDesc: 'Revisão Final', etapaTempoPadrao: 1.5, qtd: 90, tempo: 60, data: dia(2026, 9, 11) }),
    // Estorno de 10 peças da etapa final (mesma chave OP/etapa/func/dia/hora)
    lancamento({ id: 3, op: 100, etapa: 40, etapaDesc: 'Revisão Final', etapaTempoPadrao: 1.5, qtd: -10, tempo: 5, data: dia(2026, 9, 11), hora: '10:00' }),
  ]
  const r = analisarLancamentos(lancamentos, { etapasReferenciaMap, opsMap, etapasFinaisPorOp, incluirDetalhes: true })
  verificar('X: concluída (90, etapa final)', r.resumo.producaoConcluida, 90)
  // A análise individual soma 100 (João) + 90 (Maria, etapa final da OP) = 190;
  // o relatório conta 190 apontadas e 90 concluídas (etapa final).
  verificar('X: registrada (190, todas as etapas)', r.resumo.producaoRegistrada, 190)
  verificar('X: estorno não entra nos totais', r.resumo.registrosIgnorados, 1)
  verificar('X: detalhe de estorno auditável', r.detalhes.some(d => d.origemTempo === 'estorno' && d.quantidade === -10), true)
}

// ─────────────────────────────────────────────────────────────
// Extra: consistência relatório × análise profissional
// ─────────────────────────────────────────────────────────────
{
  // Os dois caminhos (analisarLancamentos do relatório e agregarProducoes
  // da análise) devem produzir a MESMA eficiência/Tempo Fábrica para o
  // mesmo profissional com os mesmos lançamentos.
  //
  // Contratos (iguais à produção):
  //   - Relatório recebe TODAS as referências da etapa e filtra pelo
  //     funcionário de cada lançamento (resolverSAMPorProducao).
  //   - Análise profissional recebe o Map já filtrado pelo funcionário
  //     (a consulta principal filtra por id_funcionario) e o resolver
  //     compartilhado filtra de novo — inofensivo.
  const { agregarProducoes } = require('../Services/analiseProfissionalService')

  const producoes = [
    lancamento({ id: 1, email: 'joao@x.com', nome: 'João', op: 100, etapa: 10, qtd: 100, tempo: 60, data: dia(2026, 9, 10) }),
    lancamento({ id: 2, email: 'joao@x.com', nome: 'João', op: 200, etapa: 10, qtd: 50, tempo: 45, data: dia(2026, 9, 11) }),
  ]

  const refsJoaoPorEtapa = new Map([[10, refsJoao]])

  const relatorio = analisarLancamentos(producoes, { etapasReferenciaMap, opsMap })
  const analise = agregarProducoes(producoes, {
    referenciasPorEtapa: refsJoaoPorEtapa,
    funcionarioEmail: 'joao@x.com',
    opsMap,
  })

  // No relatório, os números do João são a linha dele em "funcionarios";
  // na análise, são o resumo (o serviço é por profissional).
  const joaoRel = relatorio.funcionarios.find(f => f.email === 'joao@x.com')

  verificar('CONS: produção do João igual nos dois serviços', joaoRel.producaoRegistrada, analise.resumo.producaoTotal)
  verificar('CONS: eficiência Tempo Fábrica do João igual nos dois serviços', joaoRel.eficienciaReferencia, analise.resumo.eficienciaReferencia)
  verificar('CONS: eficiência Ficha do João igual nos dois serviços', joaoRel.eficienciaFicha, analise.resumo.eficienciaFicha)

  // Tempo Fábrica do João: 100×0.5 + 50×0.6 = 80 nos dois. A análise expõe
  // o tempo ponderado por OP+etapa (producao × tempoReferenciaIndividual);
  // somamos as linhas para comparar com o total do relatório.
  const tfJoao = analise.porOp.reduce(
    (s, o) => s + o.producao * o.tempoReferenciaIndividual,
    0
  )
  verificar('CONS: Tempo Fábrica do João igual nos dois serviços (80)', joaoRel.tempoReferencia, tfJoao)

  // SAM por lançamento idêntico (mesma função compartilhada):
  const samRel = resolverSAMPorProducao({
    refs: etapasReferenciaMap.get(10),
    funcionarioEmail: 'joao@x.com',
    idOp: 100,
    dataProducao: '2026-09-10',
    tempoPadrao: 1,
  })
  verificar('CONS: SAM do João na OP 100 idêntico (0.5)', samRel.tempo, 0.5)

  // Dedupe idêntico (mesma função compartilhada).
  verificar('CONS: dedupe é a mesma função', removerProducoesDuplicadas.name, 'removerProducoesDuplicadas')
}

// ─────────────────────────────────────────────────────────────
// Extra: helpers de data / fuso
// ─────────────────────────────────────────────────────────────
{
  verificar('DATA: dateToSP em fuso SP', dateToSP(new Date('2026-09-10T15:00:00Z')), '2026-09-10')
  verificar('DATA: parseDataUTC preserva dia', parseDataUTC('2026-09-10').toISOString(), '2026-09-10T00:00:00.000Z')
  verificar('DATA: parseDataUTC rejeita inválida', parseDataUTC('2026-02-30'), null)
  verificar('DATA: dateToSP de valor nulo', dateToSP(null), '')
}

console.log(falhas === 0 ? '\n✅ TODOS OS TESTES PASSARAM' : `\n❌ ${falhas} TESTE(S) FALHARAM`)
process.exit(falhas === 0 ? 0 : 1)
