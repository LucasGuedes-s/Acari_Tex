const express = require('express');
const router = express.Router();
const relatoriosController = require('../Controllers/RelatoriosController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/financeiro', jwtMiddleware, relatoriosController.financeiro);

module.exports = router;