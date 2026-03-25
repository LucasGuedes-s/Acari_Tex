const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

function dateOnlyToUTC(dateStr) {
  // dateStr: YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000Z`);
}
function hojeUTC() {
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth();
  const dia = hoje.getUTCDate();
  return new Date(Date.UTC(ano, mes, dia, 0, 0, 0));
}

async function relatorioFinanceiro(req) {
  const cnpj = req.user.cnpj;
  const { dataInicio, dataFim } = req.query;

  const inicioUTC = dateOnlyToUTC(dataInicio);
  const fimUTC = dateOnlyToUTC(dataFim);
  const hoje = hojeUTC();

  // ================= ESTABELECIMENTO =================
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj },
    select: { peca_final: true }
  });

  if (!estabelecimento?.peca_final) {
    throw new Error("Etapa final não configurada no estabelecimento");
  }

  const etapaFinal = estabelecimento.peca_final.trim().toLowerCase();

  // ================= PRODUÇÕES DO PERÍODO =================
  const producoes = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: {
        gte: inicioUTC,
        lte: fimUTC
      }
    },
    include: {
      producao_etapa: { select: { descricao: true } }
    }
  });

  // ================= PRODUÇÕES DE HOJE =================
  const producoesHoje = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: hoje
    },
    include: {
      producao_etapa: { select: { descricao: true } }
    }
  });

  // ================= AGRUPAR POR OP =================
  const mapaOP = {};
  let quantidadeFinalHoje = 0;

  for (const prod of producoes) {
    const idOp = prod.id_da_op;

    if (!mapaOP[idOp]) {
      mapaOP[idOp] = { quantidadeFinalizada: 0 };
    }

    const etapa = prod.producao_etapa?.descricao?.trim().toLowerCase();
    if (etapa === etapaFinal) {
      mapaOP[idOp].quantidadeFinalizada += prod.quantidade_pecas || 0;
    }
  }

  // ================= PRODUÇÃO FINAL DO DIA =================
  for (const prod of producoesHoje) {
    const etapa = prod.producao_etapa?.descricao?.trim().toLowerCase();
    if (etapa === etapaFinal) {
      quantidadeFinalHoje += prod.quantidade_pecas || 0;
    }
  }

  // ================= OPS =================
  const ops = await prisma.pecasOP.findMany({
    where: {
      id_Estabelecimento: cnpj,
      id_da_op: { in: Object.keys(mapaOP).map(Number) }
    },
    select: {
      id_da_op: true,
      descricao: true,
      quantidade_pecas: true,
      valor_peca: true
    }
  });

  // ================= RELATÓRIO =================
  let receitaHoje = 0;

  const relatorio = ops.map(op => {
    const dados = mapaOP[op.id_da_op] || { quantidadeFinalizada: 0 };

    const pedidas = op.quantidade_pecas || 0;
    const feitas = Math.min(dados.quantidadeFinalizada, pedidas);
    const valor = op.valor_peca || 0;

    const receitaRealizada = feitas * valor;
    const restante = pedidas - feitas;
    const receitaProjetada = restante * valor;

    return {
      id_da_op: op.id_da_op,
      descricao: op.descricao,
      quantidade_pedida: pedidas,
      quantidade_etapa_final: feitas,
      valor_unitario: valor,
      receita_realizada: receitaRealizada,
      receita_projetada: receitaProjetada,
      status: feitas >= pedidas ? "finalizado" : "em andamento"
    };
  });

  // ================= RECEITA DO DIA =================
  receitaHoje = producoesHoje.reduce((acc, p) => {
    const etapa = p.producao_etapa?.descricao?.trim().toLowerCase();
    if (etapa !== etapaFinal) return acc;

    const op = ops.find(o => o.id_da_op === p.id_da_op);
    if (!op) return acc;

    return acc + (p.quantidade_pecas || 0) * (op.valor_peca || 0);
  }, 0);

  // ================= TOTAIS =================
  const totalRealizado = relatorio.reduce(
    (acc, r) => acc + r.receita_realizada, 0
  );

  const totalProjetado = relatorio.reduce(
    (acc, r) => acc + r.receita_projetada, 0
  );

  return {
    periodo: { dataInicio, dataFim },
    etapa_final: estabelecimento.peca_final,
    resumo: {
      total_realizado: totalRealizado,
      total_projetado: totalProjetado,
      total_geral: totalRealizado + totalProjetado
    },
    hoje: {
      quantidade_etapa_final: quantidadeFinalHoje,
      receita_produzida: receitaHoje
    },
    ops: relatorio
  };
}
async function relatorioProducaoResumo(req) {
  const cnpj = req.user.cnpj;
  const { dataInicio, dataFim } = req.query;

  const hoje = new Date();

  const inicio = dataInicio
    ? new Date(dataInicio)
    : new Date(hoje.setDate(hoje.getDate() - 30));

  const fim = dataFim ? new Date(dataFim) : new Date();

  /* PRODUÇÃO DO PERÍODO */
  const producoes = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: {
        gte: inicio,
        lte: fim,
      },
    },
    include: {
      producao_funcionario: {
        select: {
          nome: true,
          foto: true,
        },
      },
      producao_etapa: {
        select: {
          descricao: true,
        },
      },
    },
  });

  /* PRODUÇÃO TOTAL */
  const producaoTotal = producoes.reduce(
    (acc, p) => acc + (p.quantidade_pecas || 0),
    0
  );

  /* PRODUÇÃO POR DIA */
  const producaoPorDia = {};

  producoes.forEach((p) => {
    const dia = p.data_inicio.toISOString().split("T")[0];

    if (!producaoPorDia[dia]) {
      producaoPorDia[dia] = 0;
    }

    producaoPorDia[dia] += p.quantidade_pecas || 0;
  });

  /* PRODUÇÃO POR FUNCIONÁRIO */
  const producaoPorFuncionario = {};

  producoes.forEach((p) => {
    const nome = p.producao_funcionario?.nome || "Desconhecido";

    if (!producaoPorFuncionario[nome]) {
      producaoPorFuncionario[nome] = {
        nome,
        foto: p.producao_funcionario?.foto,
        quantidade: 0,
      };
    }

    producaoPorFuncionario[nome].quantidade += p.quantidade_pecas || 0;
  });

  const rankingFuncionarios = Object.values(producaoPorFuncionario)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  const melhorFuncionario = rankingFuncionarios[0] || null;

  /* PRODUÇÃO POR ETAPA */
  const producaoPorEtapa = {};

  producoes.forEach((p) => {
    const etapa = p.producao_etapa?.descricao || "Sem etapa";

    if (!producaoPorEtapa[etapa]) {
      producaoPorEtapa[etapa] = 0;
    }

    producaoPorEtapa[etapa] += p.quantidade_pecas || 0;
  });

  /* INTERCORRÊNCIAS */
  const intercorrencias = await prisma.intercorrencias.findMany({
    where: {
      estabelecimentoCnpj: cnpj,
      data_ocorrencia: {
        gte: inicio,
        lte: fim,
      },
    },
  });

  let tempoPerdidoTotal = 0;

  intercorrencias.forEach((i) => {
    tempoPerdidoTotal += i.tempo_perda || 0;
  });

  /* TEMPO PERDIDO POR MOTIVO */

  const tempoPerdidoPorMotivo = {};

  intercorrencias.forEach((i) => {
    const motivo = i.notas || "Outro";

    if (!tempoPerdidoPorMotivo[motivo]) {
      tempoPerdidoPorMotivo[motivo] = 0;
    }

    tempoPerdidoPorMotivo[motivo] += i.tempo_perda || 0;
  });

  /* EFICIÊNCIA DA TURMA */

  const eficiencia = await prisma.eficienciaTurma.findFirst({
    where: {
      estabelecimentoCnpj: cnpj,
    },
    orderBy: {
      calculadoEm: "desc",
    },
  });

  /* QUANTIDADE DE FUNCIONÁRIOS ATIVOS */

  const funcionariosAtivos = await prisma.usuarios.count({
    where: {
      estabelecimentoCnpj: cnpj,
      status: "ativo",
    },
  });

  return {
    periodo: {
      inicio,
      fim,
    },

    resumo: {
      producaoTotal,
      funcionariosAtivos,
      tempoPerdidoTotal,
      eficiencia: eficiencia?.eficiencia_percent || 0,
    },

    producaoPorDia,

    rankingFuncionarios,

    melhorFuncionario,

    producaoPorEtapa,

    tempoPerdidoPorMotivo,
  };
}
module.exports = {
    relatorioFinanceiro,
    relatorioProducaoResumo 
};