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
    getEstoque,
    postEstoque
}