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
  CheckCircle2,
  Filter,
  MoreVertical,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange, parseScoreToNumber } from '@/src/lib/utils';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team';
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// 1. COMPONENTE DE RANKING (Leaderboard Dinámico)
// ============================================================================
function WodRanking({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!wodId) return;
    const direction = type === 'time' ? 'asc' : 'desc';
    
    const q = query(
      collection(db, "workout_results"), 
      where("wodId", "==", wodId),
      orderBy("scoreValue", direction)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error en Ranking (Falta índice):", error);
    });

    return () => unsubscribe();
  }, [wodId, type]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-[32px] overflow-hidden shadow-2xl mb-6">
      <div className="p-6 bg-emerald-950/20 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-lime-400/10 rounded-2xl border border-lime-400/20">
            <Trophy className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h3 className="text-lime-400 font-black italic uppercase text-sm tracking-[0.2em]">Ranking de la Jungla</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Top Performers del Día</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full uppercase font-black tracking-tighter border border-slate-700">
             {type === 'time' ? 'TIME CAP' : type === 'weight' ? 'KILOS' : 'AMRAP'}
           </span>
        </div>
      </div>
      
      <div className="divide-y divide-slate-800/30">
        {results.length > 0 ? (
          results.map((res, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={res.id} 
              className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-all border-l-4 border-l-transparent hover:border-l-lime-400 group"
            >
              <div className="flex items-center gap-5">
                <span className={`text-3xl font-black italic w-12 ${
                  index === 0 ? 'text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.3)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700'
                }`}>
                  #{index + 1}
                </span>
                <div>
                  <p className="text-slate-100 font-black uppercase text-base tracking-tight group-hover:text-lime-400 transition-colors">{res.athleteName}</p>
                  <div className="flex items-center gap-3 mt-1">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic flex items-center gap-1.5">
                       <Activity className="w-3.5 h-3.5" /> RPE {res.rpe}
                     </p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">• {res.modality}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lime-400 font-black text-2xl font-mono tracking-tighter leading-none group-hover:scale-110 transition-transform">
                  {res.score}
                </p>
                {index === 0 && (
                   <div className="flex items-center justify-end gap-1 mt-2">
                      <Medal className="w-3 h-3 text-lime-500" />
                      <p className="text-[8px] text-lime-500/50 font-black uppercase tracking-widest italic leading-none">Apex Leader</p>
                   </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-slate-800 mx-auto mb-5 animate-pulse" />
            <p className="text-slate-600 italic text-[11px] uppercase font-black tracking-[0.4em] leading-relaxed">
              Buscando resultados... <br/>
              <span className="text-slate-800 text-[9px] mt-2 block tracking-widest font-bold">CARGA TU WOD PARA APARECER</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. VISTA STAFF PRINCIPAL (CONTENEDOR)
// ============================================================================
export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team'>('dashboard');
  
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  // --- ESTADOS DE DATOS ---
  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserProfile | null>(null);
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

  // Leaderboard & Pulse states
  const [selectedWodForLeaderboard, setSelectedWodForLeaderboard] = useState<Wod | null>(null);
  const [todaySessions, setTodaySessions] = useState<(WorkoutSession & { athleteName?: string })[]>([]);
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
    // 1. Atletas
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // 2. Wellness hoy
    const today = getTodayDate();
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', today)), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // 3. WODs de la semana
    const unsubWods = onSnapshot(query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd),
      orderBy('date', 'asc')
    ), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetched);
      if (fetched.length > 0 && !selectedWodForLeaderboard) {
        setSelectedWodForLeaderboard(fetched.find(w => w.date === today) || fetched[0]);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wods'));

    // 4. Actividad reciente global
    const unsubRecent = onSnapshot(query(
      collection(db, 'workout_results'), 
      orderBy('createdAt', 'desc'), 
      limit(15)
    ), (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    // 5. Sesiones de hoy
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

  // Carga profunda del atleta seleccionado
  useEffect(() => {
    if (!selectedAthlete) return;

    const unsubWellnessDetail = onSnapshot(query(
      collection(db, 'wellness_logs'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'),
      limit(25)
    ), (snap) => {
      setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) }));
    });

    const unsubSessionsDetail = onSnapshot(query(
      collection(db, 'workout_results'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'),
      limit(25)
    ), (snap) => {
      setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) }));
    });

    const unsubFeedbackDetail = onSnapshot(query(
      collection(db, 'coach_feedback'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('createdAt', 'desc')
    ), (snap) => {
      setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback));
    });

    return () => {
      unsubWellnessDetail();
      unsubSessionsDetail();
      unsubFeedbackDetail();
    };
  }, [selectedAthlete]);

  // --- MANEJADORES DE LÓGICA ---

  const handleRoleChange = async (userId: string, newRole: 'coach' | 'athlete') => {
    try {
      await setDoc(doc(db, 'users', userId), { 
        role: newRole, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setToast({ message: `Rol actualizado con éxito`, type: 'success' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteAthlete = async (userId: string) => {
    if (userId === profile?.uid) return;
    if (!confirm('🚨 ATENCIÓN: Estás a punto de borrar este atleta de la base de datos de Jungle HP. Esta acción no tiene vuelta atrás. ¿Deseas continuar?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setAthletes(prev => prev.filter(athlete => athlete.uid !== userId));
      setToast({ message: 'Atleta eliminado de la Jungla', type: 'success' });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("Completa todos los campos obligatorios");
    
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), {
          ...newWod,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setToast({ message: 'Entrenamiento actualizado correctamente', type: 'success' });
      } else {
        await addDoc(collection(db, 'wods'), {
          ...newWod,
          coachId: profile?.uid,
          createdAt: serverTimestamp()
        });
        setToast({ message: 'Entrenamiento publicado en el Box', type: 'success' });
      }
      setEditingWod(null);
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
      setShowWodForm(false);
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'wods');
    }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar este WOD de la programación semanal?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
      setToast({ message: 'WOD eliminado con éxito', type: 'success' });
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
        createdAt: serverTimestamp(),
        coachName: profile.displayName || 'Staff Coach'
      });
      setAdviceText('');
      setToast({ message: 'Feedback enviado directamente al atleta', type: 'success' });
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
    if (wellness.length === 0) return 'bg-slate-800 opacity-20';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    if (avg >= 4) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    if (avg >= 2.5) return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 pb-40 pt-6">
      
      {/* ----------------------------------------------------------------------
          HEADER Y NAVEGACIÓN PRINCIPAL
      ---------------------------------------------------------------------- */}
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="bg-lime-400 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase italic tracking-tighter">Staff Edition</div>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] italic">Elite Management</p>
            </div>
            <h2 className="text-5xl font-black italic tracking-tighter uppercase text-white leading-none">
              Jungle <span className="text-lime-400 underline decoration-slate-800 decoration-4">Coach</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] text-white font-black uppercase italic leading-none">{profile?.displayName}</p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Head Coach / Admin</p>
             </div>
             <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-12 h-12 rounded-2xl border-2 border-slate-800 shadow-xl" alt="" />
          </div>
        </div>

        <div className="flex bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-3xl border border-slate-800/50 w-full overflow-x-auto scrollbar-hide shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Staff', icon: ShieldAlert },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                activeTab === item.id 
                  ? "bg-emerald-700 text-white shadow-[0_10px_30px_rgba(4,120,87,0.4)] scale-105 z-10" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          PESTAÑA: INICIO (DASHBOARD)
      ---------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-4">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Atletas Activos', value: athletes.length, icon: Users, color: 'text-lime-400', sub: 'Miembros registrados' },
              { label: 'Reportes Diarios', value: Object.keys(todayWellness).length, icon: Activity, color: 'text-emerald-500', sub: 'Readiness check' },
              { label: 'Entrenaron Hoy', value: todaySessions.length, icon: Dumbbell, color: 'text-lime-400', sub: 'Resultados cargados' },
              { label: 'Fatiga Team', value: '4.8', icon: TrendingUp, color: 'text-red-500', sub: 'Promedio global' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/40 p-6 rounded-[32px] border border-slate-800/50 backdrop-blur-sm shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                   <div className={cn("p-2 rounded-xl bg-slate-950 border border-slate-800", stat.color.replace('text-', 'text-'))}>
                      <stat.icon className={cn("w-4 h-4", stat.color)} />
                   </div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 italic">Live Stat</p>
                </div>
                <div className="text-3xl font-black italic tracking-tighter text-white leading-none mb-2">{stat.value}</div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* PODIO DINÁMICO */}
              <section className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <Trophy className="w-40 h-40 text-white" />
                </div>
                
                <div className="flex items-center justify-between mb-10 relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-lime-400 flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)]">
                        <Activity className="w-6 h-6 text-black" />
                      </div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
                        Performance <span className="text-lime-400 italic">Today</span>
                      </h3>
                   </div>
                   <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                     {formatDate(getTodayDate())}
                   </p>
                </div>

                {wods.find(w => w.date === getTodayDate()) ? (
                  <WodRanking 
                    wodId={wods.find(w => w.date === getTodayDate())!.id!} 
                    type={wods.find(w => w.date === getTodayDate())!.type as any} 
                  />
                ) : (
                  <div className="p-20 text-center border-4 border-dashed border-slate-800/50 rounded-[40px]">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Calendar className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-600 italic text-[11px] font-black uppercase tracking-[0.4em] leading-relaxed max-w-xs mx-auto">
                      No hay entrenamiento programado para hoy.<br/>
                      <span className="text-emerald-500 mt-4 block cursor-pointer hover:underline" onClick={() => setActiveTab('wods')}>CREAR AHORA +</span>
                    </p>
                  </div>
                )}
              </section>

              {/* READINESS VISUALIZER */}
              <section className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-sm font-black italic uppercase tracking-[0.3em] flex items-center gap-4 text-slate-100">
                     <ShieldAlert className="w-5 h-5 text-emerald-500" />
                     Readiness Team Check
                   </h3>
                   <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                   </div>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 gap-6">
                  {athletes.map(athlete => (
                    <motion.div
                      whileHover={{ scale: 1.1, y: -5 }}
                      key={athlete.uid}
                      className="text-center group cursor-pointer"
                      onClick={() => { setSelectedAthlete(athlete); setActiveTab('athletes'); }}
                    >
                      <div className="relative inline-block mb-3">
                        <img 
                          src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} 
                          className="w-14 h-14 rounded-[20px] object-cover mx-auto border-2 border-slate-800 group-hover:border-emerald-500 transition-all shadow-2xl" 
                          alt="" 
                        />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-slate-900 shadow-xl",
                          getDayReadinessColor([todayWellness[athlete.uid]].filter(Boolean))
                        )} />
                      </div>
                      <p className="text-[9px] font-black uppercase truncate w-full text-slate-600 group-hover:text-white transition-colors">{athlete.displayName.split(' ')[0]}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              {/* ACTIVITY LOG (Lado derecho) */}
              <section className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Activity className="w-24 h-24 text-white" />
                </div>
                <h3 className="text-sm font-black italic uppercase tracking-[0.3em] flex items-center gap-4 text-slate-100 mb-10 leading-none relative z-10">
                  <HistoryIcon className="w-5 h-5 text-lime-400" />
                  Live Activity
                </h3>
                <div className="space-y-5 overflow-y-auto flex-1 scrollbar-hide relative z-10">
                  {recentSessions.length > 0 ? recentSessions.map(session => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={session.id} 
                      className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition-all cursor-pointer group"
                      onClick={() => {
                        const ath = athletes.find(a => a.uid === session.athleteId);
                        if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-[12px] font-black border border-slate-800 italic uppercase text-slate-500 group-hover:text-lime-400 group-hover:border-lime-900/50 transition-all">
                          {session.athleteName?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-black italic uppercase text-slate-100 tracking-tighter group-hover:text-lime-400 transition-colors">{session.athleteName}</p>
                          <p className="text-[8px] text-slate-700 uppercase font-black mt-1 leading-none tracking-widest">{session.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black italic text-lime-400 leading-none">{session.score}</p>
                        <p className="text-[8px] text-slate-800 uppercase font-black mt-1.5 tracking-tighter">RPE {session.rpe}</p>
                      </div>
                    </motion.div>
                  )) : (
                    <p className="text-slate-800 text-[10px] font-black uppercase text-center mt-20 italic tracking-widest">No hay actividad reciente</p>
                  )}
                </div>
                
                {/* BOTÓN CAJA DE ACCESO RÁPIDO */}
                <div className="mt-8 pt-8 border-t border-slate-800/50">
                   <button 
                     onClick={copyToClipboard}
                     className="w-full bg-slate-950 text-slate-500 border border-slate-800 py-5 rounded-[24px] font-black uppercase tracking-[0.3em] text-[9px] flex items-center justify-center gap-3 hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-xl"
                   >
                     {copied ? '¡ENLACE COPIADO!' : 'COPIAR URL BOX'}
                     <ArrowUpRight className="w-4 h-4" />
                   </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA: ATLETAS (GESTIÓN Y PERFIL)
      ---------------------------------------------------------------------- */}
      {activeTab === 'athletes' && (
        <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-right-4">
          {!selectedAthlete ? (
            <div className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                 <Users className="w-60 h-60 text-white" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                 <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Athlete <span className="text-emerald-500">Database</span></h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">Gestión de miembros y rendimiento</p>
                 </div>
                 <div className="relative group w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-emerald-500 transition-colors" />
                   <input 
                     placeholder="FILTRAR POR NOMBRE..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-emerald-700 text-slate-300 placeholder-slate-800 transition-all shadow-inner"
                   />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                {filteredAthletes.map((athlete) => (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    key={athlete.uid}
                    onClick={() => setSelectedAthlete(athlete)}
                    className="flex items-center justify-between p-6 rounded-[28px] border border-slate-800 bg-slate-950/40 hover:border-emerald-700 hover:bg-slate-900 transition-all group shadow-xl"
                  >
                    <div className="flex items-center gap-5 text-left">
                      <div className="relative">
                        <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-14 h-14 rounded-2xl border-2 border-slate-800 group-hover:border-emerald-500/50 transition-all shadow-lg" alt="" />
                        {todayWellness[athlete.uid] && (
                          <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-slate-950 shadow-lg", getDayReadinessColor([todayWellness[athlete.uid]]))} />
                        )}
                      </div>
                      <div>
                         <p className="text-base font-black italic uppercase tracking-tighter text-white leading-none mb-2 group-hover:text-emerald-400 transition-colors">{athlete.displayName}</p>
                         <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] bg-slate-900 px-2 py-0.5 rounded italic leading-none">{athlete.role} Member</span>
                            {todayWellness[athlete.uid] && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                         </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-800 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <button 
                onClick={() => setSelectedAthlete(null)} 
                className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 italic flex items-center gap-3 mb-4 hover:gap-5 transition-all group"
              >
                <ChevronRight className="w-4 h-4 rotate-180 group-hover:scale-125 transition-transform" /> 
                VOLVER A LA BASE DE DATOS
              </button>
              
              {/* PERFIL EXPANDIDO DEL ATLETA */}
              <div className="bg-slate-900 rounded-[50px] p-12 border border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden text-white">
                
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none rotate-12">
                   <Activity className="w-96 h-96 text-white" />
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-16 relative z-10 text-center md:text-left">
                  <div className="relative group">
                     <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-40 h-40 rounded-[40px] border-4 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500" alt="" />
                     <div className={cn("absolute -bottom-4 -right-4 w-12 h-12 rounded-[20px] border-8 border-slate-900 flex items-center justify-center", getDayReadinessColor(athleteData.wellness))}>
                        <Activity className="w-4 h-4 text-white" />
                     </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                       <h3 className="text-5xl font-black italic uppercase tracking-tight leading-none mb-0">{selectedAthlete.displayName}</h3>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                       <div className="bg-slate-950 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic border border-slate-800 tracking-widest leading-none">
                          {selectedAthlete.role} STAFF / ATLETA
                       </div>
                       <div className="bg-lime-400 text-slate-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest leading-none shadow-lg shadow-lime-400/20">
                          ELITE RX DIVISION
                       </div>
                       <div className="bg-slate-800 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest leading-none border border-slate-700">
                          ID: {selectedAthlete.uid.slice(0,8)}...
                       </div>
                    </div>
                  </div>
                </div>

                {/* KPI GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 relative z-10">
                  {[
                    { label: 'Readiness Index', value: 'OPTIMAL', color: getDayReadinessColor(athleteData.wellness), icon: ShieldAlert },
                    { label: 'RPE Promedio (30d)', value: '7.8', color: 'text-lime-400', icon: TrendingUp },
                    { label: 'Sesiones Totales', value: athleteData.sessions.length, color: 'text-white', icon: Dumbbell },
                    { label: 'Avg. Fatiga', value: '4.2 / 10', color: 'text-red-500', icon: AlertTriangle }
                  ].map((kpi, idx) => (
                    <div key={idx} className="bg-slate-950/80 p-8 rounded-[36px] border border-slate-800 text-center backdrop-blur-md shadow-inner group hover:border-slate-700 transition-all">
                       <kpi.icon className={cn("w-5 h-5 mx-auto mb-4 opacity-50 group-hover:opacity-100 transition-opacity", kpi.color.includes('bg-') ? 'text-white' : kpi.color)} />
                       <p className="text-[10px] font-black uppercase text-slate-600 mb-3 italic tracking-widest">{kpi.label}</p>
                       {kpi.color.includes('bg-') ? (
                          <div className={cn("w-6 h-6 rounded-full mx-auto shadow-lg", kpi.color)} />
                       ) : (
                          <p className={cn("text-3xl font-black italic tracking-tighter leading-none", kpi.color)}>{kpi.value}</p>
                       )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12 border-t border-slate-800/50">
                  {/* Historial detallado */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[12px] font-black uppercase italic text-slate-500 tracking-[0.3em] flex items-center gap-4 leading-none">
                          <HistoryIcon className="w-5 h-5 text-emerald-500" /> Historical Performance
                       </h4>
                       <span className="text-[9px] font-black uppercase text-slate-700 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">Last 25 entries</span>
                    </div>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto scrollbar-hide pr-4">
                      {athleteData.sessions.map((s, i) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={s.id} 
                          className="bg-slate-950/60 p-6 rounded-[28px] border border-slate-900 flex justify-between items-center group hover:border-slate-700 hover:bg-slate-900/40 transition-all shadow-lg"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center font-mono leading-none group-hover:border-emerald-900 transition-all">
                               <span className="text-[10px] text-white font-black">{s.date.split('-')[2]}</span>
                               <span className="text-[7px] text-slate-600 font-bold uppercase mt-1">{s.date.split('-')[1]}</span>
                            </div>
                            <div>
                               <p className="text-[11px] font-black uppercase italic text-slate-100 group-hover:text-emerald-400 transition-colors tracking-tight">{s.modality || 'Workout Session'}</p>
                               <div className="flex items-center gap-3 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <p className="text-[8px] text-slate-500 uppercase font-black italic tracking-widest flex items-center gap-1"><Weight className="w-2.5 h-2.5" /> RX LOAD</p>
                                  <p className="text-[8px] text-slate-500 uppercase font-black italic tracking-widest flex items-center gap-1">• RPE {s.rpe}</p>
                               </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black italic text-lime-400 leading-none group-hover:scale-110 transition-transform">{s.score}</p>
                             <div className="mt-2 flex justify-end">
                                <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                             </div>
                          </div>
                        </motion.div>
                      ))}
                      {athleteData.sessions.length === 0 && (
                         <div className="p-20 text-center border-2 border-dashed border-slate-900 rounded-[40px]">
                            <HistoryIcon className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-700 text-[10px] font-black uppercase italic tracking-widest">Sin registros disponibles</p>
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback / Coaching Directo */}
                  <div className="space-y-10">
                    <h4 className="text-[12px] font-black uppercase italic text-slate-500 tracking-[0.3em] flex items-center gap-4 leading-none">
                       <MessageSquare className="w-5 h-5 text-lime-400" /> Coaching Direct Feedback
                    </h4>
                    
                    <div className="bg-slate-950 p-6 rounded-[36px] border border-slate-800 shadow-2xl relative group overflow-hidden">
                       <div className="flex gap-4 p-2 bg-slate-900 rounded-3xl border border-slate-800 focus-within:border-emerald-600 transition-all shadow-inner relative z-10">
                          <input 
                            placeholder="ESCRIBE UN CONSEJO O CORRECCIÓN..." 
                            value={adviceText}
                            onChange={(e) => setAdviceText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdviceSubmit()}
                            className="flex-1 bg-transparent px-5 py-4 text-xs font-black uppercase outline-none text-slate-200 placeholder-slate-700 italic tracking-wider" 
                          />
                          <button 
                            onClick={handleAdviceSubmit}
                            disabled={!adviceText.trim()}
                            className="bg-emerald-700 text-white px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-30"
                          >
                            POST
                          </button>
                       </div>
                       <p className="text-[8px] text-slate-700 font-bold uppercase mt-4 ml-2 tracking-widest italic leading-none opacity-50">Se notificará al atleta inmediatamente en su aplicación.</p>
                    </div>

                    <div className="space-y-5 max-h-[350px] overflow-y-auto scrollbar-hide pr-4 mt-8">
                      {feedbackHistory.map((f, i) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={f.id} 
                          className="bg-emerald-950/10 p-6 rounded-[32px] border border-emerald-900/10 relative overflow-hidden border-l-lime-500 border-l-4 group hover:bg-emerald-900/10 transition-all"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-45 group-hover:rotate-0 transition-transform">
                             <MessageSquare className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-[13px] italic text-slate-200 font-medium leading-relaxed relative z-10 group-hover:text-white transition-colors">"{f.content}"</p>
                          <div className="flex justify-between items-center mt-6 pt-4 border-t border-emerald-900/10 relative z-10">
                             <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-lime-400 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-black" /></div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-400 italic">Jungle HP Staff</p>
                             </div>
                             <p className="text-[8px] text-slate-700 font-mono font-bold tracking-widest uppercase italic">Delivered</p>
                          </div>
                        </motion.div>
                      ))}
                      {feedbackHistory.length === 0 && (
                        <div className="p-20 text-center bg-slate-950/20 rounded-[40px] border border-dashed border-slate-900">
                          <div className="w-12 h-12 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-5">
                             <MessageSquare className="w-6 h-6 text-slate-800" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 leading-none">Sin historial de consejos</p>
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

      {/* ----------------------------------------------------------------------
          PESTAÑA: PULSE (MONITOREO DETALLADO)
      ---------------------------------------------------------------------- */}
      {activeTab === 'pulse' && (
        <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-left-4">
          <div className="bg-slate-900 rounded-[50px] p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 p-20 opacity-[0.03] pointer-events-none">
               <ShieldAlert className="w-[500px] h-[500px] text-white" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 relative z-10">
               <div>
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                     <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">Live Monitoring</p>
                  </div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                    Daily <span className="text-lime-400">Jungle Pulse</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-4 leading-relaxed max-w-sm">Monitoreo en tiempo real del estado de recuperación, nutrición y estrés del equipo.</p>
               </div>
               <div className="flex bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-inner">
                  {[
                    { l: 'Optimal', c: 'bg-emerald-500' },
                    { l: 'Alert', c: 'bg-amber-400' },
                    { l: 'Danger', c: 'bg-red-500' }
                  ].map(x => (
                    <div key={x.l} className="flex items-center gap-2 px-4 py-2">
                       <div className={cn("w-2 h-2 rounded-full", x.c)} />
                       <span className="text-[8px] font-black uppercase text-slate-600 italic tracking-widest leading-none">{x.l}</span>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="space-y-4 relative z-10">
              {athletes.filter(a => a.role === 'athlete').map((athlete, idx) => {
                const wellness = todayWellness[athlete.uid];
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={athlete.uid} 
                    className="bg-slate-950/80 p-8 rounded-[36px] border border-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-10 hover:border-slate-700 hover:bg-slate-900 transition-all group shadow-xl"
                  >
                    <div className="flex items-center gap-8 min-w-[300px]">
                      <div className="relative">
                        <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-20 h-20 rounded-[28px] border-2 border-slate-800 group-hover:scale-105 group-hover:border-emerald-500/50 transition-all shadow-2xl" alt="" />
                        <div className={cn(
                           "absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-[6px] border-slate-950 shadow-2xl",
                           getDayReadinessColor([wellness].filter(Boolean))
                        )} />
                      </div>
                      <div>
                        <p className="text-2xl font-black uppercase italic text-white tracking-tighter leading-none mb-3 group-hover:text-emerald-400 transition-colors">{athlete.displayName}</p>
                        <div className="flex gap-4">
                           <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.2em] italic flex items-center gap-2 leading-none">
                              {wellness ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-slate-800" />}
                              {wellness ? 'LOGGED TODAY' : 'PENDING CHECK'}
                           </p>
                        </div>
                      </div>
                    </div>

                    {wellness ? (
                      <div className="flex flex-wrap gap-4 lg:gap-6 justify-center lg:justify-end">
                         {[
                           { val: wellness.sleepQuality, icon: Clock, label: 'Sleep Quality', color: 'text-emerald-500' },
                           { val: wellness.nutrition, icon: Activity, label: 'Nutrition', color: 'text-lime-400' },
                           { val: 6 - wellness.stressLevel, icon: TrendingUp, label: 'Stress Levels', color: 'text-red-500' }
                         ].map((item, i) => (
                           <div key={i} className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800/50 text-center w-24 group-hover:border-slate-700 transition-all">
                              <p className="text-[8px] text-slate-600 font-black uppercase mb-3 italic tracking-widest leading-none">{item.label}</p>
                              <div className="flex justify-center gap-1 mb-1">
                                 {[1,2,3,4,5].map(star => (
                                    <div key={star} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", star <= item.val ? "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)] scale-110" : "bg-slate-800")} />
                                 ))}
                              </div>
                              <p className="text-[11px] font-black italic text-white mt-1">{item.val}/5</p>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-center lg:justify-end items-center px-10 py-6 border-2 border-dashed border-slate-900 rounded-[28px]">
                         <p className="text-[10px] text-slate-800 font-black uppercase italic tracking-[0.3em]">Esperando reporte matutino...</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA: PROG (WODS SEMANAL)
      ---------------------------------------------------------------------- */}
      {activeTab === 'wods' && (
        <div className="space-y-10 animate-in fade-in duration-500 slide-in-from-top-4">
           <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                   <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">Programming Center</p>
                </div>
                <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none flex items-center gap-5">
                  Programación <span className="text-emerald-500 underline underline-offset-8 decoration-8 decoration-emerald-900/30">Semanal</span>
                </h3>
                <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest mt-6 italic">Semana del Lunes {formatDate(weekStart).split(',')[1]}</p>
              </div>
              <button 
                onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} 
                className="bg-emerald-700 text-white px-10 py-6 rounded-[28px] text-[11px] font-black uppercase flex items-center gap-4 hover:bg-emerald-600 active:scale-95 transition-all shadow-[0_20px_50px_rgba(4,120,87,0.3)] border border-emerald-500/20 group"
              >
                <div className="bg-emerald-950 p-1.5 rounded-lg group-hover:rotate-180 transition-transform duration-500">
                   <Plus className="w-5 h-5" />
                </div>
                AGREGAR NUEVO WOD
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {weekDates.map((date, idx) => {
               const dayWods = wods.filter(w => w.date === date);
               const isToday = date === getTodayDate();
               return (
                 <div key={date} className={cn(
                    "bg-slate-900/40 p-10 rounded-[50px] border transition-all duration-500 flex flex-col h-full min-h-[420px] backdrop-blur-sm relative group",
                    isToday ? "border-emerald-500/50 bg-slate-900 shadow-2xl ring-4 ring-emerald-500/10 scale-[1.03] z-10" : "border-slate-800 shadow-xl hover:border-slate-700 hover:bg-slate-900/60"
                 )}>
                    {isToday && (
                       <div className="absolute top-0 right-0 p-8">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-pulse" />
                       </div>
                    )}
                    <div className="mb-10 text-center">
                       <p className={cn("text-[13px] font-black uppercase mb-2 italic tracking-[0.2em] leading-none transition-colors", isToday ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400")}>
                          {weekDays[idx]}
                       </p>
                       <p className="text-[10px] font-mono text-slate-700 font-bold opacity-60 tracking-widest group-hover:opacity-100 transition-opacity">
                          {date.split('-').reverse().slice(0,2).join('.').toUpperCase()}
                       </p>
                    </div>

                    <div className="flex-1 space-y-5">
                       {dayWods.map(w => (
                         <div key={w.id} className="group/wod bg-slate-950/80 p-8 rounded-[36px] border border-slate-900 hover:border-emerald-900/50 transition-all shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover/wod:opacity-100 transition-opacity" />
                            <h4 className="text-[15px] font-black uppercase italic text-white mb-4 leading-tight line-clamp-2 tracking-tighter">{w.title}</h4>
                            <p className="text-[11px] text-slate-600 italic line-clamp-6 mb-8 leading-relaxed font-medium">"{w.description}"</p>
                            
                            <div className="flex gap-6 pt-6 border-t border-slate-900/50 opacity-0 group-hover/wod:opacity-100 transition-all translate-y-2 group-hover/wod:translate-y-0">
                               <button 
                                 onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} 
                                 className="text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-widest underline decoration-2 decoration-slate-800 underline-offset-4"
                               >
                                 EDITAR
                               </button>
                               <button 
                                 onClick={() => handleWodDelete(w.id!)} 
                                 className="text-[9px] font-black uppercase text-red-500/40 hover:text-red-500 transition-colors tracking-widest"
                               >
                                 BORRAR
                               </button>
                            </div>
                         </div>
                       ))}
                       {dayWods.length === 0 && (
                          <button 
                            onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }}
                            className="w-full h-full border-4 border-dashed border-slate-800/50 rounded-[40px] flex flex-col items-center justify-center gap-4 text-slate-800 hover:text-emerald-500 hover:border-emerald-700/50 transition-all group/add p-12 bg-slate-950/20"
                          >
                             <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover/add:rotate-90 group-hover/add:scale-110 transition-all duration-500">
                                <Plus className="w-6 h-6" />
                             </div>
                             <span className="text-[10px] font-black uppercase italic tracking-[0.3em]">Programar</span>
                          </button>
                       )}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA: RANKING (HISTÓRICO)
      ---------------------------------------------------------------------- */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-10 animate-in fade-in duration-500 zoom-in-95">
          <div className="bg-slate-900 rounded-[50px] p-12 border border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
               <div>
                  <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter flex items-center gap-6 leading-none">
                    <Trophy className="w-10 h-10 text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.4)]" /> 
                    Leaderboard <span className="text-lime-400">Archive</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.2em] mt-6 italic">Selecciona un entrenamiento para visualizar el podio de rendimiento histórico.</p>
               </div>
            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-12 p-2 bg-slate-950 rounded-[32px] border border-slate-800 shadow-inner">
              {wods.length > 0 ? wods.map(wod => (
                <button 
                  key={wod.id} 
                  onClick={() => setSelectedWodForLeaderboard(wod)}
                  className={cn(
                    "px-8 py-4 rounded-[20px] text-[10px] font-black uppercase border transition-all duration-300 whitespace-nowrap",
                    selectedWodForLeaderboard?.id === wod.id 
                      ? "bg-emerald-700 border-emerald-500 text-white shadow-xl shadow-emerald-900/40 translate-y-[-2px] scale-105" 
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                  )}
                >
                  {wod.title}
                </button>
              )) : (
                <div className="py-4 px-10 text-[9px] font-black uppercase italic text-slate-800">No hay entrenamientos programados para esta semana</div>
              )}
            </div>

            {selectedWodForLeaderboard ? (
              <div className="animate-in fade-in duration-1000">
                <WodRanking 
                  wodId={selectedWodForLeaderboard.id!} 
                  type={selectedWodForLeaderboard.type as any} 
                />
              </div>
            ) : (
              <div className="py-32 text-center flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-[50px]">
                <div className="w-20 h-20 bg-slate-900 rounded-[30px] flex items-center justify-center mb-8 border border-slate-800 shadow-2xl">
                   <Trophy className="w-10 h-10 text-slate-800" />
                </div>
                <p className="font-black uppercase italic text-xs tracking-[0.4em] text-slate-800">
                  Seleccioná un WOD para visualizar el ranking oficial
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA: TEAM MANAGEMENT (STAFF ACCESS)
      ---------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="bg-slate-900 rounded-[50px] p-12 border border-slate-800 shadow-2xl animate-in fade-in duration-500">
           <div className="flex flex-col md:flex-row justify-between md:items-end gap-8 mb-16">
              <div>
                 <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">Restricted Access</p>
                 </div>
                 <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none flex items-center gap-6">
                    Staff & <span className="text-amber-500 underline decoration-amber-900/30 decoration-8 underline-offset-8">Access</span> Control
                 </h3>
                 <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-8 max-w-lg leading-relaxed italic">Gestión de privilegios administrativos y depuración de la base de datos de usuarios de Jungle HP.</p>
              </div>
           </div>
           
           <div className="space-y-4">
             {athletes.map((u, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.05 }}
                 key={u.uid} 
                 className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-950 rounded-[40px] border border-slate-900 hover:border-slate-700 transition-all group shadow-xl gap-8"
               >
                  <div className="flex items-center gap-8">
                     <div className="relative">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-20 h-20 rounded-[30px] border-2 border-slate-800 group-hover:scale-105 group-hover:border-amber-500/50 transition-all shadow-2xl" alt="" />
                        <div className={cn(
                           "absolute -top-2 -left-2 px-3 py-1 rounded-xl text-[8px] font-black uppercase italic border-2 border-slate-950 shadow-xl", 
                           u.role === 'coach' ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                        )}>
                           {u.role}
                        </div>
                     </div>
                     <div>
                        <p className="text-2xl font-black uppercase text-white italic leading-none tracking-tight group-hover:text-amber-400 transition-colors">{u.displayName}</p>
                        <p className="text-[9px] text-slate-700 font-bold uppercase mt-3 italic tracking-[0.3em] leading-none">USER_UID: {u.uid.slice(0,16).toUpperCase()}...</p>
                        <div className="flex items-center gap-3 mt-4 opacity-40">
                           <div className="w-2 h-2 rounded-full bg-slate-800" />
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest italic">Member since 2026</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleRoleChange(u.uid, u.role === 'coach' ? 'athlete' : 'coach')} 
                      className={cn(
                        "px-8 py-4 rounded-[22px] text-[10px] font-black uppercase transition-all duration-300 active:scale-95 border-2 shadow-lg",
                        u.role === 'coach' 
                          ? "bg-amber-500/5 text-amber-500 border-amber-500/20 hover:bg-amber-500/10" 
                          : "bg-emerald-700 text-white border-emerald-600/50 hover:bg-emerald-600 shadow-emerald-900/30"
                      )}
                    >
                       {u.role === 'coach' ? 'BAJAR A ATLETA' : 'ASCENDER A STAFF'}
                    </button>
                    <button 
                      onClick={() => handleDeleteAthlete(u.uid)} 
                      disabled={u.uid === profile?.uid}
                      className="p-5 bg-red-500/5 text-red-500 rounded-[22px] border-2 border-red-500/10 hover:bg-red-500/20 transition-all active:scale-90 disabled:opacity-5 disabled:grayscale"
                    >
                       <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
               </motion.div>
             ))}
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODALES Y COMPONENTES GLOBALES (NO VISIBLES POR DEFECTO)
      ---------------------------------------------------------------------- */}
      
      {/* MODAL: FORMULARIO DE WOD */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/98 backdrop-blur-2xl"
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 30 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               className="bg-slate-900 p-12 rounded-[60px] w-full max-w-2xl border-4 border-slate-800 shadow-[0_50px_200px_rgba(0,0,0,0.8)] relative"
             >
                <button 
                   onClick={() => setShowWodForm(false)} 
                   className="absolute top-10 right-10 text-slate-700 hover:text-white transition-all bg-slate-950 p-4 rounded-full border border-slate-800 group"
                >
                   <Repeat className="w-8 h-8 rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                </button>
                
                <h3 className="text-4xl font-black italic uppercase text-white text-center mb-16 tracking-tighter leading-none">
                   {editingWod ? 'Update' : 'Publish'} <span className="text-emerald-500">Workout</span>
                </h3>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-4 italic tracking-widest">Fecha del WOD</label>
                        <input 
                           type="date" 
                           value={newWod.date} 
                           onChange={e => setNewWod({...newWod, date: e.target.value})} 
                           className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 text-sm text-white outline-none focus:border-emerald-700 transition-all font-bold shadow-inner" 
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-4 italic tracking-widest">Score System</label>
                        <select 
                           value={newWod.type} 
                           onChange={e => setNewWod({...newWod, type: e.target.value})} 
                           className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 text-[12px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all shadow-inner"
                        >
                           <option value="">-- SELECCIONAR --</option>
                           <option value="time">FOR TIME (Cronómetro)</option>
                           <option value="weight">STRENGTH / RM (Kilos)</option>
                           <option value="reps">AMRAP (Repeticiones)</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-500 ml-4 italic tracking-widest">Workout Name</label>
                     <input 
                        placeholder="EJ: 'THE CHIEF' O 'FRAN'..." 
                        value={newWod.title} 
                        onChange={e => setNewWod({...newWod, title: e.target.value})} 
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl p-6 text-base font-black italic text-white outline-none focus:border-emerald-700 transition-all shadow-inner placeholder-slate-800" 
                     />
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-500 ml-4 italic tracking-widest">Descripción y Ejercicios</label>
                     <textarea 
                        placeholder="DETALLA LOS MOVIMIENTOS, RONDAS Y REPS AQUÍ..." 
                        value={newWod.description} 
                        onChange={e => setNewWod({...newWod, description: e.target.value})} 
                        rows={8} 
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-[40px] p-8 text-sm text-white italic outline-none focus:border-emerald-700 transition-all leading-relaxed shadow-inner placeholder-slate-800" 
                     />
                  </div>

                  <div className="flex gap-6 pt-8">
                     <button 
                        onClick={() => setShowWodForm(false)} 
                        className="flex-1 py-6 text-[12px] font-black uppercase text-slate-600 hover:text-slate-400 transition-all tracking-[0.2em] font-black"
                     >
                        CANCELAR
                     </button>
                     <button 
                        onClick={handleWodSubmit} 
                        className="flex-[2] bg-emerald-700 text-white py-6 rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(4,120,87,0.4)] active:scale-95 transition-all border border-emerald-500/20"
                     >
                        {editingWod ? 'GUARDAR CAMBIOS' : 'PUBLICAR EN BOX'}
                     </button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICACIONES TOAST (Sistema global) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.8 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 100, scale: 0.8 }} 
            className="fixed bottom-32 left-4 right-4 z-[200] flex justify-center pointer-events-none"
          >
            <div className={cn(
               "px-10 py-6 rounded-[35px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex items-center gap-6 border backdrop-blur-3xl transition-all",
               toast.type === 'success' ? "bg-emerald-900/90 border-emerald-500/50 text-white" : "bg-red-900/90 border-red-500/50 text-white"
            )}>
               <div className={cn("p-2 rounded-full", toast.type === 'success' ? "bg-lime-400/20" : "bg-red-400/20")}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-7 h-7 text-lime-400" /> : <ShieldAlert className="w-7 h-7 text-red-400" />}
               </div>
               <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase italic tracking-[0.2em] leading-none">{toast.message}</span>
                  <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-1.5 leading-none">System Notification • Jungle HP</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

