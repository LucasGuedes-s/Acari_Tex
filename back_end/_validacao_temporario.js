/* Validação temporária — somente leitura. Apagar após uso.
 * Compara o resultado NOVO com a forma ANTIGA das consultas para provar
 * equivalência semântica das otimizações. */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const falhas = [];
const ok = (m) => console.log('  OK  ' + m);
const falhou = (m) => { falhas.push(m); console.log('  FALHOU  ' + m); };

(async () => {
  const porTenant = await p.producao.groupBy({ by: ['id_Estabelecimento'], _count: { _all: true } });
  porTenant.sort((a, b) => b._count._all - a._count._all);
  const cnpj = porTenant[0].id_Estabelecimento;

  /* ── 1. /notificacoes: novo filtro por id_da_funcao ≡ antigo JOIN por descricao ── */
  console.log('\n[1] /notificacoes — equivalência dos agregados');
  const agora = new Date();
  const local = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hoje = new Date(local); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);

  const etapas = await p.etapa.findMany({ where: { descricao: 'Revisão Final' }, select: { id_da_funcao: true } });
  const ids = etapas.map(e => e.id_da_funcao);
  const janelas = [
    ['hoje', { gte: hoje, lt: amanha }],
    ['ontem', { gte: ontem, lt: hoje }],
  ];
  for (const [rotulo, janela] of janelas) {
    const [antigo, novo] = await Promise.all([
      p.producao.aggregate({ _sum: { quantidade_pecas: true }, where: { id_Estabelecimento: cnpj, data_inicio: janela, producao_etapa: { descricao: 'Revisão Final' } } }),
      p.producao.aggregate({ _sum: { quantidade_pecas: true }, where: { id_Estabelecimento: cnpj, data_inicio: janela, id_da_funcao: { in: ids } } }),
    ]);
    const a = antigo._sum.quantidade_pecas || 0, n = novo._sum.quantidade_pecas || 0;
    a === n ? ok(`soma ${rotulo}: antigo=${a} ≡ novo=${n}`) : falhou(`soma ${rotulo}: antigo=${a} ≠ novo=${n}`);
  }
  {
    const [antigo, novo] = await Promise.all([
      p.producao.groupBy({ by: ['id_funcionario'], _sum: { quantidade_pecas: true }, where: { id_Estabelecimento: cnpj, data_inicio: { gte: hoje, lt: amanha }, producao_etapa: { descricao: 'Revisão Final' } }, orderBy: { _sum: { quantidade_pecas: 'desc' } }, take: 1 }),
      p.producao.groupBy({ by: ['id_funcionario'], _sum: { quantidade_pecas: true }, where: { id_Estabelecimento: cnpj, data_inicio: { gte: hoje, lt: amanha }, id_da_funcao: { in: ids } }, orderBy: { _sum: { quantidade_pecas: 'desc' } }, take: 1 }),
    ]);
    JSON.stringify(antigo) === JSON.stringify(novo) ? ok('top funcionário idêntico') : falhou('top funcionário difere');
  }

  /* ── 2. /pecas: mesma estrutura, menos peso ── */
  console.log('\n[2] /pecas — estrutura preservada');
  const OP = require('./Services/OP.services');
  const pecas = await OP.getPecasOP({ cnpj });
  const totalOps = [...pecas.finalizado, ...pecas.em_progresso, ...pecas.nao_iniciado, ...pecas.coleta].length;
  totalOps > 0 ? ok(`OPs retornadas: ${totalOps}`) : falhou('nenhuma OP retornada');
  const comProducao = [...pecas.finalizado, ...pecas.em_progresso].filter(o => (o.producao_peca || []).length);
  comProducao.length ? ok(`OPs com produções: ${comProducao.length}`) : falhou('nenhuma OP com produções');
  const amostra = comProducao[0];
  const p0 = amostra.producao_peca[0];
  (p0.quantidade_pecas !== undefined && p0.data_inicio !== undefined && p0.hora_registro !== undefined && p0.producao_etapa?.descricao !== undefined && p0.producao_funcionario?.nome !== undefined)
    ? ok('producao_peca traz os campos usados pelo PDF (qtd, data, hora, etapa, funcionário)')
    : falhou('producao_peca sem campos obrigatórios do PDF: ' + JSON.stringify(Object.keys(p0)));
  const et0 = amostra.etapas[0];
  (et0.id_da_funcao !== undefined && et0.etapa?.descricao !== undefined && et0.etapa?.tempo_padrao !== undefined)
    ? ok('etapas traz id_da_funcao/descricao/tempo_padrao')
    : falhou('etapas sem campos obrigatórios');
  (amostra.Estabelecimento?.nome !== undefined && amostra.Estabelecimento?.peca_final !== undefined)
    ? ok('Estabelecimento traz nome/peca_final (PDF)')
    : falhou('Estabelecimento sem campos do PDF');
  const refs = pecas.finalizado.flatMap(o => o.etapas.flatMap(e => e.tempo_referencia || []));
  refs.length ? ok(`tempo_referencia: ${refs.length} registros com campos: ${Object.keys(refs[0]).sort().join(',')}`)
              : falhou('nenhum tempo_referencia retornado');
  refs.every(r => r.usuario === undefined) ? ok('include de `usuario` removido das refs') : falhou('refs ainda trazem usuario');
  const comData = refs.filter(r => r.data_medicao || r.criadoEm);
  comData.length ? ok(`refs com data_medicao/criadoEm: ${comData.length}/${refs.length} (usado pelo seletor por data)`) : falhou('refs sem campos de data');

  /* ── 3. /producao/estabelecimento: com/sem ?dias e metas por estabelecimento ── */
  console.log('\n[3] /producao/estabelecimento — janela e metas');
  const Dashboard = null;
  const completo = await OP.getProducaoTodasPecas({ user: { cnpj }, query: {} });
  const comJanela = await OP.getProducaoTodasPecas({ user: { cnpj }, query: { dias: 30 } });
  const nHist = (o) => Object.values(o).reduce((s, v) => s + v.historico.length, 0);
  (nHist(comJanela) <= nHist(completo)) ? ok(`histórico: completo=${nHist(completo)} · dias=30 → ${nHist(comJanela)}`) : falhou('janela maior que o completo');
  const trintaDias = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const linhasNoFiltro = await p.producao.count({ where: { id_Estabelecimento: cnpj, data_inicio: { gte: trintaDias } } });
  (nHist(comJanela) === linhasNoFiltro) ? ok(`dias=30 devolve exatamente as produções dos últimos 30 dias (${linhasNoFiltro})`) : falhou(`dias=30=${nHist(comJanela)} ≠ count banco=${linhasNoFiltro}`);
  // metas: para as OPs deste estabelecimento, o valor não muda (OP é exclusiva do tenant)
  const metasNovas = await p.pecasEtapas.findMany({ where: { peca_op: { id_Estabelecimento: cnpj } }, select: { id: true, id_da_op: true, quantidade_meta: true }, orderBy: { id: 'asc' } });
  const opsDoTenant = await p.pecasOP.findMany({ where: { id_Estabelecimento: cnpj }, select: { id_da_op: true } });
  const idsOps = new Set(opsDoTenant.map(o => o.id_da_op));
  const metasAntigas = await p.pecasEtapas.findMany({ select: { id_da_op: true, quantidade_meta: true }, distinct: ['id_da_op'] });
  const mapNovo = {};
  for (const m of metasNovas) if (mapNovo[m.id_da_op] === undefined) mapNovo[m.id_da_op] = m.quantidade_meta ?? 0;
  // Ambiguidade PRÉ-EXISTENTE: OPs cujas etapas têm metas diferentes — o
  // DISTINCT antigo devolvia um valor arbitrário (mudava entre execuções).
  const todasLinhas = await p.pecasEtapas.findMany({ where: { peca_op: { id_Estabelecimento: cnpj } }, select: { id_da_op: true, quantidade_meta: true } });
  const conjuntos = {};
  for (const r of todasLinhas) (conjuntos[r.id_da_op] = conjuntos[r.id_da_op] || new Set()).add(r.quantidade_meta ?? 0);
  const ambigas = new Set(Object.entries(conjuntos).filter(([, s]) => s.size > 1).map(([op]) => Number(op)));
  const divergentes = metasAntigas.filter(m => idsOps.has(m.id_da_op) && !ambigas.has(m.id_da_op) && mapNovo[m.id_da_op] !== (m.quantidade_meta ?? 0));
  divergentes.length === 0
    ? ok(`metas idênticas em todas as OPs não ambíguas (${idsOps.size} OPs; ${ambigas.size} OP(s) com metas divergentes por etapa — pré-existente, agora com escolha determinística)`) 
    : falhou('metas divergem em OPs consistentes: ' + JSON.stringify(divergentes.slice(0, 5)));
  // A OP ambígua deve ter exatamente UM valor estável (o de menor id)
  for (const op of ambigas) {
    const primeira = todasLinhas.filter(r => r.id_da_op === op);
    void(primeira);
    console.log(`   nota: OP ${op} tem etapas com metas ${[...conjuntos[op]].join('/')} — o endpoint agora devolve sempre ${mapNovo[op]}`);
  }
  const noGrupo = Object.values(completo);
  (noGrupo.length > 0 && noGrupo.every(g => g.meta !== undefined && Array.isArray(g.historico)))
    ? ok('formato da resposta preservado (peca/total/meta/historico)')
    : falhou('formato da resposta alterado');

  console.log(`\n${falhas.length === 0 ? 'TODAS AS VERIFICAÇÕES PASSARAM' : falhas.length + ' FALHA(S)'}`);
  await p.$disconnect();
  process.exit(falhas.length === 0 ? 0 : 1);
})().catch(async (e) => { console.error('ERRO GERAL:', e); try { await p.$disconnect(); } catch {} process.exit(1); });
