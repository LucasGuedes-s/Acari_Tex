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
async function postEstoque(produto){
    
    //console.log(produto)
    //valor = produto.valor
    const produtos = await prisma.estoque.create({
        data: {
            nome_do_tecido: produto.nome,
            //valor: produto.preco,
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
    postEstoque,
}