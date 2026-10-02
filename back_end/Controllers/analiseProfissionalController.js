/**
 * analiseProfissionalController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller da Análise Individual de Profissionais.
 *
 * GET /producao/profissional/:id?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
 *
 * Segurança:
 *   - jwtMiddleware popula req.user; o CNPJ do estabelecimento vem SEMPRE de
 *     req.user.cnpj (nunca de parâmetro do frontend).
 *   - O service só retorna produção do estabelecimento informado.
 */

const analiseService = require('../Services/analiseProfissionalService')

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/

async function analisarProfissional(req, res) {
  try {
    const cnpj = req.user.cnpj
    if (!cnpj) {
      return res.status(400).json({ message: 'Estabelecimento não identificado.' })
    }

    const { id } = req.params
    if (!id || !String(id).trim()) {
      return res.status(400).json({ message: 'Identificador do profissional é obrigatório.' })
    }

    const { dataInicio, dataFim } = req.query
    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        message: 'Envie dataInicio e dataFim (formato YYYY-MM-DD).',
      })
    }
    if (!DATA_REGEX.test(dataInicio) || !DATA_REGEX.test(dataFim)) {
      return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-09-01).' })
    }
    if (dataInicio > dataFim) {
      return res.status(400).json({ message: 'dataInicio deve ser menor ou igual a dataFim.' })
    }

    const resultado = await analiseService.gerarAnaliseProfissional(
      cnpj,
      String(id).trim(),
      { dataInicio, dataFim }
    )

    // Sem produção no período também responde 200 com vazio: true — a tela
    // exibe a mensagem amigável de "sem registros".
    console.log(resultado)
    return res.status(200).json(resultado)
  } catch (error) {
    const status = error.statusCode || (error.code === 'PROFISSIONAL_NAO_ENCONTRADO' ? 404 : 500)
    if (status >= 500) {
      console.error('Erro ao gerar análise do profissional:', error)
    }
    return res.status(status).json({
      message: error.message || 'Erro interno ao gerar análise do profissional.',
    })
  }
}

module.exports = {
  analisarProfissional,
}
