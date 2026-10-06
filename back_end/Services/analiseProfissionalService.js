/**
 * analiseProfissionalService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ANÁLISE INDIVIDUAL DE PROFISSIONAIS
 *
 * Rota:
 *   GET /producao/profissional/:id?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
 *
 * REGRA OFICIAL DE CÁLCULO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Para cada lançamento:
 *
 *   Tempo Ficha = peças × Tempo Padrão da ETAPA
 *
 *   Tempo Fábrica = peças × SAM
 *
 * Onde:
 *
 *   SAM =
 *     1. Tempo de Referência do profissional + OP + etapa, quando existir;
 *     2. caso não exista, Tempo de Referência do profissional + etapa;
 *     3. caso não exista, Tempo Padrão da etapa.
 *
 * A referência é escolhida considerando a DATA EM QUE A PRODUÇÃO ACONTECEU:
 *
 *   1. referência exatamente na data;
 *   2. referência anterior mais recente;
 *   3. referência sem data;
 *   4. referência futura mais próxima;
 *   5. se não houver referência válida, Tempo Padrão da etapa.
 *
 * EFICIÊNCIA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   Eficiência (%) =
 *     Σ(Quantidade × SAM) × 100
 *     ─────────────────────────
 *          Tempo Trabalhado
 *
 *   Eficiência Ficha (%) =
 *     Σ(Quantidade × Tempo Padrão da Etapa) × 100
 *     ─────────────────────────────────────────────
 *                    Tempo Trabalhado
 *
 * IMPORTANTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * - Lançamentos com quantidade <= 0 NÃO entram na eficiência.
 * - Tempo Trabalhado de um lançamento válido é tempo_produzido.
 * - Quando tempo_produzido não estiver preenchido, utiliza 60 minutos.
 * - A eficiência é arredondada com Math.round(), igual ao calculosProducao.js.
 * - Não é feita média simples das eficiências das etapas.
 * - Quando existem várias OPs/etapas, os tempos ponderados são somados
 *   antes da divisão.
 *
 * CONSISTÊNCIA COM OS RELATÓRIOS
 * ─────────────────────────────────────────────────────────────────────────────
 * Este serviço reutiliza a FONTE ÚNICA das regras (utils/producaoCalculos.js):
 * mesmas datas (fuso), mesmo dedupe, mesmo SAM (Tempo Fábrica) e mesma
 * eficiência usados pelos relatórios de produção. As funções locais abaixo
 * são delegações diretas ao módulo compartilhado — a lógica NÃO é duplicada.
 */

const { PrismaClient } = require('@prisma/client')

const {
  // Datas / fuso
  dataLocalSP,
  dataProducaoSP,
  diaDaProducao,
  noPeriodo,
  normalizarDataReferencia,
  extrairDataReferencia,
  tempoDaReferencia,
  parseDataUTC,
  rangeConsulta,
  rangeConsultaAmpliada,
  formatarBR,
  // Fórmulas oficiais
  round2,
  calcularEficiencia,
  calcularCapacidade,
  // SAM / referências
  escolherMaisRecenteSemAlvo,
  escolherReferenciaPorData,
  montarResultadoSAM,
  resolverSAMPorProducao,
  agruparReferenciasPorEtapa,
  // Dedupe (mesma regra dos relatórios)
  removerProducoesDuplicadas,
} = require('../utils/producaoCalculos')

const prisma = new PrismaClient()

const MS_DIA = 24 * 60 * 60 * 1000

// ══════════════════════════════════════════════════════════════════════════════
// DATA / FUSO — delegam a utils/producaoCalculos.js (fonte única)
// ══════════════════════════════════════════════════════════════════════════════





// ══════════════════════════════════════════════════════════════════════════════
// HELPERS DE DATA DA CONSULTA
// ══════════════════════════════════════════════════════════════════════════════



/**
 * Período anterior de mesma duração (para a seção de evolução).
 */
