/**
 * Seed de dados para testes do CycleCount webhook.
 *
 * Cria:
 *   - Estabelecimento (CNPJ: 12345678)
 *   - Operador (email: maria)
 *   - OP (id: 123)
 *   - Etapas vinculadas à OP
 *
 * Uso:
 *   node seed_cyclecount_test.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CNPJ = '12345678';
const OPERATORS = ['maria', 'test@example.com'];
const OP_ID = 123;

const ETAPAS = [
  'Corte',
  'Costura lateral',
  'Revisão',
  'Etapa Final',
  'Etapa 1',
];

async function main() {
  console.log('🌱 Seed CycleCount — iniciando...\n');

  // ── 1. Estabelecimento ──
  let estab = await prisma.estabelecimento.findUnique({
    where: { cnpj: CNPJ },
  });

  if (!estab) {
    estab = await prisma.estabelecimento.create({
      data: {
        cnpj: CNPJ,
        nome: 'Linha Tex Teste',
      },
    });
    console.log(`✅ Estabelecimento criado: ${CNPJ}`);
  } else {
    console.log(`ℹ️  Estabelecimento ${CNPJ} já existe.`);
  }

  // ── 2. Operadores ──
  for (const email of OPERATORS) {
    let operador = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (!operador) {
      operador = await prisma.usuarios.create({
        data: {
          email,
          nome: email === 'maria' ? 'Maria Teste' : 'Test User',
          senha: 'placeholder',
          foto: '',
          idade: 30,
          funcoes: 'Operador',
          permissoes: 0,
          estabelecimentoCnpj: CNPJ,
        },
      });
      console.log(`✅ Operador criado: ${email}`);
    } else {
      console.log(`ℹ️  Operador ${email} já existe.`);
    }
  }

  // ── 3. Grupo de etapas ──
  let grupo = await prisma.grupoEtapas.findFirst({
    where: {
      estabelecimentoCnpj: CNPJ,
      nome: 'Produção',
    },
  });

  if (!grupo) {
    grupo = await prisma.grupoEtapas.create({
      data: {
        nome: 'Produção',
        descricao: 'Grupo padrão para testes',
        estabelecimentoCnpj: CNPJ,
      },
    });
    console.log('✅ Grupo de etapas criado.');
  } else {
    console.log('ℹ️  Grupo de etapas já existe.');
  }

  // ── 4. Etapas ──
  const etapasCriadas = [];

  for (const descricao of ETAPAS) {
    let etapa = await prisma.etapa.findFirst({
      where: {
        descricao,
        id_Estabelecimento: CNPJ,
      },
    });

    if (!etapa) {
      etapa = await prisma.etapa.create({
        data: {
          descricao,
          tempo_padrao: 1.0,
          id_Estabelecimento: CNPJ,
          grupoEtapaId: grupo.id,
        },
      });
      console.log(`✅ Etapa criada: ${descricao} (id=${etapa.id_da_funcao})`);
    } else {
      console.log(`ℹ️  Etapa "${descricao}" já existe (id=${etapa.id_da_funcao}).`);
    }

    etapasCriadas.push(etapa);
  }

  // ── 5. OP ──
  let op = await prisma.pecasOP.findFirst({
    where: {
      id_da_op: OP_ID,
      id_Estabelecimento: CNPJ,
    },
  });

  if (!op) {
    // Tentar criar com ID específico — se já existe, buscar
    try {
      op = await prisma.pecasOP.create({
        data: {
          id_da_op: OP_ID,
          id_Estabelecimento: CNPJ,
          descricao: 'Peça Teste CycleCount',
          status: 'em_producao',
          quantidade_pecas: 100,
        },
      });
      console.log(`✅ OP criada: id=${OP_ID}`);
    } catch (err) {
      // Pode ser que o ID já exista
      op = await prisma.pecasOP.findFirst({
        where: {
          id_da_op: OP_ID,
        },
      });
      if (op) {
        console.log(`ℹ️  OP ${OP_ID} já existe (pode pertencer a outro estabelecimento).`);
      } else {
        // Usar a primeira OP disponível
        op = await prisma.pecasOP.findFirst({
          where: { id_Estabelecimento: CNPJ },
        });
        if (op) {
          console.log(`ℹ️  Usando OP existente: id=${op.id_da_op}`);
        } else {
          console.error('❌ Nenhuma OP encontrada. Criando uma nova...');
          op = await prisma.pecasOP.create({
            data: {
              id_Estabelecimento: CNPJ,
              descricao: 'Peça Teste CycleCount',
              status: 'em_producao',
              quantidade_pecas: 100,
            },
          });
          console.log(`✅ OP criada: id=${op.id_da_op}`);
        }
      }
    }
  } else {
    console.log(`ℹ️  OP ${OP_ID} já existe.`);
  }

  // ── 6. Vincular etapas à OP ──
  for (const etapa of etapasCriadas) {
    const existe = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op: op.id_da_op,
          id_da_funcao: etapa.id_da_funcao,
        },
      },
    });

    if (!existe) {
      await prisma.pecasEtapas.create({
        data: {
          id_da_op: op.id_da_op,
          id_da_funcao: etapa.id_da_funcao,
          quantidade_meta: 100,
          status: 'pendente',
        },
      });
      console.log(`🔗 Etapa "${etapa.descricao}" vinculada à OP ${op.id_da_op}.`);
    } else {
      console.log(`ℹ️  Etapa "${etapa.descricao}" já vinculada à OP ${op.id_da_op}.`);
    }
  }

  console.log('\n🎉 Seed CycleCount concluído!');
  console.log(`   CNPJ: ${CNPJ}`);
  console.log(`   Operadores: ${OPERATORS.join(', ')}`);
  console.log(`   OP: ${op.id_da_op}`);
  console.log(`   Etapas: ${etapasCriadas.map(e => `${e.id_da_funcao}(${e.descricao})`).join(', ')}`);
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
