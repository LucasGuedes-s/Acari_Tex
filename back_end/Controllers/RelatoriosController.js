const relatorios = require('../Services/Relatorios.services');

async function financeiro(req, res) {
    try {
        const dadosFinanceiros = await relatorios.relatorioFinanceiro(req);
        res.status(200).json(dadosFinanceiros);
    } catch (error) {
        console.error('Erro ao gerar relatório financeiro:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório financeiro' });
    }
}

module.exports = {
    financeiro
};