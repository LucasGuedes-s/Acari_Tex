/**
 * relatorioProducaoRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas do módulo de Relatórios de Produção.
 *
 * GET /relatorios/producao
 *   Query params:
 *     tipo        - semanal | quinzenal | mensal | personalizado (obrigatório)
 *     dataInicial - YYYY-MM-DD (para semanal/personalizado)
 *     dataFinal   - YYYY-MM-DD (para semanal/personalizado)
 *     mes         - 1-12 (para quinzenal/mensal)
 *     ano         - YYYY (para quinzenal/mensal)
 *     quinzena    - 1 ou 2 (para quinzenal, padrão: 1)
 *
 * Exemplos:
 *   GET /relatorios/producao?tipo=semanal&dataInicial=2026-09-01&dataFinal=2026-09-07
 *   GET /relatorios/producao?tipo=quinzenal&mes=9&ano=2026&quinzena=1
 *   GET /relatorios/producao?tipo=mensal&mes=9&ano=2026
 */

const express = require('express')
const router = express.Router()
const relatorioController = require('../Controllers/relatorioProducaoController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/relatorios/producao', jwtMiddleware, relatorioController.gerarRelatorio)

module.exports = router
