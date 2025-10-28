const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tz = require('date-fns-tz');

function getData() {
  const agora = new Date();
  const offsetBrasil = -3; // UTC-3
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

async function postProducaoPeca(req, res) {
  const {
    id_da_op,
    id_funcionario,
    id_da_funcao,
    quantidade_pecas,
    hora_registro,
  } = req.body;
  const id_Estabelecimento = req.user.cnpj;
  const etapaRelacionada = await prisma.pecasEtapas.findUnique({
    where: {
      id_da_op_id_da_funcao: {
        id_da_op,
        id_da_funcao
      }
    }
  });

  if (!etapaRelacionada) {
    return "Etapa não encontrada para essa OP.";
  }

  const totalEtapaProduzido = await prisma.producao.aggregate({
    _sum: { quantidade_pecas: true },
    where: { id_da_op, id_da_funcao }
  });

  const jaProduzido = totalEtapaProduzido._sum.quantidade_pecas || 0;
  const novaQuantidade = jaProduzido + quantidade_pecas;

  if (novaQuantidade > etapaRelacionada.quantidade_meta) {
    throw new Error(JSON.stringify({
      error: "A produção dessa etapa excede a meta.",
      jaProduzido,
      meta: etapaRelacionada.quantidade_meta
    }));
  }

  const producao = await prisma.producao.create({
    data: {
      id_da_op,
      id_funcionario,
      id_Estabelecimento,
      id_da_funcao,
      hora_registro,
      quantidade_pecas,
      data_inicio: getData(),
    }
  });

  if (novaQuantidade === etapaRelacionada.quantidade_meta) {
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
}

async function getPecasOP(req) {
  const cnpj = req.cnpj;
  const pecasOp = await prisma.pecasOP.findMany({
    where: { id_Estabelecimento: cnpj },
    include: {
      Estabelecimento: true,
      producao_peca: true,
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
}async function getProducaoEquipe(req) {
  try {
    const cnpjEstabelecimento = req.user.cnpj;
    const fusoSP = "America/Sao_Paulo";

    const agora = new Date();
    const dtf = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoSP,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const partes = dtf.formatToParts(agora);
    const dia = partes.find(p => p.type === "day").value;
    const mes = partes.find(p => p.type === "month").value;
    const ano = partes.find(p => p.type === "year").value;

    const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
    const fimDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59));
    const inicioMesUTC = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const fimMesUTC = new Date(Date.UTC(ano, mes, 0, 23, 59, 59));

    // -------------------------
    // Produções do DIA
    // -------------------------
    const producoesDia = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        hora_registro: true,
        producao_funcionario: { select: { nome: true } },
        producao_etapa: { select: { descricao: true } },
        producao_peca: { select: { tempo_padrao: true } },
      },
    });

    // -------------------------
    // Agrupamento do DIA
    // -------------------------
    const agrupadoDia = {};

    for (const p of producoesDia) {
      const funcionario = p.id_funcionario;
      const nome = p.producao_funcionario?.nome || funcionario;
      const etapa = p.producao_etapa?.descricao || "Sem Etapa";
      const quantidade = p.quantidade_pecas || 0;
      const tempoPadrao = p.producao_peca?.tempo_padrao ?? 0;

      if (!agrupadoDia[funcionario]) {
        agrupadoDia[funcionario] = {
          nome,
          etapas: {},
          totalPonderado: 0,
          totalQuantidade: 0,
        };
      }

      if (!agrupadoDia[funcionario].etapas[etapa]) {
        agrupadoDia[funcionario].etapas[etapa] = [];
      }

      agrupadoDia[funcionario].etapas[etapa].push({
        hora: p.hora_registro,
        quantidade,
        tempo_padrao: tempoPadrao,
        producao_hora: quantidade, // já que cada registro = 1 hora
      });

      agrupadoDia[funcionario].totalPonderado += quantidade * tempoPadrao;
      agrupadoDia[funcionario].totalQuantidade += quantidade;
    }

    // -------------------------
    // Cálculo produtividade e média da turma
    // -------------------------
    const resultadoDia = [];
    let totalPonderadoTurma = 0;
    let totalQuantidadeTurma = 0;

    for (const [id, dados] of Object.entries(agrupadoDia)) {
      const media_ponderada = dados.totalQuantidade > 0
        ? dados.totalPonderado / dados.totalQuantidade
        : 0;

      totalPonderadoTurma += dados.totalPonderado;
      totalQuantidadeTurma += dados.totalQuantidade;

      resultadoDia.push({
        funcionario: id,
        nome: dados.nome,
        total_pecas: dados.totalQuantidade,
        total_ponderado: dados.totalPonderado,
        media_ponderada_funcionario: media_ponderada,
        etapas: dados.etapas,
      });
    }

    const mediaPonderadaTurma =
      totalQuantidadeTurma > 0
        ? totalPonderadoTurma / totalQuantidadeTurma
        : 0;

    // Percentual relativo da produção
    for (const f of resultadoDia) {
      f.producao_relativa_percentual = totalPonderadoTurma > 0
        ? ((f.total_ponderado / totalPonderadoTurma) * 100).toFixed(2) + "%"
        : "0.00%";
    }

    // -------------------------
    // Produções do MÊS
    // -------------------------
    const producoesMes = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioMesUTC, lte: fimMesUTC },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        data_inicio: true,
        producao_funcionario: { select: { nome: true } },
        producao_peca: { select: { tempo_padrao: true } },
      },
    });

    const agrupadoMes = {};

    for (const p of producoesMes) {
      const funcionario = p.id_funcionario;
      const nome = p.producao_funcionario?.nome || funcionario;
      const quantidade = p.quantidade_pecas || 0;
      const tempoPadrao = p.producao_peca?.tempo_padrao ?? 0;

      if (!agrupadoMes[funcionario]) {
        agrupadoMes[funcionario] = {
          nome,
          dias: {},
          totalPonderadoMes: 0,
          totalQuantidadeMes: 0,
        };
      }

      const dataObj = new Date(p.data_inicio);
      const diaStr = String(dataObj.getDate()).padStart(2, "0");
      const mesStr = String(dataObj.getMonth() + 1).padStart(2, "0");
      const keyDia = `${diaStr}/${mesStr}`;

      if (!agrupadoMes[funcionario].dias[keyDia]) {
        agrupadoMes[funcionario].dias[keyDia] = {
          totalPonderado: 0,
          totalQuantidade: 0,
          media_ponderada: 0,
        };
      }

      agrupadoMes[funcionario].dias[keyDia].totalPonderado += quantidade * tempoPadrao;
      agrupadoMes[funcionario].dias[keyDia].totalQuantidade += quantidade;
      agrupadoMes[funcionario].dias[keyDia].media_ponderada = agrupadoMes[funcionario].dias[keyDia].totalQuantidade > 0
        ? agrupadoMes[funcionario].dias[keyDia].totalPonderado / agrupadoMes[funcionario].dias[keyDia].totalQuantidade
        : 0;

      agrupadoMes[funcionario].totalPonderadoMes += quantidade * tempoPadrao;
      agrupadoMes[funcionario].totalQuantidadeMes += quantidade;
    }

    // Média mensal
    for (const f in agrupadoMes) {
      const info = agrupadoMes[f];
      info.media_ponderada_mes = info.totalQuantidadeMes > 0
        ? info.totalPonderadoMes / info.totalQuantidadeMes
        : 0;
    }

    return {
      producao: {
        producaoDia: {
          mediaPonderadaTurma,
          totalPonderadoTurma,
          totalQuantidadeTurma,
          funcionarios: resultadoDia,
        },
        producaoMes: agrupadoMes,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar produção da equipe:", error);
    return { error: error.message };
  }
}

