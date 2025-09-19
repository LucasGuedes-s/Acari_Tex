const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken')
const config = require('../config/app.config.js');
prisma = new PrismaClient()

const bcrypt = require('bcrypt');
const permissoes = require('../config/permissions.config.js');

async function loginUser(user) {
    const usuario = await prisma.Usuarios.findFirst({ //A função findFirst faz uma busca na tabela usuários do banco de dados pelo email digitado pelo usuário 
        where: {
            email: user.usuario.email,
        },
        include: {
            Estabelecimento: {
                select: {
                    cnpj: true, // Seleciona apenas o CNPJ do estabelecimento
                },
            },
        }
    });

    if (usuario == null) {
        throw new Error(`Usuário ou senha inválidos.`); 
    }
    const senhavalida = bcrypt.compareSync(user.usuario.senha, usuario.senha); //A senha digitada pelo usuário é criptografada e testada pelo API de criptografia bcrypt.
    let dados_usuario = {
        cnpj: usuario.Estabelecimento.cnpj, 
        funcoes: usuario.funcoes,
        email: usuario.email, 
        nome: usuario.nome,
        permissoes: usuario.permissoes,
        foto: usuario.foto
    }
    if (senhavalida) {
        const token = jwt.sign(dados_usuario, config.jwtSecret, {
            expiresIn: 86400 // 24 hours
        });
        return {token: token, dados_usuario}
    } else {
        throw new Error(`Usuário ou senha inválidos.`); 
    }

}

async function criarTempoReferencia(req) {
  try {
    const { id_funcionario, id_da_funcao, tempo_minutos, quantidade_pecas, observacoes } = req.body;
    const cnpj = req.user.cnpj;
    const registradoPor = req.user.email;

    const tempo = await prisma.tempoReferencia.create({
      data: {
        estabelecimentoCnpj: cnpj,
        id_funcionario,
        id_da_funcao,
        tempo_minutos,
        quantidade_pecas,
        observacoes,
        registradoPor
      },
      include: {
        usuario: {
          select: { nome: true, email: true }
        },
        etapa: {
          select: { descricao: true }
        }
      }
    });

    return tempo;
  } catch (error) {
    console.error("Erro ao criar tempo de referência:", error);
    throw new Error("Erro ao criar tempo de referência.");
  }
}


module.exports = {
    loginUser,
    criarTempoReferencia
}