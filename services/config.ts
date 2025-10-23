// Configuração da API Key do Gemini
export const getGeminiApiKey = (): string => {
  // Tenta diferentes formas de obter a API Key
  const apiKey = 
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY não encontrada. Configure a variável de ambiente.');
    throw new Error('API Key do Gemini não configurada');
  }

  return apiKey;
};
