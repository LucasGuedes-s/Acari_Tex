const fluxoCaixa = require('../Services/Financeiro.services')

async function postCaixa(req, res, next){
    try {
        const caixa = await fluxoCaixa.postCaixa(req);
        res.status(200).json({caixa:caixa});
    } catch (err) {
        console.error(`Erro ao obter caixa.`, err.message);
        next(err);
    }
}
async function getCaixa(req, res, next){
    try {
        const caixa = await fluxoCaixa.getCaixa(req);
        res.status(200).json({caixa:caixa});
    } catch (err) {
        console.error(`Erro ao obter caixa.`, err.message);
        next(err);
    }
}
module.exports = {
    postCaixa,
    getCaixa
}