/**
 * ESPELHO EXATO de src/utils/etapaFinal.js do frontend.
 * Qualquer alteração no critério de "etapa final" precisa ser feita
 * IGUAL nos dois arquivos. Idealmente, mover para um pacote compartilhado
 * (ex: workspace/monorepo) para eliminar essa duplicação definitivamente.
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
    d.includes('revisar peça pronta')
  )
}

module.exports = { isEtapaFinal };
// Se o backend usar ESM: export function isEtapaFinal(descricao) { ... }