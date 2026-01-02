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
        const funcionario = await Funcionarios.getFuncionario(id);
        res.status(200).json({funcionario:funcionario});

    } catch (err) {
        console.error(`Erro ao obter funcionário.`, err.message);
        next(err);
    }
}
async function postEquipe(req, res, next){
    try {
        const equipe = await Funcionarios.postFuncionario(req.body, req.user.cnpj);
        res.status(201).send({
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
        const producao = await Funcionarios.getProducaoFuncionario(email, req.user.cnpj);
        req.io.emit('nova_producao'); 
        res.status(200).json({producao:producao});
    } catch (err) {
        console.error(`Erro ao obter produção do funcionário.`, err.message);
        next(err);
    }
}
async function adicionarFuncionarioAgrupo(req, res, next) {
    try {
        const grupo = await Funcionarios.criarEquipe(req);
        res.status(201).json({ message: 'Grupo criado com sucesso.', grupo });
    } catch (err) {
        console.error('Erro ao adicionar funcionário ao grupo.', err.message);
        next(err);
    }
}
async function getEquipes(req, res, next) {
    try {
        const equipes = await Funcionarios.getEquipes(req);
        res.status(200).json({ equipes });
    } catch (err) {
        console.error('Erro ao obter equipes.', err.message);
        next(err);
    }
}
async function moverFuncionario(req, res, next) {
    try {
        const moverFuncionario = await Funcionarios.moverFuncionario(req);
        res.status(200).json({ message: 'Funcionário movido com sucesso.', moverFuncionario });
    } catch (err) {
        console.error('Erro ao mover funcionário entre equipes.', err.message);
        next(err);
    }
}
async function tempoDeProducao(req, res, next) {
    try{
        const tempo_minutos = await Funcionarios.tempoDeProducao(req)
        res.status(200).json({ message: 'Registro feito com sucesso', tempo_minutos });
    }
    catch (err) {
        console.error('Erro ao registrar tempo de produção do funcionário.', err.message);
        next(err);
    }
}
async function getTempodeReferencia(req, res, next) {
    try{
        const email = req.params.email;
        const tempoReferencia = await Funcionarios.getTempodeReferencia(email, req)
        res.status(200).json({tempo: tempoReferencia });
    }
    catch (err) {
        console.error('Erro ao resgatar tempo de referencia.', err.message);
        next(err);
    }
}

module.exports = {
    getEquipe,
    getFuncionario,
    postEquipe,
    getProducaoFuncionario,
    adicionarFuncionarioAgrupo,
    getEquipes,
    moverFuncionario,
    tempoDeProducao,
    getTempodeReferencia
}