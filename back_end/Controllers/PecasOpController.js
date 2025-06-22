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
        //console.log(`Dados recebidos para produção de peça:`, req.body);
        const peca = await pecas.postProducaoPeca(req);
        //console.log(`Produção de peça cadastrada com sucesso:`, peca);
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao cadastrar produção de peças.`, err.message);
        next(err);
    }
}
async function getProducao(req, res, next){
    try {
        const peca = await pecas.getEtapasProducaoPorEstabelecimento(req.user);
        if (!peca) {
            return res.status(404).json({ mensagem: 'Nenhuma produção encontrada para essa peça.' });
        }
        res.status(200).json({peca});
    } catch (err) {
        console.error(`Erro ao cadastrar produção de peças.`, err.message);
        next(err);
    }
}
async function updatePecaStatus(req, res, next){
    try {
        const { id_da_op, status } = req.body;
        console.log(`ID da OP: ${id_da_op}, Novo Status: ${status}`);
        if (!id_da_op || !status) {
            return res.status(400).json({ mensagem: 'ID da OP e novo status são obrigatórios.' });
        }
        const updatePeca = await pecas.updatePecaStatus(id_da_op, status);
        if (!updatePeca) {
            return res.status(404).json({ mensagem: 'Nenhuma produção encontrada para essa peça.' });
        }
        res.status(200).json({updatePeca});
    } catch (err) {
        console.error(`Erro ao cadastrar produção de peças.`, err.message);
        next(err);
    }
}
async function getProducaoEquipe(req, res, next) {
    try {
        const producao = await pecas.getProducaoEquipe(req);
        res.status(200).json({ producao });
    } catch (err) {
        console.error(`Erro ao obter produção.`, err.message);
        next(err);
    }
}
module.exports = { 
    postOP, 
    getOPs,
    postProducaoPeca,
    getProducao,
    updatePecaStatus,
    getProducaoEquipe
};