import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos la IA con tu clave del .env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("⚠️ Falta la API Key de Gemini en las variables de entorno.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const generateCoachRecommendation = async (wellnessData: any, lastSessionData?: any) => {
  try {
    // Usamos el modelo rápido y gratuito de la nueva versión
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Sos un Head Coach de Crossfit estricto, motivador y muy técnico.
      Analizá estos datos del atleta de HOY:
      - Horas de sueño: ${wellnessData?.sleepQuality || 'No registrado'} / 5
      - Alimentación: ${wellnessData?.nutrition || 'No registrado'} / 5
      - Nivel de estrés: ${wellnessData?.stressLevel || 'No registrado'} / 5
      
      Última sesión (WOD anterior):
      - Esfuerzo (RPE): ${lastSessionData?.rpe || 'No registrado'} / 10
      
      Reglas de tu respuesta:
      1. Dame un consejo de entrenamiento de máximo 3 renglones.
      2. Sé directo, usá jerga de Crossfit (WOD, RM, AMRAP, etc).
      3. Si durmió mal o comió mal, decile que baje las cargas o priorice técnica.
      4. Si está óptimo, exigile que vaya pesado.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Error al conectar con el Coach Virtual (Gemini):", error);
    return "🔥 EL RADAR ESTÁ INTERFERIDO. ENFOCATE EN LA TÉCNICA Y ESCUCHÁ A TU CUERPO HOY.";
  }
};
