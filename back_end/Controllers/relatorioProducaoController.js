/**
 * relatorioProducaoController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller do módulo de Relatórios de Produção.
 *
 * Responsabilidade: receber → validar → chamar service → responder.
 * Nenhuma regra de cálculo aqui — tudo em Services/relatorioProducaoService.js.
 *
 * SEGURANÇA / MULTI-TENANCY:
 *   - O estabelecimento vem SEMPRE de req.user.cnpj (token JWT).
 *   - Qualquer cnpj/id_Estabelecimento vindo de query/body é IGNORADO.
 */

const relatorioService = require('../Services/relatorioProducaoService')

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIPOS_VALIDOS = ['diario', 'semanal', 'quinzenal', 'mensal', 'personalizado']

/**
 * Valida os parâmetros de período.
 * Retorna { ok: true, params } ou { ok: false, status, message }.
 */
function validarParametros(query) {
  const tipo = query.tipo

  if (!tipo) {
    return {
      ok: false,
      status: 400,
      message:
        'Parâmetro "tipo" é obrigatório. Valores aceitos: diario, semanal, quinzenal, mensal, personalizado.',
    }
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return {
      ok: false,
      status: 400,
      message: `Tipo "${tipo}" inválido. Valores aceitos: ${TIPOS_VALIDOS.join(', ')}.`,
    }
  }

  const { dataInicial, dataFinal, mes, ano, quinzena } = query

  if (tipo === 'diario') {
    if (!dataInicial) {
      return {
        ok: false,
        status: 400,
        message: 'Para tipo "diario", envie dataInicial (formato YYYY-MM-DD).',
      }
    }
    if (!DATA_REGEX.test(dataInicial)) {
      return { ok: false, status: 400, message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-09-01).' }
    }
  }

  if (tipo === 'semanal' || tipo === 'personalizado') {
    if (!dataInicial || !dataFinal) {
      return {
        ok: false,
        status: 400,
        message: `Para tipo "${tipo}", envie dataInicial e dataFinal (formato YYYY-MM-DD).`,
      }
    }
    if (!DATA_REGEX.test(dataInicial) || !DATA_REGEX.test(dataFinal)) {
      return { ok: false, status: 400, message: 'Formato de data inválido. Use YYYY-MM-DD (ex: 2026-09-01).' }
    }
    if (dataInicial > dataFinal) {
      return { ok: false, status: 400, message: 'dataInicial deve ser menor ou igual a dataFinal.' }
    }
  }

  if (tipo === 'quinzenal' || tipo === 'mensal') {
    if (!mes || !ano) {
      return {
        ok: false,
        status: 400,
        message: `Para tipo "${tipo}", envie mes e ano (ex: mes=9&ano=2026).`,
      }
    }
    const mesNum = parseInt(mes, 10)
    const anoNum = parseInt(ano, 10)
    if (isNaN(mesNum) || String(mesNum) !== String(mes).trim() || mesNum < 1 || mesNum > 12) {
      return { ok: false, status: 400, message: 'Mês inválido. Use um valor entre 1 e 12.' }
    }
    if (isNaN(anoNum) || String(anoNum) !== String(ano).trim() || anoNum < 2000 || anoNum > 2100) {
      return { ok: false, status: 400, message: 'Ano inválido.' }
    }
  }

  if (tipo === 'quinzenal') {
    const q = parseInt(quinzena || '1', 10)
    if (q !== 1 && q !== 2) {
      return {
        ok: false,
        status: 400,
        message: 'Quinzena inválida. Use 1 (primeira quinzena) ou 2 (segunda quinzena).',
      }
    }
  }

  return { ok: true, params: { tipo, dataInicial, dataFinal, mes, ano, quinzena } }
}

/**
 * Converte erros com statusCode (do service) em respostas HTTP adequadas.
 */
function responderErro(error, res, acao) {
  const status = error.statusCode || 500

  if (status >= 500) {
    console.error(`Erro ao ${acao}:`, error)
  }

  return res.status(status).json({
    message: error.message || `Erro interno ao ${acao}.`,
  })
}

/**
 * GET /relatorios/producao/dados
 * Retorna o relatório COMPLETO em JSON: resumo, porProfissional, porOP,
 * porEtapa, porDia e detalhes auditáveis por lançamento.
 */
async function obterRelatorioDados(req, res) {
  try {
    const cnpj = req.user?.cnpj
    if (!cnpj) {
      return res.status(400).json({ message: 'Estabelecimento não identificado no token.' })
    }

    const validacao = validarParametros(req.query)
    if (!validacao.ok) {
      return res.status(validacao.status).json({ message: validacao.message })
    }

    const resultado = await relatorioService.gerarRelatorioCompleto(cnpj, validacao.params)

    return res.status(200).json(resultado)
  } catch (error) {
    return responderErro(error, res, 'gerar relatório de produção (dados)')
  }
}

/**
 * GET /relatorios/producao
 * Gera e retorna o PDF do relatório (mesmos números do JSON).
 */
async function gerarRelatorio(req, res) {
  try {
    const cnpj = req.user?.cnpj
    if (!cnpj) {
      return res.status(400).json({ message: 'Estabelecimento não identificado no token.' })
    }

    const validacao = validarParametros(req.query)
    if (!validacao.ok) {
      return res.status(validacao.status).json({ message: validacao.message })
    }

    const resultado = await relatorioService.gerarRelatorioProducao(cnpj, validacao.params)

    if (resultado.vazio) {
      return res.status(404).json({ message: resultado.mensagem })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${resultado.nomeArquivo}"`)
    res.setHeader('Content-Length', resultado.pdf.length)
    return res.status(200).send(resultado.pdf)
  } catch (error) {
    return responderErro(error, res, 'gerar relatório de produção (PDF)')
  }
}

module.exports = {
  obterRelatorioDados,
  gerarRelatorio,
  // Exportado para testes
  validarParametros,
}
