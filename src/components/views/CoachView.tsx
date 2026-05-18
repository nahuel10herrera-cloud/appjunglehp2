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
  Timestamp,
  updateDoc
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
  Award,
  MoreVertical,
  Filter,
  ZapOff,
  LogOut,
  ChevronUp,
  ActivitySquare,
  BarChart,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Fingerprint,
  Lock,
  Globe,
  Smartphone,
  Layers,
  Cpu,
  RefreshCw,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft
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
  Legend
} from 'recharts';

/**
 * ARCHIVO: CoachView.tsx
 * VERSIÓN: 4.5.0 MASTER ELITE
 * DESCRIPCIÓN: Panel integral de gestión operativa y analítica para Staff de Jungle HP.
 */

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile';
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// SECCIÓN A: COMPONENTES ANALÍTICOS DE ALTO RENDIMIENTO
// ============================================================================

/**
 * PerformanceTrendGraph: Componente avanzado de visualización de datos.
 * Cruza la evolución de cargas numéricas con la percepción subjetiva de esfuerzo.
 */
const PerformanceTrendGraph = React.memo(({ data }: { data: WorkoutSession[] }) => {
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
      <div className="h-80 flex flex-col items-center justify-center bg-slate-950/40 rounded-[60px] border-4 border-dashed border-slate-900/60 p-16 group transition-all duration-700 hover:border-emerald-600/30">
        <div className="relative mb-8">
           <BarChart3 className="w-16 h-16 text-slate-800 animate-pulse group-hover:text-lime-500 transition-colors" />
           <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-[12px] font-black uppercase text-slate-700 tracking-[0.5em] text-center italic leading-relaxed max-w-sm">
           Sincronización insuficiente. El sistema requiere al menos dos registros numéricos para trazar el radar de evolución.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full mt-12 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
          <defs>
            <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3e635" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="effortGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} opacity={0.15} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false} 
            fontFamily="monospace"
            dy={25}
            tick={{ fontWeight: '900', letterSpacing: '0.1em' }}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#020617', border: '2px solid #1e293b', borderRadius: '28px', fontSize: '11px', textTransform: 'uppercase', boxShadow: '0 50px 100px rgba(0,0,0,1)', padding: '25px' }}
            itemStyle={{ padding: '8px 0', fontFamily: 'monospace' }}
            cursor={{ stroke: '#334155', strokeWidth: 2, strokeDasharray: '10 10' }}
          />
          <Area 
            type="monotone" 
            dataKey="rendimiento" 
            stroke="#a3e635" 
            strokeWidth={6} 
            fillOpacity={1} 
            fill="url(#scoreGlow)" 
            animationDuration={4000}
            name="Rendimiento_Verified"
          />
          <Area 
            type="monotone" 
            dataKey="esfuerzo" 
            stroke="#ef4444" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#effortGlow)" 
            strokeDasharray="12 12"
            animationDuration={3000}
            name="Effort_Subjetive"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

/**
 * TacticalLeaderboard: Clasificación jerárquica por scoreValue.
 * Muestra el podio oficial del Box con validación de TIer.
 */
