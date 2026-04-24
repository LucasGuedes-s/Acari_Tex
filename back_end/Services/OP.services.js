const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tz = require('date-fns-tz');

function getData() {
  const agora = new Date();
  const offsetBrasil = -3;
  const utc = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasil = new Date(utc + 3600000 * offsetBrasil);

  brasil.setHours(0, 0, 0, 0);
  return brasil;
}

async function postPecaOP(req, user) {
  const etapas = req.peca.etapas || [];

  const etapasIds = await Promise.all(
    etapas.map(async (etapaItem) => {
      const descricao = typeof etapaItem === "string" ? etapaItem : etapaItem.descricao;

      if (!descricao) throw new Error("Descrição da etapa inválida");

      let etapa = await prisma.etapa.findUnique({
        where: { descricao },
        select: { id_da_funcao: true },
      });

      if (!etapa) {
        etapa = await prisma.etapa.create({
          data: { descricao },
          select: { id_da_funcao: true },
        });
      }

      return { id_da_funcao: etapa.id_da_funcao, descricao };
    })
  );

  const novaPeca = await prisma.pecasOP.create({
    data: {
      status: "nao_iniciado",
      descricao: req.peca.descricao || null,
      quantidade_pecas: req.peca.quantidade_pecas || null,
      pedido_por: req.peca.pedido_por || null,
      data_do_pedido: new Date().toISOString(),
      data_de_entrega: req.peca.data_de_entrega || null,
      valor_peca: parseFloat(req.peca.valor_peca) || null,
      tempo_padrao: parseFloat(req.peca.tempo_padrao) || null,
      Estabelecimento: {
        connect: { cnpj: user.cnpj },
      },
    },
  });

  await prisma.pecasEtapas.createMany({
    data: etapasIds.map((etapa) => ({
      id_da_op: novaPeca.id_da_op,
      id_da_funcao: etapa.id_da_funcao,
      quantidade_meta: req.peca.quantidade_pecas || 0,
      status: "PENDENTE"
    })),
  });

  return novaPeca;
}
async function duplicarOP(opId, dados, user) {
  if (!opId) {
    throw new Error("ID da OP é obrigatório");
  }

  if (!dados?.descricao || !dados?.quantidade) {
    throw new Error("Descrição e quantidade são obrigatórias");
  }

  const quantidade = Number(dados.quantidade);

  if (isNaN(quantidade) || quantidade <= 0) {
    throw new Error("Quantidade inválida");
  }

  const id_da_op = parseInt(opId);

  return await prisma.$transaction(async (tx) => {

    // 🔎 1. Buscar OP com RELAÇÃO CORRETA
    const opOriginal = await tx.pecasOP.findUnique({
      where: { id_da_op },
      include: {
        etapas: true, // ✅ CORRETO
      },
    });

    if (!opOriginal) {
      throw new Error("OP não encontrada");
    }

    // 🧱 2. Criar nova OP
    const novaPeca = await tx.pecasOP.create({
      data: {
        status: "nao_iniciado",
        descricao: dados.descricao,
        quantidade_pecas: quantidade,
        pedido_por: opOriginal.pedido_por,
        data_do_pedido: new Date().toISOString(),
        data_de_entrega: opOriginal.data_de_entrega,
        valor_peca: opOriginal.valor_peca,
        tempo_padrao: opOriginal.tempo_padrao,
        Estabelecimento: {
          connect: { cnpj: user.cnpj },
        },
      },
    });

    // 🔁 3. Duplicar etapas (corrigido)
    if (opOriginal.etapas.length > 0) {
      await tx.pecasEtapas.createMany({
        data: opOriginal.etapas.map((etapa) => ({
          id_da_op: novaPeca.id_da_op,
          id_da_funcao: etapa.id_da_funcao,
          quantidade_meta: quantidade,
          status: "pendente", // 👈 mantém padrão do model
        })),
      });
    }

    return novaPeca;
  });
}
async function postProducaoPeca(req, res) {
  try {
    const {
      id_da_op,
      id_funcionario,
      id_funcionario_ajuda = null, // caso alguém esteja ajudando
      id_da_funcao,
      quantidade_pecas,
      hora_registro,
      tipo = 'normal', // normal | erro | correcao
    } = req.body;

    const id_Estabelecimento = req.user.cnpj;

    // 1️⃣ Buscar etapa relacionada
    const etapaRelacionada = await prisma.pecasEtapas.findUnique({
      where: {
        id_da_op_id_da_funcao: {
          id_da_op,
          id_da_funcao
        }
      }
    });

    if (!etapaRelacionada) {
      return res.status(404).json({ error: "Etapa não encontrada para essa OP." });
    }

    // 2️⃣ Agregar produção total da etapa considerando peças válidas ou corrigidas
    const producaoTotalEtapa = await prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_da_op,
        id_da_funcao,
      }
    });

    const jaProduzidoTotal = producaoTotalEtapa._sum.quantidade_pecas || 0;
    const novaQtdTotal = jaProduzidoTotal + quantidade_pecas;

    if (novaQtdTotal > etapaRelacionada.quantidade_meta) {
      return ({
        error: "A produção total da etapa excede a meta.",
        jaProduzido: jaProduzidoTotal,
        meta: etapaRelacionada.quantidade_meta
      });
    }

    // 3️⃣ Agregar produção individual do funcionário (considerando correção também)
    const producaoFuncionario = await prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_da_op,
        id_da_funcao,
        id_funcionario,
      }
    });

    const jaProduzidoFuncionario = producaoFuncionario._sum.quantidade_pecas || 0;

    const producao = await prisma.producao.create({
      data: {
        id_da_op,
        id_funcionario,
        id_Estabelecimento,
        id_da_funcao,
        hora_registro,
        quantidade_pecas,
        data_inicio: getData()
      }
    });

    if (novaQtdTotal === etapaRelacionada.quantidade_meta) {
      await prisma.pecasEtapas.update({
        where: {
          id_da_op_id_da_funcao: {
            id_da_op,
            id_da_funcao
          }
        },
        data: { status: "CONCLUIDA" }
      });
    }

    return producao;

  } catch (err) {
    console.error("Erro ao registrar produção:", err);
    return res.status(500).json({ error: "Erro ao registrar produção." });
  }
}
async function postProducaoPecaLote(req, res) {
  try {
    const { producoes } = req.body;
    const id_Estabelecimento = req.user.cnpj;
    if (!Array.isArray(producoes) || !producoes.length) {
      throw new Error("Nenhuma produção");

    }

    const agrupadas = {};

    for (const p of producoes) {
      const key = `${p.id_da_op}_${p.id_da_funcao}`;
      if (!agrupadas[key]) agrupadas[key] = [];
      agrupadas[key].push(p);
    }

    for (const key in agrupadas) {
      const grupo = agrupadas[key];
      const { id_da_op, id_da_funcao } = grupo[0];

      const etapa = await prisma.pecasEtapas.findUnique({
        where: {
          id_da_op_id_da_funcao: { id_da_op, id_da_funcao }
        }
      });

      if (!etapa) {
        throw new Error(`Etapa ${id_da_funcao} não encontrada para OP ${id_da_op}`);
      }

      const totalNovo = grupo.reduce(
        (sum, p) => sum + Number(p.quantidade_pecas || 0),
        0
      );

      const producaoAtual = await prisma.producao.aggregate({
        _sum: { quantidade_pecas: true },
        where: { id_da_op, id_da_funcao }
      });

      const jaProduzido = producaoAtual._sum.quantidade_pecas || 0;
      console.log(`OP ${id_da_op} - Etapa ${id_da_funcao}: já produzido ${jaProduzido}, novo ${totalNovo}, meta ${etapa.quantidade_meta}`);
      if (jaProduzido + totalNovo > etapa.quantidade_meta) {
        throw new Error("Produção excede a meta da etapa.");
      }
    }

    const resultado = await prisma.$transaction(
      producoes.map(p =>
        prisma.producao.create({
          data: {
            id_da_op: p.id_da_op,
            id_da_funcao: p.id_da_funcao,
            id_funcionario: p.id_funcionario,
            quantidade_pecas: p.quantidade_pecas,
            hora_registro: p.hora_registro,
            id_Estabelecimento,
            data_inicio: getData()
          }
        })
      )
    );

    for (const key in agrupadas) {
      const grupo = agrupadas[key];
      const { id_da_op, id_da_funcao } = grupo[0];

      const soma = await prisma.producao.aggregate({
        _sum: { quantidade_pecas: true },
        where: { id_da_op, id_da_funcao }
      });

      const etapa = await prisma.pecasEtapas.findUnique({
        where: {
          id_da_op_id_da_funcao: { id_da_op, id_da_funcao }
        }
      });

      if (soma._sum.quantidade_pecas === etapa.quantidade_meta) {
        await prisma.pecasEtapas.update({
          where: {
            id_da_op_id_da_funcao: { id_da_op, id_da_funcao }
          },
          data: { status: 'CONCLUIDA' }
        });
      }
    }

    return { registros: resultado.length };

  } catch (err) {
    console.error('Erro ao registrar produção em lote:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar produção.' });
  }
}

