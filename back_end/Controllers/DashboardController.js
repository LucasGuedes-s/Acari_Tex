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

module.exports = { 
    getTarefas,
};