const express = require('express');
const router = express.Router();
const ControllerTarefas = require('../Controllers/DashboardController')

router.get('/Tarefas', ControllerTarefas.getTarefas);
router.post('/AdicionarTarefa', ControllerTarefas.postTarefa);
router.update('/Status/:id', ControllerTarefas.alterandoTarefa)

module.exports = router;