async function getPecasOP(req) {
  const cnpj = req.cnpj;
  const pecasOp = await prisma.pecasOP.findMany({
    where: { id_Estabelecimento: cnpj },
    include: {
      Estabelecimento: true,
      producao_peca: {
        include: {
          producao_funcionario: {
            select: {
              nome: true,
              email: true // opcional
            }
          },
          producao_etapa: {
            select: {
              descricao: true
            }
          }
        }
      },
      etapas: {
        include: {
          etapa: true,
        },
      },
    },
  });


  if (!pecasOp) {
    return { finalizado: [], em_progresso: [], nao_iniciado: [], coleta: [] };
  }

  const finalizado = pecasOp.filter(peca => peca.status === "finalizado");
  const em_progresso = pecasOp.filter(peca => peca.status === "em_progresso");
  const nao_iniciado = pecasOp.filter(peca => peca.status === "nao_iniciado");
  const coleta = pecasOp.filter(peca => peca.status === "coleta");

  return {
    finalizado,
    em_progresso,
    nao_iniciado,
    coleta
  };
}

async function getEtapasProducaoPorPeca(req, res) {
  try {
    const id_da_op = req;

    const producao = await prisma.producao.findMany({
      where: {
        id_da_op: Number(id_da_op)
      },
      include: {
        producao_etapa: true,
        producao_funcionario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    });

    if (!producao.length) {
      return 'Nenhuma produção encontrada para essa peça.';
    }

    return producao;
  } catch (error) {
    console.error("Erro ao buscar etapas da produção:", error);
    return "Erro ao buscar dados da produção.";
  }
}

async function getEtapasProducaoPorEstabelecimento(req, res) {
  try {
    const cnpj = req.cnpj;
    const producao = await prisma.producao.findMany({
      where: {
        Estabelecimento: {
          cnpj: cnpj
        }
      },
      include: {
        producao_etapa: true,
        producao_funcionario: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    });

    if (!producao.length) {
      return 'Nenhuma produção encontrada para este estabelecimento.';
    }

    return producao;
  } catch (error) {
    console.error("Erro ao buscar etapas da produção:", error);
    return "Erro ao buscar dados da produção.";
  }
}

async function updatePecaStatus(id_da_op, status) {
  try {
    let data = { status: status }
    if (status == "finalizado") {
      data = { status: status, data_de_entrega: new Date().toISOString() }
    }
    const peca = await prisma.PecasOP.update({
      where: { id_da_op },
      data
    });
    return peca;
  } catch (error) {
    console.error("Erro ao atualizar status da peça:", error);
    throw new Error("Erro ao atualizar status da peça.");
  }
}
async function getProducaoEquipe(cnpj, filtrar) {
  try {
    console.log("Buscando produção da equipe para CNPJ:", cnpj, "com filtro:", filtrar);

    const filtro = filtrar || "hoje";
    const cnpjEstabelecimento = cnpj;

    // ═══════════════════════════════════════
    // ESTABELECIMENTO
    // ═══════════════════════════════════════
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj: cnpjEstabelecimento },
      select: {
        tempo_de_producao: true,
        peca_final: true,
      },
    });

    if (!estabelecimento) {
      return { mensagem: "Estabelecimento não encontrado." };
    }

    const minutosDisponiveis = estabelecimento.tempo_de_producao || 480;
    const etapaFinal = (estabelecimento.peca_final || "").trim().toLowerCase();

    if (!etapaFinal) {
      console.warn("Peça final não configurada no estabelecimento.");
    }
    const fusoSP = "America/Sao_Paulo";
    const agora = new Date();
    let diaFiltro = new Date(agora.toLocaleString("en-US", { timeZone: fusoSP }));

    if (filtro === "ontem") diaFiltro.setDate(diaFiltro.getDate() - 1);
    if (filtro === "antesDeOntem") diaFiltro.setDate(diaFiltro.getDate() - 2);

    const dtf = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoSP,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const partes = dtf.formatToParts(diaFiltro);
    const dia = partes.find(p => p.type === "day").value;
    const mes = partes.find(p => p.type === "month").value;
    const ano = partes.find(p => p.type === "year").value;

    const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
    const fimDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59));

    // ═══════════════════════════════════════
    // PRODUÇÕES DO DIA
    // ═══════════════════════════════════════
    const producoesDia = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        hora_registro: true,
        id_da_op: true,
        id_da_funcao: true,
        producao_funcionario: { select: { nome: true, foto: true } },
        producao_etapa: { select: { descricao: true, tempo_padrao: true } },
        producao_peca: {
          select: {
            descricao: true,
            tempo_padrao: true,
            etapas: {
              select: {
                id_da_funcao: true,
                etapa: { select: { tempo_padrao: true } },
              },
            },
          },
        },
      },
    });
    // console.log("Intervalo buscado:", inicioDiaUTC.toISOString(), "→", fimDiaUTC.toISOString());

    // // E logo após o findMany, sem o filtro de data:
    // const todosDia = await prisma.producao.findMany({
    //   where: { id_Estabelecimento: cnpjEstabelecimento },
    //   select: { id_funcionario: true, data_inicio: true, quantidade_pecas: true },
    //   orderBy: { data_inicio: 'desc' },
    //   take: 20,
    // });
    // console.log("Últimos 20 registros (sem filtro de data):", todosDia);
    // // Adicione isso logo após o findMany, antes de qualquer processamento
    // console.log("=== REGISTROS BRUTOS ===");
    // console.log("Total de registros:", producoesDia.length);
    // producoesDia.forEach(p => {
    //   console.log({
    //     funcionario: p.id_funcionario,
    //     nome: p.producao_funcionario?.nome,
    //     etapa: p.producao_etapa?.descricao,
    //     quantidade: p.quantidade_pecas,
    //     hora: p.hora_registro,
    //   });
    // });

    if (producoesDia.length === 0) {
      return { mensagem: "Nenhuma produção registrada no período." };
    }

    // ═══════════════════════════════════════
    // TEMPO PADRÃO DA PEÇA (base para eficiência da turma)
    // ═══════════════════════════════════════
    const tempoPadraoTotalPeca = producoesDia[0].producao_peca?.tempo_padrao;

    if (!tempoPadraoTotalPeca || tempoPadraoTotalPeca <= 0) {
      console.warn("Tempo padrão da peça não definido ou inválido:", tempoPadraoTotalPeca);
      return { mensagem: "Tempo padrão da peça inválido." };
    }

    const descricaoPeca =
      producoesDia[0].producao_peca?.descricao || "Peça não informada";

    // ═══════════════════════════════════════
    // AGREGAÇÃO POR FUNCIONÁRIO
    // ═══════════════════════════════════════
    const agrupadoDia = {};

    // Contadores da turma
    let totalPecasFinalTurma = 0;
    const producaoPorHoraGeral = {};

    for (const p of producoesDia) {
      const funcionarioId = p.id_funcionario;
      const nome = p.producao_funcionario?.nome || funcionarioId;
      const foto = p.producao_funcionario?.foto || null;
      const quantidade = p.quantidade_pecas || 0;
      const hora = p.hora_registro?.padStart(3, "0") || "00h";

      // Nome da etapa — normalizado para comparação com etapaFinal
      const etapaDescricao = p.producao_etapa?.descricao || "Sem Etapa";
      const etapaNormalizada = etapaDescricao.trim().toLowerCase();

      // Tempo padrão da etapa: tenta direto, fallback via PecasEtapas
      const tempoPadraoEtapa =
        p.producao_etapa?.tempo_padrao ??
        p.producao_peca?.etapas?.find((e) => e.id_da_funcao === p.id_da_funcao)
          ?.etapa?.tempo_padrao ??
        0;

      if (!tempoPadraoEtapa || tempoPadraoEtapa <= 0) {
        console.warn(
          `[WARN] Etapa "${etapaDescricao}" sem tempo_padrao válido — ` +
          `funcionário ${funcionarioId} não terá essa etapa contabilizada na eficiência.`
        );
      }

      // ── Inicializa estrutura do funcionário ──────────────────────────
      if (!agrupadoDia[funcionarioId]) {
        agrupadoDia[funcionarioId] = {
          nome,
          foto,
          tempoPadraoProduzido: 0,   // soma de (qtd × tempo_padrao) de todas as etapas válidas
          totalQuantidade: 0,        // total de peças em TODAS as etapas
          totalPecasFinal: 0,        // total de peças apenas na etapa final
          etapas: {},
          producaoPorHora: {},
        };
      }

      // ── Eficiência individual: acumula independente de ser etapa final ──
      if (tempoPadraoEtapa > 0) {
        agrupadoDia[funcionarioId].tempoPadraoProduzido += quantidade * tempoPadraoEtapa;
      }
      // Total de peças: conta TODAS as etapas (não só a final)
      agrupadoDia[funcionarioId].totalQuantidade += quantidade;

      // ── Etapas detalhadas ────────────────────────────────────────────
      if (!agrupadoDia[funcionarioId].etapas[etapaDescricao]) {
        agrupadoDia[funcionarioId].etapas[etapaDescricao] = {
          tempoPadraoTotal: 0,
          tempoPadraoEtapa,
          quantidade: 0,
        };
      }
      if (tempoPadraoEtapa > 0) {
        agrupadoDia[funcionarioId].etapas[etapaDescricao].tempoPadraoTotal +=
          quantidade * tempoPadraoEtapa;
      }
      agrupadoDia[funcionarioId].etapas[etapaDescricao].quantidade += quantidade;

      // ── Produção por hora (agrupada por etapa dentro da hora) ────────
      if (!agrupadoDia[funcionarioId].producaoPorHora[hora]) {
        agrupadoDia[funcionarioId].producaoPorHora[hora] = {};
      }
      if (!agrupadoDia[funcionarioId].producaoPorHora[hora][etapaDescricao]) {
        agrupadoDia[funcionarioId].producaoPorHora[hora][etapaDescricao] = {
          quantidade: 0,
          tempoPadraoEtapa,
        };
      }
      agrupadoDia[funcionarioId].producaoPorHora[hora][etapaDescricao].quantidade += quantidade;

      // ── Peça final: conta apenas a etapa final para o indicador da turma ──
      // FIX: comparação normalizada (trim + lowercase) para evitar falhas por
      // espaços, capitalização diferente, etc.
      if (etapaFinal && etapaNormalizada === etapaFinal) {
        agrupadoDia[funcionarioId].totalPecasFinal += quantidade;
        totalPecasFinalTurma += quantidade;
        producaoPorHoraGeral[hora] =
          (producaoPorHoraGeral[hora] || 0) + quantidade;
      }
    }

    // console.log(
    //   "Funcionários encontrados:",
    //   Object.entries(agrupadoDia).map(([id, d]) => ({
    //     id,
    //     nome: d.nome,
    //     totalQuantidade: d.totalQuantidade,
    //     totalPecasFinal: d.totalPecasFinal,
    //     etapas: Object.keys(d.etapas),
    //   }))
    // );

    // ═══════════════════════════════════════
    // MONTAGEM DO ARRAY DE FUNCIONÁRIOS
    // Todos os funcionários com produção no dia aparecem,
    // independentemente de terem feito a etapa final.
    // ═══════════════════════════════════════
    const funcionarios = Object.entries(agrupadoDia).map(([id, dados]) => {
      // Eficiência pessoal: baseada nos minutos padrão produzidos vs jornada
      const eficienciaIndividual =
        (dados.tempoPadraoProduzido / minutosDisponiveis) * 100;

      // Etapas detalhadas
      const etapasDetalhadas = Object.entries(dados.etapas).map(
        ([descricao, etapaDados]) => {
          if (!etapaDados.tempoPadraoEtapa || etapaDados.tempoPadraoEtapa <= 0) {
            return {
              descricao,
              tempo_padrao_total: 0,
              pecas_produzidas: etapaDados.quantidade,
              eficiencia_etapa: "N/A",
            };
          }

          const pecasProduzidasEtapa =
            etapaDados.tempoPadraoTotal / etapaDados.tempoPadraoEtapa;
          const capacidade100Etapa =
            minutosDisponiveis / etapaDados.tempoPadraoEtapa;
          const eficienciaEtapa =
            (pecasProduzidasEtapa / capacidade100Etapa) * 100;

          return {
            descricao,
            tempo_padrao_total: Number(etapaDados.tempoPadraoTotal.toFixed(2)),
            pecas_produzidas: Math.round(pecasProduzidasEtapa),
            eficiencia_etapa: eficienciaEtapa.toFixed(2) + "%",
          };
        }
      );

      // Produção por hora com eficiência de cada etapa baseada em 60 min
      const producaoPorHora = Object.entries(dados.producaoPorHora)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hora, etapasPorHora]) => {
          const etapasHora = Object.entries(etapasPorHora).map(
            ([nomeEtapa, etapaDados]) => {
              const { quantidade, tempoPadraoEtapa } = etapaDados;
              const capacidade100Hora =
                tempoPadraoEtapa > 0 ? 60 / tempoPadraoEtapa : 0;
              const eficienciaHora =
                capacidade100Hora > 0
                  ? (quantidade / capacidade100Hora) * 100
                  : 0;

              return {
                etapa: nomeEtapa,
                total: quantidade,
                eficiencia_etapa_hora:
                  tempoPadraoEtapa > 0
                    ? eficienciaHora.toFixed(2) + "%"
                    : "N/A",
              };
            }
          );

          const totalHora = etapasHora.reduce((acc, e) => acc + e.total, 0);

          return {
            hora,
            total: totalHora,
            etapas: etapasHora,
          };
        });

      return {
        funcionario: id,
        nome: dados.nome,
        foto: dados.foto || "/avatar.png",
        eficiencia_pessoal: eficienciaIndividual.toFixed(2) + "%",
        tempo_padrao_produzido: Number(dados.tempoPadraoProduzido.toFixed(2)),
        tempo_real_total: minutosDisponiveis,
        // total_pecas: TODAS as peças produzidas em qualquer etapa
        total_pecas: dados.totalQuantidade,
        // total_pecas_final: apenas as peças na etapa final (para referência)
        total_pecas_final: dados.totalPecasFinal,
        etapas: etapasDetalhadas,
        producaoPorHora,
      };
    });

    // ═══════════════════════════════════════
    // EFICIÊNCIA DA TURMA
    // Baseada nas peças finais ÷ capacidade máxima da turma
    // ═══════════════════════════════════════
    const quantidadePessoas = funcionarios.length;
    const producao100Turma =
      (quantidadePessoas * minutosDisponiveis) / tempoPadraoTotalPeca;
    const eficienciaMediaTurma =
      producao100Turma > 0
        ? (totalPecasFinalTurma / producao100Turma) * 100
        : 0;

    // ═══════════════════════════════════════
    // RETORNO
    // ═══════════════════════════════════════
    return {
      producaoDia: {
        descricaoPeca,
        tempoPadraoTotalPeca,
        quantidadePessoas,
        minutosDisponiveis,
        totalPecas: totalPecasFinalTurma,
        eficienciaMediaTurma: eficienciaMediaTurma.toFixed(2) + "%",
        funcionarios,
        producaoPorHoraGeral: Object.entries(producaoPorHoraGeral)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([hora, total]) => ({ hora, total })),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar produção da equipe:", error);
    return { error: error.message };
  }
}
async function getProducaoPorPeca(req) {
  try {
    const filtro = req.query.filtro || "hoje";
    const cnpjEstabelecimento = req.user.cnpj;

    // 🔹 Busca o tempo de produção padrão do estabelecimento
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj: cnpjEstabelecimento },
      select: { tempo_de_producao: true },
    });

    if (!estabelecimento) {
      return { mensagem: "Estabelecimento não encontrado." };
    }

    const minutosDisponiveis = (estabelecimento.tempo_de_producao || 9) * 60;
    const fusoSP = "America/Sao_Paulo";

    // 🔹 Ajusta data de filtro
    const agora = new Date();
    let diaFiltro = new Date(agora.toLocaleString("en-US", { timeZone: fusoSP }));
    if (filtro === "ontem") diaFiltro.setDate(diaFiltro.getDate() - 1);
    else if (filtro === "antesDeOntem") diaFiltro.setDate(diaFiltro.getDate() - 2);

    const inicioDia = new Date(diaFiltro.setHours(0, 0, 0, 0));
    const fimDia = new Date(diaFiltro.setHours(23, 59, 59, 999));

    // 🔹 Busca produções do dia
    const producoesDia = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioDia, lte: fimDia },
      },
      select: {
        id_da_op: true,
        quantidade_pecas: true,
        hora_registro: true, // "9h", "14h30"
        producao_etapa: { select: { descricao: true, tempo_padrao: true } },
        producao_peca: { select: { descricao: true, tempo_padrao: true } },
      },
    });

    if (producoesDia.length === 0) {
      return { mensagem: "Nenhuma produção registrada neste dia." };
    }

    // 🔹 Função auxiliar para converter "9h30" → 9.5
    function parseHoraString(horaStr) {
      if (!horaStr) return null;
      const match = horaStr.match(/^(\d{1,2})h(?:(\d{1,2}))?$/);
      if (!match) return null;
      const horas = parseInt(match[1], 10);
      const minutos = match[2] ? parseInt(match[2], 10) : 0;
      return horas + minutos / 60;
    }

    const agrupadoPorPeca = {};
    const producaoPorHora = {}; // agrupamento para gráfico de produção

    let totalTempoPadraoGeral = 0;
    let totalTempoTrabalhadoGeral = 0;

    // 🔹 Agrupa produções por peça
    for (const p of producoesDia) {
      const op = p.id_da_op || "Sem OP";
      const descricaoPeca = p.producao_peca?.descricao || "Peça não informada";
      const etapa = p.producao_etapa?.descricao || "Sem Etapa";
      const quantidade = p.quantidade_pecas || 0;
      const tempoPadrao = p.producao_etapa?.tempo_padrao ?? 0;

      const horaDecimal = parseHoraString(p.hora_registro);
      const horaCheia = horaDecimal ? Math.floor(horaDecimal) : null;

      if (!agrupadoPorPeca[op]) {
        agrupadoPorPeca[op] = {
          descricaoPeca,
          etapas: {},
          totalPecas: 0,
          tempoPadraoTotal: 0,
          horas: [],
        };
      }

      const peca = agrupadoPorPeca[op];

      if (!peca.etapas[etapa]) {
        peca.etapas[etapa] = {
          descricao: etapa,
          quantidadeTotal: 0,
          tempoPadraoTotal: 0,
          horas: [],
        };
      }

      const etapaAtual = peca.etapas[etapa];
      etapaAtual.quantidadeTotal += quantidade;
      etapaAtual.tempoPadraoTotal += quantidade * tempoPadrao;
      etapaAtual.horas.push(horaDecimal);

      peca.totalPecas += quantidade;
      peca.tempoPadraoTotal += quantidade * tempoPadrao;
      peca.horas.push(horaDecimal);

      totalTempoPadraoGeral += quantidade * tempoPadrao;

      // 🔹 Contabiliza por hora (para gráfico)
      if (horaCheia !== null) {
        if (!producaoPorHora[horaCheia]) {
          producaoPorHora[horaCheia] = 0;
        }
        producaoPorHora[horaCheia] += quantidade;
      }
    }

    // 🔹 Calcula eficiência e tempo por peça
    const resultadoPecas = [];

    for (const [op, dados] of Object.entries(agrupadoPorPeca)) {
      const etapasCalculadas = [];
      let tempoTotalTrabalhadoPeca = 0;

      for (const [etapaNome, info] of Object.entries(dados.etapas)) {
        const horas = info.horas.filter((h) => h !== null).sort((a, b) => a - b);

        // tempo trabalhado = intervalo entre primeiro e último registro
        const tempoDisponivelEtapa =
          horas.length > 1 ? (horas[horas.length - 1] - horas[0]) * 60 : 60;

        const eficienciaEtapa =
          tempoDisponivelEtapa > 0
            ? (info.tempoPadraoTotal / tempoDisponivelEtapa) * 100
            : 0;

        etapasCalculadas.push({
          descricao: etapaNome,
          quantidadeTotal: info.quantidadeTotal,
          tempoPadraoTotal: info.tempoPadraoTotal,
          tempoDisponivel: tempoDisponivelEtapa,
          eficienciaEtapa: eficienciaEtapa.toFixed(2) + "%",
        });

        tempoTotalTrabalhadoPeca += tempoDisponivelEtapa;
      }

      const eficienciaPeca =
        tempoTotalTrabalhadoPeca > 0
          ? (dados.tempoPadraoTotal / tempoTotalTrabalhadoPeca) * 100
          : 0;

      totalTempoTrabalhadoGeral += tempoTotalTrabalhadoPeca;

      resultadoPecas.push({
        op,
        descricaoPeca: dados.descricaoPeca,
        totalPecas: dados.totalPecas,
        tempoTotalTrabalhado: tempoTotalTrabalhadoPeca,
        eficienciaPeca: eficienciaPeca.toFixed(2) + "%",
        etapas: etapasCalculadas,
      });
    }

    // 🔹 Calcula média geral
    const eficienciaMediaGeral =
      totalTempoTrabalhadoGeral > 0
        ? (totalTempoPadraoGeral / totalTempoTrabalhadoGeral) * 100
        : 0;

    // 🔹 Monta gráfico de produção por hora
    const graficoProducaoPorHora = Object.entries(producaoPorHora)
      .sort((a, b) => a[0] - b[0])
      .map(([hora, quantidade]) => ({
        hora: `${hora}h`,
        quantidadeProduzida: quantidade,
      }));

    return {
      producaoPecas: resultadoPecas,
      eficienciaMediaGeral: eficienciaMediaGeral.toFixed(2) + "%",
      tempoTrabalhado: (totalTempoTrabalhadoGeral / 60).toFixed(2) + "h",
      producaoPorHora: graficoProducaoPorHora,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar produção por peça:", error);
    return { error: error.message };
  }
}

