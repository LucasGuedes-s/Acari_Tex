const Pagamento = require('../Services/Funcionarios.services')

async function getPagamento(req, res, next){
    try {
        const pagamento = await Pagamento.getPagamento();
        res.status(200).json({pagamento:pagamento});
    } catch (err) {
        console.error(`Erro ao obter pagamento.`, err.message);
        next(err);
    }
}
module.exports = {
    getPagamento,
}