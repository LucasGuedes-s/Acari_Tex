const router = require('express').Router();
const jwtMiddleware = require('../middlewares/auth');
const validarSuperAdmin = require('../middlewares/superAdmin');

router.use('/admin', jwtMiddleware, validarSuperAdmin);
router.get('/admin/ping', (req, res) => res.json({ ok: true }));
module.exports = router;