const pecas = require('../Services/OP.services');
const Estatisticas = require('../Controllers/EstatisticasController');
async function postOP(req, res, next){  
    try {
        const novaPeca = await pecas.postPecaOP(req.body, req.user);
        req.io.emit(`nova_atualizacao_${req.user.cnpj}`, novaPeca); // Notifica todos os clientes conectados sobre a nova peça
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
        Estatisticas.estatisticasEquipe(req, req.body.id_funcionario).catch(err => {
            console.error("Erro ao atualizar estatísticas:", err);
        });
        req.io.emit(`nova_atualizacao_${req.user.cnpj}`, peca);
        res.status(200).json({peca});
    } catch (err) {
        try {
            const parsed = JSON.parse(err.message);
            return res.status(400).json(parsed);
        } catch {
            // se não for JSON
            return res.status(400).json({ error: err.message });
        }
    }
}
async function postProducaoPecaLote(req, res, next){
    try {
        const resultado = await pecas.postProducaoPecaLote(req);
        res.status(200).json({ registros: resultado.registros });
    } catch (err) {
        console.error("Erro ao registrar produção em lote:", err);
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
        //console.log(producao);
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
        next(err);
    }
}

async function getEtapas(req, res, next) {
    try{
        const etapas = await pecas.getEtapas(req);
        res.status(200).json({ etapas });
    }
    catch (err) {
        console.error(`Erro ao receber etapas.`, err.message);
        next(err);
    }
}

async function postEtapa(req, res, next) {
    try{
        const etapa = await pecas.postEtapa(req);
        res.status(200).json({ etapa });
    }
    catch (err) {
        console.error(`Erro ao cadastrar etapa.`, err.message);
        next(err);
    }
}
async function postEtapaPeca(req, res, next) {
    try{
        const etapa = await pecas.postEtapaPeca(req);
        res.status(200).json({ etapa });
    }
    catch (err) {
        console.error(`Erro ao cadastrar etapa a peça.`, err.message);
        next(err);
    }
}
async function getEtapasEstabelecimento(req, res, next) {
    try{
        const etapa = await pecas.getEtapasEstabelecimento(req);
        res.status(200).json({ etapa });
    }
    catch (err) {
        console.error(`Erro ao encontrar etapas.`, err.message);
        next(err);
    }
}
async function getEficiencia(req, res, next) {
    try {
        const eficiencia = await pecas.getEficiencia(req);
        res.status(200).json({ eficiencia });
    } catch (err) {
        console.error(`Erro ao obter eficiência da peça.`, err.message);
        next(err);
    }
}
async function getProducaoPorPeca(req, res, next) {
    try {
        const producao = await pecas.getProducaoPorPeca(req);
        res.status(200).json({ producao });
    } catch (err) {
        console.error(`Erro ao obter produção por peça.`, err.message);
        next(err);
    } 
}
async function getProducaoEstabelecimento(req, res, next) {
    try {
        const producao = await pecas.getProducaoTodasPecas(req);
        res.status(200).json({ producao });
    } catch (err) {
        console.error(`Erro ao obter produção por estabelecimento.`, err.message);
        next(err);
    }  
}
async function deletarEtapa(req, res, next) {  
    try {
        const { id } = req.params;
        console.log("ID recebido para deleção:", id);
        if (!id) {
            return res.status(400).json({ mensagem: 'ID da etapa é obrigatório.' });
        }  
        const deletada = await pecas.deletarEtapa(id);
        if (!deletada) {
            return res.status(404).json({ mensagem: 'Etapa não encontrada.' });
        }  
        res.status(200).json({ mensagem: 'Etapa deletada com sucesso.', deletada });
    } catch (err) {
        console.error(`Erro ao deletar a etapa.`, err.message);
        next(err);
    }
}
module.exports = { 
    postOP, 
    getOPs,
    postProducaoPeca,
    postProducaoPecaLote,
    getProducao,
    updatePecaStatus,
    getProducaoEquipe,
    getEstatisticasPeca,
    deletarPeca,
    voltarPeca,
    getEtapas,
    getEtapasEstabelecimento,
    postEtapa,
    postEtapaPeca,
    getEficiencia,
    getProducaoPorPeca,
    getProducaoEstabelecimento,
    deletarEtapa
};