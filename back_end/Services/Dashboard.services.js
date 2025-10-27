const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()
async function getNotificacoes(req) {
  const cnpj = req.user.cnpj;

  // 1️⃣ Busca notificações não lidas
  const notificacoes = await prisma.notificacoes.findMany({
    where: { lida: false, estabelecimentoCnpj: cnpj },
    orderBy: { criadaEm: 'desc' },
    take: 50
  });

  // 2️⃣ Define hoje, ontem e amanhã (com fuso de São Paulo)
  const agora = new Date();
  const local = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

  const hoje = new Date(local);
  hoje.setHours(0, 0, 0, 0);

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  // 3️⃣ Produção do dia atual (somente "Revisão Final")
  const producaoHoje = await prisma.producao.aggregate({
    _sum: { quantidade_pecas: true },
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: { gte: hoje, lt: amanha },
      producao_etapa: { descricao: "Revisão Final" }
    }
  });

  const qtdHoje = producaoHoje._sum.quantidade_pecas || 0;

  // 4️⃣ Melhor funcionário do dia (somente "Revisão Final")
  const topFuncionarioHoje = await prisma.producao.groupBy({
    by: ['id_funcionario'],
    _sum: { quantidade_pecas: true },
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: { gte: hoje, lt: amanha },
      producao_etapa: { descricao: "Revisão Final" }
    },
    orderBy: { _sum: { quantidade_pecas: 'desc' } },
    take: 1
  });

  let melhorFuncionario = null;

  if (topFuncionarioHoje[0]) {
    const funcionarioId = topFuncionarioHoje[0].id_funcionario;
    const quantidade = topFuncionarioHoje[0]._sum.quantidade_pecas || 0;

    const usuario = await prisma.usuarios.findUnique({
      where: { email: funcionarioId },
      select: { nome: true, foto: true }
    });

    if (usuario) {
      melhorFuncionario = {
        id: funcionarioId,
        nome: usuario.nome,
        foto: usuario.foto,
        quantidade
      };
    }
  }

  // 5️⃣ Produção do dia anterior (somente "Revisão Final")
  const producaoOntem = await prisma.producao.aggregate({
    _sum: { quantidade_pecas: true },
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: { gte: ontem, lt: hoje },
      producao_etapa: { descricao: "Revisão Final" }
    }
  });

  const qtdOntem = producaoOntem._sum.quantidade_pecas || 0;
  const qtdParaAlcancarOntem = Math.max(qtdOntem - qtdHoje, 0);

  // 6️⃣ Monta resumo da produção
  let resumoProducao = `Hoje a produção da etapa de revisão final é de ${qtdHoje} peças.`;
  if (qtdOntem > 0) {
    resumoProducao = `Ontem, na revisão final, foram produzidas ${qtdOntem} peças. Hoje temos ${qtdHoje} peças. Para alcançar o mesmo nível de ontem, precisamos produzir mais ${qtdParaAlcancarOntem} peças.`;
  }
  if (melhorFuncionario) {
    resumoProducao += `\nO destaque da revisão final hoje é ${melhorFuncionario.nome}, com ${melhorFuncionario.quantidade} peças.`;
  }

  return {
    notificacoes,
    resumoProducao,
    melhorFuncionario
  };
}

async function putNotificacaoLida(req) {
    const { id } = req.params;
    const cnpj = req.user.cnpj;
    await prisma.notificacoes.updateMany({
        where: { id: parseInt(id), estabelecimentoCnpj: cnpj },
        data: { lida: true }
    });
    return 'Notificação marcada como lida com sucesso.';
}
module.exports = {
    getNotificacoes,
    putNotificacaoLida
}