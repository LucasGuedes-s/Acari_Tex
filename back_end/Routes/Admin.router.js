const router = require('express').Router();
const jwtMiddleware = require('../middlewares/auth');
const validarSuperAdmin = require('../middlewares/superAdmin');
const AdminController = require('../Controllers/AdminController');

// Todas as rotas administrativas exigem autenticação e superAdmin.
router.use('/admin', jwtMiddleware, validarSuperAdmin);

// Verificação de acesso
router.get('/admin/ping', (req, res) => {
  res.json({ ok: true });
});

// Listagem de estabelecimentos
router.get(
  '/admin/estabelecimentos',
  AdminController.listarEstabelecimentos
);

// Cadastro de estabelecimento
router.post(
  '/admin/estabelecimentos',
  AdminController.cadastrarEstabelecimento
);

// Cadastro de funcionário para um estabelecimento
router.post(
  '/admin/funcionarios',
  AdminController.cadastrarFuncionario
);

module.exports = router;
