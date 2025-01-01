const Login = require('../Services/User.services');

async function login(req, res, next){  
    try {
        const login = await Login.loginUser(req.body);
        res.setHeader('Authorization', `Bearer ${login.token}`);
        res.status(200).json({ 
            usuario: {
                cnpj: login.dados_usuario.cnpj, 
                funcoes: login.dados_usuario.funcoes,
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

module.exports = { 
    login
};