/**
 * analiseProfissionalRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas da Análise Individual de Profissionais.
 *
 * GET /producao/profissional/:id
 *   Query params:
 *     dataInicio - YYYY-MM-DD (obrigatório)
 *     dataFim    - YYYY-MM-DD (obrigatório)
 *
 * Exemplo:
 *   GET /producao/profissional/joao%40empresa.com?dataInicio=2026-09-01&dataFim=2026-09-30
 */

const express = require('express')
const router = express.Router()
const analiseController = require('../Controllers/analiseProfissionalController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/producao/profissional/:id', jwtMiddleware, analiseController.analisarProfissional)

module.exports = router
