const Funcionarios = require('../Services/Funcionarios.services')

async function getEquipe(req, res, next){
    try {
        const funcionarios = await Funcionarios.getFuncionarios(req.user);
        res.status(200).json({funcionarios:funcionarios});
    } catch (err) {
        console.error(`Erro ao obter funcionários.`, err.message);
        next(err);
    }
}
async function getFuncionario(req, res, next){
    try {
        const id = req.params.id;
        const funcionario = await Funcionarios.getFuncionario(req.params.id);
        res.status(200).json({funcionario:funcionario});

    } catch (err) {
        console.error(`Erro ao obter funcionário.`, err.message);
        next(err);
    }
}
async function postEquipe(req, res, next){
    try {
        const funcionario = req.body;
        const equipe = await Funcionarios.postFuncionario(funcionario);
        res.status(200).send({
            message: `Funcionário cadastrado: ${equipe}`,
        });
    } catch (err) {
        console.error(`Erro ao cadastrar o funcionário no banco de dados.`, err.message);
        next(err);
    }
}
async function getProducaoFuncionario(req, res, next){
    try {
        const email = req.params.email;
        const producao = await Funcionarios.getProducaoFuncionario(email);
        req.io.emit('nova_producao'); 
        res.status(200).json({producao:producao});
    } catch (err) {
        console.error(`Erro ao obter produção do funcionário.`, err.message);
        next(err);
    }
}

module.exports = {
    getEquipe,
    getFuncionario,
    postEquipe,
    getProducaoFuncionario
}