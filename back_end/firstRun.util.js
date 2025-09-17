const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const saltRounds = 10;
require('dotenv').config();

async function main() {
  /*const cnpjEstabelecimento = process.env.CNPJ || "12345678000199";
  const senhaTexto = process.env.SENHA || "admin123";
  const nomeUsuario = process.env.USER_PADRAO || 'Administrador Padrão';
  const emailUsuario = 'admin@admin.com';
  const senhaCriptografada = bcrypt.hashSync(senhaTexto, saltRounds);
  */

  const cnpjEstabelecimento = "12345678000199";
  const senhaTexto = "admin123";
  const nomeUsuario = 'Mara Guedes';
  const emailUsuario = 'mara.acari@hotmail.com';

  const senhaCriptografada = bcrypt.hashSync(senhaTexto, saltRounds);

  const etapasFixas = ["Overloque", "Interloque", "Reta", "Travete", "Limpeza", "Acabamento", "Embalagem"];
  for (const descricao of etapasFixas) {
    const etapaExistente = await prisma.etapa.findUnique({ where: { descricao } });
    if (!etapaExistente) {
      await prisma.etapa.create({ data: { descricao } });
      console.log(`✅ Etapa criada: ${descricao}`);
    }
  }

  // 🔹 Criar estabelecimento padrão
  let estabelecimento = await prisma.estabelecimento.findUnique({ where: { cnpj: cnpjEstabelecimento } });
  if (!estabelecimento) {
    estabelecimento = await prisma.estabelecimento.create({
      data: { cnpj: cnpjEstabelecimento },
    });
    console.log("✅ Estabelecimento criado.");
  }

  // 🔹 Criar usuário admin padrão
  let admin = await prisma.usuarios.findUnique({ where: { email: emailUsuario } });
  if (!admin) {
    admin = await prisma.usuarios.create({
      data: {
        nome: nomeUsuario,
        email: emailUsuario,
        senha: senhaCriptografada,
        permissoes: 1,
        foto: "https://pub-f5850e3c1d5b490ea1e15aacf2014355.r2.dev/uploads/Captura%20de%20tela_17-9-2025_201411_www.instagram.com.jpeg",
        idade: 35,
        funcoes: "Administrador",
        estabelecimentoCnpj: cnpjEstabelecimento
      },
    });
    console.log("✅ Usuário admin criado e vinculado ao estabelecimento.");
  }

  // 🔹 Criar peça de exemplo (se não existir)
  const pecaExistente = await prisma.pecasOP.findFirst({ where: { id_Estabelecimento: cnpjEstabelecimento } });

  if (!pecaExistente) {
    const novaPeca = await prisma.pecasOP.create({
      data: {
        id_Estabelecimento: cnpjEstabelecimento,
        status: "nao_iniciado", // 🔹 Status padronizado
        descricao: "Peça Exemplo",
        quantidade_pecas: 100,
        pedido_por: "Cliente X",
        data_do_pedido: new Date().toISOString(),
        data_de_entrega: null,
        valor_peca: 25.5,
      },
    });
    console.log(`✅ Peça criada: ${novaPeca.descricao}`);

    // 🔹 Vincular etapas fixas à peça criada
    const etapas = await prisma.etapa.findMany();
    const vinculos = etapas.map(etapa => ({
      id_da_op: novaPeca.id_da_op,
      id_da_funcao: etapa.id_da_funcao,
    }));

    await prisma.pecasEtapas.createMany({
    data: etapas.map(etapa => ({
      id_da_op: novaPeca.id_da_op,
      id_da_funcao: etapa.id_da_funcao,
      quantidade_meta: novaPeca.quantidade_pecas || 0, // 👈 define a meta
      status: "pendente"
    }))
  });

    console.log("🔗 Peça vinculada às etapas fixas.");
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
