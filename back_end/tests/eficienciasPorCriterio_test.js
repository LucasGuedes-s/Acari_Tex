// TESTE: os TRÊS critérios de eficiência + Eficiência Geral
// Execute com: node tests/eficienciasPorCriterio_test.js
//
// Cobre as seções 8, 9, 10 e 11 do pedido:
//   • Eficiência — Tempo Padrão   (só Tempo Padrão)
//   • Eficiência — Tempo Referência (só Tempo de Referência válido)
//   • Eficiência — Tempo Aplicado (menor tempo válido entre os dois)
//   • Eficiência Geral (consolidado por TOTAIS, nunca média de percentuais)
//
// Cobre também: agrupamentos por profissional, OP, etapa e dia; PDF × JSON;
// lançamento sem referência (não substituído pelo padrão); decimais;
// denominador zero (sem NaN).
//
// Roda sem banco: o cliente Prisma é substituído por um stub em memória.

const CNPJ = '12345678000199'
const DIA = new Date(Date.UTC(2026, 8, 10))

// ─────────────────────────────────────────────────────────────
// Cenário base (exemplo do pedido, com tempos trabalhados distintos)
//   Costura:    100 pçs | padrão 0,80 | referência 0,60 | 60 min
//   Acabamento: 100 pçs | padrão 0,50 | referência 0,70 | 30 min
//   Montagem:    40 pçs | padrão 0,75 | SEM referência  | 24 min
// ─────────────────────────────────────────────────────────────
const PRODUCOES = [
  {
    id_da_producao: 1, id_funcionario: 'joao@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 100, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 10, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 300, descricao: 'Conjunto', tempo_padrao: 0.8 },
  },
  {
    id_da_producao: 2, id_funcionario: 'joao@x.com', id_da_op: 300, id_da_funcao: 20,
    quantidade_pecas: 100, tempo_produzido: 30, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '13:00', horaNumero: 13, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 20, descricao: 'Acabamento', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Conjunto', tempo_padrao: 0.5 },
  },
  {
    id_da_producao: 3, id_funcionario: 'pedro@x.com', id_da_op: 300, id_da_funcao: 30,
    quantidade_pecas: 40, tempo_produzido: 24, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '14:00', horaNumero: 14, tipoRegistro: 'principal',
    producao_funcionario: { email: 'pedro@x.com', nome: 'Pedro', foto: null },
    producao_etapa: { id_da_funcao: 30, descricao: 'Montagem', tempo_padrao: 0.75 },
    producao_peca: { id_da_op: 300, descricao: 'Conjunto', tempo_padrao: 0.75 },
  },
]

// Pedro não tem referência na etapa 30 (cenário de ausência).
const REFERENCIAS = [
  { id: 1, id_funcionario: 'joao@x.com', id_da_funcao: 10, tempo_minutos: 0.6, tempo_por_peca: null, criadoEm: DIA, data_medicao: DIA, opId: null },
  { id: 2, id_funcionario: 'joao@x.com', id_da_funcao: 20, tempo_minutos: 0.7, tempo_por_peca: null, criadoEm: DIA, data_medicao: DIA, opId: null },
]

