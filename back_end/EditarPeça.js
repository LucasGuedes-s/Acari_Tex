import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function corrigirDataProducaoDia12(req) {
  const cnpj = "12.373.991/0001-37";

  // 🔎 Intervalo do dia 14/01/2026 (UTC)
  const inicioDia13 = new Date("2026-01-14T00:00:00.000Z");
  const fimDia13 = new Date("2026-01-14T23:59:59.999Z");

  // ✅ Nova data correta: 13/01/2026 (meio-dia evita fuso)
  const novaData = new Date("2026-01-13T12:00:00.000Z");

  // (Opcional) conferir antes
  const producoesEncontradas = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: {
        gte: inicioDia13,
        lte: fimDia13,
      },
    },
  });

  console.log("Produções encontradas:", producoesEncontradas.length);

  if (producoesEncontradas.length === 0) {
    return {
      message: "Nenhuma produção encontrada para correção",
      total: 0,
    };
  }

  // 🔄 Update em massa
  const resultado = await prisma.producao.updateMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: {
        gte: inicioDia13,
        lte: fimDia13,
      },
    },
    data: {
      data_inicio: novaData,
    },
  });

  return {
    message: "Datas de produção corrigidas com sucesso",
    totalAtualizado: resultado.count,
  };
}

corrigirDataProducaoDia12()
  .then((res) => {
    console.log(res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro ao corrigir datas de produção:", err);
    process.exit(1);
  });
