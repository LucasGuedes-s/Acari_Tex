const Agulhas = require('../Services/EstoqueAgulhas.services');


async function getEstoque(req, res, next){  

    console.log('Get Estoque')
    try {
        const produtos = await Agulhas.getEstoque();
        res.status(200).json({produtos: produtos});
    } catch (err) {
        console.error(`Erro ao obter as agulhas no estoque.`, err.message);
        next(err);
    }
}
async function postProduto(req, res, next){      

    try {
        const produto = req.body.produto;
        console.log(produto)
        const produtos = await Agulhas.postEstoque(produto);
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