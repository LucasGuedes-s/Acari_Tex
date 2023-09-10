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
module.exports = {
    getEstoque,
}