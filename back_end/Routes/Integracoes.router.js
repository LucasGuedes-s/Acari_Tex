const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const { getProducaoEquipe } = require('../Services/OP.services');
router.get("/usuarios/telefone/:telefone", async (req, res) => {
  const { telefone } = req.params;

  const usuario = await prisma.usuarios.findFirst({
    where: { telefone }
  });

  if (!usuario) {
    return res.status(404).json({ error: "Não encontrado" });
  }

  res.json(usuario);
});

router.post("/auth/login-cpf", async (req, res) => {
  const { cpf, telefone } = req.body;

  const usuario = await prisma.usuarios.findFirst({
    where: { cpf }
  });

  if (!usuario) {
    return res.status(404).json({ error: "CPF não encontrado" });
  }

  // salva telefone no usuário
  await prisma.usuarios.update({
    where: { email: usuario.email },
    data: { telefone }
  });

  return res.json(usuario);
});
router.get("/producao/telefone/:telefone/hoje", async (req, res) => {
  try {
    const { telefone } = req.params;

    // ================= USUÁRIO =================
    const usuario = await prisma.usuarios.findFirst({
      where: { telefone },
      select: {
        email: true,
        nome: true,
        estabelecimentoCnpj: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const { email, nome, estabelecimentoCnpj: cnpj } = usuario;

    // ================= ESTABELECIMENTO =================
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj }
    });

    if (!estabelecimento) {
      return res.status(404).json({ erro: "Estabelecimento não encontrado" });
    }
    const resultado = await getProducaoEquipe({ cnpj, filtro: "hoje" });
    console.log("Resultado produção hoje:", resultado);

    return res.json({
      status: "sucesso",
      mensagem: "📊 Produção do dia finalizada!",
      resumo: {
        peca: resultado.producaoDia.descricaoPeca,
        total_pecas_produzidas: resultado.producaoDia.totalPecas,
        eficiencia_da_equipe: resultado.producaoDia.eficienciaMediaTurma,
        quantidade_de_colaboradores: resultado.producaoDia.quantidadePessoas,
        tempo_disponivel_minutos: resultado.producaoDia.minutosDisponiveis,
      },
      feedback: `A equipe produziu ${resultado.producaoDia.totalPecas} peças ao longo do dia, alcançando uma eficiência de ${resultado.producaoDia.eficienciaMediaTurma}.`,
      insight: "💡 Dica: Analise as etapas com menor rendimento para aumentar a produção da peça final.",
      dados_completos: resultado.producaoDia
    });

  } catch (error) {
    console.error("Erro produção hoje:", error);

    return res.status(500).json({
      erro: "Erro ao buscar produção"
    });
  }
});

module.exports = router;