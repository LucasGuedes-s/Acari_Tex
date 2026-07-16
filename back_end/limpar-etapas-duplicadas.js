/**
 * Script de limpeza ÚNICA para mesclar etapas duplicadas já existentes no banco.
 *
 * Para cada grupo de etapas duplicadas (mesma descrição normalizada + mesmo
 * tempo_padrao, dentro do mesmo estabelecimento), escolhe uma etapa canônica
 * e transfere para ela TUDO que está referenciando as duplicatas:
 *   - PecasEtapas       (vínculo peça <-> etapa)
 *   - Producao          (registros de produção já lançados)
 *   - TempoReferencia   (tempo de referência por funcionário)
 *   - MetaDiaFuncionario.etapaPadraoId
 *   - AlocacaoProducaoDia.etapaId
 * Só então apaga a etapa duplicada.
 *
 * IMPORTANTE:
 * - Rode com backup do banco antes.
 * - Rode primeiro em DRY_RUN=true (não altera nada, só mostra o plano).
 * - Verifique os nomes dos accessors do seu Prisma Client (prisma.producao,
 *   prisma.pecasEtapas, prisma.tempoReferencia, prisma.metaDiaFuncionario,
 *   prisma.alocacaoProducaoDia, prisma.etapa). O client normalmente usa
 *   camelCase com a primeira letra minúscula a partir do nome do model no
 *   schema.prisma — ajuste abaixo se o seu client gerar nomes diferentes
 *   (no código de vocês, por exemplo, "Usuarios" e "TempoReferencia"
 *   aparecem com a primeira letra maiúscula, então confira caso a caso).
 *
 * Uso (todos os estabelecimentos de uma vez):
 *   DRY_RUN=true node limpar-etapas-duplicadas.js
 *   DRY_RUN=false node limpar-etapas-duplicadas.js
 *
 * Uso (uma fábrica/estabelecimento por vez — recomendado):
 *   ESTABELECIMENTO_CNPJ=12345678000199 DRY_RUN=true node limpar-etapas-duplicadas.js
 *   ESTABELECIMENTO_CNPJ=12345678000199 DRY_RUN=false node limpar-etapas-duplicadas.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== "false"; // por padrão roda em modo seguro
const ESTABELECIMENTO_CNPJ = process.env.ESTABELECIMENTO_CNPJ || null; // null = todas as fábricas

// ---- mesmas funções de normalização usadas no upload ----
const removerAcentos = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const limparTempoEmbutido = (texto) =>
  String(texto || "").replace(/\(\s*[\d.,]+\s*min\s*\)/gi, "");

const colapsarEspacos = (texto) =>
  String(texto || "").replace(/\s+/g, " ").trim();

const normalizar = (texto) =>
  colapsarEspacos(removerAcentos(limparTempoEmbutido(texto))).toLowerCase();

const tempoIgual = (a, b) => {
  const na = a === null || a === undefined ? null : Number(a);
  const nb = b === null || b === undefined ? null : Number(b);
  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return Math.abs(na - nb) < 0.001;
};

async function encontrarGrupos() {
  const todasEtapas = await prisma.etapa.findMany(
    ESTABELECIMENTO_CNPJ
      ? { where: { id_Estabelecimento: ESTABELECIMENTO_CNPJ } }
      : undefined
  );

  const porEstabelecimento = new Map();
  for (const etapa of todasEtapas) {
    const chaveEstab = etapa.id_Estabelecimento ?? "__sem_estabelecimento__";
    const lista = porEstabelecimento.get(chaveEstab) || [];
    lista.push(etapa);
    porEstabelecimento.set(chaveEstab, lista);
  }

  const grupos = []; // cada item: { cnpj, canonica, duplicatas: [...] }

  for (const [cnpj, etapas] of porEstabelecimento) {
    const gruposLocais = new Map(); // chave: "descNorm||tempo" -> lista de etapas

    for (const etapa of etapas) {
      const descNorm = normalizar(etapa.descricao);

      let chaveEncontrada = null;
      for (const chave of gruposLocais.keys()) {
        const [chaveDesc, chaveTempoStr] = chave.split("||");
        const chaveTempo = chaveTempoStr === "null" ? null : Number(chaveTempoStr);
        if (chaveDesc === descNorm && tempoIgual(chaveTempo, etapa.tempo_padrao)) {
          chaveEncontrada = chave;
          break;
        }
      }

      const chave = chaveEncontrada || `${descNorm}||${etapa.tempo_padrao ?? "null"}`;
      const lista = gruposLocais.get(chave) || [];
      lista.push(etapa);
      gruposLocais.set(chave, lista);
    }

    for (const [chave, grupo] of gruposLocais) {
      if (grupo.length <= 1) continue;

      // canônica = a mais antiga (menor id_da_funcao)
      const ordenadas = [...grupo].sort((a, b) => a.id_da_funcao - b.id_da_funcao);
      const canonica = ordenadas[0];
      const duplicatas = ordenadas.slice(1);

      grupos.push({ cnpj, chave, canonica, duplicatas });
    }
  }

  return grupos;
}

async function mesclarDuplicata(tx, canonica, dup, avisos) {
  // ---- PecasEtapas: unique(id_da_op, id_da_funcao) ----
  const vinculosPecas = await tx.pecasEtapas.findMany({
    where: { id_da_funcao: dup.id_da_funcao },
  });

  for (const v of vinculosPecas) {
    const conflito = await tx.pecasEtapas.findFirst({
      where: { id_da_op: v.id_da_op, id_da_funcao: canonica.id_da_funcao },
    });

    if (conflito) {
      // já existe vínculo dessa peça com a etapa canônica — descarta o da duplicata
      await tx.pecasEtapas.delete({ where: { id: v.id } });
    } else {
      await tx.pecasEtapas.update({
        where: { id: v.id },
        data: { id_da_funcao: canonica.id_da_funcao },
      });
    }
  }

  // ---- Producao: unique(id_funcionario, id_da_funcao, id_da_op, dataReferencia, hora_registro, tipoRegistro) ----
  const producoesDup = await tx.producao.findMany({
    where: { id_da_funcao: dup.id_da_funcao },
  });

  for (const p of producoesDup) {
    const conflito = await tx.producao.findFirst({
      where: {
        id_funcionario: p.id_funcionario,
        id_da_funcao: canonica.id_da_funcao,
        id_da_op: p.id_da_op,
        dataReferencia: p.dataReferencia,
        hora_registro: p.hora_registro,
        tipoRegistro: p.tipoRegistro,
      },
    });

    if (conflito) {
      // Já existe produção lançada nesse mesmo horário/dia/OP/funcionário
      // para a etapa canônica. NÃO decido sozinho como somar — isso é
      // dado de produção real e merecer revisão manual.
      avisos.push(
        `CONFLITO Producao: registro id=${p.id_da_producao} (etapa duplicada ${dup.id_da_funcao}) ` +
          `colide com registro id=${conflito.id_da_producao} (etapa canônica ${canonica.id_da_funcao}). ` +
          `Quantidade na duplicata: ${p.quantidade_pecas}. Quantidade na canônica: ${conflito.quantidade_pecas}. ` +
          `Não foi movido automaticamente — revise manualmente.`
      );
    } else {
      await tx.producao.update({
        where: { id_da_producao: p.id_da_producao },
        data: { id_da_funcao: canonica.id_da_funcao },
      });
    }
  }

  // ---- TempoReferencia: sem unique constraint na combinação, seguro mover ----
  await tx.tempoReferencia.updateMany({
    where: { id_da_funcao: dup.id_da_funcao },
    data: { id_da_funcao: canonica.id_da_funcao },
  });

  // ---- MetaDiaFuncionario.etapaPadraoId: sem conflito possível ----
  await tx.metaDiaFuncionario.updateMany({
    where: { etapaPadraoId: dup.id_da_funcao },
    data: { etapaPadraoId: canonica.id_da_funcao },
  });

  // ---- AlocacaoProducaoDia.etapaId: sem conflito possível ----
  await tx.alocacaoProducaoDia.updateMany({
    where: { etapaId: dup.id_da_funcao },
    data: { etapaId: canonica.id_da_funcao },
  });
}

async function main() {
  console.log(`Rodando em modo ${DRY_RUN ? "DRY_RUN (seguro, não altera nada)" : "REAL (vai alterar o banco)"}`);
  console.log(
    ESTABELECIMENTO_CNPJ
      ? `Escopo: apenas o estabelecimento ${ESTABELECIMENTO_CNPJ}`
      : `Escopo: TODOS os estabelecimentos`
  );

  const grupos = await encontrarGrupos();

  console.log(`\nEncontrados ${grupos.length} grupo(s) de etapas duplicadas.\n`);

  const avisosGlobais = [];
  let etapasRemovidasCount = 0;
  let etapasPuladasPorConflito = 0;

  for (const { cnpj, canonica, duplicatas } of grupos) {
    console.log(
      `Estabelecimento ${cnpj}\n` +
        `  Canônica: id_da_funcao=${canonica.id_da_funcao} descricao="${canonica.descricao}" tempo_padrao=${canonica.tempo_padrao}\n` +
        `  Duplicatas: ${duplicatas
          .map((d) => `id_da_funcao=${d.id_da_funcao} descricao="${d.descricao}"`)
          .join(" | ")}`
    );

    if (DRY_RUN) continue;

    for (const dup of duplicatas) {
      const avisosDup = [];

      await prisma.$transaction(async (tx) => {
        await mesclarDuplicata(tx, canonica, dup, avisosDup);

        if (avisosDup.length > 0) {
          // Há conflito de Producao não resolvido automaticamente:
          // NÃO apaga a etapa duplicada ainda, para não perder o vínculo
          // do registro de produção conflitante. Só reporta.
          avisosGlobais.push(...avisosDup);
          etapasPuladasPorConflito++;
          return;
        }

        await tx.etapa.delete({ where: { id_da_funcao: dup.id_da_funcao } });
        etapasRemovidasCount++;
      });
    }
  }

  console.log(`\n===== RESUMO =====`);
  console.log(`Grupos com duplicatas: ${grupos.length}`);

  if (!DRY_RUN) {
    console.log(`Etapas duplicadas removidas: ${etapasRemovidasCount}`);
    console.log(`Etapas NÃO removidas por conflito de Producao (revisar manualmente): ${etapasPuladasPorConflito}`);

    if (avisosGlobais.length > 0) {
      console.log(`\n--- Avisos de conflito (revisar manualmente) ---`);
      avisosGlobais.forEach((a) => console.log(a));
    }
  } else {
    console.log(`Nenhuma alteração foi feita. Revise a lista acima e rode com DRY_RUN=false para aplicar.`);
  }
}

main()
  .catch((e) => {
    console.error("Erro ao limpar etapas duplicadas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
