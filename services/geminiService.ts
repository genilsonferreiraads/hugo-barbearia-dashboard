
import { GoogleGenAI } from "@google/genai";
import { DailyStats } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateDailySummary = async (stats: DailyStats): Promise<string> => {
  try {
    const prompt = `
      Você é um assistente de negócios para o proprietário de uma barbearia chamada "Hugo Barbearia".
      Analise os dados de desempenho do dia e forneça um resumo amigável e perspicaz em português.
      Seja conciso e termine com uma nota motivacional.

      Dados de hoje:
      - Faturamento Total: R$ ${stats.totalRevenue.toFixed(2)}
      - Serviços Concluídos: ${stats.servicesCompleted}
      - Ticket Médio: R$ ${stats.averageTicket.toFixed(2)}

      Seu resumo deve estar em um único parágrafo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating summary with Gemini API:", error);
    return "Desculpe, não foi possível gerar o resumo neste momento. Por favor, tente novamente mais tarde.";
  }
};