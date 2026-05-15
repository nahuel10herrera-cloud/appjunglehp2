import { GoogleGenAI } from "@google/genai";
import { WellnessEntry, WorkoutSession } from "@/src/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateCoachRecommendation(
  wellness: WellnessEntry,
  session?: WorkoutSession
): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Eres un coach experto de CrossFit. Analiza los siguientes datos de un atleta y genera una recomendación breve (máximo 3 párrafos) para su entrenamiento de hoy.
    
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
    Responde en español, con un tono motivador pero profesional.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "No se pudo generar la recomendación en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA del coach.";
  }
}