async function getEstatisticasPeca(id) {
  try {
    const id_da_op = parseInt(id, 10);

    const peca = await prisma.PecasOP.findUnique({
      where: { id_da_op },
      include: {
        Estabelecimento: true,
        etapas: { include: { etapa: true } },
        producao_peca: {
          include: {
            producao_funcionario: true,
            producao_etapa: true
          }
        }
      },
    });

    if (!peca) throw new Error("Peça não encontrada.");

    const producaoPorEtapa = {};

    let totalLiquido = 0;
    let totalPositivo = 0;
    let totalNegativo = 0;

    const somaPorEtapa = {};

    for (const p of peca.producao_peca) {
      const qtd = Number(p.quantidade_pecas) || 0;
      const etapaNome = p.producao_etapa?.descricao || "Etapa não definida";
      const funcionarioNome = p.producao_funcionario?.nome || p.id_funcionario || "Desconhecido";

      if (!producaoPorEtapa[etapaNome]) {
        producaoPorEtapa[etapaNome] = [];
        somaPorEtapa[etapaNome] = { liquido: 0, positivos: 0, estornos: 0 };
      }

      const registro = {
        id_da_producao: p.id_da_producao,
        funcionario: funcionarioNome,
        funcionario_email: p.producao_funcionario?.email || null,
        quantidade: qtd,
        estorno: qtd < 0,
        data_inicio: p.data_inicio,
        hora_registro: p.hora_registro,
      };

      producaoPorEtapa[etapaNome].push(registro);

      somaPorEtapa[etapaNome].liquido += qtd;
      if (qtd >= 0) somaPorEtapa[etapaNome].positivos += qtd;
      else somaPorEtapa[etapaNome].estornos += Math.abs(qtd);

      totalLiquido += qtd;
      if (qtd >= 0) totalPositivo += qtd;
      else totalNegativo += Math.abs(qtd);
    }

    const metaTotal = Number(peca.quantidade_pecas) || 0;
    const saldo = metaTotal - totalLiquido;

    return {
      id_da_op: peca.id_da_op,
      descricao: peca.descricao,
      status: peca.status,
      quantidade_pecas: metaTotal,
      totalProduzido: totalLiquido,
      totalPositivo,
      totalNegativo,
      saldo,
      pedido_por: peca.pedido_por,
      valor_peca: peca.valor_peca,
      data_do_pedido: peca.data_do_pedido,
      data_de_entrega: peca.data_de_entrega,
      notas: peca.notas,
      producaoPorEtapa,
      pecasEtapas: peca.etapas.map(e => ({
        id_da_funcao: e.id_da_funcao,
        descricao: e.etapa?.descricao || "Desconhecida",
      })),
      somaPorEtapa
    };

  } catch (error) {
    console.error("Erro ao buscar estatísticas da peça:", error);
    throw new Error("Erro ao buscar estatísticas da peça.");
  }
}