async function getProducaoEquipeDia(req) {
  try {
    const cnpjEstabelecimento = req.user.cnpj;
    const fusoSP = "America/Sao_Paulo";

    const agora = new Date();
    const dtf = new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoSP,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const partes = dtf.formatToParts(agora);
    const dia = partes.find(p => p.type === "day").value;
    const mes = partes.find(p => p.type === "month").value;
    const ano = partes.find(p => p.type === "year").value;

    // Limite do dia em UTC
    const inicioDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0));
    const fimDiaUTC = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59));

    // Buscar produção do dia com JOIN no funcionário -> equipe
    const producoesDia = await prisma.producao.findMany({
      where: {
        id_Estabelecimento: cnpjEstabelecimento,
        data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC },
      },
      select: {
        id_funcionario: true,
        quantidade_pecas: true,
        hora_registro: true,
        producao_funcionario: {
          select: {
            nome: true,
            equipes: {
              select: {
                equipe: { select: { id: true, nome: true } }
              }
            }
          }
        },
        producao_etapa: { select: { descricao: true } },
      },
    });

    const agrupadoEquipe = {};

    for (const p of producoesDia) {
      const funcionario = p.id_funcionario;
      const nomeFuncionario = p.producao_funcionario?.nome || funcionario;
      const etapa = p.producao_etapa?.descricao || "Sem Etapa";
      const hora = p.hora_registro || "00:00";

      const equipesDoUsuario = p.producao_funcionario?.equipes?.map(e => e.equipe) || [];

      if (equipesDoUsuario.length === 0) {
        equipesDoUsuario.push({ id: 0, nome: "Sem Equipe" });
      }

      for (const equipe of equipesDoUsuario) {
        if (!agrupadoEquipe[equipe.nome]) {
          agrupadoEquipe[equipe.nome] = {};
        }

        if (!agrupadoEquipe[equipe.nome][funcionario]) {
          agrupadoEquipe[equipe.nome][funcionario] = { nome: nomeFuncionario, etapas: {} };
        }

        if (!agrupadoEquipe[equipe.nome][funcionario].etapas[etapa]) {
          agrupadoEquipe[equipe.nome][funcionario].etapas[etapa] = [];
        }

        agrupadoEquipe[equipe.nome][funcionario].etapas[etapa].push({
          hora,
          quantidade: p.quantidade_pecas || 0,
          data: `${ano}-${mes}-${dia}`
        });
      }
    }

    const resultado = Object.entries(agrupadoEquipe).map(([equipe, funcionarios]) => ({
      equipe,
      funcionarios: Object.entries(funcionarios).map(([email, dados]) => ({
        funcionario: email,
        nome: dados.nome,
        etapas: dados.etapas
      }))
    }));
    return { producaoDiaEquipe: resultado };

  } catch (error) {
    console.error("Erro ao buscar produção da equipe:", error);
    return { error: error.message };
  }
}


