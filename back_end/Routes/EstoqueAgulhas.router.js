const express = require('express');
const router = express.Router();
const ControllerEstoqueAgulhas = require('../Controllers/EstoqueAgulhasController')

router.get('/EstoqueAgulhas', ControllerEstoqueAgulhas.getEstoque);
router.post('/AdicionarAgulha', ControllerEstoqueAgulhas.postProduto)

module.exports = router;