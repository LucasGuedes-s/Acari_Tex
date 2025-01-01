const express = require('express');
const router = express.Router();
const ControllerTarefas = require('../Controllers/DashboardController')
const jwtMiddleware = require('../middlewares/auth')

router.get('/Tarefas', [jwtMiddleware], ControllerTarefas.getTarefas);
router.post('/AdicionarTarefa', [jwtMiddleware], ControllerTarefas.postTarefa);
router.post('/Tarefas/Status/:id', [jwtMiddleware], ControllerTarefas.updateTarefa)

module.exports = router;