const OPS = [
  {
    id_da_op: 300, descricao: 'Conjunto', quantidade_pecas: 500, tempo_padrao: 0.8,
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Costura' } },
      { id_da_funcao: 20, etapa: { descricao: 'Acabamento' } },
      { id_da_funcao: 30, etapa: { descricao: 'Montagem' } },
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
  usuarios: { count: async () => 2 },
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
  montarEficienciasPorCriterio,
  calcularEficiencia,
  selecionarTempoUtilizado,
  analisarLancamentos,
} = require('../utils/producaoCalculos')
const relatorioService = require('../Services/relatorioProducaoService')

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
  // Fórmula oficial preservada + independência dos critérios
  // ═══════════════════════════════════════════════════════════
  {
    verificar(
      'fórmula oficial: 100 pçs × 0,60 × 100 ÷ 60 min = 100%',
      calcularEficiencia({ producaoPonderada: 100 * 0.6, tempoTrabalhado: 60 }),
      100
    )
    const r = montarEficienciasPorCriterio({
      tempoPadrao: 100 * 0.8,
      tempoReferencia: 100 * 0.6,
      tempoAplicado: 100 * 0.6,
      tempoTrabalhado: 60,
    })
    verificar('critérios independentes (padrão 133 / ref 100 / aplicado 100)', r, {
      eficienciaTempoPadrao: 133,
      eficienciaTempoReferencia: 100,
      eficienciaTempoAplicado: 100,
      eficienciaGeral: 100,
    })

    // Caso em que o aplicado é o PADRÃO: referência não deve vazar para o
    // critério de referência nem o padrão para o critério de referência.
    const r2 = montarEficienciasPorCriterio({
      tempoPadrao: 100 * 0.5,
      tempoReferencia: 100 * 0.7,
      tempoAplicado: 100 * 0.5,
      tempoTrabalhado: 30,
    })
    verificar('aplicado usa o padrão (167) e ref segue a referência (233)', r2, {
      eficienciaTempoPadrao: 167,
      eficienciaTempoReferencia: 233,
      eficienciaTempoAplicado: 167,
      eficienciaGeral: 167,
    })

    verificar(
      'sem referência válida: critério referência = 0 (não herda o padrão)',
      montarEficienciasPorCriterio({
        tempoPadrao: 40 * 0.75,
        tempoReferencia: 0,
        tempoAplicado: 40 * 0.75,
        tempoTrabalhado: 24,
      }),
      {
        eficienciaTempoPadrao: 125,
        eficienciaTempoReferencia: 0,
        eficienciaTempoAplicado: 125,
        eficienciaGeral: 125,
      }
    )

    verificar(
      'tempo trabalhado 0 → 0 (sem NaN/Infinity)',
      montarEficienciasPorCriterio({ tempoPadrao: 10, tempoReferencia: 5, tempoAplicado: 5, tempoTrabalhado: 0 }),
      {
        eficienciaTempoPadrao: 0,
        eficienciaTempoReferencia: 0,
        eficienciaTempoAplicado: 0,
        eficienciaGeral: 0,
      }
    )
  }

  // ═══════════════════════════════════════════════════════════
  // Consolidação por lançamento (mesma fonte usada pelos relatórios)
  // ═══════════════════════════════════════════════════════════
  {
    const consolidado = analisarLancamentos(PRODUCOES, {
      etapasReferenciaMap: new Map([
        [10, REFERENCIAS.filter(r => r.id_da_funcao === 10)],
        [20, REFERENCIAS.filter(r => r.id_da_funcao === 20)],
        [30, REFERENCIAS.filter(r => r.id_da_funcao === 30)],
      ]),
      opsMap: new Map(OPS.map(o => [o.id_da_op, o])),
      incluirDetalhes: true,
      usarMenorTempo: true,
    })

    const porId = id => consolidado.detalhes.find(d => d.id === id)

    verificar('lançamento Costura: tempo aplicado 0,60', porId(1).tempoUtilizadoUnitario, 0.6)
    verificar('lançamento Acabamento: tempo aplicado 0,50 (padrão)', porId(2).tempoUtilizadoUnitario, 0.5)
    verificar('lançamento Acabamento: referência preservada 0,70', porId(2).tempoReferenciaUnitario, 0.7)
    verificar('lançamento Montagem: sem referência (0)', porId(3).tempoReferenciaUnitario, 0)

    // Totais por critério (nunca somando percentuais)
    // Costura 80 + Acabamento 50 + Montagem 30 = 160
    verificar('total tempo padrão (160)', consolidado.resumo.tempoFicha, 160)
    verificar('total tempo referência válido (130)', consolidado.resumo.tempoReferenciaPuro, 130)
    verificar('total tempo aplicado (140)', consolidado.resumo.tempoReferencia, 140)

    verificar('etapa Costura: 3 critérios', {
      padrao: consolidado.porEtapa.find(e => e.idEtapa === 10).eficienciaTempoPadrao,
      ref: consolidado.porEtapa.find(e => e.idEtapa === 10).eficienciaTempoReferencia,
      aplicado: consolidado.porEtapa.find(e => e.idEtapa === 10).eficienciaTempoAplicado,
    }, { padrao: 133, ref: 100, aplicado: 100 })

    verificar('etapa Acabamento: 3 critérios', {
      padrao: consolidado.porEtapa.find(e => e.idEtapa === 20).eficienciaTempoPadrao,
      ref: consolidado.porEtapa.find(e => e.idEtapa === 20).eficienciaTempoReferencia,
      aplicado: consolidado.porEtapa.find(e => e.idEtapa === 20).eficienciaTempoAplicado,
    }, { padrao: 167, ref: 233, aplicado: 167 })
  }

  // ═══════════════════════════════════════════════════════════
  // Endpoints: JSON × PDF, agregados e indicador geral
  // ═══════════════════════════════════════════════════════════
  const params = { tipo: 'personalizado', dataInicial: '2026-09-01', dataFinal: '2026-09-30' }
  const json = await relatorioService.gerarRelatorioCompleto(CNPJ, params)
  const pdf = await relatorioService.gerarRelatorioProducao(CNPJ, params)

  {
    // Totais: 114 min trabalhados; padrão 160; referência válida 130; aplicado 140.
    verificar('resumo — Eficiência Tempo Padrão (140)', json.resumo.eficienciaTempoPadrao, 140)
    verificar('resumo — Eficiência Tempo Referência (114)', json.resumo.eficienciaTempoReferencia, 114)
    verificar('resumo — Eficiência Tempo Aplicado (123)', json.resumo.eficienciaTempoAplicado, 123)
    verificar('resumo — Eficiência Geral = aplicado (123)', json.resumo.eficienciaGeral, 123)
    verificar(
      'geral NÃO é média das etapas (média do padrão seria 150)',
      json.resumo.eficienciaTempoPadrao !== 150,
      true
    )

    // João: Costura (60 min) + Acabamento (30 min) = 90 min
    const joao = json.porProfissional.find(p => p.email === 'joao@x.com')
    verificar('João — Tempo Padrão (144)', joao.eficienciaTempoPadrao, 144)
    verificar('João — Tempo Referência (144)', joao.eficienciaTempoReferencia, 144)
    verificar('João — Tempo Aplicado (122)', joao.eficienciaTempoAplicado, 122)
    verificar('João — Eficiência Geral (122)', joao.eficienciaGeral, 122)
    verificar('João — tempo trabalhado (90)', joao.tempoTrabalhado, 90)
    verificar('João — tempo padrão (130)', joao.tempoFicha, 130)
    verificar('João — tempo referência válido (130)', joao.tempoReferenciaPuro, 130)
    verificar('João — tempo aplicado (110)', joao.tempoReferencia, 110)

    // Etapas do João calculadas separadamente (não é média)
    const etapasJoao = Object.fromEntries(joao.porEtapa.map(e => [e.etapa, e]))
    verificar('João/Costura: 3 critérios', {
      padrao: etapasJoao.Costura.eficienciaTempoPadrao,
      ref: etapasJoao.Costura.eficienciaTempoReferencia,
      aplicado: etapasJoao.Costura.eficienciaTempoAplicado,
    }, { padrao: 133, ref: 100, aplicado: 100 })
    verificar('João/Acabamento: 3 critérios', {
      padrao: etapasJoao.Acabamento.eficienciaTempoPadrao,
      ref: etapasJoao.Acabamento.eficienciaTempoReferencia,
      aplicado: etapasJoao.Acabamento.eficienciaTempoAplicado,
    }, { padrao: 167, ref: 233, aplicado: 167 })

    // Pedro: sem referência — critério de referência fica em 0.
    const pedro = json.porProfissional.find(p => p.email === 'pedro@x.com')
    verificar('Pedro — Tempo Padrão (125)', pedro.eficienciaTempoPadrao, 125)
    verificar('Pedro — Tempo Referência (0, sem referência)', pedro.eficienciaTempoReferencia, 0)
    verificar('Pedro — Tempo Aplicado (125)', pedro.eficienciaTempoAplicado, 125)
    verificar('Pedro — Eficiência Geral (125)', pedro.eficienciaGeral, 125)

    // Agrupamentos por OP, etapa e dia também separam os critérios.
    verificar('OP 300: 3 critérios', {
      padrao: json.porOP[0].eficienciaTempoPadrao,
      ref: json.porOP[0].eficienciaTempoReferencia,
      aplicado: json.porOP[0].eficienciaTempoAplicado,
      geral: json.porOP[0].eficienciaGeral,
    }, { padrao: 140, ref: 114, aplicado: 123, geral: 123 })

    verificar('dia 10/09: 3 critérios', {
      padrao: json.porDia[0].eficienciaTempoPadrao,
      ref: json.porDia[0].eficienciaTempoReferencia,
      aplicado: json.porDia[0].eficienciaTempoAplicado,
    }, { padrao: 140, ref: 114, aplicado: 123 })

    const montagem = json.porEtapa.find(e => e.idEtapa === 30)
    verificar('etapa Montagem (sem referência): ref 0', {
      padrao: montagem.eficienciaTempoPadrao,
      ref: montagem.eficienciaTempoReferencia,
      aplicado: montagem.eficienciaTempoAplicado,
    }, { padrao: 125, ref: 0, aplicado: 125 })

    // Soma das produções dos profissionais = produção registrada (sem duplicar)
    verificar(
      'produção não é contada duas vezes',
      json.porProfissional.reduce((s, p) => s + p.producao, 0),
      json.resumo.producaoRegistrada
    )
    verificar('sem NaN/Infinity no JSON', naoTemNaN(json), true)
  }

  {
    // PDF × JSON: mesmos números nos mesmos critérios
    verificar('PDF gerado', Buffer.isBuffer(pdf.pdf) && pdf.pdf.length > 1000, true)
    verificar('PDF — Tempo Padrão = JSON', pdf.dados.eficienciaGeralTempoPadrao, json.resumo.eficienciaTempoPadrao)
    verificar('PDF — Tempo Referência = JSON', pdf.dados.eficienciaGeralTempoReferencia, json.resumo.eficienciaTempoReferencia)
    verificar('PDF — Tempo Aplicado = JSON', pdf.dados.eficienciaGeralTempoAplicado, json.resumo.eficienciaTempoAplicado)
    verificar('PDF — Geral = JSON', pdf.dados.eficienciaGeral, json.resumo.eficienciaGeral)

    const funcPdf = email => pdf.dados.rankingFuncionarios.find(f => f.email === email)
    verificar('PDF ranking João: 4 indicadores', {
      padrao: funcPdf('joao@x.com').eficienciaTempoPadrao,
      ref: funcPdf('joao@x.com').eficienciaTempoReferencia,
      aplicado: funcPdf('joao@x.com').eficienciaTempoAplicado,
      geral: funcPdf('joao@x.com').eficienciaGeral,
    }, { padrao: 144, ref: 144, aplicado: 122, geral: 122 })

    verificar('PDF dia: 3 critérios = JSON', {
      padrao: pdf.dados.dias[0].eficienciaTempoPadrao,
      ref: pdf.dados.dias[0].eficienciaTempoReferencia,
      aplicado: pdf.dados.dias[0].eficienciaTempoAplicado,
    }, {
      padrao: json.porDia[0].eficienciaTempoPadrao,
      ref: json.porDia[0].eficienciaTempoReferencia,
      aplicado: json.porDia[0].eficienciaTempoAplicado,
    })

    verificar('PDF OP: 3 critérios = JSON', {
      padrao: pdf.dados.ops[0].eficienciaTempoPadrao,
      ref: pdf.dados.ops[0].eficienciaTempoReferencia,
      aplicado: pdf.dados.ops[0].eficienciaTempoAplicado,
    }, {
      padrao: json.porOP[0].eficienciaTempoPadrao,
      ref: json.porOP[0].eficienciaTempoReferencia,
      aplicado: json.porOP[0].eficienciaTempoAplicado,
    })

    const etapaPdf = desc => pdf.dados.etapas.find(e => e.descricao === desc)
    verificar('PDF etapa Costura: 3 critérios = JSON', {
      padrao: etapaPdf('Costura').eficienciaTempoPadrao,
      ref: etapaPdf('Costura').eficienciaTempoReferencia,
      aplicado: etapaPdf('Costura').eficienciaTempoAplicado,
    }, { padrao: 133, ref: 100, aplicado: 100 })
  }

  // ═══════════════════════════════════════════════════════════
  // Filtros de período continuam funcionando
  // ═══════════════════════════════════════════════════════════
  {
    const diario = await relatorioService.gerarRelatorioCompleto(CNPJ, { tipo: 'diario', dataInicial: '2026-09-10' })
    verificar('filtro diário mantém os 3 critérios', {
      padrao: diario.resumo.eficienciaTempoPadrao,
      ref: diario.resumo.eficienciaTempoReferencia,
      aplicado: diario.resumo.eficienciaTempoAplicado,
    }, { padrao: 140, ref: 114, aplicado: 123 })

    const vazio = await relatorioService.gerarRelatorioCompleto(CNPJ, {
      tipo: 'personalizado',
      dataInicial: '2026-01-01',
      dataFim: '2026-01-31',
      dataFinal: '2026-01-31',
    })
    verificar('período sem dados: indicadores 0 e sem NaN', [vazio.resumo.eficienciaTempoPadrao, vazio.resumo.eficienciaGeral, naoTemNaN(vazio)], [0, 0, true])
  }

  console.log(falhas === 0 ? '\n✅ TODOS OS TESTES PASSARAM' : `\n❌ ${falhas} TESTE(S) FALHARAM`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
