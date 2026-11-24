const producaoSocket = require('./producao.socket')

module.exports = (io) => {
  io.on('connection', socket => {

    // console.log(
    //   'Novo cliente:',
    //   socket.id
    // )

    producaoSocket(io, socket)

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