async function deletarPeca(id) {
  const id_da_op = parseInt(id);
  try {
    await prisma.producao.deleteMany({
      where: { id_da_op }
    });

    await prisma.pecasEtapas.deleteMany({
      where: { id_da_op }
    });

    await prisma.PecasOP.delete({
      where: { id_da_op }
    });

    return { message: "Peça e dados relacionados deletados com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar peça:", error);
    throw new Error("Erro ao deletar peça.");
  }
}

async function voltarPeca(req, res) {
  try {
    const { id_da_op, id_funcionario, id_da_funcao, quantidade } = req.body;
    if (!id_da_op || !id_da_funcao || !quantidade) {
      return "ID da OP, etapa e quantidade são obrigatórios.";
    }

    const producaoTotal = await prisma.producao.aggregate({
      _sum: { quantidade_pecas: true },
      where: {
        id_da_op: Number(id_da_op),
        id_da_funcao: Number(id_da_funcao),
        ...(id_funcionario && { id_funcionario }),
      },
    });

    const totalAtual = producaoTotal._sum.quantidade_pecas || 0;

    if (totalAtual <= 0) {
      throw new Error("Não há produção para estornar nessa peça e etapa.");
    }

    const quantidadeEstorno = Math.min(Math.abs(quantidade), totalAtual);

    if (id_funcionario) {
      const producaoEstorno = await prisma.producao.create({
        data: {
          quantidade_pecas: -quantidadeEstorno,
          id_da_op: Number(id_da_op),
          id_funcionario,
          id_da_funcao: Number(id_da_funcao),
          id_Estabelecimento: req.user.cnpj,
          data_inicio: new Date(),
          hora_registro: new Date().toLocaleTimeString("pt-BR"),
        },
      });

      await prisma.pecasOP.update({
        where: { id_da_op: Number(id_da_op) },
        data: { status: "em_progresso" },
      });

      return producaoEstorno;
    }

    const producoes = await prisma.producao.findMany({
      where: {
        id_da_op: Number(id_da_op),
        id_da_funcao: Number(id_da_funcao),
      },
      select: { id_funcionario: true },
      distinct: ["id_funcionario"],
    });

    if (producoes.length === 0) {
      throw new Error("Nenhum funcionário encontrado para essa peça e etapa.");
    }

    const quantidadePorFuncionario = Math.floor(quantidadeEstorno / producoes.length);
    const resto = quantidadeEstorno % producoes.length;

    const estornos = [];
    for (let i = 0; i < producoes.length; i++) {
      const qnt = quantidadePorFuncionario + (i < resto ? 1 : 0);
      const estorno = await prisma.producao.create({
        data: {
          quantidade_pecas: -qnt,
          id_da_op: Number(id_da_op),
          id_funcionario: producoes[i].id_funcionario,
          id_da_funcao: Number(id_da_funcao),
          id_Estabelecimento: req.user.cnpj,
          data_inicio: new Date(),
          hora_registro: new Date().toLocaleTimeString("pt-BR"),
        },
      });
      estornos.push(estorno);
    }

    const peca = await prisma.pecasOP.update({
      where: { id_da_op: Number(id_da_op) },
      data: { status: "em_progresso" },
    });

    return peca;

  } catch (err) {
    console.error("Erro ao voltar peça:", err.message);
    throw new Error("Erro ao voltar peça");
  }
}
async function getEtapas(req) {
  const cnpj = req.user.cnpj;
  //console.log("Buscando etapas para estabelecimento:", cnpj);
  const pecasEtapas = await prisma.pecasEtapas.findMany({
    where: {
      peca_op: {
        Estabelecimento: { cnpj }
      }
    },
    include: {
      etapa: true,
    }
  });

  // Pega tempos de referência ligados a esse estabelecimento
  const tempos = await prisma.tempoReferencia.findMany({
    where: { estabelecimentoCnpj: cnpj },
    include: { usuario: true, etapa: true }
  });

  // Calcula melhor funcionário por etapa
  const melhorPorEtapa = {};
  tempos.forEach(t => {
    if (!t.tempo_minutos || !t.quantidade_pecas) return;
    const ppm = t.quantidade_pecas / t.tempo_minutos;
    const etapaId = t.id_da_funcao;
    if (!melhorPorEtapa[etapaId] || ppm > melhorPorEtapa[etapaId].ppm) {
      melhorPorEtapa[etapaId] = {
        funcionario: t.usuario,
        ppm,
        quantidade_pecas: t.quantidade_pecas,
        tempo_minutos: t.tempo_minutos,
      };
    }
  });

  // Remove duplicados mantendo array
  const etapasUnicas = pecasEtapas.filter((etapa, index, self) =>
    index === self.findIndex(e => e.id_da_funcao === etapa.id_da_funcao)
  );

  // Adiciona melhor funcionário
  const resultado = etapasUnicas.map(e => ({
    ...e,
    melhorFuncionario: melhorPorEtapa[e.id_da_funcao] || null
  }));
  return resultado;
}

