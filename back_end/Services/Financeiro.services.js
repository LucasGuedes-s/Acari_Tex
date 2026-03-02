const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function postCaixa(req) {
  const { notaFiscal, tipo, categoria, valor, data, descricao } = req.body
  const cnpj = req.user.cnpj
  const registradaPor = req.user.email

  return await prisma.$transaction(async (tx) => {
    // 1️⃣ Buscar último saldo
    const ultimoRegistro = await tx.financeiro.findFirst({
      where: { estabelecimentoCnpj: cnpj },
      orderBy: { criadoEm: 'desc' }
    })

    const saldoAnterior = ultimoRegistro?.saldoRestante ?? 0

    // 2️⃣ Calcular novo saldo
    let novoSaldo = saldoAnterior

    if (tipo === 'receita') {
      novoSaldo += valor
    } else if (tipo === 'despesa') {
      novoSaldo -= valor
    }

    // 3️⃣ Criar novo registro
    const caixa = await tx.financeiro.create({
      data: {
        notaFiscal,
        tipo,
        categoria,
        valor,
        data: new Date(data),
        descricao,
        registradaPor,
        estabelecimentoCnpj: cnpj,
        saldoRestante: novoSaldo
      }
    })

    return caixa
  })
}

async function getCaixa(req) {
  const { dataInicio, dataFim } = req.query
 
  const cnpj = req.user.cnpj
    return await prisma.financeiro.findMany({
      where: {
        estabelecimentoCnpj: cnpj,
        data: {
          gte: dataInicio ? new Date(dataInicio) : undefined,
          lte: dataFim ? new Date(dataFim) : undefined
        }
      },
      orderBy: {
        criadoEm: 'desc'
      }
    })
}
async function deletarLancamento(id, cnpj) {
  return await prisma.$transaction(async (tx) => {

    // 1️⃣ Buscar lançamento
    const lancamento = await tx.financeiro.findFirst({
      where: {
        id: Number(id),
        estabelecimentoCnpj: cnpj
      }
    })

    if (!lancamento) {
      throw new Error('Lançamento não encontrado ou acesso negado')
    }

    // 2️⃣ Buscar saldo anterior ao lançamento deletado
    const anterior = await tx.financeiro.findFirst({
      where: {
        estabelecimentoCnpj: cnpj,
        criadoEm: { lt: lancamento.criadoEm }
      },
      orderBy: { criadoEm: 'desc' }
    })

    let saldoBase = anterior?.saldoRestante ?? 0

    // 3️⃣ Deletar lançamento
    await tx.financeiro.delete({
      where: { id: lancamento.id }
    })

    // 4️⃣ Buscar lançamentos posteriores
    const posteriores = await tx.financeiro.findMany({
      where: {
        estabelecimentoCnpj: cnpj,
        criadoEm: { gt: lancamento.criadoEm }
      },
      orderBy: { criadoEm: 'asc' }
    })

    // 5️⃣ Recalcular saldos
    for (const item of posteriores) {
      if (item.tipo === 'receita') {
        saldoBase += item.valor
      } else {
        saldoBase -= item.valor
      }

      await tx.financeiro.update({
        where: { id: item.id },
        data: { saldoRestante: saldoBase }
      })
    }

    return true
  })
}
module.exports = {
    postCaixa,
    getCaixa,
    deletarLancamento
}