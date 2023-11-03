const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getEstoque() {
    const produtos = await prisma.Estoque_Agulhas.findMany({
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

    valor = produto.valor
    const produtos = await prisma.Estoque_Agulhas.create({
        data: {
            valor: produto.valor,
            fornecedor: produto.fornecedor,
            numeracao: produto.numeracao,
            estoque: produto.estoque,
            data: data,
            notas: produto.notas
        }
    });
    //return data;
    return produtos;
}
module.exports = {
    getAgulha,
    getEstoque,
    postEstoque
    
}