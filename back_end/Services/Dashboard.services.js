const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getTarefas() {
    const tarefas = await prisma.Tarefas.findMany({
    });
    if (!tarefas) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('tarefas não encontrado no estoque.');
    }
    return tarefas;
}

module.exports = {
    getTarefas,
}