const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getEstoque() {
    const produtos = await prisma.Estoque_Agulhas.findMany({
        where:{
            id_estabelecimento: 12824002,

        }
    });
    if (!produtos) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('Produto não encontrado no estoque.');
    }
    return produtos;
}

async function getAgulha(id) {
    const id_agulha = parseInt(id);

    //console.log('ESTOU AQUI')
    
    const produto = await prisma.Estoque_Agulhas.findUnique({
        where: {
            id_da_agulha: id_agulha,
        },
    });

    if (!produto) {
        throw new Error('Produto não encontrado no estoque.');
    }
    //console.log(produto)
    return produto;
}
async function postEstoque(produto){
    
    console.log(produto);
    console.log(produto.valor);
    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    estabelecimentoId = 12824002

    valor = produto.valor
    const produtos = await prisma.Estoque_Agulhas.create({
        data: {
            valor: produto.valor,
            fornecedor: produto.fornecedor,
            numeracao: produto.numeracao,
            estoque: produto.estoque,
            data: data,
            notas: produto.notas,
            estabelecimento: {
                connect: { cnpj: estabelecimentoId } // Conectar ao Estabelecimento existente pelo ID
            }
        }
    });
    return produtos;
}

async function DeleteProduto(id){
    console.log(id);
    const id_agulha = parseInt(id);

    try {
        const produtoDeletado = await prisma.Estoque_Agulhas.delete({
          where: {
            id_da_agulha: id_agulha,
          }
        });

        console.log('Agulha deletada:', produtoDeletado);
    }catch (error) {
        console.error('Erro ao deletar a agulha:', error);
    }
}
module.exports = {
    getAgulha,
    getEstoque,
    postEstoque,
    DeleteProduto
    
}