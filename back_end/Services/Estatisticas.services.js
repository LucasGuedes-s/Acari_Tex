const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { subDays } = require("date-fns");

async function analisarProducaoFuncionarioDia(req, idFuncionario) {
  const fusoSP = "America/Sao_Paulo";
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

  const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
  const fimDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));

  const cnpj = req.user.cnpj;
  const producaoDia = await prisma.producao.findMany({
    where: {
      data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      id_Estabelecimento: cnpj
    },
    include: {
      producao_funcionario: true,
      producao_etapa: true
    }
  });

  if (producaoDia.length === 0) {
    return { mensagem: "Nenhuma produção registrada hoje." };
  }

  // ================= AGRUPAMENTO =================
  const etapas = {};

  for (const registro of producaoDia) {
    const etapaId = registro.id_da_funcao;
    const hora = registro.hora_registro || "00h";
    const tempoPadraoEtapa = registro.producao_etapa?.tempo_padrao || 0;

    if (!etapas[etapaId]) {
      etapas[etapaId] = {
        descricao: registro.producao_etapa?.descricao || `Etapa ${etapaId}`,
        tempoPadraoEtapa,
        horas: {}
      };
    }

    if (!etapas[etapaId].horas[hora]) {
      etapas[etapaId].horas[hora] = {};
    }

    if (!etapas[etapaId].horas[hora][registro.id_funcionario]) {
      etapas[etapaId].horas[hora][registro.id_funcionario] = {
        nome: registro.producao_funcionario?.nome || registro.id_funcionario,
        pecas: 0
      };
    }

    etapas[etapaId].horas[hora][registro.id_funcionario].pecas += registro.quantidade_pecas || 0;
  }

  // ================= RESULTADO =================
  const resultado = [];
  const nomeFuncionario =
    producaoDia.find(r => r.id_funcionario === idFuncionario)?.producao_funcionario?.nome ||
    idFuncionario;
  for (const [idEtapa, dados] of Object.entries(etapas)) {
    const tempoPadrao = dados.tempoPadraoEtapa;

    if (!tempoPadrao || tempoPadrao <= 0) continue;

    for (const [hora, funcionariosMap] of Object.entries(dados.horas)) {
      const funcionario = funcionariosMap[idFuncionario];
      if (!funcionario) continue;

      // 👉 meta por hora (60 minutos / tempo padrão)
      const metaHora = 60 / tempoPadrao;

      resultado.push({
        etapa: dados.descricao,
        hora,
        producao: funcionario.pecas,
        metaHora: Number(metaHora.toFixed(2)),
        eficiencia: ((funcionario.pecas / metaHora) * 100).toFixed(2) + "%",
        abaixoDaMeta: funcionario.pecas < metaHora
      });
    }
  }
  return {
    funcionario: nomeFuncionario,
    data: `${dia}/${mes}/${ano}`,
    desempenho: resultado.filter(r => r.abaixoDaMeta)
  };
}

