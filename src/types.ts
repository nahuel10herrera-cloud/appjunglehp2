export type UserRole = 'athlete' | 'coach';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  lastLogin?: any;
  location?: string;
}

export interface WellnessEntry {
  id?: string;
  athleteId: string;
  date: string;
  sleepQuality: number; // 1-5
  stressLevel: number; // 1-5
  nutrition: number; // 1-5
  notes?: string;
  createdAt: string;
}

export interface Wod {
  id?: string;
  coachId: string;
  date: string;
  title: string;
  description: string;
  type?: string; // AMRAP, EMOM, etc.
  components: {
    type: string;
    details: string;
  }[];
  createdAt: string;
}

export interface WorkoutSession {
  id?: string;
  athleteId: string;
  wodId: string;
  date: string;
  score: string;
  modality: 'Rx' | 'Scaled';
  rpe: number; // 1-10
  sensations: {
    muscularPain: boolean;
    jointPain: boolean;
    fatigue: boolean;
    notes: string;
  };
  createdAt: any;
}

export interface CoachFeedback {
  id?: string;
  coachId: string;
  athleteId: string;
  targetId: string;
  targetType: 'wellness' | 'session';
  content: string;
  createdAt: string;
}

export interface Benchmark {
  id?: string;
  athleteId: string;
  exercise: string;
  value: string;
  date: string;
  createdAt: any;
}
