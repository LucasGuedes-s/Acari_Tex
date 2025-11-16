const express = require('express');
const router = express.Router();
const intercorrenciasController = require('../Controllers/IntercorrenciasController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/intercorrencias', jwtMiddleware, intercorrenciasController.getIntercorrencias);
router.post('/intercorrencias', jwtMiddleware, intercorrenciasController.postIntercorrencia);
module.exports = router;