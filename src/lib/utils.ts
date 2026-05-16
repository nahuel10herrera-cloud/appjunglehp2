import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
  // Adjust to make Monday the first day (1)
  const day = now.getDate();
  const diffToMonday = day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  
  const monday = new Date(new Date().setDate(diffToMonday));
  const sunday = new Date(new Date().setDate(diffToMonday + 6));

  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: format(monday),
    end: format(sunday)
  };
}
// Al final de src/lib/utils.ts

export const parseScoreToNumber = (score: string, type: 'time' | 'weight' | 'reps'): number => {
  if (!score) return 0;
  
  if (type === 'time') {
    // Convierte "10:30" -> 630 (segundos totales)
    const [minutes, seconds] = score.split(':').map(Number);
    return (minutes * 60) + (seconds || 0);
  }
  
  // Para kilos o repeticiones, limpia el texto y lo hace número puro
  // Ej: "100kg" -> 100
  return parseFloat(score.replace(/[^0-9.]/g, '')) || 0;
};
