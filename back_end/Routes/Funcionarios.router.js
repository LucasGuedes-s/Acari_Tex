const express = require('express');
const router = express.Router();
const ControllerFuncionarios = require('../Controllers/FuncionariosController')
const jwtMiddleware = require('../middlewares/auth')
const permissao = require('../Services/permissoes.services.js')

router.get('/Funcionarios', [jwtMiddleware, permissao.getProfissionais], ControllerFuncionarios.getEquipe);
router.get('/funcionario/:id', [jwtMiddleware, permissao.getProfissionais], ControllerFuncionarios.getFuncionario);
router.get('/Producao/funcionario/:email', [jwtMiddleware], ControllerFuncionarios.getProducaoFuncionario);
router.get('/equipes', [jwtMiddleware, permissao.getProfissionais], ControllerFuncionarios.getEquipes);


router.post('/registrar/tempo', [jwtMiddleware], ControllerFuncionarios.tempoDeProducao)
router.post('/adicionar/funcionario', [jwtMiddleware, permissao.postProfissionais],  ControllerFuncionarios.postEquipe);
router.post('/funcionario/grupo', [jwtMiddleware], ControllerFuncionarios.adicionarFuncionarioAgrupo);
router.post('/funcionarios/mover', [jwtMiddleware, permissao.postProfissionais], ControllerFuncionarios.moverFuncionario);

module.exports = router;