const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

async function adicionarPecaEtapa() {
  try {
    const novaPecaEtapa = await prisma.pecasEtapas.create({
      data: {
        id_da_op: 19,          // ID da peça
        id_da_funcao: 17,      // ID da etapa
        quantidade_meta: 47,    // define a meta inicial (ajuste se necessário)
        status: "pendente"     // ou outro status inicial
      }
    });

    console.log("✅ Peça adicionada à etapa com sucesso:", novaPecaEtapa);
  } catch (error) {
    if (error.code === "P2002") {
      console.error("⚠️ Essa peça já está vinculada a essa etapa (violação de unique).");
    } else {
      console.error("❌ Erro ao adicionar peça à etapa:", error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

adicionarPecaEtapa();
