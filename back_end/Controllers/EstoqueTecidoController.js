const Getproduto = require('../Services/Estoque.services');
const Cadproduto = require('../Services/Estoque.services');
const DeleteProduto = require('../Services/Estoque.services');

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

async function getTecido(req, res, next){
    try {
        const produto = await Getproduto.getTecido(req.params.id);
        res.status(200).json({produto: produto});
    } catch (err) {
        console.error(`Erro ao obter produto de id {produto} no estoque.`, err.message);
        next(err);
    }
}
async function deletarTecido(req, res, next){
    console.log('CHEGUIHJG')
    try {
        const id = req.params.id;
        console.log(id)

        const produtos = await DeleteProduto.DeleteProduto(id);
        res.status(200).send({
            message: `Produto deletado: ${produtos}`,
        });
    } catch (err) {
        console.error(`Erro ao deletar produto do estoque.`, err.message);
        next(err);
    }
}

async function postProduto(req, res, next){      

    try {
        const produto = req.body.produto;
        //console.log(produto)
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
    getTecido,
    postProduto,
    deletarTecido
};