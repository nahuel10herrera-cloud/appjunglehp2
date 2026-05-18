import { GoogleGenerativeAI } from "@google/generative-ai";
import { WellnessEntry, WorkoutSession } from "@/src/types";

// IMPORTANTE: Vite necesita el prefijo VITE_ para poder leer la llave
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateCoachRecommendation(
  wellness: WellnessEntry,
  session?: WorkoutSession
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
  
  const prompt = `
    Eres un coach experto de CrossFit de "Jungle HP". 
    Analiza estos datos y da una recomendación breve (máximo 3 párrafos).
    
    BIENESTAR: Sueño ${wellness.sleepQuality}/5, Estrés ${wellness.stressLevel}/5, Dieta ${wellness.nutrition}/5.
    NOTAS: ${wellness.notes || 'Ninguna'}.
    ${session ? `ÚLTIMO ENTRENO: Score ${session.score}, RPE ${session.rpe}/10.` : ''}
    
    Dime si debe entrenar a tope, escalar o descansar. Responde en español.
  `;

  try {
    if (!API_KEY) throw new Error("API Key no configurada");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "El coach está analizando tus datos... (Error de conexión)";
  }
}
