// TESTE: Dashboard → GET /dashboard/producao-evolucao
// Execute com: node tests/dashboardProducaoEvolucao_test.js
//
// Cobre os cenários pedidos para o gráfico de evolução da produção:
//   1. tempo padrão do dia
//   2. tempo de referência do dia
//   3. tempo efetivado do dia
//   4. eficiência em relação ao padrão
//   5. eficiência em relação à referência
//   6. consolidação de múltiplos profissionais, etapas e OPs
//   7. dias sem produção (zerados)
//   8. registros zerados (estornos/quantidade 0)
//   9. ausência de tempo de referência (sem percentual inventado)
//  10. ausência de tempo padrão
//  11. duplicidade de registros (dedupe oficial)
//  12. mudança de período
//  13. consistência com o serviço de relatórios (mesma fonte de cálculo)
//  14. validação de parâmetros e rota registrada
//
// Roda sem banco: o Prisma é substituído por um stub em memória.

const path = require('path')

const CNPJ = '12345678000199'
const DIA = d => new Date(Date.UTC(2026, 9, d)) // outubro/2026

// Etapas: 10 Costura (0,80) · 20 Acabamento (0,50) · 30 Montagem (sem padrão)
//        40 Revisão Final (0,40) — etapa FINAL da OP
const PRODUCOES = [
  // ── Duplicata "stale" (id menor, quantidade inflada): deve ser DESCARTADA ──
  {
    id_da_producao: 10, id_funcionario: 'joao@x.com', id_da_op: 100, id_da_funcao: 10,
    quantidade_pecas: 999, tempo_produzido: 60, data_inicio: DIA(29), dataReferencia: DIA(29),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 10, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // ── Registro válido (id maior, mesma chave): vence o dedupe ──
  {
    id_da_producao: 11, id_funcionario: 'joao@x.com', id_da_op: 100, id_da_funcao: 10,
    quantidade_pecas: 100, tempo_produzido: 60, data_inicio: DIA(29), dataReferencia: DIA(29),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'joao@x.com', nome: 'João', foto: null },
    producao_etapa: { id_da_funcao: 10, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // ── Segundo profissional, outra etapa, mesma OP ──
  {
    id_da_producao: 12, id_funcionario: 'maria@x.com', id_da_op: 100, id_da_funcao: 20,
    quantidade_pecas: 50, tempo_produzido: 40, data_inicio: DIA(29), dataReferencia: DIA(29),
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: { email: 'maria@x.com', nome: 'Maria', foto: null },
    producao_etapa: { id_da_funcao: 20, descricao: 'Acabamento', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // ── Etapa FINAL, profissional sem Tempo de Referência cadastrado ──
  {
    id_da_producao: 13, id_funcionario: 'ana@x.com', id_da_op: 100, id_da_funcao: 40,
    quantidade_pecas: 60, tempo_produzido: 30, data_inicio: DIA(31), dataReferencia: DIA(31),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'ana@x.com', nome: 'Ana', foto: null },
    producao_etapa: { id_da_funcao: 40, descricao: 'Revisão Final', tempo_padrao: 0.4 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.4 },
  },
  // ── Registro ZERADO: não pode entrar nos totais ──
  {
    id_da_producao: 14, id_funcionario: 'maria@x.com', id_da_op: 100, id_da_funcao: 20,
    quantidade_pecas: 0, tempo_produzido: 12, data_inicio: DIA(30), dataReferencia: DIA(30),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'maria@x.com', nome: 'Maria', foto: null },
    producao_etapa: { id_da_funcao: 20, descricao: 'Acabamento', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 100, descricao: 'Camiseta', tempo_padrao: 0.8 },
  },
  // ── Etapa SEM tempo padrão e SEM referência (nenhum tempo inventado) ──
  {
    id_da_producao: 15, id_funcionario: 'pedro@x.com', id_da_op: 200, id_da_funcao: 30,
    quantidade_pecas: 10, tempo_produzido: 10, data_inicio: DIA(1), dataReferencia: DIA(1),
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: { email: 'pedro@x.com', nome: 'Pedro', foto: null },
    producao_etapa: { id_da_funcao: 30, descricao: 'Montagem', tempo_padrao: 0 },
    producao_peca: { id_da_op: 200, descricao: 'Calça', tempo_padrao: 0 },
  },
]

// Novembro/2026 (DIA usa outubro por padrão; dia 1º é reinjetado abaixo)
PRODUCOES[5].data_inicio = new Date(Date.UTC(2026, 10, 1))
PRODUCOES[5].dataReferencia = new Date(Date.UTC(2026, 10, 1))

const REFERENCIAS = [
  // João: Costura na OP 100 → 0,60 (menor que o padrão 0,80)
  { id: 1, id_funcionario: 'joao@x.com', id_da_funcao: 10, tempo_minutos: 0.6, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: 100 },
  // Maria: Acabamento em qualquer OP → 0,70 (maior que o padrão 0,50)
  { id: 2, id_funcionario: 'maria@x.com', id_da_funcao: 20, tempo_minutos: 0.7, tempo_por_peca: null, criadoEm: DIA(1), data_medicao: DIA(1), opId: null },
]

const OPS = [
  {
    id_da_op: 100, descricao: 'Camiseta', quantidade_pecas: 500, tempo_padrao: 0.8,
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Costura' } },
      { id_da_funcao: 20, etapa: { descricao: 'Acabamento' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
  {
    id_da_op: 200, descricao: 'Calça', quantidade_pecas: 300, tempo_padrao: 1,
    etapas: [
      { id_da_funcao: 30, etapa: { descricao: 'Montagem' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
]

let contagemConsultas = 0
const contar = fn => async (...args) => {
  contagemConsultas++
  return fn(...args)
}

const prismaStub = {
  // Jornada diária por funcionário = 480 min (regra oficial: tempo_de_producao).
  estabelecimento: { findUnique: contar(async () => ({ nome: 'Linha Tex Teste', peca_final: null, tempo_de_producao: 480 })) },
  producao: { findMany: contar(async () => PRODUCOES) },
  tempoReferencia: { findMany: contar(async () => REFERENCIAS) },
  metaDia: { findMany: contar(async () => []) },
  usuarios: { count: contar(async () => 3) },
  pecasOP: { findMany: contar(async () => OPS) },
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

const dashboardService = require('../Services/dashboardProducaoService')
const relatorioService = require('../Services/relatorioProducaoService')
const dashboardController = require('../Controllers/DashboardController')
const dashboardRouter = require('../Routes/Dashboard.router')

let falhas = 0
function verificar(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(
    `${ok ? '✔' : '✖'} ${nome}` +
      (ok ? '' : ` | esperado: ${JSON.stringify(esperado)} | obtido: ${JSON.stringify(obtido)}`)
  )
}

function verificarCondicao(nome, condicao, detalhe = '') {
  if (!condicao) falhas++
  console.log(`${condicao ? '✔' : '✖'} ${nome}${condicao ? '' : ` | ${detalhe}`}`)
}

const naoTemNaN = valor => !JSON.stringify(valor).match(/NaN|-?Infinity/)

const PERIODO = { dias: 4, dataInicio: '2026-10-29', dataFim: '2026-11-01' }

async function main() {
  console.log('═'.repeat(70))
  console.log('1-6. TEMPOS E EFICIÊNCIAS POR DIA')
  console.log('═'.repeat(70))

  const resposta = await dashboardService.obterEvolucaoProducao(CNPJ, PERIODO)

  verificar('período.dataInicio', resposta.periodo.dataInicio, '2026-10-29')
  verificar('período.dataFim', resposta.periodo.dataFim, '2026-11-01')
  verificar('quantidade de dias no array', resposta.evolucao.length, 4)
  verificar(
    'array cobre todos os dias do intervalo',
    resposta.evolucao.map(d => d.data),
    ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']
  )

  const dia29 = resposta.evolucao[0]
  verificar('29/10 — tempo padrão (100×0,80 + 50×0,50)', dia29.tempoPadrao, 105)
  verificar('29/10 — tempo de referência (100×0,60 + 50×0,70)', dia29.tempoReferencia, 95)
  verificar('29/10 — tempo efetivado (2 profissionais × 480)', dia29.tempoEfetivado, 960)
  verificar('29/10 — jornada máxima configurada', dia29.minutosJornada, 480)
  verificar('29/10 — sem revisão final: mantém a jornada cheia', dia29.jornadaDia, 480)
  // Arredondamento oficial: 1 casa decimal (igual ao calculosProducao.js).
  verificar('29/10 — eficiência padrão (105/960)', dia29.eficienciaPadrao, 10.9)
  verificar('29/10 — eficiência referência (95/960)', dia29.eficienciaReferencia, 9.9)
  verificar('29/10 — tempo registrado apenas informativo (60 + 40)', dia29.tempoRegistrado, 100)
  verificar('29/10 — duas etapas apontadas, nenhuma final', dia29.quantidadePecas, 0)
  verificar('29/10 — peças apontadas (100 + 50)', dia29.pecasApontadas, 150)
  verificar('29/10 — dois profissionais', dia29.profissionais, 2)
  verificar('29/10 — cobertura de referência 100%', dia29.referenciaCobertura, 100)

  const dia31 = resposta.evolucao[2]
  verificar('31/10 — tempo padrão (60×0,40)', dia31.tempoPadrao, 24)
  // Revisão final da Ana às 09:00 ocupa o slot de 1 HORA (a divisão automática
  // de 30/30 entre etapas não encurta o expediente) → jornada do dia = 60.
  verificar('31/10 — jornada do dia reduzida pela revisão final', dia31.jornadaDia, 60)
  verificar('31/10 — tempo efetivado (1 profissional × 60)', dia31.tempoEfetivado, 60)
  verificar('31/10 — eficiência padrão (24/60)', dia31.eficienciaPadrao, 40)
  verificar('31/10 — peças finais (etapa final da OP)', dia31.quantidadePecas, 60)

  console.log('\n' + '═'.repeat(70))
  console.log('7-11. DIAS ZERADOS, ESTORNOS, AUSÊNCIAS E DEDUPE')
  console.log('═'.repeat(70))

  const dia30 = resposta.evolucao[1]
  verificar('30/10 — dia sem produção: peças', dia30.quantidadePecas, 0)
  verificar('30/10 — dia sem produção: tempo padrão', dia30.tempoPadrao, 0)
  verificar('30/10 — dia sem produção: tempo referência', dia30.tempoReferencia, 0)
  verificar('30/10 — dia sem produção: tempo efetivado', dia30.tempoEfetivado, 0)
  verificar('30/10 — sem percentual artificial (padrão null)', dia30.eficienciaPadrao, null)
  verificar('30/10 — sem percentual artificial (referência null)', dia30.eficienciaReferencia, null)
  verificar('30/10 — sinaliza ausência de produção', dia30.temProducao, false)
  verificar('30/10 — registro zerado não soma peças', dia30.pecasApontadas, 0)

  verificar('31/10 — sem referência cadastrada: nenhum valor inventado', dia31.tempoReferencia, 0)
  verificar('31/10 — sem referência: percentual null', dia31.eficienciaReferencia, null)

  const dia01 = resposta.evolucao[3]
  verificar('01/11 — sem tempo padrão: tempo padrão 0', dia01.tempoPadrao, 0)
  verificar('01/11 — sem tempo padrão: percentual null', dia01.eficienciaPadrao, null)
  verificar('01/11 — sem revisão final: jornada cheia', dia01.jornadaDia, 480)
  verificar('01/11 — tempo efetivado existe (1 × 480)', dia01.tempoEfetivado, 480)
  verificar('01/11 — tempo registrado informativo (10)', dia01.tempoRegistrado, 10)
  verificar('01/11 — sem padrão e sem referência', dia01.eficienciaReferencia, null)

  verificar('dedupe — peças apontadas do dia 29 (999 descartado)', dia29.pecasApontadas, 150)
  verificar('dedupe — funcionários do dia 29 (não duplica)', dia29.profissionais, 2)
  verificar('dedupe — tempo registrado do dia 29 (999 descartado)', dia29.tempoRegistrado, 100)

  console.log('\n' + '═'.repeat(70))
  console.log('6. RESUMO — RAZÃO DOS TOTAIS (NÃO MÉDIA DAS EFICIÊNCIAS DIÁRIAS)')
  console.log('═'.repeat(70))

  const resumo = resposta.resumo
  verificar('resumo — total de peças finais', resumo.totalPecas, 60)
  verificar('resumo — peças apontadas (150 + 60 + 10)', resumo.totalPecasApontadas, 220)
  verificar('resumo — tempo padrão acumulado', resumo.tempoPadraoTotal, 129)
  verificar('resumo — tempo de referência acumulado', resumo.tempoReferenciaTotal, 95)
  verificar('resumo — funcionários-dia (2 + 1 + 1)', resumo.funcionariosDia, 4)
  // 960 (29/10) + 60 (31/10 reduzido) + 480 (01/11)
  verificar('resumo — tempo efetivado (soma das jornadas reais)', resumo.tempoEfetivadoTotal, 1500)
  verificar('resumo — eficiência padrão (129/1500)', resumo.eficienciaPadrao, 8.6)
  verificar('resumo — eficiência referência (95/1500)', resumo.eficienciaReferencia, 6.3)
  verificar('resumo — jornada aplicada', resumo.minutosJornada, 480)

  const mediaSimplesReferencia = Math.round((10 + 0 + 0) / 3)
  verificarCondicao(
    'resumo ≠ média simples das eficiências diárias',
    resumo.eficienciaReferencia !== mediaSimplesReferencia,
    `média simples: ${mediaSimplesReferencia} | resumo: ${resumo.eficienciaReferencia}`
  )

  verificar('resumo — dias com produção', resumo.diasComProducao, 3)
  verificar('resumo — dias sem produção', resumo.diasSemProducao, 1)
  verificar('resumo — dias com referência', resumo.diasComReferencia, 1)
  verificar('resumo — cobertura de referência (150/220)', resumo.referenciaCobertura, 68.18)
  verificarCondicao(
    'resumo — documenta regra de tempo utilizada',
    /menor entre tempo ficha e tempo de referencia/i.test(resposta.regras.tempoUtilizado),
    resposta.regras.tempoUtilizado
  )
  verificarCondicao('sem NaN/Infinity no payload', naoTemNaN(resposta))

  console.log('\n' + '═'.repeat(70))
  console.log('13. CONSISTÊNCIA COM O SERVIÇO DE RELATÓRIOS')
  console.log('═'.repeat(70))

  const periodoRelatorio = relatorioService.resolverPeriodo({
    tipo: 'personalizado',
    dataInicial: '2026-10-29',
    dataFinal: '2026-11-01',
  })
  const { consolidado } = await relatorioService.calcularRelatorio(CNPJ, periodoRelatorio)

  verificar(
    'tempo registrado = relatorio.resumo.tempoTrabalhado',
    resumo.tempoRegistradoTotal,
    Math.round(consolidado.resumo.tempoTrabalhado * 100) / 100
  )
  verificar(
    'tempo padrão = relatorio.resumo.tempoFicha',
    resumo.tempoPadraoTotal,
    Math.round(consolidado.resumo.tempoFicha * 100) / 100
  )
  verificar(
    'tempo referência = relatorio.resumo.tempoReferenciaPuro',
    resumo.tempoReferenciaTotal,
    Math.round(consolidado.resumo.tempoReferenciaPuro * 100) / 100
  )
  // O relatório divide pelo tempo registrado; o gráfico divide pela jornada.
  // O NUMERADOR tem de ser exatamente o mesmo — já verificado acima.
  const round1 = valor => Math.round((Number(valor) || 0) * 10) / 10

  verificar(
    'eficiência padrão = tempo padrão do relatório ÷ jornada do período',
    resumo.eficienciaPadrao,
    round1((consolidado.resumo.tempoFicha * 100) / resumo.tempoEfetivadoTotal)
  )
  verificar(
    'eficiência referência = tempo referência do relatório ÷ jornada do período',
    resumo.eficienciaReferencia,
    round1((consolidado.resumo.tempoReferenciaPuro * 100) / resumo.tempoEfetivadoTotal)
  )
  verificar(
    'peças finais = relatorio.resumo.producaoConcluida',
    resumo.totalPecas,
    consolidado.resumo.producaoConcluida
  )

  console.log('\n' + '═'.repeat(70))
  console.log('12. MUDANÇA DE PERÍODO')
  console.log('═'.repeat(70))

  const curto = await dashboardService.obterEvolucaoProducao(CNPJ, {
    dias: 2,
    dataInicio: '2026-10-29',
    dataFim: '2026-10-30',
  })

  verificar('período curto — 2 dias', curto.evolucao.length, 2)
  verificar('período curto — sem o dia 31/10', curto.evolucao.some(d => d.data === '2026-10-31'), false)
  verificar('período curto — tempo efetivado só de 29/10 (2 × 480)', curto.resumo.tempoEfetivadoTotal, 960)
  verificar('período curto — peças apontadas só de 29/10', curto.resumo.totalPecasApontadas, 150)
  verificar('período curto — 1 dia sem produção', curto.resumo.diasSemProducao, 1)
  verificar('período curto — eficiência padrão (105/960)', curto.resumo.eficienciaPadrao, 10.9)

  const vazio = await dashboardService.obterEvolucaoProducao(CNPJ, {
    dias: 2,
    dataInicio: '2026-12-01',
    dataFim: '2026-12-02',
  })
  verificar('período sem dados — dias zerados', vazio.evolucao.map(d => d.tempoEfetivado), [0, 0])
  verificar('período sem dados — total de peças 0', vazio.resumo.totalPecas, 0)
  verificar('período sem dados — eficiência null', vazio.resumo.eficienciaPadrao, null)
  verificarCondicao('período sem dados — sem NaN', naoTemNaN(vazio))

  console.log('\n' + '═'.repeat(70))
  console.log('14. VALIDAÇÃO DE PARÂMETROS E ROTA')
  console.log('═'.repeat(70))

  verificar('padrão de dias = 7', dashboardService.validarParametros({}).params.dias, 7)
  verificar('dias=15 aceito', dashboardService.validarParametros({ dias: '15' }).params.dias, 15)
  verificar('dias=0 rejeitado', dashboardService.validarParametros({ dias: '0' }).status, 400)
  verificar('dias=91 rejeitado', dashboardService.validarParametros({ dias: '91' }).status, 400)
  verificar('dias não numérico rejeitado', dashboardService.validarParametros({ dias: 'abc' }).status, 400)
  verificar(
    'data invertida rejeitada',
    dashboardService.validarParametros({ dataInicio: '2026-11-05', dataFim: '2026-11-01' }).status,
    400
  )
  verificar(
    'data inexistente rejeitada',
    dashboardService.validarParametros({ dataInicio: '2026-02-30', dataFim: '2026-03-01' }).status,
    400
  )
  verificar(
    'data sem par rejeitada',
    dashboardService.validarParametros({ dataInicio: '2026-11-01' }).status,
    400
  )
  verificar(
    'intervalo > 366 dias rejeitado',
    dashboardService.validarParametros({ dataInicio: '2024-01-01', dataFim: '2026-01-02' }).status,
    400
  )

  const rotas = dashboardRouter.stack
    .filter(layer => layer.route)
    .map(layer => layer.route.path)
  verificarCondicao(
    'rota /dashboard/producao-evolucao registrada',
    rotas.includes('/dashboard/producao-evolucao'),
    rotas.join(', ')
  )

  // Controller: cnpj sempre do token, nunca da query.
  let capturado = null
  const original = dashboardService.obterEvolucaoProducao
  dashboardService.obterEvolucaoProducao = async (cnpj, params) => {
    capturado = { cnpj, params }
    return { periodo: {}, resumo: {}, evolucao: [] }
  }

  let statusHttp = null
  const res = {
    status(codigo) { statusHttp = codigo; return this },
    json(payload) { this.payload = payload; return this },
  }

  await dashboardController.getProducaoEvolucao(
    { user: { cnpj: CNPJ }, query: { dias: '7', cnpj: '99999999000199' } },
    res
  )
  verificar('controller — status 200', statusHttp, 200)
  verificar('controller — cnpj do token (query ignorada)', capturado?.cnpj, CNPJ)

  statusHttp = null
  capturado = null
  await dashboardController.getProducaoEvolucao({ user: { cnpj: CNPJ }, query: { dias: '500' } }, res)
  verificar('controller — parâmetro inválido → 400', statusHttp, 400)
  verificar('controller — não consulta o banco com dado inválido', capturado, null)

  statusHttp = null
  await dashboardController.getProducaoEvolucao({ user: {}, query: {} }, res)
  verificar('controller — sem cnpj no token → 400', statusHttp, 400)

  dashboardService.obterEvolucaoProducao = original

  console.log('\n' + '═'.repeat(70))
  console.log('QUANTIDADE DE CONSULTAS (sem N+1)')
  console.log('═'.repeat(70))

  contagemConsultas = 0
  await dashboardService.obterEvolucaoProducao(CNPJ, PERIODO)
  verificarCondicao(
    `consultas ao banco em uma requisição: ${contagemConsultas} (limite 8)`,
    contagemConsultas <= 8,
    String(contagemConsultas)
  )

  console.log('\n' + '═'.repeat(70))
  if (falhas) {
    console.log(`❌ ${falhas} verificação(ões) falharam`)
    process.exit(1)
  }
  console.log('✅ TODOS OS TESTES PASSARAM')
  process.exit(0)
}

main().catch(err => {
  console.error('Erro inesperado no teste:', err)
  process.exit(1)
})
