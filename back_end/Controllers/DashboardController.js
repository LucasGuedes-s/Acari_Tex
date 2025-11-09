const Empresa = require('../Services/Dashboard.services');

async function getNotificacoes(req, res, next){
    try {
        const notific = await Empresa.getNotificacoes(req);
        res.status(200).json({notificacoes: notific.notificacoes, resumoProducao: notific.resumoProducao, melhorFuncionario: notific.melhorFuncionario});
    } catch (err) {
        console.error(`Erro ao obter notificações:`, err.message);
        next(err);
    }
}
async function putNotificacaoLida(req, res, next){
    try {
        const resultado = await Empresa.putNotificacaoLida(req);  
        res.status(200).json({message: resultado});
    } catch (err) {
        console.error(`Erro ao atualizar notificação:`, err.message);
        next(err);
    }
}
async function getEmpresa(req, res, next){
    try {
        const resultado = await Empresa.getEmpresa(req);  
        res.status(200).json({resultado});
    } catch (err) {
        console.error(`Erro ao receber dados`, err.message);
        next(err);
    }
}
module.exports = { 
    getNotificacoes,
    putNotificacaoLida,
    getEmpresa
};