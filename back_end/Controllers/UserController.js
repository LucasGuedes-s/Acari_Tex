const Login = require('../Services/User.services');

async function login(req, res, next){  
    try {
        const user = req.body.user;
        const login = await Login.loginUser(user);
        res.setHeader('Authorization', `Bearer ${login.token}`);
        res.status(200).json({ 
            status: "OK"
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