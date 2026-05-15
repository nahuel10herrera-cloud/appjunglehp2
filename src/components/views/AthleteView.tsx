import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/components/auth/AuthProvider';
import { db } from '@/src/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { WellnessEntry, Wod, WorkoutSession, CoachFeedback, UserProfile, Benchmark } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, ChevronRight, CheckCircle2, Activity, Zap, Info, Clock, Weight, Repeat, TrendingUp, Dumbbell, Trophy, Medal, History as HistoryIcon, ClipboardList, Pencil, Check, Calculator, X, Plus, ArrowUpRight } from 'lucide-react';
import { cn, formatDate, getTodayDate } from '@/src/lib/utils';
import { generateCoachRecommendation } from '@/src/services/gemini';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AthleteViewProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function AthleteView({ activeTab = 'home' }: AthleteViewProps) {
  const { profile } = useAuth();
  const [wellness, setWellness] = useState<WellnessEntry | null>(null);
  const [wellnessHistory, setWellnessHistory] = useState<WellnessEntry[]>([]);
  const [todayWods, setTodayWods] = useState<Wod[]>([]);
  const [todayResults, setTodayResults] = useState<Record<string, WorkoutSession>>({});
  const [activeWodForLog, setActiveWodForLog] = useState<Wod | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<WorkoutSession[]>([]);
  const [allWods, setAllWods] = useState<Record<string, Wod>>({});
  const [feedback, setFeedback] = useState<CoachFeedback[]>([]);
  const [leaderboard, setLeaderboard] = useState<(WorkoutSession & { athleteName?: string, athletePhoto?: string })[]>([]);
  const [allAthletes, setAllAthletes] = useState<Record<string, UserProfile>>({});
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Benchmark states
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selectedBenchmarkExercise, setSelectedBenchmarkExercise] = useState<string | null>(null);
  const [showBenchmarkAdd, setShowBenchmarkAdd] = useState(false);
  const [newBenchmarkValue, setNewBenchmarkValue] = useState('');
  const [newBenchmarkMinutes, setNewBenchmarkMinutes] = useState('');
  const [newBenchmarkSeconds, setNewBenchmarkSeconds] = useState('');
  const [benchmarkDate, setBenchmarkDate] = useState(getTodayDate());

  const [selectedItem, setSelectedItem] = useState<{ type: 'wod' | 'wellness', data: any, metric?: string } | null>(null);

  const benchmarkExercises = ['Back Squat', 'Clean & Jerk', 'Snatch', 'Deadlift', 'Fran', 'ISABEL', 'GRACE', 'Burpees (5m)'];

  const isTimeBased = (ex: string | null) => ex && ['Fran', 'ISABEL', 'GRACE'].includes(ex);

  // RM Calculator states
  const [showRMCalculator, setShowRMCalculator] = useState(false);
  const [rmWeight, setRmWeight] = useState('');
  const [shouldRound, setShouldRound] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Fetch all sessions for history
    const historyQuery = query(
      collection(db, 'workout_results'),
      where('athleteId', '==', profile.uid),
      orderBy('date', 'desc'),
      limit(100)
    );

    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      setSessionHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })) as WorkoutSession[]);
    });

    // Fetch all WODs to map titles in history
    const wodsQuery = query(collection(db, 'wods'));
    const unsubWodsMap = onSnapshot(wodsQuery, (snap) => {
      const wMap: Record<string, Wod> = {};
      snap.docs.forEach(d => { wMap[d.id] = { id: d.id, ...d.data() } as Wod; });
      setAllWods(wMap);
    });

    // Fetch wellness history for charts
    const wellnessHistoryQuery = query(
      collection(db, 'wellness_logs'),
      where('athleteId', '==', profile.uid),
      orderBy('date', 'desc'),
      limit(30)
    );
    const unsubWellnessHistory = onSnapshot(wellnessHistoryQuery, (snap) => {
      setWellnessHistory(snap.docs.map(d => d.data() as WellnessEntry).reverse());
    });

    // Fetch Benchmarks
    const benchmarksQuery = query(
      collection(db, 'benchmarks'),
      where('athleteId', '==', profile.uid),
      orderBy('date', 'desc')
    );
    const unsubBenchmarks = onSnapshot(benchmarksQuery, (snap) => {
      setBenchmarks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Benchmark[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'benchmarks');
    });

    return () => {
      unsubHistory();
      unsubWodsMap();
      unsubWellnessHistory();
      unsubBenchmarks();
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    // Fetch all users to map names in leaderboard
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const athletesMap: Record<string, UserProfile> = {};
      snap.docs.forEach(d => {
        athletesMap[d.id] = d.data() as UserProfile;
      });
      setAllAthletes(athletesMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubUsers();
  }, [profile]);

  useEffect(() => {
    if (todayWods.length === 0) {
      setLeaderboard([]);
      return;
    }

    const primaryWod = todayWods[0];

    // Fetch sessions for today's primary WOD
    const leaderboardQuery = query(
      collection(db, 'workout_results'),
      where('wodId', '==', primaryWod.id),
      orderBy('score', 'asc'), // Assuming time-based, lower/earlier is better
      limit(20)
    );

    const unsubLeaderboard = onSnapshot(leaderboardQuery, (snap) => {
      setLeaderboard(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        athleteName: allAthletes[d.data().athleteId]?.displayName || 'Atleta',
        athletePhoto: allAthletes[d.data().athleteId]?.photoURL
      })) as any);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workout_results');
    });

    return () => unsubLeaderboard();
  }, [todayWods, allAthletes]);

  // Form states
  const [showWellnessForm, setShowWellnessForm] = useState(false);
  const [isEditingWellness, setIsEditingWellness] = useState(false);
  const [wellnessData, setWellnessData] = useState({
    sleep: 3,
    stress: 3,
    nutrition: 3,
    notes: ''
  });

  const [showLogForm, setShowLogForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [logData, setLogData] = useState({
    scoreValue: '',
    scoreMinutes: '',
    scoreSeconds: '',
    scoreType: 'weight' as 'time' | 'weight' | 'reps',
    modality: 'Rx' as 'Rx' | 'Scaled',
    rpe: 7,
    notes: '',
    muscularPain: false,
    jointPain: false,
    fatigue: false
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const today = getTodayDate();

  useEffect(() => {
    if (!profile) return;

    // Check today's wellness using deterministic ID
    const wellnessDocRef = doc(db, 'wellness_logs', `${profile.uid}_${today}`);
    const unsubWellness = onSnapshot(wellnessDocRef, (docSnap) => {
      setWellness(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as WellnessEntry : null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `wellness_logs/${profile.uid}_${today}`);
    });

    // Check latest session
    const sQuery = query(
      collection(db, 'workout_results'),
      where('athleteId', '==', profile.uid),
      orderBy('date', 'desc'),
      limit(1)
    );
    const unsubSession = onSnapshot(sQuery, (snap) => {
      setLastSession(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkoutSession);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workout_results');
    });

    // Latest feedback
    const fQuery = query(
      collection(db, 'coach_feedback'),
      where('athleteId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubFeedback = onSnapshot(fQuery, (snap) => {
      setFeedback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CoachFeedback[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coach_feedback');
    });

    // Today's WODs (plural)
    const wodQuery = query(
      collection(db, 'wods'),
      where('date', '==', today),
      orderBy('createdAt', 'desc')
    );

    const unsubWod = onSnapshot(wodQuery, (snap) => {
      setTodayWods(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wods');
    });

    // Today's specific results for those WODs
    const todayResultsQuery = query(
      collection(db, 'workout_results'),
      where('athleteId', '==', profile.uid),
      where('date', '==', today)
    );

    const unsubTodayResults = onSnapshot(todayResultsQuery, (snap) => {
      const resultsMap: Record<string, WorkoutSession> = {};
      snap.docs.forEach(d => {
        const data = d.data() as WorkoutSession;
        resultsMap[data.wodId] = { id: d.id, ...data };
      });
      setTodayResults(resultsMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workout_results');
    });

    return () => {
      unsubWellness();
      unsubSession();
      unsubFeedback();
      unsubWod();
      unsubTodayResults();
    };
  }, [profile, today]);

  const handleWellnessSubmit = async () => {
    if (!profile) return;
    try {
      const wellnessDocRef = doc(db, 'wellness_logs', `${profile.uid}_${today}`);
      await setDoc(wellnessDocRef, {
        athleteId: profile.uid,
        date: today,
        sleepQuality: wellnessData.sleep,
        stressLevel: wellnessData.stress,
        nutrition: wellnessData.nutrition,
        notes: wellnessData.notes,
        updatedAt: serverTimestamp(),
        // Only set createdAt if it's a new document
        ...(!wellness && { createdAt: serverTimestamp() })
      }, { merge: true });
      
      setToast({ message: isEditingWellness ? 'Estado actualizado' : 'Check-in completado', type: 'success' });
      setShowWellnessForm(false);
      setIsEditingWellness(false);
    } catch (e) {
      handleFirestoreError(e, isEditingWellness ? OperationType.UPDATE : OperationType.CREATE, 'wellness_logs');
    }
  };

  const handleAddBenchmark = async () => {
    if (!profile || !selectedBenchmarkExercise) return;
    
    let finalValue = newBenchmarkValue;
    if (isTimeBased(selectedBenchmarkExercise)) {
      if (!newBenchmarkMinutes && !newBenchmarkSeconds) return;
      const mins = newBenchmarkMinutes || '0';
      const secs = newBenchmarkSeconds.padStart(2, '0') || '00';
      finalValue = `${mins}:${secs}`;
    } else {
      if (!newBenchmarkValue) return;
    }

    try {
      // Create a slug for the exercise name to use in the doc ID
      const exerciseSlug = selectedBenchmarkExercise.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const benchmarkId = `${profile.uid}_${exerciseSlug}`;
      
      const docRef = doc(db, 'benchmarks', benchmarkId);
      
      await setDoc(docRef, {
        athleteId: profile.uid,
        exercise: selectedBenchmarkExercise,
        value: finalValue,
        description: selectedBenchmarkExercise === 'ISABEL' ? '30 Snatches for time' : 
                     selectedBenchmarkExercise === 'GRACE' ? '30 Clean & Jerks for time' : '',
        date: benchmarkDate,
        updatedAt: serverTimestamp(),
        // Only set createdAt if new
        createdAt: serverTimestamp()
      }, { merge: true });
      
      setToast({ message: 'Récord personal actualizado', type: 'success' });
      setShowBenchmarkAdd(false);
      setNewBenchmarkValue('');
      setNewBenchmarkMinutes('');
      setNewBenchmarkSeconds('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'benchmarks');
    }
  };

  const handleLogSubmit = async () => {
    if (!profile || !activeWodForLog) return;
    try {
      let fullScore = '';
      if (logData.scoreType === 'time') {
        const mins = logData.scoreMinutes || '0';
        const secs = logData.scoreSeconds.padStart(2, '0') || '00';
        fullScore = `${mins}:${secs}`;
      } else if (logData.scoreType === 'weight') {
        fullScore = `${logData.scoreValue} kg`;
      } else {
        fullScore = `${logData.scoreValue} reps`;
      }

      const payload = {
        athleteId: profile.uid,
        wodId: activeWodForLog.id,
        date: today,
        score: fullScore,
        modality: logData.modality,
        rpe: logData.rpe,
        sensations: {
          muscularPain: logData.muscularPain,
          jointPain: logData.jointPain,
          fatigue: logData.fatigue,
          notes: logData.notes
        },
        updatedAt: serverTimestamp()
      };

      if (isEditing) {
        const existingResult = todayResults[activeWodForLog.id!];
        if (existingResult?.id) {
          await updateDoc(doc(db, 'workout_results', existingResult.id), payload);
          setToast({ message: 'Resultado actualizado correctamente', type: 'success' });
        }
      } else {
        await addDoc(collection(db, 'workout_results'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setToast({ message: 'Resultado guardado con éxito', type: 'success' });
      }
      
      setShowLogForm(false);
      setActiveWodForLog(null);
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'workout_results');
    }
  };

  const calculateReadiness = () => {
    if (!wellness) return null;
    const avg = (wellness.sleepQuality + (6 - wellness.stressLevel) + wellness.nutrition) / 3;
    if (avg >= 4) return { label: 'Go! Entrena a tope', color: 'bg-green-500', text: 'text-green-700' };
    if (avg >= 2.5) return { label: 'Precaución - Escala', color: 'bg-yellow-400', text: 'text-yellow-700' };
    return { label: 'Descanso Activo / Movilidad', color: 'bg-red-500', text: 'text-red-700' };
  };

  const readiness = calculateReadiness();

  const getAiRecommendation = async () => {
    if (!wellness) return;
    setLoadingAi(true);
    const rec = await generateCoachRecommendation(wellness, lastSession || undefined);
    setAiRecommendation(rec);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[100] flex justify-center pointer-events-none"
          >
            <div className={cn(
              "px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl",
              toast.type === 'success' ? "bg-emerald-900/90 border-emerald-500/50 text-white" : "bg-red-900/90 border-red-500/50 text-white"
            )}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-lime-400" /> : <Activity className="w-5 h-5 text-red-400" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <header className="flex justify-between items-end mb-2">
        <div>
          <p className="text-lime-400 font-mono text-[9px] uppercase tracking-[0.3em] mb-0.5 font-black italic">Apex Atleta / {formatDate(today)}</p>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Jungle <span className="text-emerald-500">HP</span></h2>
        </div>
        <div className="flex flex-col items-end">
           <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-9 h-9 rounded-xl border border-zinc-800 shadow-lg shadow-black/50" alt="" />
        </div>
      </header>

      {activeTab === 'benchmarks' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-zinc-100 italic">
              <Trophy className="w-5 h-5 text-emerald-500" />
              Benchmarks
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {benchmarkExercises.map((exercise) => {
              const history = benchmarks.filter(b => b.exercise === exercise).sort((a, b) => a.date.localeCompare(b.date));
              const latest = history[history.length - 1];
              const first = history[0];
              
              let improvement = 0;
              if (history.length > 1) {
                const parseVal = (v: string) => {
                  if (v.includes(':')) {
                    const [m, s] = v.split(':').map(Number);
                    return (m || 0) * 60 + (s || 0);
                  }
                  return parseFloat(v) || 0;
                };
                const v1 = parseVal(first.value);
                const v2 = parseVal(latest.value);
                
                if (v1 > 0) {
                  if (exercise === 'Fran') {
                    // Lower is better for time
                    improvement = ((v1 - v2) / v1) * 100;
                  } else {
                    improvement = ((v2 - v1) / v1) * 100;
                  }
                }
              }

              return (
                <div 
                  key={exercise} 
                  onClick={() => setSelectedBenchmarkExercise(selectedBenchmarkExercise === exercise ? null : exercise)}
                  className={cn(
                    "bg-zinc-900 border border-zinc-800 p-4 rounded-[28px] cursor-pointer transition-all hover:bg-zinc-800/80 relative overflow-hidden group shadow-xl",
                    selectedBenchmarkExercise === exercise && "ring-1 ring-emerald-500"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[8px] font-black uppercase text-zinc-600 mb-0.5 tracking-tighter italic">Personal Best</p>
                      <h4 className="text-xs font-black italic uppercase tracking-tighter text-zinc-100">{exercise}</h4>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-black italic tracking-tighter text-emerald-500 leading-none">
                        {latest ? latest.value : '---'}
                      </p>
                    </div>
                    {improvement !== 0 && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-[8px] font-black italic uppercase",
                          improvement > 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {improvement > 0 ? <Plus className="w-2 h-2" /> : <ChevronRight className="w-2 h-2 rotate-90" />}
                          {Math.abs(improvement).toFixed(0)}%
                        </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {selectedBenchmarkExercise === exercise && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                           <div className="flex justify-between items-center mb-2">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedBenchmarkExercise(exercise);
                                 if (isTimeBased(exercise)) {
                                   const [m, s] = (latest?.value || '').split(':');
                                   setNewBenchmarkMinutes(m || '');
                                   setNewBenchmarkSeconds(s || '');
                                   setNewBenchmarkValue('');
                                 } else {
                                   setNewBenchmarkValue(latest?.value || '');
                                   setNewBenchmarkMinutes('');
                                   setNewBenchmarkSeconds('');
                                 }
                                 setBenchmarkDate(latest?.date || new Date().toISOString().split('T')[0]);
                                 setShowBenchmarkAdd(true);
                               }}
                               className="w-full bg-emerald-600 text-white py-2 rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-emerald-500 transition-colors"
                             >
                               Update PR
                             </button>
                           </div>
                          {history.slice(-3).map((entry, idx) => (
                            <div key={entry.id || idx} className="flex items-center justify-between py-1.5 px-2 bg-zinc-950 rounded-xl border border-zinc-900/50">
                              <span className="text-[8px] font-black text-zinc-600 font-mono italic">{formatDate(entry.date)}</span>
                              <span className="text-[10px] font-black italic text-zinc-100">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-zinc-100 italic">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Rendimiento
            </h3>
          </div>

          {/* Wellness Trend - 30 Days */}
          <section className="bg-zinc-900 rounded-[32px] p-6 border border-zinc-800 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Bienestar (30D)
              </h3>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wellnessHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 7, fontWeight: 900, fill: '#52525b' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis domain={[0, 5]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '9px' }}
                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase' }}
                  />
                  <Line type="monotone" dataKey="sleepQuality" name="Sueño" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="stressLevel" name="Estrés" stroke="#ef4444" strokeWidth={3} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="nutrition" name="Comida" stroke="#a3e635" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Consistencia / Calendar Graph */}
          <section className="bg-zinc-900 rounded-[32px] p-6 border border-zinc-800 shadow-xl overflow-hidden">
            <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 mb-6">
              <HistoryIcon className="w-4 h-4 text-emerald-500" />
              Consistencia
            </h3>
            
            <div className="flex flex-wrap gap-1.5 justify-center">
              {Array.from({ length: 30 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const dateStr = d.toISOString().split('T')[0];
                const hasSession = sessionHistory.some(s => s.date === dateStr);
                
                return (
                  <div 
                    key={i}
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[7px] font-black transition-all",
                      hasSession ? "bg-emerald-600 text-white shadow-lg" : "bg-zinc-950 text-zinc-800 border border-zinc-900/50"
                    )}
                    title={dateStr}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AnimatePresence mode="wait">
            {!selectedItem ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* WOD de Hoy - Destacada */}
                <div className="space-y-3">
                  {todayWods.length > 0 ? (
                    todayWods.map((wod) => (
                      <motion.div
                        key={wod.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedItem({ type: 'wod', data: wod })}
                        className="bg-emerald-600 p-8 rounded-[40px] cursor-pointer group relative overflow-hidden transition-all shadow-2xl shadow-emerald-900/20"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Dumbbell className="w-32 h-32 text-white" />
                        </div>
                        <div className="flex justify-between items-start relative z-10 mb-8">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
                            todayResults[wod.id!] ? "bg-white text-emerald-600 shadow-white/20" : "bg-emerald-700 text-white"
                          )}>
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-black bg-emerald-700/50 px-4 py-1.5 rounded-full text-white uppercase tracking-[0.2em] italic">
                            WOD DE HOY
                          </span>
                        </div>
                        <div className="relative z-10">
                          <p className="text-[9px] font-black uppercase text-emerald-100 tracking-widest mb-1 italic opacity-80">{wod.type || 'Workout'}</p>
                          <h4 className="text-4xl font-black italic tracking-tighter uppercase leading-tight text-white mb-4 line-clamp-2">{wod.title}</h4>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-emerald-200" />
                              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest italic">{formatDate(wod.date)}</p>
                            </div>
                            {todayResults[wod.id!] && (
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-lime-400" />
                                <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Completado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-16 text-center bg-zinc-900/50 rounded-[40px] border border-dashed border-zinc-800 translate-y-0">
                      <p className="text-zinc-400 font-black uppercase text-xl tracking-widest italic mb-2">Día de descanso activo</p>
                      <p className="text-emerald-500 font-mono text-[9px] uppercase tracking-[0.3em] font-black italic">Muévete lento, recupera fuerte.</p>
                    </div>
                  )}
                </div>

                {/* Hero Dashboard Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Wellness Metrics as Cards */}
                  {[
                    { id: 'sleep', label: 'Sueño', icon: <Clock className="w-5 h-5 text-indigo-400" />, value: wellness?.sleepQuality, color: wellness?.sleepQuality ? (wellness.sleepQuality >= 4 ? 'emerald' : wellness.sleepQuality >= 2 ? 'yellow' : 'red') : 'zinc' },
                    { id: 'stress', label: 'Estrés', icon: <Zap className="w-5 h-5 text-orange-400" />, value: wellness?.stressLevel, color: wellness?.stressLevel ? (wellness.stressLevel <= 2 ? 'emerald' : wellness.stressLevel <= 4 ? 'yellow' : 'red') : 'zinc' },
                    { id: 'nutrition', label: 'Nutrición', icon: <Activity className="w-5 h-5 text-lime-400" />, value: wellness?.nutrition, color: wellness?.nutrition ? (wellness.nutrition >= 4 ? 'emerald' : wellness.nutrition >= 2 ? 'yellow' : 'red') : 'zinc' },
                    { id: 'fatigue', label: 'Fatiga', icon: <TrendingUp className="w-5 h-5 text-rose-400" />, value: lastSession?.rpe || 0, color: lastSession?.rpe ? (lastSession.rpe <= 5 ? 'emerald' : lastSession.rpe <= 8 ? 'yellow' : 'red') : 'zinc' }
                  ].map((metric) => (
                    <motion.div
                      key={metric.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedItem({ type: 'wellness', data: wellness, metric: metric.id })}
                      className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-4 rounded-[28px] cursor-pointer flex flex-col justify-between aspect-square transition-all hover:bg-zinc-900 shadow-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center",
                          metric.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                          metric.color === 'yellow' ? "bg-yellow-500/10 text-yellow-500" :
                          metric.color === 'red' ? "bg-red-500/10 text-red-500" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {metric.icon}
                        </div>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          metric.color === 'emerald' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                          metric.color === 'yellow' ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" :
                          metric.color === 'red' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-zinc-700"
                        )} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">{metric.label}</p>
                        <p className="text-2xl font-black italic text-white leading-none">
                          {metric.value || '--'}<span className="text-[10px] opacity-30 not-italic ml-1 font-sans">/5</span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Status Bar */}
                <div className="bg-emerald-700/10 border border-emerald-500/20 rounded-[32px] p-6 flex items-center justify-between shadow-xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1 italic">Nivel de Readiness</p>
                    <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                      {readiness?.label || 'Pendiente Check-in'}
                    </h4>
                  </div>
                  {!wellness && (
                    <button 
                      onClick={() => setShowWellnessForm(true)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-700/20 active:scale-95 transition-all hover:bg-emerald-500"
                    >
                      Realizar Check-in
                    </button>
                  )}
                </div>

                {/* AI & Feedback Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Zap className="w-12 h-12 text-lime-400" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] font-black italic uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-500">
                            <Zap className="w-3.5 h-3.5 text-lime-400" />
                            Coach Advisor (AI)
                          </h3>
                        </div>
                        {aiRecommendation ? (
                          <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/20 relative group">
                            <p className="text-xs text-zinc-300 leading-relaxed italic">"{aiRecommendation}"</p>
                            <button onClick={() => setAiRecommendation(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ) : (
                          <button 
                            onClick={getAiRecommendation}
                            disabled={loadingAi || !wellness}
                            className="w-full py-6 bg-zinc-950 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 text-[10px] font-black uppercase tracking-widest hover:border-emerald-500/30 hover:text-emerald-500 transition-all disabled:opacity-50"
                          >
                            {loadingAi ? 'Sincronizando...' : !wellness ? 'Completa Check-in primero' : 'Analizar Estado'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-xl text-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black italic uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-500">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                          Feedback Reciente
                        </h3>
                        <span className="text-[8px] text-zinc-700 uppercase font-black">Latest</span>
                      </div>
                      <div className="space-y-2">
                        {feedback.length > 0 ? feedback.slice(0, 2).map((f) => (
                           <div key={f.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                             <p className="text-xs text-zinc-400 italic line-clamp-2">"{f.content}"</p>
                           </div>
                        )) : <p className="text-[10px] text-zinc-700 font-black italic text-center py-4 uppercase tracking-[0.2em]">Bandeja vacía</p>}
                      </div>
                    </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 bg-black flex flex-col p-6 overflow-y-auto"
              >
                {/* Header Detailed View */}
                <div className="flex justify-between items-center mb-10">
                  <motion.button 
                    whileHover={{ x: -4 }}
                    onClick={() => setSelectedItem(null)}
                    className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-7 h-7" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] font-mono italic">Volver</span>
                  </motion.button>
                  <div className="h-0.5 flex-1 mx-8 bg-zinc-900 rounded-full" />
                  <div className="bg-zinc-900 px-6 py-2 rounded-full border border-zinc-800 shadow-xl">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                      Detail / {selectedItem.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedItem.type === 'wod' ? (
                  <div className="max-w-4xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-600 text-white text-[12px] font-black px-4 py-1.5 rounded-full uppercase italic tracking-tighter">
                          {selectedItem.data.type || 'Workout'}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <span className="text-zinc-500 font-mono text-[11px] font-bold tracking-widest">{formatDate(selectedItem.data.date)}</span>
                      </div>
                      <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.85] text-white">
                        {selectedItem.data.title}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <div className="space-y-6">
                        <div className="bg-zinc-900/50 p-10 rounded-[48px] border border-zinc-800 backdrop-blur-xl shadow-2xl">
                           <h3 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.3em] mb-8 italic flex items-center gap-3">
                             <div className="w-4 h-0.5 bg-emerald-500" />
                             Programación
                           </h3>
                           <p className="text-2xl text-zinc-100 leading-tight font-black uppercase italic tracking-tighter whitespace-pre-wrap">
                             {selectedItem.data.description}
                           </p>
                        </div>

                        {selectedItem.data.coachNotes && (
                          <div className="bg-emerald-950/10 p-10 rounded-[48px] border border-emerald-500/10 backdrop-blur-xl shadow-2xl">
                            <h3 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.3em] mb-6 italic">Notas de Estrategia</h3>
                            <p className="text-zinc-400 italic font-medium leading-relaxed text-lg">
                              {selectedItem.data.coachNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {/* Status / Logger Card */}
                        {todayResults[selectedItem.data.id!] ? (
                          <div className="bg-zinc-900 p-10 rounded-[48px] border border-emerald-500/20 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 p-10 opacity-5">
                              <Trophy className="w-48 h-48 text-emerald-500" />
                            </div>
                            <div className="relative z-10">
                              <h3 className="text-[11px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-10 italic">Tu Resultado Registrado</h3>
                              <div className="flex items-end gap-4 mb-10">
                                <span className="text-8xl font-black italic tracking-tighter text-emerald-500 leading-none">
                                  {todayResults[selectedItem.data.id!].score}
                                </span>
                                <span className="bg-zinc-800 px-4 py-1.5 rounded-xl text-[12px] font-black text-zinc-400 uppercase mb-3">
                                  {todayResults[selectedItem.data.id!].modality}
                                </span>
                              </div>
                              <div className="flex gap-4">
                                <div className="bg-zinc-950 p-6 rounded-[32px] border border-zinc-800 flex-1">
                                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-2 tracking-widest italic">Intensidad</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                    <span className="text-2xl font-black text-white italic">{todayResults[selectedItem.data.id!].rpe}<span className="text-xs opacity-20 ml-1">/10</span></span>
                                  </div>
                                </div>
                                <motion.button 
                                  whileHover={{ rotate: 90 }}
                                  onClick={() => {
                                    const result = todayResults[selectedItem.data.id!];
                                    let scoreVal = '';
                                    let scoreMins = '';
                                    let scoreSecs = '';
                                    let type: 'time' | 'weight' | 'reps' = 'weight';

                                    if (result.score.includes(':')) {
                                      type = 'time';
                                      const [m, s] = result.score.split(':');
                                      scoreMins = m;
                                      scoreSecs = s;
                                    } else if (result.score.toLowerCase().includes('kg')) {
                                      type = 'weight';
                                      scoreVal = result.score.split(' ')[0];
                                    } else if (result.score.toLowerCase().includes('reps')) {
                                      type = 'reps';
                                      scoreVal = result.score.split(' ')[0];
                                    }

                                    setLogData({
                                      scoreValue: scoreVal || '',
                                      scoreMinutes: scoreMins || '',
                                      scoreSeconds: scoreSecs || '',
                                      scoreType: type,
                                      modality: result.modality || 'Rx',
                                      rpe: result.rpe || 7,
                                      notes: result.sensations?.notes || '',
                                      muscularPain: result.sensations?.muscularPain || false,
                                      jointPain: result.sensations?.jointPain || false,
                                      fatigue: result.sensations?.fatigue || false
                                    });
                                    setActiveWodForLog(selectedItem.data);
                                    setIsEditing(true);
                                    setShowLogForm(true);
                                  }}
                                  className="bg-zinc-800 text-white w-20 h-20 rounded-[32px] flex items-center justify-center hover:bg-zinc-700 transition-colors border border-zinc-700 shadow-xl"
                                >
                                  <Pencil className="w-6 h-6" />
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-600 p-10 rounded-[56px] shadow-2xl shadow-emerald-700/30 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group">
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ repeat: Infinity, duration: 4 }}
                              className="w-24 h-24 bg-white/20 rounded-[40px] flex items-center justify-center backdrop-blur-md"
                            >
                              <Trophy className="w-12 h-12 text-white" />
                            </motion.div>
                            <div>
                              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Log Today's Performance</h3>
                              <p className="text-emerald-100 text-[11px] font-black uppercase tracking-[0.2em] mt-2 opacity-80 italic">Registra tu progreso en la comunidad</p>
                            </div>
                            <button 
                              onClick={() => {
                                setActiveWodForLog(selectedItem.data);
                                setIsEditing(false);
                                setLogData({
                                  scoreValue: '',
                                  scoreMinutes: '',
                                  scoreSeconds: '',
                                  scoreType: 'weight',
                                  modality: 'Rx',
                                  rpe: 7,
                                  notes: '',
                                  muscularPain: false,
                                  jointPain: false,
                                  fatigue: false
                                });
                                setShowLogForm(true);
                              }}
                              className="w-full bg-white text-zinc-950 py-6 rounded-[32px] text-sm font-black uppercase tracking-widest shadow-2xl transform transition-transform active:scale-95 hover:-translate-y-1"
                            >
                              Finalizar & Registrar
                            </button>
                          </div>
                        )}

                        <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[48px] shadow-2xl">
                          <div className="flex justify-between items-center mb-10">
                            <h3 className="text-[11px] font-black uppercase text-zinc-600 tracking-[0.3em] italic">Leaderboard de Hoy</h3>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="space-y-6">
                            {leaderboard.filter(l => l.wodId === selectedItem.data.id).length > 0 ? (
                              leaderboard.filter(l => l.wodId === selectedItem.data.id).slice(0, 5).map((entry, idx) => (
                                <div key={entry.id} className="flex items-center justify-between group">
                                  <div className="flex items-center gap-4">
                                    <span className={cn("text-[11px] font-black font-mono italic", idx === 0 ? "text-lime-400" : "text-zinc-700")}>
                                      {idx + 1}
                                    </span>
                                    <img src={entry.athletePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.athleteId}`} className="w-10 h-10 rounded-2xl border border-zinc-800 group-hover:scale-110 transition-transform" alt="" />
                                    <span className="text-sm font-black italic uppercase text-zinc-200 tracking-tighter">{entry.athleteName}</span>
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black italic text-white tracking-tighter">{entry.score.split(' ')[0]}</span>
                                    <span className="text-[10px] text-zinc-600 font-black italic uppercase">{entry.score.split(' ')[1] || ''}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                               <p className="text-center text-[11px] text-zinc-700 font-black italic py-6 uppercase tracking-widest">Inicia la competencia de hoy</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
                    <div className="text-center space-y-6">
                      <div className="inline-flex items-center justify-center w-32 h-32 bg-zinc-900 rounded-[48px] border border-zinc-800 shadow-2xl relative">
                        <div className="absolute inset-0 bg-zinc-500/5 blur-3xl rounded-full" />
                        {selectedItem.metric === 'sleep' && <Clock className="w-12 h-12 text-indigo-400 relative z-10" />}
                        {selectedItem.metric === 'stress' && <Zap className="w-12 h-12 text-orange-400 relative z-10" />}
                        {selectedItem.metric === 'nutrition' && <Activity className="w-12 h-12 text-lime-400 relative z-10" />}
                        {selectedItem.metric === 'fatigue' && <TrendingUp className="w-12 h-12 text-rose-400 relative z-10" />}
                      </div>
                      <div>
                        <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-white mb-3">
                          {selectedItem.metric === 'sleep' ? 'Sueño' : 
                          selectedItem.metric === 'stress' ? 'Estrés' :
                          selectedItem.metric === 'nutrition' ? 'Energía' : 'Fatiga'}
                        </h2>
                        <p className="text-zinc-600 font-black uppercase text-[12px] tracking-[0.4em] italic">Bio-Marcador del Atleta</p>
                      </div>
                    </div>

                    <div className="bg-zinc-900 rounded-[56px] p-12 border border-zinc-800 shadow-3xl flex flex-col items-center gap-10">
                      <div className="text-center">
                        <p className="text-[11px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-6 italic">Puntuación Hoy</p>
                        <div className="text-9xl font-black italic text-emerald-500 tracking-tighter leading-none flex items-baseline justify-center">
                           {((selectedItem.metric === 'sleep' ? wellness?.sleepQuality : 
                              selectedItem.metric === 'stress' ? wellness?.stressLevel :
                              selectedItem.metric === 'nutrition' ? wellness?.nutrition : lastSession?.rpe) || '--')}
                           <span className="text-3xl not-italic text-zinc-850 ml-6">/5</span>
                        </div>
                      </div>

                      <div className="w-full flex flex-col gap-8">
                         <div className="bg-zinc-950 p-8 rounded-[40px] border border-zinc-800 shadow-inner">
                           <h4 className="text-[11px] font-black uppercase text-zinc-700 tracking-[0.3em] mb-8 italic text-center">Gráfica Semanal</h4>
                           <div className="h-48 w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={wellnessHistory.slice(-7)}>
                                  <Line 
                                    type="monotone" 
                                    dataKey={selectedItem.metric === 'sleep' ? 'sleepQuality' : 
                                             selectedItem.metric === 'stress' ? 'stressLevel' : 'nutrition'} 
                                    stroke="#10b981" 
                                    strokeWidth={6} 
                                    dot={{ r: 6, fill: '#10b981', strokeWidth: 0 }} 
                                    activeDot={{ r: 8, strokeWidth: 0, fill: '#6EE7B7' }}
                                  />
                                  <Tooltip 
                                    contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '16px', color: '#fff', fontSize: '10px' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}
                                  />
                                </LineChart>
                             </ResponsiveContainer>
                           </div>
                         </div>
                         
                         {wellness?.notes && (
                           <div className="bg-zinc-950/50 p-8 rounded-[40px] border border-zinc-800">
                             <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-4 italic">Observaciones Bio-químicas</h4>
                             <p className="text-zinc-300 italic text-lg leading-relaxed font-medium">"{wellness.notes}"</p>
                           </div>
                         )}
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (wellness) {
                            setWellnessData({
                              sleep: wellness.sleepQuality,
                              stress: wellness.stressLevel,
                              nutrition: wellness.nutrition,
                              notes: wellness.notes || ''
                            });
                            setIsEditingWellness(true);
                            setShowWellnessForm(true);
                          } else {
                            setShowWellnessForm(true);
                          }
                        }}
                        className="w-full bg-white text-zinc-950 py-6 rounded-[32px] text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl"
                      >
                        Recalibrar Estado
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-zinc-100">
              <HistoryIcon className="w-5 h-5 text-emerald-500" />
              Historial
            </h3>
          </div>
          
          <div className="space-y-2">
            {sessionHistory.length > 0 ? (
              sessionHistory.map((session) => (
                <div key={session.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-xl flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800">
                       {session.score.includes(':') ? <Clock className="w-4 h-4 text-emerald-500" /> : 
                        session.score.toLowerCase().includes('kg') ? <Weight className="w-4 h-4 text-emerald-500" /> : 
                        <Repeat className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase font-black">{formatDate(session.date)}</p>
                      <h4 className="text-sm font-black italic uppercase tracking-tighter text-zinc-100">
                        {allWods[session.wodId]?.title || 'WOD'}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-base font-black italic text-emerald-500 leading-none">{session.score.split(' ')[0]}</p>
                       <p className="text-[8px] font-black uppercase text-zinc-600 tracking-tighter">{session.score.split(' ')[1] || (session.score.includes(':') ? 'Tiempo' : '')}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800">
                       <span className="text-[10px] font-black italic text-zinc-500">{session.rpe}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-zinc-900 rounded-[32px] p-20 border border-zinc-800 text-center opacity-50">
                <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Sin registros</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'wods' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 text-zinc-100">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              Programación
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {Object.values(allWods).sort((a,b) => b.date.localeCompare(a.date)).map((wod) => (
              <div key={wod.id} className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-xl relative overflow-hidden group hover:bg-zinc-800/50 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Dumbbell className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="flex justify-between items-start mb-1">
                   <p className="text-[8px] font-mono text-emerald-500 uppercase font-black tracking-widest italic">{formatDate(wod.date)}</p>
                </div>
                <h4 className="text-md font-black italic uppercase tracking-tighter text-zinc-100 group-hover:text-white transition-colors">{wod.title}</h4>
                <p className="text-zinc-500 text-[10px] italic line-clamp-1 mt-1">"{wod.description}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms Modals */}
      <AnimatePresence>
        {showWellnessForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 p-10 rounded-[48px] w-full max-w-md border border-slate-800 shadow-2xl"
            >
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-2">{isEditingWellness ? 'Update Wellness' : 'Daily Forge'}</h3>
              <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-10">{isEditingWellness ? 'Refining status' : 'Status Check-in'}</p>
              
              <div className="space-y-8">
                {[
                  { label: 'Sleep Qual.', key: 'sleep', icon: '🌙' },
                  { label: 'Stress Level', key: 'stress', icon: '🧠' },
                  { label: 'Vitality', key: 'nutrition', icon: '🥗' }
                ].map((q) => (
                  <div key={q.key}>
                    <div className="flex justify-between mb-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{q.icon} {q.label}</label>
                      <span className="text-xs font-black italic text-lime-400">SCORE: {(wellnessData as any)[q.key]} / 5</span>
                    </div>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(v => (
                         <button
                           key={v}
                           onClick={() => setWellnessData({...wellnessData, [q.key]: v})}
                           className={cn(
                             "flex-1 h-10 rounded-lg text-xs font-black transition-all",
                             (wellnessData as any)[q.key] === v ? "bg-emerald-700 text-white scale-105 shadow-lg shadow-emerald-700/20" : "bg-slate-800 text-slate-500 hover:bg-slate-750"
                           )}
                         >
                           {v}
                         </button>
                       ))}
                    </div>
                  </div>
                ))}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-slate-400 italic">Physical & Mental Notes</label>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder-slate-700 text-slate-300"
                    placeholder="Soreness, fatigue, mood..."
                    rows={3}
                    value={wellnessData.notes}
                    onChange={(e) => setWellnessData({...wellnessData, notes: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowWellnessForm(false); setIsEditingWellness(false); }} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">Abort</button>
                  <button onClick={handleWellnessSubmit} className="flex-2 bg-white text-slate-950 py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95">
                    {isEditingWellness ? 'Update Sync' : 'Sync Performance'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 p-10 rounded-[48px] w-full max-w-md border border-slate-800 shadow-2xl"
            >
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-2 leading-none text-slate-100">
                {isEditing ? 'Update Score' : 'Log Session'}
              </h3>
              <p className="text-center text-lime-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10">{activeWodForLog?.title}</p>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    {[
                      { id: 'time', label: 'Tiempo', icon: Clock },
                      { id: 'weight', label: 'Kilos', icon: Weight },
                      { id: 'reps', label: 'Reps', icon: Repeat }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setLogData({ ...logData, scoreType: m.id as any })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          logData.scoreType === m.id ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        <m.icon className="w-3 h-3" />
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block italic">
                        {logData.scoreType === 'time' ? 'Resultado' : 'Valor'}
                      </label>
                      
                      {logData.scoreType === 'time' ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            placeholder="0"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xl font-black italic text-center outline-none focus:border-emerald-700 transition-all text-lime-400"
                            value={logData.scoreMinutes}
                            onChange={(e) => setLogData({...logData, scoreMinutes: e.target.value})}
                          />
                          <span className="text-xl font-black text-slate-700">:</span>
                          <input 
                            type="number"
                            placeholder="00"
                            max="59"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xl font-black italic text-center outline-none focus:border-emerald-700 transition-all text-lime-400"
                            value={logData.scoreSeconds}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 59) return;
                              setLogData({...logData, scoreSeconds: e.target.value});
                            }}
                          />
                        </div>
                      ) : (
                        <input 
                          type="number"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xl font-black italic text-center outline-none focus:border-emerald-700 transition-all uppercase tracking-tighter text-lime-400 placeholder-slate-800"
                          placeholder="0"
                          value={logData.scoreValue}
                          onChange={(e) => setLogData({...logData, scoreValue: e.target.value})}
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block italic">Modalidad</label>
                      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                        {(['Rx', 'Scaled'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setLogData({ ...logData, modality: m })}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              logData.modality === m ? "bg-emerald-700 text-white" : "text-slate-500"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Exertion (RPE)</label>
                    <span className="text-sm font-black italic text-lime-400">{logData.rpe} / 10</span>
                  </div>
                  <div className="flex gap-1">
                       {[6,7,8,9,10].map(v => (
                         <button
                           key={v}
                           onClick={() => setLogData({...logData, rpe: v})}
                           className={cn(
                             "flex-1 h-10 rounded text-[10px] font-black transition-all",
                             logData.rpe === v ? "bg-emerald-700 text-white shadow-lg shadow-emerald-700/20" : "bg-slate-800 text-slate-500"
                           )}
                         >
                           {v}
                         </button>
                       ))}
                    </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest mb-4 block text-slate-500 italic text-center">Physical Sensations</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'muscularPain', label: 'MUSCLE' },
                      { id: 'jointPain', label: 'JOINT' },
                      { id: 'fatigue', label: 'FATIGUE' }
                    ].map((s) => (
                      <button 
                        key={s.id}
                        onClick={() => setLogData({...logData, [s.id]: !(logData as any)[s.id]})}
                        className={cn(
                          "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                          (logData as any)[s.id] ? "bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-700/20" : "bg-slate-950 text-slate-600 border-slate-800"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder-slate-700 text-slate-300"
                    placeholder="Scaling, modifications, notes..."
                    rows={2}
                    value={logData.notes || ''}
                    onChange={(e) => setLogData({...logData, notes: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => { setShowLogForm(false); setIsEditing(false); }} className="flex-1 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Abort</button>
                  <button onClick={handleLogSubmit} className="flex-2 bg-emerald-700 text-white py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 shadow-emerald-700/20">
                    {isEditing ? 'Update Results' : 'Commit Score'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRMCalculator && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 w-full max-w-sm rounded-[48px] border border-slate-800 shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-lime-400" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Calculador RM</h3>
                </div>
                <button 
                  onClick={() => setShowRMCalculator(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* 1RM Input */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block italic">Ingresa tu 1RM (Kg)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      placeholder="0"
                      value={rmWeight}
                      onChange={(e) => setRmWeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-3xl font-black italic tracking-tighter text-lime-400 outline-none focus:border-emerald-700 transition-all placeholder-slate-900"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 font-black italic">KG</div>
                  </div>
                </div>

                {/* Rounding Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Redondear (2.5kg)</span>
                  <button 
                    onClick={() => setShouldRound(!shouldRound)}
                    className={cn(
                      "w-10 h-6 rounded-full transition-colors relative flex items-center px-1",
                      shouldRound ? "bg-emerald-600" : "bg-slate-800"
                    )}
                  >
                    <motion.div 
                      animate={{ x: shouldRound ? 16 : 0 }}
                      className="w-4 h-4 bg-white rounded-full shadow-md" 
                    />
                  </button>
                </div>

                {/* Results Table */}
                <div className="grid grid-cols-2 gap-3">
                  {[50, 60, 70, 75, 80, 85, 90, 95].map((pct) => {
                    const baseWeight = parseFloat(rmWeight) || 0;
                    let calculated = (baseWeight * pct) / 100;
                    if (shouldRound && calculated > 0) {
                      calculated = Math.round(calculated / 2.5) * 2.5;
                    }
                    return (
                      <div key={pct} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-700 mb-1">{pct}%</span>
                        <span className="text-xl font-black italic text-lime-400">
                          {calculated > 0 ? calculated.toFixed(shouldRound ? 1 : 2) : '0'}
                          <span className="text-[10px] ml-1 text-slate-600">KG</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setShowRMCalculator(false)}
                  className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-700/20 active:scale-95 transition-all mt-4"
                >
                  Continuar Entrenamiento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBenchmarkAdd && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 w-full max-w-sm rounded-[48px] border border-slate-800 shadow-2xl relative overflow-hidden"
            >
              <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-100 italic">Actualizar PR</h3>
                </div>
                <button 
                  onClick={() => setShowBenchmarkAdd(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block italic">Ejercicio</label>
                  <p className="text-2xl font-black italic uppercase tracking-tighter text-lime-400">{selectedBenchmarkExercise}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block italic">Valor (Kg / Tiempo / Reps)</label>
                  {isTimeBased(selectedBenchmarkExercise) ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-1 text-center">Minutos</p>
                        <input 
                          type="number"
                          placeholder="0"
                          value={newBenchmarkMinutes}
                          onChange={(e) => setNewBenchmarkMinutes(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-2xl font-black italic tracking-tighter text-lime-400 outline-none focus:border-emerald-700 transition-all text-center"
                        />
                      </div>
                      <span className="text-2xl font-black text-slate-700 mt-4">:</span>
                      <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-1 text-center">Segundos</p>
                        <input 
                          type="number"
                          placeholder="00"
                          max="59"
                          value={newBenchmarkSeconds}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val > 59) return;
                            setNewBenchmarkSeconds(e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-2xl font-black italic tracking-tighter text-lime-400 outline-none focus:border-emerald-700 transition-all text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <input 
                      type="text"
                      placeholder="0kg"
                      value={newBenchmarkValue}
                      onChange={(e) => setNewBenchmarkValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-3xl font-black italic tracking-tighter text-lime-400 outline-none focus:border-emerald-700 transition-all placeholder-slate-900"
                    />
                  )}
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block italic">Fecha del Récord</label>
                   <input 
                    type="date"
                    value={benchmarkDate}
                    onChange={(e) => setBenchmarkDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-black italic uppercase text-slate-300 outline-none focus:border-emerald-700 transition-all"
                  />
                </div>

                <button 
                  onClick={handleAddBenchmark}
                  className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-700/20 active:scale-95 transition-all mt-4"
                >
                  Actualizar Salón de la Fama
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
