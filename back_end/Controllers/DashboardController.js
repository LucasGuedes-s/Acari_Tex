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
async function postAlertaProdutividade(req, res, next){
 try {
    const {
      estabelecimento,
      funcionarioId,
      funcionarioNome,
      opId,
      etapaId,
      etapaNome,
      eficiencia,
      tempoUtilizado,
      tempoPadrao,
      tempoReferencia,
      quantidadeProduzida,
      tipo,
    } = req.body

    // ── Validações ──
    if (!estabelecimento) {
      return res.status(400).json({ sucesso: false, mensagem: 'Estabelecimento é obrigatório.' })
    }
    if (!funcionarioId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Funcionário é obrigatório.' })
    }
    if (!etapaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Etapa é obrigatória.' })
    }
    if (eficiencia == null || Number.isNaN(Number(eficiencia))) {
      return res.status(400).json({ sucesso: false, mensagem: 'Eficiência inválida.' })
    }
    if (!tempoUtilizado || Number(tempoUtilizado) <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Tempo utilizado inválido.' })
    }
    if (tipo && tipo !== 'baixa_produtividade') {
      return res.status(400).json({ sucesso: false, mensagem: 'Tipo de alerta não suportado.' })
    }

    const notificacao = await Empresa.registrarAlertaProdutividade({
      estabelecimentoCnpj: estabelecimento,
      funcionarioId,
      funcionarioNome,
      opId,
      etapaNome,
      eficiencia: Number(eficiencia),
      tempoUtilizado: Number(tempoUtilizado),
      tempoPadrao: tempoPadrao != null ? Number(tempoPadrao) : null,
      tempoReferencia: tempoReferencia != null ? Number(tempoReferencia) : null,
      quantidadeProduzida: Number(quantidadeProduzida || 0),
    })

    return res.status(201).json({ sucesso: true, notificacao })
  } catch (err) {
    console.error('Erro ao registrar alerta de produtividade:', err)
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao registrar alerta de produtividade.' })
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
    postAlertaProdutividade,
    getNotificacoes,
    putNotificacaoLida,
    getEmpresa
};