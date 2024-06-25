const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken')
const config = require('../config/app.config.js');
prisma = new PrismaClient()

const bcrypt = require('bcrypt');


async function loginUser(user) {
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

    let dados_usuario = {
        cnpj: usuario.cnpj, 
        email: usuario.email, 
        nome: usuario.nome
    }
    if (senhavalida) {
        const token = jwt.sign(dados_usuario, config.jwtSecret, {
            expiresIn: 86400 // 24 hours
        });
        console.log(token)
        return { token: token };
    } else {
        throw new Error(`Usuário ou senha inválidos.`); 
    }

}

module.exports = {
    loginUser,

}