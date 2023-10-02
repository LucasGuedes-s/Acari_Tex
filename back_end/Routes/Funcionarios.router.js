const express = require('express');
const router = express.Router();
const ControllerFuncionarios = require('../Controllers/FuncionariosController')

router.get('/Funcionarios', ControllerFuncionarios.getEquipe);
router.get('/Funcionario/:id', ControllerFuncionarios.getFuncionario);

router.post('/AdicionarFuncionario', ControllerFuncionarios.postEquipe);

module.exports = router;