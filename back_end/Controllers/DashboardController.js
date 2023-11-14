const Tarefas = require('../Services/Dashboard.services');

async function getTarefas(req, res, next){  

    console.log('Get nas tarefas')
    try {
        const tarefas = await Tarefas.getTarefas();
        res.status(200).json({tarefas: tarefas});
    } catch (err) {
        console.error(`Erro ao obter as tarefas.`, err.message);
        next(err);
    }
}

async function postTarefa(req, res, next){  
    try {
        console.log(req.body)
        const tarefa = req.body.tarefa;
        const Adicionar = await Tarefas.postTarefa(tarefa);
        res.status(200).json({tarefa: Adicionar});
    } catch (err) {
        console.error(`Erro ao adicionar a tarefa.`, err.message);
        next(err);
    }
}
async function updateTarefa(req, res, next){  
    try {
        const id = req.params.id;
        
        console.log(id)
        console.log('CHEGANDO AQUI')
        const atualizar = await Tarefas.updateTarefa(id);
        res.status(200).json({tarefa: atualizar});
    } catch (err) {
        console.error(`Erro ao atualizar a tarefa.`, err.message);
        next(err);
    }
}
module.exports = { 
    updateTarefa,
    getTarefas,
    postTarefa
};