const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getFuncionarios(){
    console.log('Estou chegando aqui')
    const funcionarios = await prisma.Funcionarios.findMany({});
    
    if (!funcionarios) {
        throw new Error('Nenhum funcionário cadastrado');
    }

    return funcionarios;
    //console.log(funcionarios)
}

module.exports = {
    getFuncionarios,
}