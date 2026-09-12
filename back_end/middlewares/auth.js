const config = require('../config/app.config.js');
const jwt = require('jsonwebtoken');

function validarJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(422).send({
            message: "Token nulo"
        });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).send({
            message: "Formato de token inválido. Use 'Bearer <token>'"
        });
    }

    const jwt_token = parts[1];
    try {
        jwt.verify(jwt_token, config.jwtSecret, (err, userInfo) => {
            if (err) {
                if (err.name === "TokenExpiredError") {
                    return res.status(401).send({
                        message: "Token Expirado."
                    });
                } else {
                    return res.status(403).send({
                        message: "Token inválido"
                    });
                }
            }
            req.user = userInfo;
            next();
        });
    } catch (error) {
        console.error('Erro inesperado na validação do JWT:', error.message);
        return res.status(403).send({
            message: "Erro ao validar token"
        });
    }
}

module.exports = validarJWT;