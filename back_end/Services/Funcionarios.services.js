const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFuncionarios(req, res) {
    const { cnpj } = req; // Pegando o CNPJ do estabelecimento da requisição
    console.log(req)
    const funcionarios = await prisma.Usuarios.findMany({
        where: {
            Estabelecimento: {
                some: { cnpj } // Filtra funcionários do estabelecimento específico
            }
        }
    });

    if (!funcionarios.length) {
        return 'Nenhum funcionário encontrado para este estabelecimento';
    }

    return funcionarios;

}

async function getFuncionario(req, res) {
    const id_do_funcionario = parseInt(req.params.id);

    try {
        const funcionario = await prisma.Funcionarios.findUnique({
            where: { id: id_do_funcionario }
        });

        if (!funcionario) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        res.json(funcionario);

    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar funcionário' });
    }
}

async function postFuncionario(funcionario) {
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
            foto: funcionario.foto
        }
    });
    return addfuncionario;
}

module.exports = {
    getFuncionarios,
    getFuncionario,
    postFuncionario
};
