const express = require('express');
const router = express.Router();
const ControllerNotificacoes = require('../Controllers/DashboardController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/empresa', jwtMiddleware, ControllerNotificacoes.getEmpresa);

/**
 * GET /dashboard/producao-evolucao
 * Evolução diária da produção (tempo padrão × referência × efetivado).
 * Query: dias (1..90, padrão 7) | dataInicio + dataFim (YYYY-MM-DD).
 */
router.get('/dashboard/producao-evolucao', jwtMiddleware, ControllerNotificacoes.getProducaoEvolucao);
router.post('/alertas/produtividade', jwtMiddleware, ControllerNotificacoes.postAlertaProdutividade);
router.get('/notificacoes', jwtMiddleware, ControllerNotificacoes.getNotificacoes);
router.put('/notificacoes/:id/lida', jwtMiddleware, ControllerNotificacoes.putNotificacaoLida); 
module.exports = router;