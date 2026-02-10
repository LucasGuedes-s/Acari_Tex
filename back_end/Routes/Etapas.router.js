const XLSX = require("xlsx");
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const jwtMiddleware = require("../middlewares/auth");

// 📤 Configuração do upload
const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/etapas/upload",
  jwtMiddleware,
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const cnpj = req.user.cnpj;
      const file = req.file;

      // 🔐 Valida estabelecimento
      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { cnpj },
      });

      if (!estabelecimento) {
        return res.status(404).json({
          erro: "Estabelecimento não encontrado",
        });
      }

      if (!file) {
        return res.status(400).json({
          erro: "Nenhum arquivo enviado",
        });
      }

      // 📊 Lendo a planilha
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        range: 18,
      });

      let cadastradas = 0;
      let ignoradas = 0;

      for (const linha of linhas) {
        const descricao = linha.descricao;

        let tempo_padrao = linha.tempo_padrao ?? null;

        if (!descricao) continue;

        // 🔥 Normaliza tempo (vírgula → ponto)
        if (tempo_padrao !== null) {
          tempo_padrao = Number(
            String(tempo_padrao).replace(",", ".")
          );
        }

        if (Number.isNaN(tempo_padrao)) {
          tempo_padrao = null;
        }

        // 🔍 Busca etapas com mesma descrição
        const etapasExistentes = await prisma.etapa.findMany({
          where: {
            descricao,
            id_Estabelecimento: cnpj,
          },
        });

        // ❌ Nenhuma etapa com essa descrição → cria
        if (etapasExistentes.length === 0) {
          await prisma.etapa.create({
            data: {
              descricao,
              tempo_padrao,
              id_Estabelecimento: cnpj,
            },
          });
          cadastradas++;
          continue;
        }

        // 🔁 Verifica se já existe alguma com MESMO tempo
        const mesmaEtapa = etapasExistentes.find(
          (e) => Number(e.tempo_padrao) === Number(tempo_padrao)
        );

        // ✅ Se já existe com mesmo tempo → ignora
        if (mesmaEtapa) {
          ignoradas++;
          continue;
        }

        // 🆕 Existe descrição, mas tempo diferente → cria nova
        await prisma.etapa.create({
          data: {
            descricao,
            tempo_padrao,
            id_Estabelecimento: cnpj,
          },
        });

        cadastradas++;
      }


      return res.json({
        sucesso: true,
        cadastradas,
        ignoradas,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        erro: "Erro ao processar a planilha",
      });
    }
  }
);

module.exports = router;
