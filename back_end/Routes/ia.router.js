const express = require("express");
const router = express.Router();
const { gerarAnaliseProducao } = require("../Services/index");
const { gerarAnaliseAlocacaoEtapas } = require("../Services/index");
const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()
const jwtMiddleware = require('../middlewares/auth')

router.get("/chat", jwtMiddleware, async (req, res) => {

  const resposta = await prisma.chatIAResultado.findMany({
    where: {
      estabelecimentoCnpj: req.user.cnpj
    },
    orderBy: {
      criadoEm: "desc"
    },
    take: 10
  });
  return res.json({
    sucesso: true,
    mensagem: "Rota de chat IA funcionando",
    dados: resposta
  });
});

router.post("/analise-producao", jwtMiddleware, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.body;
    const cnpj = req.user.cnpj;
    const usuarioEmail = req.user.email;
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj }
    });

    const etapaFinal = estabelecimento?.peca_final || null;
    const minutosDisponiveisDia = 480;

    const producoes = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim)
        }
      },
      include: {
        producao_etapa: true,
        producao_funcionario: true
      }
    });

    if (!producoes.length) {
      return res.json({
        sucesso: true,
        insight: "Não há dados de produção no período.",
        dadosIA: null
      });
    }

    /** 🔹 AGRUPA POR FUNCIONÁRIO + DIA */
    const controle = {};

    producoes.forEach(p => {
      const funcionario = p.producao_funcionario?.nome || "Não identificado";
      const etapa = p.producao_etapa?.descricao || "Não definida";
      const tempoPadrao = p.producao_etapa?.tempo_padrao || 0;
      const qtd = p.quantidade_pecas || 0;
      const dia = p.data_inicio.toISOString().split("T")[0];

      if (!controle[funcionario]) controle[funcionario] = {};
      if (!controle[funcionario][dia]) {
        controle[funcionario][dia] = {
          tempoPadraoProduzido: 0,
          etapas: {}
        };
      }

      const tempoProduzido = qtd * tempoPadrao;
      controle[funcionario][dia].tempoPadraoProduzido += tempoProduzido;

      if (!controle[funcionario][dia].etapas[etapa]) {
        controle[funcionario][dia].etapas[etapa] = 0;
      }
      controle[funcionario][dia].etapas[etapa] += tempoProduzido;
    });

    /** 🔹 EFICIÊNCIA POR FUNCIONÁRIO */
    const eficienciaIndividual = Object.entries(controle).map(
      ([funcionario, dias]) => {
        let somaEf = 0;
        let totalDias = 0;

        const diasDetalhados = Object.entries(dias).map(([dia, dados]) => {
          const eficienciaDia =
            (dados.tempoPadraoProduzido / minutosDisponiveisDia) * 100;

          somaEf += eficienciaDia;
          totalDias++;

          return {
            dia,
            eficiencia: Number(eficienciaDia.toFixed(2))
          };
        });

        const eficienciaMedia =
          totalDias > 0 ? somaEf / totalDias : 0;

        return {
          funcionario,
          eficienciaMedia: Number(eficienciaMedia.toFixed(2)),
          dias: diasDetalhados
        };
      }
    );

    /** 🔹 EFICIÊNCIA DA TURMA */
    const eficienciaTurma =
      eficienciaIndividual.reduce((s, f) => s + f.eficienciaMedia, 0) /
      eficienciaIndividual.length;

    const dadosIA = {
      estabelecimento: estabelecimento?.nome,
      periodo: `${dataInicio} até ${dataFim}`,
      eficienciaTurma: Number(eficienciaTurma.toFixed(2)),
      eficienciaIndividual,
      cnpj,
      usuarioEmail
    };
    if (dadosIA.eficienciaIndividual.length === 0) {
      return res.json({
        sucesso: true,
        insight: "Não há dados de produção no período.",
        dadosIA: null
      });
    }
    const insight = await gerarAnaliseProducao(dadosIA);
    dadosIA.insight = insight;
    return res.json({
      sucesso: true,
      dadosIA
    });

  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao gerar análise"
    });
  }

});

