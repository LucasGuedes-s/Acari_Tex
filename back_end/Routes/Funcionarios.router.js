const express = require('express');
const router = express.Router();
const ControllerFuncionarios = require('../Controllers/FuncionariosController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/Funcionarios', [jwtMiddleware], ControllerFuncionarios.getEquipe);
router.get('/Funcionario/:id', ControllerFuncionarios.getFuncionario);
router.get('/Producao/funcionario/:email', [jwtMiddleware], ControllerFuncionarios.getProducaoFuncionario);

router.post('/adicionar/funcionario', ControllerFuncionarios.postEquipe);

module.exports = router;