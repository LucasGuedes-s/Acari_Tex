const express = require('express');
const router = express.Router();
const ControllerEstoqueAgulhas = require('../Controllers/EstoqueAgulhasController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/EstoqueAgulhas', [jwtMiddleware], ControllerEstoqueAgulhas.getEstoque);
router.get('/EstoqueAgulhas/:id', [jwtMiddleware], ControllerEstoqueAgulhas.getAgulha);
router.get('/agulha/deletar/:id', [jwtMiddleware], ControllerEstoqueAgulhas.deletarAgulha);

router.post('/AdicionarAgulha', [jwtMiddleware], ControllerEstoqueAgulhas.postProduto)

module.exports = router;