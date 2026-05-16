import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/components/auth/AuthProvider';
import { db } from '@/src/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  doc, 
  setDoc, 
  limit, 
  deleteDoc 
} from 'firebase/firestore';
import { UserProfile, WellnessEntry, Wod, WorkoutSession, CoachFeedback } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Plus, 
  MessageSquare, 
  Send, 
  ChevronRight, 
  Search, 
  Activity, 
  History as HistoryIcon, 
  Clock, 
  Weight, 
  Repeat, 
  FileText, 
  Trophy, 
  Medal, 
  LayoutDashboard, 
  Share2, 
  ArrowUpRight, 
  TrendingUp, 
  Dumbbell, 
  AlertTriangle, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange, parseScoreToNumber } from '@/src/lib/utils';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team';
  onTabChange?: (tab: string) => void;
}

/**
 * COMPONENTE DE RANKING (Leaderboard dinámico)
 * Se encarga de ordenar los resultados matemáticamente según el tipo de WOD.
 */
function WodRanking({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!wodId) return;
    
    // Regla de Ordenamiento Profesional:
    // Tiempo -> Ascendente (El más rápido arriba)
    // Peso/Reps -> Descendente (El más fuerte o con más reps arriba)
    const direction = type === 'time' ? 'asc' : 'desc';

    const q = query(
      collection(db, "workout_results"), 
      where("wodId", "==", wodId),
      orderBy("scoreValue", direction)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error en Ranking:", error);
    });

    return () => unsubscribe();
  }, [wodId, type]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-[32px] overflow-hidden shadow-2xl mb-6">
      <div className="p-5 bg-emerald-950/20 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lime-400/10 rounded-xl">
            <Trophy className="w-5 h-5 text-lime-400" />
          </div>
          <h3 className="text-lime-400 font-black italic uppercase text-xs tracking-[0.2em]">
            Ranking Jungle HP
          </h3>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full uppercase font-black tracking-widest border border-slate-700">
          {type === 'time' ? 'FOR TIME' : type === 'weight' ? 'STRENGTH' : 'AMRAP'}
        </span>
      </div>
      
      <div className="divide-y divide-slate-800/30">
        {results.length > 0 ? (
          results.map((res, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={res.id} 
              className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all border-l-4 border-l-transparent hover:border-l-lime-400"
            >
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-black italic w-10 ${
                  index === 0 ? 'text-lime-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700'
                }`}>
                  #{index + 1}
                </span>
                <div>
                  <p className="text-slate-100 font-black uppercase text-sm tracking-tight">{res.athleteName}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic flex items-center gap-2">
                    <Activity className="w-3 h-3" /> RPE {res.rpe} • {res.modality}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lime-400 font-black text-2xl font-mono tracking-tighter leading-none">
                  {res.score}
                </p>
                {index === 0 && (
                  <p className="text-[8px] text-lime-500/50 font-black uppercase mt-1.5 tracking-tighter">Apex Leader</p>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-16 text-center">
            <Activity className="w-10 h-10 text-slate-800 mx-auto mb-4 animate-pulse" />
            <p className="text-slate-600 italic text-[10px] uppercase font-black tracking-[0.3em]">Esperando resultados...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team'>('dashboard');
  
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  // --- ESTADOS GENERALES ---
  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserProfile | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [athleteData, setAthleteData] = useState<{ wellness: WellnessEntry[], sessions: WorkoutSession[] }>({ wellness: [], sessions: [] });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<CoachFeedback[]>([]);
  const [recentSessions, setRecentSessions] = useState<(WorkoutSession & { athleteName?: string })[]>([]);
  
  // WOD states
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const [wods, setWods] = useState<Wod[]>([]);
  const [newWod, setNewWod] = useState({ title: '', description: '', type: '', date: getTodayDate() });
  const [editingWod, setEditingWod] = useState<Wod | null>(null);
  const [showWodForm, setShowWodForm] = useState(false);

  // Leaderboard states
  const [selectedWodForLeaderboard, setSelectedWodForLeaderboard] = useState<Wod | null>(null);
  const [todaySessions, setTodaySessions] = useState<(WorkoutSession & { athleteName?: string })[]>([]);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [todayWellness, setTodayWellness] = useState<Record<string, WellnessEntry>>({});
  const [copied, setCopied] = useState(false);
  const [adviceText, setAdviceText] = useState('');

  const filteredAthletes = athletes.filter(a => 
    a.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- EFECTOS DE FIREBASE ---

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Escuchar lista de usuarios
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });

    // Escuchar wellness de hoy
    const today = getTodayDate();
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', today)), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // Escuchar WODs de la semana
    const unsubWods = onSnapshot(query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd),
      orderBy('date', 'asc')
    ), (snap) => {
      const fetchedWods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetchedWods);
      if (fetchedWods.length > 0 && !selectedWodForLeaderboard) {
        setSelectedWodForLeaderboard(fetchedWods.find(w => w.date === today) || fetchedWods[0]);
      }
    });

    // Escuchar sesiones recientes
    const unsubRecent = onSnapshot(query(
      collection(db, 'workout_results'), 
      orderBy('createdAt', 'desc'), 
      limit(10)
    ), (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    // Escuchar sesiones de hoy
    const unsubTodaySessions = onSnapshot(query(
      collection(db, 'workout_results'), 
      where('date', '==', today)
    ), (snap) => {
      setTodaySessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    return () => {
      unsubAthletes();
      unsubWellness();
      unsubWods();
      unsubRecent();
      unsubTodaySessions();
    };
  }, [weekStart, weekEnd]);

  // Datos del atleta seleccionado
  useEffect(() => {
    if (!selectedAthlete) return;

    const unsubWellness = onSnapshot(query(
      collection(db, 'wellness_logs'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'),
      limit(30)
    ), (snap) => {
      setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) }));
    });

    const unsubSessions = onSnapshot(query(
      collection(db, 'workout_results'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'),
      limit(30)
    ), (snap) => {
      setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) }));
    });

    const unsubFeedback = onSnapshot(query(
      collection(db, 'coach_feedback'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('createdAt', 'desc')
    ), (snap) => {
      setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback));
    });

    return () => {
      unsubWellness();
      unsubSessions();
      unsubFeedback();
    };
  }, [selectedAthlete]);

  // --- MANEJADORES DE ACCIONES ---

  const handleRoleChange = async (userId: string, newRole: 'coach' | 'athlete') => {
    setIsUpdatingRole(userId);
    try {
      await setDoc(doc(db, 'users', userId), { 
        role: newRole, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setToast({ message: `Rol actualizado a ${newRole}`, type: 'success' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleDeleteAthlete = async (userId: string) => {
    if (userId === profile?.uid) return;
    if (!confirm('¿Estás seguro de eliminar a este atleta? Esta acción no se puede deshacer.')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setAthletes(prev => prev.filter(athlete => athlete.uid !== userId));
      setToast({ message: 'Atleta eliminado correctamente', type: 'success' });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleWodSubmit = async () => {
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), {
          ...newWod,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setToast({ message: 'WOD actualizado', type: 'success' });
      } else {
        await addDoc(collection(db, 'wods'), {
          ...newWod,
          coachId: profile?.uid,
          createdAt: serverTimestamp()
        });
        setToast({ message: 'WOD publicado', type: 'success' });
      }
      setEditingWod(null);
      setShowWodForm(false);
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'wods');
    }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Borrar este WOD permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
      setToast({ message: 'WOD eliminado', type: 'success' });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'wods');
    }
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete || !profile) return;
    
    try {
      await addDoc(collection(db, 'coach_feedback'), {
        coachId: profile.uid,
        athleteId: selectedAthlete.uid,
        content: adviceText,
        createdAt: serverTimestamp()
      });
      setAdviceText('');
      setToast({ message: 'Consejo enviado al atleta', type: 'success' });
    } catch (e) { 
      handleFirestoreError(e, OperationType.CREATE, 'coach_feedback');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-stone-200';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    if (avg >= 4) return 'bg-green-500';
    if (avg >= 2.5) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-32">
      
      {/* 1. HEADER DINÁMICO */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none">
              Jungle Coach <span className="text-lime-400">/ Staff</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3 italic">
              Elite Performance Management
            </p>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full overflow-x-auto scrollbar-hide shadow-2xl">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Team', icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeTab === item.id ? "bg-emerald-700 text-white shadow-xl shadow-emerald-900/20" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 2. PESTAÑA: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-700">
          
          {/* Stats Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Atletas', value: athletes.length, icon: Users, color: 'text-lime-400' },
              { label: 'Reportes Hoy', value: Object.keys(todayWellness).length, icon: Activity, color: 'text-emerald-500' },
              { label: 'Sesiones', value: todaySessions.length, icon: Dumbbell, color: 'text-lime-400' },
              { label: 'RPE Global', value: '7.4', icon: TrendingUp, color: 'text-emerald-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900 p-5 rounded-[24px] border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">{stat.label}</p>
                   <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div className="text-2xl font-black italic tracking-tighter text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* RANKING DEL DÍA (INTEGRADO) */}
              <section className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <Trophy className="w-5 h-5 text-lime-400" />
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-100">
                    Podio de <span className="text-lime-400">Hoy</span>
                  </h3>
                </div>

                {wods.find(w => w.date === getTodayDate()) ? (
                  <WodRanking 
                    wodId={wods.find(w => w.date === getTodayDate())!.id!} 
                    type={wods.find(w => w.date === getTodayDate())!.type as any} 
                  />
                ) : (
                  <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl">
                    <Activity className="w-8 h-8 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-600 italic text-[11px] font-black uppercase tracking-widest leading-relaxed">
                      No hay entrenamiento registrado para hoy.<br/>Programá uno en la sección Prog.
                    </p>
                  </div>
                )}
              </section>

              {/* READINESS GRID (Pulse resumido) */}
              <section className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-3 text-slate-100 mb-8">
                  <ShieldAlert className="w-4 h-4 text-emerald-500" />
                  Estado de Recuperación
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                  {athletes.map(athlete => (
                    <div
                      key={athlete.uid}
                      className="text-center group"
                      onClick={() => { setSelectedAthlete(athlete); setActiveTab('athletes'); }}
                    >
                      <div className="relative inline-block mb-2">
                        <img 
                          src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} 
                          className="w-12 h-12 rounded-2xl object-cover mx-auto border border-slate-800 group-hover:border-emerald-500 transition-all" 
                          alt="" 
                        />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg",
                          getDayReadinessColor([todayWellness[athlete.uid]].filter(Boolean))
                        )} />
                      </div>
                      <p className="text-[8px] font-black uppercase truncate w-full text-slate-500">{athlete.displayName.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {/* RECENT FEED (Actividad reciente) */}
              <section className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-xl h-full flex flex-col">
                <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-3 text-slate-100 mb-8 leading-none">
                  <HistoryIcon className="w-4 h-4 text-lime-400" />
                  Últimos Cargas
                </h3>
                <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide">
                  {recentSessions.map(session => (
                    <div 
                      key={session.id} 
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex items-center justify-between hover:bg-slate-900/50 transition-all cursor-pointer"
                      onClick={() => {
                        const ath = athletes.find(a => a.uid === session.athleteId);
                        if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-black border border-slate-800 italic uppercase">
                          {session.athleteName?.[0]}
                        </div>
                        <div>
                          <p className="text-[11px] font-black italic uppercase text-slate-100">{session.athleteName}</p>
                          <p className="text-[8px] text-slate-700 uppercase font-black mt-0.5">{session.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black italic text-lime-400">{session.score}</p>
                        <p className="text-[8px] text-slate-800 uppercase font-black">RPE {session.rpe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 3. PESTAÑA: ATLETAS (GESTIÓN COMPLETA) */}
      {activeTab === 'athletes' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {!selectedAthlete ? (
            <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl">
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                <input 
                  placeholder="FILTRAR ATLETAS POR NOMBRE..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-emerald-700 text-slate-300 placeholder-slate-800"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAthletes.map((athlete) => (
                  <button
                    key={athlete.uid}
                    onClick={() => setSelectedAthlete(athlete)}
                    className="flex items-center justify-between p-5 rounded-[24px] border border-slate-800 bg-slate-950/40 hover:border-emerald-700 hover:bg-slate-900 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-12 h-12 rounded-xl border border-slate-800" alt="" />
                        {todayWellness[athlete.uid] && (
                          <div className={cn("absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 shadow-lg", getDayReadinessColor([todayWellness[athlete.uid]]))} />
                        )}
                      </div>
                      <div className="text-left">
                         <p className="text-sm font-black italic uppercase tracking-tighter text-white">{athlete.displayName}</p>
                         <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1 italic leading-none">{athlete.role} Staff</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-800 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                onClick={() => setSelectedAthlete(null)} 
                className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 italic flex items-center gap-2 mb-4"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Volver al Listado de Staff
              </button>
              
              {/* PERFIL DETALLADO */}
              <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl relative overflow-hidden text-white">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12 relative z-10">
                  <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-32 h-32 rounded-3xl border-2 border-slate-800 shadow-2xl" alt="" />
                  <div className="text-center md:text-left">
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-3">{selectedAthlete.displayName}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                       <span className="bg-slate-950 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic border border-slate-800">
                          {selectedAthlete.role} Staff
                       </span>
                       <span className="bg-lime-400 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic">
                          RX Category
                       </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-600 mb-3 italic">Estado (Hoy)</p>
                    <div className={cn("w-6 h-6 rounded-full mx-auto shadow-[0_0_15px_rgba(0,0,0,0.5)] shadow-current", getDayReadinessColor(athleteData.wellness))} />
                  </div>
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-600 mb-3 italic">RPE Avg</p>
                    <p className="text-2xl font-black italic text-lime-400 leading-none">7.5</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-600 mb-3 italic">Asistencia</p>
                    <p className="text-2xl font-black italic text-white leading-none">92%</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-600 mb-3 italic">Fatiga</p>
                    <p className="text-2xl font-black italic text-red-500 leading-none">4.1</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10 border-t border-slate-800/50">
                  {/* Historial de entrenamiento */}
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase italic text-slate-500 tracking-widest mb-4 flex items-center gap-3">
                       <HistoryIcon className="w-4 h-4" /> Historial de Sesiones (20)
                    </h4>
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto scrollbar-hide pr-2">
                      {athleteData.sessions.map(s => (
                        <div key={s.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-900 flex justify-between items-center group hover:border-slate-700 transition-all">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-600 font-mono">{s.date.split('-').slice(1).join('/')}</span>
                            <p className="text-xs font-black uppercase italic text-slate-200">{s.modality}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black italic text-lime-400">{s.score}</p>
                             <p className="text-[8px] text-slate-700 uppercase font-black">RPE {s.rpe}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback System */}
                  <div className="space-y-8">
                    <h4 className="text-[11px] font-black uppercase italic text-slate-500 tracking-widest mb-4 flex items-center gap-3">
                       <MessageSquare className="w-4 h-4 text-emerald-500" /> Coaching / Feedback
                    </h4>
                    
                    <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800">
                       <div className="flex gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
                          <input 
                            placeholder="ESCRIBE UN CONSEJO O FEEDBACK..." 
                            value={adviceText}
                            onChange={(e) => setAdviceText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdviceSubmit()}
                            className="flex-1 bg-transparent px-4 py-2 text-[11px] font-black uppercase outline-none text-slate-300 placeholder-slate-700 italic" 
                          />
                          <button 
                            onClick={handleAdviceSubmit}
                            disabled={!adviceText.trim()}
                            className="bg-emerald-700 text-white px-8 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-emerald-900/40 active:scale-95 transition-all"
                          >
                            OK
                          </button>
                       </div>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide pr-2 mt-6">
                      {feedbackHistory.map(f => (
                        <div key={f.id} className="bg-emerald-950/20 p-5 rounded-3xl border border-emerald-900/20 relative overflow-hidden border-l-lime-500 border-l-4">
                          <p className="text-xs italic text-slate-300 font-medium leading-relaxed">"{f.content}"</p>
                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-emerald-900/10">
                             <p className="text-[8px] font-black uppercase tracking-[0.2em] text-lime-500 italic">Jungle Staff Feedback</p>
                             <p className="text-[8px] text-slate-600 font-mono">10:30 AM</p>
                          </div>
                        </div>
                      ))}
                      {feedbackHistory.length === 0 && (
                        <div className="p-10 text-center opacity-20 italic">
                          <MessageSquare className="w-8 h-8 mx-auto mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Sin consejos previos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PESTAÑA: PULSE (ESTADO COMPLETO) */}
      {activeTab === 'pulse' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[32px] p-10 border border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-4 text-white mb-10">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              Daily <span className="text-lime-400">Jungle Pulse</span>
            </h3>
            
            <div className="space-y-3">
              {athletes.filter(a => a.role === 'athlete').map(athlete => {
                const wellness = todayWellness[athlete.uid];
                return (
                  <div key={athlete.uid} className="bg-slate-950 p-6 rounded-[28px] border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-slate-800 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-14 h-14 rounded-2xl border border-slate-800" alt="" />
                        <div className={cn(
                           "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 shadow-lg",
                           getDayReadinessColor([wellness].filter(Boolean))
                        )} />
                      </div>
                      <div>
                        <p className="text-lg font-black uppercase italic text-white tracking-tighter leading-none">{athlete.displayName}</p>
                        <div className="flex gap-4 mt-2">
                           <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest italic flex items-center gap-1.5">
                              {wellness ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                              {wellness ? 'Reportado' : 'Sin Reporte'}
                           </p>
                        </div>
                      </div>
                    </div>

                    {wellness && (
                      <div className="flex gap-3">
                         {[
                           { val: wellness.sleepQuality, icon: Clock, label: 'Sueño' },
                           { val: wellness.nutrition, icon: Activity, label: 'Nutri' },
                           { val: 6 - wellness.stressLevel, icon: TrendingUp, label: 'Stress' }
                         ].map((item, i) => (
                           <div key={i} className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center w-16">
                              <p className="text-[7px] text-slate-600 uppercase font-black mb-1 italic">{item.label}</p>
                              <div className="flex justify-center gap-0.5">
                                 {[1,2,3,4,5].map(star => (
                                    <div key={star} className={cn("w-1 h-1 rounded-full", star <= item.val ? "bg-lime-400" : "bg-slate-800")} />
                                 ))}
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. PESTAÑA: WODS (CALENDARIO COMPLETO) */}
      {activeTab === 'wods' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter flex items-center gap-4 leading-none">
                  <Calendar className="w-8 h-8 text-emerald-500" /> Programación <span className="text-emerald-500">Staff</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 italic">Semana del Lunes {formatDate(weekStart).split(',')[1]}</p>
              </div>
              <button 
                onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} 
                className="bg-emerald-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-900/30"
              >
                <Plus className="w-5 h-5" /> Nuevo WOD Semanal
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {weekDates.map((date, idx) => {
               const dayWods = wods.filter(w => w.date === date);
               const isToday = date === getTodayDate();
               return (
                 <div key={date} className={cn(
                    "bg-slate-900/50 p-8 rounded-[40px] border transition-all flex flex-col h-full min-h-[350px]",
                    isToday ? "border-emerald-500/50 bg-slate-900 ring-2 ring-emerald-500/10 shadow-2xl shadow-emerald-900/20" : "border-slate-800"
                 )}>
                    <div className="flex justify-between items-start mb-8">
                       <div>
                          <p className={cn("text-[11px] font-black uppercase mb-1 italic tracking-widest leading-none", isToday ? "text-emerald-400" : "text-slate-600")}>
                             {weekDays[idx]}
                          </p>
                          <p className="text-[9px] font-mono text-slate-700 font-bold opacity-60 tracking-wider">
                             {date.split('-').reverse().slice(0,2).join('.')}
                          </p>
                       </div>
                       {isToday && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />}
                    </div>

                    <div className="flex-1 space-y-4">
                       {dayWods.map(w => (
                         <div key={w.id} className="group bg-slate-950 p-6 rounded-3xl border border-slate-900 hover:border-slate-700 transition-all shadow-inner">
                            <h4 className="text-[13px] font-black uppercase italic text-white mb-3 leading-tight line-clamp-2">{w.title}</h4>
                            <p className="text-[10px] text-slate-600 italic line-clamp-4 mb-6 leading-relaxed">"{w.description}"</p>
                            
                            <div className="flex gap-5 pt-5 border-t border-slate-900 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                               <button 
                                 onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} 
                                 className="text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                               >
                                 Editar
                               </button>
                               <button 
                                 onClick={() => handleWodDelete(w.id!)} 
                                 className="text-[9px] font-black uppercase text-red-500/70 hover:text-red-400 transition-colors"
                               >
                                 Borrar
                               </button>
                            </div>
                         </div>
                       ))}
                       {dayWods.length === 0 && (
                          <button 
                            onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }}
                            className="w-full h-full border-2 border-dashed border-slate-800/50 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-800 hover:text-emerald-500 hover:border-emerald-700/50 transition-all group p-10"
                          >
                             <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                             <span className="text-[9px] font-black uppercase italic tracking-widest">Programar</span>
                          </button>
                       )}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}

      {/* 6. PESTAÑA: TEAM MANAGEMENT */}
      {activeTab === 'team' && (
        <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl animate-in fade-in">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-12">
              <div>
                 <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter flex items-center gap-4 leading-none">
                    <ShieldAlert className="w-8 h-8 text-amber-500" /> Staff & <span className="text-amber-500">Access</span>
                 </h3>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 italic">Control de Roles y Privilegios del Staff</p>
              </div>
           </div>
           
           <div className="space-y-4">
             {athletes.map(u => (
               <div key={u.uid} className="flex items-center justify-between p-6 bg-slate-950 rounded-3xl border border-slate-900 hover:border-slate-800 transition-all group">
                  <div className="flex items-center gap-6">
                     <div className="relative">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-14 h-14 rounded-2xl border border-slate-800 group-hover:scale-105 transition-transform" alt="" />
                        <div className={cn("absolute -top-1 -left-1 px-2 py-0.5 rounded-full text-[6px] font-black uppercase italic border border-slate-900", u.role === 'coach' ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400")}>
                           {u.role}
                        </div>
                     </div>
                     <div>
                        <p className="text-sm font-black uppercase text-white italic leading-none tracking-tight">{u.displayName}</p>
                        <p className="text-[9px] text-slate-700 font-bold uppercase mt-2 italic tracking-[0.2em]">ID: {u.uid.slice(0,8)}... Staff Member</p>
                     </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleRoleChange(u.uid, u.role === 'coach' ? 'athlete' : 'coach')} 
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[9px] font-black uppercase transition-all active:scale-95",
                        u.role === 'coach' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-700 text-white shadow-lg"
                      )}
                    >
                       {u.role === 'coach' ? 'Hacer Atleta' : 'Ascender Staff'}
                    </button>
                    <button 
                      onClick={() => handleDeleteAthlete(u.uid)} 
                      disabled={u.uid === profile?.uid}
                      className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/30 transition-all active:scale-90 disabled:opacity-20"
                    >
                       <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 7. MODALES Y EXTRAS */}
      
      {/* FORMULARIO DE WOD */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 p-10 rounded-[48px] w-full max-w-xl border border-slate-800 shadow-2xl relative">
                <button onClick={() => setShowWodForm(false)} className="absolute top-8 right-8 text-slate-700 hover:text-white transition-colors"><Repeat className="w-6 h-6 rotate-45" /></button>
                <h3 className="text-3xl font-black italic uppercase text-white text-center mb-12 tracking-tighter">
                   {editingWod ? 'Actualizar' : 'Publicar Nuevo'} WOD
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase text-slate-600 ml-3 italic">Fecha del WOD</p>
                        <input type="date" value={newWod.date} onChange={e => setNewWod({...newWod, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-emerald-700 transition-all font-bold" />
                     </div>
                     <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase text-slate-600 ml-3 italic">Ranking Type</p>
                        <select value={newWod.type} onChange={e => setNewWod({...newWod, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all">
                           <option value="">SELECCIONAR...</option>
                           <option value="time">FOR TIME (Velocidad)</option>
                           <option value="weight">STRENGTH (Kilos)</option>
                           <option value="reps">AMRAP (Repeticiones)</option>
                        </select>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[9px] font-black uppercase text-slate-600 ml-3 italic">Workout Name</p>
                     <input placeholder="EJ: 'THE HERO'..." value={newWod.title} onChange={e => setNewWod({...newWod, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm font-black italic text-white outline-none focus:border-emerald-700 transition-all" />
                  </div>
                  <div className="space-y-3">
                     <p className="text-[9px] font-black uppercase text-slate-600 ml-3 italic">Workout Details</p>
                     <textarea placeholder="EJ: 5 ROUNDS FOR TIME OF... 10 BURPEES..." value={newWod.description} onChange={e => setNewWod({...newWod, description: e.target.value})} rows={8} className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-5 text-xs text-white italic outline-none focus:border-emerald-700 transition-all leading-relaxed" />
                  </div>
                  <div className="flex gap-4 pt-8">
                     <button onClick={() => setShowWodForm(false)} className="flex-1 py-5 text-[11px] font-black uppercase text-slate-600 hover:text-slate-400 transition-colors">Cancelar</button>
                     <button onClick={handleWodSubmit} className="flex-1 bg-emerald-700 text-white py-5 rounded-2xl text-[11px] font-black uppercase shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all">
                        {editingWod ? 'Guardar Cambios' : 'Publicar en la App'}
                     </button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-28 left-4 right-4 z-50 flex justify-center pointer-events-none">
            <div className={cn(
               "px-8 py-5 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 border backdrop-blur-3xl",
               toast.type === 'success' ? "bg-emerald-900/90 border-emerald-500/50 text-white" : "bg-red-900/90 border-red-500/50 text-white"
            )}>
               <CheckCircle2 className={cn("w-6 h-6", toast.type === 'success' ? "text-lime-400" : "text-red-400")} />
               <span className="text-[11px] font-black uppercase italic tracking-[0.2em]">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
