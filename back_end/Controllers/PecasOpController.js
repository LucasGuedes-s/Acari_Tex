const pecas = require('../Services/OP.services');

async function postOP(req, res, next){  
    try {
        const novaPeca = await pecas.postPecaOP(req.body);
        res.status(200).json({novaPeca});
    } catch (err) {
        console.error(`Erro ao adicionar`, err.message);
        next(err);
    }
}
async function getOPs(req, res, next){
    try {
        const peca = await pecas.getPecasOP(req);
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao obter peças.`, err.message);
        next(err);
    }
}
module.exports = { 
    postOP, 
    getOPs
};