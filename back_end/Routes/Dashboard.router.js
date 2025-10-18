const express = require('express');
const router = express.Router();
const ControllerNotificacoes = require('../Controllers/DashboardController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/notificacoes', jwtMiddleware, ControllerNotificacoes.getNotificacoes);
module.exports = router;