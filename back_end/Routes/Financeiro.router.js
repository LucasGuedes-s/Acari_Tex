const express = require('express');
const router = express.Router();
const financeiro = require('../Controllers/FinanceiroController');
const jwtMiddleware = require('../middlewares/auth')

router.post('/caixa', jwtMiddleware, financeiro.postCaixa);
router.get('/fluxo/caixa', jwtMiddleware, financeiro.getCaixa);

module.exports = router;