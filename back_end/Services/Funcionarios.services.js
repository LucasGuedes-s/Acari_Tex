const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFuncionarios(req, res) {
    try {
        const { cnpj } = req;

        const funcionarios = await prisma.usuarios.findMany({
            where: {
                estabelecimentoCnpj: cnpj,
            },
        });

        if (!funcionarios.length) {
            return 'Nenhum funcionário encontrado para este estabelecimento.';
        }

        return funcionarios;
    } catch (error) {
        console.error("Erro ao buscar funcionários:", error);
        throw new Error("Erro ao buscar os funcionários.");
    }
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
    const identidade = funcionario.identidade?.toString() || null;
    const cpf = funcionario.cpf?.toString() || null;
    const pis = funcionario.pis?.toString() || null;

    // Verifica se o email já está cadastrado
    const usuarioExistente = await prisma.usuarios.findUnique({
        where: {
            email: funcionario.email
        }
    });

    if (usuarioExistente) {
        console.log(usuarioExistente)
        throw new Error("Já existe um usuário com esse email.");
    }

    const addFuncionario = await prisma.usuarios.create({
        data: {
            email: funcionario.email,
            nome: funcionario.nome_do_funcionario,
            senha: funcionario.senha,
            foto: funcionario.foto,
            idade: funcionario.idade,
            funcoes: funcionario.funcoes,
            identidade,
            cpf,
            pis,
            pix: funcionario.pix,
            notas: funcionario.notas,
            estabelecimentoCnpj: funcionario.estabelecimento.cnpj // FK direta

        }
    });

    return addFuncionario;
}


module.exports = {
    getFuncionarios,
    getFuncionario,
    postFuncionario
};
