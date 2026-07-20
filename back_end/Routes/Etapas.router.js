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

const removerAcentos = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const limparTempoEmbutido = (texto) =>
  String(texto || "").replace(/\(\s*[\d.,]+\s*min\s*\)/gi, "");

const colapsarEspacos = (texto) =>
  String(texto || "").replace(/\s+/g, " ").trim();

const normalizarChave = (texto) =>
  colapsarEspacos(removerAcentos(limparTempoEmbutido(texto))).toLowerCase();

const limparParaExibicao = (texto) =>
  colapsarEspacos(limparTempoEmbutido(texto));

const primeiroNome = (texto) => normalizarChave(texto).split(" ")[0];

const numeroSeguro = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const num = Number(String(valor).replace(",", "."));
  return Number.isNaN(num) ? null : num;
};

const valoresProximos = (a, b, tolerancia = 0.001) => {
  if (a === null || b === null) return a === b;
  return Math.abs(Number(a) - Number(b)) < tolerancia;
};

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

      let linhaPeca = null;

      for (const linha of json) {
        const descricao = linha[0];
        const quantidade = Number(linha[1]);
        const valor = Number(linha[2]);
        const tempoPadrao = linha[3];

        if (descricao && !isNaN(quantidade) && !isNaN(valor)) {
          linhaPeca = [descricao, quantidade, valor, tempoPadrao];
          break;
        }
      }

      if (!linhaPeca) {
        return res.status(400).json({ erro: "Dados da peça não encontrados" });
      }

      const descricao_peca = linhaPeca[0];
      const quantidade_pecas = Number(linhaPeca[1]);
      const valor_peca = Number(linhaPeca[2]);
      const tempoPadraoPeca = numeroSeguro(linhaPeca[3]);

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

      const linhas = XLSX.utils.sheet_to_json(sheet, { range: headerIndex });

      const etapasValidas = linhas.filter(
        (l) => l.descricao_etapa && String(l.descricao_etapa).trim() !== ""
      );

      if (etapasValidas.length === 0) {
        return res.status(400).json({
          erro: "A planilha deve conter pelo menos uma etapa",
        });
      }

      const chaveEtapaCompleta = (textoNormalizado, tempo) =>
        `${textoNormalizado}::${tempo === null ? "null" : tempo}`;

      let tempoTotal = 0;
      const etapasMap = new Map();
      const vincsFuncionario = [];

      for (const linha of etapasValidas) {
        const chaveTexto = normalizarChave(linha.descricao_etapa);
        const tempo = numeroSeguro(linha.tempo_padrao);
        const chave = chaveEtapaCompleta(chaveTexto, tempo);

        if (!etapasMap.has(chave)) {
          if (tempo !== null) tempoTotal += tempo;

          etapasMap.set(chave, {
            chave,
            chaveTexto,
            descricao: limparParaExibicao(linha.descricao_etapa),
            tempo_padrao: tempo,
            id_Estabelecimento: cnpj,
          });
        }

        const nomeFuncionario = linha.funcionario
          ? String(linha.funcionario).trim()
          : null;
        const tempoFuncionario = numeroSeguro(linha.tempo_funcionario);

        if (nomeFuncionario && tempoFuncionario) {
          vincsFuncionario.push({
            chaveEtapa: chave,
            nomeFuncionario,
            tempoFuncionario,
          });
        }
      }

      const etapasParaCriar = Array.from(etapasMap.values());

      const nomesFuncionarios = [
        ...new Set(vincsFuncionario.map((v) => v.nomeFuncionario).filter(Boolean)),
      ];

      const funcionarioMap = new Map();
      const nomesNaoEncontrados = [];
      const nomesAmbiguos = [];

      if (nomesFuncionarios.length > 0) {
        const funcionariosDoEstabelecimento = await prisma.Usuarios.findMany({
          where: { estabelecimentoCnpj: cnpj },
        });

        for (const nome of nomesFuncionarios) {
          const candidatos = funcionariosDoEstabelecimento.filter(
            (f) => primeiroNome(f.nome) === primeiroNome(nome)
          );

          if (candidatos.length === 1) {
            funcionarioMap.set(normalizarChave(nome), candidatos[0].email);
          } else if (candidatos.length > 1) {
            nomesAmbiguos.push(nome);
          } else {
            nomesNaoEncontrados.push(nome);
          }
        }
      }

      const resultado = await prisma.$transaction(
        async (tx) => {
          const peca = await tx.pecasOP.create({
            data: {
              descricao: descricao_peca,
              quantidade_pecas,
              data_do_pedido: new Date().toISOString().split("T")[0],
              valor_peca,
              status: "nao_iniciado",
              tempo_padrao: tempoPadraoPeca,
              id_Estabelecimento: cnpj,
            },
          });

          const etapasExistentes = await tx.etapa.findMany({
            where: { id_Estabelecimento: cnpj },
          });

          const etapasPorTexto = new Map();
          for (const e of etapasExistentes) {
            const chaveTexto = normalizarChave(e.descricao);
            const lista = etapasPorTexto.get(chaveTexto) || [];
            lista.push(e);
            etapasPorTexto.set(chaveTexto, lista);
          }

          const etapasPorChave = new Map();
          const todasEtapas = [];
          let etapasCriadasCount = 0;
          let etapasReutilizadasCount = 0;

          for (const etapa of etapasParaCriar) {
            const candidatos = etapasPorTexto.get(etapa.chaveTexto) || [];
            const existente = candidatos.find((e) =>
              valoresProximos(
                e.tempo_padrao === null || e.tempo_padrao === undefined
                  ? null
                  : Number(e.tempo_padrao),
                etapa.tempo_padrao
              )
            );

            if (existente) {
              todasEtapas.push(existente);
              etapasPorChave.set(etapa.chave, existente);
              etapasReutilizadasCount++;
            } else {
              const criada = await tx.etapa.create({
                data: {
                  descricao: etapa.descricao,
                  tempo_padrao: etapa.tempo_padrao,
                  id_Estabelecimento: etapa.id_Estabelecimento,
                },
              });
              candidatos.push(criada);
              etapasPorTexto.set(etapa.chaveTexto, candidatos);
              etapasPorChave.set(etapa.chave, criada);
              todasEtapas.push(criada);
              etapasCriadasCount++;
            }
          }

          const vinculos = todasEtapas.map((etapa) => ({
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

          const idsFuncionarios = [
            ...new Set(Array.from(funcionarioMap.values())),
          ];

          const temposExistentes =
            idsFuncionarios.length > 0
              ? await tx.TempoReferencia.findMany({
                  where: {
                    estabelecimentoCnpj: cnpj,
                    id_funcionario: { in: idsFuncionarios },
                  },
                })
              : [];

          const temposPorChave = new Map(
            temposExistentes.map((t) => [
              `${t.id_funcionario}|${t.id_da_funcao}`,
              t,
            ])
          );

          let temposCriadosCount = 0;
          let temposReutilizadosCount = 0;
          let temposAtualizadosCount = 0;

          for (const vinc of vincsFuncionario) {
            const idFuncionario = funcionarioMap.get(
              normalizarChave(vinc.nomeFuncionario)
            );
            if (!idFuncionario) continue;

            const etapaResolvida = etapasPorChave.get(vinc.chaveEtapa);
            if (!etapaResolvida) continue;

            const idFuncao = etapaResolvida.id_da_funcao;
            const chaveTempo = `${idFuncionario}|${idFuncao}`;
            const existente = temposPorChave.get(chaveTempo);

            if (existente) {
              temposReutilizadosCount++;

              if (!valoresProximos(existente.tempo_minutos, vinc.tempoFuncionario)) {
                const atualizado = await tx.TempoReferencia.update({
                  where: { id: existente.id },
                  data: {
                    tempo_minutos: vinc.tempoFuncionario,
                    tipo_medicao: "planilha",
                    data_medicao: new Date(),
                    opId: peca.id_da_op,
                  },
                });
                temposPorChave.set(chaveTempo, atualizado);
                temposAtualizadosCount++;
              }
            } else {
              const criado = await tx.TempoReferencia.create({
                data: {
                  estabelecimentoCnpj: cnpj,
                  id_funcionario: idFuncionario,
                  id_da_funcao: idFuncao,
                  tempo_minutos: vinc.tempoFuncionario,
                  tipo_medicao: "planilha",
                  data_medicao: new Date(),
                  opId: peca.id_da_op,
                },
              });
              temposPorChave.set(chaveTempo, criado);
              temposCriadosCount++;
            }
          }

          return {
            peca,
            etapasCriadas: etapasCriadasCount,
            etapasReutilizadas: etapasReutilizadasCount,
            temposReferenciaCriados: temposCriadosCount,
            temposReferenciaReutilizados: temposReutilizadosCount,
            temposReferenciaAtualizados: temposAtualizadosCount,
          };
        },
        { timeout: 20000 }
      );

      return res.json({
        sucesso: true,
        pecaCriada: resultado.peca.descricao,
        etapasCriadas: resultado.etapasCriadas,
        etapasReutilizadas: resultado.etapasReutilizadas,
        tempoTotal,
        tempoPadraoPeca,
        temposReferenciaCriados: resultado.temposReferenciaCriados,
        temposReferenciaReutilizados: resultado.temposReferenciaReutilizados,
        temposReferenciaAtualizados: resultado.temposReferenciaAtualizados,
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

router.post(
  "/tempo-referencia",
  jwtMiddleware,
  async (req, res) => {
    try {
      const cnpj = req.user.cnpj;

      const {
        id_funcionario,
        id_da_funcao,
        tempo_minutos,
        tipo_medicao = "manual",
      } = req.body;

      if (
        !id_funcionario ||
        !id_da_funcao ||
        tempo_minutos === undefined ||
        tempo_minutos === null
      ) {
        return res.status(400).json({
          erro: "Campos obrigatórios não informados.",
        });
      }

      // Verifica funcionário
      const funcionario = await prisma.Usuarios.findFirst({
        where: {
          email: id_funcionario,
          estabelecimentoCnpj: cnpj,
        },
      });

      if (!funcionario) {
        return res.status(404).json({
          erro: "Funcionário não encontrado.",
        });
      }

      // Verifica etapa
      const etapa = await prisma.etapa.findFirst({
        where: {
          id_da_funcao: Number(id_da_funcao),
          id_Estabelecimento: cnpj,
        },
      });

      if (!etapa) {
        return res.status(404).json({
          erro: "Etapa não encontrada.",
        });
      }

      // Procura um tempo de referência já existente
      const existente = await prisma.TempoReferencia.findFirst({
        where: {
          estabelecimentoCnpj: cnpj,
          id_funcionario,
          id_da_funcao: Number(id_da_funcao),
          opId: null,
        },
      });

      let tempoReferencia;

      if (existente) {
        tempoReferencia = await prisma.TempoReferencia.update({
          where: {
            id: existente.id,
          },
          data: {
            tempo_minutos: Number(tempo_minutos),
            tipo_medicao,
            data_medicao: new Date(),
          },
        });
      } else {
        tempoReferencia = await prisma.TempoReferencia.create({
          data: {
            estabelecimentoCnpj: cnpj,
            id_funcionario,
            id_da_funcao: Number(id_da_funcao),
            tempo_minutos: Number(tempo_minutos),
            tipo_medicao,
            data_medicao: new Date(),
            opId: null,
          },
        });
      }

      return res.status(existente ? 200 : 201).json({
        sucesso: true,
        acao: existente ? "atualizado" : "criado",
        tempoReferencia,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        erro: error.message || "Erro ao salvar tempo de referência.",
      });
    }
  }
);
module.exports = router;