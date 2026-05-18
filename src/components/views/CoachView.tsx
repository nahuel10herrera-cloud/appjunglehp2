import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  deleteDoc,
  Timestamp
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
  Info,
  TrendingDown,
  UserCircle,
  Settings,
  ArrowLeft,
  Download,
  BarChart3,
  HeartPulse,
  Flame,
  Target
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange, parseScoreToNumber } from '@/src/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile';
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// COMPONENTES AUXILIARES DE ALTO RENDIMIENTO
// ============================================================================

/**
 * PerformanceChart: Visualiza la evolución de carga y esfuerzo.
 */
function PerformanceChart({ data }: { data: WorkoutSession[] }) {
  const chartData = useMemo(() => {
    return [...data]
      .reverse()
      .filter(s => s.scoreValue !== undefined)
      .map(s => ({
        date: s.date.split('-').reverse().slice(0,2).join('/'),
        rendimiento: s.scoreValue || 0,
        esfuerzo: s.rpe || 0,
        label: s.score
      }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-950/20 rounded-[40px] border-2 border-dashed border-slate-800/50 p-10">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
           <BarChart3 className="w-8 h-8 text-slate-700" />
        </div>
        <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.3em] text-center max-w-[200px] leading-relaxed">
          Datos insuficientes para generar métricas de evolución
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-8 animate-in fade-in duration-1000">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.2} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            fontFamily="monospace"
            dy={10}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '20px', fontSize: '10px', textTransform: 'uppercase', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#a3e635', fontWeight: 'bold' }}
            cursor={{ stroke: '#a3e635', strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          <Area 
            type="monotone" 
            dataKey="rendimiento" 
            stroke="#a3e635" 
            strokeWidth={4} 
            fillOpacity={1} 
            fill="url(#chartGradient)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * WodRanking: El motor de competencia del Box.
 */
function WodRanking({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wodId) return;
    setLoading(true);
    const direction = type === 'time' ? 'asc' : 'desc';
    const q = query(
      collection(db, "workout_results"), 
      where("wodId", "==", wodId), 
      orderBy("scoreValue", direction)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firebase Index Required:", error.message);
      setLoading(false);
    });
    return () => unsub();
  }, [wodId, type]);

  if (loading) return <div className="p-20 text-center animate-pulse"><Activity className="w-8 h-8 text-slate-800 mx-auto" /></div>;

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="p-8 bg-emerald-950/20 border-b border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-lime-400 text-black rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.3)]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-black italic uppercase text-lg tracking-tighter leading-none">Ranking Jungle HP</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-[0.2em] italic">Resultados verificados</p>
          </div>
        </div>
        <div className="bg-slate-950 px-5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
           <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">
             Modalidad: {type === 'time' ? 'FOR TIME' : type === 'weight' ? 'STRENGTH' : 'AMRAP'}
           </span>
        </div>
      </div>
      
      <div className="divide-y divide-slate-800/40">
        {results.length > 0 ? results.map((res, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
            key={res.id} 
            className="p-6 flex items-center justify-between group hover:bg-slate-800/20 transition-all border-l-4 border-l-transparent hover:border-l-lime-400"
          >
            <div className="flex items-center gap-6">
              <span className={cn("text-4xl font-black italic w-14 transition-all group-hover:scale-110", 
                index === 0 ? 'text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.5)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700'
              )}>#{index + 1}</span>
              <div className="flex items-center gap-4">
                 <img 
                   src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${res.userId || res.athleteId}`} 
                   className="w-14 h-14 rounded-2xl border-2 border-slate-800 group-hover:border-lime-500/30 transition-all shadow-xl" 
                   alt="" 
                 />
                 <div>
                   <p className="text-slate-100 font-black uppercase text-base leading-none mb-2 tracking-tight group-hover:text-lime-400 transition-colors">{res.athleteName}</p>
                   <div className="flex items-center gap-3">
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> RPE {res.rpe}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-slate-800" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">{res.modality}</p>
                   </div>
                 </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lime-400 font-black text-3xl font-mono tracking-tighter leading-none group-hover:scale-110 transition-transform">{res.score}</p>
              {index === 0 && (
                <div className="flex items-center justify-end gap-1.5 mt-2">
                   <Medal className="w-3 h-3 text-lime-500/50" />
                   <p className="text-[8px] text-lime-500/30 font-black uppercase tracking-widest leading-none">Apex Performance</p>
                </div>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="p-32 text-center flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-slate-800 mb-6 animate-pulse opacity-20" />
            <p className="text-slate-700 uppercase font-black italic text-[11px] tracking-[0.4em] leading-relaxed max-w-[250px]">
              No se han detectado registros para la clasificación de hoy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: COACH VIEW
// ============================================================================

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  
  // -- NAVEGACIÓN --
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile'>('dashboard');
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  // -- VARIABLES DE TIEMPO (Cruciales para el calendario) --
  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const { start: weekStart, end: weekEnd } = getWeekRange();
  
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  // -- ESTADOS DE DATOS GLOBALES --
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
  
  // Datos de edición de perfil propio
  const [ownProfileData, setOwnProfileData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || ''
  });

  // --- FIREBASE SUBSCRIPTIONS (Tiempo Real) ---

  useEffect(() => {
    // 1. Suscripción a todos los usuarios
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });

    // 2. Suscripción a WODs de la semana actual
    const unsubWods = onSnapshot(query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart), 
      where('date', '<=', weekEnd), 
      orderBy('date', 'asc')
    ), (snap) => {
      const fetchedWods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetchedWods);
      // Autoselección del WOD de hoy para el ranking si existe
      if (fetchedWods.length > 0 && !selectedWodForLeaderboard) {
        const todayW = fetchedWods.find(w => w.date === getTodayDate());
        setSelectedWodForLeaderboard(todayW || fetchedWods[0]);
      }
    });

    // 3. Suscripción a Wellness de hoy
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', getTodayDate())), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // 4. Suscripción a Feed de Actividad Reciente
    const unsubRecent = onSnapshot(query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(25)), (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    return () => { unsubAthletes(); unsubWods(); unsubWellness(); unsubRecent(); };
  }, [weekStart, weekEnd]);

  // Suscripción profunda al atleta seleccionado
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
      limit(30)
    ), (snap) => setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) })));
    
    const unsubF = onSnapshot(query(
      collection(db, 'coach_feedback'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('createdAt', 'desc'),
      limit(10)
    ), (snap) => setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback)));

    return () => { unsubW(); unsubS(); unsubF(); };
  }, [selectedAthlete]);

  // --- HANDLERS (LÓGICA DE NEGOCIO) ---

  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("Completa los campos críticos: Fecha, Tipo y Título.");
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), { ...newWod, updatedAt: serverTimestamp() }, { merge: true });
        setToast({ message: 'Entrenamiento actualizado en el calendario', type: 'success' });
      } else {
        await addDoc(collection(db, 'wods'), { ...newWod, coachId: profile?.uid, createdAt: serverTimestamp() });
        setToast({ message: 'Nuevo WOD publicado con éxito', type: 'success' });
      }
      setShowWodForm(false);
      setEditingWod(null);
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'wods'); }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este entrenamiento de la programación semanal?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
      setToast({ message: 'Entrenamiento eliminado', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'wods'); }
  };

  const handleRoleChange = async (userId: string, newRole: 'coach' | 'athlete') => {
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
      setToast({ message: `Permisos de ${newRole.toUpperCase()} concedidos`, type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  };

  const handleDeleteAthlete = async (userId: string) => {
    if (userId === profile?.uid) return;
    if (!confirm('🚨 ALERTA: Esta acción borrará al atleta de la base de datos de Jungle HP permanentemente. ¿Proceder?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setAthletes(prev => prev.filter(a => a.uid !== userId));
      setToast({ message: 'Miembro eliminado', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `users/${userId}`); }
  };

  const handleUpdateOwnProfile = async () => {
    if (!profile?.uid) return;
    try {
      await setDoc(doc(db, 'users', profile.uid), { ...ownProfileData, updatedAt: serverTimestamp() }, { merge: true });
      setToast({ message: 'Tu perfil de Staff ha sido actualizado', type: 'success' });
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
      setToast({ message: 'Feedback enviado al dispositivo del atleta', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'coach_feedback'); }
  };

  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-slate-800 opacity-20';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    return avg >= 4 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 
           avg >= 2.5 ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 
           'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  };

  const todayWod = useMemo(() => wods.find(w => w.date === getTodayDate()), [wods]);

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 pb-48 pt-10">
      
      {/* ----------------------------------------------------------------------
          HEADER PRINCIPAL Y NAVEGACIÓN STAFF
      ---------------------------------------------------------------------- */}
      <header className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-lime-400 text-black px-3 py-1 rounded-md text-[10px] font-black uppercase italic tracking-tighter shadow-lg shadow-lime-400/20">Authenticated Staff</div>
              <div className="h-[2px] w-16 bg-slate-800" />
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.5em] italic">Jungle HP Operations</p>
            </div>
            <h2 className="text-7xl font-black italic tracking-tighter uppercase text-white leading-none">
               Box <span className="text-lime-400 underline decoration-slate-800 decoration-[12px] underline-offset-8 italic">Control</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-5 bg-slate-900/60 p-4 pr-8 rounded-[40px] border border-slate-800/50 backdrop-blur-3xl shadow-2xl group hover:border-slate-700 transition-all">
             <div className="relative">
                <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-16 h-16 rounded-[22px] border-2 border-slate-700 object-cover group-hover:scale-105 transition-transform" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-900 shadow-xl" />
             </div>
             <div className="hidden sm:block">
                <p className="text-sm text-white font-black uppercase italic leading-none tracking-tight">{profile?.displayName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 leading-none italic flex items-center gap-2">
                   <ShieldAlert className="w-3 h-3 text-lime-500" /> Session: ACTIVE
                </p>
             </div>
          </div>
        </div>

        {/* BARRA DE NAVEGACIÓN TÁCTICA */}
        <div className="flex bg-slate-900/90 backdrop-blur-2xl p-2 rounded-[36px] border border-slate-800/50 w-full overflow-x-auto scrollbar-hide shadow-[0_40px_80px_rgba(0,0,0,0.6)] z-40 relative">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Staff', icon: ShieldAlert },
            { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-2.5 px-8 py-6 rounded-[28px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 group relative", 
                activeTab === item.id 
                  ? "bg-emerald-700 text-white shadow-[0_20px_50px_rgba(4,120,87,0.5)] scale-[1.05] z-10" 
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/40"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-all duration-500", activeTab === item.id ? "scale-110" : "group-hover:scale-110")} /> 
              <span className="group-hover:tracking-[0.2em] transition-all">{item.label}</span>
              {activeTab === item.id && (
                 <motion.div layoutId="nav-glow" className="absolute -bottom-1.5 w-14 h-1.5 bg-lime-400 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          PESTAÑA 1: DASHBOARD (PANEL DE CONTROL)
      ---------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          
          {/* STATS RÁPIDAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Box Members', value: athletes.length, icon: Users, color: 'text-lime-400' },
              { label: 'Readiness Today', value: Object.keys(todayWellness).length, icon: ShieldAlert, color: 'text-emerald-500' },
              { label: 'Workouts Logged', value: recentSessions.length, icon: Dumbbell, color: 'text-lime-400' },
              { label: 'Fatiga Promedio', value: '4.2', icon: TrendingDown, color: 'text-red-500' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/40 p-10 rounded-[50px] border border-slate-800/50 group hover:border-slate-600 transition-all shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:scale-150 transition-transform duration-1000">
                   <stat.icon className="w-24 h-24 text-white" />
                </div>
                <stat.icon className={cn("w-7 h-7 mb-10 transition-transform duration-700 group-hover:scale-125", stat.color)} />
                <div className="text-5xl font-black italic tracking-tighter text-white leading-none mb-4">{stat.value}</div>
                <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-slate-600 leading-none italic">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* PODIO DEL DÍA DESTACADO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
               <section className="bg-slate-900 rounded-[60px] p-16 border border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-16 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none rotate-12">
                     <Trophy className="w-96 h-96 text-white" />
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-[32px] bg-lime-400 flex items-center justify-center shadow-[0_0_40px_rgba(163,230,53,0.4)] transition-transform group-hover:rotate-12">
                         <Zap className="w-10 h-10 text-black" />
                      </div>
                      <div>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none mb-4">
                           Performance <span className="text-lime-400 italic">Podium</span>
                        </h3>
                        <p className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.4em] leading-none italic">Monitoreo de resultados en vivo</p>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 px-8 py-4 rounded-3xl border border-slate-800 shadow-inner backdrop-blur-md">
                       <p className="text-[13px] text-slate-300 font-black uppercase tracking-[0.3em] italic font-mono">{formatDate(getTodayDate())}</p>
                    </div>
                  </div>

                  {todayWod ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5 }}>
                       <WodRanking wodId={todayWod.id!} type={todayWod.type as any} />
                    </motion.div>
                  ) : (
                    <div className="p-28 text-center border-4 border-dashed border-slate-800/50 rounded-[60px] bg-slate-950/30 group hover:border-slate-700 transition-all duration-700">
                       <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-10 border-2 border-slate-800 shadow-2xl group-hover:scale-110 transition-transform">
                          <Calendar className="w-12 h-12 text-slate-700" />
                       </div>
                       <p className="text-slate-600 italic text-[14px] font-black uppercase tracking-[0.5em] leading-relaxed max-w-sm mx-auto mb-10">
                          Programación en blanco para el ciclo actual
                       </p>
                       <button onClick={() => setActiveTab('wods')} className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.4em] hover:text-emerald-400 hover:scale-110 transition-all underline decoration-2 underline-offset-8">PROGRAMAR AHORA +</button>
                    </div>
                  )}
               </section>
            </div>
            
            {/* SIDEBAR: LIVE FEED */}
            <section className="bg-slate-900 rounded-[60px] p-12 border border-slate-800 shadow-2xl flex flex-col relative overflow-hidden h-full">
               <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none rotate-45">
                  <Activity className="w-40 h-40 text-white" />
               </div>
               <h3 className="text-[12px] font-black italic uppercase tracking-[0.5em] flex items-center gap-5 text-slate-400 mb-16 leading-none relative z-10">
                  <HistoryIcon className="w-6 h-6 text-lime-400" /> Activity Log
               </h3>
               <div className="space-y-8 overflow-y-auto flex-1 scrollbar-hide relative z-10 pr-2">
                 {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                     key={s.id} 
                     className="bg-slate-950/60 p-6 rounded-[36px] border border-slate-900 flex items-center justify-between hover:bg-slate-900 hover:border-slate-800 transition-all cursor-pointer shadow-xl group"
                     onClick={() => { const ath = athletes.find(a => a.uid === s.athleteId); if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }}}
                   >
                     <div className="flex items-center gap-5">
                        <div className="relative group-hover:scale-110 transition-transform duration-500">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.athleteId}`} className="w-12 h-12 rounded-[18px] border-2 border-slate-800 object-cover" alt="" />
                           <div className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div>
                           <p className="text-[14px] font-black italic uppercase text-slate-100 leading-none mb-2.5 tracking-tight group-hover:text-lime-400 transition-colors">{s.athleteName}</p>
                           <p className="text-[9px] text-slate-700 uppercase font-black font-mono leading-none tracking-widest italic">{s.date}</p>
                        </div>
                     </div>
                     <p className="text-lg font-black italic text-lime-400 leading-none drop-shadow-[0_0_8px_rgba(163,230,53,0.3)] group-hover:scale-125 transition-transform">{s.score}</p>
                   </motion.div>
                 )) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <Activity className="w-20 h-20 mb-6" />
                      <p className="text-[12px] font-black uppercase italic tracking-[0.4em]">Sin actividad reciente</p>
                   </div>
                 )}
               </div>
            </section>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 2: PULSE MONITOR (ESTADO DE SALUD DIARIO)
      ---------------------------------------------------------------------- */}
      {activeTab === 'pulse' && (
        <div className="space-y-12 animate-in fade-in duration-700 slide-in-from-left-8">
           <div className="bg-slate-900 rounded-[70px] p-20 border border-slate-800 shadow-[0_80px_160px_rgba(0,0,0,0.7)] relative overflow-hidden">
              <div className="absolute -top-32 -right-32 p-32 opacity-[0.02] pointer-events-none scale-150 rotate-[25deg]">
                 <ShieldAlert className="w-[600px] h-[600px] text-white" />
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16 mb-24 relative z-10">
                 <div className="space-y-8">
                    <div className="flex items-center gap-5">
                       <div className="w-4 h-4 rounded-full bg-red-500 animate-ping shadow-[0_0_25px_rgba(239,68,68,1)]" />
                       <p className="text-red-500 text-[12px] font-black uppercase tracking-[0.6em] italic leading-none">Box Health Radar v3.0</p>
                    </div>
                    <h3 className="text-7xl font-black italic uppercase tracking-tighter text-white leading-none">
                      Jungle <span className="text-lime-400">Pulse</span>
                    </h3>
                    <p className="text-[14px] text-slate-600 font-bold uppercase tracking-widest mt-10 leading-relaxed max-w-xl italic opacity-80">
                       Análisis predictivo de rendimiento basado en recuperación, estrés sistémico y parámetros de nutrición del equipo en tiempo real.
                    </p>
                 </div>
                 <div className="bg-slate-950/90 p-5 rounded-[32px] border-2 border-slate-800 shadow-2xl backdrop-blur-3xl flex flex-wrap items-center gap-4">
                    {[
                      { label: 'Optimum', color: 'bg-emerald-500' },
                      { label: 'Review', color: 'bg-amber-400' },
                      { label: 'Critical', color: 'bg-red-500' }
                    ].map(status => (
                      <div key={status.label} className="flex items-center gap-4 px-8 py-4 rounded-2xl hover:bg-slate-900 transition-all cursor-default group">
                         <div className={cn("w-4 h-4 rounded-full shadow-2xl transition-all group-hover:scale-125", status.color)} />
                         <span className="text-[10px] font-black uppercase text-slate-500 italic tracking-[0.3em]">{status.label}</span>
                      </div>
                    ))}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 gap-8 relative z-10">
                {athletes.filter(a => a.role === 'athlete').map((a, idx) => {
                  const w = todayWellness[a.uid];
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} 
                      key={a.uid} 
                      className="bg-slate-950/80 p-12 rounded-[56px] border border-slate-900 flex flex-col xl:flex-row xl:items-center justify-between gap-16 hover:border-emerald-900/30 hover:bg-slate-900/60 transition-all group shadow-3xl"
                    >
                       <div className="flex items-center gap-12 min-w-[500px]">
                          <div className="relative group/avatar">
                             <div className="absolute inset-0 bg-white/5 blur-3xl opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                             <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-28 h-28 rounded-[44px] border-4 border-slate-800 group-hover/avatar:scale-105 group-hover/avatar:border-emerald-500/40 transition-all duration-700 shadow-2xl z-10 relative object-cover" alt="" />
                             <div className={cn("absolute -bottom-4 -right-4 w-12 h-12 rounded-[24px] border-[10px] border-slate-950 shadow-2xl z-20 flex items-center justify-center transition-all group-hover/avatar:scale-110", getDayReadinessColor([w].filter(Boolean)))}>
                                {w && <div className="w-3 h-3 rounded-full bg-white animate-pulse" />}
                             </div>
                          </div>
                          <div className="space-y-5">
                             <h4 className="text-4xl font-black uppercase italic text-white tracking-tighter leading-none group-hover:text-emerald-400 transition-colors duration-500">{a.displayName}</h4>
                             <div className="flex flex-wrap gap-5">
                                <div className="bg-slate-900 px-6 py-2.5 rounded-2xl border-2 border-slate-800 text-[11px] font-black uppercase italic text-slate-500 tracking-widest flex items-center gap-4 shadow-xl">
                                   {w ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                                   {w ? 'STATUS LOGGED' : 'PENDING MORNING LOG'}
                                </div>
                                <div className="flex items-center gap-2 px-2 opacity-30">
                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                   <p className="text-[10px] text-white font-bold uppercase tracking-widest">v2.4_SYNC</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       {w ? (
                         <div className="grid grid-cols-3 gap-8">
                            {[
                              { val: w.sleepQuality, label: 'Sueño / ZZZ', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.5)' },
                              { val: w.nutrition, label: 'Nutrición / kcal', color: 'bg-lime-400', glow: 'rgba(163,230,53,0.5)' },
                              { val: 6 - w.stressLevel, label: 'Estrés / Cortisol', color: 'bg-red-500', glow: 'rgba(239,68,68,0.5)' }
                            ].map((x, i) => (
                              <div key={i} className="bg-slate-900/80 p-8 rounded-[40px] border border-slate-800/50 text-center w-40 group-hover:border-slate-700 transition-all duration-500 shadow-inner hover:bg-slate-900">
                                 <p className="text-[10px] text-slate-600 font-black uppercase mb-6 italic tracking-[0.3em] leading-none whitespace-nowrap">{x.label}</p>
                                 <div className="flex justify-center gap-2 mb-4">
                                    {[1,2,3,4,5].map(s => (
                                       <div key={s} className={cn("w-2.5 h-2.5 rounded-full transition-all duration-700", s <= x.val ? cn(x.color, "scale-125") : "bg-slate-800 scale-90")} style={s <= x.val ? { boxShadow: `0 0 15px ${x.glow}` } : {}} />
                                    ))}
                                 </div>
                                 <p className="text-lg font-black italic text-white mt-4 leading-none font-mono opacity-60 tracking-widest">{x.val}.0<span className="text-[10px] ml-1">/5</span></p>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="flex-1 flex justify-center xl:justify-end items-center px-24 py-14 border-4 border-dashed border-slate-900/60 rounded-[50px] bg-slate-950/20 group-hover:border-slate-800 transition-all duration-700">
                            <div className="flex items-center gap-8 opacity-20 group-hover:opacity-40 transition-opacity">
                               <ShieldAlert className="w-16 h-16 text-slate-700" />
                               <p className="text-[14px] font-black uppercase italic tracking-[0.5em] leading-tight text-slate-500">AWAITING BIOMETRIC FEEDBACK</p>
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
          PESTAÑA 3: ATLETAS (GESTIÓN Y ANALYTICS PROFUNDO)
      ---------------------------------------------------------------------- */}
      {activeTab === 'athletes' && (
        <div className="space-y-12 animate-in fade-in duration-800 slide-in-from-right-8">
          {!selectedAthlete ? (
            <div className="bg-slate-900 rounded-[60px] p-16 border border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,0.6)] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none rotate-12 scale-150">
                  <Users className="w-96 h-96 text-white" />
               </div>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-20 relative z-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-5">
                       <div className="w-2 h-10 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
                       <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">Athlete <span className="text-emerald-500 italic">Vault</span></h3>
                    </div>
                    <p className="text-[12px] text-slate-600 font-bold uppercase tracking-widest mt-6 leading-relaxed max-w-md italic">Directorio operativo de miembros. Consulta de métricas históricas y gestión de feedback directo.</p>
                  </div>
                  <div className="relative group w-full md:w-[450px]">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-[50px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-800 group-focus-within:text-emerald-500 transition-all z-20" />
                    <input 
                      placeholder="SEARCH BY NAME OR UID..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-[36px] py-7 pl-20 pr-10 text-[12px] font-black uppercase tracking-[0.4em] text-white outline-none focus:border-emerald-700 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] placeholder-slate-800" 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
                 {filteredAthletes.map((a, idx) => (
                   <motion.button 
                     initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}
                     whileHover={{ scale: 1.05, y: -10 }}
                     key={a.uid} 
                     onClick={() => setSelectedAthlete(a)} 
                     className="flex items-center justify-between p-10 rounded-[50px] border-2 border-slate-800 bg-slate-950/40 hover:border-emerald-600/50 hover:bg-slate-900/60 transition-all group shadow-3xl relative overflow-hidden"
                   >
                      <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-10 transition-opacity duration-700">
                         <Dumbbell className="w-16 h-16 text-white" />
                      </div>
                      <div className="flex items-center gap-8 text-left relative z-10">
                        <div className="relative">
                           <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-20 h-20 rounded-[32px] border-2 border-slate-800 group-hover:border-emerald-500 transition-all duration-700 shadow-2xl object-cover" alt="" />
                           {todayWellness[a.uid] && <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-[6px] border-slate-950 shadow-2xl transition-all", getDayReadinessColor([todayWellness[a.uid]]))}/>}
                        </div>
                        <div className="space-y-3">
                           <p className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none group-hover:text-emerald-400 transition-colors duration-500">{a.displayName}</p>
                           <div className="flex items-center gap-4">
                              <span className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em] bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 italic leading-none">{a.role} LEVEL</span>
                              {todayWellness[a.uid] && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse" />}
                           </div>
                        </div>
                      </div>
                      <ChevronRight className="w-8 h-8 text-slate-800 group-hover:text-emerald-500 group-hover:translate-x-3 transition-all duration-500" />
                   </motion.button>
                 ))}
               </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in zoom-in-95 duration-700 slide-in-from-bottom-10">
               <button 
                  onClick={() => setSelectedAthlete(null)} 
                  className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-500 italic flex items-center gap-5 mb-10 hover:gap-8 transition-all group p-4 bg-emerald-950/20 rounded-3xl w-fit border border-emerald-900/30"
               >
                  <ArrowLeft className="w-6 h-6 group-hover:scale-125 transition-transform" /> VOLVER A LA BASE DE DATOS MAESTRA
               </button>
               
               {/* PERFIL EXPANDIDO INTEGRAL */}
               <div className="bg-slate-900 rounded-[80px] p-20 border border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden text-white">
                  
                  {/* Background Aura */}
                  <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none rotate-[15deg] scale-150">
                     <HeartPulse className="w-[600px] h-[600px] text-white" />
                  </div>

                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-20 mb-24 relative z-10 text-center lg:text-left border-b-2 border-slate-800/40 pb-20">
                     <div className="relative group">
                        <div className="absolute inset-0 bg-lime-400 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-1000" />
                        <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-64 h-64 rounded-[70px] border-8 border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.7)] group-hover:scale-[1.05] transition-transform duration-1000 z-10 relative object-cover" alt="" />
                        <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-[40px] border-[16px] border-slate-900 flex items-center justify-center z-20 shadow-3xl", getDayReadinessColor(athleteData.wellness))}>
                           <Flame className="w-8 h-8 text-white drop-shadow-2xl" />
                        </div>
                     </div>
                     <div className="flex-1 space-y-10">
                        <div className="space-y-4">
                           <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                              <h3 className="text-8xl font-black italic uppercase tracking-tighter leading-[0.7] mb-0">{selectedAthlete.displayName}</h3>
                              <div className="bg-slate-950 px-6 py-3 rounded-2xl border-2 border-slate-800 text-[12px] font-black uppercase text-slate-700 italic tracking-[0.4em] leading-none shadow-2xl shadow-black/50">LEVEL: RX ELITE</div>
                           </div>
                           <p className="text-[14px] text-slate-600 font-bold uppercase tracking-[0.6em] italic leading-none max-w-2xl mx-auto lg:mx-0">
                              Systemic Performance Analytics / Staff Restricted Data
                           </p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                           <div className="bg-slate-950/80 backdrop-blur-xl text-slate-400 px-10 py-5 rounded-3xl text-[12px] font-black uppercase italic border-2 border-slate-800 tracking-[0.3em] leading-none shadow-3xl hover:border-slate-600 transition-colors">
                              {selectedAthlete.role} STAFF ACCOUNT
                           </div>
                           <div className="bg-lime-400 text-slate-950 px-10 py-5 rounded-3xl text-[12px] font-black uppercase italic tracking-[0.3em] leading-none shadow-[0_20px_60px_rgba(163,230,53,0.4)] active:scale-95 transition-all">
                              MEMBER STATUS: VERIFIED
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* PERFORMANCE KPI DASHBOARD */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-24 relative z-10 px-6">
                    {[
                      { label: 'Readiness Score', value: 'OPTIMAL', color: getDayReadinessColor(athleteData.wellness), icon: ShieldAlert, sub: 'Daily check v2.4' },
                      { label: 'Carga Avg (30d)', value: '7.8 RPE', color: 'text-lime-400', icon: TrendingUp, sub: 'Esfuerzo percibido' },
                      { label: 'Volume (Sesiones)', value: athleteData.sessions.length, color: 'text-white', icon: Dumbbell, sub: 'Lifetime total logs' },
                      { label: 'Fatiga Crónica', value: '4.2 / 10', color: 'text-red-500', icon: AlertTriangle, sub: 'Systemic load index' }
                    ].map((kpi, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-12 rounded-[56px] border-2 border-slate-900 text-center backdrop-blur-3xl shadow-3xl group hover:border-slate-700 transition-all duration-700 hover:scale-105">
                         <kpi.icon className={cn("w-10 h-10 mx-auto mb-10 opacity-30 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-125", kpi.color.includes('bg-') ? 'text-white' : kpi.color)} />
                         <p className="text-[12px] font-black uppercase text-slate-700 mb-6 italic tracking-[0.4em] leading-none">{kpi.label}</p>
                         {kpi.color.includes('bg-') ? (
                            <div className={cn("w-10 h-10 rounded-[28px] mx-auto shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-current group-hover:scale-110 transition-transform duration-700", kpi.color)} />
                         ) : (
                            <p className={cn("text-5xl font-black italic tracking-tighter leading-none mb-4", kpi.color)}>{kpi.value}</p>
                         )}
                         <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-700">{kpi.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* ANALYTICS CHART SECTION */}
                  <div className="bg-slate-950/80 p-16 rounded-[64px] border-2 border-slate-900 mb-24 shadow-inner relative group overflow-hidden">
                     <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-40 h-40 text-white" />
                     </div>
                     <div className="flex flex-col md:flex-row items-center justify-between mb-16 px-6 gap-8 relative z-10">
                        <div>
                           <h4 className="text-[20px] font-black uppercase italic text-white tracking-[0.5em] mb-4 leading-none">Evolución del Rendimiento</h4>
                           <p className="text-[11px] text-slate-600 font-bold uppercase tracking-[0.3em] leading-relaxed italic">Análisis temporal de Score (Verde) vs Percepción de Carga (Esfuerzo)</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex items-center gap-6">
                           <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-lime-400" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Score</span></div>
                           <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500/50" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">RPE</span></div>
                        </div>
                     </div>
                     <PerformanceChart data={athleteData.sessions} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 pt-24 border-t-4 border-slate-800/50 relative">
                     
                     {/* Historical Archive */}
                     <div className="space-y-16">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-6">
                              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 shadow-2xl">
                                 <HistoryIcon className="w-8 h-8 text-emerald-500" />
                              </div>
                              <h4 className="text-[20px] font-black uppercase italic text-slate-200 tracking-[0.5em] leading-none mb-0">Training History</h4>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className="text-[11px] font-black uppercase text-slate-700 bg-slate-950 px-6 py-3 rounded-2xl border-2 border-slate-800 font-mono shadow-inner tracking-widest italic">DB_ENTRY_v3</span>
                           </div>
                        </div>
                        <div className="space-y-5 max-h-[700px] overflow-y-auto scrollbar-hide pr-8 group">
                          {athleteData.sessions.length > 0 ? athleteData.sessions.map((s, i) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              key={s.id} 
                              className="bg-slate-950/80 p-10 rounded-[44px] border-2 border-slate-900 flex justify-between items-center group/card hover:border-emerald-900 transition-all duration-500 shadow-3xl"
                            >
                              <div className="flex items-center gap-10">
                                <div className="w-20 h-20 rounded-[28px] bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center font-mono leading-none group-hover/card:border-emerald-600 group-hover/card:scale-105 transition-all shadow-inner">
                                   <span className="text-2xl text-white font-black leading-none">{s.date.split('-')[2]}</span>
                                   <span className="text-[11px] text-slate-600 font-black uppercase mt-2 tracking-[0.2em]">{s.date.split('-')[1]}</span>
                                </div>
                                <div className="space-y-3">
                                   <p className="text-[18px] font-black uppercase italic text-slate-100 group-hover/card:text-emerald-400 transition-colors tracking-tight leading-none">{s.modality || 'Box Session'}</p>
                                   <div className="flex items-center gap-5 mt-4 opacity-40 group-hover/card:opacity-100 transition-opacity duration-700">
                                      <p className="text-[10px] text-slate-500 font-black uppercase italic tracking-widest flex items-center gap-3 leading-none">
                                         <Weight className="w-4 h-4 text-emerald-500" /> RX LOAD VERIFIED
                                      </p>
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                      <p className="text-[10px] text-slate-500 font-black uppercase italic tracking-widest flex items-center gap-3 leading-none">
                                         <Activity className="w-4 h-4 text-lime-400" /> EFFORT: {s.rpe}/10
                                      </p>
                                   </div>
                                </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-4xl font-black italic text-lime-400 leading-none group-hover/card:scale-125 transition-transform duration-700 drop-shadow-[0_0_20px_rgba(163,230,53,0.3)] font-mono tracking-tighter">{s.score}</p>
                                 <div className="mt-4 flex justify-end gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                                 </div>
                              </div>
                            </motion.div>
                          )) : (
                             <div className="p-32 text-center border-4 border-dashed border-slate-900/50 rounded-[60px] bg-slate-950/20 opacity-30">
                                <HistoryIcon className="w-20 h-20 text-slate-800 mx-auto mb-10" />
                                <p className="text-slate-800 text-[14px] font-black uppercase italic tracking-[0.5em] leading-relaxed">Sin registros para el ciclo actual</p>
                             </div>
                          )}
                        </div>
                     </div>

                     {/* Feedback & Coaching Hub */}
                     <div className="space-y-16">
                        <div className="flex items-center gap-6">
                           <div className="p-4 bg-lime-400/10 rounded-2xl border border-lime-400/10 shadow-2xl">
                              <MessageSquare className="w-8 h-8 text-lime-400 shadow-lime-400/20 shadow-xl" />
                           </div>
                           <h4 className="text-[20px] font-black uppercase italic text-slate-200 tracking-[0.5em] leading-none mb-0">Coach Direct Feed</h4>
                        </div>
                        
                        <div className="bg-slate-950 p-12 rounded-[56px] border-2 border-slate-900 shadow-[0_30px_70px_rgba(0,0,0,0.6)] relative group overflow-hidden">
                           <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                              <Send className="w-56 h-56 text-white" />
                           </div>
                           <p className="text-[12px] text-slate-600 font-black uppercase mb-12 italic tracking-[0.4em] leading-none ml-4 flex items-center gap-4">
                              <Target className="w-5 h-5 text-emerald-500" /> EMITIR CORRECCIONES Y ANÁLISIS
                           </p>
                           <div className="flex flex-col gap-10 relative z-10">
                              <textarea 
                                placeholder="ESCRIBE AQUÍ TU ANÁLISIS TÉCNICO, CORRECCIÓN O CONSEJO PERSONALIZADO..." 
                                value={adviceText}
                                onChange={(e) => setAdviceText(e.target.value)}
                                rows={6}
                                className="w-full bg-slate-900 border-2 border-slate-800 rounded-[40px] p-10 text-[15px] font-medium italic text-slate-200 placeholder-slate-800 outline-none focus:border-lime-500 transition-all leading-relaxed shadow-inner" 
                              />
                              <button 
                                onClick={handleAdviceSubmit}
                                disabled={!adviceText.trim()}
                                className="w-full bg-emerald-700 text-white py-8 rounded-[36px] font-black uppercase text-[14px] tracking-[0.5em] shadow-2xl shadow-emerald-900/50 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-6 group/btn border-2 border-emerald-600/50 italic"
                              >
                                POST FEEDBACK
                                <Send className="w-6 h-6 group-hover/btn:translate-x-3 group-hover/btn:-translate-y-3 transition-transform duration-700" />
                              </button>
                           </div>
                           <p className="text-[10px] text-slate-800 font-bold uppercase mt-10 ml-4 tracking-[0.3em] italic leading-none opacity-40">System alert: Los datos se sincronizan con la App del atleta.</p>
                        </div>

                        {/* Feedback Timeline */}
                        <div className="space-y-8 max-h-[500px] overflow-y-auto scrollbar-hide pr-8 mt-12">
                          {feedbackHistory.map((f, i) => (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                              key={f.id} 
                              className="bg-emerald-950/10 p-10 rounded-[48px] border border-emerald-900/10 relative overflow-hidden border-l-lime-400 border-l-[8px] group hover:bg-emerald-900/10 transition-all duration-500 shadow-2xl"
                            >
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-[-10deg] rotate-45 transition-transform duration-1000">
                                 <MessageSquare className="w-24 h-24 text-white" />
                              </div>
                              <p className="text-[18px] italic text-slate-100 font-medium leading-relaxed relative z-10 group-hover:text-white transition-colors duration-500 tracking-tight">"{f.content}"</p>
                              <div className="flex justify-between items-center mt-10 pt-8 border-t border-emerald-900/10 relative z-10">
                                 <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-[18px] bg-lime-400 flex items-center justify-center shadow-[0_0_15px_rgba(163,230,53,0.5)]"><CheckCircle2 className="w-6 h-6 text-black" /></div>
                                    <div className="space-y-1">
                                       <p className="text-[11px] font-black uppercase tracking-[0.4em] text-lime-400 italic">Jungle HP Staff</p>
                                       <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">{f.coachName || 'HEAD COACH'}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[9px] text-slate-700 font-mono font-black tracking-[0.2em] uppercase italic opacity-60">Status: DELIVERED</p>
                                 </div>
                              </div>
                            </motion.div>
                          ))}
                          {feedbackHistory.length === 0 && (
                            <div className="p-32 text-center bg-slate-950/20 rounded-[60px] border-4 border-dashed border-slate-900/50 opacity-10">
                              <MessageSquare className="w-20 h-20 mx-auto mb-10 text-slate-700" />
                              <p className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-700">AWAITING TECHNICAL LOGS</p>
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
          PESTAÑA 4: PROGRAMACIÓN SEMANAL (CRUD WODS)
      ---------------------------------------------------------------------- */}
      {activeTab === 'wods' && (
        <div className="space-y-12 animate-in fade-in duration-800 slide-in-from-top-10">
           <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-12 border-b-2 border-slate-900/50 pb-16">
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                   <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-pulse" />
                   <p className="text-emerald-500 text-[12px] font-black uppercase tracking-[0.6em] italic leading-none">Programming Center v2.0</p>
                </div>
                <h3 className="text-8xl font-black italic uppercase text-white tracking-tighter leading-none flex flex-wrap items-center gap-10">
                  WOD <span className="text-emerald-500 underline underline-offset-[20px] decoration-[16px] decoration-emerald-950/60 italic">Schedule</span>
                </h3>
                <div className="bg-slate-900/60 p-6 rounded-[30px] border-2 border-slate-800/50 inline-block backdrop-blur-2xl shadow-2xl">
                   <p className="text-[14px] text-slate-500 font-black uppercase tracking-[0.4em] leading-none italic flex items-center gap-5">
                      <Calendar className="w-6 h-6 text-emerald-500" /> Rango: {formatDate(weekStart).split(',')[1]} — {formatDate(weekEnd).split(',')[1]}
                   </p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} 
                className="bg-emerald-700 text-white px-16 py-10 rounded-[48px] text-[15px] font-black uppercase flex items-center gap-8 hover:bg-emerald-600 active:scale-95 transition-all shadow-[0_40px_100px_rgba(4,120,87,0.4)] border-4 border-emerald-500/20 group relative z-10"
              >
                <div className="bg-emerald-950 p-3 rounded-[20px] group-hover:rotate-180 transition-transform duration-1000 shadow-2xl border border-emerald-800/50">
                   <Plus className="w-8 h-8" />
                </div>
                AGREGAR SESIÓN
              </button>
           </div>

           {/* CALENDARIO DE 7 DÍAS */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
             {weekDates.map((date, idx) => {
               const dayWods = wods.filter(w => w.date === date);
               const isToday = date === getTodayDate();
               return (
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={date} 
                    className={cn(
                        "bg-slate-900/40 p-14 rounded-[70px] border transition-all duration-1000 flex flex-col h-full min-h-[600px] backdrop-blur-md relative group",
                        isToday ? "border-emerald-500/50 bg-slate-900/90 shadow-[0_60px_120px_rgba(0,0,0,0.7)] ring-8 ring-emerald-500/10 scale-[1.07] z-30" : "border-slate-800 shadow-3xl hover:border-slate-700 hover:bg-slate-900/60"
                    )}
                 >
                    {isToday && (
                       <div className="absolute top-12 right-12">
                          <div className="px-6 py-2.5 rounded-[20px] bg-emerald-500 text-black text-[10px] font-black uppercase italic tracking-[0.3em] shadow-[0_15px_30px_rgba(16,185,129,0.5)] animate-bounce">
                             Active Today
                          </div>
                       </div>
                    )}
                    <div className="mb-20 text-center relative">
                       <p className={cn("text-[20px] font-black uppercase mb-4 italic tracking-[0.4em] leading-none transition-all duration-700 group-hover:tracking-[0.5em]", isToday ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400")}>
                          {weekDays[idx]}
                       </p>
                       <p className="text-[14px] font-mono text-slate-800 font-black opacity-60 tracking-[0.6em] group-hover:opacity-100 transition-opacity leading-none">
                          {date.split('-').reverse().slice(0,2).join('.').toUpperCase()}
                       </p>
                    </div>

                    <div className="flex-1 space-y-8">
                       {dayWods.map(w => (
                         <div key={w.id} className="group/wod bg-slate-950/90 p-12 rounded-[56px] border-2 border-slate-900 hover:border-emerald-700/50 transition-all duration-700 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2.5 h-full bg-emerald-500 opacity-0 group-hover/wod:opacity-100 transition-opacity duration-1000 shadow-[0_0_30px_rgba(16,185,129,0.8)]" />
                            <div className="flex items-center justify-between mb-8">
                               <div className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] italic border-2 transition-all duration-700 group-hover/wod:bg-opacity-20", w.type === 'time' ? "bg-amber-500/5 text-amber-500 border-amber-500/20" : "bg-lime-400/5 text-lime-400 border-lime-400/20")}>
                                  {w.type === 'time' ? 'FOR TIME' : 'STRENGTH'}
                               </div>
                            </div>
                            <h4 className="text-[26px] font-black uppercase italic text-white mb-8 leading-[1] line-clamp-2 tracking-tighter font-mono group-hover/wod:text-lime-400 transition-colors">{w.title}</h4>
                            <p className="text-[13px] text-slate-600 italic line-clamp-[10] mb-12 leading-relaxed font-medium group-hover/wod:text-slate-300 transition-colors">"{w.description}"</p>
                            
                            <div className="flex gap-10 pt-10 border-t-2 border-slate-900/50 opacity-0 group-hover/wod:opacity-100 transition-all translate-y-6 group-hover/wod:translate-y-0 duration-700">
                               <button 
                                 onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} 
                                 className="text-[12px] font-black uppercase text-slate-600 hover:text-white transition-all tracking-[0.4em] font-mono hover:scale-110"
                               >
                                 EDITAR
                               </button>
                               <button 
                                 onClick={() => handleWodDelete(w.id!)} 
                                 className="text-[12px] font-black uppercase text-red-500/20 hover:text-red-500 transition-all tracking-[0.4em] font-mono hover:scale-110"
                               >
                                 BORRAR
                               </button>
                            </div>
                         </div>
                       ))}
                       {dayWods.length === 0 && (
                          <button 
                            onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }}
                            className="w-full h-full border-4 border-dashed border-slate-800/40 rounded-[60px] flex flex-col items-center justify-center gap-10 text-slate-800 hover:text-emerald-500 hover:border-emerald-700/50 transition-all duration-1000 group/add p-20 bg-slate-950/20 hover:bg-slate-950/40 shadow-inner"
                          >
                             <div className="w-24 h-24 rounded-[36px] bg-slate-900 border-2 border-slate-800 flex items-center justify-center group-hover/add:rotate-90 group-hover/add:scale-125 transition-all duration-1000 shadow-3xl group-hover/add:bg-emerald-950 group-hover/add:border-emerald-700 group-hover/add:shadow-emerald-900/30">
                                <Plus className="w-12 h-12" />
                             </div>
                             <span className="text-[14px] font-black uppercase italic tracking-[0.6em] leading-none opacity-50 group-hover/add:opacity-100 transition-opacity">Schedule WOD</span>
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
          PESTAÑA 5: LEADERBOARD (CONSULTA HISTÓRICA)
      ---------------------------------------------------------------------- */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-12 animate-in fade-in duration-800 zoom-in-95">
          <div className="bg-slate-900 rounded-[80px] p-24 border border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 opacity-[0.05] pointer-events-none rotate-12 scale-125">
               <Trophy className="w-[700px] h-[700px] text-white" />
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16 mb-24 relative z-10">
               <div className="space-y-10">
                  <div className="flex items-center gap-6">
                     <Trophy className="w-12 h-12 text-lime-400 drop-shadow-[0_0_30px_rgba(163,230,53,0.6)]" />
                     <p className="text-lime-400 text-[14px] font-black uppercase tracking-[0.8em] italic leading-none">Elite History Radar</p>
                  </div>
                  <h3 className="text-8xl font-black italic uppercase tracking-tighter text-white leading-none">
                    Rank <span className="text-lime-400 italic underline decoration-lime-950/50 decoration-[16px] underline-offset-[16px]">Archive</span>
                  </h3>
                  <p className="text-[16px] text-slate-600 font-bold uppercase tracking-widest mt-12 leading-relaxed max-w-2xl italic opacity-80">
                     Acceso integral al historial de competencia sistémica. Selecciona un entrenamiento específico para desglosar el podio histórico de atletas y staff.
                  </p>
               </div>
            </div>

            {/* BARRA DE SELECCIÓN DE ENTRENAMIENTO */}
            <div className="flex gap-6 overflow-x-auto scrollbar-hide mb-20 p-6 bg-slate-950 rounded-[50px] border-2 border-slate-900 shadow-inner relative z-10">
              {wods.length > 0 ? wods.map(wod => (
                <button 
                  key={wod.id} 
                  onClick={() => setSelectedWodForLeaderboard(wod)}
                  className={cn(
                    "px-14 py-10 rounded-[40px] text-[13px] font-black uppercase border-2 transition-all duration-700 whitespace-nowrap shadow-3xl flex flex-col items-center gap-4 min-w-[280px]",
                    selectedWodForLeaderboard?.id === wod.id 
                      ? "bg-emerald-700 border-emerald-500 text-white shadow-emerald-900/60 -translate-y-4 scale-105" 
                      : "bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-300"
                  )}
                >
                  <span className="leading-none tracking-tighter font-mono text-2xl group-hover:scale-110 transition-transform">{wod.title}</span>
                  <span className={cn("text-[10px] font-bold tracking-[0.4em] italic mt-2", selectedWodForLeaderboard?.id === wod.id ? "text-white/50" : "text-slate-700")}>
                     {wod.date.split('-').reverse().join(' / ')}
                  </span>
                </button>
              )) : (
                <div className="py-12 px-20 text-[14px] font-black uppercase italic text-slate-800 tracking-[0.5em] w-full text-center">Sin datos programados para el ciclo actual</div>
              )}
            </div>

            {selectedWodForLeaderboard ? (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5 }} className="relative z-10">
                <WodRanking 
                  wodId={selectedWodForLeaderboard.id!} 
                  type={selectedWodForLeaderboard.type as any} 
                />
              </motion.div>
            ) : (
              <div className="py-64 text-center flex flex-col items-center justify-center border-4 border-dashed border-slate-900/60 rounded-[80px] bg-slate-950/20">
                <div className="w-32 h-32 bg-slate-900 rounded-[50px] flex items-center justify-center mb-12 border-2 border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                   <Trophy className="w-16 h-16 text-slate-800" />
                </div>
                <p className="font-black uppercase italic text-lg tracking-[0.8em] text-slate-800 animate-pulse">
                  SELECCIONA UN ENTRENAMIENTO PARA DESBLOQUEAR EL PODIO
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 6: TEAM (STAFF CONTROL PANEL)
      ---------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="space-y-12 animate-in fade-in duration-800 slide-in-from-bottom-10">
           <div className="bg-slate-900 rounded-[80px] p-20 border border-slate-800 shadow-[0_80px_160px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-12 mb-24 relative z-10">
                 <div className="space-y-8">
                    <div className="flex items-center gap-6">
                       <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-2xl">
                          <ShieldAlert className="w-8 h-8 text-amber-500" />
                       </div>
                       <p className="text-amber-500 text-[14px] font-black uppercase tracking-[0.8em] italic leading-none">Staff Privileges Area</p>
                    </div>
                    <h3 className="text-7xl font-black italic uppercase text-white tracking-tighter leading-none flex items-center gap-10">
                       Admin <span className="text-amber-500 underline decoration-amber-950/60 decoration-[16px] underline-offset-[16px] italic">Access Hub</span>
                    </h3>
                    <p className="text-[15px] text-slate-600 font-bold uppercase tracking-widest mt-12 max-w-2xl leading-relaxed italic opacity-80">
                       Gestión jerárquica de permisos del box. Control de roles operativos y depuración integral de la arquitectura de usuarios de la Jungla HP.
                    </p>
                 </div>
              </div>
              
              <div className="space-y-8 relative z-10">
                {athletes.map((u, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    key={u.uid} 
                    className="flex flex-col md:flex-row md:items-center justify-between p-14 bg-slate-950/90 rounded-[64px] border-2 border-slate-900 hover:border-amber-900/50 hover:bg-slate-900/60 transition-all duration-700 group shadow-3xl gap-12"
                  >
                     <div className="flex items-center gap-12 flex-1">
                        <div className="relative group/avatar">
                           <div className="absolute inset-0 bg-amber-500/10 blur-[60px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-1000" />
                           <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-32 h-32 rounded-[50px] border-4 border-slate-800 group-hover/avatar:scale-110 group-hover/avatar:border-amber-500/40 transition-all duration-1000 shadow-3xl relative z-10 object-cover" alt="" />
                           <div className={cn(
                              "absolute -top-4 -left-4 px-6 py-2 rounded-[18px] text-[12px] font-black uppercase italic border-4 border-slate-950 shadow-3xl z-20 transition-all group-hover/avatar:-rotate-6", 
                              u.role === 'coach' ? "bg-amber-500 text-slate-950 shadow-amber-500/20" : "bg-slate-800 text-slate-400"
                           )}>
                              {u.role}
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-4xl font-black uppercase text-white italic leading-none tracking-tighter group-hover:text-amber-400 transition-all duration-700">{u.displayName}</p>
                           <p className="text-[11px] text-slate-700 font-bold uppercase italic tracking-[0.5em] leading-none font-mono opacity-60">STAFF_UID: {u.uid.toUpperCase()}</p>
                           <div className="flex items-center gap-5 mt-8 opacity-20 group-hover:opacity-40 transition-opacity">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shadow-2xl" />
                              <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest italic">Security verified session • Box Staff</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-6">
                       <button 
                         onClick={() => handleRoleChange(u.uid, u.role === 'coach' ? 'athlete' : 'coach')} 
                         className={cn(
                           "px-12 py-7 rounded-[32px] text-[12px] font-black uppercase transition-all duration-700 active:scale-95 border-2 shadow-2xl tracking-[0.3em] italic",
                           u.role === 'coach' 
                             ? "bg-amber-500/5 text-amber-500 border-amber-500/20 hover:bg-amber-500/10" 
                             : "bg-emerald-700 text-white border-emerald-600/50 hover:bg-emerald-600 shadow-emerald-900/60"
                         )}
                       >
                          {u.role === 'coach' ? 'REVOKE STAFF' : 'GRANT COACH ACCESS'}
                       </button>
                       <button 
                         onClick={() => handleDeleteAthlete(u.uid)} 
                         disabled={u.uid === profile?.uid}
                         className="p-8 bg-red-500/5 text-red-500 rounded-[32px] border-2 border-red-500/10 hover:bg-red-500/20 transition-all active:scale-90 disabled:opacity-5 disabled:grayscale shadow-3xl flex items-center justify-center group/del"
                       >
                          <Trash2 className="w-8 h-8 group-hover/del:scale-125 transition-transform duration-700" />
                       </button>
                     </div>
                  </motion.div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 7: PERFIL PROPIO (STAFF EDIT)
      ---------------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="space-y-12 animate-in fade-in duration-800 slide-in-from-bottom-6">
          <div className="bg-slate-900 rounded-[80px] p-24 border border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden text-white flex flex-col items-center text-center">
            
            <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none rotate-45 scale-150">
               <Settings className="w-96 h-96 text-white" />
            </div>

            <div className="space-y-6 mb-20 relative z-10">
               <div className="flex items-center justify-center gap-5">
                  <div className="w-3 h-10 bg-lime-400 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.5)]" />
                  <h3 className="text-7xl font-black italic uppercase tracking-tighter leading-none italic mb-0">Coach <span className="text-lime-400 italic">Settings</span></h3>
               </div>
               <p className="text-[14px] text-slate-600 font-bold uppercase tracking-[0.5em] italic">Personal Staff Identity Management</p>
            </div>

            <div className="relative group mb-16 z-10">
               <div className="absolute inset-0 bg-lime-400/10 blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />
               <img src={ownProfileData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-64 h-64 rounded-[70px] border-8 border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,0.6)] object-cover group-hover:scale-[1.05] transition-transform duration-1000 relative z-10" alt="" />
               <div className="absolute -bottom-6 -right-6 bg-lime-400 text-black p-7 rounded-[36px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-20 hover:rotate-12 transition-transform duration-500">
                  <UserCircle className="w-10 h-10" />
               </div>
            </div>

            <div className="space-y-10 w-full max-w-2xl relative z-10">
              <div className="space-y-5 text-left">
                 <label className="text-[12px] font-black uppercase text-slate-500 ml-10 italic tracking-[0.5em] leading-none">Public Coach Identity</label>
                 <input 
                    value={ownProfileData.displayName} 
                    onChange={e => setOwnProfileData({...ownProfileData, displayName: e.target.value})} 
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-[40px] p-10 text-3xl font-black italic text-white outline-none focus:border-lime-500 transition-all shadow-inner tracking-tighter" 
                 />
              </div>
              <div className="space-y-5 text-left">
                 <label className="text-[12px] font-black uppercase text-slate-500 ml-10 italic tracking-[0.5em] leading-none">Staff Avatar URL</label>
                 <input 
                    value={ownProfileData.photoURL} 
                    onChange={e => setOwnProfileData({...ownProfileData, photoURL: e.target.value})} 
                    placeholder="HTTPS://CLOUDINARY.COM/MY-AVATAR.JPG" 
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-[40px] p-10 text-base font-black italic text-slate-400 outline-none focus:border-lime-500 transition-all shadow-inner tracking-widest font-mono" 
                 />
              </div>
              <button 
                 onClick={handleUpdateOwnProfile} 
                 className="w-full bg-lime-400 text-black py-10 rounded-[48px] font-black uppercase tracking-[0.5em] text-lg shadow-[0_40px_80px_rgba(163,230,53,0.3)] active:scale-95 transition-all mt-12 border-4 border-lime-300/30 italic"
              >
                 SAVE STAFF PROFILE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          GLOBAL MODALS & SYSTEM OVERLAYS
      ====================================================================== */}
      
      {/* FULL-SCREEN WOD BUILDER MODAL */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-slate-950/98 backdrop-blur-[40px]"
          >
             <motion.div 
               initial={{ scale: 0.7, opacity: 0, y: 100 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               transition={{ type: 'spring', damping: 30, stiffness: 150 }}
               className="bg-slate-900 p-20 rounded-[90px] w-full max-w-4xl border-4 border-slate-800 shadow-[0_80px_200px_rgba(0,0,0,1)] relative overflow-hidden"
             >
                <div className="absolute -top-20 -left-20 p-32 opacity-[0.01] pointer-events-none rotate-45">
                   <Calendar className="w-[500px] h-[500px] text-white" />
                </div>

                <button 
                   onClick={() => setShowWodForm(false)} 
                   className="absolute top-16 right-16 text-slate-700 hover:text-white transition-all bg-slate-950 p-6 rounded-full border-2 border-slate-800 z-50 group hover:rotate-180 duration-1000"
                >
                   <Repeat className="w-10 h-10 rotate-45 group-hover:scale-125 transition-transform" />
                </button>
                
                <div className="text-center mb-24 relative z-10 space-y-6">
                   <h3 className="text-7xl font-black italic uppercase text-white tracking-tighter leading-none mb-0">
                      {editingWod ? 'Update' : 'Schedule'} <span className="text-emerald-500 italic">Workout</span>
                   </h3>
                   <p className="text-[14px] text-slate-600 font-bold uppercase tracking-[0.6em] italic leading-none">Sincronización con base de datos Jungle v2.5</p>
                </div>
                
                <div className="space-y-12 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-5">
                        <label className="text-[12px] font-black uppercase text-slate-500 ml-8 italic tracking-[0.4em] leading-none">Programmed Date</label>
                        <input 
                           type="date" 
                           value={newWod.date} 
                           onChange={e => setNewWod({...newWod, date: e.target.value})} 
                           className="w-full bg-slate-950 border-2 border-slate-800 rounded-[36px] p-10 text-lg text-white outline-none focus:border-emerald-700 transition-all font-black shadow-2xl tracking-tighter" 
                        />
                     </div>
                     <div className="space-y-5">
                        <label className="text-[12px] font-black uppercase text-slate-500 ml-8 italic tracking-[0.4em] leading-none">Scoring Methodology</label>
                        <select 
                           value={newWod.type} 
                           onChange={e => setNewWod({...newWod, type: e.target.value})} 
                           className="w-full bg-slate-950 border-2 border-slate-800 rounded-[36px] p-10 text-[16px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all shadow-2xl italic tracking-widest"
                        >
                           <option value="">-- SELECT SYSTEM --</option>
                           <option value="time">FOR TIME (Velocidad)</option>
                           <option value="weight">STRENGTH / RM (Kilos)</option>
                           <option value="reps">AMRAP (Repeticiones)</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-5">
                     <label className="text-[12px] font-black uppercase text-slate-500 ml-8 italic tracking-[0.4em] leading-none">Workout Identity (Hero/Name)</label>
                     <input 
                        placeholder="EJ: 'MURPH' O 'DEATH BY SQUATS'..." 
                        value={newWod.title} 
                        onChange={e => setNewWod({...newWod, title: e.target.value})} 
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-[36px] p-10 text-3xl font-black italic text-white outline-none focus:border-emerald-700 transition-all shadow-2xl placeholder-slate-900 tracking-tighter" 
                     />
                  </div>

                  <div className="space-y-5">
                     <label className="text-[12px] font-black uppercase text-slate-500 ml-8 italic tracking-[0.4em] leading-none">Technical Breakdown</label>
                     <textarea 
                        placeholder="DETALLA LAS RONDAS, EJERCICIOS Y FLUJO DEL WOD AQUÍ..." 
                        value={newWod.description} 
                        onChange={e => setNewWod({...newWod, description: e.target.value})} 
                        rows={6} 
                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-[50px] p-12 text-[16px] font-medium italic text-slate-300 outline-none focus:border-emerald-700 transition-all leading-relaxed shadow-2xl placeholder-slate-900" 
                     />
                  </div>

                  <div className="flex gap-8 pt-16">
                     <button 
                        onClick={() => setShowWodForm(false)} 
                        className="flex-1 py-10 text-[15px] font-black uppercase text-slate-700 hover:text-slate-400 transition-all tracking-[0.6em] font-black italic"
                     >
                        TERMINATE
                     </button>
                     <button 
                        onClick={handleWodSubmit} 
                        className="flex-[2] bg-emerald-700 text-white py-10 rounded-[44px] text-[15px] font-black uppercase tracking-[0.6em] shadow-[0_40px_100px_rgba(4,120,87,0.6)] active:scale-95 transition-all border-4 border-emerald-500/20 italic"
                     >
                        {editingWod ? 'COMMIT CHANGES' : 'PUBLISH WORKOUT'}
                     </button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICACIONES TOAST SISTÉMICAS */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 150, scale: 0.5 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 150, scale: 0.5 }} 
            className="fixed bottom-40 left-4 right-4 z-[200] flex justify-center pointer-events-none"
          >
            <div className={cn(
               "px-16 py-10 rounded-[50px] shadow-[0_60px_150px_rgba(0,0,0,1)] flex items-center gap-12 border backdrop-blur-[60px] transition-all duration-700",
               toast.type === 'success' ? "bg-emerald-900/95 border-emerald-500/40 text-white" : "bg-red-900/95 border-red-500/40 text-white"
            )}>
               <div className={cn("p-6 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)]", toast.type === 'success' ? "bg-lime-400 shadow-lime-400/30" : "bg-red-500 shadow-red-500/30")}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-10 h-10 text-black" /> : <ShieldAlert className="w-10 h-10 text-black" />}
               </div>
               <div className="flex flex-col space-y-3">
                  <span className="text-[20px] font-black uppercase italic tracking-[0.4em] leading-none">{toast.message}</span>
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-[2px] bg-white/20" />
                     <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.5em] leading-none font-mono">System Protocol v3.0</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
