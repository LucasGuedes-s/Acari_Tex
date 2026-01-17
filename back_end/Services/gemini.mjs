import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MAX_RETRIES = 3;

export async function gerarAnaliseProducao(dadosIA) {
  const prompt = `
Analise os dados de produção considerando eficiência produtiva por funcionário
e eficiência média da turma, com base no tempo padrão das etapas e no tempo
diário disponível.

Destaque objetivamente:
- Funcionários acima e abaixo da média da turma
- Diferenças relevantes entre etapas
- Gargalos observados
- Padrões de desempenho no período

Seja direto, técnico e conciso.
Não faça perguntas.
`;

  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { text: "\nDados:\n" + JSON.stringify(dadosIA) }
            ]
          }
        ]
      });

      return response.text;

    } catch (error) {
      console.error(`❌ Gemini tentativa ${tentativa}:`, error.message);

      if (tentativa === MAX_RETRIES) {
        return "Análise indisponível no momento devido à instabilidade do serviço de IA.";
      }

      // ⏱️ Backoff progressivo
      await new Promise(res => setTimeout(res, tentativa * 1000));
    }
  }
}
