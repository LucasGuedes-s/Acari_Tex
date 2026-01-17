async function gerarAnaliseProducao(dadosIA) {
  const module = await import("./gemini.mjs");
  return module.gerarAnaliseProducao(dadosIA);
}

module.exports = {
  gerarAnaliseProducao
};
