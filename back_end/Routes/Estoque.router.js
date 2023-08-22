const express = require('express');
const router = express.Router();
const ControllerEstoque = require('../Controllers/EstoqueController')

router.get('/Estoque', ControllerEstoque.getEstoque);
router.get('/Estoque/:id', ControllerEstoque.getTecido);

router.post('/AdicionarProduto', ControllerEstoque.postProduto)

module.exports = router;