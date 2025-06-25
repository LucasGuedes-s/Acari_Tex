const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFuncionarios(req, res) {
  try {
    const { cnpj } = req;

    const funcionarios = await prisma.usuarios.findMany({
      where: {
        estabelecimentoCnpj: cnpj,
      },
    });

    if (!funcionarios.length) {
      return 'Nenhum funcionário encontrado para este estabelecimento.';
    }

    return funcionarios;
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    throw new Error("Erro ao buscar os funcionários.");
  }
}

async function getFuncionario(req, res) {
  const id_do_funcionario = parseInt(req.params.id);

  try {
    const funcionario = await prisma.Funcionarios.findUnique({
      where: { id: id_do_funcionario }
    });

    if (!funcionario) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(funcionario);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
}

async function postFuncionario(funcionario) {
  const identidade = funcionario.identidade?.toString() || null;
  const cpf = funcionario.cpf?.toString() || null;
  const pis = funcionario.pis?.toString() || null;

  // Verifica se o email já está cadastrado
  const usuarioExistente = await prisma.usuarios.findUnique({
    where: {
      email: funcionario.email
    }
  });

  if (usuarioExistente) {
    console.log(usuarioExistente)
    throw new Error("Já existe um usuário com esse email.");
  }

  const addFuncionario = await prisma.usuarios.create({
    data: {
      email: funcionario.email,
      nome: funcionario.nome_do_funcionario,
      senha: funcionario.senha,
      foto: funcionario.foto,
      idade: funcionario.idade,
      funcoes: funcionario.funcoes,
      identidade,
      cpf,
      pis,
      pix: funcionario.pix,
      notas: funcionario.notas,
      estabelecimentoCnpj: funcionario.estabelecimento.cnpj // FK direta

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

module.exports = {
  getFuncionarios,
  getFuncionario,
  postFuncionario,
  getProducaoFuncionario
};
