const getFuncionarios = require('../Services/Funcionarios.services')

async function getEquipe(req, res, next){
    console.log('Cheguei aqui')
    try {
        const funcionarios = await getFuncionarios.getFuncionarios();
        res.status(200).json({funcionarios:funcionarios});
    } catch (err) {
        console.error(`Erro ao obter funcionários.`, err.message);
        //next(err);
    }
}

module.exports = {
    getEquipe
}