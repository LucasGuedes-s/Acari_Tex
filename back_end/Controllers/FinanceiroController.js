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
async function deletarLancamento(req, res, next) {
    try {
        const { id } = req.params;
        const cnpj = req.user.cnpj;
        const caixa = fluxoCaixa.deletarLancamento(id, cnpj);
        res.status(200).json({ message: "Lançamento deletado com sucesso." });
    } catch (err) {
        console.error(`Erro ao deletar lançamento.`, err.message);
        next(err);
    }
}
module.exports = {
    postCaixa,
    getCaixa,
    deletarLancamento
}