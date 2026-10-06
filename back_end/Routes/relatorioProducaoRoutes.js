/**
 * relatorioProducaoRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas do módulo de Relatórios de Produção.
 *
 * GET /relatorios/producao
 *   → PDF (comportamento original preservado)
 *   Query params:
 *     tipo        - diario | semanal | quinzenal | mensal | personalizado (obrigatório)
 *     dataInicial - YYYY-MM-DD (diario/semanal/personalizado)
 *     dataFinal   - YYYY-MM-DD (semanal/personalizado)
 *     mes         - 1-12 (quinzenal/mensal)
 *     ano         - YYYY (quinzenal/mensal)
 *     quinzena    - 1 ou 2 (quinzenal, padrão: 1)
 *
 * GET /relatorios/producao/dados
 *   → JSON completo e auditável (resumo, porProfissional, porOP, porEtapa,
 *     porDia, ranking, melhor/pior dia e detalhes por lançamento).
 *   Aceita os mesmos filtros da rota de PDF.
 *
 * SEGURANÇA:
 *   - Todas as rotas protegidas pelo jwtMiddleware.
 *   - O estabelecimento vem SEMPRE de req.user.cnpj (nunca de query/body).
 *
 * Exemplos:
 *   GET /relatorios/producao?tipo=semanal&dataInicial=2026-09-01&dataFinal=2026-09-07
 *   GET /relatorios/producao?tipo=quinzenal&mes=9&ano=2026&quinzena=1
 *   GET /relatorios/producao?tipo=mensal&mes=9&ano=2026
 *   GET /relatorios/producao/dados?tipo=mensal&mes=9&ano=2026
 */

const express = require('express')
const router = express.Router()
const relatorioController = require('../Controllers/relatorioProducaoController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/relatorios/producao/dados', jwtMiddleware, relatorioController.obterRelatorioDados)
router.get('/relatorios/producao', jwtMiddleware, relatorioController.gerarRelatorio)

module.exports = router
