const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getTarefas() {
    const status = 'Em andamento'
    const tarefas = await prisma.Tarefas.findMany({
        where:{
            id_estabelecimento: 12824002,
            status: status
        }
    });
    if (!tarefas) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('tarefas não encontrado no estoque.');
    }
    return tarefas;
}

async function postTarefa(tarefa) {
    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    estabelecimentoId = 12824002

   //console.log(`Adicionando tarefa, ${tarefa}`)

    const tarefas = await prisma.Tarefas.create({
        data: {
            tarefa: tarefa.tarefa,
            status: 'Em andamento',
            data_abertura: data,
            notas: tarefa.notas,
            estabelecimento: {
                connect: { cnpj: estabelecimentoId } // Conectar ao Estabelecimento existente pelo ID
            }
        }
    });
    return tarefas;
}

async function updateTarefa(id) {
    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    const id_da_tarefa = parseInt(id);

   //console.log(`Adicionando tarefa, ${tarefa}`)

    const tarefas = await prisma.Tarefas.update({
        where:{
            id: id_da_tarefa
        },
        data: {
            status: 'Concluida',
            data_conclusao: data,
        }
    });
    console.log('tarefa alterada com sucesso')
    
    return tarefas;
}
module.exports = {
    updateTarefa,
    getTarefas,
    postTarefa
}