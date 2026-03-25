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
router.post(
  "/pecas/upload",
  jwtMiddleware,
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const cnpj = req.user.cnpj;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ erro: "Nenhum arquivo enviado" });
      }

      const estabelecimento = await prisma.estabelecimento.findUnique({
        where: { cnpj },
      });

      if (!estabelecimento) {
        return res.status(404).json({ erro: "Estabelecimento não encontrado" });
      }

      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // =========================
      // 🔎 BUSCAR PEÇA
      // =========================

      let linhaPeca = null;

      for (const linha of json) {
        const descricao = linha[0];
        const quantidade = Number(linha[1]);
        const valor = Number(linha[2]);

        if (descricao && !isNaN(quantidade) && !isNaN(valor)) {
          linhaPeca = [descricao, quantidade, valor];
          break;
        }
      }

      if (!linhaPeca) {
        return res.status(400).json({ erro: "Dados da peça não encontrados" });
      }

      const descricao_peca = linhaPeca[0];
      const quantidade_pecas = Number(linhaPeca[1]);
      const valor_peca = Number(linhaPeca[2]);

      // =========================
      // 🔎 HEADER ETAPAS
      // =========================

      let headerIndex = -1;

      for (let i = 0; i < json.length; i++) {
        if (
          json[i][0] === "descricao_etapa" &&
          json[i][1] === "tempo_padrao"
        ) {
          headerIndex = i;
          break;
        }
      }

      if (headerIndex === -1) {
        return res.status(400).json({
          erro: "Cabeçalho das etapas não encontrado",
        });
      }

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        range: headerIndex,
      });

      const normalizar = (texto) =>
        String(texto || "").trim().toLowerCase();

      const etapasValidas = linhas.filter(
        (l) => l.descricao_etapa && String(l.descricao_etapa).trim() !== ""
      );

      if (etapasValidas.length === 0) {
        return res.status(400).json({
          erro: "A planilha deve conter pelo menos uma etapa",
        });
      }

      // =========================
      // 🔥 PRÉ-PROCESSAMENTO (FORA DA TRANSACTION)
      // =========================

      let tempoTotal = 0;
      const etapasMap = new Map();

      for (const linha of etapasValidas) {
        const desc = normalizar(linha.descricao_etapa);

        let tempo = linha.tempo_padrao ?? null;

        if (tempo !== null) {
          tempo = Number(String(tempo).replace(",", "."));
        }

        if (Number.isNaN(tempo)) tempo = null;

        if (tempo) tempoTotal += tempo;

        const descricaoFinal = tempo
          ? `${desc} (${tempo} min)`
          : desc;

        etapasMap.set(descricaoFinal, {
          descricao: descricaoFinal,
          tempo_padrao: tempo,
          id_Estabelecimento: cnpj,
        });
      }

      const etapasParaCriar = Array.from(etapasMap.values());

      // =========================
      // 🔥 TRANSACTION LEVE
      // =========================

      const resultado = await prisma.$transaction(
        async (tx) => {

          // cria peça
          const peca = await tx.pecasOP.create({
            data: {
              descricao: descricao_peca,
              quantidade_pecas,
              valor_peca,
              status: "nao_iniciado",
              tempo_padrao: tempoTotal,
              id_Estabelecimento: cnpj,
            },
          });

          // cria etapas em lote
          await tx.etapa.createMany({
            data: etapasParaCriar,
            skipDuplicates: true,
          });

          // busca etapas atualizadas
          const etapasBanco = await tx.etapa.findMany({
            where: { id_Estabelecimento: cnpj },
          });

          // monta vínculos
          const vinculos = [];

          for (const etapa of etapasParaCriar) {
            const encontrada = etapasBanco.find(
              (e) => normalizar(e.descricao) === normalizar(etapa.descricao)
            );

            if (encontrada) {
              vinculos.push({
                id_da_op: peca.id_da_op,
                id_da_funcao: encontrada.id_da_funcao,
                quantidade_meta: quantidade_pecas,
              });
            }
          }

          // cria vínculos em lote
          await tx.pecasEtapas.createMany({
            data: vinculos,
            skipDuplicates: true,
          });

          return {
            peca,
            etapasCriadas: etapasParaCriar.length,
            tempoTotal,
          };
        },
        {
          timeout: 20000,
        }
      );

      return res.json({
        sucesso: true,
        pecaCriada: resultado.peca.descricao,
        etapasCriadas: resultado.etapasCriadas,
        tempoTotal: resultado.tempoTotal,
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        erro: error.message || "Erro ao processar a planilha",
      });
    }
  }
);


module.exports = router;