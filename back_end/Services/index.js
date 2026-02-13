async function gerarAnaliseProducao(dadosIA) {
  const module = await import("./gemini.mjs");
  return module.gerarAnaliseProducao(dadosIA);
}
async function gerarAnaliseAlocacaoEtapas(dadosIA) {
  const module = await import("./gemini.mjs");
  return module.gerarAnaliseAlocacaoEtapas(dadosIA);
}

module.exports = {
  gerarAnaliseProducao,
  gerarAnaliseAlocacaoEtapas
};
