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

  console.log(`Serão removidos ${total} registros`)
}

deleteAll() 

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

  return prisma.producao.upsert({
    where: {
      id_funcionario_id_da_funcao_id_da_op_dataReferencia_hora_registro_tipoRegistro: {
        id_funcionario: funcionarioId,
        id_da_funcao: etapaId,
        id_da_op: opId,
        dataReferencia: dataDia,
        hora_registro: hora,
        tipoRegistro,
      },
    },

    update: {
      quantidade_pecas: quantidade,
      tempo_produzido: tempoProduzido,
      horaNumero: Number(hora),
    },

    create: {
      quantidade_pecas: quantidade,
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