const pecas = require('../Services/OP.services');

async function postOP(req, res, next){  
    try {
        const novaPeca = await pecas.postPecaOP(req.body, req.user);
        req.io.emit('nova_peca', novaPeca); // Notifica todos os clientes conectados sobre a nova peça
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
        req.io.emit('nova_producao', peca); // Notifica todos os clientes conectados sobre a nova produção
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
async function getEstatisticasPeca(req, res, next) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ mensagem: 'ID da peça é obrigatório.' });
        }
        const estatisticas = await pecas.getEstatisticasPeca(id);
        console.log(estatisticas);
        if (!estatisticas) {
            return res.status(404).json({ mensagem: 'Nenhuma estatística encontrada para essa peça.' });
        }
        res.status(200).json({ estatisticas });
    } catch (err) {
        console.error(`Erro ao obter estatísticas da peça.`, err.message);
        next(err);
    }
}
async function deletarPeca(req, res, next) {  
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ mensagem: 'ID da peça é obrigatório.' });
        }
        const deletada = await pecas.deletarPeca(id);
        if (!deletada) {
            return res.status(404).json({ mensagem: 'Peça não encontrada.' });
        }
        res.status(200).json({ mensagem: 'Peça deletada com sucesso.', deletada });
    } catch (err) {
        console.error(`Erro ao deletar a peça.`, err.message);
        next(err);
    }
}
async function voltarPeca(req, res, next){
    try {
        const voltarPeca = await pecas.voltarPeca(req);
        res.status(200).json({voltarPeca});
    } catch (err) {
        console.error(`Erro ao voltar peça.`, err.message);
        next(err);
    }
}
module.exports = { 
    postOP, 
    getOPs,
    postProducaoPeca,
    getProducao,
    updatePecaStatus,
    getProducaoEquipe,
    getEstatisticasPeca,
    deletarPeca,
    voltarPeca
};