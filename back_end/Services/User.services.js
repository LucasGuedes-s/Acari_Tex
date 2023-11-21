const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

const bcrypt = require('bcrypt');


async function loginUser(user) {

    //console.log('Chegando aqui')
    console.log(user)
    cnpj = parseInt(user.cnpj)
    const usuario = await prisma.Estabelecimento.findFirst({ //A função findFirst faz uma busca na tabela usuários do banco de dados pelo email digitado pelo usuário 
        where: {
            cnpj: cnpj,
        }
    });
    if (usuario == null) {
        throw new Error(`Usuário ou senha inválidos.`); 
    }
    
    const senhavalida = bcrypt.compareSync(user.senha, usuario.senha); //A senha digitada pelo usuário é criptografada e testada pelo API de criptografia bcrypt.

    if (senhavalida) {
        console.log('Usuário logado')
    } else {
        throw new Error(`Usuário ou senha inválidos.`); 
    }

}

module.exports = {
    loginUser,

}