async function analisarProducaoDia(req) {
  const fusoSP = "America/Sao_Paulo";

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

  // Limite do dia em UTC
  const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
  const fimDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59));

  const cnpj = req.user.cnpj;
  const producaoDia = await prisma.producao.findMany({
    where: {
      data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      id_Estabelecimento: cnpj
    },
    include: {
      producao_funcionario: true,
      producao_etapa: true
    }
  });

  if (producaoDia.length === 0) {
    return { mensagem: "Nenhuma produção registrada hoje." };
  }

  // Estrutura -> etapas -> horas -> funcionários
  const etapas = {};

  for (const registro of producaoDia) {
    const etapaId = registro.id_da_funcao;
    const hora = registro.hora_registro || "Sem hora";

    if (!etapas[etapaId]) {
      etapas[etapaId] = {
        descricao: registro.producao_etapa?.descricao || `Etapa ${etapaId}`,
        horas: {}
      };
    }

    if (!etapas[etapaId].horas[hora]) {
      etapas[etapaId].horas[hora] = {};
    }

    if (!etapas[etapaId].horas[hora][registro.id_funcionario]) {
      etapas[etapaId].horas[hora][registro.id_funcionario] = {
        nome: registro.producao_funcionario?.nome || registro.id_funcionario,
        pecas: 0
      };
    }

    etapas[etapaId].horas[hora][registro.id_funcionario].pecas += registro.quantidade_pecas || 0;
  }

  const resultado = [];

  for (const [idEtapa, dados] of Object.entries(etapas)) {
    for (const [hora, funcionariosMap] of Object.entries(dados.horas)) {
      const funcionarios = Object.values(funcionariosMap);
      const total = funcionarios.reduce((s, f) => s + f.pecas, 0);
      const media = total / funcionarios.length;

      const abaixoDaMedia = funcionarios.filter(f => f.pecas < media);

      resultado.push({
        etapa: dados.descricao,
        hora,
        media: media.toFixed(2),
        abaixoDaMedia: abaixoDaMedia.map(f => ({
          nome: f.nome,
          producao: f.pecas
        }))
      });
    }
  }

  return resultado;
}
function calcularProdutividade(registros) {
  if (!registros || registros.length < 2) return { media: 0, tempo: "Sem dados suficientes" };

  const inicio = new Date(registros[0].data);
  const fim = new Date(registros[registros.length - 1].data);
  const horas = (fim - inicio) / (1000 * 60 * 60);

  if (horas <= 0) return { media: 0, tempo: "Sem dados suficientes" };

  const total = registros.reduce((acc, r) => acc + r.quantidade, 0);
  const media = total / horas;

  return { media, tempo: `${media.toFixed(2)} peças/h` };
}

async function projetarTodasProducoes(req) {
    const ops = await prisma.pecasOP.findMany({
      include: {
        producao_peca: {
          include: {
            producao_funcionario: true,
            producao_etapa: true
          }        
        }
      }
    });

    const projecoes = ops.map(op => {
      if (!op.producao_peca || op.producao_peca.length === 0) {
        return {
          op: `${op.id_da_op} - ${op.descricao}`,
          etapas: [],
          status: "Sem produção registrada ainda"
        };
      }

      let totalProducao = 0;
      let totalMedia = 0;
      let etapasValidas = 0;

      // Agrupa por etapa
      const etapasMap = {};
      for (const prod of op.producao_peca) {
        const etapaNome = prod.producao_etapa?.descricao || "Etapa não definida";

        if (!etapasMap[etapaNome]) etapasMap[etapaNome] = [];
        etapasMap[etapaNome].push(prod);
      }

      const etapas = Object.entries(etapasMap).map(([etapaNome, registros]) => {
        const producaoAtual = registros.reduce((acc, p) => acc + p.quantidade, 0);
        const { media, tempo } = calcularProdutividade(registros);

        if (media > 0) {
          totalMedia += media;
          etapasValidas++;
        }
        totalProducao += producaoAtual;

        return {
          etapa: etapaNome,
          producaoAtual,
          produtividadeMedia: tempo,
          tempoEstimado: media > 0 ? `${(100 / media).toFixed(2)}h para 100 peças` : "Sem dados suficientes"
        };
      });

      const mediaGeral = etapasValidas > 0 ? (totalMedia / etapasValidas).toFixed(2) : 0;

      return {
        op: `${op.id_da_op} - ${op.descricao}`,
        etapas,
        producaoTotal: totalProducao,
        mediaGeral: mediaGeral > 0 ? `${mediaGeral} peças/h` : "Sem dados suficientes"
      };
    });

    return projecoes;
};

