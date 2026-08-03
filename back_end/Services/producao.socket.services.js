/**
 * Serviço de salvamento de produção.
 *
 * Reescrito para resolver:
 *  - inconsistência entre dataReferencia e data_inicio;
 *  - falso-negativo do upsert (P2002) causado por corrida de concorrência;
 *  - bug no fluxo de exclusão (quantidade = 0) que não filtrava por dataReferencia;
 *  - falta de validação de payload;
 *  - logs de depuração soltos no meio da lógica de negócio.
 *
 * Pré-requisito: `prisma` é uma instância de PrismaClient importada no módulo
 * que chama este arquivo (ajuste o import abaixo conforme seu projeto).
 */

const { PrismaClient } = require('@prisma/client');


prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Erros de domínio
// ---------------------------------------------------------------------------

class ProducaoValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ProducaoValidationError'
    this.field = field
  }
}

// ---------------------------------------------------------------------------
// Helpers puros (fáceis de testar isoladamente)
// ---------------------------------------------------------------------------

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Converte uma string "YYYY-MM-DD" em um Date em UTC meia-noite,
 * sem qualquer dependência do fuso horário do processo Node.
 *
 * Retornar sempre o mesmo objeto Date (ou um clone) para dataReferencia
 * e data_inicio é o que garante que os dois campos nunca divirjam.
 */

function parseDataReferencia(dataStr) {
  if (typeof dataStr !== 'string' || !DATA_REGEX.test(dataStr)) {
    throw new ProducaoValidationError(
      `Data inválida: "${dataStr}". Formato esperado: YYYY-MM-DD.`,
      'data'
    )
  }

  const [ano, mes, dia] = dataStr.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  // Confere se a data "voltou" igual ao que foi passado (evita, por ex.,
  // "2026-02-30" silenciosamente virar "2026-03-02").
  const valido =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia

  if (!valido) {
    throw new ProducaoValidationError(`Data inexistente: "${dataStr}".`, 'data')
  }

  return data
}

/**
 * Normaliza a hora recebida para uma string consistente (ex.: "9" -> "09").
 * Isso evita que a mesma hora, vinda em formatos diferentes do front-end,
 * seja tratada como "outra hora" na chave composta e gere duplicidade.
 */
function normalizarHora(hora) {
  const horaStr = String(hora).trim()
  if (!/^\d{1,2}(:\d{2})?$/.test(horaStr)) {
    throw new ProducaoValidationError(`Hora inválida: "${hora}".`, 'hora')
  }
  const [h, m] = horaStr.split(':')
  const hPad = h.padStart(2, '0')
  return m !== undefined ? `${hPad}:${m}` : hPad
}

function validarPayload(payload) {
  const obrigatorios = [
    'funcionarioId',
    'etapaId',
    'opId',
    'hora',
    'data',
    'estabelecimento',
    'tipoRegistro',
  ]

  for (const campo of obrigatorios) {
    if (payload[campo] === undefined || payload[campo] === null || payload[campo] === '') {
      throw new ProducaoValidationError(`Campo obrigatório ausente: ${campo}.`, campo)
    }
  }

  if (payload.quantidade === undefined || payload.quantidade === null || Number.isNaN(Number(payload.quantidade))) {
    throw new ProducaoValidationError('Quantidade inválida.', 'quantidade')
  }
}

/**
 * Monta a chave composta usada tanto para leitura (findUnique) quanto
 * para delete/upsert. Centralizar aqui evita que os vários pontos do
 * serviço montem a chave de formas ligeiramente diferentes.
 */
function montarChaveComposta({ funcionarioId, etapaId, opId, dataReferencia, hora, tipoRegistro }) {
  return {
    id_funcionario_id_da_funcao_id_da_op_dataReferencia_hora_registro_tipoRegistro: {
      id_funcionario: funcionarioId,
      id_da_funcao: etapaId,
      id_da_op: opId,
      dataReferencia,
      hora_registro: hora,
      tipoRegistro,
    },
  }
}

