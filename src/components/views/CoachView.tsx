import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/src/components/auth/AuthProvider';
import { db } from '@/src/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  serverTimestamp, getDocs, doc, setDoc, limit, deleteDoc, 
  Timestamp, updateDoc 
} from 'firebase/firestore';
import { UserProfile, WellnessEntry, Wod, WorkoutSession, CoachFeedback } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Plus, MessageSquare, Send, ChevronRight, Search, 
  Activity, History as HistoryIcon, Clock, Weight, Repeat, FileText, 
  Trophy, Medal, LayoutDashboard, Share2, ArrowUpRight, TrendingUp, 
  Dumbbell, AlertTriangle, ShieldAlert, Trash2, CheckCircle2, Zap, 
  TrendingDown, UserCircle, Settings, Target, Flame, HeartPulse, 
  BarChart3, ChevronDown, Info, ArrowLeft, Award, ClipboardCheck, 
  MoreVertical, Filter, ZapOff, ActivitySquare, ChevronLeft, Briefcase, Monitor
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange, parseScoreToNumber } from '@/src/lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/**
 * COMPONENTE: Gráfico de Evolución Analítica
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
      }));
  }, [data]);

  if (chartData.length < 2) return (
    <div className="h-80 flex flex-col items-center justify-center bg-slate-950/40 rounded-[60px] border-4 border-dashed border-slate-900/60 p-16 group hover:border-emerald-600/30 transition-all duration-1000">
      <BarChart3 className="w-16 h-16 text-slate-800 animate-pulse group-hover:text-lime-500 transition-colors" />
      <p className="text-[12px] font-black uppercase text-slate-700 tracking-[0.5em] text-center italic mt-6">DATOS INSUFICIENTES PARA TRAZADO</p>
    </div>
  );

  return (
    <div className="h-[400px] w-full mt-10 animate-in fade-in duration-1000">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
          <defs>
            <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a3e635" stopOpacity={0.4}/><stop offset="95%" stopColor="#a3e635" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} opacity={0.1} />
          <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} fontFamily="monospace" dy={15} />
          <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '24px', fontSize: '11px' }} />
          <Area type="monotone" dataKey="rendimiento" stroke="#a3e635" strokeWidth={6} fillOpacity={1} fill="url(#scoreGlow)" animationDuration={3000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

/**
 * COMPONENTE: Ranking Táctico
 */
function WodRanking({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wodId) return;
    setLoading(true);
    const direction = type === 'time' ? 'asc' : 'desc';
    const q = query(collection(db, "workout_results"), where("wodId", "==", wodId), orderBy("scoreValue", direction));
    return onSnapshot(q, (snap) => {
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
  }, [wodId, type]);

  if (loading) return <div className="p-20 text-center animate-pulse"><Activity className="w-8 h-8 text-emerald-500 mx-auto" /></div>;

  return (
    <div className="bg-slate-900/60 border-2 border-slate-800/80 rounded-[50px] overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="p-10 bg-emerald-950/20 border-b-2 border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-6"><Trophy className="w-8 h-8 text-lime-400" /><div><h3 className="text-white font-black italic uppercase text-xl tracking-tighter">Jungle Standings</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Protocol v5.0 Verified</p></div></div>
        <div className="bg-slate-950 px-6 py-2 rounded-2xl border-2 border-slate-800"><span className="text-[11px] text-white font-black uppercase tracking-widest italic">{type?.toUpperCase()}</span></div>
      </div>
      <div className="divide-y-2 divide-slate-800/40">
        {results.length > 0 ? results.map((res, index) => (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} key={res.id} className="p-8 flex items-center justify-between group hover:bg-slate-800/30 transition-all border-l-8 border-l-transparent hover:border-l-lime-400">
            <div className="flex items-center gap-10">
              <span className={cn("text-6xl font-black italic w-20", index === 0 ? 'text-lime-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700')}>#{index + 1}</span>
              <div className="flex items-center gap-6"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${res.athleteId}`} className="w-16 h-16 rounded-[24px] border-2 border-slate-700" alt="" /><div><p className="text-slate-100 font-black uppercase text-2xl tracking-tighter mb-2">{res.athleteName}</p><p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest italic">RPE {res.rpe} • {res.modality}</p></div></div>
            </div>
            <p className="text-lime-400 font-black text-5xl font-mono tracking-tighter">{res.score}</p>
          </motion.div>
        )) : <div className="p-32 text-center opacity-20 uppercase font-black italic tracking-[0.5em]">No Data Sync</div>}
      </div>
    </div>
  );
}
export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  
  // -- NAVEGACIÓN Y ESTRUCTURA DE TIEMPO (FIJAS PARA EVITAR REFERENCEERROR) --
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

  // -- ESTADOS DE DATA MASTER --
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
  
  // Identidad Staff
  const [ownProfileData, setOwnProfileData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || ''
  });

  // --- FIREBASE SYNC ENGINE ---
  useEffect(() => {
    if (!profile) return;
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]));
    const unsubWods = onSnapshot(query(collection(db, 'wods'), where('date', '>=', weekStart), where('date', '<=', weekEnd), orderBy('date', 'asc')), (snap) => {
      const f = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(f);
      if (f.length > 0 && !selectedWodForLeaderboard) {
        const todayMatch = f.find(w => w.date === getTodayDate());
        setSelectedWodForLeaderboard(todayMatch || f[0]);
      }
    });
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', getTodayDate())), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });
    const unsubRecent = onSnapshot(query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(50)), (snap) => setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any));
    return () => { unsubAthletes(); unsubWods(); unsubWellness(); unsubRecent(); };
  }, [weekStart, profile]);

  useEffect(() => {
    if (!selectedAthlete) return;
    const unsubW = onSnapshot(query(collection(db, 'wellness_logs'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'), limit(50)), (snap) => setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) })));
    const unsubS = onSnapshot(query(collection(db, 'workout_results'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'), limit(100)), (snap) => setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) })));
    const unsubF = onSnapshot(query(collection(db, 'coach_feedback'), where('athleteId', '==', selectedAthlete.uid), orderBy('createdAt', 'desc'), limit(30)), (snap) => setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback)));
    return () => { unsubW(); unsubS(); unsubF(); };
  }, [selectedAthlete]);

  // --- HANDLERS ---
  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("Parámetros incompletos");
    try {
      if (editingWod) await setDoc(doc(db, 'wods', editingWod.id!), { ...newWod, updatedAt: serverTimestamp() }, { merge: true });
      else await addDoc(collection(db, 'wods'), { ...newWod, coachId: profile?.uid, createdAt: serverTimestamp() });
      setShowWodForm(false); setEditingWod(null); setToast({ message: 'LOG: DATABASE_SYNC_OK', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'wods'); }
  };

  const handleRoleChange = async (uid: string, newRole: 'coach' | 'athlete') => {
    await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() }, { merge: true });
    setToast({ message: 'Jerarquía actualizada', type: 'success' });
  };

  const handleDeleteAthlete = async (uid: string) => {
    if (uid === profile?.uid) return;
    if (confirm('🚨 ALERTA: ¿Purgar permanentemente este registro?')) {
      await deleteDoc(doc(db, 'users', uid));
      setToast({ message: 'Registro purgado', type: 'success' });
    }
  };

  const handleUpdateOwnProfile = async () => {
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid), { displayName: ownProfileData.displayName, photoURL: ownProfileData.photoURL, updatedAt: serverTimestamp() });
    setToast({ message: 'Perfil Staff sincronizado', type: 'success' });
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete) return;
    await addDoc(collection(db, 'coach_feedback'), { coachId: profile?.uid, coachName: profile?.displayName || 'Coach', athleteId: selectedAthlete.uid, content: adviceText, createdAt: serverTimestamp() });
    setAdviceText(''); setToast({ message: 'Feedback inyectado', type: 'success' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 3000);
  };

  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-slate-800 opacity-20';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    return avg >= 4 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]' : avg >= 2.5 ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)]' : 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]';
  };

  const todayWod = useMemo(() => wods.find(w => w.date === getTodayDate()), [wods]);
  const filteredAthletes = athletes.filter(a => a.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
    <div className="space-y-16 max-w-[2000px] mx-auto px-10 pb-96 pt-16 selection:bg-lime-400 selection:text-black">
      
      {/* HEADER MASTER EDITION */}
      <header className="space-y-16 animate-in fade-in duration-1000">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12">
          <div className="space-y-8 text-center xl:text-left">
            <div className="flex items-center justify-center xl:justify-start gap-6">
              <div className="bg-lime-400 text-black px-6 py-2 rounded-2xl text-[14px] font-black uppercase italic tracking-tighter shadow-2xl border-4 border-lime-300">STAFF_ADMIN_v5.0</div>
              <p className="text-slate-500 text-[14px] font-black uppercase tracking-[0.8em] italic opacity-40">JUNGLE_HP_OPERATIONS</p>
            </div>
            <h1 className="text-[12rem] font-black italic uppercase tracking-tighter text-white leading-[0.5] mb-0 group">
               Box <span className="text-lime-400 underline decoration-slate-800 decoration-[30px] underline-offset-[30px] italic">Control</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-10 bg-slate-900/40 p-8 pr-16 rounded-[80px] border-2 border-slate-800 shadow-[0_80px_160px_rgba(0,0,0,0.8)] backdrop-blur-3xl group/profile hover:border-emerald-500 transition-all duration-1000 self-center xl:self-end">
             <div className="relative group/av">
                <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-36 h-36 rounded-[60px] border-8 border-slate-800 object-cover group-hover:scale-110 transition-all duration-1000 shadow-2xl" alt="" />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-[20px] border-8 border-slate-900 shadow-3xl animate-pulse" />
             </div>
             <div className="hidden sm:block space-y-4">
                <p className="text-4xl text-white font-black uppercase italic leading-none tracking-tighter group-hover:text-emerald-400 transition-colors duration-700">{profile?.displayName}</p>
                <div className="flex items-center gap-6"><ShieldAlert className="w-6 h-6 text-lime-500" /><p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.6em] leading-none italic">ROOT_ACCESS_LOCKED</p></div>
             </div>
          </div>
        </div>

        {/* NAVEGACIÓN FULL ARCHITECTURE */}
        <div className="flex bg-slate-900/95 backdrop-blur-[80px] p-4 rounded-[60px] border-4 border-slate-800/80 w-full overflow-x-auto scrollbar-hide shadow-[0_100px_200px_rgba(0,0,0,1)] z-40 relative group/nav">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pulse', label: 'Pulse', icon: Activity },
            { id: 'athletes', label: 'Atletas', icon: Users },
            { id: 'wods', label: 'Prog', icon: Calendar },
            { id: 'leaderboard', label: 'Rank', icon: Trophy },
            { id: 'team', label: 'Team', icon: ShieldAlert },
            { id: 'profile', label: 'Perfil', icon: UserCircle },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex-1 flex flex-col items-center justify-center gap-6 px-14 py-10 rounded-[50px] text-[14px] font-black uppercase tracking-[0.4em] transition-all duration-700 relative group/btn", activeTab === item.id ? "bg-emerald-700 text-white shadow-[0_40px_100px_rgba(4,120,87,1)] scale-[1.12] z-10 border-4 border-emerald-500/50" : "text-slate-600 hover:text-slate-100 hover:bg-slate-800/60 hover:scale-105")}>
              <item.icon className={cn("w-10 h-10 transition-all duration-1000", activeTab === item.id ? "scale-125 rotate-12 text-lime-400" : "group-hover/btn:rotate-[-12deg]")} /> 
              <span className="group-hover/btn:tracking-[0.6em] transition-all duration-1000 leading-none">{item.label}</span>
              {activeTab === item.id && <motion.div layoutId="nav-glow-master-final" className="absolute -bottom-4 w-32 h-3 bg-lime-400 rounded-full shadow-[0_0_50px_rgba(163,230,53,1)]" />}
            </button>
          ))}
        </div>
      </header>

      {/* DASHBOARD MASTER */}
      {activeTab === 'dashboard' && (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: 'Cloud Community', value: athletes.length, icon: Users, color: 'text-lime-400', m: 'NODE_SYNC_OK' },
              { label: 'Morning Logs', value: Object.keys(todayWellness).length, icon: ShieldAlert, color: 'text-emerald-500', m: 'DATA_UPLINK' },
              { label: 'Load Handled', value: recentSessions.length, icon: Dumbbell, color: 'text-lime-400', m: 'LOGS_VERIFIED' },
              { label: 'Team Strain', value: '4.8 RPE', icon: TrendingDown, color: 'text-red-500', m: 'CRITICAL_WARN' },
            ].map((stat, i) => (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={stat.label} className="bg-slate-900/60 p-16 rounded-[70px] border-4 border-slate-800/80 group hover:border-emerald-500 transition-all duration-1000 shadow-3xl backdrop-blur-3xl relative overflow-hidden group/kpi">
                <stat.icon className={cn("w-10 h-10 mb-16 transition-all duration-1000 group-hover:scale-150", stat.color)} />
                <div className="text-[10rem] font-black italic tracking-tighter text-white leading-none mb-10 group-hover:text-lime-400 transition-colors duration-1000">{stat.value}</div>
                <p className="text-[20px] font-bold uppercase tracking-[0.5em] text-slate-500 leading-none italic mb-10">{stat.label}</p>
                <div className="flex items-center gap-8"><div className="h-[3px] w-24 bg-slate-800 group-hover:w-full transition-all duration-[2000ms] group-hover:bg-emerald-900 rounded-full" /><span className="text-[12px] font-mono text-slate-700 font-black italic opacity-40">{stat.m}</span></div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-20">
            <div className="xl:col-span-2">
               <section className="bg-slate-900 rounded-[100px] p-24 border-4 border-slate-800 shadow-[0_100px_200px_rgba(0,0,0,0.8)] relative overflow-hidden group shadow-black">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-28 gap-12 relative z-10">
                    <div className="flex items-center gap-14"><div className="w-28 h-28 rounded-[50px] bg-lime-400 flex items-center justify-center shadow-[0_0_80px_rgba(163,230,53,0.7)] group-hover:rotate-[35deg] transition-all duration-1000 border-8 border-lime-300"><Zap className="w-16 h-16 text-black" /></div><div className="space-y-6"><h3 className="text-8xl font-black italic uppercase tracking-tighter text-white leading-none mb-0">Daily <span className="text-lime-400 underline decoration-slate-800 decoration-[30px] underline-offset-[35px] italic">Podium</span></h3><p className="text-[20px] text-slate-500 font-black uppercase tracking-[1em] leading-none italic opacity-60">Verified Results System v5.0</p></div></div>
                    <div className="bg-slate-950/95 px-16 py-8 rounded-[48px] border-4 border-slate-800 shadow-3xl backdrop-blur-3xl group-hover:border-lime-900/50 transition-all duration-1500"><p className="text-[28px] text-slate-300 font-black uppercase tracking-[1em] italic font-mono leading-none">{formatDate(getTodayDate())}</p></div>
                  </div>
                  {todayWod ? <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.5 }}><WodRanking wodId={todayWod.id!} type={todayWod.type as any} /></motion.div> : <div className="p-80 text-center border-[20px] border-dashed border-slate-800/40 rounded-[140px] opacity-20"><Calendar className="w-40 h-40 mx-auto mb-20 group-hover:rotate-12 transition-transform duration-1000" /><p className="text-[40px] font-black uppercase tracking-[1.5em] leading-none">WOD_OFFLINE</p></div>}
               </section>
            </div>
            
            <section className="bg-slate-900 rounded-[100px] p-16 border-4 border-slate-800 shadow-[0_120px_240px_rgba(0,0,0,0.9)] flex flex-col relative overflow-hidden h-full shadow-black">
               <h3 className="text-[18px] font-black italic uppercase tracking-[1.2em] flex items-center gap-10 text-slate-600 mb-32 leading-none relative z-10 group/feedmaster"><HistoryIcon className="w-10 h-10 text-lime-400 group-hover/feedmaster:rotate-[-720deg] transition-all duration-[3000ms] shadow-2xl" /> ACTIVITY_LOG</h3>
               <div className="space-y-12 overflow-y-auto flex-1 scrollbar-hide relative z-10 pr-6 group/scrollo">
                 {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                   <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, type: 'spring' }} key={s.id} className="bg-slate-950/95 p-12 rounded-[64px] border-4 border-slate-900 flex items-center justify-between hover:bg-slate-900 hover:border-emerald-900/60 transition-all duration-1000 cursor-pointer shadow-3xl group shadow-black" onClick={() => { const ath = athletes.find(a => a.uid === s.athleteId); if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }}}>
                     <div className="flex items-center gap-10"><div className="relative group-hover:scale-110 transition-transform duration-1000"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.athleteId}`} className="w-24 h-24 rounded-[40px] border-[8px] border-slate-800 object-cover shadow-3xl" alt="" /><div className="absolute -top-3 -left-3 w-10 h-10 bg-emerald-500 rounded-full border-[10px] border-slate-950 shadow-3xl animate-ping" /></div><div className="space-y-5"><p className="text-[28px] font-black italic uppercase text-slate-100 group-hover:text-lime-400 transition-colors duration-[1500ms]">{s.athleteName}</p><p className="text-[12px] text-slate-700 font-bold uppercase tracking-[1em] leading-none font-mono opacity-40 italic">{s.date}</p></div></div>
                     <p className="text-6xl font-black italic text-lime-400 leading-none drop-shadow-[0_0_25px_rgba(163,230,53,0.6)] group-hover:scale-150 transition-all duration-1500 font-mono tracking-tighter">{s.score}</p>
                   </motion.div>
                 )) : <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale group-hover/scrollo:grayscale-0 group-hover/scrollo:opacity-30 transition-all duration-[4000ms]"><Activity className="w-64 h-64 mb-20 animate-spin duration-[10000ms]" /><p className="text-[28px] font-black uppercase italic tracking-[2em] text-center">SYNC_INIT...</p></div>}
               </div>
               <div className="mt-28 pt-28 border-t-8 border-slate-900/90 shadow-black"><button onClick={copyToClipboard} className="w-full bg-slate-950 text-slate-700 border-[6px] border-slate-900 py-12 rounded-[50px] font-black uppercase tracking-[1.5em] text-[18px] flex items-center justify-center gap-12 hover:bg-slate-900 hover:text-white transition-all active:scale-[0.8] shadow-[0_60px_120px_rgba(0,0,0,1)] italic group/share shadow-black border-lime-900/10">{copied ? 'PROTOCOL_ID_SYNCED' : 'SYSTEM_NODE_URL'} <Share2 className="w-10 h-10 group-hover/share:rotate-[360deg] transition-all duration-[2000ms] drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]" /></button></div>
            </section>
          </div>
        </div>
      )}
      {/* 2. PULSE MASTER */}
      {activeTab === 'pulse' && (
        <div className="space-y-16 animate-in fade-in duration-800 slide-in-from-left-12">
           <div className="bg-slate-900 rounded-[120px] p-32 border-8 border-slate-800 shadow-[0_150px_300px_rgba(0,0,0,1)] relative overflow-hidden shadow-black">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-24 mb-48 relative z-10 text-center lg:text-left">
                 <div className="space-y-12"><div className="flex items-center justify-center lg:justify-start gap-10"><div className="w-8 h-8 rounded-full bg-red-500 animate-ping shadow-[0_0_60px_rgba(239,68,68,1)]" /><p className="text-red-500 text-[22px] font-black uppercase tracking-[1em] italic leading-none">Box Health Radar Protocol</p></div><h3 className="text-[12rem] font-black italic uppercase tracking-tighter text-white leading-[0.5] mb-0 group">Jungle <span className="text-lime-400 italic underline decoration-lime-950/60 decoration-[40px] underline-offset-[45px]">Pulse</span></h3><p className="text-[24px] text-slate-600 font-bold uppercase tracking-widest mt-20 max-w-6xl leading-relaxed italic opacity-80">Análisis táctico de recuperación sistémica v5.0. Monitoreo predictivo basado en calidad de sueño y fatiga basal.</p></div>
              </div>
              <div className="grid grid-cols-1 gap-12 relative z-10">
                {athletes.filter(a => a.role === 'athlete').map((a, idx) => {
                  const w = todayWellness[a.uid];
                  return (
                    <motion.div initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={a.uid} className="bg-slate-950/95 p-20 rounded-[100px] border-4 border-slate-900 flex flex-col xl:flex-row xl:items-center justify-between gap-24 hover:border-emerald-900/60 hover:bg-slate-900 transition-all duration-[1200ms] group shadow-[0_80px_160px_rgba(0,0,0,1)] relative overflow-hidden shadow-black">
                       <div className="flex items-center gap-20 min-w-[700px]"><div className="relative group/avatar"><img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-48 h-48 rounded-[80px] border-[10px] border-slate-800 shadow-3xl object-cover shadow-black" alt="" /><div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-[50px] border-[24px] border-slate-950 shadow-[0_40px_80px_rgba(0,0,0,1)] z-20 flex items-center justify-center", getDayReadinessColor([w].filter(Boolean)))}>{w && <div className="w-5 h-5 rounded-full bg-white animate-ping" />}</div></div><div className="space-y-8"><h4 className="text-[5rem] font-black uppercase italic text-white tracking-tighter leading-none group-hover:text-emerald-400 transition-colors duration-[1500ms]">{a.displayName}</h4><div className="flex flex-wrap gap-8 items-center"><div className="bg-slate-900 px-10 py-4 rounded-[32px] border-4 border-slate-800 text-[18px] font-black uppercase italic text-slate-500 tracking-[0.6em] flex items-center gap-8 shadow-2xl shadow-black/80 transition-all group-hover:border-emerald-900/50">{w ? <ClipboardCheck className="w-8 h-8 text-emerald-500" /> : <TrendingDown className="w-8 h-8 text-red-500" />}{w ? 'SYNC_OK' : 'PENDING'}</div><p className="text-[14px] text-slate-700 font-bold uppercase tracking-[1em] italic font-mono opacity-50">NODE_v5.0_LOG</p></div></div></div>
                       {w ? (<div className="grid grid-cols-3 gap-12">{[{ val: w.sleepQuality, label: 'Sleep' }, { val: w.nutrition, label: 'Fuel' }, { val: 6 - w.stressLevel, label: 'Strain' }].map((item, i) => (<div key={i} className="bg-slate-900/80 p-12 rounded-[80px] border-4 border-slate-800/50 text-center w-64 shadow-[inset_0_30px_70px_rgba(0,0,0,1)] group-hover:bg-slate-950 transition-all duration-[1500ms] shadow-black"><p className="text-[14px] text-slate-600 font-black uppercase mb-12 italic tracking-[0.8em] leading-none whitespace-nowrap">{item.label}</p><div className="flex justify-center gap-4 mb-12">{[1,2,3,4,5].map(s => (<div key={s} className={cn("w-6 h-6 rounded-full transition-all duration-[1200ms]", s <= item.val ? "bg-lime-400 scale-[1.8] shadow-[0_0_40px_rgba(163,230,53,0.8)]" : "bg-slate-800 scale-[0.6]")} />))}</div><p className="text-5xl font-black italic text-white mt-10 leading-none font-mono opacity-80 tracking-widest">{item.val}.0<span className="text-[16px] ml-4 text-slate-700">/ 5.0</span></p></div>))}</div>) : <div className="p-28 text-center border-8 border-dashed border-slate-900/60 rounded-[100px] bg-slate-950/40 opacity-20"><p className="text-[28px] font-black uppercase italic tracking-[1.5em] text-slate-700">AWAITING_SIGNAL_BURST</p></div>}
                    </motion.div>
                  );
                })}
              </div>
           </div>
        </div>
      )}

      {/* MODAL CREADOR DE WOD INTEGRAL */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-20 bg-slate-950/99 backdrop-blur-[120px]">
             <motion.div initial={{ scale: 0.4, opacity: 0, y: 500 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 45, stiffness: 80 }} className="bg-slate-900 p-40 rounded-[150px] w-full max-w-[1400px] border-[12px] border-slate-800 shadow-[0_200px_400px_rgba(0,0,0,1)] relative overflow-hidden shadow-black">
                <button onClick={() => setShowWodForm(false)} className="absolute top-24 right-24 text-slate-700 hover:text-white transition-all bg-slate-950 p-16 rounded-full border-8 border-slate-800 z-50 group hover:rotate-[360deg] duration-[3000ms] shadow-3xl shadow-black"><Repeat className="w-20 h-20 rotate-45 group-hover:scale-[1.6] transition-transform duration-1500" /></button>
                <div className="text-center mb-56 space-y-20 relative z-10"><h3 className="text-[12rem] font-black italic uppercase text-white tracking-tighter leading-[0.4] mb-0">{editingWod ? 'Update' : 'Inject'} <span className="text-emerald-500 italic">Workload</span></h3><div className="flex items-center justify-center gap-20 mt-20"><div className="h-2 w-72 bg-slate-800 rounded-full shadow-inner shadow-black" /><p className="text-[32px] text-slate-600 font-bold uppercase tracking-[1.5em] italic leading-none">SYSTEM_INJECT_PROTOCOL_v5.0</p><div className="h-2 w-72 bg-slate-800 rounded-full shadow-inner shadow-black" /></div></div>
                <div className="space-y-32 relative z-10">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-32"><div className="space-y-14 group"><label className="text-[24px] font-black uppercase text-slate-500 ml-20 italic tracking-[1em] group-hover:text-emerald-500 transition-all duration-1000">Target_Date_Node</label><input type="date" value={newWod.date} onChange={e => setNewWod({...newWod, date: e.target.value})} className="w-full bg-slate-950/95 border-[10px] border-slate-800 rounded-[80px] p-24 text-6xl text-white outline-none focus:border-emerald-700 transition-all duration-[1500ms] font-black shadow-[inset_0_60px_120px_rgba(0,0,0,1)] tracking-tighter shadow-black font-mono" /></div><div className="space-y-14 group"><label className="text-[24px] font-black uppercase text-slate-500 ml-20 italic tracking-[1em] group-hover:text-emerald-500 transition-all duration-1000">Logic_System</label><select value={newWod.type} onChange={e => setNewWod({...newWod, type: e.target.value})} className="w-full bg-slate-950/95 border-[10px] border-slate-800 rounded-[80px] p-24 text-[32px] font-black uppercase text-white outline-none focus:border-emerald-700 transition-all shadow-black italic appearance-none"><option value="">-- SELECT_LOGIC --</option><option value="time">FOR_TIME (SPEED)</option><option value="weight">STRENGTH (KG)</option><option value="reps">AMRAP (REPS)</option></select></div></div>
                  <div className="space-y-14 group"><label className="text-[24px] font-black uppercase text-slate-500 ml-20 italic tracking-[1em] group-hover:text-emerald-500 transition-all duration-1000">Session_Title_Code</label><input placeholder="BOX_CODE_NAME..." value={newWod.title} onChange={e => setNewWod({...newWod, title: e.target.value})} className="w-full bg-slate-950/95 border-[10px] border-slate-800 rounded-[80px] p-24 text-8xl font-black italic text-white outline-none focus:border-emerald-700 transition-all shadow-black placeholder-slate-900 tracking-tighter" /></div>
                  <div className="space-y-14 group"><label className="text-[24px] font-black uppercase text-slate-500 ml-20 italic tracking-[1em] group-hover:text-emerald-500 transition-all duration-1000">Technical_Breakdown</label><textarea placeholder="DETALLE LAS RONDAS Y MOVIMIENTOS REQUERIDOS..." value={newWod.description} onChange={e => setNewWod({...newWod, description: e.target.value})} rows={8} className="w-full bg-slate-950/95 border-[10px] border-slate-800 rounded-[100px] p-28 text-[32px] font-medium italic text-slate-300 outline-none focus:border-emerald-700 transition-all leading-relaxed shadow-black font-mono" /></div>
                  <div className="flex gap-32 pt-40"><button onClick={() => setShowWodForm(false)} className="flex-1 py-20 text-[32px] font-black uppercase text-slate-700 hover:text-slate-100 transition-all tracking-[2em] italic hover:scale-110 duration-1500">ABORT_CMD</button><button onClick={handleWodSubmit} className="flex-[4] bg-emerald-700 text-white py-20 rounded-[100px] text-[36px] font-black uppercase tracking-[2em] shadow-[0_100px_200px_rgba(4,120,87,0.9)] active:scale-[0.8] transition-all duration-[2000ms] border-[24px] border-emerald-500/20 italic group-hover:bg-emerald-600 shadow-black">COMMIT_INJECTION</button></div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM ULTIMATE */}
      <AnimatePresence>{toast && (
        <motion.div initial={{ opacity: 0, y: 500, scale: 0.2 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 500, scale: 0.2 }} transition={{ duration: 1.5, type: 'spring' }} className="fixed bottom-80 left-20 right-20 z-[400] flex justify-center pointer-events-none">
          <div className={cn("px-48 py-24 rounded-[120px] shadow-[0_150px_300px_rgba(0,0,0,1)] flex items-center gap-32 border-[16px] backdrop-blur-[200px] transition-all duration-[2500ms] shadow-black", toast.type === 'success' ? "bg-emerald-950/95 border-emerald-500/50 text-white" : "bg-red-950/95 border-red-500/50 text-white")}>
             <div className={cn("p-16 rounded-full shadow-[0_0_150px_rgba(0,0,0,1)] transition-all duration-[2500ms] border-[12px] border-slate-950", toast.type === 'success' ? "bg-lime-400" : "bg-red-500")}><CheckCircle2 className="w-32 h-32 text-black" /></div>
             <div className="flex flex-col space-y-12 text-left relative z-10"><span className="text-[96px] font-black uppercase italic tracking-[0.8em] leading-[0.8] mb-8">{toast.message}</span><div className="flex items-center gap-16"><div className="w-48 h-[12px] bg-white/30 rounded-full shadow-2xl" /><span className="text-[24px] text-white/50 font-black uppercase tracking-[2em] leading-none font-mono italic">MASTER_PROTOCOL_v5.0_OK</span></div></div>
          </div>
        </motion.div>
      )}</AnimatePresence>

    </div>
  );
}
