const intercorrencia = require('../Services/Intercorrencias.services');
async function postIntercorrencia(req, res, next){  
    try {
        console.log('Chegou no controller');
        const intercorrencias = await intercorrencia.postIntercorrencia(req);
        res.status(201).json({intercorrencias});
    } catch (err) {
        console.error(`Erro ao adicionar`, err.message);
        next(err);
    }
}
async function getIntercorrencias(req, res, next){  
    try {
        const intercorrencias = await intercorrencia.getIntercorrencias(req);
        res.status(200).json({intercorrencias});
    } catch (err) {
        console.error(`Erro ao obter intercorrências`, err.message);
        next(err);
    } 
}
module.exports = {
    postIntercorrencia,
    getIntercorrencias
};