async function postEtapa(req, res) {
  const cnpj = req.user.cnpj;
  const { descricao, tempo_padrao } = req.body;

  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj },
  });

  if (!estabelecimento) {
    throw new Error("Estabelecimento não encontrado");
  }

  let etapa = await prisma.etapa.findFirst({
    where: {
      descricao,
      id_Estabelecimento: cnpj,
    },
  });

  if (!etapa) {
    etapa = await prisma.etapa.create({
      data: {
        descricao,
        tempo_padrao: tempo_padrao ?? null,
        id_Estabelecimento: cnpj,
      },
    });
  }

  return etapa;
}

async function postEtapaPeca(req, res) {
  const cnpj = req.user.cnpj;
  const { descricao, id_da_op, tempo_padrao } = req.body;

  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj },
  });

  if (!estabelecimento) {
    throw new Error("Estabelecimento não encontrado");
  }

  const op = await prisma.pecasOP.findFirst({
    where: {
      id_da_op,
      id_Estabelecimento: cnpj,
    },
  });

  if (!op) {
    throw new Error("OP não encontrada para este estabelecimento");
  }

  let etapa = await prisma.etapa.findFirst({
    where: {
      descricao,
      id_Estabelecimento: cnpj,
    },
  });

  if (!etapa) {
    etapa = await prisma.etapa.create({
      data: {
        descricao,
        tempo_padrao: parseFloat(tempo_padrao) ?? null,
        id_Estabelecimento: cnpj,
      },
    });
  }

  await prisma.pecasEtapas.upsert({
    where: {
      id_da_op_id_da_funcao: {
        id_da_op,
        id_da_funcao: etapa.id_da_funcao,
      },
    },
    update: {}, // não altera se já existir
    create: {
      id_da_op,
      id_da_funcao: etapa.id_da_funcao,
      quantidade_meta: op.quantidade_pecas ?? 0,
    },
  });

  return etapa;
}

