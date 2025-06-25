const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const cnpj = '12345678' // CNPJ do estabelecimento já existente
  const email = 'andouglas@gmail.com'

  // Verifica se o estabelecimento existe
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj },
  })

  if (!estabelecimento) {
    throw new Error(`Estabelecimento com CNPJ ${cnpj} não encontrado.`)
  }

  // Criptografa a senha do novo usuário
  const senhaCriptografada = await bcrypt.hash('password', 10)

  // Cria ou atualiza o usuário
  const novoFuncionario = await prisma.usuarios.upsert({
    where: { email },
    update: {},
    create: {
      nome: 'Andouglas Jr',
      email,
      senha: senhaCriptografada,
      foto: 'https://firebasestorage.googleapis.com/v0/b/clinica-maria-luiza-17cef.appspot.com/o/uploadsTeste%2FAndouglas-Junior.png?alt=media&token=9a978c34-c71e-4fae-b274-a4bd5bdd2ba8',
      idade: 30,
      funcoes: 'Administrador',
      identidade: '123456789',
      cpf: '00011122233',
      pis: '12345678900',
      pix: '00011122233',
      notas: 'Criado automaticamente via firstRun',
      estabelecimentoCnpj: cnpj
    }
  })

  console.log('Usuário criado com sucesso:', novoFuncionario)
}

main()
  .catch(e => {
    console.error('Erro ao criar profissional:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
