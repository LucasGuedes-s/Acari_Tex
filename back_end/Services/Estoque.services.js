const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getEstoque() {
    const produtos = await prisma.estoque.findMany({
    });
    if (!produtos) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('Produto não encontrado no estoque.');
    }
    return produtos;
}
async function getTecido(id) {
    const id_tecido = parseInt(id);

    console.log('ESTOU AQUI')
    const produto = await prisma.estoque.findUnique({
        where: {
            id_do_tecido: id_tecido,
        },
    });

    if (!produto) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('Produto não encontrado no estoque.');
    }
    console.log(produto)
    return produto;
}
async function postEstoque(produto){
    
    console.log(produto);
    console.log(produto.valor);

    //valor = produto.valor
    const produtos = await prisma.estoque.create({
        data: {
            nome_do_tecido: produto.nome,
            valor: produto.valor,
            fornecedor: produto.fornecedor,
            composicao: produto.composicao,
            estoque: produto.estoque,
            largura: produto.largura,
            peso: produto.peso,
            notas: produto.notas
        }
    });
    return produtos;
}
module.exports = {
    getEstoque,
    getTecido,
    postEstoque,
}