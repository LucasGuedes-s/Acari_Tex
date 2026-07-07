/**
 * calculosProducao.js
 * ─────────────────────────────────────────────────────────────────────────
 * Fonte ÚNICA da fórmula oficial de eficiência/capacidade da indústria de
 * confecção. Tanto a tela de apontamento quanto o relatório em PDF devem
 * importar e usar exclusivamente estas funções — nunca reimplementar a
 * conta localmente — para garantir que os dois lugares mostrem sempre o
 * mesmo número.
 *
 * FÓRMULA OFICIAL DE EFICIÊNCIA:
 *
 *   Eficiência (%) = (Peças Produzidas × SAM × 100) ÷ (Funcionários × Tempo Trabalhado)
 *
 * Onde:
 *   - Peças Produzidas: quantidade de peças produzidas no período avaliado.
 *   - SAM: Tempo de Referência do funcionário para a etapa quando existir;
 *     caso contrário, o Tempo Padrão da Ficha Técnica.
 *   - Funcionários: quantidade de funcionários envolvidos no cálculo.
 *   - Tempo Trabalhado: minutos efetivamente trabalhados no período.
 *
 * Quando o cálculo envolve MAIS de uma etapa/SAM ao mesmo tempo (ex.: a
 * eficiência agregada de uma OP inteira, com vários funcionários em
 * etapas diferentes), a generalização correta da fórmula é somar
 * "peças × SAM" de cada etapa antes de dividir pelo tempo trabalhado
 * total — é exatamente isso que `calcularEficiencia` faz através do
 * parâmetro `producaoPonderada`.
 */

export const FORMULA_EFICIENCIA_TEXTO =
  'Eficiência (%) = (Peças Produzidas × SAM × 100) ÷ (Funcionários × Tempo Trabalhado em minutos)'

export const FORMULA_EFICIENCIA_EXPLICACAO = [
  'SAM = Tempo de Referência do funcionário para aquela etapa ou, quando não houver referência cadastrada, o Tempo Padrão da Ficha Técnica.',
  'Sempre que existir Tempo de Referência do funcionário para a etapa, ele é utilizado automaticamente no lugar do Tempo Padrão.',
]

/**
 * Núcleo único da fórmula de eficiência.
 * `producaoPonderada` é a soma de (peças × SAM) de cada etapa/registro
 * envolvido — no caso mais simples (uma única etapa), isso é exatamente
 * "Peças Produzidas × SAM" da fórmula oficial.
 */
export function calcularEficiencia({ producaoPonderada = 0, funcionarios = 1, tempoTrabalhado = 0 }) {
  const divisor = (funcionarios || 0) * (tempoTrabalhado || 0)
  if (!divisor) return 0
  return Math.round((producaoPonderada * 100) / divisor)
}

/** Atalho para o caso de uma única etapa/SAM (ex.: um registro isolado). */
export function calcularEficienciaSimples({ pecas = 0, sam = 0, funcionarios = 1, tempoTrabalhado = 0 }) {
  return calcularEficiencia({ producaoPonderada: pecas * sam, funcionarios, tempoTrabalhado })
}

/**
 * Capacidade produtiva: quantas peças cabem no tempo trabalhado
 * disponível, no ritmo indicado pelo SAM.
 *
 *   Capacidade = (Funcionários × Tempo Trabalhado) ÷ SAM
 */
export function calcularCapacidade({ funcionarios = 1, tempoTrabalhado = 0, sam = 0 }) {
  if (!sam) return 0
  return Math.floor(((funcionarios || 0) * (tempoTrabalhado || 0)) / sam)
}

/**
 * Tempo disponível total de uma OP/equipe: soma do tempo de UM
 * funcionário multiplicado pela quantidade de funcionários alocados.
 * Nunca deve ficar limitado à jornada de um único funcionário quando há
 * mais de um alocado.
 *
 *   1 funcionário × 540min = 540min
 *   3 funcionários × 540min = 1620min
 */
export function calcularTempoDisponivelTotal({ funcionarios = 0, minutosPorFuncionario = 0 }) {
  return (funcionarios || 0) * (minutosPorFuncionario || 0)
}

/**
 * Resolve o SAM: tempo de referência do funcionário quando existir e for
 * maior que zero; caso contrário, o tempo padrão da ficha técnica.
 */
export function resolverSam({ tempoReferencia, tempoPadrao }) {
  if (tempoReferencia && tempoReferencia > 0) return tempoReferencia
  return tempoPadrao || 0
}
