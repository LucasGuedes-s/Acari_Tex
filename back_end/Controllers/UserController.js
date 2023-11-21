const Login = require('../Services/User.services');

async function login(req, res, next){  

    //console.log('Login do usuário')
    
    try {
        const user = req.body.user;
        const login = await Login.loginUser(user);
        res.status(200).json({ 
            status: "OK"
        });
        res.end();
    } catch (err) {
        console.error(`Erro no login do usuário.`, err.message);
        err.statusCode = 401;
        next(err);
    }
}

module.exports = { 
    login
};