const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tz = require('date-fns-tz');

function getData() {
  const agora = new Date();
  const offsetBrasil = -3; // UTC-3
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasil = new Date(utc + 3600000 * offsetBrasil);

  // Zerando hora, minuto, segundo e milissegundo
  brasil.setHours(0, 0, 0, 0);
  return brasil;
}

async function postPecaOP(req, user) {
  const etapas = req.peca.etapas || [];

  // Primeiro, garantir que cada etapa existe na tabela Etapa
  const etapasIds = await Promise.all(
    etapas.map(async (etapaItem) => {
      // Verifica se é string ou objeto
      const descricao = typeof etapaItem === "string" ? etapaItem : etapaItem.descricao;

      if (!descricao) throw new Error("Descrição da etapa inválida");

      let etapa = await prisma.etapa.findUnique({
        where: { descricao },
        select: { id_da_funcao: true },
      });

      if (!etapa) {
        etapa = await prisma.etapa.create({
          data: { descricao },
          select: { id_da_funcao: true },
        });
      }

      return { id_da_funcao: etapa.id_da_funcao, descricao };
    })
  );

  // Criar a nova OP
  const novaPeca = await prisma.pecasOP.create({
    data: {
      status: "nao_iniciado",
      descricao: req.peca.descricao || null,
      quantidade_pecas: req.peca.quantidade_pecas || null,
      pedido_por: req.peca.pedido_por || null,
      data_do_pedido: new Date().toISOString(),
      data_de_entrega: req.peca.data_de_entrega || null,
      valor_peca: req.peca.valor_peca || null,
      Estabelecimento: {
        connect: { cnpj: user.cnpj },
      },
    },
  });

  // Criar as etapas da OP com metas e status inicial
  await prisma.pecasEtapas.createMany({
    data: etapasIds.map((etapa) => ({
      id_da_op: novaPeca.id_da_op,
      id_da_funcao: etapa.id_da_funcao,
      quantidade_meta: req.peca.quantidade_pecas || 0, 
      status: "PENDENTE"
    })),
  });

  return novaPeca;
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
    console.log(req.body)
    // Buscar etapa vinculada + meta
    const etapaRelacionada = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op,
          id_da_funcao
        }
      }
    });

    if (!etapaRelacionada) {
      return res.status(400).json({ error: "Etapa não encontrada para essa OP." });
    }

    // Soma da produção até agora
    const totalEtapaProduzido = await prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: { id_da_op, id_da_funcao }
    });

    const jaProduzido = totalEtapaProduzido._sum.quantidade_pecas || 0;
    const novaQuantidade = jaProduzido + quantidade_pecas;

    // Verificar meta da etapa
    if (novaQuantidade > etapaRelacionada.quantidade_meta) {
      return res.status(400).json({
        error: "A produção dessa etapa excede a meta.",
        jaProduzido,
        meta: etapaRelacionada.quantidade_meta
      });
    }

    // Criar registro
    const producao = await prisma.producao.create({
      data: {
        id_da_op,
        id_funcionario,
        id_Estabelecimento,
        id_da_funcao,
        hora_registro,
        quantidade_pecas,
        data_inicio: getData(),
      }
    });
    // Se bateu a meta → atualizar status
    if (novaQuantidade === etapaRelacionada.quantidade_meta) {
      await prisma.pecasEtapas.update({
        where: {
          id_da_op_id_da_funcao: {
            id_da_op,
            id_da_funcao
          }
        },
        data: { status: "CONCLUIDA" }
      });
    }

    return producao;

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar produção." });
  }
}

