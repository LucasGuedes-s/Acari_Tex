const Notificacoes = require('../Services/Dashboard.services');

async function getNotificacoes(req, res, next){
    try {
        const notific = await Notificacoes.getNotificacoes(req);
        res.status(200).json({notificacoes: notific.notificacoes, resumoProducao: notific.resumoProducao, melhorFuncionario: notific.melhorFuncionario});
    } catch (err) {
        console.error(`Erro ao obter notificações:`, err.message);
        next(err);
    }
}
module.exports = { 
    getNotificacoes
};