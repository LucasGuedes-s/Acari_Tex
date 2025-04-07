const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function postPecaOP(req, user) {
    const etapas = req.peca.etapas || [];
    const etapasIds = await Promise.all(
        etapas.map(async (descricao) => {
          const etapa = await prisma.Etapa.findUnique({
            where: {
              descricao: descricao,  // Utilizando a descrição da etapa para buscar
            },
            select: {
              id_da_funcao: true  // Garantindo que o id_da_funcao será retornado
            }
          });
          return etapa ? etapa.id_da_funcao : null;  // Retorna o id ou null se não encontrar
        })
      );
      
      // Filtrando etapas válidas (não nulas)
      const etapasValidas = etapasIds.filter(id => id !== null);
    // Criar a nova peça com as etapas conectadas
    const novaPeca = await prisma.PecasOP.create({
        data: {
            status: "Iniciado",
            descricao: req.peca.descricao || null,
            quantidade_pecas: req.peca.quantidade || null,
            pedido_por: req.peca.pedido_por || null,
            data_do_pedido: req.peca.data_do_pedido || null,
            data_de_entrega: req.peca.data_de_entrega || null,
            valor_peca: req.peca.valor_peca || null,
            Estabelecimento: {
                connect: {
                    cnpj: user.cnpj,  // Relacionamento com Estabelecimento
                },
            }
        }
    });
    await prisma.PecasEtapas.createMany({
        data: etapasIds.map((id_da_funcao) => ({
          id_da_op: novaPeca.id_da_op,  // ID da peça criada
          id_da_funcao: id_da_funcao   // ID da etapa
        }))
      });

    return novaPeca;
}


async function getPecasOP(req) {
    const pecasOp = await prisma.PecasOP.findMany({
        where: { id_Estabelecimento: req.cnpj },
        include: {
          Estabelecimento: true,
          producao_peca: true,
        },
      });
    console.log(pecasOp)
    // Se pecasOp for nulo ou undefined, retorne um array vazio ou algum erro
    if (!pecasOp) {
        return { finalizado: [], em_progresso: [], Iniciado: [], coleta: [] };
    }

    // Filtrando os resultados por status
    const finalizado = pecasOp.filter(peca => peca.status === "Finalizado");
    const em_progresso = pecasOp.filter(peca => peca.status === "Em andamento");
    const Iniciado = pecasOp.filter(peca => peca.status === "Iniciado");
    const coleta = pecasOp.filter(peca => peca.status === "Aguardando coleta");

    return {
        finalizado,
        em_progresso,
        Iniciado,
        coleta
    };
}

async function postProducaoPeca(req, res) {
  try {
    const {
      id_da_op,
      id_funcionario,
      id_da_funcao,
      quantidade_pecas,
      data_inicio,
      data_fim,
      id_Estabelecimento
    } = req.body

    // Verificar se a Etapa está associada à OP
    const etapaRelacionada = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op,
          id_da_funcao,
        }
      }
    })

    if (!etapaRelacionada) {
      return res.status(400).json({ error: "A etapa informada não está relacionada com essa OP." })
    }

    // Criar registro de produção
    const producao = await prisma.producao.create({
      data: {
        id_da_op,
        id_funcionario,
        id_Estabelecimento,
        quantidade_pecas,
        data_inicio
       }
    })

    return producao;

  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Erro ao registrar a produção." })
  }
}

module.exports = {
    postPecaOP,
    getPecasOP,
    postProducaoPeca,
};