async function getEtapasEstabelecimento(req) {
  const cnpj = req.user.cnpj;
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj },
  });

  if (!estabelecimento) {
    throw new Error("Estabelecimento não encontrado");
  }

  const etapas = await prisma.etapa.findMany({
    where: { id_Estabelecimento: cnpj },
    include: {
      grupoEtapa: true
    },
    orderBy: { descricao: "asc" },
  });

  return etapas;
}

async function criarOuVincularGrupoEtapas(req) {
  const cnpj = req.user.cnpj;
  const { nome, descricao, etapasSelecionadas } = req.body;
  const etapasIds = etapasSelecionadas
  console.log("Dados recebidos para criar/vincular grupo de etapas:", { nome, descricao, etapasSelecionadas });
  if (!nome) {
    throw new Error("Nome do grupo é obrigatório");
  }

  if (!Array.isArray(etapasIds) || etapasIds.length === 0) {
    throw new Error("Informe ao menos uma etapa para o grupo");
  }

  // 1️⃣ Verifica se o grupo já existe para o estabelecimento
  let grupo = await prisma.grupoEtapas.findFirst({
    where: {
      nome,
      estabelecimentoCnpj: cnpj,
    },
  });

  // 2️⃣ Se não existir, cria o grupo
  if (!grupo) {
    grupo = await prisma.grupoEtapas.create({
      data: {
        nome,
        descricao,
        estabelecimentoCnpj: cnpj,
      },
    });
  }

  const resultado = await prisma.etapa.updateMany({
    where: {
      id_da_funcao: { in: etapasIds },
      id_Estabelecimento: cnpj, // segurança extra
    },
    data: {
      grupoEtapaId: grupo.id,
    },
  });

  return {
    grupo,
    etapasVinculadas: resultado.count,
  };
}

