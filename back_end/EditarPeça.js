import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function editarQuantidadePecasOP(id_da_op, id_Estabelecimento, novaQuantidade) {
  try {
    const resultado = await prisma.$transaction(async (tx) => {
    const quantidadeFinal = Math.floor(Number(novaQuantidade));

        if (isNaN(quantidadeFinal)) {
        throw new Error('Quantidade inválida');
        }

      // 1️⃣ Atualiza a OP
      const opAtualizada = await tx.pecasOP.update({
        where: {
          id_da_op: id_da_op,
          id_Estabelecimento: id_Estabelecimento,
        },
        data: {
          quantidade_pecas: quantidadeFinal,
        },
      });
      console.log(opAtualizada);
      // 2️⃣ Atualiza todas as etapas da OP
      const etapasAtualizadas = await tx.pecasEtapas.updateMany({
        where: {
          id_da_op: id_da_op,
        },
        data: {
          quantidade_meta: quantidadeFinal,
        },
      });
      const conferindo = await prisma.pecasEtapas.findMany({
        where: { id_da_op: 62 },
        select: {
            id: true,
            quantidade_meta: true,
        },
        });

        console.log(conferindo);

      console.log(`OP ${id_da_op} atualizada para ${novaQuantidade} peças. Etapas atualizadas: ${etapasAtualizadas.count}`);
      return {
        opAtualizada,
        etapasAtualizadas,
      };
    });

    return resultado;

  } catch (error) {
    console.error('Erro ao editar quantidade da OP e etapas:', error);
    throw error;
  }
}

editarQuantidadePecasOP(62, "12.373.991/0001-37", 3560)