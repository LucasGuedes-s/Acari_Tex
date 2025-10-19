const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function relatorioFinanceiro(req) {
  const cnpj = req.user.cnpj;
  const { dataInicio, dataFim } = req.query;

  // 1️⃣ Agrupar produção por OP
  const producoes = await prisma.producao.groupBy({
    by: ['id_da_op'],
    _sum: { quantidade_pecas: true },
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: { gte: new Date(dataInicio), lt: new Date(dataFim) }
    }
  });

  // 2️⃣ Buscar informações da OP e calcular valores
  const relatorioCompleto = await Promise.all(producoes.map(async (item) => {
    const op = await prisma.pecasOP.findUnique({
      where: { id_da_op: item.id_da_op },
      select: {
        descricao: true,
        valor_peca: true,
        quantidade_pecas: true,
        status: true
      }
    });

    if (!op) return null;

    const quantidadeProduzida = item._sum.quantidade_pecas || 0;
    const quantidadeTotal = op.quantidade_pecas || 0;
    const valorUnitario = op.valor_peca || 0;

    // Receita já realizada (produção real)
    const receitaRealizada = Math.min(quantidadeProduzida, quantidadeTotal) * valorUnitario;

    // Receita projetada (restante até concluir)
    const quantidadeRestante = Math.max(quantidadeTotal - quantidadeProduzida, 0);
    const receitaProjetada = quantidadeRestante * valorUnitario;

    return {
      id_da_op: item.id_da_op,
      descricao: op.descricao,
      quantidade_pedida: quantidadeTotal,
      quantidade_produzida: quantidadeProduzida,
      valor_unitario: valorUnitario,
      receita_realizada: receitaRealizada,
      quantidade_restante: quantidadeRestante,
      receita_projetada: receitaProjetada,
      status: op.status || (quantidadeProduzida >= quantidadeTotal ? 'finalizado' : 'em andamento')
    };
  }));

  const listaFiltrada = relatorioCompleto.filter(Boolean);

  // 3️⃣ Separar concluídas e em andamento
  const concluidas = listaFiltrada.filter(op => op.status === 'finalizado');
  const emAndamento = listaFiltrada.filter(op => op.status !== 'concluida');

  // 4️⃣ Somatórios gerais
  const totalRealizado = concluidas.reduce((acc, o) => acc + o.receita_realizada, 0);
  const totalProjetado = emAndamento.reduce((acc, o) => acc + o.receita_projetada, 0);

  return {
    resumo: {
      total_realizado: totalRealizado,
      total_projetado: totalProjetado,
      total_geral: totalRealizado + totalProjetado
    },
    concluidas,
    emAndamento
  };
}

module.exports = {
    relatorioFinanceiro
};