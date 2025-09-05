const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function postPecaOP(req, user) {
    const etapas = req.peca.etapas || [];
    const etapasIds = await Promise.all(
      etapas.map(async (descricao) => {
        // Busca a etapa pelo nome
        let etapa = await prisma.Etapa.findUnique({
          where: { descricao },
          select: { id_da_funcao: true },
        });

        if (!etapa) {
          etapa = await prisma.Etapa.create({
            data: { descricao },
            select: { id_da_funcao: true },
          });
        }

        return etapa.id_da_funcao;
      })
    );
      // Filtrando etapas válidas (não nulas)
    const etapasValidas = etapasIds.filter(id => id !== null);
    // Criar a nova peça com as etapas conectadas
    console.log(req.peca)
    const novaPeca = await prisma.PecasOP.create({
        data: {
            status: "nao_iniciado",
            descricao: req.peca.descricao || null,
            quantidade_pecas: req.peca.quantidade_pecas || null,
            pedido_por: req.peca.pedido_por || null,
            data_do_pedido: new Date().toISOString(),
            data_de_entrega: req.peca.data_de_entrega || null,
            valor_peca: req.peca.valor_peca || null,
            Estabelecimento: {
                connect: {
                    cnpj: user.cnpj,  // Relacionamento com Estabelecimento
                },
            }
        }
    });
    await prisma.PecasEtapas.createMany({
        data: etapasIds.map((id_da_funcao) => ({
          id_da_op: novaPeca.id_da_op,  // ID da peça criada
          id_da_funcao: id_da_funcao   // ID da etapa
        }))
      });

    return novaPeca;
}


async function getPecasOP(req) {
    const pecasOp = await prisma.PecasOP.findMany({
        where: { id_Estabelecimento: req.cnpj },
        include: {
          Estabelecimento: true,
          producao_peca: true,
          etapas: {
            include: {
              etapa: true, // <- Isso trará os dados da Etapa, incluindo "descricao"
            },
          },
        
        },
      });
    if (!pecasOp) {
        return { finalizado: [], em_progresso: [], nao_iniciado: [], coleta: [] };
    }

    const finalizado = pecasOp.filter(peca => peca.status === "finalizado");
    const em_progresso = pecasOp.filter(peca => peca.status === "em_progresso");
    const nao_iniciado = pecasOp.filter(peca => peca.status === "nao_iniciado");
    const coleta = pecasOp.filter(peca => peca.status === "coleta");

    return {
        finalizado,
        em_progresso,
        nao_iniciado,
        coleta
    };
}
async function postProducaoPeca(req, res) {
  try {
    const {
      id_da_op,
      id_funcionario,
      id_da_funcao,
      quantidade_pecas,
      hora_registro,
    } = req.body;
    const id_Estabelecimento = req.user.cnpj;
    const etapaRelacionada = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op,
          id_da_funcao
        }
      }
    });
    if (!etapaRelacionada) {
      return "A etapa informada não está relacionada com essa OP." ;
    }

    const op = await prisma.pecasOP.findUnique({
      where: { id_da_op },
      select: { quantidade_pecas: true }
    });

    if (!op || op.quantidade_pecas == null) {
      return "OP não encontrada ou sem quantidade definida.";
    }

    // Soma da produção já registrada para essa OP + etapa
    const totalEtapaProduzido = await prisma.producao.aggregate({
      _sum: {
        quantidade_pecas: true
      },
      where: {
        id_da_op,
        id_da_funcao
      }
    });

    const jaProduzido = totalEtapaProduzido._sum.quantidade_pecas || 0;
    const novaQuantidade = jaProduzido + quantidade_pecas;

    // Se a nova soma excede o total da OP, bloquear
    if (novaQuantidade > op.quantidade_pecas) {
      console.log(`A produção para essa etapa excede a quantidade total da OP. Produzido: ${jaProduzido}, Tentativa de adicionar: ${quantidade_pecas}, Total OP: ${op.quantidade_pecas}`);
      return {
        error: `A produção para essa etapa excede a quantidade total da OP.`,
        jaProduzido,
        totalOP: op.quantidade_pecas
      };
    }
    const agoraBrasil = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    const data_inicio = getDataInicioBrasil();

    // Criar novo registro de produção com a etapa
    const producao = await prisma.producao.create({
      data: {
        id_da_op,
        id_funcionario,
        id_Estabelecimento,
        id_da_funcao,
        hora_registro,
        quantidade_pecas,
        data_inicio: new Date(), // Usando a data e hora atual no fuso horário de São Paulo
      }
    });
    console.log(`Produção registrada:`, producao);
    return producao;

  } catch (error) {
    console.error(error);
    return "Erro ao registrar a produção.";
  }
}

async function getEtapasProducaoPorPeca(req, res) {
  try {
    const id_da_op  = req;

    const producao = await prisma.producao.findMany({
      where: {
        id_da_op: Number(id_da_op)
      },
      include: {
        producao_etapa: true,         // Etapa (ex: Corte, Costura...)
        producao_funcionario: {
          select: {
            nome: true,    // Seleciona apenas o nome do funcionário
            email: true    // Seleciona apenas o e-mail do funcionário
          }
        }
      }
    });

    if (!producao.length) {
      return 'Nenhuma produção encontrada para essa peça.';
    }

    return producao;
  } catch (error) {
    console.error("Erro ao buscar etapas da produção:", error);
    return "Erro ao buscar dados da produção.";
  }
}

