const produto = require('../Services/Estoque.services');

async function getEstoque(req, res, next){
    const id = req.params.id;
    console.log(id)       

    try {
        const produtos = await produto.getEstoque(req.params.id);
        res.status(200).json({produtos: produtos});
    } catch (err) {
        console.error(`Erro ao obter produtos no estoque.`, err.message);
        next(err);
    }
}

module.exports = { 
    getEstoque
};