const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getNotificacoes(req) {
    const cnpj = req.user.cnpj;
    
    const notificacoes = await prisma.notificacoes.findMany({
        orderBy: { criadaEm: 'desc' },
        where: { lida: false, estabelecimentoCnpj: cnpj },
        take: 50 
    });
    return notificacoes;

}
module.exports = {
    getNotificacoes
}