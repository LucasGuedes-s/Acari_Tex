const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')

router.post('/adicionar/peca', ControllerOp.postOP);
router.get('/pecas', ControllerOp.getOPs);

module.exports = router;