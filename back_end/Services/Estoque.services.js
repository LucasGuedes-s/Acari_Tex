const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getEstoque() {
    const produtos = await prisma.Estoque_Tecidos.findMany({
        where:{
            id_estabelecimento: 12824002,
        }
    });
    if (!produtos) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('Produto não encontrado no estoque.');
    }
    return produtos;
}
async function getTecido(id) {
    const id_tecido = parseInt(id);

    //console.log('ESTOU AQUI')
    const produto = await prisma.Estoque_Tecidos.findUnique({
        where: {
            id_do_tecido: id_tecido,
        },
    });

    if (!produto) {
        // Caso não exista nenhum produto com o ID especificado, você pode retornar uma resposta de erro
        throw new Error('Produto não encontrado no estoque.');
    }
    console.log(produto)
    return produto;
}
async function deleteProduto(id){
    console.log(id);
    const id_tecido = parseInt(id);

    console.log('Oiiii, lindo')
    try {
        const produtoDeletado = await prisma.Estoque_Tecidos.delete({
          where: {
            id_do_tecido: id_tecido
          }
        });
        console.log('Produto deletado:', produtoDeletado);
    }catch (error) {
        console.error('Erro ao deletar o produto:', error);
    }
}
async function postEstoque(produto){
    
    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    console.log('Estou aqui')
    estabelecimentoId = 12824002

    const produtos = await prisma.Estoque_Tecidos.create({
        data: {
            nome_do_tecido: produto.nome,
            valor: produto.valor,
            fornecedor: produto.fornecedor,
            composicao: produto.composicao,
            estoque: produto.estoque,
            largura: produto.largura,
            peso: produto.peso,
            data_: data,
            notas: produto.notas,
            estabelecimento: {
                connect: { cnpj: estabelecimentoId } // Conectar ao Estabelecimento existente pelo ID
            }
        }
    });
    return produtos;
}

async function editProduto(){
    
    const dataAtual = new Date()
    const data = dataAtual.toISOString();
    console.log('Estou aqui')
    estabelecimentoId = 12824002

    const produtos = await prisma.Estoque_Tecidos.create({
        data: {
            nome_do_tecido: produto.nome,
            valor: produto.valor,
            fornecedor: produto.fornecedor,
            composicao: produto.composicao,
            estoque: produto.estoque,
            largura: produto.largura,
            peso: produto.peso,
            data_: data,
            notas: produto.notas,
            estabelecimento: {
                connect: { cnpj: estabelecimentoId } // Conectar ao Estabelecimento existente pelo ID
            }
        }
    });
    return produtos;
}
module.exports = {
    getEstoque,
    getTecido,
    postEstoque,
    deleteProduto,
    editProduto
}