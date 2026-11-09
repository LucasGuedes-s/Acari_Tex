/**
 * calculosProducao.js
 * ─────────────────────────────────────────────────────────────────────────
 * Fonte ÚNICA da fórmula oficial de eficiência/capacidade. Tela de
 * apontamento, PDF e Excel devem usar SOMENTE estas funções.
 *
 * FÓRMULA OFICIAL DE EFICIÊNCIA:
 *
 *   Eficiência (%) = (Peças Produzidas × SAM × 100) ÷ (Funcionários × Tempo Trabalhado)
 *
 * Onde:
 *   - SAM (tempo utilizado): o MENOR entre o Tempo Ficha e o Tempo de
 *     Referência do profissional. Se só um dos dois existir, usa o que existe.
 *   - Funcionários: quantidade de pessoas envolvidas no cálculo.
 *   - Tempo Trabalhado: minutos efetivamente trabalhados (soma dos minutos
 *     registrados; cada pessoa tem no máximo 60 min por hora).
 *
 * Com várias etapas/SAMs (ou várias pessoas) soma-se "peças × SAM" de cada
 * registro e divide-se pela soma dos tempos — NUNCA média de percentuais.
 */

export const FORMULA_EFICIENCIA_TEXTO =
  'Eficiência (%) = (Peças Produzidas × SAM × 100) ÷ (Funcionários × Tempo Trabalhado em minutos)'

export const FORMULA_EFICIENCIA_EXPLICACAO = [
  'SAM = o menor entre o Tempo Ficha e o Tempo de Referência do profissional para aquela etapa. Quando só um deles existir, usa-se o que existir.',
  'Tempo trabalhado = soma dos minutos registrados (no máximo 60 min por hora para cada funcionário).',
]

/**
 * Núcleo da fórmula, SEM arredondamento. Use esta versão em qualquer
 * cálculo intermediário ou de média.
 */
export function calcularEficienciaExata({ producaoPonderada = 0, funcionarios = 1, tempoTrabalhado = 0 }) {
  const divisor = (funcionarios || 0) * (tempoTrabalhado || 0)
  if (!divisor) return 0
  return (producaoPonderada * 100) / divisor
}

/**
 * Versão para exibição: 1 casa decimal (antes era inteiro).
 * `producaoPonderada` = Σ (peças × SAM) dos registros envolvidos.
 */
export function calcularEficiencia(params) {
  return Math.round(calcularEficienciaExata(params) * 10) / 10
}

/** Atalho para uma única etapa/SAM. */
export function calcularEficienciaSimples({ pecas = 0, sam = 0, funcionarios = 1, tempoTrabalhado = 0 }) {
  return calcularEficiencia({ producaoPonderada: pecas * sam, funcionarios, tempoTrabalhado })
}

/**
 * Capacidade SEM arredondar:  (Funcionários × Tempo Trabalhado) ÷ SAM
 * Some esta versão hora a hora e arredonde só no final.
 */
export function calcularCapacidadeExata({ funcionarios = 1, tempoTrabalhado = 0, sam = 0 }) {
  if (!sam) return 0
  return ((funcionarios || 0) * (tempoTrabalhado || 0)) / sam
}

/** Capacidade inteira (floor). Use apenas sobre o TOTAL, nunca célula a célula. */
export function calcularCapacidade(params) {
  return Math.floor(calcularCapacidadeExata(params))
}

/**
 * Tempo disponível total de uma OP/equipe:
 *   1 funcionário × 540min = 540min · 3 funcionários × 540min = 1620min
 */
export function calcularTempoDisponivelTotal({ funcionarios = 0, minutosPorFuncionario = 0 }) {
  return (funcionarios || 0) * (minutosPorFuncionario || 0)
}

/**
 * REGRA ÚNICA DO SAM (tempo utilizado): o MENOR entre ficha e referência,
 * com fallback para o que existir. Tela, PDF e Excel usam esta função.
 */
export function resolverSam({ tempoReferencia, tempoPadrao }) {
  const ref = Number(tempoReferencia) || 0
  const padrao = Number(tempoPadrao) || 0
  if (ref > 0 && padrao > 0) return Math.min(ref, padrao)
  if (ref > 0) return ref
  return padrao
}

/** Mesmo que resolverSam, com assinatura posicional (ficha, referência). */
export function tempoUtilizadoDe(tempoFicha, tempoReferenciaProfissional) {
  return resolverSam({ tempoReferencia: tempoReferenciaProfissional, tempoPadrao: tempoFicha })
}