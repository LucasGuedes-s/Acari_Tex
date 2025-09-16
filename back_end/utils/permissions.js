const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

async function verificarPermissions(usuario, permission_id) {
    for(let i in permission_id){
        if (usuario.permissoes === permission_id[i]) {
            return 'Autorizado';
        }
    }
    err = new Error('Permissao negada.');
    err.code = 401;
    err.statusCode = 401;
    throw err;
    
}

module.exports = verificarPermissions;