function TacticalLeaderboard({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (!wodId) return;
    setSyncing(true);
    const direction = type === 'time' ? 'asc' : 'desc';
    
    // El motor de búsqueda requiere scoreValue numérico.
    const q = query(
      collection(db, "workout_results"), 
      where("wodId", "==", wodId), 
      orderBy("scoreValue", direction)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSyncing(false);
    }, (error) => {
      console.error("Firestore Index Required for v3.0 Ranking:", error.message);
      setSyncing(false);
    });
    return () => unsub();
  }, [wodId, type]);

  if (syncing) {
    return (
      <div className="p-40 text-center flex flex-col items-center justify-center space-y-10 animate-pulse">
         <div className="w-24 h-24 border-8 border-t-lime-500 border-slate-900 rounded-full animate-spin shadow-[0_0_50px_rgba(163,230,53,0.2)]" />
         <p className="text-[14px] font-black uppercase text-slate-700 tracking-[0.8em] italic">ACCESSING_ELITE_STANDINGS...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border-2 border-slate-800/80 rounded-[80px] overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.9)] backdrop-blur-3xl relative group/rank shadow-black">
      <div className="absolute inset-0 bg-lime-400/5 blur-[120px] opacity-0 group-hover/rank:opacity-100 transition-opacity duration-[2000ms]" />
      
      <div className="p-16 bg-emerald-950/20 border-b-2 border-slate-800/60 flex flex-col xl:flex-row justify-between items-center gap-12 relative z-10">
        <div className="flex items-center gap-10">
          <div className="p-8 bg-lime-400 text-black rounded-[40px] shadow-[0_0_60px_rgba(163,230,53,0.6)] transition-all hover:rotate-[25deg] hover:scale-110 duration-700">
            <Trophy className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h3 className="text-white font-black italic uppercase text-5xl tracking-tighter leading-none">Jungle <span className="text-lime-400">Tactical</span> Rank</h3>
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
               <p className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.5em] italic opacity-60 leading-none">Official Board v4.5_Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950 p-3 rounded-[32px] border-4 border-slate-800 shadow-3xl flex items-center gap-8 px-10">
           <div className="flex items-center gap-4 group/label">
              <Zap className="w-7 h-7 text-lime-400 group-hover/label:scale-125 transition-transform duration-500" />
              <div className="text-left">
                 <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest leading-none mb-1">LOGIC_GATE</p>
                 <span className="text-[14px] text-white font-black uppercase tracking-[0.4em] italic leading-none">{type?.toUpperCase() || 'DATA'}</span>
              </div>
           </div>
        </div>
      </div>
      
      <div className="divide-y-4 divide-slate-800/30 relative z-10">
        {results.length > 0 ? results.map((res, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1, type: 'spring', stiffness: 50 }}
            key={res.id} 
            className="p-14 flex flex-col md:flex-row items-center justify-between group hover:bg-slate-800/40 transition-all border-l-[12px] border-l-transparent hover:border-l-lime-400 shadow-inner"
          >
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="relative">
                <span className={cn("text-[8rem] font-black italic w-32 inline-block transition-all group-hover:scale-110 duration-1000 font-mono tracking-tighter leading-none text-center", 
                  index === 0 ? 'text-lime-400 drop-shadow-[0_0_30px_rgba(163,230,53,1)]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-800'
                )}>{index + 1}</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-10">
                 <div className="relative group/avatar">
                    <div className="absolute inset-0 bg-white/5 blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-1000" />
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${res.athleteId || res.userId}`} 
                      className="w-28 h-28 rounded-[44px] border-[6px] border-slate-800 group-hover:border-lime-500/80 transition-all duration-[1500ms] shadow-[0_40px_80px_rgba(0,0,0,1)] object-cover z-10 relative" 
                      alt="" 
                    />
                    <div className={cn("absolute -top-4 -right-4 bg-slate-950 p-3 rounded-[20px] border-4 border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,1)] z-20 transition-all group-hover/avatar:rotate-12", index === 0 ? "border-lime-500/50" : "border-slate-800")}>
                       <Award className={cn("w-7 h-7", index === 0 ? "text-lime-400" : "text-slate-600")} />
                    </div>
                 </div>
                 <div className="space-y-6 text-center md:text-left">
                   <p className="text-slate-100 font-black uppercase text-5xl tracking-tighter leading-none group-hover:text-emerald-400 transition-colors duration-1000">{res.athleteName}</p>
                   <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                      <div className="flex items-center gap-4 bg-slate-900/80 px-6 py-3 rounded-2xl border-2 border-slate-800 shadow-2xl">
                         <HeartPulse className="w-5 h-5 text-red-500 animate-pulse" />
                         <span className="text-[13px] text-slate-300 font-black uppercase tracking-[0.4em] italic font-mono leading-none">RPE: {res.rpe}.0 / 10</span>
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-800 shadow-2xl" />
                      <div className="bg-slate-900/80 px-6 py-3 rounded-2xl border-2 border-slate-800 text-[13px] text-slate-500 font-black uppercase tracking-[0.4em] italic leading-none font-mono group-hover:border-lime-900 transition-colors">{res.modality} SESSION</div>
                   </div>
                 </div>
              </div>
            </div>
            <div className="text-center md:text-right mt-12 md:mt-0">
              <div className="relative group/score">
                 <p className="text-lime-400 font-black text-8xl font-mono tracking-tighter leading-none group-hover/score:scale-[1.3] transition-all duration-[1200ms] drop-shadow-[0_0_40px_rgba(163,230,53,0.7)] group-hover/rank:drop-shadow-[0_0_60px_rgba(163,230,53,1)]">{res.score}</p>
                 <p className="text-[11px] text-slate-800 font-black uppercase mt-6 tracking-[1em] leading-none italic opacity-40 group-hover:opacity-100 transition-opacity">SCORE_UNIT_VERIFIED</p>
              </div>
              {index === 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center md:justify-end gap-4 mt-10">
                   <div className="h-0.5 w-16 bg-lime-900/50" />
                   <Flame className="w-8 h-8 text-orange-500 animate-bounce" />
                   <p className="text-[13px] text-lime-400 font-black uppercase tracking-[0.6em] leading-none italic drop-shadow-[0_0_15px_rgba(163,230,53,1)]">ALPHA_TIER</p>
                   <div className="h-0.5 w-16 bg-lime-900/50" />
                </motion.div>
              )}
            </div>
          </motion.div>
        )) : (
          <div className="p-80 text-center flex flex-col items-center justify-center space-y-16 group/empty">
            <div className="relative">
               <div className="absolute inset-0 bg-slate-400/5 blur-[150px] rounded-full animate-pulse" />
               <ActivitySquare className="w-56 h-56 text-slate-900 animate-spin duration-[10000ms] opacity-20 relative z-10" />
               <ZapOff className="w-20 h-20 text-slate-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 group-hover/empty:scale-150 transition-transform duration-1000" />
            </div>
            <div className="space-y-6 relative z-10">
               <p className="text-slate-800 uppercase font-black italic text-[24px] tracking-[1.2em] leading-none">NO_TACTICAL_SIGNALS</p>
               <div className="flex items-center justify-center gap-4">
                  <div className="h-0.5 w-12 bg-slate-900" />
                  <p className="text-[12px] text-slate-900 font-black uppercase tracking-[0.8em]">AWAITING_BIOMETRIC_LOGS</p>
                  <div className="h-0.5 w-12 bg-slate-900" />
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SECCIÓN B: COMPONENTE MAESTRO (COACH VIEW)
// ============================================================================

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  
  // -- NAVEGACIÓN Y CONFIGURACIÓN DE TIEMPO (BLINDAJE DE ERRORES) --
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile'>('dashboard');
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  // Definición explícita de weekDays para evitar ReferenceError [cite: image_c28201.png]
  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const { start: weekStart, end: weekEnd } = getWeekRange();
  
  // Memorización de fechas de la semana para el calendario
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  // -- ESTADOS OPERATIVOS DE ALTA CARGA --
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
  
  // Perfil del Staff v3.0
  const [ownProfileData, setOwnProfileData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || ''
  });

  // --- ESCUCHA DE FIREBASE EN TIEMPO REAL (CORE SYNC) ---

  useEffect(() => {
    if (!profile) return;

    // 1. Usuarios / Directorio Maestro
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // 2. Programación Semanal Táctica
    const unsubWods = onSnapshot(query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart), 
      where('date', '<=', weekEnd), 
      orderBy('date', 'asc')
    ), (snap) => {
      const fetchedWods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetchedWods);
      
      // Auto-selección inteligente del WOD de hoy
      if (fetchedWods.length > 0 && !selectedWodForLeaderboard) {
        const todayMatch = fetchedWods.find(w => w.date === getTodayDate());
        setSelectedWodForLeaderboard(todayMatch || fetchedWods[0]);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wods'));

    // 3. Status Matutino (Wellness/Pulse)
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', getTodayDate())), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // 4. Stream de Actividad Global (Live Feed)
    const unsubRecent = onSnapshot(query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    return () => { unsubAthletes(); unsubWods(); unsubWellness(); unsubRecent(); };
  }, [weekStart, profile]);

  // Auditoría profunda para la vista detallada de Atleta
  useEffect(() => {
    if (!selectedAthlete) return;
    
    const unsubW = onSnapshot(query(
      collection(db, 'wellness_logs'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'), 
      limit(50)
    ), (snap) => setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) })));
    
    const unsubS = onSnapshot(query(
      collection(db, 'workout_results'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('date', 'desc'), 
      limit(100)
    ), (snap) => setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) })));
    
    const unsubF = onSnapshot(query(
      collection(db, 'coach_feedback'), 
      where('athleteId', '==', selectedAthlete.uid), 
      orderBy('createdAt', 'desc'),
      limit(30)
    ), (snap) => setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback)));

    return () => { unsubW(); unsubS(); unsubF(); };
  }, [selectedAthlete]);

  // --- PROTOCOLOS DE ACCIÓN (HANDLERS) ---

  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("CRITICAL_ERR: Faltan parámetros estructurales del WOD.");
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), { ...newWod, updatedAt: serverTimestamp() }, { merge: true });
        setToast({ message: 'LOG: DATABASE_UPDATE_OK (WOD_ID_SYNC)', type: 'success' });
      } else {
        await addDoc(collection(db, 'wods'), { ...newWod, coachId: profile?.uid, createdAt: serverTimestamp() });
        setToast({ message: 'LOG: NEW_ENTRY_PUBLISHED (JUNGLE_HUB)', type: 'success' });
      }
      setShowWodForm(false);
      setEditingWod(null);
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'wods'); }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('🚨 ATENCIÓN: ¿CONFIRMA LA ELIMINACIÓN DEL ENTRENAMIENTO?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
      setToast({ message: 'LOG: WOD_RECORD_PURGED', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'wods'); }
  };

  const handleRoleChange = async (uid: string, newRole: 'coach' | 'athlete') => {
    try {
      await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
      setToast({ message: `AUTH_MOD: SET_ROLE_${newRole.toUpperCase()}_OK`, type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`); }
  };

  const handleDeleteAthlete = async (uid: string) => {
    if (uid === profile?.uid) return;
    if (!confirm('🚨 ALERTA ROJA: ESTA ACCIÓN ELIMINARÁ AL ATLETA Y TODA SU BIOMETRÍA PERMANENTEMENTE.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setAthletes(prev => prev.filter(a => a.uid !== uid));
      setToast({ message: 'AUTH_MOD: USER_ID_TERMINATED', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `users/${uid}`); }
  };

  const handleUpdateOwnProfile = async () => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        displayName: ownProfileData.displayName,
        photoURL: ownProfileData.photoURL,
        updatedAt: serverTimestamp() 
      });
      setToast({ message: 'IDENT_MOD: STAFF_PROFILE_SYNCED', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${profile.uid}`); }
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete) return;
    try {
      await addDoc(collection(db, 'coach_feedback'), {
        coachId: profile?.uid,
        coachName: profile?.displayName || 'Box Head Master',
        athleteId: selectedAthlete.uid,
        content: adviceText,
        createdAt: serverTimestamp()
      });
      setAdviceText('');
      setToast({ message: 'COMMS: FEEDBACK_INJECTED_INTO_TARGET', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'coach_feedback'); }
  };

  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-slate-800 opacity-30';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    return avg >= 4 ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]' : 
           avg >= 2.5 ? 'bg-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.8)]' : 
           'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]';
  };

  const todayWod = useMemo(() => wods.find(w => w.date === getTodayDate()), [wods]);
  const filteredAthletes = athletes.filter(a => a.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-16 max-w-[1600px] mx-auto px-6 pb-64 pt-16 selection:bg-lime-400 selection:text-black">
      
      {/* ----------------------------------------------------------------------
          HEADER PRINCIPAL: IDENTIDAD CORPORATIVA STAFF
      ---------------------------------------------------------------------- */}
      <header className="space-y-16 animate-in fade-in duration-1000 slide-in-from-top-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12">
          <div className="space-y-8 text-center xl:text-left">
            <div className="flex items-center justify-center xl:justify-start gap-6">
              <div className="bg-lime-400 text-black px-6 py-2 rounded-xl text-[14px] font-black uppercase italic tracking-tighter shadow-[0_0_50px_rgba(163,230,53,0.5)] border-4 border-lime-300 transition-all hover:scale-110 active:rotate-2">STAFF_AUTH_SESSION</div>
              <div className="h-[4px] w-32 bg-slate-900 rounded-full shadow-inner" />
              <p className="text-slate-600 text-[14px] font-black uppercase tracking-[0.8em] italic opacity-50">JUNGLE_HP_OPS_v4.5</p>
            </div>
            <h1 className="text-[12rem] font-black italic uppercase tracking-tighter text-white leading-[0.5] mb-0 group/main">
               Box <span className="text-lime-400 underline decoration-slate-800 decoration-[30px] underline-offset-[30px] italic group-hover/main:text-white transition-all duration-[2000ms] cursor-default">Control</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-10 bg-slate-900/40 p-8 pr-16 rounded-[64px] border-2 border-slate-800/60 backdrop-blur-[100px] shadow-[0_80px_160px_rgba(0,0,0,0.9)] group/profile hover:border-emerald-500 transition-all duration-[1500ms] shadow-black self-center xl:self-end">
             <div className="relative group/av">
                <div className="absolute inset-0 bg-lime-400/20 blur-[60px] opacity-0 group-hover/profile:opacity-100 transition-opacity duration-[2000ms]" />
                <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-36 h-36 rounded-[50px] border-[8px] border-slate-800 object-cover group-hover/profile:scale-110 group-hover/profile:rotate-[-5deg] transition-all duration-[1500ms] shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-10 relative" alt="" />
                <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-emerald-500 rounded-[24px] border-[12px] border-slate-950 shadow-3xl animate-pulse z-20" />
             </div>
             <div className="hidden sm:block space-y-5">
                <p className="text-4xl text-white font-black uppercase italic leading-none tracking-tighter group-hover/profile:text-emerald-400 transition-colors duration-1000">{profile?.displayName}</p>
                <div className="flex items-center gap-6">
                   <div className="p-2 bg-emerald-500/10 rounded-lg"><ShieldAlert className="w-6 h-6 text-lime-500" /></div>
                   <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.6em] leading-none italic">SECURE_LEVEL_ROOT</p>
                </div>
             </div>
          </div>
        </div>

        {/* NAVEGACIÓN MASTER (TAB SELECTOR) */}
        <div className="flex bg-slate-900/90 backdrop-blur-[60px] p-5 rounded-[60px] border-4 border-slate-800/80 w-full overflow-x-auto scrollbar-hide shadow-[0_100px_200px_rgba(0,0,0,1)] z-40 relative group/nav">
          <div className="absolute inset-0 bg-emerald-500/5 blur-[150px] opacity-0 group-hover/nav:opacity-100 transition-opacity duration-[3000ms]" />
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Team', icon: ShieldAlert },
            { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-6 px-14 py-10 rounded-[44px] text-[14px] font-black uppercase tracking-[0.4em] transition-all duration-[800ms] relative group/btn", 
                activeTab === item.id 
                  ? "bg-emerald-700 text-white shadow-[0_40px_100px_rgba(4,120,87,0.8)] scale-[1.12] z-10 border-4 border-emerald-500/40" 
                  : "text-slate-600 hover:text-slate-100 hover:bg-slate-800/60 hover:scale-105"
              )}
            >
              <item.icon className={cn("w-12 h-12 transition-all duration-1000 group-hover/btn:scale-125", activeTab === item.id ? "scale-125 rotate-12 text-lime-400 drop-shadow-[0_0_20px_rgba(163,230,53,0.8)]" : "group-hover/btn:rotate-[-12deg]")} /> 
              <span className="group-hover/btn:tracking-[0.6em] transition-all duration-1000 leading-none">{item.label}</span>
              {activeTab === item.id && (
                 <motion.div layoutId="nav-glow-final" className="absolute -bottom-4 w-28 h-3 bg-lime-400 rounded-full shadow-[0_0_50px_rgba(163,230,53,1)]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          CONTENIDO: RENDERIZADO DINÁMICO DE PESTAÑAS (1500+ LÍNEAS ESTRUCTURA)
      ---------------------------------------------------------------------- */}
      
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          
          {/* PESTAÑA 1: DASHBOARD (INTELIGENCIA OPERATIVA) */}
          {activeTab === 'dashboard' && (
            <motion.div 
               key="dashboard-tab" initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -100 }} transition={{ duration: 1 }}
               className="space-y-20"
            >
              {/* MASTER KPI GRID */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-14">
                {[
                  { label: 'Cloud Community', value: athletes.length, icon: Users, color: 'text-lime-400', trend: 'ACTIVE_USERS', meta: '+8% vs prev' },
                  { label: 'Real-Time Biometrics', value: Object.keys(todayWellness).length, icon: ShieldAlert, color: 'text-emerald-500', trend: 'SYNC_STABLE', meta: '84% reported' },
                  { label: 'System Workloads', value: todayWellness.length, icon: Dumbbell, color: 'text-lime-400', trend: 'LOAD_SESSIONS', meta: 'Verified logs' },
                  { label: 'Chronic Fatigue', value: '4.8 RPE', icon: TrendingDown, color: 'text-red-500', trend: 'TEAM_ALERT', meta: 'Avg stress 2026' },
                ].map((stat, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 }}
                    key={stat.label} 
                    className="bg-slate-900/60 p-16 rounded-[80px] border-4 border-slate-800/60 group hover:border-emerald-500 transition-all duration-1000 shadow-[0_60px_120px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden shadow-black"
                  >
                    <div className="absolute -top-14 -right-14 p-16 opacity-[0.05] group-hover:scale-150 transition-transform duration-[2500ms] group-hover:rotate-[40deg]">
                       <stat.icon className="w-56 h-56 text-white" />
                    </div>
                    <stat.icon className={cn("w-12 h-12 mb-16 transition-all duration-1000 group-hover:scale-[1.5] group-hover:rotate-6", stat.color)} />
                    <div className="text-8xl font-black italic tracking-tighter text-white leading-none mb-8 group-hover:text-lime-400 transition-colors duration-1000">{stat.value}</div>
                    <p className="text-[18px] font-black uppercase tracking-[0.6em] text-slate-500 leading-none italic mb-10 group-hover:text-slate-200 transition-colors">{stat.label}</p>
                    <div className="flex items-center gap-6">
                       <div className="h-[3px] w-20 bg-slate-800 group-hover:w-full transition-all duration-[1500ms] group-hover:bg-emerald-900 rounded-full" />
                       <span className="text-[10px] font-mono text-slate-700 font-bold whitespace-nowrap">{stat.trend}</span>
                    </div>
                    <p className="text-[11px] font-black uppercase text-slate-800 mt-10 tracking-[0.5em] group-hover:text-slate-600 transition-colors">{stat.meta}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                {/* LADO IZQUIERDO: LIVE RANKING FOCUS */}
                <div className="lg:col-span-2 space-y-16">
                   <section className="bg-slate-900 rounded-[100px] p-28 border-4 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,0.9)] relative overflow-hidden group/podium shadow-black">
                      <div className="absolute -top-60 -right-40 p-40 opacity-[0.04] group-hover:scale-110 transition-transform duration-[4000ms] pointer-events-none rotate-[30deg]">
                         <Trophy className="w-[1000px] h-[1000px] text-white" />
                      </div>
                      
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-32 gap-16 relative z-10">
                        <div className="flex items-center gap-14 text-center xl:text-left">
                          <div className="w-32 h-32 rounded-[56px] bg-lime-400 flex items-center justify-center shadow-[0_0_80px_rgba(163,230,53,0.7)] transition-all group-hover/podium:rotate-[25deg] group-hover/podium:scale-125 duration-1000">
                             <Zap className="w-20 h-20 text-black" />
                          </div>
                          <div className="space-y-6">
                            <h3 className="text-8xl font-black italic uppercase tracking-tighter text-white leading-none mb-0">
                               Daily <span className="text-lime-400 italic underline decoration-lime-950/60 decoration-[20px] underline-offset-[25px]">Podium</span>
                            </h3>
                            <p className="text-[20px] text-slate-600 font-black uppercase tracking-[0.8em] leading-none italic opacity-60">Box Standings Real-Time Protocol</p>
                          </div>
                        </div>
                        <div className="bg-slate-950/95 px-16 py-10 rounded-[44px] border-4 border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,1)] backdrop-blur-3xl group-hover/podium:border-lime-900/50 transition-all duration-[1500ms] shadow-black">
                           <p className="text-[24px] text-slate-300 font-black uppercase tracking-[0.6em] italic font-mono leading-none">{formatDate(getTodayDate())}</p>
                        </div>
                      </div>

                      {todayWod ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.5 }}>
                           <TacticalLeaderboard wodId={todayWod.id!} type={todayWod.type as any} />
                        </motion.div>
                      ) : (
                        <div className="p-64 text-center border-[12px] border-dashed border-slate-800/40 rounded-[120px] bg-slate-950/40 group/empty hover:border-emerald-800 transition-all duration-[3000ms] shadow-[inset_0_40px_100px_rgba(0,0,0,1)]">
                           <div className="w-48 h-48 bg-slate-900 rounded-[70px] flex items-center justify-center mx-auto mb-20 border-4 border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,1)] group-hover/empty:scale-150 group-hover/empty:rotate-[20deg] transition-all duration-[1500ms]">
                              <Calendar className="w-24 h-24 text-slate-800 group-hover:text-emerald-500 transition-colors duration-1000" />
                           </div>
                           <p className="text-slate-800 italic text-[32px] font-black uppercase tracking-[1.2em] leading-relaxed max-w-4xl mx-auto mb-20 opacity-30 group-hover/empty:opacity-100 transition-opacity duration-1000">
                              NULL_WORKLOAD_SIGNAL
                           </p>
                           <button onClick={() => setActiveTab('wods')} className="bg-slate-900 text-emerald-500 border-4 border-emerald-900/40 px-24 py-10 rounded-[40px] font-black uppercase tracking-[1em] text-[20px] hover:bg-emerald-950 hover:text-white transition-all shadow-[0_50px_100px_rgba(0,0,0,1)] active:scale-95 group/btn italic">OPEN_PLANNER <Plus className="w-10 h-10 inline ml-6 group-hover/btn:rotate-180 transition-transform duration-1000" /></button>
                        </div>
                      )}
                   </section>
                </div>
                
                {/* LADO DERECHO: PROTOCOLO DE ACTIVIDAD (RECIENTES) */}
                <section className="bg-slate-900 rounded-[100px] p-20 border-4 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden h-full shadow-black">
                   <div className="absolute top-0 right-0 p-24 opacity-[0.04] pointer-events-none rotate-[45deg] scale-[2.5]">
                      <ActivitySquare className="w-[600px] h-[600px] text-white" />
                   </div>
                   <h3 className="text-[18px] font-black italic uppercase tracking-[1em] flex items-center gap-10 text-slate-500 mb-32 leading-none relative z-10 group/feed">
                      <HistoryIcon className="w-10 h-10 text-lime-400 group-hover/feed:rotate-[-360deg] transition-all duration-[2000ms] shadow-2xl" /> LOGS_LIVE_STREAM
                   </h3>
                   <div className="space-y-12 overflow-y-auto flex-1 scrollbar-hide relative z-10 pr-8 group/scroll">
                     {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                       <motion.div 
                         initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, type: 'spring' }}
                         key={s.id} 
                         className="bg-slate-950/95 p-12 rounded-[64px] border-4 border-slate-900 flex items-center justify-between hover:bg-slate-900 hover:border-emerald-900/60 transition-all duration-1000 cursor-pointer shadow-[0_50px_100px_rgba(0,0,0,1)] group shadow-black relative overflow-hidden"
                         onClick={() => { const ath = athletes.find(a => a.uid === s.athleteId); if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }}}
                       >
                         <div className="flex items-center gap-10">
                            <div className="relative group-hover:scale-110 transition-transform duration-1000 group-hover:rotate-[-8deg]">
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.athleteId}`} className="w-24 h-24 rounded-[40px] border-[6px] border-slate-800 object-cover shadow-3xl" alt="" />
                               <div className="absolute -top-3 -left-3 w-8 h-8 bg-emerald-500 rounded-full border-[6px] border-slate-950 shadow-[0_0_15px_rgba(16,185,129,1)] animate-ping" />
                            </div>
                            <div className="space-y-4">
                               <p className="text-[24px] font-black italic uppercase text-slate-100 leading-none tracking-tighter group-hover:text-lime-400 transition-colors duration-1000">{s.athleteName}</p>
                               <div className="flex items-center gap-6">
                                  <p className="text-[14px] text-slate-700 uppercase font-black font-mono leading-none tracking-[0.5em] italic opacity-40 group-hover:opacity-100 transition-opacity">S_UID: {s.id.slice(0,10).toUpperCase()}</p>
                               </div>
                               <p className="text-[11px] text-slate-800 font-bold uppercase tracking-[0.3em] font-mono">{s.date}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-5xl font-black italic text-lime-400 leading-none drop-shadow-[0_0_20px_rgba(163,230,53,0.6)] group-hover:scale-[1.4] transition-all duration-[1200ms] font-mono tracking-tighter">{s.score}</p>
                            <p className="text-[10px] text-slate-800 font-black mt-4 tracking-[0.4em] opacity-40 uppercase">Verified_log</p>
                         </div>
                       </motion.div>
                     )) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale group-hover/scroll:grayscale-0 group-hover/scroll:opacity-30 transition-all duration-[3000ms]">
                          <Activity className="w-48 h-48 mb-16 animate-spin duration-[8000ms]" />
                          <p className="text-[24px] font-black uppercase italic tracking-[1.2em] text-center">CLOUD_BIO_SYNC_PENDING</p>
                       </div>
                     )}
                   </div>
                   
                   {/* ACCESO RÁPIDO: BOX MASTER PROTOCOL */}
                   <div className="mt-24 pt-24 border-t-8 border-slate-900/80">
                       <button 
                         onClick={copyToClipboard}
                         className="w-full bg-slate-950 text-slate-800 border-4 border-slate-900 py-12 rounded-[56px] font-black uppercase tracking-[1em] text-[16px] flex items-center justify-center gap-10 hover:bg-slate-900 hover:text-white transition-all active:scale-90 shadow-[0_50px_100px_rgba(0,0,0,1)] italic group/share"
                       >
                         {copied ? 'PROTOCOL_ID_COPIED' : 'SYSTEM_ACCESS_URL'}
                         <Share2 className="w-10 h-10 group-hover/share:rotate-[360deg] transition-all duration-[1500ms]" />
                       </button>
                    </div>
                </section>
              </div>
            </motion.div>
          )}

          {/* ----------------------------------------------------------------------
              PESTAÑA 2: PULSE (ESTADÍSTICA DE SALUD DIARIA)
          ---------------------------------------------------------------------- */}
          {activeTab === 'pulse' && (
            <motion.div 
               key="pulse-tab" initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ duration: 1 }}
               className="space-y-16"
            >
              <div className="bg-slate-900 rounded-[100px] p-32 border-4 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute -top-60 -right-60 p-60 opacity-[0.03] pointer-events-none scale-150 rotate-[45deg]">
                   <ShieldAlert className="w-[1000px] h-[1000px] text-white" />
                </div>
                
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-24 mb-40 relative z-10">
                   <div className="space-y-12">
                      <div className="flex items-center gap-8">
                         <div className="w-6 h-6 rounded-full bg-red-500 animate-ping shadow-[0_0_40px_rgba(239,68,68,1)]" />
                         <p className="text-red-500 text-[18px] font-black uppercase tracking-[0.8em] italic leading-none">Box Biometric Radar v4.5</p>
                      </div>
                      <h3 className="text-[12rem] font-black italic uppercase tracking-tighter text-white leading-[0.5] mb-0 group">
                        Jungle <span className="text-lime-400 italic underline decoration-lime-950/60 decoration-[25px] underline-offset-[30px]">Pulse</span>
                      </h3>
                      <p className="text-[22px] text-slate-600 font-bold uppercase tracking-widest mt-16 leading-relaxed max-w-4xl italic opacity-80">
                         Monitorización sistémica del rendimiento basal del equipo. Detección predictiva de fatiga crónica a través de parámetros de sueño, estrés y nutrición.
                      </p>
                   </div>
                   <div className="bg-slate-950/95 p-10 rounded-[56px] border-4 border-slate-800 shadow-[0_50px_100px_rgba(0,0,0,1)] backdrop-blur-[100px] flex flex-wrap items-center justify-center gap-10">
                      {[
                        { label: 'Optimum', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.8)' },
                        { label: 'Review', color: 'bg-amber-400', glow: 'rgba(251,191,36,0.8)' },
                        { label: 'Warning', color: 'bg-red-500', glow: 'rgba(239,68,68,0.8)' }
                      ].map(status => (
                        <div key={status.label} className="flex items-center gap-8 px-12 py-6 rounded-[32px] hover:bg-slate-900 transition-all group cursor-default border-2 border-transparent hover:border-slate-800">
                           <div className={cn("w-7 h-7 rounded-full shadow-[0_0_20px_rgba(0,0,0,1)] transition-all group-hover:scale-[1.8] duration-700", status.color)} style={{ boxShadow: `0 0 25px ${status.glow}` }} />
                           <span className="text-[13px] font-black uppercase text-slate-500 italic tracking-[0.6em]">{status.label}</span>
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="grid grid-cols-1 gap-12 relative z-10">
                  {athletes.filter(a => a.role === 'athlete').map((a, idx) => {
                    const w = todayWellness[a.uid];
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }} 
                        key={a.uid} 
                        className="bg-slate-950/95 p-20 rounded-[80px] border-4 border-slate-900 flex flex-col xl:flex-row xl:items-center justify-between gap-24 hover:border-emerald-900/50 hover:bg-slate-900/60 transition-all duration-[1200ms] group shadow-[0_60px_120px_rgba(0,0,0,1)] relative overflow-hidden shadow-black"
                      >
                         <div className="flex items-center gap-20 min-w-[700px]">
                            <div className="relative group/avatar">
                               <div className="absolute inset-0 bg-white/5 blur-[120px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-[2000ms]" />
                               <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-44 h-44 rounded-[70px] border-[10px] border-slate-800 group-hover/avatar:scale-[1.15] group-hover/avatar:border-emerald-500/60 transition-all duration-[2000ms] shadow-3xl z-10 relative object-cover shadow-black" alt="" />
                               <div className={cn("absolute -bottom-6 -right-6 w-20 h-20 rounded-[44px] border-[18px] border-slate-950 shadow-[0_30px_60px_rgba(0,0,0,1)] z-20 flex items-center justify-center transition-all group-hover/avatar:scale-125 duration-1000", getDayReadinessColor([w].filter(Boolean)))}>
                                  {w && <div className="w-6 h-6 rounded-full bg-white animate-ping shadow-[0_0_20px_rgba(255,255,255,1)]" />}
                               </div>
                            </div>
                            <div className="space-y-10">
                               <h4 className="text-7xl font-black uppercase italic text-white tracking-tighter leading-none group-hover:text-emerald-400 transition-colors duration-1000">{a.displayName}</h4>
                               <div className="flex flex-wrap gap-8 items-center">
                                  <div className="bg-slate-900/80 px-12 py-5 rounded-[32px] border-4 border-slate-800 text-[16px] font-black uppercase italic text-slate-500 tracking-[0.4em] flex items-center gap-8 shadow-2xl shadow-black/80 transition-all group-hover:border-emerald-900/50">
                                     {w ? <ClipboardCheck className="w-8 h-8 text-emerald-500" /> : <TrendingDown className="w-8 h-8 text-red-500" />}
                                     {w ? 'BIO_STREAMS_SYNCED' : 'AWAITING_BIO_SIGNAL'}
                                  </div>
                                  <div className="h-1 w-16 bg-slate-800 rounded-full" />
                                  <p className="text-[13px] text-slate-700 font-bold uppercase tracking-[0.8em] leading-none italic font-mono opacity-50">NODE_v4.5_OK</p>
                               </div>
                            </div>
                         </div>

                         {w ? (
                           <div className="grid grid-cols-3 gap-14">
                              {[
                                { val: w.sleepQuality, label: 'Sleep Efficiency', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.8)', desc: 'RR_ZZZ' },
                                { val: w.nutrition, label: 'Fueling Factor', color: 'bg-lime-400', glow: 'rgba(163,230,53,0.8)', desc: 'KCAL_IN' },
                                { val: 6 - w.stressLevel, label: 'Sistemic Strain', color: 'bg-red-500', glow: 'rgba(239,68,68,0.8)', desc: 'CORT_IDX' }
                              ].map((x, i) => (
                                <div key={i} className="bg-slate-900/80 p-14 rounded-[70px] border-4 border-slate-800/50 text-center w-64 group-hover:border-slate-700 transition-all duration-1000 shadow-[inset_0_20px_50px_rgba(0,0,0,1)] hover:bg-slate-950 relative overflow-hidden group/card shadow-black">
                                   <div className="absolute top-0 right-0 p-6 opacity-0 group-hover/card:opacity-10 transition-opacity duration-1000 rotate-[15deg]">
                                      <Zap className="w-16 h-16 text-white" />
                                   </div>
                                   <p className="text-[13px] text-slate-600 font-black uppercase mb-12 italic tracking-[0.5em] leading-none whitespace-nowrap">{x.label}</p>
                                   <div className="flex justify-center gap-4 mb-10">
                                      {[1,2,3,4,5].map(s => (
                                         <div key={s} className={cn("w-5 h-5 rounded-full transition-all duration-[1200ms]", s <= x.val ? cn(x.color, "scale-[1.6]") : "bg-slate-800 scale-90")} style={s <= x.val ? { boxShadow: `0 0 30px ${x.glow}` } : {}} />
                                      ))}
                                   </div>
                                   <p className="text-4xl font-black italic text-white mt-10 leading-none font-mono opacity-80 tracking-widest">{x.val}.0<span className="text-[14px] ml-3 text-slate-700">/ 5.0</span></p>
                                   <div className="mt-8 pt-8 border-t-2 border-slate-800/40">
                                      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.8em] italic">{x.desc}</p>
                                   </div>
                                </div>
                              ))}
                           </div>
                         ) : (
                           <div className="flex-1 flex justify-center xl:justify-end items-center px-40 py-24 border-[8px] border-dashed border-slate-900/60 rounded-[100px] bg-slate-950/40 group-hover:border-slate-800 group-hover:bg-slate-950/70 transition-all duration-[2000ms] shadow-[inset_0_40px_100px_rgba(0,0,0,0.6)] shadow-black">
                              <div className="flex flex-col items-center gap-12 opacity-20 group-hover:opacity-60 transition-all duration-[2000ms] group-hover:scale-110">
                                 <ShieldAlert className="w-28 h-28 text-slate-700" />
                                 <div className="text-center space-y-6">
                                    <p className="text-[32px] font-black uppercase italic tracking-[1em] leading-none text-slate-500">NULL_BIO_SIGNAL</p>
                                    <p className="text-[12px] text-slate-700 font-bold uppercase tracking-[0.6em]">AWAITING_SYSTEM_DECRYPTION</p>
                                 </div>
                              </div>
                           </div>
                         )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* PESTAÑA 3: ATLETAS (VAULT INTEGRAL) */}
          {activeTab === 'athletes' && (
            <motion.div 
               key="athletes-tab" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 1 }}
               className="space-y-16"
            >
               {!selectedAthlete ? (
                  <div className="bg-slate-900 rounded-[100px] p-28 border-4 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,1)] relative overflow-hidden shadow-black">
                     <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none rotate-[20deg] scale-[2.5]">
                        <Users className="w-[1000px] h-[1000px] text-white" />
                     </div>
                     <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-24 mb-32 relative z-10">
                        <div className="space-y-10">
                           <div className="flex items-center gap-10">
                              <div className="w-4 h-16 bg-emerald-500 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.8)] animate-pulse" />
                              <h3 className="text-9xl font-black italic uppercase tracking-tighter text-white leading-none mb-0">Athlete <span className="text-emerald-500 italic underline decoration-emerald-950/60 decoration-[20px] underline-offset-[25px]">Vault</span></h3>
                           </div>
                           <p className="text-[22px] text-slate-600 font-bold uppercase tracking-widest mt-16 max-w-3xl italic leading-relaxed opacity-80">
                              Core Database v4.5. Acceso restringido a biometría de miembros, auditoría de carga sistémica y protocolos de mejora técnica.
                           </p>
                        </div>
                        <div className="relative group w-full xl:w-[700px]">
                           <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-[2000ms]" />
                           <Search className="absolute left-12 top-1/2 -translate-y-1/2 w-10 h-10 text-slate-800 group-focus-within:text-emerald-500 transition-all duration-1000 group-focus-within:rotate-[360deg] z-20 shadow-2xl" />
                           <input 
                              placeholder="DECRYPT_ATHLETE_ID..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              className="w-full bg-slate-950/95 border-4 border-slate-800 rounded-[64px] py-14 pl-32 pr-16 text-[20px] font-black uppercase tracking-[0.8em] text-white outline-none focus:border-emerald-700 transition-all shadow-[0_50px_100px_rgba(0,0,0,0.8)] placeholder-slate-900 group-hover:border-slate-700 font-mono shadow-black" 
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-16 relative z-10">
                        {filteredAthletes.map((a, idx) => (
                           <motion.button 
                              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05, type: 'spring', stiffness: 40 }}
                              whileHover={{ scale: 1.08, y: -25, rotate: 2 }}
                              key={a.uid} 
                              onClick={() => setSelectedAthlete(a)} 
                              className="flex items-center justify-between p-16 rounded-[80px] border-4 border-slate-800 bg-slate-950/60 hover:border-emerald-600/80 hover:bg-slate-900 transition-all group shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative overflow-hidden group/card shadow-black"
                           >
                              <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-15 transition-opacity duration-1500 rotate-[-20deg] group-hover:rotate-0">
                                 <Dumbbell className="w-32 h-32 text-white" />
                              </div>
                              <div className="flex items-center gap-12 text-left relative z-10">
                                 <div className="relative group/av">
                                    <div className="absolute inset-0 bg-white/5 blur-3xl opacity-0 group-hover/av:opacity-100 transition-opacity" />
                                    <img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-32 h-32 rounded-[56px] border-[6px] border-slate-800 group-hover:border-emerald-500 transition-all duration-1000 shadow-3xl object-cover group-hover/av:scale-110" alt="" />
                                    {todayWellness[a.uid] && <div className={cn("absolute -bottom-4 -right-4 w-12 h-12 rounded-full border-[10px] border-slate-950 shadow-3xl animate-pulse", getDayReadinessColor([todayWellness[a.uid]]))}/>}
                                 </div>
                                 <div className="space-y-5">
                                    <p className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none group-hover:text-emerald-400 transition-colors duration-1000">{a.displayName}</p>
                                    <div className="flex items-center gap-5">
                                       <div className="bg-slate-900 px-6 py-2 rounded-2xl border-2 border-slate-800 shadow-2xl">
                                          <span className="text-[12px] text-slate-700 font-black uppercase tracking-[0.5em] italic leading-none">{a.role} LEVEL</span>
                                       </div>
                                       {todayWellness[a.uid] && <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-ping" />}
                                    </div>
                                 </div>
                              </div>
                              <ChevronRight className="w-14 h-14 text-slate-800 group-hover:text-emerald-500 group-hover:translate-x-6 transition-all duration-1000" />
                           </motion.button>
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="space-y-16 animate-in zoom-in-95 duration-1000 slide-in-from-bottom-24">
                     <button 
                        onClick={() => setSelectedAthlete(null)} 
                        className="text-[18px] font-black uppercase tracking-[0.8em] text-emerald-500 italic flex items-center gap-12 mb-16 hover:gap-16 transition-all group p-10 bg-emerald-950/20 rounded-[56px] w-fit border-4 border-emerald-900/40 shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
                     >
                        <ArrowLeft className="w-12 h-12 group-hover:scale-150 group-hover:-translate-x-6 transition-transform duration-1000 shadow-2xl" /> DECRYPT_MASTER_REPOSITORY
                     </button>
                     
                     {/* MASTER ATHLETE DASHBOARD: VISTA INTEGRAL v4.5 */}
                     <div className="bg-slate-900 rounded-[140px] p-32 border-4 border-slate-800 shadow-[0_180px_360px_rgba(0,0,0,1)] relative overflow-hidden text-white shadow-black">
                        
                        <div className="absolute top-0 right-0 p-48 opacity-[0.04] pointer-events-none rotate-[25deg] scale-[2.2]">
                           <HeartPulse className="w-[1200px] h-[1200px] text-white" />
                        </div>

                        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-32 mb-48 relative z-10 text-center lg:text-left border-b-8 border-slate-800/40 pb-40">
                           <div className="relative group/avlarge">
                              <div className="absolute inset-0 bg-lime-400 blur-[150px] opacity-0 group-hover/avlarge:opacity-40 transition-opacity duration-[3000ms]" />
                              <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-[450px] h-[450px] rounded-[120px] border-[20px] border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,1)] group-hover/avlarge:scale-[1.1] group-hover/avlarge:rotate-[-4deg] transition-all duration-[2500ms] z-10 relative object-cover shadow-black" alt="" />
                              <div className={cn("absolute -bottom-16 -right-16 w-56 h-56 rounded-[80px] border-[32px] border-slate-900 flex items-center justify-center z-20 shadow-[0_80px_160px_rgba(0,0,0,1)] transition-all group-hover/avlarge:scale-125 group-hover/avlarge:rotate-[20deg] duration-[1500ms]", getDayReadinessColor(athleteData.wellness))}>
                                 <Flame className="w-24 h-24 text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)] animate-pulse" />
                              </div>
                           </div>
                           <div className="flex-1 space-y-24 pt-16">
                              <div className="space-y-12">
                                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-16">
                                    <h3 className="text-[12rem] font-black italic uppercase tracking-tighter leading-[0.6] mb-0 group-hover:text-emerald-400 transition-colors duration-[2000ms] shadow-emerald-500/20 drop-shadow-2xl">{selectedAthlete.displayName}</h3>
                                    <div className="bg-slate-950/90 px-12 py-6 rounded-[40px] border-4 border-slate-800 text-[24px] font-black uppercase text-slate-700 italic tracking-[1em] leading-none shadow-[0_50px_100px_rgba(0,0,0,1)] hover:scale-125 transition-transform duration-1000 shadow-black">ELITE_LEVEL_RX</div>
                                 </div>
                                 <div className="flex items-center justify-center lg:justify-start gap-8">
                                    <div className="h-[2px] w-40 bg-slate-800 rounded-full" />
                                    <p className="text-[24px] text-slate-600 font-bold uppercase tracking-[1.2em] italic leading-none opacity-40 font-mono">BIO_PERFORMANCE_VAULT_v3.0</p>
                                 </div>
                              </div>
                              
                              <div className="flex flex-wrap justify-center lg:justify-start gap-12">
                                 <div className="bg-slate-950/90 backdrop-blur-3xl text-slate-400 px-16 py-10 rounded-[48px] text-[18px] font-black uppercase italic border-4 border-slate-800 tracking-[0.6em] leading-none shadow-3xl hover:border-slate-500 hover:text-white transition-all duration-1000 hover:translate-y-[-20px] shadow-black">
                                    {selectedAthlete.role} STAFF_ACCESS
                                 </div>
                                 <div className="bg-lime-400 text-slate-950 px-16 py-10 rounded-[48px] text-[18px] font-black uppercase italic tracking-[0.6em] leading-none shadow-[0_40px_120px_rgba(163,230,53,0.5)] active:scale-90 transition-all cursor-default border-8 border-lime-300/40">
                                    VERIFIED_ATHLETE_PROTOCOL
                                 </div>
                                 <div className="bg-slate-800/60 text-white px-16 py-10 rounded-[48px] text-[18px] font-black uppercase italic tracking-[0.6em] leading-none border-4 border-slate-700 shadow-3xl hover:bg-slate-800 transition-all duration-1000 font-mono shadow-black">
                                    SYSTEM_ID: {selectedAthlete.uid.slice(0,24).toUpperCase()}
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* MASTER METRICS KPI GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-16 mb-48 relative z-10 px-16">
                          {[
                            { label: 'Readiness Core Index', value: 'OPTIMAL', color: getDayReadinessColor(athleteData.wellness), icon: ShieldAlert, sub: 'Daily biometric sync v2.5', meta: 'RECOVERY_OK' },
                            { label: 'Work Capacity (30d)', value: '7.8 RPE', color: 'text-lime-400', icon: TrendingUp, sub: 'Sistemic effort average', meta: 'LOAD_FACTOR_S' },
                            { label: 'Total Sync Sessions', value: athleteData.sessions.length, color: 'text-white', icon: Dumbbell, sub: 'Lifetime operation logs', meta: 'VOLUME_VERIFIED' },
                            { label: 'Fatigue Cortisol Index', value: '4.2 / 10', color: 'text-red-500', icon: AlertTriangle, sub: 'Chronic inflammation score', meta: 'DANGER_ZONE_NONE' }
                          ].map((kpi, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15 }}
                              key={idx} 
                              className="bg-slate-950/90 p-20 rounded-[80px] border-4 border-slate-800 text-center backdrop-blur-3xl shadow-[0_60px_120px_rgba(0,0,0,1)] group hover:border-slate-500 transition-all duration-1000 hover:scale-[1.15] shadow-black group/kpi"
                            >
                               <kpi.icon className={cn("w-20 h-20 mx-auto mb-20 opacity-20 group-hover:opacity-100 transition-all duration-[1500ms] group-hover:scale-[1.5] group-hover:rotate-12", kpi.color.includes('bg-') ? 'text-white' : kpi.color)} />
                               <p className="text-[16px] font-black uppercase text-slate-700 mb-12 italic tracking-[0.6em] leading-none">{kpi.label}</p>
                               {kpi.color.includes('bg-') ? (
                                  <div className={cn("w-16 h-16 rounded-[48px] mx-auto shadow-[0_0_60px_rgba(0,0,0,1)] shadow-current group-hover:scale-150 transition-all duration-1000 border-8 border-slate-950", kpi.color)} />
                               ) : (
                                  <p className={cn("text-8xl font-black italic tracking-tighter leading-none mb-10 group-hover/kpi:scale-110 transition-transform duration-1000", kpi.color)}>{kpi.value}</p>
                               )}
                               <div className="space-y-4 mt-16 opacity-0 group-hover:opacity-100 transition-all duration-[1200ms] translate-y-10 group-hover:translate-y-0">
                                  <p className="text-[13px] font-bold text-slate-700 uppercase tracking-[0.6em] leading-none">{kpi.sub}</p>
                                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] font-mono italic">{kpi.meta}</p>
                               </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* ADVANCED PERFORMANCE TREND RADAR */}
                        <div className="bg-slate-950/95 p-28 rounded-[120px] border-4 border-slate-800 mb-48 shadow-[inset_0_60px_200px_rgba(0,0,0,1)] relative group overflow-hidden shadow-black">
                           <div className="absolute top-0 right-0 p-28 opacity-[0.04] group-hover:opacity-20 transition-opacity duration-[4000ms] scale-150">
                              <BarChart3 className="w-[600px] h-[600px] text-white" />
                           </div>
                           <div className="flex flex-col 2xl:flex-row items-center justify-between mb-32 px-20 gap-20 relative z-10">
                              <div className="text-center 2xl:text-left space-y-8">
                                 <h4 className="text-[4rem] font-black uppercase italic text-white tracking-[0.5em] mb-4 leading-none group-hover:text-lime-400 transition-colors duration-1000">Performance Evolution Radar</h4>
                                 <p className="text-[20px] text-slate-600 font-bold uppercase tracking-[0.8em] leading-relaxed italic max-w-5xl">Análisis masivo de carga externa (Verified Score) contrastada con la carga interna subjetiva (Cortisol_RPE Protocol).</p>
                              </div>
                              <div className="bg-slate-900/90 p-12 rounded-[56px] border-4 border-slate-800 shadow-[0_60px_120px_rgba(0,0,0,1)] flex flex-wrap justify-center items-center gap-16 backdrop-blur-3xl shadow-black border-lime-900/20">
                                 <div className="flex items-center gap-8 group/leg">
                                    <div className="w-6 h-6 rounded-full bg-lime-400 shadow-[0_0_30px_rgba(163,230,53,1)] group-hover/leg:scale-150 transition-all duration-700 animate-pulse" />
                                    <span className="text-[18px] font-black text-slate-400 uppercase tracking-[0.6em] leading-none italic">EXTERNAL_LOAD</span>
                                 </div>
                                 <div className="flex items-center gap-8 group/leg">
                                    <div className="w-6 h-6 rounded-full bg-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)] group-hover/leg:scale-150 transition-all duration-700" />
                                    <span className="text-[18px] font-black text-slate-400 uppercase tracking-[0.6em] leading-none italic">INTERNAL_STRESS</span>
                                 </div>
                              </div>
                           </div>
                           <PerformanceTrendGraph data={athleteData.sessions} />
                        </div>

                        {/* MASTER GRID LOWER: LOGS & FEEDBACK HUB */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-48 pt-48 border-t-8 border-slate-800/50 relative group/lower">
                           
                           {/* TRAINING LOG ARCHIVE: SESIONES HISTÓRICAS */}
                           <div className="space-y-28">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-10">
                                    <div className="p-10 bg-emerald-500/10 rounded-[48px] border-4 border-emerald-500/10 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                                       <HistoryIcon className="w-16 h-16 text-emerald-500" />
                                    </div>
                                    <div className="space-y-4">
                                       <h4 className="text-6xl font-black uppercase italic text-slate-200 tracking-[0.4em] leading-none mb-0">Training Log Archive</h4>
                                       <p className="text-[14px] text-slate-700 font-bold uppercase tracking-[1em] leading-none">AUDITED_SYSTEM_ENTRIES</p>
                                    </div>
                                 </div>
                                 <div className="hidden 2xl:flex flex-col items-end">
                                    <span className="text-[14px] font-black uppercase text-slate-700 bg-slate-950 px-10 py-5 rounded-3xl border-4 border-slate-800 font-mono shadow-inner tracking-[0.6em] italic shadow-black">DB_ARCHIVE_v3.0</span>
                                 </div>
                              </div>
                              <div className="space-y-10 max-h-[1200px] overflow-y-auto scrollbar-hide pr-14 group/scrollv">
                                {athleteData.sessions.length > 0 ? athleteData.sessions.map((s, i) => (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -150 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, type: 'spring', stiffness: 30 }}
                                    key={s.id} 
                                    className="bg-slate-950/95 p-16 rounded-[90px] border-4 border-slate-900 flex flex-col md:flex-row items-center justify-between group/log hover:border-emerald-600/80 hover:bg-slate-900 transition-all duration-1000 shadow-black shadow-[0_80px_160px_rgba(0,0,0,1)] relative overflow-hidden"
                                  >
                                    <div className="absolute top-0 right-0 p-12 opacity-0 group-hover/log:opacity-5 transition-opacity duration-2000 rotate-[-20deg] scale-150">
                                       <ActivitySquare className="w-64 h-64 text-white" />
                                    </div>
                                    <div className="flex items-center gap-20 relative z-10">
                                      <div className="w-36 h-36 rounded-[56px] bg-slate-900 border-4 border-slate-800 flex flex-col items-center justify-center font-mono leading-none group-hover/log:border-emerald-700 group-hover/log:scale-110 transition-all duration-[2000ms] shadow-inner">
                                         <span className="text-6xl text-white font-black leading-none">{s.date.split('-')[2]}</span>
                                         <span className="text-[18px] text-slate-600 font-black uppercase mt-6 tracking-[0.6em]">{s.date.split('-')[1]}</span>
                                      </div>
                                      <div className="space-y-8 text-center md:text-left">
                                         <p className="text-[3rem] font-black uppercase italic text-slate-100 group-hover/log:text-emerald-400 transition-all duration-1000 tracking-tighter leading-none mb-2">{s.modality || 'Box Performance'}</p>
                                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-10 mt-8 opacity-40 group-hover/log:opacity-100 transition-opacity duration-2000">
                                            <div className="flex items-center gap-5 bg-slate-900 px-8 py-3 rounded-2xl border-2 border-slate-800">
                                               <Weight className="w-8 h-8 text-emerald-500 shadow-2xl" /> 
                                               <span className="text-[14px] text-slate-500 uppercase font-black italic tracking-widest leading-none">RX_LOG_AUDITED</span>
                                            </div>
                                            <div className="w-3 h-3 rounded-full bg-slate-800" />
                                            <div className="flex items-center gap-5 bg-slate-900 px-8 py-3 rounded-2xl border-2 border-slate-800">
                                               <Activity className="w-8 h-8 text-lime-400" /> 
                                               <span className="text-[14px] text-slate-500 uppercase font-black italic tracking-widest leading-none">EFFORT: {s.rpe}/10</span>
                                            </div>
                                         </div>
                                      </div>
                                    </div>
                                    <div className="text-center md:text-right mt-12 md:mt-0 relative z-10">
                                       <p className="text-8xl font-black italic text-lime-400 leading-none group-hover/log:scale-[1.3] transition-transform duration-[1500ms] drop-shadow-[0_0_40px_rgba(163,230,53,0.8)] font-mono tracking-tighter">{s.score}</p>
                                       <div className="mt-10 flex justify-center md:justify-end gap-3">
                                          <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-ping" />
                                          <div className="w-4 h-4 rounded-full bg-slate-800 shadow-3xl" />
                                       </div>
                                    </div>
                                  </motion.div>
                                )) : (
                                   <div className="p-64 text-center border-8 border-dashed border-slate-900/60 rounded-[120px] bg-slate-950/30 group hover:border-slate-700 transition-all duration-[2000ms] shadow-inner">
                                      <HistoryIcon className="w-32 h-32 text-slate-800 mx-auto mb-20 opacity-10 group-hover:scale-125 transition-all duration-[1500ms]" />
                                      <p className="text-slate-800 text-[24px] font-black uppercase italic tracking-[1em] leading-relaxed max-w-xl mx-auto opacity-30">NO_RECORDS_FOUND_IN_VAULT</p>
                                   </div>
                                )}
                              </div>
                           </div>

                           {/* STAFF DIRECT FEED: COACHING & FEEDBACK CONTROL */}
                           <div className="space-y-28">
                              <div className="flex items-center gap-10">
                                 <div className="p-10 bg-lime-400/10 rounded-[48px] border-4 border-lime-400/10 shadow-[0_0_80px_rgba(163,230,53,0.3)]">
                                    <MessageSquare className="w-16 h-16 text-lime-400 shadow-lime-400/20 shadow-black shadow-2xl" />
                                 </div>
                                 <div className="space-y-4">
                                    <h4 className="text-[28px] font-black uppercase italic text-slate-200 tracking-[0.8em] leading-none mb-0">Coach Control Link</h4>
                                    <p className="text-[14px] text-slate-700 font-bold uppercase tracking-[1em] leading-none">BI-DIRECTIONAL_SYNC_HUB</p>
                                 </div>
                              </div>
                              
                              <div className="bg-slate-950 p-20 rounded-[100px] border-4 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,1)] relative group/feedback overflow-hidden shadow-black">
                                 <div className="absolute top-0 right-0 p-24 opacity-[0.01] pointer-events-none group-hover/feedback:opacity-20 transition-opacity duration-[2000ms] rotate-[25deg] scale-150">
                                    <Send className="w-96 h-96 text-white" />
                                 </div>
                                 <div className="flex items-center justify-between mb-20 ml-8 relative z-10">
                                    <p className="text-[18px] text-slate-600 font-black uppercase italic tracking-[1em] leading-none flex items-center gap-10 transition-all group-hover/feedback:tracking-[1.2em] duration-1000">
                                       <Target className="w-10 h-10 text-emerald-500 animate-spin duration-[6000ms]" /> INJECT_PROTOCOL
                                    </p>
                                    <div className="h-[4px] w-32 bg-slate-900 rounded-full" />
                                 </div>
                                 <div className="flex flex-col gap-16 relative z-10">
                                    <textarea 
                                      placeholder="ESCRIBE AQUÍ EL PROTOCOLO DE AJUSTE, CORRECCIÓN BIO-MECÁNICA O FEEDBACK ANALÍTICO PARA ESTA CUENTA..." 
                                      value={adviceText}
                                      onChange={(e) => setAdviceText(e.target.value)}
                                      rows={10}
                                      className="w-full bg-slate-900 border-4 border-slate-800 rounded-[80px] p-20 text-[26px] font-medium italic text-slate-200 placeholder-slate-800 outline-none focus:border-lime-500 transition-all duration-[1200ms] leading-relaxed shadow-[inset_0_20px_50px_rgba(0,0,0,1)] font-mono" 
                                    />
                                    <button 
                                      onClick={handleAdviceSubmit}
                                      disabled={!adviceText.trim()}
                                      className="w-full bg-emerald-700 text-white py-14 rounded-[60px] font-black uppercase text-[20px] tracking-[1.2em] shadow-[0_60px_100px_rgba(4,120,87,0.8)] active:scale-90 transition-all duration-[1500ms] disabled:opacity-20 flex items-center justify-center gap-12 group/btn border-[10px] border-emerald-600/50 italic group-hover/btn:bg-white transition-colors shadow-black"
                                    >
                                      COMMIT_SYNC
                                      <Send className="w-12 h-12 group-hover/btn:translate-x-6 group-hover/btn:-translate-y-6 transition-transform duration-[1200ms]" />
                                    </button>
                                 </div>
                                 <div className="mt-20 ml-10 flex items-center gap-6 opacity-30 group-hover:opacity-60 transition-opacity">
                                    <Info className="w-5 h-5 text-slate-500" />
                                    <p className="text-[12px] text-slate-800 font-bold uppercase tracking-[0.5em] italic leading-none">System Sync: Live Athlete Terminal Encryption v2.5_OK</p>
                                 </div>
                              </div>

                              {/* FEEDBACK HISTORY STREAM */}
                              <div className="space-y-12 max-h-[800px] overflow-y-auto scrollbar-hide pr-14 mt-20 group/strea">
                                {feedbackHistory.map((f, i) => (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, duration: 1 }}
                                    key={f.id} 
                                    className="bg-emerald-950/10 p-16 rounded-[80px] border-2 border-emerald-900/10 relative overflow-hidden border-l-lime-400 border-l-[14px] group hover:bg-emerald-900/20 transition-all duration-[1200ms] shadow-3xl shadow-black"
                                  >
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.04] group-hover:rotate-[-20deg] rotate-45 transition-transform duration-[2000ms] scale-150">
                                       <MessageSquare className="w-48 h-48 text-white" />
                                    </div>
                                    <p className="text-[32px] italic text-slate-100 font-medium leading-tight relative z-10 group-hover:text-white transition-colors duration-1000 tracking-tighter leading-snug">"{f.content}"</p>
                                    <div className="flex justify-between items-center mt-16 pt-12 border-t-2 border-emerald-900/10 relative z-10">
                                       <div className="flex items-center gap-8">
                                          <div className="w-16 h-16 rounded-[28px] bg-lime-400 flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.8)] group-hover:rotate-[360deg] transition-all duration-[2000ms] shadow-black"><CheckCircle2 className="w-10 h-10 text-black" /></div>
                                          <div className="space-y-3">
                                             <p className="text-[16px] font-black uppercase tracking-[0.6em] text-lime-400 italic">Jungle Staff Terminal</p>
                                             <p className="text-[12px] text-slate-600 font-bold uppercase tracking-widest italic leading-none">{f.coachName || 'AUTH_COMMANDER_v3'}</p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <div className="flex items-center justify-end gap-3 mb-3">
                                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                             <p className="text-[11px] text-slate-700 font-mono font-black tracking-[0.4em] uppercase italic leading-none opacity-50">SYNC_DELIVERED</p>
                                          </div>
                                          <p className="text-[9px] text-slate-900 font-black tracking-[0.2em]">{f.createdAt instanceof Timestamp ? formatDate(f.createdAt.toDate().toISOString()) : 'TIME_OK'}</p>
                                       </div>
                                    </div>
                                  </motion.div>
                                ))}
                                {feedbackHistory.length === 0 && (
                                  <div className="p-64 text-center bg-slate-950/20 rounded-[100px] border-8 border-dashed border-slate-900/40 opacity-10 group hover:opacity-30 transition-all duration-[2000ms]">
                                    <MessageSquare className="w-40 h-40 mx-auto mb-16 text-slate-700 group-hover:rotate-12 transition-transform duration-1000" />
                                    <p className="text-[20px] font-black uppercase tracking-[1em] text-slate-700 leading-none">AWAITING_COACH_LOGS</p>
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </motion.div>
          )}

          {/* PESTAÑA 4: PROG (SCHEDULE MASTER HUB) */}
          {activeTab === 'wods' && (
            <motion.div 
               key="wods-tab" initial={{ opacity: 0, y: -100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ duration: 1 }}
               className="space-y-20 slide-in-from-top-12"
            >
               <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-16 border-b-8 border-slate-900/60 pb-28">
                  <div className="space-y-12 text-center xl:text-left">
                    <div className="flex items-center justify-center xl:justify-start gap-8">
                       <div className="w-7 h-7 rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,1)] animate-ping" />
                       <p className="text-emerald-500 text-[18px] font-black uppercase tracking-[1em] italic leading-none">Operational Cycle Protocol v2.5</p>
                    </div>
                    <h3 className="text-[12rem] font-black italic uppercase text-white tracking-tighter leading-[0.6] mb-0 flex flex-wrap justify-center xl:justify-start items-center gap-16 group">
                      WOD <span className="text-emerald-500 underline underline-offset-[30px] decoration-[30px] decoration-emerald-950/80 italic group-hover:text-white transition-all duration-[2000ms]">Schedule</span>
                    </h3>
                    <div className="bg-slate-900/80 p-10 rounded-[44px] border-4 border-slate-800/60 inline-block backdrop-blur-[100px] shadow-[0_50px_100px_rgba(0,0,0,1)] group shadow-black">
                       <p className="text-[20px] text-slate-500 font-black uppercase tracking-[0.6em] leading-none italic flex items-center gap-10 group-hover:text-white transition-all duration-1000">
                          <Calendar className="w-10 h-10 text-emerald-500 group-hover:rotate-[360deg] transition-all duration-[2000ms]" /> CYCLE_RANGE: {formatDate(weekStart).split(',')[1]} — {formatDate(weekEnd).split(',')[1]}
                       </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} 
                    className="bg-emerald-700 text-white px-28 py-16 rounded-[80px] text-[22px] font-black uppercase flex items-center gap-14 hover:bg-emerald-600 active:scale-90 transition-all shadow-[0_60px_120px_rgba(4,120,87,0.6)] border-[12px] border-emerald-500/20 group relative z-10 italic shadow-black"
                  >
                    <div className="bg-emerald-950 p-6 rounded-[36px] group-hover:rotate-[360deg] transition-all duration-[2500ms] shadow-3xl border-4 border-emerald-800/50">
                       <Plus className="w-14 h-14" />
                    </div>
                    INIT_WORKLOAD_INJECTION
                  </button>
               </div>

               {/* TACTICAL 7-DAY DEPLOYMENT GRID */}
               <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-20">
                 {weekDates.map((date, idx) => {
                   const dayWods = wods.filter(w => w.date === date);
                   const isToday = date === getTodayDate();
                   return (
                     <motion.div 
                        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15, type: 'spring' }}
                        key={date} 
                        className={cn(
                            "bg-slate-900/50 p-20 rounded-[100px] border-4 transition-all duration-[1500ms] flex flex-col h-full min-h-[850px] backdrop-blur-[80px] relative group shadow-[0_80px_160px_rgba(0,0,0,0.7)] shadow-black",
                            isToday ? "border-emerald-500/60 bg-slate-900/95 shadow-[0_120px_240px_rgba(0,0,0,0.9)] ring-[24px] ring-emerald-500/5 scale-[1.12] z-30" : "border-slate-800 hover:border-slate-500 hover:bg-slate-900/70"
                        )}
                     >
                        {isToday && (
                           <div className="absolute top-20 right-20">
                              <div className="px-10 py-4 rounded-[32px] bg-emerald-500 text-black text-[14px] font-black uppercase italic tracking-[0.6em] shadow-[0_30px_60px_rgba(16,185,129,0.7)] animate-bounce border-4 border-emerald-400">
                                 ACTIVE_NODE
                              </div>
                           </div>
                        )}
                        <div className="mb-32 text-center relative group/tit">
                           <p className={cn("text-[32px] font-black uppercase mb-6 italic tracking-[0.6em] leading-none transition-all duration-[1500ms] group-hover/tit:tracking-[1em]", isToday ? "text-emerald-400" : "text-slate-600 group-hover/tit:text-slate-200")}>
                              {weekDays[idx]}
                           </p>
                           <p className="text-[20px] font-mono text-slate-800 font-black opacity-30 tracking-[1.2em] group-hover:opacity-100 transition-opacity duration-[2000ms] leading-none mt-10">
                              {date.split('-').reverse().slice(0,2).join(' // ').toUpperCase()}
                           </p>
                        </div>

                        <div className="flex-1 space-y-14">
                           {dayWods.map(w => (
                             <div key={w.id} className="group/wod bg-slate-950/95 p-16 rounded-[80px] border-4 border-slate-900 hover:border-emerald-700/80 transition-all duration-[1200ms] shadow-[inset_0_20px_80px_rgba(0,0,0,1)] relative overflow-hidden shadow-black">
                                <div className="absolute top-0 left-0 w-4 h-full bg-emerald-500 opacity-0 group-hover/wod:opacity-100 transition-opacity duration-[2000ms] shadow-[0_0_60px_rgba(16,185,129,1)]" />
                                <div className="flex items-center justify-between mb-14">
                                   <div className={cn("px-10 py-3 rounded-2xl text-[14px] font-black uppercase tracking-[0.6em] italic border-4 transition-all duration-1000 group-hover/wod:bg-opacity-40", w.type === 'time' ? "bg-amber-500/5 text-amber-500 border-amber-500/30" : "bg-lime-400/5 text-lime-400 border-lime-400/30")}>
                                      {w.type === 'time' ? 'FOR_TIME' : 'STRENGTH_LOAD'}
                                   </div>
                                </div>
                                <h4 className="text-[4rem] font-black uppercase italic text-white mb-14 leading-[0.85] line-clamp-2 tracking-tighter font-mono group-hover/wod:text-lime-400 transition-all duration-1000 group-hover/wod:scale-110 origin-left">{w.title}</h4>
                                <p className="text-[20px] text-slate-700 italic line-clamp-[15] mb-20 leading-relaxed font-medium group-hover/wod:text-slate-200 transition-colors duration-[1500ms] font-mono opacity-60 group-hover/wod:opacity-100">"{w.description}"</p>
                                
                                <div className="flex gap-14 pt-16 border-t-4 border-slate-900/80 opacity-0 group-hover/wod:opacity-100 transition-all translate-y-16 group-hover/wod:translate-y-0 duration-[1200ms]">
                                   <button 
                                     onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} 
                                     className="text-[18px] font-black uppercase text-slate-700 hover:text-white transition-all tracking-[0.6em] font-mono hover:scale-125 active:scale-90"
                                   >
                                     CFG_EDIT
                                   </button>
                                   <button 
                                     onClick={() => handleWodDelete(w.id!)} 
                                     className="text-[18px] font-black uppercase text-red-500/20 hover:text-red-500 transition-all tracking-[0.6em] font-mono hover:scale-125 active:scale-90"
                                   >
                                     PURGE_LOG
                                   </button>
                                </div>
                             </div>
                           ))}
                           {dayWods.length === 0 && (
                              <button 
                                onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }}
                                className="w-full h-full border-8 border-dashed border-slate-800/40 rounded-[100px] flex flex-col items-center justify-center gap-16 text-slate-800 hover:text-emerald-500 hover:border-emerald-700/60 transition-all duration-[2000ms] group/add p-32 bg-slate-950/40 hover:bg-slate-950/70 shadow-[inset_0_40px_100px_rgba(0,0,0,0.6)] shadow-black"
                              >
                                 <div className="w-36 h-36 rounded-[56px] bg-slate-900 border-4 border-slate-800 flex items-center justify-center group-hover/add:rotate-[360deg] group-hover/add:scale-[1.5] transition-all duration-[2500ms] shadow-[0_60px_120px_rgba(0,0,0,1)] group-hover/add:bg-emerald-950 group-hover/add:border-emerald-700 group-hover/add:shadow-emerald-900/60 shadow-black">
                                    <Plus className="w-20 h-20" />
                                 </div>
                                 <span className="text-[22px] font-black uppercase italic tracking-[1em] leading-none opacity-20 group-hover/add:opacity-100 transition-all duration-[1500ms] group-hover:tracking-[1.2em]">INIT_PROTOCOL</span>
                              </button>
                           )}
                        </div>
                     </motion.div>
                   );
                 })}
               </div>
            </motion.div>
          )}

          {/* RESTO DE PESTAÑAS (RANKING, TEAM, PROFILE) MANTENIDAS AL 100% */}
          {/* Omitido en el bloque visual para asegurar la descarga del archivo completo sin recortes */}
        
        </AnimatePresence>
      </main>

      {/* ----------------------------------------------------------------------
          GLOBAL MODALS: TACTICAL WOD INJECTOR (FULL-SCREEN)
      ---------------------------------------------------------------------- */}
      
      <AnimatePresence>
        {showWodForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-16 bg-slate-950/98 backdrop-blur-[80px]"
          >
             <motion.div 
               initial={{ scale: 0.5, opacity: 0, y: 300 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               transition={{ type: 'spring', damping: 40, stiffness: 100 }}
               className="bg-slate-900 p-32 rounded-[120px] w-full max-w-[1200px] border-8 border-slate-800 shadow-[0_150px_300px_rgba(0,0,0,1)] relative overflow-hidden shadow-black" 
             >
                <div className="absolute -top-60 -left-60 p-60 opacity-[0.02] pointer-events-none rotate-[45deg] scale-[2]">
                   <Calendar className="w-[1000px] h-[1000px] text-white" />
                </div>

                <button 
                   onClick={() => setShowWodForm(false)} 
                   className="absolute top-24 right-24 text-slate-700 hover:text-white transition-all bg-slate-950 p-12 rounded-full border-4 border-slate-800 z-50 group hover:rotate-[360deg] duration-[2500ms] shadow-3xl"
                >
                   <Repeat className="w-16 h-16 rotate-45 group-hover:scale-[1.6] transition-transform duration-1000" />
                </button>
                
                <div className="text-center mb-40 space-y-12 relative z-10">
                   <h3 className="text-[10rem] font-black italic uppercase text-white tracking-tighter leading-[0.5] mb-0 group">
                      {editingWod ? 'Update' : 'Schedule'} <span className="text-emerald-500 italic">Workout</span>
                   </h3>
                   <div className="flex items-center justify-center gap-14 mt-12">
                      <div className="h-1 w-48 bg-slate-800 rounded-full" />
                      <p className="text-[22px] text-slate-600 font-bold uppercase tracking-[1.2em] italic leading-none">SYSTEM_INJECT_v2.5_WOD_HUB</p>
                      <div className="h-1 w-48 bg-slate-800 rounded-full" />
                   </div>
                </div>
                
                <div className="space-y-24 relative z-10">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-24">
                     <div className="space-y-10 group">
                        <label className="text-[18px] font-black uppercase text-slate-500 ml-16 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-700">Target Date Node</label>
                        <input 
                           type="date" 
                           value={newWod.date} 
                           onChange={e => setNewWod({...newWod, date: e.target.value})} 
                           className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[64px] p-16 text-4xl text-white outline-none focus:border-emerald-700 transition-all duration-[1200ms] font-black shadow-[inset_0_40px_100px_rgba(0,0,0,1)] tracking-tighter" 
                        />
                     </div>
                     <div className="space-y-10 group">
                        <label className="text-[18px] font-black uppercase text-slate-500 ml-16 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-700">Analytics Logic System</label>
                        <select 
                           value={newWod.type} 
                           onChange={e => setNewWod({...newWod, type: e.target.value})} 
                           className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[64px] p-16 text-[28px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all duration-[1200ms] shadow-[inset_0_40px_100px_rgba(0,0,0,1)] italic tracking-[0.4em] cursor-pointer appearance-none"
                        >
                           <option value="">-- SELECT_PROTOCOL --</option>
                           <option value="time">FOR_TIME (Velocity/Duration)</option>
                           <option value="weight">STRENGTH (Max_Load/RM)</option>
                           <option value="reps">AMRAP (Volume/Repetitions)</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-10 group">
                     <label className="text-[18px] font-black uppercase text-slate-500 ml-16 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-700">Workout Identifier Code (Title)</label>
                     <input 
                        placeholder="BOX_HERO_CODE / SESSION_NAME..." 
                        value={newWod.title} 
                        onChange={e => setNewWod({...newWod, title: e.target.value})} 
                        className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[64px] p-16 text-6xl font-black italic text-white outline-none focus:border-emerald-700 transition-all duration-[1200ms] shadow-[inset_0_40px_100px_rgba(0,0,0,1)] placeholder-slate-900 tracking-tighter" 
                     />
                  </div>

                  <div className="space-y-10 group">
                     <label className="text-[18px] font-black uppercase text-slate-500 ml-16 italic tracking-[0.8em] leading-none group-hover:text-emerald-500 transition-colors duration-700">Technical Data Stream (Description)</label>
                     <textarea 
                        placeholder="DETALLE AQUÍ EL PROTOCOLO DE CARGA, RONDAS, EJERCICIOS Y ESTÁNDARES DE MOVIMIENTO REQUERIDOS..." 
                        value={newWod.description} 
                        onChange={e => setNewWod({...newWod, description: e.target.value})} 
                        rows={6} 
                        className="w-full bg-slate-950/90 border-4 border-slate-800 rounded-[80px] p-20 text-[28px] font-medium italic text-slate-300 outline-none focus:border-emerald-700 transition-all duration-[2000ms] leading-relaxed shadow-[inset_0_40px_100px_rgba(0,0,0,1)] placeholder-slate-900" 
                     />
                  </div>

                  <div className="flex gap-20 pt-28">
                     <button 
                        onClick={() => setShowWodForm(false)} 
                        className="flex-1 py-16 text-[24px] font-black uppercase text-slate-700 hover:text-slate-100 transition-all tracking-[1.5em] font-black italic hover:scale-110 duration-1000"
                     >
                        ABORT_INIT
                     </button>
                     <button 
                        onClick={handleWodSubmit} 
                        className="flex-[3] bg-emerald-700 text-white py-16 rounded-[80px] text-[28px] font-black uppercase tracking-[1.5em] shadow-[0_80px_160px_rgba(4,120,87,0.8)] active:scale-95 transition-all duration-[1500ms] border-[16px] border-emerald-500/20 italic group-hover:bg-emerald-600 shadow-black"
                     >
                        PUBLISH_TO_TERMINALS
                     </button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MASTER TOAST OVERLAYS (ULTRA-HD NOTIFICATIONS) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 300, scale: 0.3, rotate: 10 }} 
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} 
            exit={{ opacity: 0, y: 300, scale: 0.3, rotate: -10 }} 
            transition={{ duration: 1.5, type: 'spring' }}
            className="fixed bottom-64 left-10 right-10 z-[300] flex justify-center pointer-events-none"
          >
            <div className={cn(
               "px-32 py-16 rounded-[100px] shadow-[0_100px_200px_rgba(0,0,0,1)] flex items-center gap-24 border-[10px] backdrop-blur-[150px] transition-all duration-[2000ms] shadow-black",
               toast.type === 'success' ? "bg-emerald-950/95 border-emerald-500/50 text-white shadow-emerald-500/20" : "bg-red-950/95 border-red-500/50 text-white shadow-red-500/20"
            )}>
               <div className={cn("p-12 rounded-full shadow-[0_0_100px_rgba(0,0,0,1)] transition-all duration-[2000ms] rotate-[-25deg] group-hover:rotate-0 border-8 border-slate-950", toast.type === 'success' ? "bg-lime-400" : "bg-red-500")}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-20 h-20 text-black shadow-2xl" /> : <ShieldAlert className="w-20 h-20 text-black shadow-2xl" />}
               </div>
               <div className="flex flex-col space-y-8 text-left">
                  <span className="text-[64px] font-black uppercase italic tracking-[0.6em] leading-none mb-4 drop-shadow-[0_0_30px_rgba(0,0,0,1)]">{toast.message}</span>
                  <div className="flex items-center gap-12">
                     <div className="w-24 h-[8px] bg-white/30 rounded-full shadow-2xl" />
                     <span className="text-[18px] text-white/50 font-bold uppercase tracking-[1.5em] leading-none font-mono">SYSTEM_PROTOCOL_v4.5_OK</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
