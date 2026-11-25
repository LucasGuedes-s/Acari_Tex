
const router = require('express').Router();

const jwtMiddleware = require('../middlewares/auth');
const validarComercialOuSuperAdmin = require('../middlewares/comercialOuSuperAdmin');
const ComercialController = require('../Controllers/ComercialController');

// Todas as rotas comerciais exigem autenticação e permissão de comercial ou superAdmin.
router.use(
  '/comercial',
  jwtMiddleware,
  validarComercialOuSuperAdmin
);

// Verificação de acesso
router.get('/comercial/ping', (req, res) => {
  res.json({ ok: true });
});

// Listagem de leads
router.get(
  '/comercial/leads',
  ComercialController.listarLeads
);

// Cadastro de lead
router.post(
  '/comercial/leads',
  ComercialController.criarLead
);

// Atualização do status de um lead
router.patch(
  '/comercial/leads/:id/status',
  ComercialController.atualizarStatusLead
);

module.exports = router;