router.get("/indicar-profissionais", jwtMiddleware, async (req, res) => {
  try {
    const hoje = new Date();

    const dataFim = new Date(hoje);
    dataFim.setHours(23, 59, 59, 999);

    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);
    dataInicio.setHours(0, 0, 0, 0);
    const cnpj = req.user.cnpj;
    const usuarioEmail = req.user.email;
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj }
    });

    const etapaFinal = estabelecimento?.peca_final || null;
    const minutosDisponiveisDia = 480;

    const producoes = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim)
        }
      },
      include: {
        producao_etapa: true,
        producao_funcionario: true
      }
    });

    if (!producoes.length) {
      return res.json({
        sucesso: true,
        insight: "Não há dados de produção no período.",
        dadosIA: null
      });
    }

    /** 🔹 AGRUPA POR FUNCIONÁRIO + DIA */
    const controle = {};

    producoes.forEach(p => {
      const funcionario = p.producao_funcionario?.nome || "Não identificado";
      const etapa = p.producao_etapa?.descricao || "Não definida";
      const tempoPadrao = p.producao_etapa?.tempo_padrao || 0;
      const qtd = p.quantidade_pecas || 0;
      const dia = p.data_inicio.toISOString().split("T")[0];

      if (!controle[funcionario]) controle[funcionario] = {};
      if (!controle[funcionario][dia]) {
        controle[funcionario][dia] = {
          tempoPadraoProduzido: 0,
          etapas: {}
        };
      }

      const tempoProduzido = qtd * tempoPadrao;
      controle[funcionario][dia].tempoPadraoProduzido += tempoProduzido;

      if (!controle[funcionario][dia].etapas[etapa]) {
        controle[funcionario][dia].etapas[etapa] = 0;
      }
      controle[funcionario][dia].etapas[etapa] += tempoProduzido;
    });

    /** 🔹 EFICIÊNCIA POR FUNCIONÁRIO */
    const eficienciaIndividual = Object.entries(controle).map(
  ([funcionario, dias]) => {
    let somaEf = 0;
    let totalDias = 0;

    const diasDetalhados = Object.entries(dias).map(([dia, dados]) => {
      const eficienciaDia =
        (dados.tempoPadraoProduzido / minutosDisponiveisDia) * 100;

      somaEf += eficienciaDia;
      totalDias++;

      return {
        dia,
        eficiencia: Number(eficienciaDia.toFixed(2)),
        etapas: Object.entries(dados.etapas).map(([etapa, tempo]) => ({
          etapa,
          tempoPadraoProduzido: tempo
        }))
      };
    });

    const eficienciaMedia =
      totalDias > 0 ? somaEf / totalDias : 0;

    return {
      funcionario,
      eficienciaMedia: Number(eficienciaMedia.toFixed(2)),
      dias: diasDetalhados
    };
  }
);


    /** 🔹 EFICIÊNCIA DA TURMA */
    const eficienciaTurma =
      eficienciaIndividual.reduce((s, f) => s + f.eficienciaMedia, 0) /
      eficienciaIndividual.length;

    const dadosIA = {
      estabelecimento: estabelecimento?.nome,
      periodo: `${dataInicio} até ${dataFim}`,
      eficienciaTurma: Number(eficienciaTurma.toFixed(2)),
      eficienciaIndividual,
      
      cnpj,
      usuarioEmail
    };
    if (dadosIA.eficienciaIndividual.length === 0) {
      return res.json({
        sucesso: true,
        insight: "Não há dados de produção no período.",
        dadosIA: null
      });
    }
    const insight = await gerarAnaliseAlocacaoEtapas(dadosIA);
    dadosIA.insight = insight;
    return res.json({
      sucesso: true,
      insight,
    });

  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao gerar análise"
    });
  }

});

module.exports = router;
