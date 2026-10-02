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
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const MS_DIA = 24 * 60 * 60 * 1000

// ══════════════════════════════════════════════════════════════════════════════
// DATA / FUSO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Retorna YYYY-MM-DD no fuso de São Paulo.
 *
 * O backend não deve depender do timezone configurado no servidor.
 */
function dataLocalSP(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null
  }

  /**
   * IMPORTANTE:
   *
   * Datas vindas do banco representam o DIA da produção.
   *
   * Não devemos aplicar America/Sao_Paulo aqui, porque uma data
   * armazenada como:
   *
   *   2026-10-02T00:00:00.000Z
   *
   * quando convertida para UTC-3 vira:
   *
   *   2026-10-01 21:00
   *
   * causando o deslocamento de um dia.
   *
   * Para preservar o dia originalmente armazenado pelo banco,
   * usamos os componentes UTC.
   */

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Normaliza uma data de referência para YYYY-MM-DD.
 *
 * Regras equivalentes ao tempoReferencia.js do frontend.
 */
function normalizarDataReferencia(valor) {
  if (valor == null || valor === '') return null

  if (valor instanceof Date) {
    return dataLocalSP(valor)
  }

  const s = String(valor).trim()

  if (!s) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s
  }

  // DD/MM/YYYY
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`
  }

  /**
   * DATE serializado como meia-noite UTC.
   *
   * Não convertemos para São Paulo porque isso poderia transformar:
   *
   * 2026-09-23T00:00:00.000Z
   *
   * em 22/09 no Brasil.
   */
  const utcMidnight = s.match(
    /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$/
  )

  if (utcMidnight) {
    return utcMidnight[1]
  }

  const date = new Date(s)

  if (isNaN(date.getTime())) return null

  return dataLocalSP(date)
}

/**
 * Extrai a data da referência.
 *
 * Mesma ordem utilizada no frontend.
 */
function extrairDataReferencia(ref) {
  const campos = [
    'data_medicao',
    'criadoEm',
    'data_referencia',
    'data',
    'data_registro',
    'created_at',
    'createdAt',
    'data_cadastro',
    'data_criacao',
  ]

  for (const campo of campos) {
    const data = normalizarDataReferencia(ref?.[campo])

    if (data) return data
  }

  return null
}

/**
 * Obtém o tempo da referência.
 */
function tempoDaReferencia(ref) {
  const valor =
    ref?.tempo_minutos ??
    ref?.tempo_por_peca ??
    0

  const numero = Number(valor)

  return Number.isFinite(numero) && numero > 0
    ? numero
    : 0
}

/**
 * Data da produção no fuso de São Paulo.
 */
function dataProducaoSP(data) {
  if (!data) return ''

  if (typeof data === 'string') {
    // Se já vier somente como YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data
    }
  }

  return normalizarDataReferencia(data) || ''
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS DE DATA DA CONSULTA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Converte YYYY-MM-DD para meia-noite UTC.
 *
 * A coluna data_inicio é consultada dessa forma para preservar o dia
 * informado pelo usuário.
 */
function parseDataUTC(dataISO) {
  if (!dataISO) return null

  const [ano, mes, dia] = String(dataISO)
    .split('-')
    .map(Number)

  if (!ano || !mes || !dia) return null

  return new Date(Date.UTC(ano, mes - 1, dia))
}

/**
 * Intervalo [gte, lt).
 */
function rangeConsulta(dataInicio, dataFim) {
  const gte = parseDataUTC(dataInicio)

  if (!gte) {
    throw new Error(`Data inicial inválida: ${dataInicio}`)
  }

  const fim = parseDataUTC(dataFim)

  if (!fim) {
    throw new Error(`Data final inválida: ${dataFim}`)
  }

  const lt = new Date(fim.getTime() + MS_DIA)

  return { gte, lt }
}

/**
 * Período anterior de mesma duração.
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

/**
 * YYYY-MM-DD → DD/MM/YYYY.
 */
function formatarBR(dataISO) {
  if (!dataISO) return ''

  const [ano, mes, dia] =
    String(dataISO).split('-')

  return `${dia}/${mes}/${ano}`
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

/**
 * Arredondamento auxiliar para tempos.
 *
 * Eficiência NÃO usa round2.
 * Eficiência usa Math.round(), como calculosProducao.js.
 */
const round2 = value =>
  Math.round((Number(value) || 0) * 100) / 100

/**
 * Fórmula oficial equivalente ao calcularEficiencia() do frontend.
 *
 * Front:
 *
 *   calcularEficiencia({
 *     producaoPonderada,
 *     funcionarios: 1,
 *     tempoTrabalhado
 *   })
 *
 * Backend deste serviço:
 *
 *   eficiencia = tempoPonderado × 100 / tempoTrabalhado
 *
 * Como esta análise é individual:
 *
 *   funcionários = 1
 */
function calcularEficiencia(
  tempoPonderado,
  tempoTrabalhado
) {
  const ponderado =
    Number(tempoPonderado) || 0

  const trabalhado =
    Number(tempoTrabalhado) || 0

  if (!trabalhado) return 0

  return Math.round(
    (ponderado * 100) /
      trabalhado
  )
}

/**
 * Capacidade:
 *
 *   Capacidade =
 *     Tempo Trabalhado / SAM
 *
 * Como a análise é de UM profissional:
 * funcionários = 1.
 */
function calcularCapacidade(
  tempoTrabalhado,
  sam
) {
  const tempo =
    Number(tempoTrabalhado) || 0

  const referencia =
    Number(sam) || 0

  if (!referencia) return 0

  return Math.floor(
    tempo / referencia
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPO DE REFERÊNCIA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ordena referências para desempate.
 *
 * Quando duas referências possuem a mesma data, utiliza o ID maior
 * como registro mais recente.
 */
function escolherMaisRecenteSemAlvo(
  candidatas
) {
  if (!candidatas.length) return null

  return candidatas.reduce(
    (melhor, atual) => {
      if (!melhor) return atual

      if (
        atual.data &&
        melhor.data
      ) {
        if (atual.data > melhor.data) {
          return atual
        }

        if (atual.data < melhor.data) {
          return melhor
        }
      }

      if (
        atual.data &&
        !melhor.data
      ) {
        return atual
      }

      if (
        !atual.data &&
        melhor.data
      ) {
        return melhor
      }

      const idAtual =
        Number(atual.ref?.id)

      const idMelhor =
        Number(melhor.ref?.id)

      if (
        Number.isFinite(idAtual) &&
        Number.isFinite(idMelhor)
      ) {
        return idAtual > idMelhor
          ? atual
          : melhor
      }

      return atual.ordem > melhor.ordem
        ? atual
        : melhor
    },
    null
  )
}

/**
 * Escolhe uma referência de acordo com a data da produção.
 *
 * REGRA:
 *
 *   1. exatamente na data;
 *   2. mais recente anterior;
 *   3. sem data;
 *   4. futura mais próxima.
 */
function escolherReferenciaPorData(
  refs,
  dataConsulta
) {
  if (!Array.isArray(refs)) {
    return null
  }

  const candidatas = refs
    .filter(ref => {
      return (
        ref &&
        tempoDaReferencia(ref) > 0
      )
    })
    .map((ref, ordem) => ({
      ref,
      ordem,
      data:
        extrairDataReferencia(ref),
    }))

  if (!candidatas.length) {
    return null
  }

  const alvo =
    normalizarDataReferencia(
      dataConsulta
    )

  if (!alvo) {
    return (
      escolherMaisRecenteSemAlvo(
        candidatas
      )?.ref || null
    )
  }

  const datadas =
    candidatas.filter(c => c.data)

  const semData =
    candidatas.filter(c => !c.data)

  // 1. Exatamente na data.
  const naData =
    datadas.filter(
      c => c.data === alvo
    )

  if (naData.length) {
    if (naData.length === 1) {
      return naData[0].ref
    }

    return (
      escolherMaisRecenteSemAlvo(
        naData
      )?.ref || null
    )
  }

  // 2. Mais recente anterior.
  const anteriores =
    datadas
      .filter(c => c.data < alvo)
      .sort((a, b) => {
        if (a.data < b.data) return 1
        if (a.data > b.data) return -1
        return a.ordem - b.ordem
      })

  if (anteriores.length) {
    return anteriores[0].ref
  }

  // 3. Sem data.
  if (semData.length) {
    return (
      escolherMaisRecenteSemAlvo(
        semData
      )?.ref || null
    )
  }

  // 4. Futuro mais próximo.
  const futuras =
    datadas
      .filter(c => c.data > alvo)
      .sort((a, b) => {
        if (a.data < b.data) return -1
        if (a.data > b.data) return 1
        return a.ordem - b.ordem
      })

  return futuras[0]?.ref || null
}

/**
 * Cria uma resposta padronizada de SAM.
 */
function montarResultadoSAM(
  ref,
  origem,
  tempoPadrao
) {
  const tempoReferencia =
    tempoDaReferencia(ref)

  if (tempoReferencia > 0) {
    return {
      tempo: tempoReferencia,
      origem,
      referenciaId:
        ref?.id ?? null,
      dataReferencia:
        extrairDataReferencia(ref),
      opId:
        ref?.opId ?? null,
    }
  }

  return {
    tempo:
      Number(tempoPadrao) || 0,
    origem: 'padrao_ficha',
    referenciaId: null,
    dataReferencia: null,
    opId: null,
  }
}

/**
 * Resolve o SAM para UMA produção.
 *
 * Prioridade:
 *
 *   1. Tempo Referência específico da OP + etapa + profissional;
 *   2. Tempo Referência geral da etapa + profissional;
 *   3. Tempo Padrão da etapa.
 *
 * Dentro de cada grupo:
 *
 *   1. data exata;
 *   2. anterior mais recente;
 *   3. sem data;
 *   4. futuro mais próximo.
 *
 * IMPORTANTE:
 *
 * A lista recebida já pertence ao profissional.
 */
function resolverSAMPorProducao({
  refs,
  idOp,
  dataProducao,
  tempoPadrao,
}) {
  const lista =
    Array.isArray(refs)
      ? refs
      : []

  const opIdNumero =
    idOp == null
      ? null
      : Number(idOp)

  /**
   * Referências específicas da OP.
   *
   * opId pode vir como número ou string.
   */
  const refsDaOP =
    opIdNumero == null
      ? []
      : lista.filter(ref => {
          if (
            ref?.opId == null
          ) {
            return false
          }

          return (
            Number(ref.opId) ===
            opIdNumero
          )
        })

  if (refsDaOP.length) {
    const refOP =
      escolherReferenciaPorData(
        refsDaOP,
        dataProducao
      )

    if (refOP) {
      return montarResultadoSAM(
        refOP,
        'peca',
        tempoPadrao
      )
    }
  }

  /**
   * Referências gerais.
   *
   * Só entram referências sem OP.
   *
   * Isso impede que uma referência de outra OP seja utilizada
   * indevidamente em uma produção que não possui aquela OP.
   */
  const refsGerais =
    lista.filter(
      ref =>
        ref?.opId == null
    )

  if (refsGerais.length) {
    const refGeral =
      escolherReferenciaPorData(
        refsGerais,
        dataProducao
      )

    if (refGeral) {
      return montarResultadoSAM(
        refGeral,
        'ultimo_registrado',
        tempoPadrao
      )
    }
  }

  return montarResultadoSAM(
    null,
    'padrao_ficha',
    tempoPadrao
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DEDUPLICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Dedupe local dos lançamentos.
 *
 * A função tenta reproduzir a finalidade do relatório:
 * eliminar reapontamentos/duplicações de sincronização offline.
 *
 * A chave usa os campos que identificam o lançamento produtivo.
 */
function removerProducoesDuplicadas(
  producao
) {
  const mapa = new Map()
  const semChave = []

  for (let prod of producao || []) {
    const data =
      prod.data_inicio
        ? new Date(prod.data_inicio)
            .getTime()
        : ''

    const chave = [
      prod.id_funcionario || '',
      prod.id_da_funcao || '',
      prod.id_da_op || '',
      data,
      prod.horaNumero ?? '',
      prod.tipoRegistro ?? '',
      prod.dataReferencia ?? '',
    ].join('|')

    if (
      !prod.id &&
      !chave
    ) {
      semChave.push(prod)
      continue
    }

    const existente =
      mapa.get(chave)

    if (!existente) {
      mapa.set(chave, prod)
      continue
    }

    /**
     * Quando houver dois registros para a mesma chave,
     * mantém o registro com ID maior.
     *
     * Isso normalmente corresponde ao último registro criado
     * durante uma sincronização/reapontamento.
     */
    const idAtual =
      Number(prod.id) || 0

    const idExistente =
      Number(existente.id) || 0

    if (idAtual > idExistente) {
      mapa.set(chave, prod)
    }
  }

  let producoes = [
    ...mapa.values(),
    ...semChave,
  ]
  

  return {
    producoes,
    removidos:
      (producoes || []).length -
      producoes.length,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AGREGAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Consolida os lançamentos de UM profissional.
 *
 * Cada lançamento válido é resolvido individualmente.
 */
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
     */
    const samRes =
      resolverSAMPorProducao({
        refs,
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
          calcularEficiencia(
            d.tempoReferencia,
            d.tempoTrabalhado
          ),

        eficienciaFicha:
          calcularEficiencia(
            d.tempoFicha,
            d.tempoTrabalhado
          ),

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
                calcularEficiencia(
                  d.tempoReferencia,
                  d.tempoTrabalhado
                ),

              eficienciaFicha:
                calcularEficiencia(
                  d.tempoFicha,
                  d.tempoTrabalhado
                ),
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
            calcularCapacidade(
              row.tempoTrabalhado,
              samMedio
            ),

          eficienciaFicha:
            calcularEficiencia(
              row.tempoFicha,
              row.tempoTrabalhado
            ),

          eficienciaReferencia:
            calcularEficiencia(
              row.tempoReferencia,
              row.tempoTrabalhado
            ),

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
      calcularEficiencia(
        tempoReferenciaTotal,
        tempoTrabalhadoTotal
      ),

    eficienciaFicha:
      calcularEficiencia(
        tempoFichaTotal,
        tempoTrabalhadoTotal
      ),

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

  const {
    gte,
    lt,
  } =
    rangeConsulta(
      dataInicio,
      dataFim
    )

  const periodoAnterior =
    resolverPeriodoAnterior(
      dataInicio,
      dataFim
    )

  const rangeAnterior =
    rangeConsulta(
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
   * O serviço mantém a mesma ideia de dedupe para os lançamentos atuais
   * e anteriores.
   */
  const atuaisValidas =
    removerProducoesDuplicadas(
      producoesAtuais
    )

  const anterioresValidas =
    removerProducoesDuplicadas(
      producoesAnteriores
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
      producoesAtuais.length === 0,

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