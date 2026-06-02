const producaoSocket = require('./producao.socket')

// const metaDiaSocket = require('./metaDia.socket')

module.exports = (io) => {
  io.on('connection', socket => {

    // console.log(
    //   'Novo cliente:',
    //   socket.id
    // )

    producaoSocket(io, socket)

    // metaDiaSocket(io, socket)

    socket.on(
      'disconnect',
      () => {
        // console.log(
        //   'Cliente desconectado:',
        //   socket.id
        // )
      }
    )
  })
}