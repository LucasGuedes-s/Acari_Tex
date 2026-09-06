/**
 * relatorioProducaoController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller do módulo de Relatórios de Produção.
 *
 * Responsabilidades:
 *   1. Receber e validar parâmetros da requisição
 *   2. Delegar ao service a geração do relatório
 *   3. Configurar headers HTTP e retornar o PDF
 */

const relatorioService = require('../Services/relatorioProducaoService')

async function gerarRelatorio(req, res) {
  try {
    const cnpj = req.user.cnpj
    console.log('CNPJ do usuário autenticado:', cnpj)

    if (!cnpj) {
      return res.status(400).json({ message: 'Estabelecimento não identificado.' })
    }

    const { tipo, dataInicial, dataFinal, mes, ano, quinzena } = req.query

    // ═══ Validações ═══
    if (!tipo) {
      return res.status(400).json({
        message: 'Parâmetro "tipo" é obrigatório. Valores aceitos: semanal, quinzenal, mensal, personalizado.',
      })
    }

    const tiposValidos = ['semanal', 'quinzenal', 'mensal', 'personalizado']
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        message: `Tipo "${tipo}" inválido. Valores aceitos: ${tiposValidos.join(', ')}.`,
      })
    }

    // Validações por tipo
    if (tipo === 'semanal' || tipo === 'personalizado') {
      if (!dataInicial || !dataFinal) {
        return res.status(400).json({
          message: `Para tipo "${tipo}", envie dataInicial e dataFinal (formato YYYY-MM-DD).`,
        })
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicial) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
        return res.status(400).json({
          message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-09-01).',
        })
      }
      if (dataInicial > dataFinal) {
        return res.status(400).json({
          message: 'dataInicial deve ser menor ou igual a dataFinal.',
        })
      }
    }

    if (tipo === 'quinzenal' || tipo === 'mensal') {
      if (!mes || !ano) {
        return res.status(400).json({
          message: `Para tipo "${tipo}", envie mes e ano (ex: mes=9&ano=2026).`,
        })
      }
      const mesNum = parseInt(mes, 10)
      const anoNum = parseInt(ano, 10)
      if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
        return res.status(400).json({ message: 'Mês inválido. Use um valor entre 1 e 12.' })
      }
      if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
        return res.status(400).json({ message: 'Ano inválido.' })
      }
    }

    if (tipo === 'quinzenal') {
      const q = parseInt(quinzena || '1', 10)
      if (q !== 1 && q !== 2) {
        return res.status(400).json({
          message: 'Quinzena inválida. Use 1 (primeira quinzena) ou 2 (segunda quinzena).',
        })
      }
    }

    // ═══ Gerar relatório ═══
    const params = { tipo, dataInicial, dataFinal, mes, ano, quinzena }
    console.log('Gerando relatório de produção com parâmetros:', params)
    const resultado = await relatorioService.gerarRelatorioProducao(cnpj, params)

    if (resultado.vazio) {
      return res.status(404).json({ message: resultado.mensagem })
    }

    // ═══ Retornar PDF ═══
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${resultado.nomeArquivo}"`)
    res.setHeader('Content-Length', resultado.pdf.length)
    res.status(200).send(resultado.pdf)
  } catch (error) {
    console.error('Erro ao gerar relatório de produção:', error)
    res.status(500).json({ message: error.message || 'Erro interno ao gerar relatório de produção.' })
  }
}

module.exports = {
  gerarRelatorio,
}
