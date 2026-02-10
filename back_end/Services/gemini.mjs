import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MAX_RETRIES = 3;

export async function gerarAnaliseProducao(dadosIA) {
  console.log("Iniciando análise de produção com Gemini...");
  console.log("Dados para IA:", JSON.stringify(dadosIA, null, 2));
  console.log(dadosIA.cnpj)
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
      console.log("✅ Gemini resposta recebida.");
      console.log("Resposta Gemini:", response.text);
      await prisma.chatIAResultado.create({
        data: {
          resultado: response.text,
          usuarioEmail: dadosIA.usuarioEmail || null,
          estabelecimentoCnpj: dadosIA.cnpj
        }
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

export async function gerarAnaliseAlocacaoEtapas(dados) {
  const prompt = `
Analise os dados de eficiência por etapa de produção.

Objetivo:
Indicar quais profissionais são mais adequados para executar cada etapa do processo produtivo, com base exclusivamente na eficiência registrada.

Regras:
- Não presuma metas ideais.
- Não se declare especialista.
- Não faça perguntas ao final.
- Não invente dados.
- Use apenas as informações fornecidas.

Entregue o resultado em três blocos objetivos:

1) Melhores profissionais por etapa
2) Profissionais adequados
3) Alertas operacionais

Dados:
${JSON.stringify(dados, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text;
}