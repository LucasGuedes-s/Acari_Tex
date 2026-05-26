const { PrismaClient } = require('@prisma/client');
const { get } = require('../Routes/EstoqueTecido.router');
prisma = new PrismaClient()
function getData() {
  const agora = new Date();
  const offsetBrasil = -3;
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasil = new Date(utc + 3600000 * offsetBrasil);

  brasil.setHours(0, 0, 0, 0);
  return brasil;
}

async function salvarProducao(
  payload
) {

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
  console.log(tempoProduzido)
  const dataDia = new Date(data)

  dataDia.setHours(0,0,0,0)
  if (!etapaId) return
  return prisma.producao.upsert({
        where: {
        id_funcionario_id_da_funcao_id_da_op_dataReferencia_hora_registro_tipoRegistro: {
        id_funcionario:
          funcionarioId,

        id_da_funcao:
          etapaId,

        id_da_op:
          opId,

        dataReferencia:
          dataDia,

        hora_registro:
          hora,

        tipoRegistro:
          tipoRegistro,
      },
    },

    update: {
      quantidade_pecas:
        quantidade,
    },

    create: {

      quantidade_pecas:
        quantidade,

      id_Estabelecimento:
        estabelecimento,

      id_da_op:
        opId,

      id_funcionario:
        funcionarioId,

      id_da_funcao:
        etapaId,

      hora_registro:
        hora,

      horaNumero:
        Number(hora),

      data_inicio:
        getData(),

      tipoRegistro:
        tipoRegistro,

      tempo_produzido:
        tempoProduzido,
    },
  })
}

module.exports = {
  salvarProducao,
}