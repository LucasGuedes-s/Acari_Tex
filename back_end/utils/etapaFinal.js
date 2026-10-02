/**
 * REGRA ÚNICA de "etapa final" do backend.
 * Espelho de src/utils/producaoCompartilhada.js (isEtapaFinal) do frontend.
 * Qualquer alteração no critério de "etapa final" precisa ser feita
 * IGUAL nos dois lugares.
 *
 * Consumidores: opStatusCron.js, Services/OP.services.js e
 * Services/relatorioProducaoService.js (relatórios de produção).
 */
function isEtapaFinal(descricao) {
  if (!descricao) return false
  const d = descricao.toLowerCase()

  if (d.includes('revisão intermediaria') || d.includes('revisao intermediaria')) {
    return false
  }

  return (
    d.includes('final') ||
    d.includes('revisão final') || d.includes('revisao final') ||
    d.includes('revisão') || d.includes('revisao') ||
    d.includes('acabamento') ||
    d.includes('qualidade') ||
    d.includes('revisar peça pronta') ||
    d.includes('expedição') || d.includes('expedicao')
  )
}

module.exports = { isEtapaFinal };
// Se o backend usar ESM: export function isEtapaFinal(descricao) { ... }