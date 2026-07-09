const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function deleteAll() {
  const total = await prisma.producao.count({
    where: {
      id_Estabelecimento: '12345678'
    }
  })

  const resultado = await prisma.producao.deleteMany({
    where: {
      id_Estabelecimento: '12345678'
    }
  })

}

// deleteAll() 

function getData() {
  const agora = new Date();
  const offsetBrasil = -3;
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasil = new Date(utc + 3600000 * offsetBrasil);

  brasil.setHours(0, 0, 0, 0);
  return brasil;
}
async function salvarProducao(payload) {
  const {
    funcionarioId,
    etapaId,
    opId,
    quantidade,
    hora,
    data,
    estabelecimento,
    tipoRegistro,
    tempoProduzido,
  } = payload

  if (!etapaId) return

  const dataDia = new Date(data)
  dataDia.setHours(0, 0, 0, 0)

  const where = {
    id_funcionario_id_da_funcao_id_da_op_dataReferencia_hora_registro_tipoRegistro: {
      id_funcionario: funcionarioId,
      id_da_funcao: etapaId,
      id_da_op: opId,
      dataReferencia: dataDia,
      hora_registro: hora,
      tipoRegistro,
    },
  }

  // Se a quantidade for zero, remove o registro
  if (Number(quantidade) === 0) {
    const producao = await prisma.producao.findFirst({
      where: {
        id_funcionario: funcionarioId,
        id_da_funcao: etapaId,
        id_da_op: opId,
        hora_registro: hora,
        tipoRegistro,
      },
    })

    if (producao) {
      const remover =await prisma.producao.delete({
        where: {
          id_da_producao: producao.id_da_producao,
        },
      })
    }

    return remover
  }

  // Caso contrário cria ou atualiza
  return prisma.producao.upsert({
    where,

    update: {
      quantidade_pecas: Number(quantidade),
      tempo_produzido: tempoProduzido,
      horaNumero: Number(hora),
    },

    create: {
      quantidade_pecas: Number(quantidade),
      id_Estabelecimento: estabelecimento,
      id_da_op: opId,
      id_funcionario: funcionarioId,
      id_da_funcao: etapaId,
      hora_registro: hora,
      horaNumero: Number(hora),
      data_inicio: getData(),
      dataReferencia: dataDia,
      tipoRegistro,
      tempo_produzido: tempoProduzido,
    },
  })
}
module.exports = {
  salvarProducao,
}