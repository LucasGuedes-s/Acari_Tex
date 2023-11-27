const express = require('express');
const router = express.Router();
const ControllerEstoqueAgulhas = require('../Controllers/EstoqueAgulhasController')

router.get('/EstoqueAgulhas', ControllerEstoqueAgulhas.getEstoque);
router.get('/EstoqueAgulhas/:id', ControllerEstoqueAgulhas.getAgulha);
router.get('/agulha/deletar/:id', ControllerEstoqueAgulhas.deletarAgulha);

router.post('/AdicionarAgulha', ControllerEstoqueAgulhas.postProduto)

module.exports = router;