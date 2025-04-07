const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const saltRounds = 10; // Número de rounds para criptografia da senha

async function main() {
  console.log("🔍 Verificando se os dados iniciais já existem...");
  const cnpj = process.env.CNPJ;
  const senhaTexto = process.env.SENHA;
  const nomeUsuario = process.env.USER_PADRAO || 'Administrador Padrão';
  const emailUsuario = 'admin@admin.com';
  const senhaCriptografada = bcrypt.hashSync(senhaTexto, saltRounds);

  // 1️⃣ Criar Etapas fixas (se não existirem)
  const etapasFixas = ["Corte", "Costura", "Acabamento", "Embalagem"];
  for (const descricao of etapasFixas) {
    const etapaExistente = await prisma.etapa.findUnique({
      where: { descricao },
    });

    if (!etapaExistente) {
      await prisma.etapa.create({
        data: { descricao },
      });
      console.log(`✅ Etapa criada: ${descricao}`);
    }
  }

  // 2️⃣ Criar Usuário Admin se não existir
  let admin = await prisma.usuarios.findUnique({
    where: { email: emailUsuario },
  });

  if (!admin) {
    admin = await prisma.usuarios.create({
      data: {
        nome: "Administrador",
        email: emailUsuario,
        senha: senhaCriptografada, // ⚠️ Alterar para hash seguro em produção!
        foto: "https://firebasestorage.googleapis.com/v0/b/clinica-maria-luiza.appspot.com/o/uploads%2Ffuncionarios2.svg?alt=media&token=cc7511c0-9e76-4cd6-9e33-891bbb3cfd1c",
        idade: 35,
        funcoes: "Administrador",
      },
    });
    console.log("✅ Usuário admin criado.");
  }

  // 3️⃣ Criar Estabelecimento se não existir
  const cnpjEstabelecimento = "12345678000199";
  let estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj: cnpjEstabelecimento },
  });

  if (!estabelecimento) {
    estabelecimento = await prisma.estabelecimento.create({
      data: {
        cnpj: cnpjEstabelecimento,
        id_usuarios: emailUsuario,
      },
    });
    console.log("✅ Estabelecimento criado.");
  }

  // 4️⃣ Criar uma Peça de Produção vinculada ao Estabelecimento
  const pecaExistente = await prisma.pecasOP.findFirst({
    where: { id_Estabelecimento: cnpjEstabelecimento },
  });

  if (!pecaExistente) {
    const novaPeca = await prisma.pecasOP.create({
      data: {
        id_Estabelecimento: cnpjEstabelecimento,
        status: "Em produção",
        descricao: "Camiseta Algodão",
        quantidade_pecas: 100,
        pedido_por: "Cliente X",
        valor_peca: 25.5,
      },
    });
    console.log(`✅ Peça criada: ${novaPeca.descricao}`);

    // 5️⃣ Associar a peça às etapas
    const etapas = await prisma.etapa.findMany();
    for (const etapa of etapas) {
      await prisma.pecasEtapas.create({
        data: {
          id_da_op: novaPeca.id_da_op,
          id_da_funcao: etapa.id_da_funcao,
        },
      });
      console.log(`🔗 Peça vinculada à etapa: ${etapa.descricao}`);
    }
  }

  console.log("🎉 Configuração inicial concluída!");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
