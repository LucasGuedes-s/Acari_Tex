const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const saltRounds = 10;

async function main() {
  // ============================
  // CONFIGURAÇÕES DA EMPRESA
  // ============================

  const cnpjEstabelecimento = "63.359.871/0001-16";

  const nomeEmpresa = "Jana Jour";
  const nomeUsuario = "Administrador";
  const emailUsuario = "janajour@gmail.com";
  const senhaTexto = "senha123";

  const senhaCriptografada = bcrypt.hashSync(senhaTexto, saltRounds);

  const etapasFixas = [
    "Overloque",
    "Interloque",
    "Reta",
    "Travete",
    "Limpeza",
    "Acabamento",
    "Etapa Final",
  ];

  // ============================
  // ESTABELECIMENTO
  // ============================

  let estabelecimento = await prisma.estabelecimento.findUnique({
    where: {
      cnpj: cnpjEstabelecimento,
    },
  });

  if (!estabelecimento) {
    estabelecimento = await prisma.estabelecimento.create({
      data: {
        cnpj: cnpjEstabelecimento,
        nome: nomeEmpresa,
      },
    });

    console.log("✅ Estabelecimento criado.");
  } else {
    console.log("ℹ️ Estabelecimento já existe.");
  }

  // ============================
  // GRUPO PADRÃO
  // ============================

  let grupo = await prisma.grupoEtapas.findFirst({
    where: {
      estabelecimentoCnpj: cnpjEstabelecimento,
      nome: "Produção",
    },
  });

  if (!grupo) {
    grupo = await prisma.grupoEtapas.create({
      data: {
        nome: "Produção",
        descricao: "Grupo padrão criado automaticamente",
        estabelecimentoCnpj: cnpjEstabelecimento,
      },
    });

    console.log("✅ Grupo de etapas criado.");
  } else {
    console.log("ℹ️ Grupo já existe.");
  }

  // ============================
  // ETAPAS PADRÃO
  // ============================

  for (const descricao of etapasFixas) {
    const existe = await prisma.etapa.findFirst({
      where: {
        descricao,
        id_Estabelecimento: cnpjEstabelecimento,
      },
    });

    if (!existe) {
      await prisma.etapa.create({
        data: {
          descricao,
          tempo_padrao: 0,
          id_Estabelecimento: cnpjEstabelecimento,
          grupoEtapaId: grupo.id,
        },
      });

      console.log(`✅ Etapa criada: ${descricao}`);
    }
  }

  // ============================
  // ADMINISTRADOR
  // ============================

  let admin = await prisma.usuarios.findUnique({
    where: {
      email: emailUsuario,
    },
  });

  if (!admin) {
    admin = await prisma.usuarios.create({
      data: {
        nome: nomeUsuario,
        email: emailUsuario,
        senha: senhaCriptografada,

        foto: "",
        idade: 35,

        funcoes: "Administrador",
        permissoes: 1,

        estabelecimentoCnpj: cnpjEstabelecimento,
      },
    });

    console.log("✅ Usuário administrador criado.");
  } else {
    console.log("ℹ️ Usuário administrador já existe.");
  }

  // ============================
  // PEÇA EXEMPLO
  // ============================

  let peca = await prisma.pecasOP.findFirst({
    where: {
      id_Estabelecimento: cnpjEstabelecimento,
    },
  });

  if (!peca) {
    peca = await prisma.pecasOP.create({
      data: {
        id_Estabelecimento: cnpjEstabelecimento,

        status: "nao_iniciado",

        descricao: "Peça Exemplo",

        quantidade_pecas: 100,

        pedido_por: "Cliente Exemplo",

        data_do_pedido: new Date().toISOString(),

        data_de_entrega: null,

        valor_peca: 25,
      },
    });

    console.log("✅ Peça exemplo criada.");
  } else {
    console.log("ℹ️ Peça exemplo já existe.");
  }

  // ============================
  // VINCULAR ETAPAS À PEÇA
  // ============================

  const etapas = await prisma.etapa.findMany({
    where: {
      id_Estabelecimento: cnpjEstabelecimento,
    },
  });

  for (const etapa of etapas) {
    const existe = await prisma.pecasEtapas.findFirst({
      where: {
        id_da_op: peca.id_da_op,
        id_da_funcao: etapa.id_da_funcao,
      },
    });

    if (!existe) {
      await prisma.pecasEtapas.create({
        data: {
          id_da_op: peca.id_da_op,
          id_da_funcao: etapa.id_da_funcao,
          quantidade_meta: peca.quantidade_pecas ?? 0,
          status: "pendente",
        },
      });

      console.log(`🔗 ${etapa.descricao} vinculada à peça.`);
    }
  }

  console.log("");
  console.log("🎉 First Run concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

