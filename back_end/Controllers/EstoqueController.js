const Getproduto = require('../Services/Estoque.services');
const Cadproduto = require('../Services/Estoque.services')

async function getEstoque(req, res, next){      
    console.log('Estou chegando aqui')
    try {
        const produtos = await Getproduto.getEstoque();
        res.status(200).json({produtos: produtos});
    } catch (err) {
        console.error(`Erro ao obter produtos no estoque.`, err.message);
        next(err);
    }
}
async function postProduto(req, res, next){      

    try {
        const produto = req.body.produto;
        console.log(produto)
        const produtos = await Cadproduto.postEstoque(produto);
        res.status(200).send({
            message: `Produto cadastrado: ${produtos}`,
        });
    } catch (err) {
        console.error(`Erro ao cadastrar produto no estoque.`, err.message);
        next(err);
    }
}
module.exports = { 
    getEstoque,
    postProduto
};