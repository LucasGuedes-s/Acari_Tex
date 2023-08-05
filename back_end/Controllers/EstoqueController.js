const produto = require('../Services/Estoque.services');

async function getEstoque(req, res, next){      
    console.log('Estou chegando aqui')
    try {
        const produtos = await produto.getEstoque();
        res.status(200).json({produtos: produtos});
    } catch (err) {
        console.error(`Erro ao obter produtos no estoque.`, err.message);
        next(err);
    }
}

module.exports = { 
    getEstoque
};