async function getGruposEtapas(req) {
  const cnpj = req.user.cnpj;
  //console.log("Buscando grupos de etapas para estabelecimento:", cnpj);
  const grupos = await prisma.grupoEtapas.findMany({
    where: { estabelecimentoCnpj: cnpj },
    include: {
      etapas: true,
    },
  });
  return grupos;
}

async function getEficiencia(req, res) {
  const cnpj = req.user.cnpj;
  const hoje = new Date();
  const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0));
  const fimDoDia = new Date(hoje.setHours(23, 59, 59, 999));

  const producoes = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpj,
      data_inicio: {
        gte: inicioDoDia,
        lte: fimDoDia
      }
    },
    select: {
      quantidade_pecas: true,
      id_funcionario: true,
      hora_registro: true,
      producao_peca: {
        select: {
          tempo_padrao: true,
          descricao: true
        }
      }
    }
  });

  if (producoes.length === 0) {
    return { mensagem: "Nenhuma produção registrada hoje." };
  }

  const quantidadeProduzida = producoes.reduce((acc, p) => acc + (p.quantidade_pecas || 0), 0);

  const pessoasUnicas = new Set(producoes.map(p => p.id_funcionario));
  const quantidadePessoas = pessoasUnicas.size;

  const tempoPadraoPeca = producoes[0].producao_peca?.tempo_padrao || 0;
  const padroesFabrica = await prisma.Estabelecimento.findUnique({
    where: { cnpj },
    select: { tempo_de_producao: true }
  });
  const minutosDisponiveis = padroesFabrica?.tempo_de_producao
    ? padroesFabrica.tempo_de_producao * 60
    : 480;
  //const minutosDisponiveis = 540;

  const producao100 = (minutosDisponiveis * quantidadePessoas) / tempoPadraoPeca;
  const eficiencia = (quantidadeProduzida / producao100) * 100;
  console.log(`Cálculo de eficiência:
    Tempo Padrão da Peça: ${tempoPadraoPeca} min
    Minutos Disponíveis por Pessoa: ${minutosDisponiveis} min
    Quantidade de Pessoas: ${quantidadePessoas}
    Produção 100%: ${producao100.toFixed(2)} peças
    Quantidade Produzida: ${quantidadeProduzida} peças
    Eficiência: ${eficiencia.toFixed(2)}%
  `);
  const eficienciaAtualizada = await prisma.eficienciaTurma.upsert({
    where: { estabelecimentoCnpj: cnpj },
    update: {
      tempo_padrao: tempoPadraoPeca,
      minutos_disponiveis: minutosDisponiveis,
      quantidade_produzida: quantidadeProduzida,
      quantidade_pessoas: quantidadePessoas,
      eficiencia_percent: eficiencia,
      calculadoEm: new Date()
    },
    create: {
      estabelecimentoCnpj: cnpj,
      tempo_padrao: tempoPadraoPeca,
      minutos_disponiveis: minutosDisponiveis,
      quantidade_produzida: quantidadeProduzida,
      quantidade_pessoas: quantidadePessoas,
      eficiencia_percent: eficiencia
    }
  });
  console.log("Eficiência atualizada:", eficienciaAtualizada);

  return {
    data: {
      descricaoPeca: producoes[0].producao_peca?.descricao,
      tempoPadraoPeca,
      minutosDisponiveis,
      quantidadePessoas,
      quantidadeProduzida,
      producao100: producao100.toFixed(2),
      eficiencia: eficiencia.toFixed(2) + "%",
      calculadoEm: eficienciaAtualizada.calculadoEm
    }
  };
}
async function getProducaoTodasPecas(req, res) {
  const cnpjEstabelecimento = req.user.cnpj;

  // 0️⃣ Buscar etapa final do estabelecimento
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { cnpj: cnpjEstabelecimento },
    select: { peca_final: true }
  });

  const etapaFinal = estabelecimento?.peca_final;

  // 1️⃣ Buscar todas as produções do estabelecimento
  const producoes = await prisma.producao.findMany({
    where: {
      id_Estabelecimento: cnpjEstabelecimento
    },
    select: {
      quantidade_pecas: true,
      data_inicio: true,
      id_da_op: true,
      producao_peca: {
        select: { descricao: true }
      },
      producao_etapa: {
        select: { descricao: true }
      }
    }
  });

  if (!producoes || producoes.length === 0) {
    return res.json([]);
  }

  // 2️⃣ Buscar UMA meta por OP
  const metas = await prisma.pecasEtapas.findMany({
    select: {
      id_da_op: true,
      quantidade_meta: true
    },
    distinct: ["id_da_op"]
  });

  // 3️⃣ Criar mapa: OP → Meta
  const metasPorOP = {};
  metas.forEach(m => {
    metasPorOP[m.id_da_op] = m.quantidade_meta ?? 0;
  });

  // 4️⃣ Agrupar produções por peça
  const agrupado = {};

  for (const item of producoes) {
    const nomePeca = item.producao_peca?.descricao || "Peça sem descrição";
    const etapa = item.producao_etapa?.descricao || "Etapa não informada";
    const quantidade = item.quantidade_pecas ?? 0;

    if (!agrupado[nomePeca]) {
      agrupado[nomePeca] = {
        peca: nomePeca,
        total: 0,
        meta: metasPorOP[item.id_da_op] ?? 0,
        historico: []
      };
    }

    // ✅ SOMA APENAS SE FOR A ETAPA FINAL
    if (etapaFinal && etapa === etapaFinal) {
      agrupado[nomePeca].total += quantidade;
    }

    // Histórico continua completo
    agrupado[nomePeca].historico.push({
      data: item.data_inicio,
      quantidade,
      etapa
    });
  }

  return agrupado;
}


