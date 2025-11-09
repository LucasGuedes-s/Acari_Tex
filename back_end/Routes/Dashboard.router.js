const express = require('express');
const router = express.Router();
const ControllerNotificacoes = require('../Controllers/DashboardController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/empresa', jwtMiddleware, ControllerNotificacoes.getEmpresa);
router.get('/notificacoes', jwtMiddleware, ControllerNotificacoes.getNotificacoes);
router.put('/notificacoes/:id/lida', jwtMiddleware, ControllerNotificacoes.putNotificacaoLida); 
module.exports = router;