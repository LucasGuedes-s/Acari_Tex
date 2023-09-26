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

async function postTarefa(tarefa) {
    console.log(tarefa);

    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    console.log('Adicionando tarefa')

    //valor = produto.valor
    const tarefas = await prisma.Tarefas.create({
        data: {
            tarefa: tarefa.tarefa,
            status: 'Em andamento',
            data_abertura: data,
            notas: tarefa.notas
        }
    });
    
    return tarefas;
}

module.exports = {
    getTarefas,
    postTarefa
}