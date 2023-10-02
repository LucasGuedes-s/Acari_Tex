const { PrismaClient } = require('@prisma/client');
prisma = new PrismaClient()

async function getFuncionarios() {
    //console.log('Estou chegando aqui')
    const funcionarios = await prisma.Funcionarios.findMany({});

    if (!funcionarios) {
        throw new Error('Nenhum funcionário cadastrado');
    }
    return funcionarios;
}

async function postFuncionario(funcionario) {

    //console.log(funcionario)
    /*const dataAtual = new Date()
    const data = dataAtual.toISOString();*/
    let identidade = funcionario.identidade.toString();
    let cpf = funcionario.cpf.toString();
    let pis = funcionario.pis.toString();

    const addfuncionario = await prisma.Funcionarios.create({
        data: {
            nome_do_funcionario: funcionario.nome_do_funcionario,
            idade: funcionario.idade,
            funcoes: funcionario.funcoes,
            aniversario: null,
            identidade: identidade,
            cpf: cpf,
            pis: pis,
            pix: funcionario.pix,
            notas: funcionario.notas
        }
    });
    return addfuncionario;
}

module.exports = {
    getFuncionarios,
    postFuncionario
}