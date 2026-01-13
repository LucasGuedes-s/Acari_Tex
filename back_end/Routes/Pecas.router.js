const express = require('express');
const router = express.Router();
const ControllerOp = require('../Controllers/PecasOpController')
const jwtMiddleware = require('../middlewares/auth')
//const permissao = require('../Services/permissoes.services.js')

router.post('/adicionar/peca', [jwtMiddleware], ControllerOp.postOP);
router.get('/pecas', [jwtMiddleware], ControllerOp.getOPs);
router.get('/producao', [jwtMiddleware], ControllerOp.getProducao);
router.get('/producao/equipe', [jwtMiddleware],  ControllerOp.getProducaoEquipe);
router.get('/producao/pecas', [jwtMiddleware],  ControllerOp.getProducaoPorPeca);
router.post('/producao/lote', [jwtMiddleware],  ControllerOp.postProducaoPecaLote);
router.get('/producao/estabelecimento', [jwtMiddleware],  ControllerOp.getProducaoEstabelecimento);

router.post('/adicionar/etapa/grupo', [jwtMiddleware], ControllerOp.postGrupoEtapa);
router.get('/estatisticas/:id', [jwtMiddleware], ControllerOp.getEstatisticasPeca);
router.get('/etapas', [jwtMiddleware], ControllerOp.getEtapas)
router.delete('/etapa/:id', [jwtMiddleware], ControllerOp.deletarEtapa)

router.get('/etapas/estabelecimento', [jwtMiddleware], ControllerOp.getEtapasEstabelecimento)

router.get('/eficiencia', [jwtMiddleware], ControllerOp.getEficiencia)

router.post('/adicionar/etapa', [jwtMiddleware], ControllerOp.postEtapa)
router.post('/nova/etapa', [jwtMiddleware], ControllerOp.postEtapaPeca)

router.post('/registrar/producao', [jwtMiddleware], ControllerOp.postProducaoPeca);
router.post('/update/status', [jwtMiddleware], ControllerOp.updatePecaStatus);
router.post('/deletar/peca/:id', [jwtMiddleware], ControllerOp.deletarPeca);

router.post('/voltar/peca', [jwtMiddleware], ControllerOp.voltarPeca);
module.exports = router;