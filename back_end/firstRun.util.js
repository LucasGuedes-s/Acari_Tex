const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const saltRounds = 10; // Número de rounds para criptografia da senha

async function firstRun() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    // Variáveis de ambiente
    const cnpj = process.env.CNPJ;
    const senhaTexto = process.env.SENHA;
    const nomeUsuario = process.env.USER_PADRAO || 'Administrador Padrão';
    const emailUsuario = 'admin@admin.com';

    try {
        // Verifica se o estabelecimento já existe
        const estabelecimentoExistente = await prisma.Estabelecimento.findUnique({
            where: {
                cnpj: cnpj,
            },
        });

        // Se o estabelecimento já existe, encerra
        if (estabelecimentoExistente) {
            console.log('Estabelecimento já existe. Verifique os dados.');
            return;
        }

        // Cria o usuário administrador
        console.log('Criando usuário administrador...');
        const senhaCriptografada = bcrypt.hashSync(senhaTexto, saltRounds);

        const usuario = await prisma.usuarios.create({
            data: {
                email: emailUsuario,
                nome: nomeUsuario,
                senha: senhaCriptografada,
                foto: 'https://via.placeholder.com/150', // Foto padrão
                idade: 30, // Idade padrão
                funcoes: 'Administrador',
                notas: 'Usuário criado automaticamente pelo sistema.',
            },
        });
        console.log('Usuário administrador criado:', usuario);

        // Cria o estabelecimento vinculado ao usuário
        console.log('Criando estabelecimento...');
        const estabelecimento = await prisma.estabelecimento.create({
            data: {
                cnpj: cnpj,
                id_usuarios: usuario.email, // Relaciona o usuário ao estabelecimento
                estoque_tecidos: {
                    create: [
                        {
                            nome_do_tecido: 'Tecido de Exemplo',
                            valor: 50.0,
                            fornecedor: 'Fornecedor Exemplo',
                            estoque: 200,
                            data_: new Date(),
                            notas: 'Tecido inicial adicionado automaticamente.',
                        },
                    ],
                },
                estoque_agulhas: {
                    create: [
                        {
                            valor: 5.0,
                            fornecedor: 'Fornecedor Exemplo',
                            numeracao: '14',
                            estoque: 500,
                            data: new Date(),
                            notas: 'Agulha inicial adicionada automaticamente.',
                        },
                    ],
                },
            },
        });
        console.log('Estabelecimento criado com sucesso:', estabelecimento);
    } catch (error) {
        console.error('Erro durante o processo de firstRun:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

module.exports = firstRun;
