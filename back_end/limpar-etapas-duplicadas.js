const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CORRECAO = {
  '13:30': { hora_registro: '08:00', horaNumero: 8 },
  '14:30': { hora_registro: '09:00', horaNumero: 9 },
  '15:30': { hora_registro: '10:00', horaNumero: 10 },
  '16:30': { hora_registro: '11:00', horaNumero: 11 }
};

async function main() {
  const inicio = new Date('2026-10-07T00:00:00.000Z');
  const fim = new Date('2026-10-07T23:59:59.999Z');

  console.log('Buscando registros de 07/10/2026...');

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

  // Processa em pequenos lotes (chunks) de 10 registros para evitar timeout da transação
  const CHUNK_SIZE = 10;
  for (let i = 0; i < registros.length; i += CHUNK_SIZE) {
    const chunk = registros.slice(i, i + CHUNK_SIZE);

    // ETAPA 1: Torna o horário único por registro (usando o ID no texto)
    const queriesTemp = chunk.map(r =>
      prisma.producao.update({
        where: { id_da_producao: r.id_da_producao },
        data: {
          hora_registro: `__TEMP_${r.id_da_producao}__`,
          horaNumero: 10000 + r.id_da_producao
        }
      })
    );
    await prisma.$transaction(queriesTemp);

    // ETAPA 2: Aplica os novos horários finais
    const queriesFinais = chunk.map(r => {
      const novo = CORRECAO[r.hora_registro];
      return prisma.producao.update({
        where: { id_da_producao: r.id_da_producao },
        data: {
          hora_registro: novo.hora_registro,
          horaNumero: novo.horaNumero
        }
      });
    });
    await prisma.$transaction(queriesFinais);
  }

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