function getDataInicioBrasil() {
  const agora = new Date();
  const fusoHorarioBrasil = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(agora).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const { year, month, day, hour, minute, second } = fusoHorarioBrasil;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}:00`;
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

  // Pega todas as etapas com suas relações
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

async function postEtapa(req) {
  const cnpj = req.user.cnpj;
  const { descricao, id_da_op } = req.body;

  // busca OP dentro do estabelecimento do usuário
  const op = await prisma.pecasOP.findFirst({
    where: {
      id_da_op,
      id_Estabelecimento: cnpj,
    },
  });

  if (!op) {
    throw new Error("OP não encontrada para este estabelecimento");
  }

  // busca ou cria a etapa
  let etapa = await prisma.etapa.findUnique({
    where: { descricao },
  });

  if (!etapa) {
    etapa = await prisma.etapa.create({
      data: { descricao },
    });
  }

  // verifica se já existe o vínculo OP + Etapa
  let pecaEtapa = await prisma.pecasEtapas.findUnique({
    where: {
      id_da_op_id_da_funcao: {
        id_da_op,
        id_da_funcao: etapa.id_da_funcao,
      },
    },
  });

  if (!pecaEtapa) {
    pecaEtapa = await prisma.pecasEtapas.create({
      data: {
        id_da_op,
        id_da_funcao: etapa.id_da_funcao,
        quantidade_meta: op.quantidade_pecas ?? 0,
      },
    });
  }

  return pecaEtapa;
}
async function getEficiencia(req, res) {
    const cnpj = req.user.cnpj;
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0));
    const fimDoDia = new Date(hoje.setHours(23, 59, 59, 999));

    // 🔹 1️⃣ Buscar produções do dia
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
      return {mensagem:"Nenhuma produção registrada hoje."} ;
    }

    const quantidadeProduzida = producoes.reduce((acc, p) => acc + (p.quantidade_pecas || 0), 0);

    const pessoasUnicas = new Set(producoes.map(p => p.id_funcionario));
    const quantidadePessoas = pessoasUnicas.size;

    const tempoPadraoPeca = producoes[0].producao_peca?.tempo_padrao || 0;

    // Exemplo: jornada de 8h = 480 min
    const minutosDisponiveis = 552;

    // 🔹 4️⃣ Calcular produção padrão (produção100)
    const producao100 = (minutosDisponiveis * quantidadePessoas) / tempoPadraoPeca;

    // 🔹 5️⃣ Calcular eficiência
    const eficiencia = (quantidadeProduzida / producao100) * 100;
    console.log(cnpj)
    // 🔹 6️⃣ Salvar ou atualizar na tabela EficienciaTurma
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
module.exports = {
  postPecaOP,
  getPecasOP,
  postProducaoPeca,
  getEtapasProducaoPorPeca,
  getEtapasProducaoPorEstabelecimento,
  updatePecaStatus,
  getProducaoEquipe,
  getEstatisticasPeca,
  deletarPeca,
  voltarPeca,
  getProducaoEquipeDia,
  getEtapas,
  postEtapa,
  getEficiencia
};