async function getPecasOP(req) {
  const cnpj  = req.cnpj;
  const pecasOp = await prisma.pecasOP.findMany({
    where: { id_Estabelecimento: cnpj },
    include: {
      Estabelecimento: true,
      producao_peca: true,
      etapas: {
        include: {
          etapa: true, // descrição da etapa
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
    const { cnpj } = req.cnpj;  
    const producao = await prisma.producao.findMany({
      where: {
        Estabelecimento: {
          cnpj: cnpj 
        }
      },
      include: {
        producao_etapa: true,        
        producao_funcionario: {
          select: {
            nome: true,    
            email: true   
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
    const cnpjEstabelecimento = req.user.cnpj;
    const fusoSP = "America/Sao_Paulo";

    // Pegar data atual no fuso de SP
    const agora = new Date();
    const dtf = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoSP,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const partes = dtf.formatToParts(agora);
    const dia = partes.find(p => p.type === "day").value;
    const mes = partes.find(p => p.type === "month").value;
    const ano = partes.find(p => p.type === "year").value;

    // Limites do dia (UTC)
    const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0)); 
    const fimDiaUTC    = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59)); 

    // Limites do mês (UTC)
    const inicioMesUTC = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const fimMesUTC    = new Date(Date.UTC(ano, mes, 0, 23, 59, 59)); // último dia do mês

    // Produção do dia
    const producoesDia = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      },
      select: {
        id_funcionario: true,
        id_da_funcao: true,
        quantidade_pecas: true,
        hora_registro: true,
        producao_funcionario: { select: { nome: true } },
        producao_etapa: { select: { descricao: true } },
      },
    });

    // Produção do mês (detalhada)
    const producoesMes = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioMesUTC, lte: fimMesUTC },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        data_inicio: true
      },
    });

    // --- Agrupar produção do dia ---
    const agrupadoDia = {};
    for (const p of producoesDia) {
      const funcionario = p.id_funcionario;
      const nome = p.producao_funcionario?.nome || funcionario;
      const etapa = p.producao_etapa?.descricao || "Sem Etapa";
      const hora = p.hora_registro || "00:00";

      if (!agrupadoDia[funcionario]) {
        agrupadoDia[funcionario] = { nome, etapas: {} };
      }
      if (!agrupadoDia[funcionario].etapas[etapa]) {
        agrupadoDia[funcionario].etapas[etapa] = [];
      }
      agrupadoDia[funcionario].etapas[etapa].push({
        hora,
        quantidade: p.quantidade_pecas || 0,
        data: `${ano}-${mes}-${dia}`
      });
    }

    const resultadoDia = Object.entries(agrupadoDia).map(([email, dados]) => ({
      funcionario: email,
      nome: dados.nome,
      etapas: dados.etapas
    }));

    // --- Agrupar produção do mês por funcionário e dia ---
    const agrupadoMes = {};
    producoesMes.forEach(p => {
      const funcionario = p.id_funcionario;
      if (!agrupadoMes[funcionario]) agrupadoMes[funcionario] = {};
      const data = new Date(p.data_inicio);
      const diaDoMes = String(data.getDate()); // "1", "2", ..., "31"
      if (!agrupadoMes[funcionario][diaDoMes]) agrupadoMes[funcionario][diaDoMes] = 0;
      agrupadoMes[funcionario][diaDoMes] += p.quantidade_pecas || 0;
    });

    return {
      producaoDia: resultadoDia,
      producaoMes: agrupadoMes
    };

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
    const id_da_op = parseInt(id, 10);

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

    // estrutura que o frontend espera: { etapaNome: [registros...] }
    const producaoPorEtapa = {};

    // soma total (leva em conta negativos), soma positiva e negativa separadas
    let totalLiquido = 0;
    let totalPositivo = 0;
    let totalNegativo = 0;

    // também vamos calcular total por etapa (líquido, positivos, estornos)
    const somaPorEtapa = {};

    for (const p of peca.producao_peca) {
      // garantir number (prisma retorna Int mas por segurança convertemos)
      const qtd = Number(p.quantidade_pecas) || 0;
      const etapaNome = p.producao_etapa?.descricao || "Etapa não definida";
      const funcionarioNome = p.producao_funcionario?.nome || p.id_funcionario || "Desconhecido";

      // cria estrutura por etapa se necessário
      if (!producaoPorEtapa[etapaNome]) {
        producaoPorEtapa[etapaNome] = [];
        somaPorEtapa[etapaNome] = { liquido: 0, positivos: 0, estornos: 0 };
      }

      // empurra registro (mantendo campos úteis)
      const registro = {
        id_da_producao: p.id_da_producao,
        funcionario: funcionarioNome,
        funcionario_email: p.producao_funcionario?.email || null,
        quantidade: qtd,
        estorno: qtd < 0,
        data_inicio: p.data_inicio,
        hora_registro: p.hora_registro,
      };

      producaoPorEtapa[etapaNome].push(registro);

      // atualizar somas por etapa
      somaPorEtapa[etapaNome].liquido += qtd;
      if (qtd >= 0) somaPorEtapa[etapaNome].positivos += qtd;
      else somaPorEtapa[etapaNome].estornos += Math.abs(qtd);

      // atualizar somas globais
      totalLiquido += qtd;
      if (qtd >= 0) totalPositivo += qtd;
      else totalNegativo += Math.abs(qtd);
    }

    // saldo = meta total da OP - total líquido produzido (positivos - negativos)
    const metaTotal = Number(peca.quantidade_pecas) || 0;
    const saldo = metaTotal - totalLiquido;

    return {
      id_da_op: peca.id_da_op,
      descricao: peca.descricao,
      status: peca.status,
      quantidade_pecas: metaTotal,
      totalProduzido: totalLiquido,   // podendo ser menor por conta de estornos
      totalPositivo,                  // soma apenas dos lançamentos positivos
      totalNegativo,                  // soma dos estornos (valor absoluto)
      saldo,
      pedido_por: peca.pedido_por,
      valor_peca: peca.valor_peca,
      data_do_pedido: peca.data_do_pedido,
      data_de_entrega: peca.data_de_entrega,
      notas: peca.notas,
      producaoPorEtapa, 
      pecasEtapas: peca.etapas.map(e => ({
        id_da_funcao: e.id_da_funcao,
        descricao: e.etapa?.descricao || "Desconhecida",   
      })),         
      somaPorEtapa     
    };

  } catch (error) {
    console.error("Erro ao buscar estatísticas da peça:", error);
    throw new Error("Erro ao buscar estatísticas da peça.");
  }
}

