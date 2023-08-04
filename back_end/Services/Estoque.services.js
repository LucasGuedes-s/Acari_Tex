const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getEstoque(id) {
    const id_tecido = parseInt(id)

    const produtos = await prisma.estoque.findFirst({
        where: {
            id_do_tecido: id_tecido,
        }
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