function resolverPeriodoAnterior(dataInicio, dataFim) {
  const inicio = parseDataUTC(dataInicio)
  const fim = parseDataUTC(dataFim)

  const duracaoDias =
    Math.round(
      (fim.getTime() - inicio.getTime()) / MS_DIA
    ) + 1

  const fimAnterior = new Date(
    inicio.getTime() - MS_DIA
  )

  const inicioAnterior = new Date(
    fimAnterior.getTime() -
      (duracaoDias - 1) * MS_DIA
  )

  const iso = d =>
    d.toISOString().slice(0, 10)

  return {
    inicio: iso(inicioAnterior),
    fim: iso(fimAnterior),
    duracaoDias,
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// USUÁRIO
// ══════════════════════════════════════════════════════════════════════════════

function escolherUsuarioPorEmail(usuarios, idRecebido) {
  const alvo =
    String(idRecebido || '')
      .trim()
      .toLowerCase()

  if (!alvo) return null

  return (usuarios || []).find(
    u =>
      String(u.email || '')
        .trim()
        .toLowerCase() === alvo
  ) || null
}

// ══════════════════════════════════════════════════════════════════════════════
// ARREDONDAMENTO / FÓRMULAS OFICIAIS
// ══════════════════════════════════════════════════════════════════════════════

// round2, calcularEficiencia e calcularCapacidade →
// utils/producaoCalculos.js (fonte única das fórmulas oficiais).

// ══════════════════════════════════════════════════════════════════════════════
// TEMPO DE REFERÊNCIA / SAM
// ══════════════════════════════════════════════════════════════════════════════

// valorRecenciaRef, escolherMaisRecenteSemAlvo, escolherReferenciaPorData,
// montarResultadoSAM, resolverSAMPorProducao e agruparReferenciasPorEtapa →
// utils/producaoCalculos.js (fonte única, mesma regra dos relatórios).

function agregarProducoes(
  producoesValidas,
  {
    referenciasPorEtapa,
    funcionarioEmail,
    opsMap = new Map(),
  }
) {
  const diasMap = new Map()
  const opEtapaMap = new Map()

  const opsIds = new Set()
  const etapasIds = new Set()

  let producaoTotal = 0
  let tempoTrabalhadoTotal = 0
  let tempoFichaTotal = 0
  let tempoReferenciaTotal = 0

  let registros = 0
  let registrosIgnorados = 0

  for (
    const prod of producoesValidas || []
  ) {
    const qtd =
      Number(
        prod.quantidade_pecas
      ) || 0

    /**
     * REGRA IMPORTANTE:
     *
     * Produção zerada não entra na eficiência.
     *
     * No apontamento, quantidade 0 representa ausência de produção
     * naquele lançamento e não deve acrescentar 60 minutos ao denominador.
     */
    if (qtd <= 0) {
      registrosIgnorados++
      continue
    }

    /**
     * Tempo efetivamente trabalhado.
     *
     * Compatibilidade com os lançamentos atuais:
     * quando não houver tempo informado, 60 minutos.
     */
    const tempoProduzido =
      Number(
        prod.tempo_produzido
      ) > 0
        ? Number(prod.tempo_produzido)
        : 60

    const etapaTempoPadrao =
      Number(
        prod.producao_etapa
          ?.tempo_padrao
      ) || 0

    const idOp =
      prod.id_da_op

    const idEtapa =
      prod.id_da_funcao

    const diaStr =
      dataProducaoSP(
        prod.data_inicio
      )

    /**
     * Todas as referências desta etapa.
     *
     * O Map é:
     *
     *   id_da_funcao -> TempoReferencia[]
     */
    const refs =
      referenciasPorEtapa.get(
        idEtapa
      ) || []

    /**
     * SAM correto PARA ESTE lançamento.
     *
     * Não usamos uma referência única para todo o período.
     *
     * As referências vêm agrupadas por etapa (referenciasPorEtapa) e a
     * resolução filtra pelo FUNCIONÁRIO do lançamento — fonte única
     * (utils/producaoCalculos.js), mesma regra dos relatórios.
     */
    const samRes =
      resolverSAMPorProducao({
        refs,
        funcionarioEmail: funcionarioEmail,
        idOp,
        dataProducao: diaStr,
        tempoPadrao:
          etapaTempoPadrao,
      })

    const sam =
      Number(samRes?.tempo) || 0

    /**
     * Tempo ponderado.
     */
    const tempoFicha =
      qtd *
      etapaTempoPadrao

    const tempoReferencia =
      qtd * sam

    // ─────────────────────────────────────────────────────────────────────────
    // RESUMO GERAL
    // ─────────────────────────────────────────────────────────────────────────

    producaoTotal += qtd
    tempoTrabalhadoTotal +=
      tempoProduzido

    tempoFichaTotal +=
      tempoFicha

    tempoReferenciaTotal +=
      tempoReferencia

    registros++

    opsIds.add(idOp)
    etapasIds.add(idEtapa)

    // ─────────────────────────────────────────────────────────────────────────
    // POR DIA
    // ─────────────────────────────────────────────────────────────────────────

    if (!diasMap.has(diaStr)) {
      diasMap.set(diaStr, {
        data: diaStr,
        producao: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
      })
    }

    const dia =
      diasMap.get(diaStr)

    dia.producao += qtd
    dia.tempoTrabalhado +=
      tempoProduzido

    dia.tempoFicha +=
      tempoFicha

    dia.tempoReferencia +=
      tempoReferencia

    // ─────────────────────────────────────────────────────────────────────────
    // POR OP + ETAPA
    // ─────────────────────────────────────────────────────────────────────────

    const chave =
      `${idOp}|${idEtapa}`

    if (!opEtapaMap.has(chave)) {
      opEtapaMap.set(chave, {
        idOp,
        idEtapa,
        descricaoEtapa:
          prod.producao_etapa
            ?.descricao ||
          'Sem etapa',

        producao: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,

        registros: 0,

        samSet: new Set(),
        origens: new Set(),

        primeiraData: diaStr,
        ultimaData: diaStr,

        diasMap: new Map(),
      })
    }

    const row =
      opEtapaMap.get(chave)

    row.producao += qtd

    row.tempoTrabalhado +=
      tempoProduzido

    row.tempoFicha +=
      tempoFicha

    row.tempoReferencia +=
      tempoReferencia

    row.registros++

    row.samSet.add(
      Math.round(sam * 1000) /
        1000
    )

    if (samRes?.origem) {
      row.origens.add(
        samRes.origem
      )
    }

    if (
      diaStr &&
      (
        !row.primeiraData ||
        diaStr < row.primeiraData
      )
    ) {
      row.primeiraData =
        diaStr
    }

    if (
      diaStr &&
      diaStr > row.ultimaData
    ) {
      row.ultimaData =
        diaStr
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OP + ETAPA + DIA
    // ─────────────────────────────────────────────────────────────────────────

    if (
      !row.diasMap.has(diaStr)
    ) {
      row.diasMap.set(diaStr, {
        data: diaStr,
        producao: 0,
        tempoTrabalhado: 0,
        tempoFicha: 0,
        tempoReferencia: 0,
      })
    }

    const rowDia =
      row.diasMap.get(diaStr)

    rowDia.producao += qtd

    rowDia.tempoTrabalhado +=
      tempoProduzido

    rowDia.tempoFicha +=
      tempoFicha

    rowDia.tempoReferencia +=
      tempoReferencia
  }

  // ════════════════════════════════════════════════════════════════════════════
  // POR DIA
  // ════════════════════════════════════════════════════════════════════════════

  const porDia =
    [...diasMap.values()]
      .sort(
        (a, b) =>
          a.data.localeCompare(
            b.data
          )
      )
      .map(d => ({
        data: d.data,

        producao:
          d.producao,

        tempoTrabalhado:
          round2(
            d.tempoTrabalhado
          ),

        tempoFicha:
          round2(
            d.tempoFicha
          ),

        tempoReferencia:
          round2(
            d.tempoReferencia
          ),

        /**
         * Mesma fórmula do frontend.
         */
        eficienciaReferencia:
          calcularEficiencia({
            producaoPonderada: d.tempoReferencia,
            tempoTrabalhado: d.tempoTrabalhado,
          }),

        eficienciaFicha:
          calcularEficiencia({
            producaoPonderada: d.tempoFicha,
            tempoTrabalhado: d.tempoTrabalhado,
          }),

        tempoMedioPorPeca:
          d.producao > 0
            ? round2(
                d.tempoTrabalhado /
                  d.producao
              )
            : 0,

        tempoReferenciaMedio:
          d.producao > 0
            ? round2(
                d.tempoReferencia /
                  d.producao
              )
            : 0,
      }))

  // ════════════════════════════════════════════════════════════════════════════
  // POR OP + ETAPA
  // ════════════════════════════════════════════════════════════════════════════

  const porOp =
    [...opEtapaMap.values()]
      .map(row => {
        /**
         * Média ponderada do SAM.
         *
         * NÃO é média simples dos SAMs cadastrados.
         */
        const samMedio =
          row.producao > 0
            ? row.tempoReferencia /
              row.producao
            : 0

        const opInfo =
          opsMap.get(
            row.idOp
          )

        const origemTempoReferencia =
          row.origens.has('peca')
            ? 'peca'
            : row.origens.has(
                'ultimo_registrado'
              )
              ? 'ultimo_registrado'
              : 'padrao_ficha'

        const dias =
          [...row.diasMap.values()]
            .sort(
              (a, b) =>
                a.data.localeCompare(
                  b.data
                )
            )
            .map(d => ({
              data: d.data,

              producao:
                d.producao,

              tempoTrabalhado:
                round2(
                  d.tempoTrabalhado
                ),

              tempoFicha:
                round2(
                  d.tempoFicha
                ),

              tempoReferencia:
                round2(
                  d.tempoReferencia
                ),

              tempoRealizadoPorPeca:
                d.producao > 0
                  ? round2(
                      d.tempoTrabalhado /
                        d.producao
                    )
                  : 0,

              tempoReferenciaIndividual:
                d.producao > 0
                  ? round2(
                      d.tempoReferencia /
                        d.producao
                    )
                  : 0,

              eficienciaReferencia:
                calcularEficiencia({
                  producaoPonderada: d.tempoReferencia,
                  tempoTrabalhado: d.tempoTrabalhado,
                }),

              eficienciaFicha:
                calcularEficiencia({
                  producaoPonderada: d.tempoFicha,
                  tempoTrabalhado: d.tempoTrabalhado,
                }),
            }))

        return {
          idOp: row.idOp,

          descricaoOp:
            opInfo?.descricao ||
            null,

          opQuantidadeTotal:
            opInfo?.quantidade_pecas ??
            null,

          /**
           * Tempo padrão da ETAPA.
           *
           * Nunca substituímos pelo tempo padrão total da peça.
           */
          idEtapa:
            row.idEtapa,

          descricaoEtapa:
            row.descricaoEtapa,

          producao:
            row.producao,

          tempoPadrao:
            row.producao > 0
              ? round2(
                  row.tempoFicha /
                    row.producao
                )
              : 0,

          /**
           * SAM médio efetivamente utilizado
           * nas peças desta OP + etapa.
           */
          tempoReferenciaIndividual:
            round2(
              samMedio
            ),

          /**
           * Indica que existiram SAMs diferentes
           * ao longo do período.
           */
          trVariavel:
            row.samSet.size > 1,

          origemTempoReferencia,

          tempoRealizadoMin:
            round2(
              row.tempoTrabalhado
            ),

          tempoRealizadoPorPeca:
            row.producao > 0
              ? round2(
                  row.tempoTrabalhado /
                    row.producao
                )
              : 0,

          capacidade:
            calcularCapacidade({
              tempoTrabalhado: row.tempoTrabalhado,
              sam: samMedio,
            }),

          eficienciaFicha:
            calcularEficiencia({
              producaoPonderada: row.tempoFicha,
              tempoTrabalhado: row.tempoTrabalhado,
            }),

          eficienciaReferencia:
            calcularEficiencia({
              producaoPonderada: row.tempoReferencia,
              tempoTrabalhado: row.tempoTrabalhado,
            }),

          registros:
            row.registros,

          primeiraData:
            row.primeiraData,

          ultimaData:
            row.ultimaData,

          dias,
        }
      })
      .sort(
        (a, b) =>
          b.producao -
            a.producao ||
          a.idOp -
            b.idOp ||
          a.idEtapa -
            b.idEtapa
      )

  // ════════════════════════════════════════════════════════════════════════════
  // RESUMO
  // ════════════════════════════════════════════════════════════════════════════

  const resumo = {
    producaoTotal,

    horasTrabalhadas:
      round2(
        tempoTrabalhadoTotal /
          60
      ),

    eficienciaReferencia:
      calcularEficiencia({
        producaoPonderada: tempoReferenciaTotal,
        tempoTrabalhado: tempoTrabalhadoTotal,
      }),

    eficienciaFicha:
      calcularEficiencia({
        producaoPonderada: tempoFichaTotal,
        tempoTrabalhado: tempoTrabalhadoTotal,
      }),

    tempoMedioPorPeca:
      producaoTotal > 0
        ? round2(
            tempoTrabalhadoTotal /
              producaoTotal
          )
        : 0,

    tempoReferenciaMedio:
      producaoTotal > 0
        ? round2(
            tempoReferenciaTotal /
              producaoTotal
          )
        : 0,

    tempoPadraoMedio:
      producaoTotal > 0
        ? round2(
            tempoFichaTotal /
              producaoTotal
          )
        : 0,

    opsTrabalhadas:
      opsIds.size,

    etapasTrabalhadas:
      etapasIds.size,

    diasTrabalhados:
      porDia.filter(
        d => d.producao > 0
      ).length,

    registros,

    /**
     * Informativo.
     *
     * Não participa da fórmula.
     */
    registrosIgnorados,
  }

  return {
    resumo,
    porDia,
    porOp,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVOLUÇÃO
// ══════════════════════════════════════════════════════════════════════════════

function montarEvolucao(
  agregadoAtual,
  agregadoAnterior,
  periodoAnterior
) {
  const temDadosAnteriores =
    (
      agregadoAnterior
        ?.resumo
        ?.registros || 0
    ) > 0 &&
    (
      agregadoAnterior
        ?.resumo
        ?.producaoTotal || 0
    ) > 0

  const efAtual =
    agregadoAtual
      ?.resumo
      ?.eficienciaReferencia ??
    0

  const efAnterior =
    temDadosAnteriores
      ? agregadoAnterior
          .resumo
          .eficienciaReferencia
      : null

  return {
    temDadosAnteriores,

    periodoAnterior: {
      inicio:
        periodoAnterior.inicio,
      fim:
        periodoAnterior.fim,
    },

    eficienciaReferenciaAtual:
      efAtual,

    eficienciaReferenciaAnterior:
      efAnterior,

    /**
     * Variação em pontos percentuais.
     */
    variacaoPontos:
      temDadosAnteriores
        ? round2(
            efAtual -
              efAnterior
          )
        : null,

    producaoAtual:
      agregadoAtual
        ?.resumo
        ?.producaoTotal ??
      0,

    producaoAnterior:
      temDadosAnteriores
        ? agregadoAnterior
            .resumo
            .producaoTotal
        : null,

    tempoMedioPorPecaAtual:
      agregadoAtual
        ?.resumo
        ?.tempoMedioPorPeca ??
      0,

    tempoMedioPorPecaAnterior:
      temDadosAnteriores
        ? agregadoAnterior
            .resumo
            .tempoMedioPorPeca
        : null,

    tempoReferenciaMedioAtual:
      agregadoAtual
        ?.resumo
        ?.tempoReferenciaMedio ??
      0,

    tempoReferenciaMedioAnterior:
      temDadosAnteriores
        ? agregadoAnterior
            .resumo
            .tempoReferenciaMedio
        : null,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

async function gerarAnaliseProfissional(
  cnpj,
  funcionarioId,
  {
    dataInicio,
    dataFim,
  }
) {
  if (!cnpj) {
    const err =
      new Error(
        'Estabelecimento não identificado.'
      )

    err.statusCode = 400

    throw err
  }

  if (!funcionarioId) {
    const err =
      new Error(
        'Identificador do profissional é obrigatório.'
      )

    err.statusCode = 400

    throw err
  }

  if (!dataInicio || !dataFim) {
    const err =
      new Error(
        'Envie dataInicio e dataFim (formato YYYY-MM-DD).'
      )

    err.statusCode = 400

    throw err
  }

  /**
   * Validação simples das datas.
   */
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dataInicio
    ) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dataFim
    )
  ) {
    const err =
      new Error(
        'dataInicio e dataFim devem estar no formato YYYY-MM-DD.'
      )

    err.statusCode = 400

    throw err
  }

  /**
   * Janela ampliada (±3h de margem de fuso) — MESMA estratégia dos
   * relatórios: captura lançamentos reais gravados à noite em SP que caem
   * no dia UTC seguinte; o recorte exato do período é feito em memória
   * com diaDaProducao + noPeriodo.
   */
  const {
    gte,
    lt,
  } =
    rangeConsultaAmpliada(
      dataInicio,
      dataFim
    )

  const periodoAnterior =
    resolverPeriodoAnterior(
      dataInicio,
      dataFim
    )

  const rangeAnterior =
    rangeConsultaAmpliada(
      periodoAnterior.inicio,
      periodoAnterior.fim
    )

  // ════════════════════════════════════════════════════════════════════════════
  // PROFISSIONAIS
  // ════════════════════════════════════════════════════════════════════════════

  const usuarios =
    await prisma.usuarios.findMany({
      where: {
        estabelecimentoCnpj:
          cnpj,
      },

      select: {
        email: true,
        nome: true,
        foto: true,
        funcoes: true,
        status: true,
      },
    })

  const usuario =
    escolherUsuarioPorEmail(
      usuarios,
      funcionarioId
    )

  if (!usuario) {
    const err =
      new Error(
        'Profissional não encontrado neste estabelecimento.'
      )

    err.statusCode = 404
    err.code =
      'PROFISSIONAL_NAO_ENCONTRADO'

    throw err
  }

  const email =
    usuario.email

  // ════════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ════════════════════════════════════════════════════════════════════════════

  const [
    producoesAtuais,
    producoesAnteriores,
    tempoReferencia,
  ] =
    await Promise.all([
      /**
       * Período atual.
       */
      prisma.producao.findMany({
        where: {
          id_Estabelecimento:
            cnpj,

          id_funcionario:
            email,

          data_inicio: {
            gte,
            lt,
          },
        },

        include: {
          producao_funcionario: {
            select: {
              nome: true,
              foto: true,
            },
          },

          producao_etapa: {
            select: {
              id_da_funcao:
                true,

              descricao:
                true,

              tempo_padrao:
                true,
            },
          },

          producao_peca: {
            select: {
              id_da_op:
                true,

              descricao:
                true,

              tempo_padrao:
                true,
            },
          },
        },

        orderBy: [
          {
            data_inicio:
              'asc',
          },

          {
            horaNumero:
              'asc',
          },
        ],
      }),

      /**
       * Período anterior.
       */
      prisma.producao.findMany({
        where: {
          id_Estabelecimento:
            cnpj,

          id_funcionario:
            email,

          data_inicio: {
            gte:
              rangeAnterior.gte,

            lt:
              rangeAnterior.lt,
          },
        },

        include: {
          producao_etapa: {
            select: {
              id_da_funcao:
                true,

              descricao:
                true,

              tempo_padrao:
                true,
            },
          },

          producao_peca: {
            select: {
              id_da_op:
                true,

              descricao:
                true,

              tempo_padrao:
                true,
            },
          },
        },

        orderBy: [
          {
            data_inicio:
              'asc',
          },

          {
            horaNumero:
              'asc',
          },
        ],
      }),

      /**
       * TODAS as referências do profissional.
       *
       * Não filtramos por data aqui porque precisamos escolher
       * historicamente a referência correta para cada lançamento.
       */
      prisma.tempoReferencia.findMany({
        where: {
          estabelecimentoCnpj:
            cnpj,

          id_funcionario:
            email,
        },

        select: {
          id: true,

          id_funcionario:
            true,

          id_da_funcao:
            true,

          tempo_minutos:
            true,

          tempo_por_peca:
            true,

          criadoEm:
            true,

          data_medicao:
            true,

          opId:
            true,
        },

        orderBy: {
          id: 'asc',
        },
      }),
    ])

  // ════════════════════════════════════════════════════════════════════════════
  // OPS
  // ════════════════════════════════════════════════════════════════════════════

  const opIds =
    [
      ...new Set(
        producoesAtuais
          .map(
            p => p.id_da_op
          )
          .filter(
            id => id != null
          )
      ),
    ]

  const ops =
    opIds.length
      ? await prisma.pecasOP.findMany({
          where: {
            id_Estabelecimento:
              cnpj,

            id_da_op: {
              in: opIds,
            },
          },

          select: {
            id_da_op:
              true,

            descricao:
              true,

            quantidade_pecas:
              true,

            tempo_padrao:
              true,
          },
        })
      : []

  const opsMap =
    new Map(
      ops.map(
        op => [
          op.id_da_op,
          op,
        ]
      )
    )

  // ════════════════════════════════════════════════════════════════════════════
  // REFERÊNCIAS POR ETAPA
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Map:
   *
   *   id_da_funcao -> TempoReferencia[]
   *
   * A seleção da referência acontece somente na hora de processar
   * cada produção, porque a data da produção é necessária.
   */
  const referenciasPorEtapa =
    new Map()

  for (
    const ref of tempoReferencia
  ) {
    const idFuncao =
      ref.id_da_funcao

    if (
      !referenciasPorEtapa.has(
        idFuncao
      )
    ) {
      referenciasPorEtapa.set(
        idFuncao,
        []
      )
    }

    referenciasPorEtapa
      .get(idFuncao)
      .push(ref)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEDUPLICAÇÃO
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * IMPORTANTE:
   *
   * Mesma regra de dedupe dos relatórios (fonte única) aplicada aos
   * lançamentos atuais e anteriores.
   *
   * O recorte exato do período é refeito em memória (diaDaProducao +
   * noPeriodo) porque a consulta usa a janela ampliada de ±3h.
   */
  const noPeriodoAtual = p =>
    noPeriodo(diaDaProducao(p.data_inicio), dataInicio, dataFim)

  const noPeriodoAnterior = p =>
    noPeriodo(diaDaProducao(p.data_inicio), periodoAnterior.inicio, periodoAnterior.fim)

  const atuaisValidas =
    removerProducoesDuplicadas(
      producoesAtuais.filter(noPeriodoAtual)
    )

  const anterioresValidas =
    removerProducoesDuplicadas(
      producoesAnteriores.filter(noPeriodoAnterior)
    )

  if (
    atuaisValidas.removidos > 0
  ) {
    console.log(
      `[analiseProfissional] ` +
      `${atuaisValidas.removidos} lançamento(s) duplicado(s) ignorado(s) ` +
      `para ${email}.`
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AGREGAÇÃO
  // ════════════════════════════════════════════════════════════════════════════

  const ctx = {
    referenciasPorEtapa,
    funcionarioEmail:
      email,
    opsMap,
  }

  const agregadoAtual =
    agregarProducoes(
      atuaisValidas.producoes,
      ctx
    )

  const agregadoAnterior =
    agregarProducoes(
      anterioresValidas.producoes,
      ctx
    )

  // ════════════════════════════════════════════════════════════════════════════
  // RESPOSTA
  // ════════════════════════════════════════════════════════════════════════════

  return {
    profissional: {
      id: email,

      nome:
        usuario.nome ||
        email,

      foto:
        usuario.foto ||
        null,

      funcoes:
        usuario.funcoes ||
        null,

      status:
        usuario.status ||
        null,
    },

    periodo: {
      inicio:
        dataInicio,

      fim:
        dataFim,

      label:
        `${formatarBR(dataInicio)} a ${formatarBR(dataFim)}`,
    },

    vazio:
      atuaisValidas.producoes.length === 0,

    resumo:
      agregadoAtual.resumo,

    evolucao:
      montarEvolucao(
        agregadoAtual,
        agregadoAnterior,
        periodoAnterior
      ),

    porDia:
      agregadoAtual.porDia,

    porOp:
      agregadoAtual.porOp,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  gerarAnaliseProfissional,

  // Helpers exportados para testes.
  formatarBR,
  parseDataUTC,
  rangeConsulta,
  resolverPeriodoAnterior,
  escolherUsuarioPorEmail,

  normalizarDataReferencia,
  extrairDataReferencia,
  tempoDaReferencia,
  dataProducaoSP,

  escolherReferenciaPorData,
  resolverSAMPorProducao,

  calcularEficiencia,
  calcularCapacidade,

  removerProducoesDuplicadas,
  agregarProducoes,
  montarEvolucao,
}