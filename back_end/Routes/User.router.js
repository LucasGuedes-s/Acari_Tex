const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController')
const jwtMiddleware = require('../middlewares/auth')

router.post('/user/login', userController.login);
router.post('/user/tempo-referencia', [jwtMiddleware], userController.criarTempoReferencia);
router.post('/solicitar/alteracao-senha/:email', userController.SolicitacaoalterarSenha)
router.post('/alterar/senha', userController.alterarSenha)

module.exports = router;