const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')
const jwtMiddleware = require('../middlewares/auth')
//const permissao = require('../Services/permissoes.services.js')

router.post('/adicionar/peca', [jwtMiddleware], ControllerOp.postOP);
router.get('/pecas', [jwtMiddleware], ControllerOp.getOPs);
router.get('/producao', [jwtMiddleware], ControllerOp.getProducao);
router.get('/producao/equipe', [jwtMiddleware],  ControllerOp.getProducaoEquipe);
router.get('/estatisticas/:id', [jwtMiddleware], ControllerOp.getEstatisticasPeca);
router.get('/producao/equipe/dia', [jwtMiddleware], ControllerOp.getProducaoEquipeDia);
router.get('/etapas', [jwtMiddleware], ControllerOp.getEtapas)
router.get('/eficiencia', [jwtMiddleware], ControllerOp.getEficiencia)

router.post('/adicionar/etapa', [jwtMiddleware], ControllerOp.postEtapa)
router.post('/registrar/producao', [jwtMiddleware], ControllerOp.postProducaoPeca);
router.post('/update/status', [jwtMiddleware], ControllerOp.updatePecaStatus);
router.post('/deletar/peca/:id', [jwtMiddleware], ControllerOp.deletarPeca);

router.post('/voltar/peca', [jwtMiddleware], ControllerOp.voltarPeca);
module.exports = router;