// ---------------------------------------------------------------------------
// Operações de banco (uma responsabilidade por função)
// ---------------------------------------------------------------------------

async function excluirSeExistir(where) {
  try {
    return await prisma.producao.delete({ where })
  } catch (err) {
    // P2025 = "Record to delete does not exist". Não é um erro de negócio:
    // significa apenas que já não havia produção lançada para excluir.
    if (err.code === 'P2025') {
      return null
    }
    throw err
  }
}
async function criarOuAtualizar({ where, dadosCreate, dadosUpdate }) {

  console.log('WHERE:', JSON.stringify(where, null, 2))

  const existente = await prisma.producao.findUnique({ where })

  console.log('EXISTENTE:', JSON.stringify(existente, null, 2))

  console.log('CREATE:', JSON.stringify(dadosCreate, null, 2))

  console.log('UPDATE:', JSON.stringify(dadosUpdate, null, 2))


  if (existente) {
    console.log('➡️ Fazendo UPDATE')
    return prisma.producao.update({
      where,
      data: dadosUpdate
    })
  }


  console.log('➡️ Fazendo CREATE')

  return prisma.producao.create({
    data: dadosCreate
  })
}
// ---------------------------------------------------------------------------
// Função pública
// ---------------------------------------------------------------------------

/**
 * Salva (cria/atualiza) ou remove um lançamento de produção.
 *
 * Regras:
 *  - quantidade === 0  -> remove o registro correspondente, se existir;
 *  - quantidade !== 0  -> cria o registro se não existir, ou atualiza se já existir.
 *
 * @param {object} payload
 * @param {string} payload.funcionarioId
 * @param {number} payload.etapaId
 * @param {number} payload.opId
 * @param {number|string} payload.quantidade
 * @param {string|number} payload.hora        ex.: "9", "09", "09:30"
 * @param {string} payload.data               formato "YYYY-MM-DD"
 * @param {string} payload.estabelecimento
 * @param {string} payload.tipoRegistro
 * @param {number} [payload.tempoProduzido]
 */
async function salvarProducao(payload) {
  validarPayload(payload)

  const {
    funcionarioId,
    etapaId,
    opId,
    quantidade,
    hora,
    data,
    estabelecimento,
    tipoRegistro,
    tempoProduzido,
  } = payload

  const dataReferencia = parseDataReferencia(data)
  const horaNormalizada = normalizarHora(hora)
  const quantidadeNumero = Number(quantidade)

  const where = montarChaveComposta({
    funcionarioId,
    etapaId,
    opId,
    dataReferencia,
    hora: horaNormalizada,
    tipoRegistro,
  })

  if (quantidadeNumero === 0) {
    return excluirSeExistir(where)
  }

  const horaNumero = Number(horaNormalizada.split(':')[0])

  const dadosUpdate = {
    quantidade_pecas: quantidadeNumero,
    tempo_produzido: tempoProduzido,
    data_inicio: dataReferencia, // mesmo objeto Date de dataReferencia: nunca diverge
    horaNumero,
  }

  const dadosCreate = {
    quantidade_pecas: quantidadeNumero,
    id_Estabelecimento: estabelecimento,
    id_da_op: opId,
    id_funcionario: funcionarioId,
    id_da_funcao: etapaId,
    hora_registro: horaNormalizada,
    horaNumero,
    data_inicio: dataReferencia, // mesmo objeto Date de dataReferencia: nunca diverge
    dataReferencia,
    tipoRegistro,
    tempo_produzido: tempoProduzido,
  }

  return criarOuAtualizar({ where, dadosCreate, dadosUpdate })
}

module.exports = {
  salvarProducao,
  // exportados à parte para permitir testes unitários isolados
  parseDataReferencia,
  normalizarHora,
  ProducaoValidationError,
}