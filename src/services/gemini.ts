import { GoogleGenerativeAI } from "@google/generative-ai"; // Cambió la importación
import { WellnessEntry, WorkoutSession } from "@/src/types";

// Usamos la variable de entorno, pero agregamos un "respaldo" por si falla
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; 

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateCoachRecommendation(
  wellness: WellnessEntry,
  session?: WorkoutSession
): Promise<string> {
  // El modelo recomendado es gemini-1.5-flash (más rápido y estable)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    Eres un coach experto de CrossFit y rendimiento deportivo de "Jungle HP". 
    Analiza los siguientes datos de un atleta y genera una recomendación breve (máximo 3 párrafos) para su entrenamiento de hoy.
    
    BIENESTAR DIARIO:
    - Calidad de sueño: ${wellness.sleepQuality}/5
    - Estrés percibido: ${wellness.stressLevel}/5
    - Alimentación: ${wellness.nutrition}/5
    - Notas del atleta: ${wellness.notes || 'Ninguna'}
    
    ${session ? `ÚLTIMO ENTRENAMIENTO:
    - Score: ${session.score}
    - RPE: ${session.rpe}/10
    - Sensaciones: ${session.sensations.fatigue ? 'Fatiga alta, ' : ''}${session.sensations.muscularPain ? 'Dolor muscular, ' : ''}${session.sensations.jointPain ? 'Dolores articulares' : ''}
    - Notas post-entreno: ${session.sensations.notes || 'Ninguna'}
    ` : 'No hay datos del último entrenamiento disponible.'}
    
    Considera el "semáforo" de rendimiento:
    Propón si debería entrenar a tope, escalar el WOD, enfocarse en técnica/movilidad, o tomar un descanso activo.
    Responde en español, con un tono motivador pero profesional (estilo Mendoza, Argentina si quieres un toque local).
  `;

  try {
    if (!API_KEY) throw new Error("Falta la API Key de Gemini");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "El coach está analizando tus datos... (Error de conexión con la IA)";
  }
}
