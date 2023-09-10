const express = require('express');
const router = express.Router();
const ControllerEstoque = require('../Controllers/EstoqueTecidoController')

router.get('/Estoque', ControllerEstoque.getEstoque);
router.get('/Estoque/:id', ControllerEstoque.getTecido);
router.get('/Deletar/:id', ControllerEstoque.deletarTecido);

router.post('/AdicionarProduto', ControllerEstoque.postProduto)

module.exports = router;