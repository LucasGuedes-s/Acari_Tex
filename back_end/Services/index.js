async function gerarAnaliseProducao(dadosIA) {
  const module = await import("./gemini.mjs");
  return module.gerarAnaliseProducao(dadosIA);
}
async function gerarAnaliseAlocacaoEtapas(dadosIA) {
  const module = await import("./gemini.mjs");
  return module.gerarAnaliseAlocacaoEtapas(dadosIA);
}
async function perguntarIA(pergunta, usuario, resultado) {
  const module = await import("./gemini.mjs");
  return module.perguntarIA(pergunta, usuario, resultado);
}
module.exports = {
  gerarAnaliseProducao,
  gerarAnaliseAlocacaoEtapas,
  perguntarIA
};
