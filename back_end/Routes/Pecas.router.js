const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')
const jwtMiddleware = require('../middlewares/auth')

router.post('/adicionar/peca', [jwtMiddleware], ControllerOp.postOP);
router.get('/pecas', [jwtMiddleware], ControllerOp.getOPs);
router.get('/producao/:id_da_op', [jwtMiddleware], ControllerOp.getProducao);

router.post('/registrar/producao', ControllerOp.postProducaoPeca);

module.exports = router;