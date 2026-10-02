const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CORRECAO = {
  '13:30': { hora_registro: '08:00', horaNumero: 8 },
  '14:30': { hora_registro: '09:00', horaNumero: 9 },
  '15:30': { hora_registro: '10:00', horaNumero: 10 },
  '16:30': { hora_registro: '11:00', horaNumero: 11 }
};

async function main() {

  const inicio = new Date('2026-10-02T00:00:00.000Z');
  const fim = new Date('2026-10-03T00:00:00.000Z');

  console.log('Buscando registros de 02/10/2026...');

  const registros = await prisma.producao.findMany({
    where: {
      dataReferencia: {
        gte: inicio,
        lt: fim
      },
      hora_registro: {
        in: Object.keys(CORRECAO)
      }
    },
    select: {
      id_da_producao: true,
      id_funcionario: true,
      id_da_op: true,
      id_da_funcao: true,
      quantidade_pecas: true,
      hora_registro: true,
      horaNumero: true,
      tipoRegistro: true
    },
    orderBy: {
      id_da_producao: 'asc'
    }
  });

  console.log(`\nEncontrados ${registros.length} registros.`);

  if (!registros.length) {
    console.log('Nada para corrigir.');
    return;
  }

  console.log('\nREGISTROS QUE SERÃO ALTERADOS:');

  console.table(
    registros.map(r => ({
      id: r.id_da_producao,
      funcionario: r.id_funcionario,
      op: r.id_da_op,
      etapa: r.id_da_funcao,
      quantidade: r.quantidade_pecas,
      atual: r.hora_registro,
      novo: CORRECAO[r.hora_registro].hora_registro
    }))
  );

  console.log('\nIniciando correção...');

  await prisma.$transaction(async (tx) => {

    // ==========================================
    // ETAPA 1
    // Tirar os registros dos horários atuais
    // para não bater na constraint UNIQUE.
    // ==========================================

    for (const registro of registros) {
      await tx.producao.update({
        where: {
          id_da_producao: registro.id_da_producao
        },
        data: {
          hora_registro: `__CORRECAO_${registro.id_da_producao}__`,
          horaNumero: 10000 + registro.id_da_producao
        }
      });
    }

    // ==========================================
    // ETAPA 2
    // Colocar os horários corretos
    // ==========================================

    for (const registro of registros) {

      const novo = CORRECAO[registro.hora_registro];

      await tx.producao.update({
        where: {
          id_da_producao: registro.id_da_producao
        },
        data: {
          hora_registro: novo.hora_registro,
          horaNumero: novo.horaNumero
        }
      });
    }
  });

  console.log('\n====================================');
  console.log('CORREÇÃO CONCLUÍDA COM SUCESSO');
  console.log(`Registros alterados: ${registros.length}`);
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error('\nERRO AO CORRIGIR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });