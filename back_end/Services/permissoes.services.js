const verificarPermissoes = require('../utils/permissions.js');
const permissions = require('../config/permissions.config.js');

async function getProfissionais(req, res, next) {
    try {
        await verificarPermissoes(req.user, permissions.SUPERVISOR);
        next(); 
    } catch (err) {
        next(err);
    }
}

async function postProfissionais(req, res, next) {
    try {
        await verificarPermissoes(req.user, permissions.ADMINISTRADOR);
        next(); 
    } catch (err) {
        next(err);
    }
}
async function alterarProducao(req, res, next) {
    try {
        await verificarPermissoes(req.user, permissions.SUPERVISOR);
        next(); 
    } catch (err) {
        next(err);
    }
}
async function adicionarOP(req, res, next) {
    try {
        await verificarPermissoes(req.user, permissions.SUPERVISOR);
        next(); 
    } catch (err) {
        next(err);
    }
}
async function removerOP(req, res, next) {
    try {
        await verificarPermissoes(req.user, permissions.ADMINISTRADOR);
        next(); 
    } catch (err) {
        next(err);
    }
}
module.exports = { getProfissionais, postProfissionais, alterarProducao, adicionarOP, removerOP}   