const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
require('dotenv').config();

async function getFuncionarios(cnpj) {
  const funcionarios = await prisma.usuarios.findMany({
    where: {
      estabelecimentoCnpj: cnpj.cnpj,
      status: 'ativo',
    },
    include: {
      producao_funcionario: {
        orderBy: {
          data_inicio: 'desc', // ou id_da_producao: 'desc'
        },
        take: 1, // pega apenas a última produção
        include: {
          producao_etapa: true,
          producao_peca: true,
        },
      },
    },
  });
  
  if (!funcionarios.length) {
    throw new Error('Nenhum funcionário encontrado para este estabelecimento.');
  }
  return funcionarios;
}
async function getFuncionario(email) {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);

  const funcionario = await prisma.usuarios.findUnique({
    where: { email },
    include: {
      producao_funcionario: {
        where: {
          data_inicio: {
            gte: inicioHoje,
            lte: fimHoje,
          },
        },
        select: {
          id_da_producao: true,
          quantidade_pecas: true,
          data_inicio: true,
          hora_registro: true,

          producao_etapa: {
            select: {
              descricao: true,
              tempo_padrao: true,
            },
          },

          producao_peca: {
            select: {
              descricao: true,
            },
          },
        },
        orderBy: {
          hora_registro: 'asc',
        },
      },
    },
  });

  if (!funcionario) {
    throw new Error('Funcionário não encontrado');
  }

  return funcionario;
}


async function postFuncionario(funcionario, cnpj) {

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

async function getProducaoFuncionario(email, cnpjEstabelecimento) {
  try {

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const inicioPeriodo = new Date();
    inicioPeriodo.setDate(hoje.getDate() - 29);
    inicioPeriodo.setHours(0, 0, 0, 0);

    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj: cnpjEstabelecimento },
      select: { tempo_de_producao: true },
    });

    const tempoDisponivel = estabelecimento?.tempo_de_producao || 480;

    const producoes = await prisma.producao.findMany({
      where: {
        id_funcionario: email,
        //id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: {
          gte: inicioPeriodo,
          lte: hoje,
        },
      },
      select: {
        quantidade_pecas: true,
        data_inicio: true,
        producao_etapa: {
          select: {
            id_da_funcao: true,
            descricao: true,
            tempo_padrao: true,
          },
        },
      },
    });
    const dias = {};

    for (const prod of producoes) {
      if (!prod.quantidade_pecas || !prod.producao_etapa) continue;

      const data = prod.data_inicio.toISOString().split('T')[0];
      const etapaId = prod.producao_etapa.id_da_funcao;

      if (!dias[data]) {
        dias[data] = {};
      }

      if (!dias[data][etapaId]) {
        dias[data][etapaId] = {
          etapa: prod.producao_etapa.descricao,
          tempo_padrao: prod.producao_etapa.tempo_padrao || 0,
          quantidade_produzida: 0,
        };
      }

      dias[data][etapaId].quantidade_produzida += prod.quantidade_pecas;
    }
    const resultado = Object.entries(dias).map(([data, etapas]) => {
      const eficienciaPorEtapa = Object.values(etapas).map(et => {
        const tempoNecessario =
          et.quantidade_produzida * et.tempo_padrao;

        const eficiencia =
          tempoDisponivel > 0
            ? (tempoNecessario / tempoDisponivel) * 100
            : 0;

        return {
          etapa: et.etapa,
          quantidade_produzida: et.quantidade_produzida,
          tempo_padrao: et.tempo_padrao,
          tempo_necessario: Number(tempoNecessario.toFixed(2)),
          eficiencia_percentual: Number(eficiencia.toFixed(2)),
        };
      });

      const tempoTotalNecessario = eficienciaPorEtapa.reduce(
        (acc, e) => acc + e.tempo_necessario,
        0
      );

      const eficienciaTotal =
        tempoDisponivel > 0
          ? (tempoTotalNecessario / tempoDisponivel) * 100
          : 0;

      return {
        data,
        tempo_disponivel_min: tempoDisponivel,
        eficiencia_total_percentual: Number(eficienciaTotal.toFixed(2)),
        eficiencia_por_etapa: eficienciaPorEtapa,
      };
    });

    resultado.sort((a, b) => new Date(a.data) - new Date(b.data));
    return {
      funcionario: email,
      periodo: {
        inicio: inicioPeriodo.toISOString().split('T')[0],
        fim: hoje.toISOString().split('T')[0],
      },
      dias: resultado,
    };

  } catch (error) {
    console.error('Erro ao calcular eficiência:', error);
    throw new Error('Erro ao calcular eficiência do funcionário');
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
  //console.log("Funcionário movido com sucesso:", resultado);
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
async function tempoDeProducao(req) {
   const {
    id_funcionario,
    id_da_funcao,
    tempo_minutos,
    quantidade_pecas,
    observacoes,
  } = req.body;
  const registradoPor = req.user.email
  const estabelecimentoCnpj = req.user.cnpj
  const tempoRef = await prisma.tempoReferencia.create({
    data: {
      estabelecimentoCnpj,
      id_funcionario,
      id_da_funcao,
      tempo_minutos,
      quantidade_pecas,
      observacoes,
      registradoPor,
    },
  });
  return tempoRef
}

async function getTempodeReferencia(id_funcionario, req) {
  const cnpjEstabelecimento = req.user.cnpj
  const tempoRef = await prisma.tempoReferencia.findMany({
      where: {
        id_funcionario,         
        estabelecimentoCnpj: cnpjEstabelecimento, 
      },
      include:{
        etapa: true
      }
    });

    if (!tempoRef) return res.status(404).json({ error: "Registro não encontrado" });

    const producaoPorMinuto = tempoRef.quantidade_pecas / tempoRef.tempo_minutos;
    const tempoDisponivel = 480;
    const eficiencia = 0.85; 

    const producaoProjetada = producaoPorMinuto * tempoDisponivel * eficiencia;

    return {
      ...tempoRef,
      producaoPorMinuto,
      producaoProjetada,
    };
}

module.exports = {
  getFuncionarios,
  getFuncionario,
  postFuncionario,
  getProducaoFuncionario,
  criarEquipe,
  getEquipes,
  moverFuncionario,
  tempoDeProducao,
  getTempodeReferencia
};
