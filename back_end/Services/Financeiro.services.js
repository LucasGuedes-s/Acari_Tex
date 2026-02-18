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
        data,
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
  const cnpj = req.user.cnpj
    return await prisma.financeiro.findMany({
      where: {
        estabelecimentoCnpj: cnpj
      },
      orderBy: {
        criadoEm: 'desc'
      }
    })
}
module.exports = {
    postCaixa,
    getCaixa
}