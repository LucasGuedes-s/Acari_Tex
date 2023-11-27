const Agulhas = require('../Services/EstoqueAgulhas.services');

async function getAgulha(req, res, next){  

    console.log('Get Agulha')
    try {
        const produto = await Agulhas.getAgulha(req.params.id);
        res.status(200).json({produto: produto});
    } catch (err) {
        console.error(`Erro ao obter produto de id {produto} no estoque.`, err.message);
        next(err);
    }
}
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
        err.statusCode = 400;
        next(err);
    }
}
async function deletarAgulha(req, res, next){
    try {
        const id = req.params.id;
        console.log(id)

        const produtos = await Agulhas.DeleteProduto(id);
        res.status(200).send({
            message: `Produto deletado: ${produtos}`,
        });
    } catch (err) {
        console.error(`Erro ao deletar produto do estoque.`, err.message);
        next(err);
    }
}

module.exports = { 
    getAgulha,
    getEstoque,
    postProduto,
    deletarAgulha
};