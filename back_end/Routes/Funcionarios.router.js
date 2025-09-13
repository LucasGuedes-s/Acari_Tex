const express = require('express');
const router = express.Router();
const ControllerFuncionarios = require('../Controllers/FuncionariosController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/Funcionarios', [jwtMiddleware], ControllerFuncionarios.getEquipe);
router.get('/funcionario/:id', ControllerFuncionarios.getFuncionario);
router.get('/Producao/funcionario/:email', [jwtMiddleware], ControllerFuncionarios.getProducaoFuncionario);
router.get('/equipes', [jwtMiddleware], ControllerFuncionarios.getEquipes);

router.post('/adicionar/funcionario', [jwtMiddleware],  ControllerFuncionarios.postEquipe);
router.post('/funcionario/grupo', [jwtMiddleware], ControllerFuncionarios.adicionarFuncionarioAgrupo);


module.exports = router;