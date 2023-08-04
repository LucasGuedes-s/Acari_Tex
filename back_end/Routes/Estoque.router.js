const express = require('express');
const router = express.Router();
const ControllerEstoque = require('../Controllers/EstoqueController')

router.get('/Estoque/:id', ControllerEstoque.getEstoque);

module.exports = router;