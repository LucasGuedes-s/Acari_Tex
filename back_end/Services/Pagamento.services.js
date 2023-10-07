const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getPagamentos() {

    const pagamentos = await prisma.Pagamentos.findMany({});

    if (!pagamentos) {
        throw new Error('Nenhum pagamento cadastrado');
    }
    return pagamentos;
}

module.exports = {
    getPagamentos,

}