const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function postPecaOP(req) {
    
    const novaPeca = await prisma.PecasOP.create({
        data: {
            status: 'Iniciado',
            descricao: req.peca.descricao || null,
            quantidade_pecas: req.peca.quantidade || null,
            pedido_por: req.peca.pedido_por || null,
            data_do_pedido: req.peca.data_do_pedido || null,
            data_de_entrega: req.peca.data_de_entrega || null,
            valor_peca: req.peca.valor_peca || null,
            Estabelecimento: {
                connect: {
                  cnpj: req.peca.id_estabelecimento, // Identificador único do Estabelecimento
                },
            }
        }
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

module.exports = {
    postPecaOP,
    getPecasOP
};
