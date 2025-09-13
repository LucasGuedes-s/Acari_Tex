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
  const addFuncionario = await prisma.usuarios.create({
    data: {
      email: funcionario.email,
      nome: funcionario.nome,
      senha: senha,
      foto: funcionario.fotoUrl,
      idade: funcionario.idade,
      funcoes: funcionario.funcoes,
      permissoes: funcionario.permissao || "funcionario",
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
async function criarEquipe(req) {
  try {
    const { nome, descricao, funcionarioEmails } = req.body;
    const cnpj = req.user.cnpj
    // Buscar os funcionários que pertencem ao estabelecimento
    const funcionarios = await prisma.usuarios.findMany({
      where: {
        email: { in: req.body.funcionarios },
        estabelecimentoCnpj: cnpj
      }
    });

    const equipe = await prisma.equipesGrupos.create({
      data: {
        nome: req.body.nome,
        descricao: req.body.descricao,
        estabelecimentoCnpj: cnpj,
        usuarios: {
          connect: funcionarios.map(f => ({ email: f.email }))
        }
      },
      include: {
        usuarios: true
      }
    });

    return equipe;
  } catch (error) {
    console.error("Erro ao criar equipe:", error);
    throw new Error("Erro ao criar a equipe.");
  }
}
async function getEquipes(req) {
  const cnpj = req.user.cnpj;
  
  try {
    const equipes = await prisma.equipesGrupos.findMany({
      where: { estabelecimentoCnpj: cnpj },
      include: { usuarios: true }
    });
    return equipes; 
  
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    throw new Error("Erro ao buscar as equipes.");
  } 
}

module.exports = {
  getFuncionarios,
  getFuncionario,
  postFuncionario,
  getProducaoFuncionario,
  criarEquipe,
  getEquipes
};
