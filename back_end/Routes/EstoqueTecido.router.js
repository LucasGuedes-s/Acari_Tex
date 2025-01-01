const express = require('express');
const router = express.Router();
const ControllerEstoque = require('../Controllers/EstoqueTecidoController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/tecido/estoque', [jwtMiddleware], ControllerEstoque.getEstoque);
router.get('/Estoque/:id', [jwtMiddleware], ControllerEstoque.getTecido);
router.get('/tecido/deletar/:id', [jwtMiddleware], ControllerEstoque.deletarTecido);

router.post('/AdicionarProduto', [jwtMiddleware], ControllerEstoque.postProduto)

module.exports = router;