const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FUSO_SP = 'America/Sao_Paulo';

function horaParaMinutos(hora) {
  if (!hora || typeof hora !== 'string') return 0;
  var cleaned = String(hora).trim().replace(/[^\d:]/g, '');
  var parts = cleaned.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutosParaHora(minutos) {
  var h = Math.floor(minutos / 60) % 24;
  var m = minutos % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function minutosDisponiveisDia(date) {
  var d = date instanceof Date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  var diaSemana = d.getDay();
  if (diaSemana >= 1 && diaSemana <= 4) return 540;
  if (diaSemana === 5) return 480;
  return 0;
}

function calcularEficiencia(obj) {
  var producaoPonderada = obj.producaoPonderada || 0;
  var funcionarios = obj.funcionarios || 1;
  var tempoTrabalhado = obj.tempoTrabalhado || 0;
  var divisor = (funcionarios || 0) * (tempoTrabalhado || 0);
  if (!divisor) return 0;
  return Math.round((producaoPonderada * 100) / divisor);
}

function calcularTempoUtilizadoPorIntervalo(entradas, tempoMaximoDia, minutosAgora) {
  if (!Array.isArray(entradas) || !entradas.length) return 0;
  var inicioMin = Infinity;
  var fimMin = -Infinity;
  for (var i = 0; i < entradas.length; i++) {
    var entrada = entradas[i];
    if (!entrada || !entrada.hora) continue;
    var inicioSlot = horaParaMinutos(entrada.hora);
    var fimSlot = inicioSlot + Number(entrada.tempoProduzido || 60);
    if (inicioSlot < inicioMin) inicioMin = inicioSlot;
    if (fimSlot > fimMin) fimMin = fimSlot;
  }
  if (!isFinite(inicioMin) || !isFinite(fimMin)) return 0;
  if (minutosAgora != null) { fimMin = Math.min(fimMin, minutosAgora); }
  var bruto = Math.max(0, fimMin - inicioMin);
  return tempoMaximoDia != null ? Math.min(bruto, tempoMaximoDia) : bruto;
}

function valorRecenciaRef(ref) {
  if (!ref) return -Infinity;
  var candidatosData = [ref.criadoEm, ref.data_medicao, ref.criado_em, ref.data_criacao, ref.createdAt, ref.created_at, ref.data_cadastro];
  for (var i = 0; i < candidatosData.length; i++) {
    var c = candidatosData[i];
    if (!c) continue;
    var t = new Date(c).getTime();
    if (!isNaN(t)) return t;
  }
  var idNum = Number(ref.id);
  return isNaN(idNum) ? -Infinity : idNum;
}

function escolherRefMaisRecente(refs) {
  if (!Array.isArray(refs) || !refs.length) return null;
  return refs.reduce(function(maisRecente, atual) {
    if (!maisRecente) return atual;
    return valorRecenciaRef(atual) > valorRecenciaRef(maisRecente) ? atual : maisRecente;
  }, null);
}

function extrairTempoRef(ref) {
  if (!ref) return 0;
  return Number(ref.tempo_minutos || ref.tempo_por_peca || 0);
}

function resolverSAM(funcionarioEmail, idDaFuncao, idDaOp, tempoPadraoEtapa, etapasReferenciaMap) {
  var refs = etapasReferenciaMap.get(idDaFuncao) || [];
  if (idDaOp != null) {
    var refsOp = refs.filter(function(r) { return r.id_funcionario === funcionarioEmail && r.opId === idDaOp; });
    var escolhido = escolherRefMaisRecente(refsOp);
    if (escolhido) {
      var t = extrairTempoRef(escolhido);
      if (t > 0) return { tempo: t, origem: 'peca' };
    }
  }
  var refsFunc = refs.filter(function(r) { return r.id_funcionario === funcionarioEmail; });
  var escolhido2 = escolherRefMaisRecente(refsFunc);
  if (escolhido2) {
    var t2 = extrairTempoRef(escolhido2);
    if (t2 > 0) return { tempo: t2, origem: 'ultimo_registrado' };
  }
  return { tempo: tempoPadraoEtapa || 0, origem: null };
}

// ═══════════════════════════════════════════════════════════════
// ROTAS EXISTENTES
// ═══════════════════════════════════════════════════════════════

router.get("/usuarios/telefone/:telefone", async function(req, res) {
  var telefone = req.params.telefone;
  var usuario = await prisma.usuarios.findFirst({ where: { telefone: telefone } });
  if (!usuario) { return res.status(404).json({ error: "Nao encontrado" }); }
  res.json(usuario);
});

router.post("/auth/login-cpf", async function(req, res) {
  var cpf = req.body.cpf;
  var telefone = req.body.telefone;
  var usuario = await prisma.usuarios.findFirst({ where: { cpf: cpf } });
  if (!usuario) { return res.status(404).json({ error: "CPF nao encontrado" }); }
  await prisma.usuarios.update({ where: { email: usuario.email }, data: { telefone: telefone } });
  return res.json(usuario);
});

// ═══════════════════════════════════════════════════════════════
// ROTA: GET /producao/telefone/:telefone/hoje
// ═══════════════════════════════════════════════════════════════
// Retorna producao da equipe do dia atual, SOMENTE ate o horario
// da requisicao. Formulas identicas a producaoCompartilhada.js.
// ═══════════════════════════════════════════════════════════════

router.get("/producao/telefone/:telefone/hoje", async function(req, res) {
  try {
    var telefone = req.params.telefone;
    //console.log("Requisicao producao hoje para telefone:", telefone);
    // 1. USUARIO
    var usuario = await prisma.usuarios.findFirst({
      where: { telefone: telefone },
      select: { email: true, nome: true, estabelecimentoCnpj: true }
    });
    if (!usuario) { return res.status(404).json({ erro: "Usuario nao encontrado em nosso banco de dados" }); }
    var cnpj = usuario.estabelecimentoCnpj;

    // 2. ESTABELECIMENTO (CNPJ como STRING, nunca objeto)
    var estabelecimento = await prisma.estabelecimento.findUnique({
      where: { cnpj: cnpj },
      select: { tempo_de_producao: true, peca_final: true },
    });
    if (!estabelecimento) { return res.status(404).json({ erro: "Estabelecimento nao encontrado" }); }

    // 3. DATA/HORA ATUAL NO BRASIL (NAO usar toISOString() - UTC!)
    var now = new Date();
    var nowBrasilStr = now.toLocaleString('en-US', { timeZone: FUSO_SP });
    var nowBrasil = new Date(nowBrasilStr);
    var horaAtual = nowBrasil.getHours();
    var minutoAtual = nowBrasil.getMinutes();
    var minutosAgora = horaAtual * 60 + minutoAtual;
    var dataHoje = nowBrasil.getFullYear() + '-' + String(nowBrasil.getMonth() + 1).padStart(2, '0') + '-' + String(nowBrasil.getDate()).padStart(2, '0');
    var horaAtualStr = String(horaAtual).padStart(2, '0') + ':' + String(minutoAtual).padStart(2, '0');

    // 4. MINUTOS DISPONIVEIS (mesma regra de producaoCompartilhada.js)
    var minutosDisponiveisTotal = minutosDisponiveisDia(nowBrasil);

    if (minutosDisponiveisTotal === 0) {
      return res.json({
        status: "sucesso", mensagem: "Producao da equipe - Fim de semana",
        periodo: { data: dataHoje, inicio: "00:00", fim: "00:00" },
        resumo: { peca: null, total_pecas_produzidas: 0, eficiencia_ficha: 0, eficiencia_referencia: 0, quantidade_de_colaboradores: 0, tempo_disponivel_minutos: 0 },
        feedback: "Hoje e fim de semana. Nenhuma producao registrada.",
        insight: "A producao e calculada apenas em dias uteis.",
        dados_completos: {},
        mensagem_whatsapp: "PRODUCAO DA EQUIPE - ATE O MOMENTO\n\nData: " + dataHoje + "\n\nFim de semana - sem producao registrada."
      });
    }

    // 5. BUSCAR DADOS DO BANCO
    var partes = dataHoje.split('-').map(Number);
    var anoNum = partes[0], mesNum = partes[1], diaNum = partes[2];
    var inicioDiaUTC = new Date(Date.UTC(anoNum, mesNum - 1, diaNum, 0, 0, 0));
    var fimDiaUTC = new Date(Date.UTC(anoNum, mesNum - 1, diaNum, 23, 59, 59));

    var results = await Promise.all([
      prisma.producao.findMany({
        where: { id_Estabelecimento: cnpj, data_inicio: { gte: inicioDiaUTC, lte: fimDiaUTC } },
        select: {
          id_funcionario: true, quantidade_pecas: true, hora_registro: true, tempo_produzido: true,
          id_da_op: true, id_da_funcao: true,
          producao_funcionario: { select: { nome: true, foto: true } },
          producao_etapa: { select: { id_da_funcao: true, descricao: true, tempo_padrao: true } },
          producao_peca: { select: { id_da_op: true, descricao: true, tempo_padrao: true } },
        },
        orderBy: { hora_registro: 'asc' },
      }),
      prisma.tempoReferencia.findMany({
        where: { estabelecimentoCnpj: cnpj },
        select: { id: true, id_funcionario: true, id_da_funcao: true, tempo_minutos: true, tempo_por_peca: true, criadoEm: true, data_medicao: true, opId: true },
      }),
    ]);
    var producoesDia = results[0];
    var todosTempoRef = results[1];

    var etapasReferenciaMap = new Map();
    for (var ri = 0; ri < todosTempoRef.length; ri++) {
      var ref = todosTempoRef[ri];
      var idFuncao = ref.id_da_funcao;
      if (!etapasReferenciaMap.has(idFuncao)) { etapasReferenciaMap.set(idFuncao, []); }
      etapasReferenciaMap.get(idFuncao).push(ref);
    }

    // 6. FILTRAR: SOMENTE ATE O HORARIO ATUAL
    var producoesFiltradas = producoesDia.filter(function(p) {
      if (!p.hora_registro) return false;
      return horaParaMinutos(p.hora_registro) <= minutosAgora;
    });

    if (producoesFiltradas.length === 0) {
      return res.json({
        status: "sucesso", mensagem: "Producao da equipe ate o momento",
        periodo: { data: dataHoje, inicio: "08:00", fim: horaAtualStr },
        resumo: { peca: null, total_pecas_produzidas: 0, eficiencia_ficha: 0, eficiencia_referencia: 0, quantidade_de_colaboradores: 0, tempo_disponivel_minutos: 0 },
        feedback: "Nenhuma producao registrada ate o momento.",
        insight: "Verifique se a producao foi iniciada.",
        dados_completos: {},
        mensagem_whatsapp: "PRODUCAO DA EQUIPE - ATE O MOMENTO\n\nData: " + dataHoje + "\nPeriodo: 08:00 as " + horaAtualStr + "\n\nProducao: 0 pecas"
      });
    }

    // 7. PECA
    var primeiraPeca = producoesFiltradas[0].producao_peca;
    var descricaoPeca = (primeiraPeca && primeiraPeca.descricao) || "Peca nao informada";
    var tempoPadraoTotalPeca = (primeiraPeca && primeiraPeca.tempo_padrao) || 0;

    // 8. AGRUPAR POR FUNCIONARIO
    var agrupado = {};
    for (var pi = 0; pi < producoesFiltradas.length; pi++) {
      var p = producoesFiltradas[pi];
      var funcId = p.id_funcionario;
      var nome = (p.producao_funcionario && p.producao_funcionario.nome) || funcId;
      var foto = (p.producao_funcionario && p.producao_funcionario.foto) || null;
      var quantidade = p.quantidade_pecas || 0;
      var tempoProduzido = p.tempo_produzido || 60;
      var hora = p.hora_registro;
      var etapaDesc = (p.producao_etapa && p.producao_etapa.descricao) || "Sem Etapa";
      var etapaId = p.id_da_funcao;
      var idOp = p.id_da_op;
      var tempoPadraoEtapa = (p.producao_etapa && p.producao_etapa.tempo_padrao) || 0;
      var samRefResultado = resolverSAM(funcId, etapaId, idOp, tempoPadraoEtapa, etapasReferenciaMap);
      var samReferencia = samRefResultado.tempo;
      var samFicha = tempoPadraoEtapa;

      if (!agrupado[funcId]) {
        agrupado[funcId] = { nome: nome, foto: foto, tempoFicha: 0, tempoReferencia: 0, quantidade: 0, tempoRegistrado: 0, entradasParaTempo: [], etapas: {} };
      }
      agrupado[funcId].quantidade += quantidade;
      agrupado[funcId].tempoRegistrado += tempoProduzido;
      agrupado[funcId].tempoFicha += quantidade * samFicha;
      agrupado[funcId].tempoReferencia += quantidade * samReferencia;
      agrupado[funcId].entradasParaTempo.push({ hora: hora, tempoProduzido: tempoProduzido });

      if (!agrupado[funcId].etapas[etapaDesc]) {
        agrupado[funcId].etapas[etapaDesc] = { quantidade: 0, tempoFicha: 0, tempoReferencia: 0, samFicha: samFicha, samReferencia: samReferencia, origemRef: samRefResultado.origem };
      }
      agrupado[funcId].etapas[etapaDesc].quantidade += quantidade;
      agrupado[funcId].etapas[etapaDesc].tempoFicha += quantidade * samFicha;
      agrupado[funcId].etapas[etapaDesc].tempoReferencia += quantidade * samReferencia;
    }

    // 9. FUNCIONARIOS COM EFICIENCIAS
    var funcionarios = [];
    var agrupadoKeys = Object.keys(agrupado);
    for (var fi = 0; fi < agrupadoKeys.length; fi++) {
      var id = agrupadoKeys[fi];
      var dados = agrupado[id];
      var efFicha = calcularEficiencia({ producaoPonderada: dados.tempoFicha, funcionarios: 1, tempoTrabalhado: dados.tempoRegistrado });
      var efRef = dados.tempoReferencia > 0 ? calcularEficiencia({ producaoPonderada: dados.tempoReferencia, funcionarios: 1, tempoTrabalhado: dados.tempoRegistrado }) : null;
      var etapasDet = [];
      var etapaKeys = Object.keys(dados.etapas);
      for (var ei = 0; ei < etapaKeys.length; ei++) {
        var desc = etapaKeys[ei];
        var e = dados.etapas[desc];
        etapasDet.push({ descricao: desc, quantidade: e.quantidade, tempo_padrao_etapa: e.samFicha, tempo_padrao_total: Math.round(e.tempoFicha * 100) / 100, tempo_referencia_etapa: e.samReferencia, tempo_referencia_total: Math.round(e.tempoReferencia * 100) / 100, origem_referencia: e.origemRef });
      }
      funcionarios.push({ funcionario: id, nome: dados.nome, foto: dados.foto, total_pecas: dados.quantidade, tempo_padrao_produzido: Math.round(dados.tempoFicha * 100) / 100, tempo_referencia_produzido: Math.round(dados.tempoReferencia * 100) / 100, eficiencia_ficha: efFicha + "%", eficiencia_referencia: efRef !== null ? efRef + "%" : null, tempo_real_total: dados.tempoRegistrado, etapas: etapasDet });
    }

    // 10. EFICIENCIA DA TURMA
    var quantidadePessoas = funcionarios.length;
    var todasEntradas = [];
    var agrupadoEntries = Object.values(agrupado);
    for (var ai = 0; ai < agrupadoEntries.length; ai++) {
      var entradas = agrupadoEntries[ai].entradasParaTempo;
      for (var ej = 0; ej < entradas.length; ej++) { todasEntradas.push(entradas[ej]); }
    }
    var tempoTrabalhadoTurmaRaw = calcularTempoUtilizadoPorIntervalo(todasEntradas, minutosDisponiveisTotal, minutosAgora);

    var capacidadeFichaTotal = 0;
    var capacidadeReferenciaTotal = 0;
    for (var ai2 = 0; ai2 < agrupadoEntries.length; ai2++) {
      capacidadeFichaTotal += agrupadoEntries[ai2].tempoFicha;
      capacidadeReferenciaTotal += agrupadoEntries[ai2].tempoReferencia;
    }
    capacidadeFichaTotal = Math.round(capacidadeFichaTotal * 100) / 100;
    capacidadeReferenciaTotal = Math.round(capacidadeReferenciaTotal * 100) / 100;
    var tempoTrabalhadoTurma = Math.round(tempoTrabalhadoTurmaRaw * 100) / 100;

    var eficienciaFichaTurma = calcularEficiencia({ producaoPonderada: capacidadeFichaTotal, funcionarios: 1, tempoTrabalhado: tempoTrabalhadoTurma });
    var eficienciaReferenciaTurma = capacidadeReferenciaTotal > 0 ? calcularEficiencia({ producaoPonderada: capacidadeReferenciaTotal, funcionarios: 1, tempoTrabalhado: tempoTrabalhadoTurma }) : 0;
    var totalPecas = 0;
    for (var ti = 0; ti < funcionarios.length; ti++) { totalPecas += funcionarios[ti].total_pecas; }

    // 11. PRODUCAO POR HORA
    var producaoPorHoraMap = {};
    for (var hi = 0; hi < producoesFiltradas.length; hi++) {
      var hp = producoesFiltradas[hi];
      var hHora = hp.hora_registro || "N/A";
      var hEtapa = (hp.producao_etapa && hp.producao_etapa.descricao) || "Sem Etapa";
      var hQtd = hp.quantidade_pecas || 0;
      if (!producaoPorHoraMap[hHora]) { producaoPorHoraMap[hHora] = { total: 0, etapas: {} }; }
      producaoPorHoraMap[hHora].total += hQtd;
      if (!producaoPorHoraMap[hHora].etapas[hEtapa]) { producaoPorHoraMap[hHora].etapas[hEtapa] = 0; }
      producaoPorHoraMap[hHora].etapas[hEtapa] += hQtd;
    }
    var producaoPorHora = Object.entries(producaoPorHoraMap)
      .sort(function(a, b) { return horaParaMinutos(a[0]) - horaParaMinutos(b[0]); })
      .map(function(entry) {
        var h = entry[0];
        var d = entry[1];
        var etaps = [];
        var ek = Object.keys(d.etapas);
        for (var x = 0; x < ek.length; x++) { etaps.push({ etapa: ek[x], total: d.etapas[ek[x]] }); }
        return { hora: h, total: d.total, etapas: etaps };
      });

    // 12. MENSAGEM WHATSAPP
    var inicioExpediente = "08:00";
    var efFichaFmt = eficienciaFichaTurma.toFixed(1).replace('.', ',');
    var efRefFmt = eficienciaReferenciaTurma.toFixed(1).replace('.', ',');
    var msgParts = [];
    msgParts.push("PRODUCAO DA EQUIPE - ATE O MOMENTO");
    msgParts.push("");
    msgParts.push("Peca: " + descricaoPeca);
    msgParts.push("");
    msgParts.push("Periodo: " + inicioExpediente + " as " + horaAtualStr);
    msgParts.push("");
    msgParts.push("Producao: " + totalPecas + " pecas");
    msgParts.push("");
    msgParts.push("Colaboradores: " + quantidadePessoas);
    msgParts.push("");
    msgParts.push("Eficiencia da ficha: " + efFichaFmt + "%");
    msgParts.push("");
    msgParts.push("Eficiencia da referencia: " + efRefFmt + "%");
    msgParts.push("");
    msgParts.push("Tempo disponivel: " + tempoTrabalhadoTurma + " minutos");
    msgParts.push("");
    msgParts.push("A equipe produziu " + totalPecas + " pecas ate o momento, alcancando " + efFichaFmt + "% de eficiencia pela ficha e " + efRefFmt + "% pela referencia.");
    var mensagemWhatsApp = msgParts.join("\n");

    // 13. RESPOSTA
    return res.json({
      status: "sucesso", mensagem: "Producao da equipe ate o momento",
      periodo: { data: dataHoje, inicio: inicioExpediente, fim: horaAtualStr },
      resumo: {
        peca: descricaoPeca, total_pecas_produzidas: totalPecas,
        eficiencia_ficha: eficienciaFichaTurma, eficiencia_referencia: eficienciaReferenciaTurma,
        quantidade_de_colaboradores: quantidadePessoas, tempo_disponivel_minutos: tempoTrabalhadoTurma,
      },
      feedback: "A equipe produziu " + totalPecas + " pecas ate o momento, com eficiencia de ficha de " + efFichaFmt + "% e eficiencia de referencia de " + efRefFmt + "%.",
      insight: "Dica: Analise as etapas com menor rendimento para aumentar a producao.",
      dados_completos: { funcionarios: funcionarios, producaoPorHora: producaoPorHora, tempoPadraoTotalPeca: tempoPadraoTotalPeca, minutosDisponiveisTotal: minutosDisponiveisTotal, minutosAgora: minutosAgora },
      mensagem_whatsapp: mensagemWhatsApp,
    });

  } catch (error) {
    console.error("Erro producao hoje:", error);
    return res.status(500).json({ erro: "Erro ao buscar producao", detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;
