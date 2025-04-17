const pecas = require('../Services/OP.services');

async function postOP(req, res, next){  
    try {
        const novaPeca = await pecas.postPecaOP(req.body, req.user);
        res.status(201).json({novaPeca});
    } catch (err) {
        console.error(`Erro ao adicionar`, err.message);
        next(err);
    }
}
async function getOPs(req, res, next){
    try {

        const peca = await pecas.getPecasOP(req.user);
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao obter peças.`, err.message);
        next(err);
    }
}

async function postProducaoPeca(req, res, next){
    try {
        const peca = await pecas.postProducaoPeca(req);
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao cadastrar produção de peças.`, err.message);
        next(err);
    }
}
async function getProducao(req, res, next){
    try {
        const peca = await pecas.getEtapasProducaoPorPeca(req.params.id_da_op);
        if (!peca) {
            return res.status(404).json({ mensagem: 'Nenhuma produção encontrada para essa peça.' });
        }
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao cadastrar produção de peças.`, err.message);
        next(err);
    }
}
module.exports = { 
    postOP, 
    getOPs,
    postProducaoPeca,
    getProducao
};