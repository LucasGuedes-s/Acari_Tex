// Cliente compartilhado: um único pool de conexões (ver config/prisma.js).
const prisma = require('../config/prisma');

async function getNotificacoes(req) {
  const cnpj = req.user.cnpj;

  // 2️⃣ Define hoje, ontem e amanhã (com fuso de São Paulo)
  const agora = new Date();
  const local = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

  const hoje = new Date(local);
  hoje.setHours(0, 0, 0, 0);

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  // 1️⃣ OTIMIZAÇÃO MEDIDA: os 3 agregados abaixo filtravam por
  // `producao_etapa.descricao` (JOIN em Etapa + varredura das ~12 mil linhas
  // de Producao do estabelecimento em CADA consulta — ~900 ms cada, medido).
  // Com os ids das etapas "Revisão Final" buscados uma única vez, o filtro
  // passa a usar o índice existente em Producao.id_da_funcao. Resultado
  // idêntico: o JOIN original também só casava a etapa da própria linha.
  const etapasFinais = await prisma.etapa.findMany({
    where: { descricao: 'Revisão Final' },
    select: { id_da_funcao: true },
  });
  const idsEtapasFinais = etapasFinais.map(e => e.id_da_funcao);

  // 1️⃣+3️⃣+4️⃣+5️⃣ Consultas independentes → paralelas (antes: sequenciais;
  // cada ida ao Aiven cobra ~300 ms só de rede).
  const [notificacoes, producaoHoje, topFuncionarioHoje, producaoOntem] = await Promise.all([
    // 1️⃣ Busca notificações não lidas
    prisma.notificacoes.findMany({
      where: { lida: false, estabelecimentoCnpj: cnpj },
      orderBy: { criadaEm: 'desc' },
      take: 50
    }),
    // 3️⃣ Produção do dia atual (somente "Revisão Final")
    prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: { gte: hoje, lt: amanha },
        id_da_funcao: { in: idsEtapasFinais }
      }
    }),
    // 4️⃣ Melhor funcionário do dia (somente "Revisão Final")
    prisma.producao.groupBy({
      by: ['id_funcionario'],
      _sum: { quantidade_pecas: true },
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: { gte: hoje, lt: amanha },
        id_da_funcao: { in: idsEtapasFinais }
      },
      orderBy: { _sum: { quantidade_pecas: 'desc' } },
      take: 1
    }),
    // 5️⃣ Produção do dia anterior (somente "Revisão Final")
    prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_Estabelecimento: cnpj,
        data_inicio: { gte: ontem, lt: hoje },
        id_da_funcao: { in: idsEtapasFinais }
      }
    }),
  ]);

  const qtdHoje = producaoHoje._sum.quantidade_pecas || 0;

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
async function getEmpresa(req) {
    const cnpj = req.user.cnpj
    const empresa = await prisma.Estabelecimento.findUnique({
      where: {cnpj: cnpj}
    })
    return empresa;
}

async function registrarAlertaProdutividade(dados) {
  const {
    estabelecimentoCnpj,
    funcionarioId,
    funcionarioNome,
    opId,
    etapaNome,
    eficiencia,
    tempoUtilizado,
    tempoPadrao,
    tempoReferencia,
    quantidadeProduzida,
  } = dados

  // Mensagem estruturada em texto — necessário nesta opção porque o
  // model Notificacoes não tem colunas próprias para os campos técnicos.
  const partes = [
    `${funcionarioNome || funcionarioId} está produzindo abaixo da meta.`,
    `OP: ${opId || '—'}`,
    `Eficiência: ${eficiencia}%`,
    `Tempo padrão: ${tempoPadrao ?? '—'} min`,
  ]
  if (tempoReferencia != null) partes.push(`Tempo de referência: ${tempoReferencia} min`)
  partes.push(`Tempo utilizado: ${tempoUtilizado} min`)
  partes.push(`Quantidade produzida: ${quantidadeProduzida}`)

  return prisma.notificacoes.create({
    data: {
      estabelecimentoCnpj,
      titulo: 'Baixa produtividade detectada',
      mensagem: partes.join(' · '),
      etapa: etapaNome || 'Coletiva',
    },
  })
}

async function limparNotificacoesAntigas(estabelecimentoCnpj) {
  const limite = new Date()
  limite.setDate(limite.getDate() - 1)

  const resultado = await prisma.notificacoes.updateMany({
    where: {
      estabelecimentoCnpj,
      lida: false,
      criadaEm: {
        lt: limite
      }
    },
    data: {
      lida: true
    }
  })

  return resultado.count
}
module.exports = {
    getNotificacoes,
    putNotificacaoLida,
    getEmpresa,
    registrarAlertaProdutividade,
    limparNotificacoesAntigas
}