async function getEtapasProducaoPorEstabelecimento(req, res) {
  try {
    const { cnpj } = req.cnpj;  // Aqui, supondo que o CNPJ do estabelecimento esteja sendo passado na requisição

    // Buscar todas as produções do estabelecimento com base no CNPJ
    const producao = await prisma.producao.findMany({
      where: {
        Estabelecimento: {
          cnpj: cnpj  // Filtra as produções para o estabelecimento com o CNPJ fornecido
        }
      },
      include: {
        producao_etapa: true,         // Etapa (ex: Corte, Costura...)
        producao_funcionario: {
          select: {
            nome: true,    // Seleciona apenas o nome do funcionário
            email: true    // Seleciona apenas o e-mail do funcionário
          }
        }
      }
    });

    if (!producao.length) {
      return 'Nenhuma produção encontrada para este estabelecimento.';
    }

    return producao;
  } catch (error) {
    console.error("Erro ao buscar etapas da produção:", error);
    return "Erro ao buscar dados da produção.";
  }
}
async function updatePecaStatus(id_da_op, status) {
    try {
        let data = {status: status}
        if(status == "finalizado"){
          data = {status: status, data_de_entrega: new Date().toISOString()}
        }
        const peca = await prisma.PecasOP.update({
            where: { id_da_op },
            data
        });
        return peca;
    } catch (error) {
        console.error("Erro ao atualizar status da peça:", error);
        throw new Error("Erro ao atualizar status da peça.");
    }
}
async function getProducaoEquipe(req) {
  try {
    const hoje = new Date(); // ou qualquer data desejada
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHojeStr = `${ano}-${mes}-${dia}`; // <-- adiciona isso

    // Cria início e fim do dia
    const inicioDia = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
    const fimDia = new Date(`${ano}-${mes}-${dia}T23:59:59Z`);

    const producoes = await prisma.producao.findMany({
      where: {
        data_inicio: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        data_inicio: true,
        hora_registro: true,
        producao_funcionario: {
          select: {
            nome: true
          }
        }
      }
    });

    const agrupado = {};

    for (const producao of producoes) {
      const funcionario = producao.id_funcionario;
      const nome = producao.producao_funcionario?.nome || funcionario;

      const hora = producao.hora_registro || "00:00";

      if (!agrupado[funcionario]) {
        agrupado[funcionario] = {
          nome,
          producao: []
        };
      }

      agrupado[funcionario].producao.push({
        data: dataHojeStr,
        hora,
        quantidade: producao.quantidade_pecas || 0
      });
    }

    const resultado = Object.entries(agrupado).map(([email, dados]) => ({
      funcionario: email,
      nome: dados.nome,
      producao: dados.producao
    }));

    return resultado;
  } catch (error) {
    console.error("Erro ao buscar produção da equipe:", error);
    return { error: error.message };
  }
}

function getDataInicioBrasil() {
  const agora = new Date();
  const fusoHorarioBrasil = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(agora).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const { year, month, day, hour, minute, second } = fusoHorarioBrasil;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}:00`;
}
async function getEstatisticasPeca(id) {
  try {
    const id_da_op = parseInt(id);

    const peca = await prisma.PecasOP.findUnique({
      where: { id_da_op },
      include: {
        Estabelecimento: true,
        etapas: { include: { etapa: true } },
        producao_peca: {
          include: {
            producao_funcionario: true, // carrega dados do funcionário
            producao_etapa: true        // carrega dados da etapa
          }
        }
      },
    });

    if (!peca) throw new Error("Peça não encontrada.");

    const producaoPorEtapa = {};
    let totalProduzido = 0;

    peca.producao_peca.forEach((p) => {
      const etapaNome = p.producao_etapa?.descricao || "Etapa não definida";

      if (!producaoPorEtapa[etapaNome]) producaoPorEtapa[etapaNome] = [];

      producaoPorEtapa[etapaNome].push({
        id_da_producao: p.id_da_producao,
        funcionario: p.producao_funcionario?.nome || "Desconhecido",
        funcionario_email: p.producao_funcionario?.email,
        quantidade: p.quantidade_pecas,
        data_inicio: p.data_inicio,
        hora_registro: p.hora_registro,
      });

      totalProduzido += p.quantidade_pecas || 0;
    });

    return {
      id_da_op: peca.id_da_op,
      descricao: peca.descricao,
      status: peca.status,
      quantidade_pecas: peca.quantidade_pecas,
      totalProduzido,
      saldo: (peca.quantidade_pecas || 0) - totalProduzido,
      pedido_por: peca.pedido_por,
      valor_peca: peca.valor_peca,
      data_do_pedido: peca.data_do_pedido,
      data_de_entrega: peca.data_de_entrega,
      notas: peca.notas,
      producaoPorEtapa,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas da peça:", error);
    throw new Error("Erro ao buscar estatísticas da peça.");
  }
}


module.exports = {
    postPecaOP,
    getPecasOP,
    postProducaoPeca,
    getEtapasProducaoPorPeca,
    getEtapasProducaoPorEstabelecimento,
    updatePecaStatus,
    getProducaoEquipe,
    getEstatisticasPeca
};
