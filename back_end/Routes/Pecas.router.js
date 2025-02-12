const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')
const jwtMiddleware = require('../middlewares/auth')

router.post('/adicionar/peca', ControllerOp.postOP);
router.get('/pecas', [jwtMiddleware], ControllerOp.getOPs);

module.exports = router;