async function deletarPeca(id) {
  const id_da_op = parseInt(id);
  try {
    // Deletar produções relacionadas
    await prisma.producao.deleteMany({
      where: { id_da_op }
    });

    await prisma.pecasEtapas.deleteMany({
      where: { id_da_op }
    });

    await prisma.PecasOP.delete({
      where: { id_da_op }
    });

    return { message: "Peça e dados relacionados deletados com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar peça:", error);
    throw new Error("Erro ao deletar peça.");
  }
}
async function voltarPeca(req, res) {
  try {
    const { id_da_op, id_funcionario, id_da_funcao, quantidade } = req.body;
    if (!id_da_op || !id_da_funcao || !quantidade) {
      return "ID da OP, etapa e quantidade são obrigatórios.";
    }

    // Buscar a produção total atual da etapa
    const producaoTotal = await prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_da_op: Number(id_da_op),
        id_da_funcao: Number(id_da_funcao),
        ...(id_funcionario && { id_funcionario }),
      },
    });

    const totalAtual = producaoTotal._sum.quantidade_pecas || 0;

    if (totalAtual <= 0) {
      throw new Error("Não há produção para estornar nessa peça e etapa.");
    }

    // Ajustar quantidade para não ficar negativa
    const quantidadeEstorno = Math.min(Math.abs(quantidade), totalAtual);

    if (id_funcionario) {
      const producaoEstorno = await prisma.producao.create({
        data: {
          quantidade_pecas: -quantidadeEstorno,
          id_da_op: Number(id_da_op),
          id_funcionario,
          id_da_funcao: Number(id_da_funcao),
          id_Estabelecimento: req.user.cnpj,
          data_inicio: new Date(),
          hora_registro: new Date().toLocaleTimeString("pt-BR"),
        },
      });

      await prisma.pecasOP.update({
        where: { id_da_op: Number(id_da_op) },
        data: { status: "em_progresso" },
      });

      return producaoEstorno;
    }

    // Caso não seja passado funcionário, buscar todos que atuaram nessa peça e função
    const producoes = await prisma.producao.findMany({
      where: {
        id_da_op: Number(id_da_op),
        id_da_funcao: Number(id_da_funcao),
      },
      select: { id_funcionario: true },
      distinct: ["id_funcionario"],
    });

    if (producoes.length === 0) {
      throw new Error("Nenhum funcionário encontrado para essa peça e etapa.");
    }

    // Divide a quantidade igualmente entre os funcionários encontrados
    const quantidadePorFuncionario = Math.floor(quantidadeEstorno / producoes.length);
    const resto = quantidadeEstorno % producoes.length;

    const estornos = [];
    for (let i = 0; i < producoes.length; i++) {
      const qnt = quantidadePorFuncionario + (i < resto ? 1 : 0);
      const estorno = await prisma.producao.create({
        data: {
          quantidade_pecas: -qnt,
          id_da_op: Number(id_da_op),
          id_funcionario: producoes[i].id_funcionario,
          id_da_funcao: Number(id_da_funcao),
          id_Estabelecimento: req.user.cnpj,
          data_inicio: new Date(),
          hora_registro: new Date().toLocaleTimeString("pt-BR"),
        },
      });
      estornos.push(estorno);
    }

    const peca = await prisma.pecasOP.update({
      where: { id_da_op: Number(id_da_op) },
      data: { status: "em_progresso" },
    });

    return peca;

  } catch (err) {
    console.error("Erro ao voltar peça:", err.message);
    throw new Error("Erro ao voltar peça" );
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
    getEstatisticasPeca,
    deletarPeca,
    voltarPeca
};
