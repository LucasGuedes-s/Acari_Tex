
const prisma = require('../config/prisma.js');

async function validarComercialOuSuperAdmin(req, res, next) {
  try {
    const u = await prisma.usuarios.findUnique({
      where: { email: req.user.email },
      select: {
        comercial: true,
        superAdmin: true,
        status: true,
      },
      // ALTERAÇÕES PERMISSÕES
      // select: { permissoes: true, status: true, },
    });
    // if !u || (!u.permissoes?.includes(0) && !u.permissoes?.includes(4)) || u.status === 'inativo') {  
    if (
      !u ||
      (!u.comercial && !u.superAdmin) ||
      u.status === 'inativo'
    ) {
      return res.status(403).send({
        message: 'Acesso negado',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validarComercialOuSuperAdmin;