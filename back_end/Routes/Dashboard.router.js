const express = require('express');
const router = express.Router();
const ControllerTarefas = require('../Controllers/DashboardController')

router.get('/Tarefas', ControllerTarefas.getTarefas);

module.exports = router;