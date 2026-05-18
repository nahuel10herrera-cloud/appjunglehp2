import React, { useState, useEffect, useMemo } from 'react';
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
  Zap,
  TrendingDown,
  UserCircle,
  Settings,
  Target,
  Flame,
  HeartPulse,
  BarChart3,
  ChevronDown,
  Info,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Award
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange } from '@/src/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile';
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// COMPONENTE: PERFORMANCE ANALYTICS (GRÁFICOS DE EVOLUCIÓN)
// ============================================================================
function PerformanceChart({ data }: { data: WorkoutSession[] }) {
  const chartData = useMemo(() => {
    return [...data]
      .reverse()
      .filter(s => s.scoreValue !== undefined)
      .map(s => ({
        date: s.date.split('-').reverse().slice(0,2).join('/'),
        rendimiento: s.scoreValue || 0,
        esfuerzo: s.rpe || 0,
        scoreLabel: s.score
      }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="h-72 flex flex-col items-center justify-center bg-slate-950/40 rounded-[50px] border-2 border-dashed border-slate-800/60 p-12 group transition-all hover:border-emerald-900/50">
        <div className="w-20 h-20 bg-slate-900 rounded-[30px] flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
           <BarChart3 className="w-10 h-10 text-slate-700 group-hover:text-emerald-500 transition-colors" />
        </div>
        <p className="text-[11px] font-black uppercase text-slate-600 tracking-[0.4em] text-center italic leading-relaxed max-w-[250px]">
          Sincronización de datos insuficiente para trazado analítico
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full mt-10 animate-in fade-in duration-1000 slide-in-from-bottom-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3e635" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="effortGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.1} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            fontFamily="monospace"
            dy={15}
            tick={{ fontWeight: 'bold' }}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '24px', fontSize: '11px', textTransform: 'uppercase', boxShadow: '0 25px 50px rgba(0,0,0,0.8)', padding: '15px' }}
            itemStyle={{ color: '#a3e635', fontWeight: '900', padding: '5px 0' }}
            cursor={{ stroke: '#334155', strokeWidth: 2, strokeDasharray: '6 6' }}
          />
          <Area 
            type="monotone" 
            dataKey="rendimiento" 
            stroke="#a3e635" 
            strokeWidth={5} 
            fillOpacity={1} 
            fill="url(#performanceGradient)" 
            animationDuration={2500}
            name="Rendimiento (Score)"
          />
          <Area 
            type="monotone" 
            dataKey="esfuerzo" 
            stroke="#ef4444" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#effortGradient)" 
            strokeDasharray="8 8"
            name="Percepción de Carga (RPE)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// COMPONENTE: RANKING DEL BOX (INTELIGENTE)
// ============================================================================
function WodRanking({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!wodId) return;
    setIsLoading(true);
    const direction = type === 'time' ? 'asc' : 'desc';
    const q = query(
      collection(db, "workout_results"), 
      where("wodId", "==", wodId), 
      orderBy("scoreValue", direction)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Critical Database Error (Ranking):", error.message);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [wodId, type]);

  if (isLoading) {
    return (
      <div className="p-24 text-center">
         <Activity className="w-12 h-12 text-emerald-500 mx-auto animate-spin" />
         <p className="text-[11px] font-black uppercase text-slate-700 mt-6 tracking-widest italic">Accediendo a la red Jungle...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border-2 border-slate-800/60 rounded-[50px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
      <div className="p-10 bg-emerald-950/20 border-b-2 border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-lime-400 text-black rounded-[24px] shadow-[0_0_35px_rgba(163,230,53,0.4)] transition-transform hover:rotate-6">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase text-2xl tracking-tighter leading-none mb-2">Jungle Elite Ranking</h3>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] italic">Validated Box Results</p>
          </div>
        </div>
        <div className="bg-slate-950 p-1.5 rounded-2xl border-2 border-slate-800 flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-xl">
              <Zap className="w-4 h-4 text-lime-400" />
              <span className="text-[10px] text-white font-black uppercase tracking-widest italic">{type?.toUpperCase() || 'RM'}</span>
           </div>
        </div>
      </div>
      
      <div className="divide-y-2 divide-slate-800/40">
        {results.length > 0 ? results.map((res, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}
            key={res.id} 
            className="p-8 flex items-center justify-between group hover:bg-slate-800/30 transition-all border-l-[6px] border-l-transparent hover:border-l-lime-400"
          >
            <div className="flex items-center gap-10">
              <div className="relative">
                <span className={cn("text-5xl font-black italic w-20 inline-block transition-all group-hover:scale-125 duration-500", 
                  index === 0 ? 'text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.6)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700'
                )}>#{index + 1}</span>
              </div>
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${res.athleteId || res.userId}`} 
                      className="w-16 h-16 rounded-[22px] border-2 border-slate-700 group-hover:border-lime-500/50 transition-all shadow-2xl object-cover" 
                      alt="" 
                    />
                    <div className="absolute -top-2 -right-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shadow-xl" />
                    </div>
                 </div>
                 <div>
                   <p className="text-slate-100 font-black uppercase text-xl tracking-tighter leading-none mb-3 group-hover:text-lime-400 transition-colors">{res.athleteName}</p>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                         <Activity className="w-3.5 h-3.5 text-slate-500" />
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">RPE: {res.rpe}/10</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">{res.modality}</span>
                   </div>
                 </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lime-400 font-black text-4xl font-mono tracking-tighter leading-none group-hover:scale-[1.15] transition-transform duration-700 drop-shadow-[0_0_20px_rgba(163,230,53,0.2)]">{res.score}</p>
              {index === 0 && (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center justify-end gap-2 mt-4">
                   <Award className="w-4 h-4 text-lime-500" />
                   <p className="text-[9px] text-lime-500/40 font-black uppercase tracking-[0.3em] leading-none italic">Tier 1 Apex</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="p-40 text-center flex flex-col items-center justify-center">
            <div className="relative mb-10">
               <Activity className="w-20 h-20 text-slate-800 animate-pulse opacity-10" />
               <Target className="w-10 h-10 text-slate-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
            </div>
            <p className="text-slate-700 uppercase font-black italic text-[14px] tracking-[0.6em] leading-relaxed max-w-sm">
              SISTEMA A LA ESPERA DE REGISTROS DE CARGA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: COACH VIEW (STAFF MASTER EDITION)
// ============================================================================

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  
  // -- NAVEGACIÓN Y CALENDARIO (ESTRUCTURA DE DATOS) --
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile'>('dashboard');
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const { start: weekStart, end: weekEnd } = getWeekRange();
  
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  // -- ESTADOS DE DATA MAESTRA --
  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserProfile | null>(null);
  const [athleteData, setAthleteData] = useState<{ wellness: WellnessEntry[], sessions: WorkoutSession[] }>({ wellness: [], sessions: [] });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<CoachFeedback[]>([]);
  const [recentSessions, setRecentSessions] = useState<(WorkoutSession & { athleteName?: string })[]>([]);
  const [wods, setWods] = useState<Wod[]>([]);
  const [newWod, setNewWod] = useState({ title: '', description: '', type: '', date: getTodayDate() });
  const [editingWod, setEditingWod] = useState<Wod | null>(null);
  const [showWodForm, setShowWodForm] = useState(false);
  const [selectedWodForLeaderboard, setSelectedWodForLeaderboard] = useState<Wod | null>(null);
  const [todayWellness, setTodayWellness] = useState<Record<string, WellnessEntry>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [adviceText, setAdviceText] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Perfil del Coach (Staff Self-Management)
  const [ownProfileData, setOwnProfileData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || ''
  });

  // --- FIREBASE FULL SYNC ---

  useEffect(() => {
    // 1. Usuarios / Directorio
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });

    // 2. Programación Semanal
    const unsubWods = onSnapshot(query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart), 
      where('date', '<=', weekEnd), 
      orderBy('date', 'asc')
    ), (snap) => {
      const fetchedWods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetchedWods);
      if (fetchedWods.length > 0 && !selectedWodForLeaderboard) {
        const todayMatch = fetchedWods.find(w => w.date === getTodayDate());
        setSelectedWodForLeaderboard(todayMatch || fetchedWods[0]);
      }
    });

    // 3. Daily Reports (Wellness)
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', getTodayDate())), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // 4. Actividad Global (Live Feed)
    const unsubRecent = onSnapshot(query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(30)), (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    return () => { unsubAthletes(); unsubWods(); unsubWellness(); unsubRecent(); };
  }, [weekStart]);

  // Deep Scan para Atleta Seleccionado
  useEffect(() => {
    if (!selectedAthlete) return;
    
    const unsubW = onSnapshot(query(
      collection(db, 'wellness_logs'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'), 
      limit(30)
    ), (snap) => setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) })));
    
    const unsubS = onSnapshot(query(
      collection(db, 'workout_results'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'), 
      limit(50)
    ), (snap) => setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) })));
    
    const unsubF = onSnapshot(query(
      collection(db, 'coach_feedback'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('createdAt', 'desc'),
      limit(15)
    ), (snap) => setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback)));

    return () => { unsubW(); unsubS(); unsubF(); };
  }, [selectedAthlete]);

  // --- BUSINESS LOGIC HANDLERS ---

  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("Parámetros incompletos para publicación de WOD.");
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), { ...newWod, updatedAt: serverTimestamp() }, { merge: true });
        setToast({ message: 'Calendario táctico actualizado', type: 'success' });
      } else {
        await addDoc(collection(db, 'wods'), { ...newWod, coachId: profile?.uid, createdAt: serverTimestamp() });
        setToast({ message: 'Nueva sesión de carga publicada', type: 'success' });
      }
      setShowWodForm(false);
      setEditingWod(null);
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'wods'); }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Confirma la eliminación del entrenamiento de la programación activa?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
      setToast({ message: 'Registro de entrenamiento eliminado', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'wods'); }
  };

  const handleRoleChange = async (uid: string, newRole: 'coach' | 'athlete') => {
    try {
      await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
      setToast({ message: `Jerarquía de acceso actualizada: ${newRole.toUpperCase()}`, type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`); }
  };

  const handleDeleteAthlete = async (uid: string) => {
    if (uid === profile?.uid) return;
    if (!confirm('🚨 ATENCIÓN: Esta acción purgará al atleta de la base de datos maestra permanentemente. ¿Continuar?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setAthletes(prev => prev.filter(a => a.uid !== uid));
      setToast({ message: 'Miembro purgado del sistema', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `users/${uid}`); }
  };

  const handleUpdateOwnProfile = async () => {
    if (!profile?.uid) return;
    try {
      await setDoc(doc(db, 'users', profile.uid), { 
        displayName: ownProfileData.displayName,
        photoURL: ownProfileData.photoURL,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setToast({ message: 'Identidad Staff actualizada con éxito', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${profile.uid}`); }
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete) return;
    try {
      await addDoc(collection(db, 'coach_feedback'), {
        coachId: profile?.uid,
        coachName: profile?.displayName || 'Box Staff',
        athleteId: selectedAthlete.uid,
        content: adviceText,
        createdAt: serverTimestamp()
      });
      setAdviceText('');
      setToast({ message: 'Feedback inyectado en el perfil del atleta', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'coach_feedback'); }
  };
const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-slate-800 opacity-20';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    return avg >= 4 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : 
           avg >= 2.5 ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 
           'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]';
  };
  const todayWod = useMemo(() => wods.find(w => w.date === getTodayDate()), [wods]);
  const filteredAthletes = athletes.filter(a => a.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 pb-48 pt-12">
      
      {/* ----------------------------------------------------------------------
          HEADER PRINCIPAL: IDENTIDAD BOX STAFF
      ---------------------------------------------------------------------- */}
      <header className="space-y-12 animate-in fade-in duration-1000">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="bg-lime-400 text-black px-4 py-1.5 rounded-lg text-[11px] font-black uppercase italic tracking-tighter shadow-2xl shadow-lime-400/30">Privileged Session</div>
              <div className="h-[2px] w-20 bg-slate-800" />
              <p className="text-slate-500 text-[12px] font-bold uppercase tracking-[0.6em] italic opacity-60">Jungle HP Ops Center</p>
            </div>
            <h2 className="text-8xl font-black italic tracking-tighter uppercase text-white leading-none">
               Box <span className="text-lime-400 underline decoration-slate-800 decoration-[16px] underline-offset-[16px] italic">Control</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-900/40 p-5 pr-10 rounded-[44px] border border-slate-800/50 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.5)] group hover:border-emerald-900 transition-all duration-700">
             <div className="relative">
                <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-20 h-20 rounded-[28px] border-4 border-slate-700 object-cover group-hover:scale-110 transition-transform duration-700 shadow-2xl" alt="" />
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full border-[6px] border-slate-900 shadow-2xl animate-pulse" />
             </div>
             <div className="hidden sm:block">
                <p className="text-lg text-white font-black uppercase italic leading-none tracking-tighter mb-2 group-hover:text-emerald-400 transition-colors">{profile?.displayName}</p>
                <div className="flex items-center gap-3">
                   <ShieldAlert className="w-4 h-4 text-lime-500" />
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] leading-none italic">Verified Admin Account</p>
                </div>
             </div>
          </div>
        </div>

        {/* NAVEGACIÓN MASTER MULTIPESTAÑA */}
        <div className="flex bg-slate-900/90 backdrop-blur-3xl p-3 rounded-[40px] border-2 border-slate-800/50 w-full overflow-x-auto scrollbar-hide shadow-[0_50px_100px_rgba(0,0,0,0.7)] z-40 relative group/nav">
          <div className="absolute inset-0 bg-emerald-500/5 blur-[60px] opacity-0 group-hover/nav:opacity-100 transition-opacity duration-1000" />
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Team', icon: ShieldAlert },
            { id: 'profile', label: 'Perfil', icon: UserCircle },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-3 px-10 py-7 rounded-[30px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-700 relative group/btn", 
                activeTab === item.id 
                  ? "bg-emerald-700 text-white shadow-[0_25px_60px_rgba(4,120,87,0.6)] scale-[1.08] z-10 border border-emerald-500/30" 
                  : "text-slate-500 hover:text-slate-100 hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn("w-7 h-7 transition-all duration-700", activeTab === item.id ? "scale-125 rotate-3" : "group-hover/btn:scale-125")} /> 
              <span className="group-hover/btn:tracking-[0.3em] transition-all duration-700">{item.label}</span>
              {activeTab === item.id && (
                 <motion.div layoutId="nav-glow-master" className="absolute -bottom-2 w-16 h-2 bg-lime-400 rounded-full shadow-[0_0_30px_rgba(163,230,53,1)]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          PESTAÑA 1: DASHBOARD (ESTADÍSTICAS Y PODIO LIVE)
      ---------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-14 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          
          {/* MASTER KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              { label: 'Jungle Community', value: athletes.length, icon: Users, color: 'text-lime-400', sub: 'Miembros activos' },
              { label: 'Readiness Index', value: Object.keys(todayWellness).length, icon: ShieldAlert, color: 'text-emerald-500', sub: 'Informes matutinos' },
              { label: 'Total Volume Log', value: recentSessions.length, icon: Dumbbell, color: 'text-lime-400', sub: 'Sesiones 30d' },
              { label: 'Systemic Fatigue', value: '4.8 RPE', icon: TrendingDown, color: 'text-red-500', sub: 'Carga team avg' },
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                key={stat.label} 
                className="bg-slate-900/60 p-12 rounded-[56px] border-2 border-slate-800/50 group hover:border-slate-600 transition-all duration-700 shadow-3xl backdrop-blur-md relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 p-8 opacity-[0.03] group-hover:scale-150 transition-transform duration-1000 group-hover:rotate-12">
                   <stat.icon className="w-32 h-32 text-white" />
                </div>
                <stat.icon className={cn("w-9 h-9 mb-12 transition-transform duration-700 group-hover:scale-125", stat.color)} />
                <div className="text-6xl font-black italic tracking-tighter text-white leading-none mb-4 group-hover:text-lime-400 transition-colors">{stat.value}</div>
                <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-slate-600 leading-none italic mb-4">{stat.label}</p>
                <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
            {/* LADO IZQUIERDO: RANKING DEL DÍA */}
            <div className="lg:col-span-2 space-y-12">
               <section className="bg-slate-900 rounded-[70px] p-20 border-2 border-slate-800 shadow-[0_80px_160px_rgba(0,0,0,0.7)] relative overflow-hidden group">
                  <div className="absolute -top-20 -right-20 p-20 opacity-[0.03] group-hover:scale-125 transition-transform duration-[2000ms] pointer-events-none rotate-[20deg]">
                     <Trophy className="w-[600px] h-[600px] text-white" />
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-20 gap-10 relative z-10">
                    <div className="flex items-center gap-10">
                      <div className="w-20 h-20 rounded-[36px] bg-lime-400 flex items-center justify-center shadow-[0_0_50px_rgba(163,230,53,0.5)] transition-all group-hover:rotate-[15deg] group-hover:scale-110">
                         <Zap className="w-12 h-12 text-black" />
                      </div>
                      <div>
                        <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-6">
                           Live <span className="text-lime-400 italic">Leaderboard</span>
                        </h3>
                        <p className="text-[14px] text-slate-500 font-bold uppercase tracking-[0.5em] leading-none italic opacity-60">Resultados verificados de la sesión de hoy</p>
                      </div>
                    </div>
                    <div className="bg-slate-950/90 px-10 py-5 rounded-[28px] border-2 border-slate-800 shadow-3xl backdrop-blur-xl">
                       <p className="text-[16px] text-slate-300 font-black uppercase tracking-[0.4em] italic font-mono">{formatDate(getTodayDate())}</p>
                    </div>
                  </div>

                  {todayWod ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }}>
                       <WodRanking wodId={todayWod.id!} type={todayWod.type as any} />
                    </motion.div>
                  ) : (
                    <div className="p-32 text-center border-4 border-dashed border-slate-800/60 rounded-[70px] bg-slate-950/30 group hover:border-emerald-900/50 transition-all duration-1000">
                       <div className="w-28 h-28 bg-slate-900 rounded-[40px] flex items-center justify-center mx-auto mb-12 border-2 border-slate-800 shadow-3xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                          <Calendar className="w-14 h-14 text-slate-700 group-hover:text-emerald-500 transition-colors" />
                       </div>
                       <p className="text-slate-600 italic text-[16px] font-black uppercase tracking-[0.6em] leading-relaxed max-w-md mx-auto mb-12 opacity-40">
                          PROGRAMACIÓN ACTUAL EN BLANCO
                       </p>
                       <button onClick={() => setActiveTab('wods')} className="bg-slate-950 text-emerald-500 border border-emerald-900/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.5em] text-[11px] hover:bg-emerald-900 hover:text-white transition-all shadow-2xl">CREAR SESIÓN +</button>
                    </div>
                  )}
               </section>
            </div>
            
            {/* LADO DERECHO: FEED DE ACTIVIDAD EN VIVO */}
            <section className="bg-slate-900 rounded-[70px] p-14 border-2 border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden h-full">
               <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-[30deg] scale-150">
                  <Activity className="w-64 h-64 text-white" />
               </div>
               <h3 className="text-[13px] font-black italic uppercase tracking-[0.6em] flex items-center gap-6 text-slate-400 mb-20 leading-none relative z-10">
                  <HistoryIcon className="w-7 h-7 text-lime-400" /> REAL-TIME ACTIVITY
               </h3>
               <div className="space-y-8 overflow-y-auto flex-1 scrollbar-hide relative z-10 pr-4">
                 {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                     key={s.id} 
                     className="bg-slate-950/80 p-8 rounded-[40px] border-2 border-slate-900 flex items-center justify-between hover:bg-slate-900 hover:border-emerald-900/40 transition-all cursor-pointer shadow-3xl group"
                     onClick={() => { const ath = athletes.find(a => a.uid === s.athleteId); if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }}}
                   >
                     <div className="flex items-center gap-6">
                        <div className="relative group-hover:scale-110 transition-transform duration-700">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.athleteId}`} className="w-16 h-16 rounded-[24px] border-2 border-slate-800 object-cover shadow-2xl" alt="" />
                           <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        </div>
                        <div>
                           <p className="text-[16px] font-black italic uppercase text-slate-100 leading-none mb-3 tracking-tighter group-hover:text-lime-400 transition-colors">{s.athleteName}</p>
                           <p className="text-[10px] text-slate-700 uppercase font-black font-mono leading-none tracking-[0.3em] italic opacity-50">SYNC_OK • {s.date}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-2xl font-black italic text-lime-400 leading-none drop-shadow-[0_0_12px_rgba(163,230,53,0.4)] group-hover:scale-125 transition-transform duration-500">{s.score}</p>
                     </div>
                   </motion.div>
                 )) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <Activity className="w-24 h-24 mb-10" />
                      <p className="text-[14px] font-black uppercase italic tracking-[0.6em] text-center">SYNCHRONIZING WITH CLOUD...</p>
                   </div>
                 )}
               </div>
               
               {/* ACCESO RÁPIDO Y COMPARTIR BOX */}
               <div className="mt-14 pt-14 border-t-2 border-slate-800/50">
                   <button 
                     onClick={copyToClipboard}
                     className="w-full bg-slate-950 text-slate-500 border-2 border-slate-800 py-8 rounded-[36px] font-black uppercase tracking-[0.5em] text-[12px] flex items-center justify-center gap-6 hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-3xl italic"
                   >
                     {copied ? '¡PROTOCOL COPIED!' : 'SHARE BOX ACCESS URL'}
                     <ArrowUpRight className="w-6 h-6" />
                   </button>
                </div>
            </section>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 2: PULSE MONITOR (SALUD Y RECUPERACIÓN)
      ---------------------------------------------------------------------- */}
      {activeTab === 'pulse' && (
        <div className="space-y-12 animate-in fade-in duration-800 slide-in-from-left-10">
           <div className="bg-slate-900 rounded-[80px] p-24 border-2 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute -top-40 -right-40 p-40 opacity-[0.02] pointer-events-none scale-150 rotate-[35deg]">
                 <ShieldAlert className="w-[800px] h-[800px] text-white" />
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-20 mb-28 relative z-10">
                 <div className="space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-5 h-5 rounded-full bg-red-500 animate-ping shadow-[0_0_35px_rgba(239,68,68,1)]" />
                       <p className="text-red-500 text-[14px] font-black uppercase tracking-[0.6em] italic leading-none">Box Health Biometrics v3.0</p>
                    </div>
                    <h3 className="text-8xl font-black italic uppercase tracking-tighter text-white leading-none mb-0">
                      Jungle <span className="text-lime-400">Pulse</span>
                    </h3>
                    <p className="text-[16px] text-slate-600 font-bold uppercase tracking-widest mt-12 leading-relaxed max-w-2xl italic opacity-80">
                       Análisis táctico de recuperación sistémica del equipo. Monitoreo predictivo basado en la calidad del sueño, nutrición y fatiga basal del atleta.
                    </p>
                 </div>
                 <div className="bg-slate-950/95 p-6 rounded-[40px] border-2 border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-3xl flex flex-wrap items-center gap-6">
                    {[
                      { label: 'Optimum', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.6)' },
                      { label: 'Monitor', color: 'bg-amber-400', glow: 'rgba(251,191,36,0.6)' },
                      { label: 'Alert', color: 'bg-red-500', glow: 'rgba(239,68,68,0.6)' }
                    ].map(status => (
                      <div key={status.label} className="flex items-center gap-5 px-10 py-5 rounded-[24px] hover:bg-slate-900 transition-all group cursor-default border border-transparent hover:border-slate-800">
                         <div className={cn("w-5 h-5 rounded-full shadow-2xl transition-all group-hover:scale-150 duration-500", status.color)} style={{ boxShadow: `0 0 15px ${status.glow}` }} />
                         <span className="text-[11px] font-black uppercase text-slate-500 italic tracking-[0.4em]">{status.label}</span>
                      </div>
                    ))}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 gap-10 relative z-10">
                {athletes.filter(a => a.role === 'athlete').map((a, idx) => {
                  const w = todayWellness[a.uid];
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} 
                      key={a.uid} 
                      className="bg-slate-950/90 p-14 rounded-[64px] border-2 border-slate-900 flex flex-col xl:flex-row xl:items-center justify-between gap-20 hover:border-emerald-900/40 hover:bg-slate-900 transition-all group shadow-3xl relative overflow-hidden"
                    >
                       <div className="flex items-center gap-14 min-w-[550px]">
                          <div className="relative group/avatar">
                             <div className="absolute inset-0 bg-white/5 blur-[100px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-1000" />
                             <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-32 h-32 rounded-[50px] border-[6px] border-slate-800 group-hover/avatar:scale-105 group-hover/avatar:border-emerald-500/50 transition-all duration-1000 shadow-3xl z-10 relative object-cover" alt="" />
                             <div className={cn("absolute -bottom-5 -right-5 w-14 h-14 rounded-[36px] border-[12px] border-slate-950 shadow-2xl z-20 flex items-center justify-center transition-all group-hover/avatar:scale-110", getDayReadinessColor([w].filter(Boolean)))}>
                                {w && <div className="w-4 h-4 rounded-full bg-white animate-ping" />}
                             </div>
                          </div>
                          <div className="space-y-6">
                             <h4 className="text-5xl font-black uppercase italic text-white tracking-tighter leading-none group-hover:text-emerald-400 transition-colors duration-700">{a.displayName}</h4>
                             <div className="flex flex-wrap gap-6 items-center">
                                <div className="bg-slate-900 px-8 py-3 rounded-[20px] border-2 border-slate-800 text-[12px] font-black uppercase italic text-slate-500 tracking-[0.3em] flex items-center gap-5 shadow-2xl shadow-black/50 transition-all group-hover:border-emerald-900/50">
                                   {w ? <ClipboardCheck className="w-6 h-6 text-emerald-500" /> : <AlertTriangle className="w-6 h-6 text-red-500" />}
                                   {w ? 'SYSTEMS SYNCED' : 'PENDING BIOMETRIC SCAN'}
                                </div>
                                <div className="h-0.5 w-10 bg-slate-800" />
                                <p className="text-[11px] text-slate-700 font-bold uppercase tracking-[0.5em] leading-none italic font-mono opacity-50">v2.5_BIOLOG_OK</p>
                             </div>
                          </div>
                       </div>

                       {w ? (
                         <div className="grid grid-cols-3 gap-10">
                            {[
                              { val: w.sleepQuality, label: 'Sleep Efficiency', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.7)', desc: 'Zzz' },
                              { val: w.nutrition, label: 'Fueling Score', color: 'bg-lime-400', glow: 'rgba(163,230,53,0.7)', desc: 'Kcal' },
                              { val: 6 - w.stressLevel, label: 'Sistemic Stress', color: 'bg-red-500', glow: 'rgba(239,68,68,0.7)', desc: 'Cort' }
                            ].map((x, i) => (
                              <div key={i} className="bg-slate-900/80 p-10 rounded-[48px] border-2 border-slate-800/50 text-center w-48 group-hover:border-slate-700 transition-all duration-700 shadow-inner hover:bg-slate-950 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap className="w-10 h-10 text-white" />
                                 </div>
                                 <p className="text-[11px] text-slate-600 font-black uppercase mb-8 italic tracking-[0.4em] leading-none whitespace-nowrap">{x.label}</p>
                                 <div className="flex justify-center gap-2.5 mb-6">
                                    {[1,2,3,4,5].map(s => (
                                       <div key={s} className={cn("w-3.5 h-3.5 rounded-full transition-all duration-1000", s <= x.val ? cn(x.color, "scale-125") : "bg-slate-800 scale-90")} style={s <= x.val ? { boxShadow: `0 0 25px ${x.glow}` } : {}} />
                                    ))}
                                 </div>
                                 <p className="text-2xl font-black italic text-white mt-6 leading-none font-mono opacity-70 tracking-widest">{x.val}.0<span className="text-[11px] ml-1.5 text-slate-700">/ 5.0</span></p>
                                 <p className="text-[9px] font-bold text-slate-700 uppercase mt-4 tracking-[0.5em] italic">{x.desc}</p>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="flex-1 flex justify-center xl:justify-end items-center px-28 py-16 border-4 border-dashed border-slate-900/60 rounded-[60px] bg-slate-950/30 group-hover:border-slate-800 group-hover:bg-slate-950/50 transition-all duration-1000 shadow-inner">
                            <div className="flex items-center gap-10 opacity-20 group-hover:opacity-60 transition-all duration-1000 group-hover:scale-105">
                               <ShieldAlert className="w-20 h-20 text-slate-700" />
                               <div className="text-left">
                                  <p className="text-[18px] font-black uppercase italic tracking-[0.6em] leading-none text-slate-500 mb-3">INCOMPLETE REPORT</p>
                                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.3em]">Manual sync required from athlete terminal</p>
                               </div>
                            </div>
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
          PESTAÑA 3: ATLETAS (GESTIÓN COMPLETA Y ANALYTICS PROFUNDO)
      ---------------------------------------------------------------------- */}
      {activeTab === 'athletes' && (
        <div className="space-y-12 animate-in fade-in duration-1000 slide-in-from-right-10">
          {!selectedAthlete ? (
            <div className="bg-slate-900 rounded-[70px] p-20 border-2 border-slate-800 shadow-[0_80px_160px_rgba(0,0,0,0.7)] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none rotate-[15deg] scale-150">
                  <Users className="w-[800px] h-[800px] text-white" />
               </div>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-16 mb-24 relative z-10">
                  <div className="space-y-8">
                    <div className="flex items-center gap-6">
                       <div className="w-3 h-12 bg-emerald-500 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)]" />
                       <h3 className="text-7xl font-black italic uppercase tracking-tighter text-white leading-none mb-0">Athlete <span className="text-emerald-500 italic underline decoration-emerald-950/50 decoration-[16px] underline-offset-[16px]">Database</span></h3>
                    </div>
                    <p className="text-[15px] text-slate-600 font-bold uppercase tracking-widest mt-10 max-w-xl italic leading-relaxed opacity-80">
                       Repositorio operativo central de Jungle HP. Consulta de jerarquías de acceso, métricas de rendimiento analítico y protocolos de feedback.
                    </p>
                  </div>
                  <div className="relative group w-full md:w-[550px]">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-[80px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
                    <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-800 group-focus-within:text-emerald-500 transition-all z-20 duration-500 group-focus-within:rotate-90" />
                    <input 
                      placeholder="SEARCH ATHLETE IDENTIFIER..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[48px] py-10 pl-24 pr-12 text-[14px] font-black uppercase tracking-[0.5em] text-white outline-none focus:border-emerald-700 transition-all shadow-[0_30px_70px_rgba(0,0,0,0.5)] placeholder-slate-900 group-hover:border-slate-700 font-mono" 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                 {filteredAthletes.map((a, idx) => (
                   <motion.button 
                     initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}
                     whileHover={{ scale: 1.05, y: -15, rotate: 1 }}
                     key={a.uid} 
                     onClick={() => setSelectedAthlete(a)} 
                     className="flex items-center justify-between p-12 rounded-[60px] border-2 border-slate-800 bg-slate-950/50 hover:border-emerald-600/60 hover:bg-slate-900/80 transition-all group shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group/card"
                   >
                      <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity duration-1000 rotate-[-15deg] group-hover:rotate-0">
                         <Dumbbell className="w-24 h-24 text-white" />
                      </div>
                      <div className="flex items-center gap-10 text-left relative z-10">
                        <div className="relative group/av">
                           <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-24 h-24 rounded-[40px] border-[4px] border-slate-800 group-hover:border-emerald-500 transition-all duration-700 shadow-2xl object-cover group-hover/av:scale-110" alt="" />
                           {todayWellness[a.uid] && <div className={cn("absolute -bottom-3 -right-3 w-10 h-10 rounded-full border-[8px] border-slate-950 shadow-3xl transition-all duration-700 group-hover/av:rotate-12", getDayReadinessColor([todayWellness[a.uid]]))}/>}
                        </div>
                        <div className="space-y-4">
                           <p className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none group-hover:text-emerald-400 transition-colors duration-700">{a.displayName}</p>
                           <div className="flex items-center gap-4">
                              <span className="text-[11px] text-slate-700 font-black uppercase tracking-[0.4em] bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-800 italic leading-none">{a.role} ACCESS</span>
                              {todayWellness[a.uid] && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-pulse" />}
                           </div>
                        </div>
                      </div>
                      <ChevronRight className="w-10 h-10 text-slate-800 group-hover:text-emerald-500 group-hover:translate-x-4 transition-all duration-700" />
                   </motion.button>
                 ))}
               </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in zoom-in-95 duration-1000 slide-in-from-bottom-20">
               <button 
                  onClick={() => setSelectedAthlete(null)} 
                  className="text-[14px] font-black uppercase tracking-[0.6em] text-emerald-500 italic flex items-center gap-8 mb-12 hover:gap-10 transition-all group p-6 bg-emerald-950/20 rounded-[36px] w-fit border-2 border-emerald-900/30 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
               >
                  <ArrowLeft className="w-8 h-8 group-hover:scale-125 group-hover:-translate-x-2 transition-transform duration-500" /> VOLVER A LA BASE DE DATOS CENTRAL
               </button>
               
               {/* VISTA DE PERFIL EXPANDIDO (ELITE ANALYTICS) 
                   Esta sección contiene el Dashboard detallado del atleta.
               */}
               <div className="bg-slate-900 rounded-[100px] p-24 border-2 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,0.9)] relative overflow-hidden text-white">
                  
                  {/* Visual Decoration */}
                  <div className="absolute top-0 right-0 p-40 opacity-[0.03] pointer-events-none rotate-[20deg] scale-150">
                     <HeartPulse className="w-[800px] h-[800px] text-white" />
                  </div>

                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-24 mb-32 relative z-10 text-center lg:text-left border-b-4 border-slate-800/40 pb-28">
                     <div className="relative group/avlarge">
                        <div className="absolute inset-0 bg-lime-400 blur-[120px] opacity-0 group-hover/avlarge:opacity-30 transition-opacity duration-[2000ms]" />
                        <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-80 h-80 rounded-[80px] border-[12px] border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,0.8)] group-hover/avlarge:scale-[1.08] group-hover/avlarge:rotate-[-2deg] transition-all duration-[1500ms] z-10 relative object-cover shadow-black" alt="" />
                        <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-[50px] border-[20px] border-slate-900 flex items-center justify-center z-20 shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all group-hover/avlarge:scale-110 group-hover/avlarge:rotate-[15deg] duration-1000", getDayReadinessColor(athleteData.wellness))}>
                           <Flame className="w-12 h-12 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                        </div>
                     </div>
                     <div className="flex-1 space-y-14">
                        <div className="space-y-6">
                           <div className="flex flex-wrap items-center justify-center lg:justify-start gap-10">
                              <h3 className="text-9xl font-black italic uppercase tracking-tighter leading-[0.65] mb-0 group-hover:text-emerald-400 transition-colors duration-1000 shadow-emerald-500/20">{selectedAthlete.displayName}</h3>
                              <div className="bg-slate-950/80 px-8 py-4 rounded-3xl border-4 border-slate-800 text-[16px] font-black uppercase text-slate-700 italic tracking-[0.5em] leading-none shadow-[0_30px_60px_rgba(0,0,0,1)] hover:scale-110 transition-transform">ELITE RX_DIV</div>
                           </div>
                           <p className="text-[18px] text-slate-600 font-bold uppercase tracking-[0.8em] italic leading-none max-w-4xl mx-auto lg:mx-0 mt-8 opacity-60">
                              Systemic Biometric & Performance Analysis / Staff Access Only
                           </p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                           <div className="bg-slate-950/80 backdrop-blur-2xl text-slate-400 px-12 py-7 rounded-[32px] text-[14px] font-black uppercase italic border-2 border-slate-800 tracking-[0.4em] leading-none shadow-3xl hover:border-slate-600 transition-all duration-700 hover:translate-y-[-10px]">
                              {selectedAthlete.role} STAFF LEVEL
                           </div>
                           <div className="bg-lime-400 text-slate-950 px-12 py-7 rounded-[32px] text-[14px] font-black uppercase italic tracking-[0.4em] leading-none shadow-[0_30px_80px_rgba(163,230,53,0.5)] active:scale-95 transition-all cursor-default border-4 border-lime-300/30">
                              ACTIVE PERFORMANCE DATA
                           </div>
                           <div className="bg-slate-800/50 text-white px-12 py-7 rounded-[32px] text-[14px] font-black uppercase italic tracking-[0.4em] leading-none border-2 border-slate-700 shadow-3xl hover:bg-slate-800 transition-all font-mono">
                              MEMBER_ID: {selectedAthlete.uid.slice(0,18).toUpperCase()}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* HIGH-LEVEL KPI METRICS DASHBOARD */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-32 relative z-10 px-10">
                    {[
                      { label: 'Readiness Core', value: 'OPTIMAL', color: getDayReadinessColor(athleteData.wellness), icon: ShieldAlert, sub: 'Daily health check v2.5' },
                      { label: 'Work Intensity (30d)', value: '7.8 RPE', color: 'text-lime-400', icon: TrendingUp, sub: 'Esfuerzo percibido avg' },
                      { label: 'Global Log Count', value: athleteData.sessions.length, color: 'text-white', icon: Dumbbell, sub: 'Lifetime sessions' },
                      { label: 'Systemic Fatigue', value: '4.2 / 10', color: 'text-red-500', icon: AlertTriangle, sub: 'Chronic load index' }
                    ].map((kpi, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="bg-slate-950/80 p-14 rounded-[70px] border-2 border-slate-800 text-center backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] group hover:border-slate-600 transition-all duration-1000 hover:scale-[1.08] shadow-black"
                      >
                         <kpi.icon className={cn("w-14 h-14 mx-auto mb-14 opacity-30 group-hover:opacity-100 transition-all duration-[1200ms] group-hover:scale-[1.3] group-hover:rotate-6", kpi.color.includes('bg-') ? 'text-white' : kpi.color)} />
                         <p className="text-[14px] font-black uppercase text-slate-700 mb-8 italic tracking-[0.5em] leading-none">{kpi.label}</p>
                         {kpi.color.includes('bg-') ? (
                            <div className={cn("w-12 h-12 rounded-[36px] mx-auto shadow-[0_0_40px_rgba(0,0,0,1)] shadow-current group-hover:scale-125 transition-transform duration-1000", kpi.color)} />
                         ) : (
                            <p className={cn("text-6xl font-black italic tracking-tighter leading-none mb-6", kpi.color)}>{kpi.value}</p>
                         )}
                         <p className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.4em] mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 leading-none">{kpi.sub}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* ANALYTICS: EVOLUTION PERFORMANCE RADAR */}
                  <div className="bg-slate-950/90 p-20 rounded-[80px] border-2 border-slate-800 mb-32 shadow-[inset_0_20px_100px_rgba(0,0,0,1)] relative group overflow-hidden">
                     <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:opacity-15 transition-opacity duration-[2000ms]">
                        <BarChart3 className="w-64 h-64 text-white" />
                     </div>
                     <div className="flex flex-col xl:flex-row items-center justify-between mb-24 px-10 gap-12 relative z-10">
                        <div className="text-center xl:text-left">
                           <h4 className="text-[28px] font-black uppercase italic text-white tracking-[0.6em] mb-6 leading-none">Performance Evolution Radar</h4>
                           <p className="text-[13px] text-slate-600 font-bold uppercase tracking-[0.4em] leading-relaxed italic max-w-2xl">Visualización temporal cruzada de carga externa (Score) vs carga interna percibida (RPE).</p>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-[32px] border-2 border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex items-center gap-10 backdrop-blur-3xl">
                           <div className="flex items-center gap-4 group/leg">
                              <div className="w-4 h-4 rounded-full bg-lime-400 group-hover/leg:scale-125 transition-transform" />
                              <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none">External Score</span>
                           </div>
                           <div className="flex items-center gap-4 group/leg">
                              <div className="w-4 h-4 rounded-full bg-red-500/50 group-hover/leg:scale-125 transition-transform" />
                              <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none">Effort Perception (RPE)</span>
                           </div>
                        </div>
                     </div>
                     <PerformanceChart data={athleteData.sessions} />
                  </div>

                  {/* LOWER GRID: LOGS & FEEDBACK HUB */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 pt-32 border-t-4 border-slate-800/40 relative">
                     
                     {/* HISTORIAL DETALLADO DE SESIONES */}
                     <div className="space-y-20">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-8">
                              <div className="p-5 bg-emerald-500/10 rounded-[28px] border-2 border-emerald-500/10 shadow-3xl">
                                 <HistoryIcon className="w-10 h-10 text-emerald-500" />
                              </div>
                              <h4 className="text-[24px] font-black uppercase italic text-slate-200 tracking-[0.6em] leading-none mb-0">Training Log Archive</h4>
                           </div>
                           <div className="hidden sm:flex flex-col items-end">
                              <span className="text-[12px] font-black uppercase text-slate-700 bg-slate-950 px-8 py-4 rounded-2xl border-2 border-slate-800 font-mono shadow-inner tracking-[0.4em] italic">DB_SYNC_v3.0</span>
                           </div>
                        </div>
                        <div className="space-y-6 max-h-[850px] overflow-y-auto scrollbar-hide pr-10 group">
                          {athleteData.sessions.length > 0 ? athleteData.sessions.map((s, i) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              key={s.id} 
                              className="bg-slate-950/90 p-12 rounded-[56px] border-2 border-slate-900 flex justify-between items-center group/card hover:border-emerald-900/60 hover:bg-slate-900/80 transition-all duration-700 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover/card:opacity-5 transition-opacity duration-1000 rotate-[-15deg]">
                                 <Activity className="w-32 h-32 text-white" />
                              </div>
                              <div className="flex items-center gap-12 relative z-10">
                                <div className="w-24 h-24 rounded-[36px] bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center font-mono leading-none group-hover/card:border-emerald-700 group-hover/card:scale-105 transition-all duration-700 shadow-inner">
                                   <span className="text-3xl text-white font-black leading-none">{s.date.split('-')[2]}</span>
                                   <span className="text-[12px] text-slate-600 font-black uppercase mt-3 tracking-[0.3em]">{s.date.split('-')[1]}</span>
                                </div>
                                <div className="space-y-4">
                                   <p className="text-[22px] font-black uppercase italic text-slate-100 group-hover/card:text-emerald-400 transition-all duration-700 tracking-tighter leading-none">{s.modality || 'Jungle Workout'}</p>
                                   <div className="flex items-center gap-6 mt-6 opacity-40 group-hover/card:opacity-100 transition-opacity duration-1000">
                                      <div className="flex items-center gap-3 bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-800">
                                         <Weight className="w-4 h-4 text-emerald-500" /> 
                                         <span className="text-[11px] text-slate-500 uppercase font-black italic tracking-widest leading-none">RX_LOG</span>
                                      </div>
                                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                                      <div className="flex items-center gap-3 bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-800">
                                         <Activity className="w-4 h-4 text-lime-400" /> 
                                         <span className="text-[11px] text-slate-500 uppercase font-black italic tracking-widest leading-none">RPE {s.rpe}/10</span>
                                      </div>
                                   </div>
                                </div>
                              </div>
                              <div className="text-right relative z-10">
                                 <p className="text-5xl font-black italic text-lime-400 leading-none group-hover/card:scale-[1.2] transition-transform duration-1000 drop-shadow-[0_0_25px_rgba(163,230,53,0.4)] font-mono tracking-tighter">{s.score}</p>
                                 <div className="mt-6 flex justify-end gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                 </div>
                              </div>
                            </motion.div>
                          )) : (
                             <div className="p-40 text-center border-4 border-dashed border-slate-800/40 rounded-[80px] bg-slate-950/30 group hover:border-slate-700 transition-all duration-1000">
                                <HistoryIcon className="w-24 h-24 text-slate-800 mx-auto mb-12 opacity-10 group-hover:scale-110 transition-transform duration-1000" />
                                <p className="text-slate-800 text-[18px] font-black uppercase italic tracking-[0.6em] leading-relaxed max-w-sm mx-auto opacity-30">SIN REGISTROS OPERATIVOS EN EL CICLO ACTUAL</p>
                             </div>
                          )}
                        </div>
                     </div>

                     {/* COACHING HUB: FEEDBACK DIRECTO */}
                     <div className="space-y-20">
                        <div className="flex items-center gap-8">
                           <div className="p-5 bg-lime-400/10 rounded-[28px] border-2 border-lime-400/10 shadow-[0_0_40px_rgba(163,230,53,0.2)]">
                              <MessageSquare className="w-10 h-10 text-lime-400 shadow-lime-400/20 shadow-2xl" />
                           </div>
                           <h4 className="text-[24px] font-black uppercase italic text-slate-200 tracking-[0.6em] leading-none mb-0">Staff Direct Control</h4>
                        </div>
                        
                        <div className="bg-slate-950 p-14 rounded-[70px] border-2 border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative group overflow-hidden">
                           <div className="absolute top-0 right-0 p-14 opacity-[0.01] pointer-events-none group-hover:opacity-15 transition-opacity duration-[1500ms] rotate-[20deg]">
                              <Send className="w-72 h-72 text-white" />
                           </div>
                           <p className="text-[14px] text-slate-600 font-black uppercase mb-14 italic tracking-[0.5em] leading-none ml-6 flex items-center gap-6">
                              <Target className="w-7 h-7 text-emerald-500" /> EMITIR PROTOCOLO DE CORRECCIÓN
                           </p>
                           <div className="flex flex-col gap-12 relative z-10">
                              <textarea 
                                placeholder="ESCRIBE AQUÍ TU ANÁLISIS TÉCNICO, FEEDBACK O PROTOCOLO DE AJUSTE PERSONALIZADO PARA ESTE ATLETA..." 
                                value={adviceText}
                                onChange={(e) => setAdviceText(e.target.value)}
                                rows={8}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-[48px] p-12 text-[18px] font-medium italic text-slate-200 placeholder-slate-800 outline-none focus:border-lime-500 transition-all duration-700 leading-relaxed shadow-inner font-mono" 
                              />
                              <button 
                                onClick={handleAdviceSubmit}
                                disabled={!adviceText.trim()}
                                className="w-full bg-emerald-700 text-white py-10 rounded-[40px] font-black uppercase text-[16px] tracking-[0.6em] shadow-[0_30px_70px_rgba(4,120,87,0.6)] active:scale-95 transition-all duration-700 disabled:opacity-20 flex items-center justify-center gap-8 group/btn border-4 border-emerald-600/50 italic"
                              >
                                COMMIT FEEDBACK
                                <Send className="w-8 h-8 group-hover/btn:translate-x-4 group-hover/btn:-translate-y-4 transition-transform duration-1000" />
                              </button>
                           </div>
                           <p className="text-[11px] text-slate-800 font-bold uppercase mt-14 ml-6 tracking-[0.4em] italic leading-none opacity-40">System alert: Feedback validado y sincronizado automáticamente.</p>
                        </div>

                        {/* FEEDBACK HISTORY TIMELINE */}
                        <div className="space-y-10 max-h-[600px] overflow-y-auto scrollbar-hide pr-10 mt-16 group">
                          {feedbackHistory.map((f, i) => (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                              key={f.id} 
                              className="bg-emerald-950/10 p-12 rounded-[60px] border border-emerald-900/10 relative overflow-hidden border-l-lime-400 border-l-[10px] group hover:bg-emerald-900/10 transition-all duration-700 shadow-3xl"
                            >
                              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:rotate-[-15deg] rotate-45 transition-transform duration-[1500ms]">
                                 <MessageSquare className="w-32 h-32 text-white" />
                              </div>
                              <p className="text-[22px] italic text-slate-100 font-medium leading-relaxed relative z-10 group-hover:text-white transition-colors duration-700 tracking-tight leading-snug">"{f.content}"</p>
                              <div className="flex justify-between items-center mt-12 pt-10 border-t border-emerald-900/10 relative z-10">
                                 <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-[22px] bg-lime-400 flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.6)] group-hover:rotate-12 transition-transform duration-700"><CheckCircle2 className="w-8 h-8 text-black" /></div>
                                    <div className="space-y-2">
                                       <p className="text-[13px] font-black uppercase tracking-[0.5em] text-lime-400 italic">Jungle HP Staff</p>
                                       <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic leading-none">{f.coachName || 'STAFF_CONTROL_VERIFIED'}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[11px] text-slate-700 font-mono font-black tracking-[0.3em] uppercase italic leading-none opacity-50">SYNC_STATUS: DELIVERED</p>
                                 </div>
                              </div>
                            </motion.div>
                          ))}
                          {feedbackHistory.length === 0 && (
                            <div className="p-40 text-center bg-slate-950/20 rounded-[80px] border-4 border-dashed border-slate-900/40 opacity-10 group hover:opacity-20 transition-opacity duration-1000">
                              <MessageSquare className="w-28 h-28 mx-auto mb-12 text-slate-700" />
                              <p className="text-[15px] font-black uppercase tracking-[0.6em] text-slate-700 leading-none">WAITING FOR TECHNICAL ANALYTICS</p>
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
          PESTAÑA 4: PROGRAMACIÓN (CALENDARIO SEMANAL & CRUD)
      ---------------------------------------------------------------------- */}
      {activeTab === 'wods' && (
        <div className="space-y-16 animate-in fade-in duration-1000 slide-in-from-top-12">
           <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-16 border-b-4 border-slate-900/50 pb-20">
              <div className="space-y-8 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-6">
                   <div className="w-5 h-5 rounded-full bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,1)] animate-pulse" />
                   <p className="text-emerald-500 text-[14px] font-black uppercase tracking-[0.8em] italic leading-none">Staff Programming Protocol v2.5</p>
                </div>
                <h3 className="text-9xl font-black italic uppercase text-white tracking-tighter leading-none flex flex-wrap justify-center lg:justify-start items-center gap-12">
                  WOD <span className="text-emerald-500 underline underline-offset-[25px] decoration-[20px] decoration-emerald-950/70 italic">Schedule</span>
                </h3>
                <div className="bg-slate-900/70 p-8 rounded-[36px] border-2 border-slate-800/50 inline-block backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] group">
                   <p className="text-[16px] text-slate-500 font-black uppercase tracking-[0.5em] leading-none italic flex items-center gap-6 group-hover:text-white transition-colors duration-700">
                      <Calendar className="w-8 h-8 text-emerald-500 group-hover:rotate-12 transition-transform" /> RANGO_SEM: {formatDate(weekStart).split(',')[1]} — {formatDate(weekEnd).split(',')[1]}
                   </p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} 
                className="bg-emerald-700 text-white px-20 py-12 rounded-[56px] text-[18px] font-black uppercase flex items-center gap-10 hover:bg-emerald-600 active:scale-95 transition-all shadow-[0_50px_100px_rgba(4,120,87,0.5)] border-4 border-emerald-500/20 group relative z-10 italic"
              >
                <div className="bg-emerald-950 p-4 rounded-[24px] group-hover:rotate-180 transition-transform duration-1000 shadow-2xl border-2 border-emerald-800/50">
                   <Plus className="w-10 h-10" />
                </div>
                AGREGAR SESIÓN DE CARGA
              </button>
           </div>

           {/* 7-DAY TACTICAL GRID */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14">
             {weekDates.map((date, idx) => {
               const dayWods = wods.filter(w => w.date === date);
               const isToday = date === getTodayDate();
               return (
                 <motion.div 
                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    key={date} 
                    className={cn(
                        "bg-slate-900/40 p-16 rounded-[80px] border transition-all duration-1000 flex flex-col h-full min-h-[650px] backdrop-blur-3xl relative group shadow-[0_40px_80px_rgba(0,0,0,0.5)]",
                        isToday ? "border-emerald-500/50 bg-slate-900/90 shadow-[0_80px_160px_rgba(0,0,0,0.8)] ring-[12px] ring-emerald-500/10 scale-[1.08] z-30" : "border-slate-800 shadow-black hover:border-slate-600 hover:bg-slate-900/60"
                    )}
                 >
                    {isToday && (
                       <div className="absolute top-14 right-14">
                          <div className="px-8 py-3 rounded-[24px] bg-emerald-500 text-black text-[12px] font-black uppercase italic tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.6)] animate-bounce border-2 border-emerald-400">
                             ACTIVE TODAY
                          </div>
                       </div>
                    )}
                    <div className="mb-24 text-center relative group/title">
                       <p className={cn("text-[24px] font-black uppercase mb-5 italic tracking-[0.5em] leading-none transition-all duration-1000 group-hover/title:tracking-[0.6em]", isToday ? "text-emerald-400" : "text-slate-600 group-hover/title:text-slate-300")}>
                          {weekDays[idx]}
                       </p>
                       <p className="text-[16px] font-mono text-slate-800 font-black opacity-40 tracking-[0.8em] group-hover:opacity-100 transition-opacity duration-1000 leading-none">
                          {date.split('-').reverse().slice(0,2).join('.').toUpperCase()}
                       </p>
                    </div>

                    <div className="flex-1 space-y-10">
                       {dayWods.map(w => (
                         <div key={w.id} className="group/wod bg-slate-950/95 p-14 rounded-[64px] border-2 border-slate-900 hover:border-emerald-700/60 transition-all duration-1000 shadow-[inset_0_10px_40px_rgba(0,0,0,0.9)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-3 h-full bg-emerald-500 opacity-0 group-hover/wod:opacity-100 transition-opacity duration-[1500ms] shadow-[0_0_40px_rgba(16,185,129,1)]" />
                            <div className="flex items-center justify-between mb-10">
                               <div className={cn("px-8 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.5em] italic border-2 transition-all duration-1000 group-hover/wod:bg-opacity-30", w.type === 'time' ? "bg-amber-500/5 text-amber-500 border-amber-500/20" : "bg-lime-400/5 text-lime-400 border-lime-400/20")}>
                                  {w.type === 'time' ? 'T_CAP' : 'STRENGTH'}
                               </div>
                            </div>
                            <h4 className="text-[32px] font-black uppercase italic text-white mb-10 leading-[0.9] line-clamp-2 tracking-tighter font-mono group-hover/wod:text-lime-400 transition-all duration-700 group-hover/wod:scale-105 origin-left">{w.title}</h4>
                            <p className="text-[15px] text-slate-600 italic line-clamp-[12] mb-14 leading-relaxed font-medium group-hover/wod:text-slate-200 transition-colors duration-1000 font-mono opacity-80 group-hover/wod:opacity-100">"{w.description}"</p>
                            
                            <div className="flex gap-12 pt-12 border-t-2 border-slate-900/60 opacity-0 group-hover/wod:opacity-100 transition-all translate-y-10 group-hover/wod:translate-y-0 duration-[1000ms]">
                               <button 
                                 onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} 
                                 className="text-[14px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.5em] font-mono hover:scale-110 active:scale-95"
                               >
                                 EDITAR_CFG
                               </button>
                               <button 
                                 onClick={() => handleWodDelete(w.id!)} 
                                 className="text-[14px] font-black uppercase text-red-500/20 hover:text-red-500 transition-all tracking-[0.5em] font-mono hover:scale-110 active:scale-95"
                               >
                                 PURGAR_WOD
                               </button>
                            </div>
                         </div>
                       ))}
                       {dayWods.length === 0 && (
                          <button 
                            onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }}
                            className="w-full h-full border-4 border-dashed border-slate-800/40 rounded-[70px] flex flex-col items-center justify-center gap-12 text-slate-800 hover:text-emerald-500 hover:border-emerald-700/60 transition-all duration-[1200ms] group/add p-24 bg-slate-950/30 hover:bg-slate-950/60 shadow-[inset_0_20px_50px_rgba(0,0,0,0.4)]"
                          >
                             <div className="w-28 h-28 rounded-[44px] bg-slate-900 border-2 border-slate-800 flex items-center justify-center group-hover/add:rotate-180 group-hover/add:scale-[1.3] transition-all duration-[1500ms] shadow-[0_40px_80px_rgba(0,0,0,1)] group-hover/add:bg-emerald-950 group-hover/add:border-emerald-700 group-hover/add:shadow-emerald-900/40">
                                <Plus className="w-14 h-14" />
                             </div>
                             <span className="text-[16px] font-black uppercase italic tracking-[0.8em] leading-none opacity-30 group-hover/add:opacity-100 transition-all duration-1000 group-hover/add:tracking-[1em]">PLAN_WOD</span>
                          </button>
                       )}
                    </div>
                 </motion.div>
               );
             })}
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 5: LEADERBOARD ARCHIVE (CONSULTA MASIVA)
      ---------------------------------------------------------------------- */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-16 animate-in fade-in duration-1000 zoom-in-95">
          <div className="bg-slate-900 rounded-[100px] p-28 border-2 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,0.9)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-40 opacity-[0.06] pointer-events-none rotate-12 scale-125">
               <Trophy className="w-[800px] h-[800px] text-white" />
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-20 mb-32 relative z-10">
               <div className="space-y-12">
                  <div className="flex items-center gap-8">
                     <Trophy className="w-16 h-16 text-lime-400 drop-shadow-[0_0_40px_rgba(163,230,53,0.7)]" />
                     <p className="text-lime-400 text-[16px] font-black uppercase tracking-[1em] italic leading-none">Box Performance Archive v3</p>
                  </div>
                  <h3 className="text-[10rem] font-black italic uppercase tracking-tighter text-white leading-[0.7] mb-0 group-hover:text-emerald-400 transition-colors duration-1000">
                    Rank <span className="text-lime-400 italic underline decoration-lime-950/60 decoration-[25px] underline-offset-[30px]">Archive</span>
                  </h3>
                  <p className="text-[20px] text-slate-600 font-bold uppercase tracking-[0.4em] mt-16 leading-relaxed max-w-4xl italic opacity-80">
                     Base de datos histórica de competencia sistémica. Seleccione el entrenamiento operativo para desglosar la jerarquía de resultados del ciclo actual.
                  </p>
               </div>
            </div>

            {/* HIGH-END SELECTOR BAR */}
            <div className="flex gap-8 overflow-x-auto scrollbar-hide mb-28 p-8 bg-slate-950/80 rounded-[60px] border-4 border-slate-900 shadow-[inset_0_20px_80px_rgba(0,0,0,1)] relative z-10 backdrop-blur-3xl group/selector">
              {wods.length > 0 ? wods.map(wod => (
                <button 
                  key={wod.id} 
                  onClick={() => setSelectedWodForLeaderboard(wod)}
                  className={cn(
                    "px-20 py-14 rounded-[50px] text-[16px] font-black uppercase border-2 transition-all duration-1000 whitespace-nowrap shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col items-center gap-6 min-w-[350px] group/item",
                    selectedWodForLeaderboard?.id === wod.id 
                      ? "bg-emerald-700 border-emerald-500 text-white shadow-emerald-900/60 -translate-y-6 scale-110 z-20" 
                      : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-100"
                  )}
                >
                  <span className="leading-none tracking-tighter font-mono text-4xl group-hover/item:scale-110 transition-transform duration-700">{wod.title}</span>
                  <span className={cn("text-[12px] font-bold tracking-[0.5em] italic mt-4 px-6 py-2 rounded-xl bg-black/40 border border-white/5", selectedWodForLeaderboard?.id === wod.id ? "text-white/60" : "text-slate-800")}>
                     {wod.date.split('-').reverse().join(' // ')}
                  </span>
                </button>
              )) : (
                <div className="py-20 px-32 text-[18px] font-black uppercase italic text-slate-800 tracking-[0.8em] w-full text-center animate-pulse">NO SYSTEM DATA LOGGED FOR THIS CYCLE</div>
              )}
            </div>

            {selectedWodForLeaderboard ? (
              <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2 }} className="relative z-10">
                <WodRanking 
                  wodId={selectedWodForLeaderboard.id!} 
                  type={selectedWodForLeaderboard.type as any} 
                />
              </motion.div>
            ) : (
              <div className="py-80 text-center flex flex-col items-center justify-center border-8 border-dashed border-slate-900/60 rounded-[100px] bg-slate-950/40 group hover:border-slate-800 transition-all duration-[2000ms]">
                <div className="w-40 h-40 bg-slate-900 rounded-[60px] flex items-center justify-center mb-16 border-4 border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,1)] group-hover:scale-[1.25] group-hover:rotate-12 transition-all duration-[1500ms]">
                   <Trophy className="w-20 h-20 text-slate-800 group-hover:text-emerald-900 transition-colors duration-1000" />
                </div>
                <p className="font-black uppercase italic text-3xl tracking-[1em] text-slate-800 animate-pulse text-center leading-loose">
                  SELECT TARGET WORKOUT TO DECRYPT RANKING DATA
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 6: TEAM (CONTROL JERÁRQUICO DE STAFF)
      ---------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="space-y-16 animate-in fade-in duration-1000 slide-in-from-bottom-12">
           <div className="bg-slate-900 rounded-[100px] p-24 border-2 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-16 mb-32 relative z-10">
                 <div className="space-y-10">
                    <div className="flex items-center gap-8">
                       <div className="p-5 bg-amber-500/10 rounded-[30px] border-2 border-amber-500/20 shadow-3xl">
                          <ShieldAlert className="w-10 h-10 text-amber-500 shadow-amber-500/20 shadow-2xl" />
                       </div>
                       <p className="text-amber-500 text-[18px] font-black uppercase tracking-[1em] italic leading-none">Security Privilege Area</p>
                    </div>
                    <h3 className="text-9xl font-black italic uppercase text-white tracking-tighter leading-none flex items-center gap-12">
                       Box <span className="text-amber-500 underline decoration-amber-950/60 decoration-[20px] underline-offset-[20px] italic">Admin Hub</span>
                    </h3>
                    <p className="text-[18px] text-slate-600 font-bold uppercase tracking-widest mt-16 max-w-4xl leading-relaxed italic opacity-80">
                       Gestión jerárquica de privilegios del box. Control táctico de roles operativos y depuración integral de la arquitectura de miembros de la Jungla HP.
                    </p>
                 </div>
              </div>
              
              <div className="space-y-10 relative z-10">
                {athletes.map((u, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    key={u.uid} 
                    className="flex flex-col md:flex-row md:items-center justify-between p-16 bg-slate-950/95 rounded-[80px] border-4 border-slate-900 hover:border-amber-900/50 hover:bg-slate-900/80 transition-all duration-1000 group shadow-[0_60px_120px_rgba(0,0,0,0.8)] gap-16 shadow-black"
                  >
                     <div className="flex items-center gap-16 flex-1">
                        <div className="relative group/avatar">
                           <div className="absolute inset-0 bg-amber-500/10 blur-[100px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-[2000ms]" />
                           <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-40 h-40 rounded-[60px] border-[8px] border-slate-800 group-hover/avatar:scale-[1.15] group-hover/avatar:border-amber-500/60 transition-all duration-[1200ms] shadow-3xl relative z-10 object-cover" alt="" />
                           <div className={cn(
                              "absolute -top-6 -left-6 px-8 py-3 rounded-[24px] text-[14px] font-black uppercase italic border-[6px] border-slate-950 shadow-[0_30px_60px_rgba(0,0,0,1)] z-20 transition-all group-hover/avatar:-rotate-12 duration-700", 
                              u.role === 'coach' ? "bg-amber-500 text-slate-950 shadow-amber-500/30" : "bg-slate-800 text-slate-400"
                           )}>
                              {u.role}
                           </div>
                        </div>
                        <div className="space-y-6">
                           <p className="text-6xl font-black uppercase text-white italic leading-none tracking-tighter group-hover:text-amber-400 transition-all duration-[1500ms]">{u.displayName}</p>
                           <div className="flex items-center gap-6">
                              <p className="text-[14px] text-slate-700 font-bold uppercase italic tracking-[0.6em] leading-none font-mono opacity-60">ADMIN_UID: {u.uid.toUpperCase()}</p>
                              <div className="w-2 h-2 rounded-full bg-slate-800 shadow-2xl" />
                           </div>
                           <div className="flex items-center gap-6 mt-10 opacity-30 group-hover:opacity-60 transition-all duration-1000">
                              <div className="w-3 h-3 rounded-full bg-slate-700 shadow-3xl" />
                              <p className="text-[13px] text-slate-600 font-black uppercase tracking-[0.5em] italic">Session verified • Core Box Team Member</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-8">
                       <button 
                         onClick={() => handleRoleChange(u.uid, u.role === 'coach' ? 'athlete' : 'coach')} 
                         className={cn(
                           "px-16 py-10 rounded-[44px] text-[14px] font-black uppercase transition-all duration-1000 active:scale-90 border-4 shadow-[0_40px_80px_rgba(0,0,0,0.6)] tracking-[0.4em] italic",
                           u.role === 'coach' 
                             ? "bg-amber-500/5 text-amber-500 border-amber-500/20 hover:bg-amber-500/15" 
                             : "bg-emerald-700 text-white border-emerald-600/50 hover:bg-emerald-600 shadow-emerald-900/60"
                         )}
                       >
                          {u.role === 'coach' ? 'REVOKE_STAFF' : 'PROMOTE_COACH'}
                       </button>
                       <button 
                         onClick={() => handleDeleteAthlete(u.uid)} 
                         disabled={u.uid === profile?.uid}
                         className="p-10 bg-red-500/5 text-red-500 rounded-[44px] border-4 border-red-500/10 hover:bg-red-500/25 transition-all active:scale-75 disabled:opacity-5 disabled:grayscale shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex items-center justify-center group/del"
                       >
                          <Trash2 className="w-10 h-10 group-hover/del:scale-150 group-hover/del:rotate-12 transition-transform duration-[1500ms]" />
                       </button>
                     </div>
                  </motion.div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 7: PERFIL PROPIO (STAFF IDENTITY MANAGEMENT)
      ---------------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="space-y-16 animate-in fade-in duration-1000 slide-in-from-bottom-10">
          <div className="bg-slate-900 rounded-[100px] p-28 border-2 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,0.9)] relative overflow-hidden text-white flex flex-col items-center text-center">
            
            <div className="absolute top-0 right-0 p-32 opacity-[0.05] pointer-events-none rotate-45 scale-[2]">
               <Settings className="w-96 h-96 text-white" />
            </div>

            <div className="space-y-8 mb-28 relative z-10">
               <div className="flex items-center justify-center gap-8">
                  <div className="w-4 h-16 bg-lime-400 rounded-full shadow-[0_0_30px_rgba(163,230,53,0.8)]" />
                  <h3 className="text-[7rem] font-black italic uppercase tracking-tighter leading-none italic mb-0">Staff <span className="text-lime-400 italic underline decoration-lime-950/60 decoration-[15px] underline-offset-[25px]">Identity</span></h3>
               </div>
               <p className="text-[20px] text-slate-600 font-bold uppercase tracking-[1em] italic opacity-60">Personal Terminal Configuration v3.0</p>
            </div>

            <div className="relative group mb-24 z-10">
               <div className="absolute inset-0 bg-lime-400/20 blur-[150px] opacity-0 group-hover:opacity-40 transition-opacity duration-[2000ms]" />
               <img src={ownProfileData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-80 h-80 rounded-[90px] border-[12px] border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,1)] object-cover group-hover:scale-[1.1] group-hover:rotate-[3deg] transition-all duration-[1500ms] relative z-10 shadow-black" alt="" />
               <div className="absolute -bottom-10 -right-10 bg-lime-400 text-black p-10 rounded-[50px] shadow-[0_40px_80px_rgba(163,230,53,0.6)] z-20 hover:rotate-[20deg] hover:scale-125 transition-all duration-700 cursor-pointer border-8 border-slate-900">
                  <UserCircle className="w-14 h-14" />
               </div>
            </div>

            <div className="space-y-14 w-full max-w-4xl relative z-10">
              <div className="space-y-8 text-left group">
                 <label className="text-[16px] font-black uppercase text-slate-500 ml-14 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-500">Box Operational Nickname</label>
                 <input 
                    value={ownProfileData.displayName} 
                    onChange={e => setOwnProfileData({...ownProfileData, displayName: e.target.value})} 
                    className="w-full bg-slate-950/80 border-4 border-slate-800 rounded-[56px] p-12 text-6xl font-black italic text-white outline-none focus:border-lime-500 transition-all duration-700 shadow-[inset_0_20px_60px_rgba(0,0,0,1)] tracking-tighter" 
                 />
              </div>
              <div className="space-y-8 text-left group">
                 <label className="text-[16px] font-black uppercase text-slate-500 ml-14 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-500">Avatar Stream Source (URL)</label>
                 <input 
                    value={ownProfileData.photoURL} 
                    onChange={e => setOwnProfileData({...ownProfileData, photoURL: e.target.value})} 
                    placeholder="HTTPS://SOURCE-IMAGE.JPG" 
                    className="w-full bg-slate-950/80 border-4 border-slate-800 rounded-[56px] p-12 text-[20px] font-black italic text-slate-400 outline-none focus:border-lime-500 transition-all duration-700 shadow-[inset_0_20px_60px_rgba(0,0,0,1)] tracking-[0.4em] font-mono" 
                 />
              </div>
              <button 
                 onClick={handleUpdateOwnProfile} 
                 className="w-full bg-lime-400 text-black py-12 rounded-[60px] font-black uppercase tracking-[1em] text-2xl shadow-[0_50px_100px_rgba(163,230,53,0.4)] active:scale-95 transition-all duration-700 mt-20 border-8 border-lime-300/30 italic group hover:bg-white"
              >
                 SAVE STAFF TERMINAL CONFIG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          GLOBAL MODALS: WOD BUILDER TERMINAL
      ====================================================================== */}
      
      <AnimatePresence>
        {showWodForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-slate-950/98 backdrop-blur-[60px]"
          >
             <motion.div 
               initial={{ scale: 0.6, opacity: 0, y: 150 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               transition={{ type: 'spring', damping: 35, stiffness: 120 }}
               className="bg-slate-900 p-24 rounded-[100px] w-full max-w-6xl border-4 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,1)] relative overflow-hidden" 
             >
                <div className="absolute -top-32 -left-32 p-40 opacity-[0.02] pointer-events-none rotate-[25deg]">
                   <Calendar className="w-[800px] h-[800px] text-white" />
                </div>

                <button 
                   onClick={() => setShowWodForm(false)} 
                   className="absolute top-20 right-20 text-slate-700 hover:text-white transition-all bg-slate-950 p-8 rounded-full border-4 border-slate-800 z-50 group hover:rotate-180 duration-[2000ms] shadow-3xl"
                >
                   <Repeat className="w-14 h-14 rotate-45 group-hover:scale-[1.4] transition-transform duration-1000" />
                </button>
                
                <div className="text-center mb-32 space-y-10 relative z-10">
                   <h3 className="text-9xl font-black italic uppercase text-white tracking-tighter leading-none mb-0 group">
                      {editingWod ? 'Update' : 'Schedule'} <span className="text-emerald-500 italic">Workout</span>
                   </h3>
                   <div className="flex items-center justify-center gap-8">
                      <div className="h-0.5 w-24 bg-slate-800" />
                      <p className="text-[18px] text-slate-600 font-bold uppercase tracking-[1em] italic leading-none">System_Protocol v2.5_WOD_HUB</p>
                      <div className="h-0.5 w-24 bg-slate-800" />
                   </div>
                </div>
                
                <div className="space-y-16 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                     <div className="space-y-8">
                        <label className="text-[16px] font-black uppercase text-slate-500 ml-12 italic tracking-[0.6em] leading-none">Operational Target Date</label>
                        <input 
                           type="date" 
                           value={newWod.date} 
                           onChange={e => setNewWod({...newWod, date: e.target.value})} 
                           className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[48px] p-12 text-2xl text-white outline-none focus:border-emerald-700 transition-all duration-1000 font-black shadow-[inset_0_20px_50px_rgba(0,0,0,1)] tracking-tighter" 
                        />
                     </div>
                     <div className="space-y-8">
                        <label className="text-[16px] font-black uppercase text-slate-500 ml-12 italic tracking-[0.6em] leading-none">Metric Logic System</label>
                        <select 
                           value={newWod.type} 
                           onChange={e => setNewWod({...newWod, type: e.target.value})} 
                           className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[48px] p-12 text-[20px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all duration-1000 shadow-[inset_0_20px_50px_rgba(0,0,0,1)] italic tracking-widest cursor-pointer"
                        >
                           <option value="">-- SELECT LOGIC --</option>
                           <option value="time">FOR TIME (Cronómetro/Velocidad)</option>
                           <option value="weight">STRENGTH / RM (Carga Máxima/Kg)</option>
                           <option value="reps">AMRAP (Volumen/Repeticiones)</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <label className="text-[16px] font-black uppercase text-slate-500 ml-12 italic tracking-[0.6em] leading-none">Training Identity (WOD Code)</label>
                     <input 
                        placeholder="HERO WORKOUT / BOX CODE..." 
                        value={newWod.title} 
                        onChange={e => setNewWod({...newWod, title: e.target.value})} 
                        className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[48px] p-12 text-5xl font-black italic text-white outline-none focus:border-emerald-700 transition-all duration-1000 shadow-[inset_0_20px_50px_rgba(0,0,0,1)] placeholder-slate-900 tracking-tighter" 
                     />
                  </div>

                  <div className="space-y-8">
                     <label className="text-[16px] font-black uppercase text-slate-500 ml-12 italic tracking-[0.6em] leading-none">Technical Breakdown & Flow</label>
                     <textarea 
                        placeholder="DETALLE AQUÍ EL PROTOCOLO DE CARGA, RONDAS, EJERCICIOS Y ESTÁNDARES DE MOVIMIENTO..." 
                        value={newWod.description} 
                        onChange={e => setNewWod({...newWod, description: e.target.value})} 
                        rows={6} 
                        className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[64px] p-16 text-[22px] font-medium italic text-slate-300 outline-none focus:border-emerald-700 transition-all duration-[1500ms] leading-relaxed shadow-[inset_0_20px_50px_rgba(0,0,0,1)] placeholder-slate-900" 
                     />
                  </div>

                  <div className="flex gap-12 pt-20">
                     <button 
                        onClick={() => setShowWodForm(false)} 
                        className="flex-1 py-12 text-[18px] font-black uppercase text-slate-700 hover:text-slate-200 transition-all tracking-[1em] font-black italic hover:scale-105 duration-700"
                     >
                        ABORT_SESSION
                     </button>
                     <button 
                        onClick={handleWodSubmit} 
                        className="flex-[2] bg-emerald-700 text-white py-12 rounded-[56px] text-[20px] font-black uppercase tracking-[1em] shadow-[0_50px_100px_rgba(4,120,87,0.7)] active:scale-95 transition-all duration-[1200ms] border-8 border-emerald-500/20 italic group-hover:bg-emerald-600 shadow-black"
                     >
                        {editingWod ? 'COMMIT_DATA' : 'PUBLISH_TERMINAL'}
                     </button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SYSTEM TOAST OVERLAYS (MASTER PROTOCOL) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 200, scale: 0.4 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 200, scale: 0.4 }} 
            className="fixed bottom-48 left-4 right-4 z-[250] flex justify-center pointer-events-none"
          >
            <div className={cn(
               "px-20 py-12 rounded-[60px] shadow-[0_60px_150px_rgba(0,0,0,1)] flex items-center gap-16 border-4 backdrop-blur-[100px] transition-all duration-[1500ms]",
               toast.type === 'success' ? "bg-emerald-950/90 border-emerald-500/50 text-white shadow-emerald-500/10" : "bg-red-950/90 border-red-500/50 text-white shadow-red-500/10"
            )}>
               <div className={cn("p-8 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-all duration-1000 rotate-12 hover:rotate-0", toast.type === 'success' ? "bg-lime-400 shadow-lime-400/40" : "bg-red-500 shadow-red-500/40")}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-12 h-12 text-black" /> : <ShieldAlert className="w-12 h-12 text-black" />}
               </div>
               <div className="flex flex-col space-y-5 text-left">
                  <span className="text-[32px] font-black uppercase italic tracking-[0.4em] leading-none mb-2">{toast.message}</span>
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-[4px] bg-white/20 rounded-full" />
                     <span className="text-[12px] text-white/40 font-bold uppercase tracking-[1em] leading-none font-mono">System Intel Protocol v3.0_OK</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