async function deletarEtapa(id) {
  const etapaId = Number(id);
  const etapaExiste = await prisma.etapa.findUnique({
    where: { id_da_funcao: Number(etapaId) }
  });

  if (!etapaExiste) {
    return res.status(404).json({ erro: "Etapa não encontrada." });
  }

  await prisma.pecasEtapas.deleteMany({
    where: { id_da_funcao: etapaId }
  });

  await prisma.producao.deleteMany({
    where: { id_da_funcao: etapaId }
  });

  await prisma.tempoReferencia.deleteMany({
    where: { id_da_funcao: etapaId }
  });

  await prisma.etapa.delete({
    where: { id_da_funcao: Number(id) }
  });

  return { mensagem: "Etapa deletada com sucesso." };
}


module.exports = {
  postPecaOP,
  duplicarOP,
  getPecasOP,
  postProducaoPeca,
  postProducaoPecaLote,
  getEtapasProducaoPorPeca,
  getEtapasProducaoPorEstabelecimento,
  getGruposEtapas,
  updatePecaStatus,
  getProducaoEquipe,
  getProducaoPorPeca,
  getEstatisticasPeca,
  deletarPeca,
  voltarPeca,
  getEtapas,
  getEtapasEstabelecimento,
  postEtapa,
  postEtapaPeca,
  getEficiencia,
  getProducaoTodasPecas,
  deletarEtapa,
  criarOuVincularGrupoEtapas
};
