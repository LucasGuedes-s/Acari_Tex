const prisma = require('../config/prisma.js');

async function validarSuperAdmin(req, res, next) {
  try {
    const u = await prisma.usuarios.findUnique({
      where: { email: req.user.email },
      select: { superAdmin: true, status: true },
      // ALTERAÇÕES PERMISSÕES
      // select: { permissoes: true, status: true },
    });
    // if (!u || !u.permissoes?.includes(0) || u.status === 'inativo') {
    if (!u || !u.superAdmin || u.status === 'inativo') {
      return res.status(403).send({ message: 'Acesso negado' });
    }
    next();
  } catch (err) { next(err); }
}
module.exports = validarSuperAdmin;