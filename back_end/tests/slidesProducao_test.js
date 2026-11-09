// TESTE: Painel de Slides de Produção → GET /producao/painel
// Execute com: node tests/slidesProducao_test.js
//
// Cobre os cenários de validação pedidos para a tela de slides:
//   1. profissional com apenas UMA etapa
//   2. profissional com DUAS ou mais etapas
//   3. etapas com tempos de referência diferentes
//   4. OP com tempo padrão próprio × OP sem padrão (fallback)
//   5. produção distribuída em vários horários
//   6. produção em mais de uma etapa no mesmo dia
//   7. horários SEM produção não aparecem como apontamento
//   8. registros duplicados e inválidos (quantidade 0) fora dos totais
//   9. consistência com a consolidação oficial dos relatórios
//  10. validação de parâmetros, ausência de NaN e rota registrada
//
// Roda sem banco: o Prisma é substituído por um stub em memória.

const CNPJ = '12345678000199'
const DIA = new Date(Date.UTC(2026, 2, 6)) // 06/03/2026

const funcionario = (email, nome) => ({ email, nome, foto: null })

// Etapas: 10 Corte (0,50) · 20 Costura (0,80) · 30 Montagem (SEM padrão)
//         40 Revisão Final (0,40) — etapa FINAL das OPs
const PRODUCOES = [
  // ── João: duas etapas na mesma OP (Corte + Costura) ──
  {
    id_da_producao: 1, id_funcionario: 'joao@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 100, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: funcionario('joao@x.com', 'João'),
    producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },
  {
    id_da_producao: 2, id_funcionario: 'joao@x.com', id_da_op: 300, id_da_funcao: 20,
    quantidade_pecas: 50, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: funcionario('joao@x.com', 'João'),
    producao_etapa: { id_da_funcao: 20, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },

  // ── Maria: mesmo horário do João, etapa diferente (hora compartilhada) ──
  {
    id_da_producao: 3, id_funcionario: 'maria@x.com', id_da_op: 300, id_da_funcao: 20,
    quantidade_pecas: 40, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '10:00', horaNumero: 10, tipoRegistro: 'principal',
    producao_funcionario: funcionario('maria@x.com', 'Maria'),
    producao_etapa: { id_da_funcao: 20, descricao: 'Costura', tempo_padrao: 0.8 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },
  {
    id_da_producao: 4, id_funcionario: 'maria@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 60, tempo_produzido: 45, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '11:00', horaNumero: 11, tipoRegistro: 'principal',
    producao_funcionario: funcionario('maria@x.com', 'Maria'),
    producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },

  // ── Ana: etapa FINAL (produção concluída) + etapa sem padrão de outra OP ──
  {
    id_da_producao: 5, id_funcionario: 'ana@x.com', id_da_op: 300, id_da_funcao: 40,
    quantidade_pecas: 80, tempo_produzido: 30, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '14:00', horaNumero: 14, tipoRegistro: 'principal',
    producao_funcionario: funcionario('ana@x.com', 'Ana'),
    producao_etapa: { id_da_funcao: 40, descricao: 'Revisão Final', tempo_padrao: 0.4 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },
  {
    id_da_producao: 6, id_funcionario: 'ana@x.com', id_da_op: 400, id_da_funcao: 30,
    quantidade_pecas: 20, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '15:00', horaNumero: 15, tipoRegistro: 'principal',
    producao_funcionario: funcionario('ana@x.com', 'Ana'),
    producao_etapa: { id_da_funcao: 30, descricao: 'Montagem', tempo_padrao: 0 },
    producao_peca: { id_da_op: 400, descricao: 'Calça', tempo_padrao: 0.5 },
  },

  // ── Pedro: duplicata "stale" (id menor, quantidade inflada) → DESCARTADA ──
  {
    id_da_producao: 7, id_funcionario: 'pedro@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 999, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: funcionario('pedro@x.com', 'Pedro'),
    producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },
  {
    id_da_producao: 8, id_funcionario: 'pedro@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 10, tempo_produzido: 60, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
    producao_funcionario: funcionario('pedro@x.com', 'Pedro'),
    producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },

  // ── Registro ZERADO: não entra em totais nem vira horário ──
  {
    id_da_producao: 9, id_funcionario: 'carla@x.com', id_da_op: 300, id_da_funcao: 10,
    quantidade_pecas: 0, tempo_produzido: 30, data_inicio: DIA, dataReferencia: DIA,
    hora_registro: '12:00', horaNumero: 12, tipoRegistro: 'principal',
    producao_funcionario: funcionario('carla@x.com', 'Carla'),
    producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
    producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
  },
]

const REFERENCIAS = [
  // João: Corte da OP 300 → 0,40 (MENOR que o padrão 0,50)
  { id: 1, id_funcionario: 'joao@x.com', id_da_funcao: 10, tempo_minutos: 0.4, tempo_por_peca: null, criadoEm: DIA, data_medicao: DIA, opId: 300 },
  // Maria: Costura em qualquer OP → 1,00 (MAIOR que o padrão 0,80)
  { id: 2, id_funcionario: 'maria@x.com', id_da_funcao: 20, tempo_minutos: 1, tempo_por_peca: null, criadoEm: DIA, data_medicao: DIA, opId: null },
  // Ana: Montagem (etapa SEM padrão) → 0,30 (única fonte de tempo válida)
  { id: 3, id_funcionario: 'ana@x.com', id_da_funcao: 30, tempo_minutos: 0.3, tempo_por_peca: null, criadoEm: DIA, data_medicao: DIA, opId: 400 },
]

const OPS = [
  {
    id_da_op: 300, descricao: 'Camiseta', quantidade_pecas: 500, tempo_padrao: 1,
    // Entrega no futuro → OP em andamento (nunca "atrasada" por engano).
    data_de_entrega: '2099-01-01', status: 'em andamento',
    etapas: [
      { id_da_funcao: 10, etapa: { descricao: 'Corte' } },
      { id_da_funcao: 20, etapa: { descricao: 'Costura' } },
      // Etapa do fluxo que ainda não recebeu peça hoje (e NÃO é a final).
      { id_da_funcao: 60, etapa: { descricao: 'Etiquetagem' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
  {
    id_da_op: 400, descricao: 'Calça', quantidade_pecas: 300, tempo_padrao: 0.5,
    // Entrega no passado e sem conclusão → OP atrasada.
    data_de_entrega: '10/01/2020', status: 'em andamento',
    etapas: [
      { id_da_funcao: 30, etapa: { descricao: 'Montagem' } },
      { id_da_funcao: 40, etapa: { descricao: 'Revisão Final' } },
    ],
  },
]

// Etapas CADASTRADAS no estabelecimento: as 4 do dia + uma que não tem
// nenhum apontamento ("Expedição"), que precisa aparecer com zero.
const ETAPAS_CADASTRADAS = [
  { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5, grupoEtapa: { nome: 'Preparação' } },
  { id_da_funcao: 20, descricao: 'Costura', tempo_padrao: 0.8, grupoEtapa: null },
  { id_da_funcao: 30, descricao: 'Montagem', tempo_padrao: null, grupoEtapa: null },
  { id_da_funcao: 40, descricao: 'Revisão Final', tempo_padrao: 0.4, grupoEtapa: null },
  // Cadastrada, fora do fluxo das OPs do dia e sem apontamento.
  { id_da_funcao: 50, descricao: 'Expedição', tempo_padrao: 0.2, grupoEtapa: { nome: 'Saída' } },
  { id_da_funcao: 60, descricao: 'Etiquetagem', tempo_padrao: 0.1, grupoEtapa: null },
  // Duplicata de escrita: mesma etapa não pode virar duas linhas no painel.
  { id_da_funcao: 61, descricao: 'Corte', tempo_padrao: 0.5, grupoEtapa: { nome: 'Preparação' } },
]

const prismaStub = {
  etapa: { findMany: async () => ETAPAS_CADASTRADAS },
  estabelecimento: {
    findUnique: async () => ({
      nome: 'Linha Tex Teste',
      peca_final: null,
      tempo_de_producao: 480,
    }),
  },
  producao: { findMany: async () => PRODUCOES },
  tempoReferencia: { findMany: async () => REFERENCIAS },
  metaDia: { findMany: async () => [] },
  usuarios: { count: async () => 5 },
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

const slidesService = require('../Services/slidesProducaoService')
const relatorioService = require('../Services/relatorioProducaoService')
const pecasRouter = require('../Routes/Pecas.router')

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

async function main() {
  console.log('═'.repeat(72))
  console.log('1-4. RESUMO DO DIA (fórmula oficial: Σ(qtd × SAM) ÷ tempo trabalhado)')
  console.log('═'.repeat(72))

  const validacao = slidesService.validarData('2026-03-06')
  verificar('validação aceita data ISO', validacao.ok, true)
  verificar('validação devolve a data', validacao.data, '2026-03-06')

  const resposta = await slidesService.obterPainelProducao(CNPJ, { data: validacao.data })

  verificar('data do painel', resposta.data, '2026-03-06')
  verificarCondicao(
    'rótulo do dia em português',
    /sexta-feira.*06.*março.*2026/i.test(resposta.dataLabel),
    resposta.dataLabel
  )
  verificar('nome do estabelecimento', resposta.estabelecimento.nome, 'Linha Tex Teste')

  // Peças: apontadas = todas as etapas deduplicadas; concluídas = só etapa final
  verificar('peças apontadas (100+50+40+60+80+20+10)', resposta.resumo.pecasApontadas, 360)
  verificar('peças concluídas (só etapa final da OP)', resposta.resumo.pecasConcluidas, 80)
  verificar('profissionais com produção', resposta.resumo.profissionais, 4)
  verificar('profissionais cadastrados ativos', resposta.resumo.profissionaisAtivos, 5)
  verificar('etapas com produção (Corte, Costura, Revisão Final, Montagem)', resposta.resumo.etapasComProducao, 4)
  verificar('OPs com produção', resposta.resumo.ops, 2)
  verificar('tempo trabalhado (60+60+60+45+30+60+60)', resposta.resumo.tempoTrabalhado, 375)

  // Tempos ponderados
  verificar('tempo padrão (Σ qtd × padrão)', resposta.resumo.tempoFicha, 189)
  verificar('tempo aplicado (Σ qtd × SAM)', resposta.resumo.tempoReferencia, 185)
  verificar('tempo de referência puro (só onde existe ref)', resposta.resumo.tempoReferenciaPuro, 86)

  // Eficiências independentes, por totais (nunca média de percentuais)
  verificar('eficiência padrão (189/375)', resposta.resumo.eficienciaTempoPadrao, 50)
  verificar('eficiência referência (86/375)', resposta.resumo.eficienciaTempoReferencia, 23)
  verificar('eficiência aplicada (185/375) = geral', resposta.resumo.eficienciaTempoAplicado, 49)
  verificar('eficiência geral do painel', resposta.resumo.eficienciaGeral, 49)
  verificar('cobertura de referência (160/360)', resposta.resumo.referenciaCobertura, 44.44)

  // Dedupe e inválidos
  verificar('duplicata removida (1 lançamento)', resposta.resumo.duplicadosRemovidos, 1)
  verificar('registro zerado contado como ignorado', resposta.resumo.registrosIgnorados, 1)
  verificar('registros válidos no dia', resposta.resumo.registros, 7)

  console.log('\n' + '═'.repeat(72))
  console.log('2. PRODUÇÃO POR ETAPA (etapas descobertas dinamicamente)')
  console.log('═'.repeat(72))

  const nomesEtapas = resposta.porEtapa.map(e => e.etapa)
  verificarCondicao(
    'etapas identificadas sem lista fixa',
    nomesEtapas.includes('Corte') &&
      nomesEtapas.includes('Costura') &&
      nomesEtapas.includes('Revisão Final') &&
      nomesEtapas.includes('Montagem'),
    JSON.stringify(nomesEtapas)
  )
  verificar('etapas ordenadas por produção', nomesEtapas, ['Corte', 'Costura', 'Revisão Final', 'Montagem'])

  const corte = resposta.porEtapa.find(e => e.etapa === 'Corte')
  const costura = resposta.porEtapa.find(e => e.etapa === 'Costura')
  const revisao = resposta.porEtapa.find(e => e.etapa === 'Revisão Final')
  const montagem = resposta.porEtapa.find(e => e.etapa === 'Montagem')

  verificar('Corte — produção (100+60+10)', corte.producao, 170)
  verificar('Corte — profissionais', corte.profissionais, 3)
  verificar('Corte — participação (% do total apontado)', corte.participacao, 47.22)
  verificar('Corte — eficiência oficial (75/165)', corte.eficiencia, 45)

  verificar('Costura — produção (50+40)', costura.producao, 90)
  verificar('Costura — eficiência (72/120)', costura.eficiencia, 60)

  verificar('Revisão Final — produção', revisao.producao, 80)
  verificar('Revisão Final — produção concluída', revisao.producaoConcluida, 80)
  verificar('Revisão Final — eficiência (32/30)', revisao.eficiencia, 107)

  verificar('Montagem — etapa sem tempo padrão: produção', montagem.producao, 20)
  verificar('Montagem — sem padrão: eficiência do critério padrão é 0', montagem.eficienciaTempoPadrao, 0)
  verificar('Montagem — referência do profissional sustenta o SAM (6/60)', montagem.eficienciaTempoAplicado, 10)

  verificar(
    'soma das etapas = total apontado (nenhuma peça duplicada)',
    resposta.porEtapa.reduce((s, e) => s + e.producao, 0),
    resposta.resumo.pecasApontadas
  )
  verificar(
    'participações somam 100%',
    Math.round(resposta.porEtapa.reduce((s, e) => s + e.participacao, 0) * 100) / 100,
    100
  )

  console.log('\n' + '═'.repeat(72))
  console.log('3. EVOLUÇÃO DURANTE O DIA (hora × etapa)')
  console.log('═'.repeat(72))

  verificar(
    'apenas horários COM produção (12:00 zerado não aparece)',
    resposta.porHora.map(h => h.hora),
    ['09:00', '10:00', '11:00', '14:00', '15:00']
  )
  verificar('09:00 — total (100 + 10)', resposta.porHora[0].total, 110)
  verificar('09:00 — etapas', resposta.porHora[0].etapas, [{ etapa: 'Corte', quantidade: 110 }])
  verificar('10:00 — duas pessoas na mesma hora (50+40)', resposta.porHora[1].total, 90)
  verificar('10:00 — etapa compartilhada', resposta.porHora[1].etapas, [{ etapa: 'Costura', quantidade: 90 }])
  verificar('15:00 — etapa sem padrão aparece', resposta.porHora[4].etapas, [{ etapa: 'Montagem', quantidade: 20 }])

  verificar(
    'soma das horas = total apontado',
    resposta.porHora.reduce((s, h) => s + h.total, 0),
    resposta.resumo.pecasApontadas
  )
  verificar('horário de pico', resposta.horarios.pico, { hora: '09:00', total: 110 })
  verificar('horário de menor volume', resposta.horarios.vale, { hora: '15:00', total: 20 })
  verificar(
    'eixo do gráfico por etapa cobre o expediente inteiro',
    resposta.horasDoDia,
    ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
  )

  console.log('\n' + '═'.repeat(72))
  console.log('4. DESEMPENHO DOS PROFISSIONAIS (eficiência oficial, por totais)')
  console.log('═'.repeat(72))

  const nomes = resposta.profissionais.map(p => p.nome)
  // Ranking por EFICIÊNCIA (ficha ou referência, o menor), nunca por peças:
  // Maria tem 100 peças (mais que Ana) e fica à frente dela.
  verificar('ranking por eficiência', nomes, ['João', 'Maria', 'Ana', 'Pedro'])
  verificar('posições sequenciais', resposta.profissionais.map(p => p.posicao), [1, 2, 3, 4])
  verificar(
    'eficiências em ordem decrescente',
    resposta.profissionais.map(p => p.eficiencia),
    [67, 59, 42, 8]
  )

  const joao = resposta.profissionais[0]
  verificar('João — duas etapas executadas', joao.etapasExecutadas, 2)
  verificar('João — etapas detalhadas', joao.etapas, [
    { etapa: 'Corte', quantidade: 100 },
    { etapa: 'Costura', quantidade: 50 },
  ])
  verificar('João — produção total', joao.producao, 150)
  verificar('João — tempo trabalhado', joao.tempoTrabalhado, 120)
  verificar('João — eficiência (80/120)', joao.eficiencia, 67)
  verificar('João — OPs distintas', joao.ops, 1)

  const ana = resposta.profissionais[2]
  verificar('Ana — duas etapas (uma final, uma sem padrão)', ana.etapasExecutadas, 2)
  verificar('Ana — peças concluídas', ana.producaoConcluida, 80)
  verificar('Ana — eficiência (38/90)', ana.eficiencia, 42)
  verificar('Ana — duas OPs', ana.ops, 2)

  const pedro = resposta.profissionais[3]
  verificar('Pedro — apenas uma etapa', pedro.etapasExecutadas, 1)
  verificar('Pedro — duplicata descartada (produção 10, não 1009)', pedro.producao, 10)
  verificar('Pedro — eficiência (5/60)', pedro.eficiencia, 8)

  verificar('destaque de eficiência = 1º do ranking', resposta.destaques.maiorEficiencia.nome, 'João')
  verificar('ninguém bateu a meta de 1h', resposta.destaques.quantidadeNaMeta, 0)
  verificar('meta da hora é 100%', resposta.resumo.metaHora, 100)
  verificar('jornada do estabelecimento', resposta.resumo.jornadaMinutos, 480)
  verificar(
    'tempo médio por pessoa = total ÷ pessoas',
    resposta.resumo.tempoMedioPorPessoa,
    Math.round((resposta.resumo.tempoTrabalhado / 4) * 100) / 100
  )

  console.log('\n' + '═'.repeat(72))
  console.log('4a. QUEBRA DA ETAPA — HORA A HORA E PESSOAS')
  console.log('═'.repeat(72))

  verificar(
    'Corte — peças por hora',
    corte.porHora,
    [{ hora: '09:00', quantidade: 110 }, { hora: '11:00', quantidade: 60 }]
  )
  verificar(
    'Corte — horas sem produção não aparecem',
    corte.porHora.some(h => h.hora === '12:00' || h.hora === '10:00'),
    false
  )
  verificar('Corte — soma das horas = peças da etapa', corte.porHora.reduce((s, h) => s + h.quantidade, 0), corte.producao)
  verificar(
    'Corte — pessoas da etapa (eficiência daquele recorte)',
    corte.pessoas.map(p => [p.nome, p.producao, p.eficiencia]),
    [['João', 100, 67], ['Maria', 60, 67], ['Pedro', 10, 8]]
  )
  verificar('Corte — foto vem do cadastro', corte.pessoas[0].foto, null)
  verificar(
    'Costura — pessoas da etapa',
    costura.pessoas.map(p => [p.nome, p.producao, p.eficiencia]),
    [['João', 50, 67], ['Maria', 40, 53]]
  )
  verificar(
    'Montagem — etapa sem padrão usa a referência',
    montagem.pessoas.map(p => [p.nome, p.eficiencia]),
    [['Ana', 10]]
  )

  console.log('\n' + '═'.repeat(72))
  console.log('4b. MÓDULOS POR OP (cada OP com suas etapas)')
  console.log('═'.repeat(72))

  verificar('duas OPs no dia', resposta.porOp.length, 2)

  const op300 = resposta.porOp[0]
  verificar('OP 300 — identificação', op300.idOp, 300)
  verificar('OP 300 — descrição', op300.descricao, 'Camiseta')
  verificar('OP 300 — peças apontadas', op300.producao, 170 + 90 + 80)
  verificar('OP 300 — peças concluídas (revisão final)', op300.producaoConcluida, 80)
  verificar(
    'OP 300 — etapas separadas',
    op300.listaEtapas.map(e => [e.etapa, e.producao]),
    [['Corte', 170], ['Costura', 90], ['Revisão Final', 80]]
  )
  verificar('OP 300 — saneamento do duplicado', op300.listaEtapas[0].producao, 170)
  verificar(
    'OP 300 — só a etapa final conta como concluída',
    op300.listaEtapas.map(e => [e.etapa, e.final]),
    [['Corte', false], ['Costura', false], ['Revisão Final', true]]
  )
  verificarCondicao(
    'OP 300 — eficiência entre 0 e 200%',
    op300.eficiencia > 0 && op300.eficiencia < 200,
    String(op300.eficiencia)
  )
  verificar('OP 300 — profissionais', op300.profissionais, 4)

  const op400 = resposta.porOp[1]
  verificar('OP 400 — etapa sem padrão aparece', op400.listaEtapas, [
    { etapa: 'Montagem', final: false, producao: 20, profissionais: 1, tempoTrabalhado: 60, tempoAplicado: 6, eficiencia: 10 },
  ])
  verificar('OP 300 — peças previstas no cadastro', op300.quantidadePecas, 500)
  verificar('OP 300 — data de entrega normalizada', op300.dataEntrega, '2099-01-01')
  verificar('OP 300 — situação em andamento', op300.situacao, 'andamento')
  verificar('OP 400 — entrega em DD/MM/AAAA normalizada', op400.dataEntrega, '2020-01-10')
  verificar('OP 400 — sem conclusão e entrega vencida = atrasada', op400.situacao, 'atrasada')
  verificar(
    'OP 300 — etapas do fluxo do cadastro (com a final marcada)',
    op300.etapasFluxo.map(e => [e.etapa, e.final]),
    [['Corte', false], ['Costura', false], ['Revisão Final', true], ['Etiquetagem', false]]
  )

  console.log('\n' + '═'.repeat(72))
  console.log('4d. TODAS AS ETAPAS (cadastro × produção) E TABELA HORA × ETAPA')
  console.log('═'.repeat(72))

  const nomesCompletos = resposta.porEtapaCompleto.map(e => e.etapa)
  verificarCondicao(
    'etapa cadastrada sem produção aparece com zero',
    nomesCompletos.includes('Expedição') && nomesCompletos.includes('Etiquetagem'),
    JSON.stringify(nomesCompletos)
  )
  const expedicao = resposta.porEtapaCompleto.find(e => e.etapa === 'Expedição')
  verificar('Expedição — zero peças', expedicao.producao, 0)
  verificar('Expedição — zero pessoas', expedicao.pessoas, [])
  verificar('Expedição — sem horas', expedicao.porHora, [])
  verificar('Expedição — marcada como cadastrada', expedicao.cadastrada, true)
  verificar(
    'Expedição — cadastrada e fora do fluxo do dia',
    expedicao.emUsoNoDia,
    false
  )
  verificar(
    'Etiquetagem — no fluxo da OP do dia',
    resposta.porEtapaCompleto.find(e => e.etapa === 'Etiquetagem').emUsoNoDia,
    true
  )
  verificar(
    'todas as etapas cadastradas entram no painel',
    ['Corte', 'Costura', 'Montagem', 'Revisão Final', 'Expedição', 'Etiquetagem'].every(n =>
      nomesCompletos.includes(n)
    ),
    true
  )
  verificar(
    'cadastro repetido (Corte duas vezes) vira uma linha só',
    nomesCompletos.filter(n => n === 'Corte').length,
    1
  )
  verificar('contagem de etapas cadastradas no resumo', resposta.resumo.etapasCadastradas, 6)
  verificarCondicao(
    'etapa fora do fluxo do dia não entra na tabela (vai para a página de ociosas)',
    !resposta.matriz.linhas.some(l => l.etapa === 'Expedição'),
    JSON.stringify(resposta.matriz.linhas.map(l => l.etapa))
  )
  verificarCondicao(
    'etapa do fluxo sem produção entra na tabela com zero',
    resposta.matriz.linhas.some(l => l.etapa === 'Etiquetagem'),
    JSON.stringify(resposta.matriz.linhas.map(l => l.etapa))
  )
  verificar(
    'tabela — colunas contínuas do expediente (09h a 15h)',
    resposta.matriz.horas,
    ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
  )
  const linhaCorte = resposta.matriz.linhas.find(l => l.etapa === 'Corte')
  verificar(
    'tabela — Corte por hora',
    linhaCorte.celulas,
    [110, null, 60, null, null, null, null]
  )
  verificar('tabela — total da linha = peças da etapa', linhaCorte.total, corte.producao)
  verificar('tabela — linha total confere com a soma das células', linhaCorte.celulas.reduce((s, c) => s + (c || 0), 0), linhaCorte.total)
  verificar(
    'tabela — linha do fluxo sem produção é toda vazia',
    resposta.matriz.linhas.find(l => l.etapa === 'Etiquetagem').celulas,
    [null, null, null, null, null, null, null]
  )
  verificar(
    'tabela — total do horário 09:00 (Corte do dia)',
    resposta.matriz.totaisHora[0],
    110
  )
  verificar(
    'tabela — soma dos totais de hora = peças apontadas',
    resposta.matriz.totaisHora.reduce((s, n) => s + n, 0),
    resposta.resumo.pecasApontadas
  )

  console.log('\n' + '═'.repeat(72))
  console.log('4e. PEÇAS FINALIZADAS × PROCESSADAS (só a etapa final conta)')
  console.log('═'.repeat(72))

  verificar('finalização disponível (OPs do dia têm etapa final)', resposta.finalizacao.disponivel, true)
  verificar('finalização sem motivo de indisponibilidade', resposta.finalizacao.motivo, null)
  verificar('peças finalizadas = só a etapa final', resposta.finalizacao.pecas, 80)
  verificar('finalizadas = resumo do dia', resposta.finalizacao.pecas, resposta.resumo.pecasConcluidas)
  verificar(
    'etapa final identificada no fluxo das OPs',
    resposta.finalizacao.etapasFinais.map(e => e.etapa),
    ['Revisão Final']
  )
  verificar('OP com etapa final contada', resposta.finalizacao.opsComEtapaFinal, 2)
  verificar('OP sem etapa final (nenhuma)', resposta.finalizacao.opsSemEtapaFinal, 0)
  verificarCondicao(
    'produção intermediária nunca vira peça finalizada',
    resposta.resumo.pecasApontadas === 360 && resposta.finalizacao.pecas === 80,
    `apontadas=${resposta.resumo.pecasApontadas} finalizadas=${resposta.finalizacao.pecas}`
  )

  // ── Cenário obrigatório: corte + costura com produção e NENHUMA peça na
  //    etapa final. As etapas intermediárias aparecem; finalizadas fica 0. ──
  const originalProducao = prismaStub.producao.findMany
  prismaStub.producao.findMany = async () => [
    { ...PRODUCOES[0], id_da_producao: 201, quantidade_pecas: 100, tempo_produzido: 60 },
    { ...PRODUCOES[1], id_da_producao: 202, quantidade_pecas: 50, tempo_produzido: 60 },
  ]
  const semFinal = await slidesService.obterPainelProducao(CNPJ, { data: '2026-03-06' })
  prismaStub.producao.findMany = originalProducao

  verificar(
    'sem peça finalizada — etapas intermediárias têm produção',
    semFinal.porEtapa.map(e => [e.etapa, e.producao]),
    [['Corte', 100], ['Costura', 50]]
  )
  verificar('sem peça finalizada — total de finalizadas é zero', semFinal.resumo.pecasConcluidas, 0)
  verificar('sem peça finalizada — número exibido é zero (nada inventado)', semFinal.finalizacao.pecas, 0)
  verificar('sem peça finalizada — finalização segue disponível', semFinal.finalizacao.disponivel, true)
  verificar(
    'sem peça finalizada — processadas ≠ finalizadas',
    [semFinal.resumo.pecasApontadas, semFinal.finalizacao.pecas],
    [150, 0]
  )
  verificar(
    'cada etapa tem seu próprio gráfico por hora',
    semFinal.porEtapa.map(e => e.porHora),
    [
      [{ hora: '09:00', quantidade: 100 }],
      [{ hora: '10:00', quantidade: 50 }],
    ]
  )
  verificar(
    'sem peça finalizada — eficiência continua a oficial (Corte 40/60)',
    semFinal.porEtapa[0].eficiencia,
    67
  )

  // ── OPs sem nenhuma etapa final no fluxo: o painel avisa em vez de chutar ──
  const originalOps = prismaStub.pecasOP.findMany
  prismaStub.pecasOP.findMany = async () => [
    {
      id_da_op: 300, descricao: 'Camiseta', quantidade_pecas: 500, tempo_padrao: 1,
      data_de_entrega: null, status: 'em andamento',
      etapas: [
        { id_da_funcao: 10, etapa: { descricao: 'Corte' } },
        { id_da_funcao: 20, etapa: { descricao: 'Costura' } },
      ],
    },
  ]
  const semEtapaFinal = await slidesService.obterPainelProducao(CNPJ, { data: '2026-03-06' })
  prismaStub.pecasOP.findMany = originalOps

  verificar('sem etapa final identificável — painel avisa', semEtapaFinal.finalizacao.disponivel, false)
  verificar('sem etapa final identificável — motivo', semEtapaFinal.finalizacao.motivo, 'sem_etapa_final')
  verificar('sem etapa final identificável — total não é inventado', semEtapaFinal.finalizacao.pecas, 0)
  verificar('sem etapa final identificável — sem etapas finais na lista', semEtapaFinal.finalizacao.etapasFinais, [])

  console.log('\n' + '═'.repeat(72))
  console.log('4c. META DA HORA (100%) E LIMITE DE JORNADA')
  console.log('═'.repeat(72))

  // Uma pessoa que entrega 60 min de SAM em 60 min trabalhados bate a meta,
  // e o tempo no painel nunca passa da jornada (480 no stub).
  const originalFind = prismaStub.producao.findMany
  prismaStub.producao.findMany = async () => [
    {
      id_da_producao: 100, id_funcionario: 'rita@x.com', id_da_op: 300, id_da_funcao: 10,
      // 1400 peças × 0,50 = 700 min de SAM em 700 min trabalhados = 100%.
      quantidade_pecas: 1400, tempo_produzido: 700, data_inicio: DIA, dataReferencia: DIA,
      hora_registro: '09:00', horaNumero: 9, tipoRegistro: 'principal',
      producao_funcionario: { email: 'rita@x.com', nome: 'Rita', foto: 'https://foto/rita.png' },
      producao_etapa: { id_da_funcao: 10, descricao: 'Corte', tempo_padrao: 0.5 },
      producao_peca: { id_da_op: 300, descricao: 'Camiseta', tempo_padrao: 1 },
    },
  ]
  const meta = await slidesService.obterPainelProducao(CNPJ, { data: '2026-03-06' })
  prismaStub.producao.findMany = originalFind

  verificar('meta — eficiência 700/700 = 100%', meta.profissionais[0].eficiencia, 100)
  verificar('meta — bateu a meta', meta.profissionais[0].bateuMeta, true)
  verificar('meta — foto disponível para celebrar', meta.profissionais[0].foto, 'https://foto/rita.png')
  verificar('meta — contagem no resumo', meta.resumo.profissionaisNaMeta, 1)
  verificar('meta — destaque com a pessoa', meta.destaques.naMeta.map(p => p.nome), ['Rita'])
  verificar('meta — tempo real registrado', meta.profissionais[0].tempoTrabalhado, 700)
  verificar('meta — tempo no painel limitado à jornada', meta.profissionais[0].tempoNoDia, 480)

  console.log('\n' + '═'.repeat(72))
  console.log('5. CONSISTÊNCIA COM A CONSOLIDAÇÃO OFICIAL / PARÂMETROS')
  console.log('═'.repeat(72))

  // Mesmo dia, chamado direto nos relatórios: números têm de ser idênticos.
  const periodo = relatorioService.resolverPeriodo({ tipo: 'diario', dataInicial: '2026-03-06' })
  const { consolidado } = await relatorioService.calcularRelatorio(CNPJ, periodo, { incluirDetalhes: true })

  verificar('eficiência geral = relatório', resposta.resumo.eficienciaGeral, consolidado.resumo.eficienciaGeral)
  verificar('eficiência padrão = relatório', resposta.resumo.eficienciaTempoPadrao, consolidado.resumo.eficienciaTempoPadrao)
  verificar('eficiência referência = relatório', resposta.resumo.eficienciaTempoReferencia, consolidado.resumo.eficienciaTempoReferencia)
  verificar('peças apontadas = relatório', resposta.resumo.pecasApontadas, consolidado.resumo.producaoRegistrada)
  verificar('peças concluídas = relatório', resposta.resumo.pecasConcluidas, consolidado.resumo.producaoConcluida)
  verificar('tempo trabalhado = relatório', resposta.resumo.tempoTrabalhado, consolidado.resumo.tempoTrabalhado)

  const etapaRelatorio = consolidado.porEtapa.find(e => e.descricao === 'Corte')
  verificar('eficiência da etapa = relatório', corte.eficiencia, etapaRelatorio.eficienciaTempoAplicado)

  const funcRelatorio = consolidado.funcionarios.find(f => f.email === 'joao@x.com')
  verificar('eficiência do profissional = relatório', joao.eficiencia, funcRelatorio.eficienciaTempoAplicado)

  const opRelatorio = consolidado.ops.find(o => o.idOp === 300)
  verificar('eficiência do módulo de OP = relatório', op300.eficiencia, opRelatorio.eficienciaTempoAplicado)
  verificar('peças do módulo de OP = relatório', op300.producao, opRelatorio.producaoRegistrada)

  verificar('payload sem NaN/Infinity', naoTemNaN(resposta), true)
  verificar('dia com produção não está vazio', resposta.vazio, false)

  const invalida = slidesService.validarData('06/03/2026')
  verificar('data em formato errado é recusada', invalida.ok, false)
  verificar('status da recusa', invalida.status, 400)

  const inexistente = slidesService.validarData('2026-02-30')
  verificar('data inexistente no calendário é recusada', inexistente.ok, false)

  const padrao = slidesService.validarData(undefined)
  verificar('sem parâmetro usa o dia de hoje', padrao.ok && /^\d{4}-\d{2}-\d{2}$/.test(padrao.data), true)

  const rotas = pecasRouter.stack.filter(l => l.route).map(l => l.route.path)
  verificarCondicao('rota GET /producao/painel registrada', rotas.includes('/producao/painel'), JSON.stringify(rotas))

  // ── Dia sem nenhum apontamento: painel vazio, sem percentual inventado ──
  const original = prismaStub.producao.findMany
  prismaStub.producao.findMany = async () => []
  const vazio = await slidesService.obterPainelProducao(CNPJ, { data: '2026-03-07' })
  prismaStub.producao.findMany = original

  verificar('dia vazio — sinaliza vazio', vazio.vazio, true)
  verificar('dia vazio — peças', vazio.resumo.pecasApontadas, 0)
  verificar('dia vazio — eficiência geral 0 (sem dados)', vazio.resumo.eficienciaGeral, 0)
  verificar('dia vazio — sem horários', vazio.porHora, [])
  verificar('dia vazio — sem pico', vazio.horarios.pico, null)
  verificar('dia vazio — sem destaques', vazio.destaques.maiorEficiencia, null)

  console.log('\n' + '═'.repeat(72))
  console.log(falhas === 0 ? '✔ TODOS OS TESTES PASSARAM' : `✖ ${falhas} VERIFICAÇÃO(ÕES) FALHARAM`)
  console.log('═'.repeat(72))

  process.exit(falhas === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('Erro inesperado no teste:', err)
  process.exit(1)
})
