const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
require('dotenv').config();

async function getFuncionarios(cnpj) {
  const funcionarios = await prisma.usuarios.findMany({
    where: { estabelecimentoCnpj: cnpj.cnpj }
  });
  if (!funcionarios.length) {
    throw new Error('Nenhum funcionário encontrado para este estabelecimento.');
  }
  return funcionarios;
}

async function getFuncionario(email) {
  const funcionario = await prisma.usuarios.findUnique({
    where: { email }
  });
  if (!funcionario) throw new Error('Funcionário não encontrado');
  return funcionario;
}

async function postFuncionario(funcionario, cnpj) {

  // Verifica se o email já existe
  const usuarioExistente = await prisma.usuarios.findUnique({
    where: { email: funcionario.email }
  });

  if (usuarioExistente) throw new Error("Já existe um usuário com esse email.");

  const identidade = funcionario.identidade?.toString() || null;
  const cpf = funcionario.cpf?.toString() || null;
  const pis = funcionario.pis?.toString() || null;
  const senha = bcrypt.hashSync(process.env.SENHA, 10);
  if(funcionario.permissao === 'funcionario' || !funcionario.permissao){
    funcionario.permissao = 2;
  }
  else{
    funcionario.permissao = 1;
  }
  const addFuncionario = await prisma.usuarios.create({
    data: {
      email: funcionario.email,
      nome: funcionario.nome,
      senha: senha,
      foto: funcionario.fotoUrl,
      idade: funcionario.idade,
      funcoes: funcionario.funcoes,
      permissoes: funcionario.permissao || 3,
      identidade,
      cpf,
      pis,
      pix: funcionario.pix,
      notas: funcionario.funcoes,
      estabelecimentoCnpj: cnpj
    }
  });

  return addFuncionario;
}

async function getProducaoFuncionario(req) {
  const email = req;

  try {
    const producoes = await prisma.producao.findMany({
      where: {
        id_funcionario: email,
      },
      select: {
        quantidade_pecas: true,
        data_inicio: true,
        hora_registro: true,
      },
    });

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();

    const agrupadoPorData = {};
    const producaoHojeSeparada = [];

    for (const producao of producoes) {
      if (!producao.data_inicio) continue; // ← ignora entradas inválidas

      const dataCompleta = new Date(producao.data_inicio);
      if (isNaN(dataCompleta.getTime())) continue; // ← ignora se data inválida

      const dataStr = dataCompleta.toISOString().split('T')[0];

      // Agrupamento histórico
      if (!agrupadoPorData[dataStr]) {
        agrupadoPorData[dataStr] = 0;
      }
      agrupadoPorData[dataStr] += producao.quantidade_pecas || 0;

      // Comparar com data de hoje
      if (
        dataCompleta.getDate() === diaHoje &&
        dataCompleta.getMonth() === mesHoje &&
        dataCompleta.getFullYear() === anoHoje
      ) {
        const hora = producao.hora_registro?.substring(0, 5) || '00:00';
        producaoHojeSeparada.push({
          hora,
          quantidade: producao.quantidade_pecas || 0,
        });
      }
    }

    const resultadoHistorico = Object.entries(agrupadoPorData)
      .filter(([data]) => !isNaN(new Date(data).getTime())) // evita datas inválidas
      .map(([data, total]) => ({ data, quantidade: total }))
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    const resultadoHoje = producaoHojeSeparada.sort((a, b) => a.hora.localeCompare(b.hora));

    return {
      historico: resultadoHistorico,
      producao_hoje: resultadoHoje,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function criarEquipe(req, res) {
  try {
    const { nome, descricao, funcionarios } = req.body;
    const cnpj = req.user.cnpj;
    const usuarios = await prisma.usuarios.findMany({
      where: {
        email: { in: funcionarios },
        estabelecimentoCnpj: cnpj,
      },
    });

    if (!usuarios.length) {
      return res.status(400).json({ message: "Nenhum funcionário válido encontrado para este estabelecimento." });
    }

    const equipe = await prisma.equipesGrupos.create({
      data: {
        nome,
        descricao,
        estabelecimentoCnpj: cnpj,
        usuarios: {
          create: usuarios.map((f) => ({
            usuario: {
              connect: { email: f.email }, // conecta cada usuário
            },
          })),
        },
      },
      include: {
        usuarios: {
          include: { usuario: true }, // retorna também os dados do usuário
        },
      },
    });

    return equipe;
  } catch (error) {
    console.error("Erro ao criar equipe:", error);
    return "Erro ao criar a equipe." ;
  }
}
async function moverFuncionario(req) {
  const { email, novaEquipeId } = req.body;
  const cnpj = req.user.cnpj;

  // Verifica se usuário existe
  const usuario = await prisma.usuarios.findUnique({
    where: { email },
  });
  if (!usuario) {
    throw new Error('Funcionário não encontrado.');
  }

  // Verifica se a nova equipe existe e pertence ao mesmo estabelecimento
  const equipe = await prisma.equipesGrupos.findFirst({
    where: {
      id: novaEquipeId,
      estabelecimentoCnpj: cnpj,
    },
  });
  if (!equipe) {
    throw new Error('Equipe não encontrada ou não pertence ao seu estabelecimento.');
  }

  // Verifica se já existe vínculo do usuário em alguma equipe desse CNPJ
  const vinculoExistente = await prisma.equipesUsuarios.findFirst({
    where: {
      usuarioEmail: email,
      equipe: {
        estabelecimentoCnpj: cnpj,
      },
    },
  });

  let resultado;
  if (vinculoExistente) {
    // Atualiza vínculo para a nova equipe
    resultado = await prisma.equipesUsuarios.update({
      where: { id: vinculoExistente.id },
      data: { equipeId: novaEquipeId },
    });
  } else {
    // Cria novo vínculo se não existir
    resultado = await prisma.equipesUsuarios.create({
      data: {
        usuarioEmail: email,
        equipeId: novaEquipeId,
      },
    });
  }
  console.log("Funcionário movido com sucesso:", resultado);
  return resultado;
}

async function getEquipes(req, res) {
  const cnpj = req.user.cnpj;

  try {
    const equipes = await prisma.equipesGrupos.findMany({
      where: { estabelecimentoCnpj: cnpj },
      include: {
        usuarios: {
          include: {
            usuario: {  
              select: {
                nome: true,
                email: true,
                foto: true,
                funcoes: true
              }
            }
          }
        }
      }
    });

    return equipes;
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    return "Erro ao buscar as equipes.";
  }
}

module.exports = {
  getFuncionarios,
  getFuncionario,
  postFuncionario,
  getProducaoFuncionario,
  criarEquipe,
  getEquipes,
  moverFuncionario
};
