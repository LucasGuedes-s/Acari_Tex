const producaoService = require('../Services/producao.socket.services')
const meta = require('../Services/metaDia.service')
const { PrismaClient } = require('@prisma/client');

prisma = new PrismaClient()

module.exports = (io, socket) => {

  socket.on(
  'salvar-producao',
  async (payload, callback) => {
    try {
      const producao = await producaoService.salvarProducao(payload)

      io.emit(
        `nova_atualizacao_${payload.cnpj}`,
        producao
      )

      if (typeof callback === 'function') {
        callback({
          sucesso: true,
          producao,
          mensagem: 'Produção salva com sucesso'
        })
      }

    } catch (err) {
      console.log(err)

      if (typeof callback === 'function') {
        callback({
          sucesso: false,
          mensagem: 'Erro ao salvar',
          erro: err.message
        })
      }

      socket.emit(
        'erro-producao',
        'Erro ao salvar'
      )
    }
  }
)
  socket.on(
    'salvar-meta-dia',
    async payload => {

      try {

        const resultado = await meta.salvarMetaDia(payload)
        socket.emit(
          'meta-dia-salva',
          resultado
        )

      } catch (err) {

        console.log(err)

        socket.emit(
          'erro-meta-dia',
          err.message
        )

      }

    }
  )
  socket.on('buscar-meta-dia', async (dados, callback) => {
    try {
      //console.log("Buscando meta do dia para o estabelecimento:", dados);
      const metaDia = await meta.buscarMetaDia(dados)
      callback({
        sucesso: true,
        metaDia,
      })

    } catch (err) {

      console.log(err)

      callback({
        sucesso: false,
        erro: 'Erro ao buscar meta do dia',
      })
    }
  })
socket.on("transferir-producao", async (dados, callback) => {
  try {
    const {
      estabelecimento,
      usuario,
      data,
      opId,
      etapaOrigemId,
      etapaDestinoId,
      periodo,
      horario,
      funcionarioEmail,
      motivo,
    } = dados

    if (!opId || !etapaOrigemId || !etapaDestinoId) {
      return callback({
        sucesso: false,
        mensagem: "Dados inválidos.",
      })
    }

    if (etapaOrigemId === etapaDestinoId) {
      return callback({
        sucesso: false,
        mensagem: "A etapa de origem e destino devem ser diferentes.",
      })
    }

    const where = {
      id_da_op: Number(opId),
      id_da_funcao: Number(etapaOrigemId),
      dataReferencia: new Date(data),
    }

    if (periodo === "funcionario") {
      where.id_funcionario = funcionarioEmail
    }

    if (periodo === "horario") {
      where.hora_registro = horario
    }

    const registros = await prisma.producao.findMany({
      where,
    })

    if (!registros.length) {
      return callback({
        sucesso: false,
        mensagem: "Nenhuma produção encontrada.",
      })
    }

    await prisma.$transaction(async (tx) => {

      // verifica se a etapa destino existe na OP
      const etapaExiste = await tx.pecasEtapas.findFirst({
        where: {
          id_da_op: Number(opId),
          id_da_funcao: Number(etapaDestinoId),
        },
      })

      // caso não exista adiciona automaticamente
      if (!etapaExiste) {

        const origem = await tx.pecasEtapas.findFirst({
          where: {
            id_da_op: Number(opId),
            id_da_funcao: Number(etapaOrigemId),
          },
        })

        await tx.pecasEtapas.create({
          data: {
            id_da_op: Number(opId),
            id_da_funcao: Number(etapaDestinoId),
            quantidade_meta: origem?.quantidade_meta || 0,
            status: "pendente",
          },
        })
      }

      // atualiza cada registro individualmente
      for (const registro of registros) {

        // verifica conflito por causa da unique
        const conflito = await tx.producao.findFirst({
          where: {
            id_funcionario: registro.id_funcionario,
            id_da_funcao: Number(etapaDestinoId),
            id_da_op: registro.id_da_op,
            dataReferencia: registro.dataReferencia,
            hora_registro: registro.hora_registro,
            tipoRegistro: registro.tipoRegistro,
          },
        })

        if (conflito) {

          // soma as quantidades
          await tx.producao.update({
            where: {
              id_da_producao: conflito.id_da_producao,
            },
            data: {
              quantidade_pecas:
                (conflito.quantidade_pecas || 0) +
                (registro.quantidade_pecas || 0),
            },
          })

          // remove o antigo
          await tx.producao.delete({
            where: {
              id_da_producao: registro.id_da_producao,
            },
          })

        } else {

          await tx.producao.update({
            where: {
              id_da_producao: registro.id_da_producao,
            },
            data: {
              id_da_funcao: Number(etapaDestinoId),
            },
          })

        }

      }

      // salva histórico (caso crie a tabela)
      /*
      await tx.historicoTransferencia.create({
        data: {
          usuario,
          estabelecimento,
          opId,
          etapaOrigemId,
          etapaDestinoId,
          motivo,
          data: new Date(),
        }
      })
      */

    })

    callback({
      sucesso: true,
    })

    io.emit("producao-transferida", {
      estabelecimento,
      opId,
      etapaOrigemId,
      etapaDestinoId,
    })

  } catch (error) {

    console.error(error)

    callback({
      sucesso: false,
      mensagem: "Erro ao transferir produção.",
    })

  }
})
}
