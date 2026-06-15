const producaoService = require('../Services/producao.socket.services')
const meta = require('../Services/metaDia.service')
module.exports = (io, socket) => {

  socket.on(
    'salvar-producao',
    async payload => {

      try {

        const producao =
          await producaoService
            .salvarProducao(
              payload
            )

        io.emit(
          'producao-atualizada',
          producao
        )

      } catch (err) {

        console.log(err)

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

}
