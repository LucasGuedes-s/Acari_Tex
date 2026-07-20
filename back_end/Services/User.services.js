const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken')
const config = require('../config/app.config.js');
prisma = new PrismaClient()
const { enviarEmailAlteracaoSenha } = require('./Email.services.js')
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
                    tipo_de_producao: true, // Seleciona apenas o tipo de produção do estabelecimento
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
        tipo_de_producao: usuario.Estabelecimento.tipo_de_producao,
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
async function SolicitacaoalterarSenha(req) {
  const email = req
   const usuario = await prisma.Usuarios.findFirst({ //A função findFirst faz uma busca na tabela usuários do banco de dados pelo email digitado pelo usuário 
        where: {
            email
        },
   })
   if(usuario){
    await enviarEmailAlteracaoSenha(usuario.email, usuario.nome)
   }
   else{
    throw new Error("Erro")
   }
   return "Senha alterada"
}
async function alterarSenha(email, novaSenha) {
  const usuario = await prisma.Usuarios.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw new Error('E-mail não encontrado');
  }

  const senhaCriptografada = await bcrypt.hashSync(novaSenha, 10);

  const usuario_atualizado = await prisma.Usuarios.update({
    where: { email },
    data: { senha: senhaCriptografada },
  });

  return usuario_atualizado;
}

async function enviarNotificacaoParaTodos({
  titulo,
  mensagem,
  etapa = "Coletiva",
}) {
  try {
    // Busca todos os estabelecimentos
    const estabelecimentos = await prisma.Estabelecimento.findMany({
      select: {
        cnpj: true,
      },
    });

    if (estabelecimentos.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhum estabelecimento cadastrado.",
      };
    }

    // Monta os registros
    const notificacoes = estabelecimentos.map((estabelecimento) => ({
      estabelecimentoCnpj: estabelecimento.cnpj,
      titulo,
      mensagem,
      etapa,
    }));

    // Cria todas de uma vez
    await prisma.notificacoes.createMany({
      data: notificacoes,
    });

    return {
      sucesso: true,
      mensagem: `${notificacoes.length} notificações enviadas com sucesso.`,
    };
  } catch (error) {
    console.error("Erro ao enviar notificações:", error);
    throw error;
  }
}
async function registrarFaltas(req) {
    try {
        const { funcionarioId, data, observacao, tipo, horarioInicial, horarioFinal } = req.body;
        const cnpj = req.user.cnpj;
        const registradoPor = req.user.email;
        if(tipo === 'parcial' && horarioInicial != null && horarioFinal != null){
          const faltas = await prisma.Faltas.create({
            data: {
                funcionarioId: funcionarioId,
                data: new Date(data),
                estabelecimento: cnpj,
                usuarioResponsavel: registradoPor,
                horarioInicial: horarioInicial,
                horarioFinal: horarioFinal,
                tipo: tipo,
                observacao: observacao || null,
            }
          });
        }
        else {
          const faltas = await prisma.Faltas.create({
              data: {
                  funcionarioId: funcionarioId,
                  data: new Date(data),
                  estabelecimento: cnpj,
                  usuarioResponsavel: registradoPor,
                  tipo: tipo,
                  observacao: observacao || null,
              }
          });
        } 
        return { message: "Falta registrada com sucesso." };
    } catch (error) {
        console.error("Erro ao registrar faltas:", error);
        throw new Error("Erro ao registrar faltas.");
    }
}


async function getFaltasByFuncionarios(req) {
    try {
        const { data } = req.query;
        // console.log("Data recebida:", data); // Adicione este log para verificar o valor de 'data'
        const cnpj = req.user.cnpj;

        const faltas = await prisma.Faltas.findMany({
            where: {
                estabelecimento: cnpj,
                data: data ? new Date(data) : undefined,
            },
            orderBy: {
                data: 'asc',
            },
        }); 
        return faltas;
    }
    catch (error) {

        console.error("Erro ao buscar faltas:", error);
        throw new Error("Erro ao buscar faltas.");
    }
}

module.exports = {
    loginUser,
    criarTempoReferencia,
    SolicitacaoalterarSenha,
    alterarSenha,
    enviarNotificacaoParaTodos,
    registrarFaltas,
    getFaltasByFuncionarios
}