async function projetarProducao(req) {

    const dias = 10;
    const dataInicial = subDays(new Date(), dias);
    const cnpj = req.user.cnpj;
    const producao = await prisma.producao.groupBy({
      by: ['data_inicio'],
      _sum: { quantidade_pecas: true },
      orderBy: { data_inicio: 'asc' },
      where: { id_Estabelecimento: cnpj, data_inicio: { gte: dataInicial } }
    });

    // 2. Organizar os dados
    const datas = producao.map(p => p.data_inicio);
    const quantidades = producao.map(p => p._sum.quantidade_pecas || 0);

    // 3. Calcular projeção simples (regressão linear)
    const n = quantidades.length;
    const x = [...Array(n).keys()];
    const y = quantidades;

    const avgX = x.reduce((a,b)=>a+b,0)/n;
    const avgY = y.reduce((a,b)=>a+b,0)/n;
    const num = x.map((xi,i)=>(xi-avgX)*(y[i]-avgY)).reduce((a,b)=>a+b,0);
    const den = x.map((xi)=>(xi-avgX)**2).reduce((a,b)=>a+b,0);
    const slope = num/den;
    const intercept = avgY - slope*avgX;

    // 4. Gerar projeção para 3 períodos futuros
    const projecao = [...Array(3).keys()].map(i => {
      const novoX = n + i;
      return Math.max(0, intercept + slope * novoX);
    });

    return {
      datas,
      quantidades,
      projecao
    };
}

async function producaoFinanceira(req) {
  const dias = 10;
  const dataInicial = subDays(new Date(), dias);
  const cnpj = req.user.cnpj;

  // 1️⃣ Buscar a produção diária do estabelecimento
  const producao = await prisma.producao.groupBy({
    by: ["data_inicio"],
    _sum: { quantidade_pecas: true },
    orderBy: { data_inicio: "asc" },
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: { gte: dataInicial },
    },
  });

  // 2️⃣ Buscar intercorrências no mesmo intervalo
  const intercorrencias = await prisma.intercorrencias.findMany({
    where: {
      estabelecimentoCnpj: cnpj,
      data_inicio: { gte: dataInicial },
    },
    select: {
      data_inicio: true,
      perda_financeira: true, // campo que indica o valor perdido
    },
  });

  // 3️⃣ Converter intercorrências em perda por dia
  const perdasPorData = {};
  intercorrencias.forEach((i) => {
    const dia = new Date(i.data_inicio).toISOString().split("T")[0];
    perdasPorData[dia] = (perdasPorData[dia] || 0) + (i.perda_financeira || 0);
  });

  // 4️⃣ Montar vetores de datas e quantidades ajustadas
  const datas = producao.map((p) => p.data_inicio);
  const quantidades = producao.map((p) => {
    const dia = new Date(p.data_inicio).toISOString().split("T")[0];
    const perda = perdasPorData[dia] || 0;
    const quantidade = p._sum.quantidade_pecas || 0;
    // Ajuste proporcional: supondo que perda_financeira afeta diretamente a quantidade
    const ajuste = Math.max(0, quantidade - perda * 0.1); // peso 0.1 → 10% de perda
    return ajuste;
  });

  // 5️⃣ Regressão linear simples (projeção)
  const n = quantidades.length;
  const x = [...Array(n).keys()];
  const y = quantidades;

  const avgX = x.reduce((a, b) => a + b, 0) / n;
  const avgY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.map((xi, i) => (xi - avgX) * (y[i] - avgY)).reduce((a, b) => a + b, 0);
  const den = x.map((xi) => (xi - avgX) ** 2).reduce((a, b) => a + b, 0);
  const slope = num / den;
  const intercept = avgY - slope * avgX;

  // 6️⃣ Gerar projeção futura (3 períodos)
  const projecao = [...Array(3).keys()].map((i) => {
    const novoX = n + i;
    return Math.max(0, intercept + slope * novoX);
  });

  // 7️⃣ Calcular perda total no período
  const perdaTotal = Object.values(perdasPorData).reduce((a, b) => a + b, 0);

  return {
    datas,
    quantidades,
    projecao,
    perdaTotal,
    resumo: `Perda financeira estimada no período: R$ ${perdaTotal.toFixed(2)}`,
  };
}

module.exports = { analisarProducaoFuncionarioDia, analisarProducaoDia, projetarTodasProducoes, projetarProducao, producaoFinanceira };

