const GetAgulhas = require('../Services/EstoqueAgulhas.services');

async function getEstoque(req, res, next){  

    console.log('Get Estoque')
    try {
        const produtos = await GetAgulhas.getEstoque();
        res.status(200).json({produtos: produtos});
    } catch (err) {
        console.error(`Erro ao obter as agulhas no estoque.`, err.message);
        next(err);
    }
}

module.exports = { 
    getEstoque,
};