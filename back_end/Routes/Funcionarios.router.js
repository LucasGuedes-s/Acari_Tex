const express = require('express');
const router = express.Router();
const ControllerFuncionarios = require('../Controllers/FuncionariosController')

router.get('/Funcionarios', ControllerFuncionarios.getEquipe);

module.exports = router;