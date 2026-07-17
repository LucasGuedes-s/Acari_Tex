const { isEtapaFinal } = require('./utils/etapaFinal')

async function atualizarStatusOps() {

  const ops = await prisma.pecasOP.findMany({
    where: {
      status: {
        not: 'Concluída'
      }
    },
    include: {
      etapas: {
        include: {
          etapa: true
        }
      }
    }
  })

  for (const op of ops) {

    const etapasFinais = op.etapas.filter(e =>
      isEtapaFinal(e.etapa.descricao)
    )

    if (!etapasFinais.length)
      continue

    const idsEtapas = etapasFinais.map(e => e.id_da_funcao)

    const producao = await prisma.producao.aggregate({
      where: {
        id_da_op: op.id_da_op,
        id_da_funcao: {
          in: idsEtapas
        }
      },
      _sum: {
        quantidade_pecas: true
      }
    })

    const produzido = producao._sum.quantidade_pecas || 0

    const percentual = produzido / op.quantidade_pecas

    if (percentual >= 0.98) {

      await prisma.$transaction([

        prisma.pecasOP.update({
          where: {
            id_da_op: op.id_da_op
          },
          data: {
            status: 'Concluída'
          }
        }),

        prisma.pecasEtapas.updateMany({
          where: {
            id_da_op: op.id_da_op
          },
          data: {
            status: 'Concluída'
          }
        })

      ])

    }

  }

}