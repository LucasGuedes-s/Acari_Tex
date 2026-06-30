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

      const primeiroNome = (texto) => normalizar(texto).split(" ")[0];

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

        // ---- tempo_padrao (da etapa) ----
        let tempo = linha.tempo_padrao ?? null;

        if (tempo !== null) {
          tempo = Number(String(tempo).replace(",", "."));
        }

        if (Number.isNaN(tempo)) tempo = null;

        if (tempo) tempoTotal += tempo;

        const descricaoFinal = tempo
          ? `${desc} (${tempo} min)`
          : desc;

        // ---- funcionario / tempo_funcionario (referência individual) ----
        const nomeFuncionario = linha.funcionario
          ? String(linha.funcionario).trim()
          : null;

        let tempoFuncionario = linha.tempo_funcionario ?? null;

        if (tempoFuncionario !== null) {
          tempoFuncionario = Number(String(tempoFuncionario).replace(",", "."));
        }

        if (Number.isNaN(tempoFuncionario)) tempoFuncionario = null;

        etapasMap.set(descricaoFinal, {
          descricao: descricaoFinal,
          tempo_padrao: tempo,
          id_Estabelecimento: cnpj,
          nomeFuncionario,
          tempoFuncionario,
        });
      }

      const etapasParaCriar = Array.from(etapasMap.values());

      // =========================
      // 🔥 PRÉ-BUSCA DE FUNCIONÁRIOS (FORA DA TRANSACTION)
      // Compara pelo PRIMEIRO NOME, já que a planilha só
      // traz o primeiro nome do funcionário. Compatível com
      // qualquer banco (sem `mode: insensitive`, que só
      // existe no provider PostgreSQL/MongoDB).
      // =========================

      const nomesFuncionarios = [
        ...new Set(
          etapasParaCriar
            .map((e) => e.nomeFuncionario)
            .filter(Boolean)
        ),
      ];

      let funcionarioMap = new Map();
      let nomesNaoEncontrados = [];
      let nomesAmbiguos = [];

      if (nomesFuncionarios.length > 0) {
        const funcionariosDoEstabelecimento = await prisma.Usuarios.findMany({
          where: {
            estabelecimentoCnpj: cnpj,
          },
        });

        for (const nome of nomesFuncionarios) {
          const candidatos = funcionariosDoEstabelecimento.filter(
            (f) => primeiroNome(f.nome) === primeiroNome(nome)
          );

          if (candidatos.length === 1) {
            funcionarioMap.set(normalizar(nome), candidatos[0].email);
          } else if (candidatos.length > 1) {
            // Mais de um funcionário com o mesmo primeiro nome
            nomesAmbiguos.push(nome);
          } else {
            nomesNaoEncontrados.push(nome);
          }
        }
      }

      // =========================
      // 🔥 TRANSACTION
      // =========================

      const resultado = await prisma.$transaction(
        async (tx) => {

          // cria peça
          const peca = await tx.pecasOP.create({
            data: {
              descricao: descricao_peca,
              quantidade_pecas,
              data_do_pedido: new Date().toISOString().split("T")[0],
              valor_peca,
              status: "nao_iniciado",
              tempo_padrao: tempoTotal,
              id_Estabelecimento: cnpj,
            },
          });

          // 🔎 Busca etapas já existentes no banco para este estabelecimento
          const etapasExistentes = await tx.etapa.findMany({
            where: { id_Estabelecimento: cnpj },
          });

          const etapasParaVincular = [];
          const etapasParaCriarNoBanco = [];

          for (const etapa of etapasParaCriar) {
            const jaExiste = etapasExistentes.find(
              (e) =>
                normalizar(e.descricao) === normalizar(etapa.descricao) &&
                e.tempo_padrao === etapa.tempo_padrao
            );

            if (jaExiste) {
              // ✅ Já existe com mesmo nome e tempo — só vincula
              etapasParaVincular.push({
                ...jaExiste,
                nomeFuncionario: etapa.nomeFuncionario,
                tempoFuncionario: etapa.tempoFuncionario,
              });
            } else {
              // 🆕 Não existe — precisa criar
              etapasParaCriarNoBanco.push(etapa);
            }
          }

          // Cria apenas as etapas novas (sem os campos auxiliares de funcionário)
          if (etapasParaCriarNoBanco.length > 0) {
            await tx.etapa.createMany({
              data: etapasParaCriarNoBanco.map(
                ({ nomeFuncionario, tempoFuncionario, ...rest }) => rest
              ),
              skipDuplicates: true,
            });
          }

          // Busca as recém-criadas para pegar os IDs gerados
          const etapasRecemCriadas =
            etapasParaCriarNoBanco.length > 0
              ? await tx.etapa.findMany({
                  where: {
                    id_Estabelecimento: cnpj,
                    descricao: {
                      in: etapasParaCriarNoBanco.map((e) => e.descricao),
                    },
                  },
                })
              : [];

          // Reanexa nomeFuncionario / tempoFuncionario nas recém-criadas
          const etapasRecemCriadasComDados = etapasRecemCriadas.map((e) => {
            const original = etapasParaCriarNoBanco.find(
              (o) => normalizar(o.descricao) === normalizar(e.descricao)
            );
            return {
              ...e,
              nomeFuncionario: original?.nomeFuncionario ?? null,
              tempoFuncionario: original?.tempoFuncionario ?? null,
            };
          });

          // Monta vínculos: existentes + recém-criadas
          const todasEtapasParaVincular = [
            ...etapasParaVincular,
            ...etapasRecemCriadasComDados,
          ];

          const vinculos = todasEtapasParaVincular.map((etapa) => ({
            id_da_op: peca.id_da_op,
            id_da_funcao: etapa.id_da_funcao,
            quantidade_meta: quantidade_pecas,
          }));

          if (vinculos.length > 0) {
            await tx.pecasEtapas.createMany({
              data: vinculos,
              skipDuplicates: true,
            });
          }

          // =========================
          // ✅ CRIA TempoReferencia (tempo individual do funcionário)
          // =========================

          const temposReferencia = [];

          for (const etapa of todasEtapasParaVincular) {
            if (!etapa.nomeFuncionario || !etapa.tempoFuncionario) continue;

            const idFuncionario = funcionarioMap.get(
              normalizar(etapa.nomeFuncionario)
            );
            if (!idFuncionario) continue; // não encontrado ou ambíguo — pula silenciosamente

            temposReferencia.push({
              estabelecimentoCnpj: cnpj,
              id_funcionario: idFuncionario,
              id_da_funcao: etapa.id_da_funcao,
              tempo_minutos: etapa.tempoFuncionario, // tempo individual, NÃO o tempo_padrao da etapa
              tipo_medicao: "planilha",
              data_medicao: new Date(),
              opId: peca.id_da_op,
            });
          }

          if (temposReferencia.length > 0) {
            await tx.TempoReferencia.createMany({
              data: temposReferencia,
              skipDuplicates: true,
            });
          }

          return {
            peca,
            etapasCriadas: etapasParaCriarNoBanco.length,
            etapasReutilizadas: etapasParaVincular.length,
            tempoTotal,
            temposReferenciaCriados: temposReferencia.length,
          };
        },
        { timeout: 20000 }
      );

      return res.json({
        sucesso: true,
        pecaCriada: resultado.peca.descricao,
        etapasCriadas: resultado.etapasCriadas,
        etapasReutilizadas: resultado.etapasReutilizadas,
        tempoTotal: resultado.tempoTotal,
        temposReferenciaCriados: resultado.temposReferenciaCriados,
        ...(nomesNaoEncontrados.length > 0 && {
          avisos: nomesNaoEncontrados.map(
            (n) => `Funcionário "${n}" não encontrado no estabelecimento — tempo de referência não criado`
          ),
        }),
        ...(nomesAmbiguos.length > 0 && {
          avisosAmbiguidade: nomesAmbiguos.map(
            (n) => `Mais de um funcionário com o nome "${n}" — informe o nome completo na planilha para esse caso`
          ),
        }),
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