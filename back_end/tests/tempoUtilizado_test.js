// TESTE: regra do MENOR tempo (Tempo Padrão × Tempo de Referência)
// Execute com: node tests/tempoUtilizado_test.js
//
// Cobre os 10 cenários exigidos para os Relatórios de Produção:
//   1. Tempo de Referência menor que o Tempo Padrão
//   2. Tempo de Referência maior que o Tempo Padrão
//   3. Tempos iguais
//   4. Tempo de Referência inexistente
//   5. Tempo Padrão inexistente
//   6. Ambos os tempos indisponíveis
//   7. Comparação com casas decimais
//   8. Produções de diferentes profissionais e OPs
//   9. Consistência entre PDF e JSON
//  10. Indicadores gerais e agrupamentos
//
// Roda sem banco: o cliente Prisma é substituído por um stub em memória
// (apenas leitura) para exercitar os dois endpoints do service.

const path = require('path')

// ─────────────────────────────────────────────────────────────
// Stub do Prisma (antes de carregar o service)
// ─────────────────────────────────────────────────────────────
const CNPJ = '12345678000199'
const DIA = (d, mes = 9) => new Date(Date.UTC(2026, mes - 1, d))

// Etapas: 10 Costura (padrão 0.80), 20 Acabamento (sem padrão),
//         30 Montagem (padrão 0.75), 40 Revisão (padrão 0.40)
const PRODUCOES = [
  // 1. Referência MENOR que o padrão: 0.60 < 0.80 → 0.60
  {
    id_da_producao: 1, id_funcionario: 'joao@x.com', id_da_op: 100, id_da_funcao: 10,
    quantidade_pecas: 100, tempo_produzido: 60, data_inicio: DIA(10), dataReferencia: DIA(10),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 10, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // 2. Referência MAIOR que o padrão: 0.90 > 0.80 → 0.80
  {
    id_da_producao: 2, id_funcionario: 'maria@x.com', id_da_op: 100, id_da_funcao: 10,
    quantidade_pecas: 50, tempo_produzido: 40, data_inicio: DIA(10), dataReferencia: DIA(10),
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: { email: 'maria@x.com', nome: 'Maria', foto: null },
    producao_etapa: { id_da_funcao: 10, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // 5. Sem Tempo Padrão válido (0): usa a referência 0.75
  {
    id_da_producao: 3, id_funcionario: 'joao@x.com', id_da_op: 200, id_da_funcao: 20,
    quantidade_pecas: 20, tempo_produzido: 30, data_inicio: DIA(11), dataReferencia: DIA(11),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 20, descricao: 'Acabamento', tempo_padrao: 0 },
    producao_peca: { id_da_op: 200, descricao: 'Calça', tempo_padrao: 0.75 },
  },
  // 4. Sem Tempo de Referência: usa o padrão 0.75
  {
    id_da_producao: 4, id_funcionario: 'pedro@x.com', id_da_op: 200, id_da_funcao: 30,
    quantidade_pecas: 10, tempo_produzido: 7.5, data_inicio: DIA(11), dataReferencia: DIA(11),
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: { email: 'pedro@x.com', nome: 'Pedro', foto: null },
    producao_etapa: { id_da_funcao: 30, descricao: 'Montagem', tempo_padrao: 0.75 },
    producao_peca: { id_da_op: 200, descricao: 'Calça', tempo_padrao: 0.75 },
  },
  // 6. Nenhum tempo disponível (sem padrão e sem referência) → 0 (não inventa)
  {
    id_da_producao: 5, id_funcionario: 'pedro@x.com', id_da_op: 200, id_da_funcao: 40,
    quantidade_pecas: 5, tempo_produzido: 10, data_inicio: DIA(12), dataReferencia: DIA(12),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'pedro@x.com', nome: 'Pedro', foto: null },
    producao_etapa: { id_da_funcao: 40, descricao: 'Revisão', tempo_padrao: 0 },
    producao_peca: { id_da_op: 200, descricao: 'Calça', tempo_padrao: 0 },
  },
  // 3. Tempos IGUAIS: 0.40 = 0.40 → 0.40
  {
    id_da_producao: 6, id_funcionario: 'ana@x.com', id_da_op: 100, id_da_funcao: 40,
    quantidade_pecas: 10, tempo_produzido: 4, data_inicio: DIA(12), dataReferencia: DIA(12),
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: { email: 'ana@x.com', nome: 'Ana', foto: null },
    producao_etapa: { id_da_funcao: 40, descricao: 'Revisão', tempo_padrao: 0.4 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.4 },
  },
]

const REFERENCIAS = [
  // João: etapa 10 na OP 100 → 0.60
  { id: 1, id_funcionario: 'joao@x.com', id_da_funcao: 10, tempo_minutos: 0.6, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: 100 },
  // João: etapa 20 (qualquer OP) → 0.75
  { id: 2, id_funcionario: 'joao@x.com', id_da_funcao: 20, tempo_minutos: 0.75, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: null },
  // Maria: etapa 10 → 0.90
  { id: 3, id_funcionario: 'maria@x.com', id_da_funcao: 10, tempo_minutos: 0.9, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: null },
  // Ana: etapa 40 → 0.40
  { id: 4, id_funcionario: 'ana@x.com', id_da_funcao: 40, tempo_minutos: 0.4, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: null },
]

const OPS = [
  {
    id_da_op: 100, descricao: 'Camiseta', quantidade_pecas: 500, tempo_padrao: 0.8,
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Costura' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
  {
    id_da_op: 200, descricao: 'Calça', quantidade_pecas: 300, tempo_padrao: 1,
    etapas: [
      { id_da_funcao: 20, etapa: { descricao: 'Acabamento' } },
      { id_da_funcao: 30, etapa: { descricao: 'Montagem' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão' } },
    ],
  },
]

const prismaStub = {
  estabelecimento: {
    findUnique: async () => ({ nome: 'Linha Tex Teste', peca_final: null, tempo_de_producao: 60 }),
  },
  producao: { findMany: async () => PRODUCOES },
  tempoReferencia: { findMany: async () => REFERENCIAS },
  metaDia: { findMany: async () => [] },
  usuarios: { count: async () => 3 },
  pecasOP: { findMany: async () => OPS },
}

const prismaPath = require.resolve('@prisma/client')
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  children: [],
  paths: [],
  exports: {
    PrismaClient: function PrismaClientStub() {
      return prismaStub
    },
  },
}

const {
  selecionarTempoUtilizado,
  resolverSAMPorProducao,
  analisarLancamentos,
  calcularEficiencia,
} = require('../utils/producaoCalculos')
const relatorioService = require('../Services/relatorioProducaoService')
const relatorioController = require('../Controllers/relatorioProducaoController')

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

async function main() {
  // ═══════════════════════════════════════════════════════════
  // 1. Referência MENOR que o padrão
  // ═══════════════════════════════════════════════════════════
  {
    const r = selecionarTempoUtilizado({ tempoPadrao: 0.8, tempoReferencia: 0.6 })
    verificar('1: tempo = referência (0.6)', r.tempo, 0.6)
    verificar('1: origem referencia_menor', r.origem, 'referencia_menor')
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Referência MAIOR que o padrão
  // ═══════════════════════════════════════════════════════════
  {
    const r = selecionarTempoUtilizado({ tempoPadrao: 0.5, tempoReferencia: 0.7 })
    verificar('2: tempo = padrão (0.5)', r.tempo, 0.5)
    verificar('2: origem padrao_menor', r.origem, 'padrao_menor')
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Tempos iguais
  // ═══════════════════════════════════════════════════════════
  {
    const r = selecionarTempoUtilizado({ tempoPadrao: 0.4, tempoReferencia: 0.4 })
    verificar('3: tempo = 0.4', r.tempo, 0.4)
    verificar('3: origem iguais', r.origem, 'iguais')
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Referência inexistente
  // ═══════════════════════════════════════════════════════════
  {
    for (const ref of [undefined, null, 0, '', NaN]) {
      const r = selecionarTempoUtilizado({ tempoPadrao: 0.75, tempoReferencia: ref })
      verificar(`4: sem referência (${String(ref)}) → padrão 0.75`, [r.tempo, r.origem], [0.75, 'somente_padrao'])
    }
    const sam = resolverSAMPorProducao({
      refs: [],
      funcionarioEmail: 'pedro@x.com',
      idOp: 200,
      dataProducao: '2026-09-11',
      tempoPadrao: 0.75,
      usarMenorTempo: true,
    })
    verificar('4: resolverSAM sem referência → padrão', [sam.tempo, sam.origem], [0.75, 'padrao_ficha'])
  }

  // ═══════════════════════════════════════════════════════════
  // 5. Tempo Padrão inexistente
  // ═══════════════════════════════════════════════════════════
  {
    for (const padrao of [undefined, null, 0, '']) {
      const r = selecionarTempoUtilizado({ tempoPadrao: padrao, tempoReferencia: 0.6 })
      verificar(`5: sem padrão (${String(padrao)}) → referência 0.6`, [r.tempo, r.origem], [0.6, 'somente_referencia'])
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. Ambos indisponíveis (nunca inventa valor)
  // ═══════════════════════════════════════════════════════════
  {
    const r = selecionarTempoUtilizado({ tempoPadrao: 0, tempoReferencia: null })
    verificar('6: tempo = 0', r.tempo, 0)
    verificar('6: origem indisponivel', r.origem, 'indisponivel')
    verificar('6: sem NaN', naoTemNaN(r), true)
    verificar('6: eficiência com tempo 0', calcularEficiencia({ producaoPonderada: 0, tempoTrabalhado: 10 }), 0)
  }

  // ═══════════════════════════════════════════════════════════
  // 7. Casas decimais (sem arredondar a comparação)
  // ═══════════════════════════════════════════════════════════
  {
    verificar('7: 0.79 < 0.80 → 0.79', selecionarTempoUtilizado({ tempoPadrao: 0.8, tempoReferencia: 0.79 }).tempo, 0.79)
    verificar('7: 0.8001 > 0.80 → 0.80', selecionarTempoUtilizado({ tempoPadrao: 0.8, tempoReferencia: 0.8001 }).tempo, 0.8)
    const r = selecionarTempoUtilizado({ tempoPadrao: 1.234, tempoReferencia: 1.2335 })
    verificar('7: 1.2335 < 1.234 → 1.2335', r.tempo, 1.2335)
    verificar('7: origem referencia_menor', r.origem, 'referencia_menor')
    // Comparação por string (regra do projeto) mantém iguais decimais exatos
    const iguais = selecionarTempoUtilizado({ tempoPadrao: '0.30', tempoReferencia: 0.3 })
    verificar('7: string "0.30" = 0.3', [iguais.tempo, iguais.origem], [0.3, 'iguais'])
  }

  // ═══════════════════════════════════════════════════════════
  // 8. Produções de profissionais e OPs diferentes (sem vazamento)
  // ═══════════════════════════════════════════════════════════
  {
    const consolidado = analisarLancamentos(PRODUCOES, {
      etapasReferenciaMap: new Map([
        [10, REFERENCIAS.filter(r => r.id_da_funcao === 10)],
        [20, REFERENCIAS.filter(r => r.id_da_funcao === 20)],
        [40, REFERENCIAS.filter(r => r.id_da_funcao === 40)],
      ]),
      opsMap: new Map(OPS.map(o => [o.id_da_op, o])),
      incluirDetalhes: true,
      usarMenorTempo: true,
    })

    const porId = id => consolidado.detalhes.find(d => d.id === id)
    verificar('8: João/OP100 → 0.60 (referência menor)', [porId(1).sam, porId(1).origemTempoUtilizado], [0.6, 'referencia_menor'])
    verificar('8: Maria/OP100 → 0.80 (padrão menor)', [porId(2).sam, porId(2).origemTempoUtilizado], [0.8, 'padrao_menor'])
    verificar('8: João/OP200 → 0.75 (só referência)', [porId(3).sam, porId(3).origemTempoUtilizado], [0.75, 'somente_referencia'])
    verificar('8: Pedro/OP200 → 0.75 (só padrão)', [porId(4).sam, porId(4).origemTempoUtilizado], [0.75, 'somente_padrao'])
    verificar('8: Pedro sem tempos → 0 (indisponível)', [porId(5).sam, porId(5).origemTempoUtilizado], [0, 'indisponivel'])
    verificar('8: Ana → 0.40 (iguais)', [porId(6).sam, porId(6).origemTempoUtilizado], [0.4, 'iguais'])
    verificar('8: referência da Maria não vaza para o João', porId(1).sam !== 0.9, true)
  }

  // ═══════════════════════════════════════════════════════════
  // 9 + 10. Endpoints reais (service): JSON × PDF e agrupamentos
  // ═══════════════════════════════════════════════════════════
  const params = { tipo: 'personalizado', dataInicial: '2026-09-01', dataFinal: '2026-09-30' }
  const json = await relatorioService.gerarRelatorioCompleto(CNPJ, params)
  const pdf = await relatorioService.gerarRelatorioProducao(CNPJ, params)

  {
    verificar('9: PDF gerado (Buffer)', Buffer.isBuffer(pdf.pdf) && pdf.pdf.length > 1000, true)
    verificar('9: PDF não vazio', pdf.vazio, false)

    // Mesmos números nos dois formatos (mesma consolidação).
    verificar('9: eficiência igual', pdf.dados.eficienciaGeral, json.resumo.eficiencia)
    verificar('9: Tempo Utilizado igual', pdf.dados.tempoReferenciaTotal, json.resumo.tempoReferencia)
    verificar('9: Tempo Ficha igual', pdf.dados.tempoFichaTotal, json.resumo.tempoFicha)
    verificar('9: tempo trabalhado igual', pdf.dados.tempoTrabalhadoTotal, json.resumo.tempoTrabalhado)
    verificar('9: produção registrada igual', pdf.dados.producaoRegistradaTotal, json.resumo.producaoRegistrada)
    verificar('9: produção concluída igual', pdf.dados.producaoTotal, json.resumo.producaoTotal)

    const diaPdf = d => pdf.dados.dias.find(x => x.data === d)
    for (const diaJson of json.porDia) {
      const d = diaPdf(diaJson.data)
      verificar(`9: dia ${diaJson.data} igual no PDF`, [d.eficiencia, d.producao, d.tempoReferencia], [diaJson.eficiencia, diaJson.producao, diaJson.tempoReferencia])
    }

    const opPdf = id => pdf.dados.ops.find(o => o.idOp === id)
    for (const opJson of json.porOP) {
      const o = opPdf(opJson.idOp)
      verificar(`9: OP ${opJson.idOp} igual no PDF`, [o.eficiencia, o.producao, o.producaoRegistrada], [opJson.eficiencia, opJson.producao, opJson.producaoRegistrada])
    }
  }

  {
    // Totais gerais (tempo trabalhado 151.5; utilizado 126.5; ficha 131.5)
    verificar('10: produção registrada (195)', json.resumo.producaoRegistrada, 195)
    verificar('10: tempo trabalhado (151.5)', json.resumo.tempoTrabalhado, 151.5)
    verificar('10: tempo utilizado (126.5)', json.resumo.tempoReferencia, 126.5)
    verificar('10: tempo ficha (131.5)', json.resumo.tempoFicha, 131.5)
    verificar('10: eficiência geral (83)', json.resumo.eficiencia, 83)
    verificar('10: regra exposta', json.resumo.regraTempoUtilizado, 'menor_tempo_valido')
    verificar('10: contagem das origens', json.resumo.origensTempoUtilizado, {
      referencia_menor: 1,
      padrao_menor: 1,
      iguais: 1,
      somente_referencia: 1,
      somente_padrao: 1,
      indisponivel: 1,
    })

    // Agrupamento por profissional
    const joao = json.porProfissional.find(p => p.email === 'joao@x.com')
    verificar('10: João produção (120)', joao.producao, 120)
    verificar('10: João tempo utilizado (75)', joao.tempoReferencia, 75)
    verificar('10: João tempo trabalhado (90)', joao.tempoTrabalhado, 90)
    verificar('10: João eficiência (83)', joao.eficiencia, 83)

    const maria = json.porProfissional.find(p => p.email === 'maria@x.com')
    verificar('10: Maria usou o padrão (0.80 × 50 = 40)', maria.tempoReferencia, 40)
    verificar('10: Maria eficiência (100)', maria.eficiencia, 100)

    // Agrupamento por OP
    const op100 = json.porOP.find(o => o.idOp === 100)
    const op200 = json.porOP.find(o => o.idOp === 200)
    verificar('10: OP100 tempo utilizado (104)', op100.tempoReferencia, 104)
    verificar('10: OP100 eficiência (100)', op100.eficiencia, 100)
    verificar('10: OP200 tempo utilizado (22.5)', op200.tempoReferencia, 22.5)
    // 22.5 × 100 ÷ 47.5 (inclui os 10 min do lançamento sem tempo aplicável) = 47
    verificar('10: OP200 eficiência (47)', op200.eficiencia, 47)
    verificar('10: soma das OPs = total', op100.tempoReferencia + op200.tempoReferencia, json.resumo.tempoReferencia)

    // Agrupamento por etapa
    const costura = json.porEtapa.find(e => e.idEtapa === 10)
    verificar('10: Costura produção (150)', costura.producao, 150)
    verificar('10: Costura tempo utilizado (100)', costura.tempoReferencia, 100)
    verificar('10: Costura tempo padrão (0.80)', costura.tempoPadrao, 0.8)
    verificar('10: Costura eficiência (100)', costura.eficiencia, 100)

    // Agrupamento por dia
    verificar('10: dias agrupados', json.porDia.map(d => d.data), ['2026-09-10', '2026-09-11', '2026-09-12'])
    const d10 = json.porDia.find(d => d.data === '2026-09-10')
    const d11 = json.porDia.find(d => d.data === '2026-09-11')
    const d12 = json.porDia.find(d => d.data === '2026-09-12')
    verificar('10: dia 10/09 eficiência (100)', d10.eficiencia, 100)
    verificar('10: dia 11/09 eficiência (60)', d11.eficiencia, 60)
    verificar('10: dia 12/09 eficiência (29)', d12.eficiencia, 29)
    verificar('10: soma dos dias = total', [d10.producao + d11.producao + d12.producao, d10.tempoReferencia + d11.tempoReferencia + d12.tempoReferencia], [json.resumo.producaoRegistrada, json.resumo.tempoReferencia])
    verificar('10: sem NaN/Infinity', naoTemNaN(json), true)
  }

  // ═══════════════════════════════════════════════════════════
  // Extra: filtros de período e segurança continuam iguais
  // ═══════════════════════════════════════════════════════════
  {
    const periodos = [
      [{ tipo: 'diario', dataInicial: '2026-09-10' }, ['2026-09-10', '2026-09-10']],
      [{ tipo: 'semanal', dataInicial: '2026-09-07', dataFinal: '2026-09-13' }, ['2026-09-07', '2026-09-13']],
      [{ tipo: 'quinzenal', mes: '9', ano: '2026', quinzena: '1' }, ['2026-09-01', '2026-09-15']],
      [{ tipo: 'mensal', mes: '9', ano: '2026' }, ['2026-09-01', '2026-09-30']],
      [{ tipo: 'personalizado', dataInicial: '2026-09-01', dataFinal: '2026-09-30' }, ['2026-09-01', '2026-09-30']],
    ]
    for (const [p, esperado] of periodos) {
      const periodo = relatorioService.resolverPeriodo(p)
      verificar(`PERÍODO ${p.tipo}`, [periodo.dataInicio, periodo.dataFim], esperado)
      verificar(`PERÍODO ${p.tipo} aceito pelo controller`, relatorioController.validarParametros(p).ok, true)
    }
    verificar('PERÍODO inválido rejeitado', relatorioController.validarParametros({ tipo: 'mensal' }).ok, false)

    // Filtro de período continua recortando o relatório
    const diario = await relatorioService.gerarRelatorioCompleto(CNPJ, { tipo: 'diario', dataInicial: '2026-09-10' })
    verificar('PERÍODO diário filtra (150 peças em 10/09)', diario.resumo.producaoRegistrada, 150)
    verificar('PERÍODO diário mantém tempo utilizado do dia (100)', diario.resumo.tempoReferencia, 100)
  }

  console.log(falhas === 0 ? '\n✅ TODOS OS TESTES PASSARAM' : `\n❌ ${falhas} TESTE(S) FALHARAM`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
