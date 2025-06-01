const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')
const jwtMiddleware = require('../middlewares/auth')

router.post('/adicionar/peca', [jwtMiddleware], ControllerOp.postOP);
router.get('/pecas', [jwtMiddleware], ControllerOp.getOPs);
router.get('/producao', [jwtMiddleware], ControllerOp.getProducao);

router.post('/registrar/producao', [jwtMiddleware], ControllerOp.postProducaoPeca);
router.post('/update/status', [jwtMiddleware], ControllerOp.updatePecaStatus);

module.exports = router;