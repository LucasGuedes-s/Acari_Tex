/* Diagnóstico temporário v2 — somente leitura. Apagar após uso. */
require('dotenv').config();
const prismaModule = require('@prisma/client');
const Original = PrismaClientRef();
function PrismaClientRef() { return prismaModule.PrismaClient; }

// Intercepta TODOS os `new PrismaClient()` dos services para registrar a
// duração de cada consulta (diagnóstico apenas — nada é gravado no banco).
const registros = [];
class LoggedPrisma extends Original {
  constructor(opts = {}) {
    super({ ...opts, log: [...(opts.log || []), { emit: 'event', level: 'query' }] });
    try {
      this.$on('query', (e) => registros.push({ ms: e.duration, q: String(e.query).replace(/\s+/g, ' ').slice(0, 110) }));
    } catch (e) { /* ignore */ }
  }
}
let okPatch = false;
try {
  Object.defineProperty(prismaModule, 'PrismaClient', { value: LoggedPrisma, configurable: true });
  okPatch = prismaModule.PrismaClient === LoggedPrisma;
} catch (e) { /* ignore */ }
console.log('patch de log de queries:', okPatch ? 'ativo' : 'FALHOU (só totais)');

const ms = () => Number(process.hrtime.bigint() / 1000000n);

async function medir(nome, fn) {
  registros.length = 0;
  const t0 = ms();
  let bytes = 0;
  try {
    const r = await fn();
    bytes = Buffer.byteLength(JSON.stringify(r || ''), 'utf8');
  } catch (e) {
    console.log(`${nome}: FALHOU após ${ms() - t0} ms — ${e.message.slice(0, 160)}`);
    return;
  }
  const t1 = ms();
  const total = registros.reduce((s, r) => s + r.ms, 0);
  console.log(`\n### ${nome}: total ${t1 - t0} ms · ${registros.length} consultas Prisma (${total} ms somados) · ${bytes} bytes JSON`);
  const porQuery = {};
  for (const r of registros) {
    const base = r.q.replace(/\d{4}-\d{2}-\d{2}[^,)]*/g, '<data>').slice(0, 80);
    porQuery[base] = porQuery[base] || { n: 0, ms: 0 };
    porQuery[base].n++; porQuery[base].ms += r.ms;
  }
  Object.entries(porQuery).sort((a, b) => b[1].ms - a[1].ms).slice(0, 6)
    .forEach(([q, v]) => console.log(`   ${String(v.ms).padStart(6)} ms (${v.n}x)  ${q}`));
}

(async () => {
  const p = new Original();
  const porTenant = await p.producao.groupBy({ by: ['id_Estabelecimento'], _count: { _all: true } });
  porTenant.sort((a, b) => b._count._all - a._count._all);
  const cnpj = porTenant[0].id_Estabelecimento;
  await p.$queryRawUnsafe('SELECT 1'); // aquece a pool default
  await p.$disconnect();

  const Dashboard = require('./Services/Dashboard.services');
  const Relatorios = require('./Services/Relatorios.services');
  const OP = require('./Services/OP.services');

  await medir('/notificacoes (getNotificacoes)', () => Dashboard.getNotificacoes({ user: { cnpj } }));
  await medir('/producao/resumo (relatorioProducaoResumo)', () => Relatorios.relatorioProducaoResumo({ user: { cnpj }, query: {} }));
  await medir('/producao/estabelecimento (getProducaoTodasPecas)', () => OP.getProducaoTodasPecas({ user: { cnpj } }));
  await medir('/pecas (getPecasOP)', () => OP.getPecasOP({ cnpj }));

  process.exit(0);
})().catch(async (e) => { console.error('ERRO GERAL:', e.message); process.exit(1); });
