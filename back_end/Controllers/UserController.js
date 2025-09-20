const permissoes = require('../config/permissions.config');
const Login = require('../Services/User.services');

async function login(req, res, next){  
    try {
        const login = await Login.loginUser(req.body);
        res.setHeader('Authorization', `Bearer ${login.token}`);
        res.status(200).json({ 
            usuario: {
                cnpj: login.dados_usuario.cnpj, 
                funcoes: login.dados_usuario.funcoes,
                permissoes: login.dados_usuario.permissoes,
                nome: login.dados_usuario.nome,
                email: login.dados_usuario.email,
                foto: login.dados_usuario.foto,
            } 
        });
        res.end()
    } catch (err) {
        console.error(`Erro no login do usuário.`, err.message);
        err.statusCode = 401;
        next(err);
    }
}

async function criarTempoReferencia(req, res, next) {
    try {
        const tempo = await Login.criarTempoReferencia(req);
        res.status(201).json(tempo);
    } catch (err) {
        console.error("Erro ao criar tempo de referência:", err.message);
        err.statusCode = 400;
        next(err);
    }
}

module.exports = { 
    login,
    criarTempoReferencia
};