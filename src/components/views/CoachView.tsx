import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/components/auth/AuthProvider';
import { db } from '@/src/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  serverTimestamp, doc, setDoc, limit, deleteDoc, updateDoc 
} from 'firebase/firestore';
import { UserProfile, WellnessEntry, Wod, WorkoutSession, CoachFeedback } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Plus, MessageSquare, Send, ChevronRight, Search, 
  Activity, History as HistoryIcon, Trophy, LayoutDashboard, Share2, 
  TrendingUp, Dumbbell, ShieldAlert, Trash2, CheckCircle2, 
  Zap, TrendingDown, UserCircle, Settings, ArrowLeft, ClipboardCheck, 
  ActivitySquare, Zap as ZapIcon, Award, Weight
} from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange } from '@/src/lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile';
  onTabChange?: (tab: string) => void;
}

// ============================================================================
// COMPONENTES ANALÍTICOS Y RANKING
// ============================================================================

const PerformanceVisualizer = React.memo(({ data }: { data: WorkoutSession[] }) => {
  const chartData = useMemo(() => {
    return [...data].reverse().filter(s => s.scoreValue !== undefined).map(s => ({
      date: s.date.split('-').reverse().slice(0,2).join('/'),
      rendimiento: s.scoreValue || 0,
      esfuerzo: s.rpe || 0,
    }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-950/40 rounded-3xl border-2 border-dashed border-slate-800/60 p-8">
        <ActivitySquare className="w-8 h-8 text-slate-700 animate-pulse mb-4" />
        <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest text-center italic">Biometría insuficiente para trazado</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-6 animate-in fade-in duration-1000">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
          <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} tick={{ fontWeight: 'bold' }} />
          <YAxis hide />
          <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '10px' }} />
          <Area type="monotone" dataKey="rendimiento" stroke="#a3e635" strokeWidth={4} fillOpacity={1} fill="url(#scoreGlow)" />
          <Area type="monotone" dataKey="esfuerzo" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#effortGlow)" strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

function TacticalRankEngine({ wodId, type }: { wodId: string, type: 'time' | 'weight' | 'reps' }) {
  const [standings, setStandings] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!wodId) return;
    setIsProcessing(true);
    const orderDir = type === 'time' ? 'asc' : 'desc';
    const q = query(collection(db, "workout_results"), where("wodId", "==", wodId), orderBy("scoreValue", orderDir));
    
    const unsub = onSnapshot(q, (snap) => {
      setStandings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsProcessing(false);
    }, (error) => {
      console.warn("Requiere índice Firestore", error.message);
      setIsProcessing(false);
    });
    return () => unsub();
  }, [wodId, type]);

  if (isProcessing) return <div className="p-16 text-center"><Activity className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" /><p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Sincronizando...</p></div>;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="p-6 bg-emerald-950/20 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Trophy className="w-6 h-6 text-lime-400" />
          <div>
            <h3 className="text-white font-black italic uppercase text-lg leading-none">Jungle Podium</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic mt-1">Official Standings</p>
          </div>
        </div>
        <div className="bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800">
           <span className="text-[10px] text-white font-black uppercase tracking-widest">{type}</span>
        </div>
      </div>
      
      <div className="divide-y divide-slate-800/40">
        {standings.length > 0 ? standings.map((res, index) => (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-5">
              <span className={cn("text-3xl font-black italic w-12 text-center", index === 0 ? 'text-lime-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-700')}>{index + 1}</span>
              <div className="flex items-center gap-4">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${res.athleteId || res.userId}`} className="w-12 h-12 rounded-xl border border-slate-700 object-cover" alt="" />
                 <div>
                   <p className="text-slate-100 font-black uppercase text-sm tracking-tight">{res.athleteName}</p>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">RPE: {res.rpe} • {res.modality}</p>
                 </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lime-400 font-black text-2xl font-mono tracking-tighter">{res.score}</p>
            </div>
          </motion.div>
        )) : (
          <div className="p-20 text-center opacity-30"><ActivitySquare className="w-12 h-12 text-slate-600 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Sin registros</p></div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE MAESTRO: COACH VIEW
// ============================================================================

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team' | 'profile'>('dashboard');
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  // Variables de Tiempo Memorizadas
  const weekDays = useMemo(() => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], []);
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekStart]);

  // Estados
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
  
  const [ownProfileData, setOwnProfileData] = useState({
    displayName: profile?.displayName || '',
    photoURL: profile?.photoURL || ''
  });

  // Temporizador de Toast (Soluciona el cartel que no se cierra)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sincronización Principal
  useEffect(() => {
    if (!profile) return;
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]));
    const unsubWods = onSnapshot(query(collection(db, 'wods'), where('date', '>=', weekStart), where('date', '<=', weekEnd), orderBy('date', 'asc')), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetched);
      if (fetched.length > 0 && !selectedWodForLeaderboard) {
        const todayMatch = fetched.find(w => w.date === getTodayDate());
        setSelectedWodForLeaderboard(todayMatch || fetched[0]);
      }
    });
    const unsubWellness = onSnapshot(query(collection(db, 'wellness_logs'), where('date', '==', getTodayDate())), (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });
    const unsubRecent = onSnapshot(query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(30)), (snap) => setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any));

    return () => { unsubAthletes(); unsubWods(); unsubWellness(); unsubRecent(); };
  }, [weekStart, profile]);

  // Historial de Atleta
  useEffect(() => {
    if (!selectedAthlete) return;
    const unsubW = onSnapshot(query(collection(db, 'wellness_logs'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'), limit(30)), (snap) => setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) })));
    const unsubS = onSnapshot(query(collection(db, 'workout_results'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'), limit(30)), (snap) => setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) })));
    const unsubF = onSnapshot(query(collection(db, 'coach_feedback'), where('athleteId', '==', selectedAthlete.uid), orderBy('createdAt', 'desc'), limit(20)), (snap) => setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback)));

    return () => { unsubW(); unsubS(); unsubF(); };
  }, [selectedAthlete]);

  // Funciones y Handlers
  const handleWodSubmit = async () => {
    if (!newWod.title || !newWod.type || !newWod.date) return alert("Faltan campos");
    try {
      if (editingWod) await setDoc(doc(db, 'wods', editingWod.id!), { ...newWod, updatedAt: serverTimestamp() }, { merge: true });
      else await addDoc(collection(db, 'wods'), { ...newWod, coachId: profile?.uid, createdAt: serverTimestamp() });
      setShowWodForm(false); setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
      setToast({ message: 'Sesión guardada', type: 'success' });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'wods'); }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Eliminar sesión?')) return;
    try { await deleteDoc(doc(db, 'wods', id)); setToast({ message: 'Sesión eliminada', type: 'success' }); } 
    catch (e) { handleFirestoreError(e, OperationType.DELETE, 'wods'); }
  };

  const handleRoleChange = async (uid: string, newRole: 'coach' | 'athlete') => {
    try { await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: serverTimestamp() }, { merge: true }); setToast({ message: `Rol actualizado`, type: 'success' }); }
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`); }
  };

  const handleDeleteAthlete = async (uid: string) => {
    if (uid === profile?.uid) return;
    if (!confirm('¿Eliminar cuenta permanentemente?')) return;
    try { await deleteDoc(doc(db, 'users', uid)); setAthletes(prev => prev.filter(a => a.uid !== uid)); setToast({ message: 'Usuario eliminado', type: 'success' }); } 
    catch (e) { handleFirestoreError(e, OperationType.DELETE, `users/${uid}`); }
  };

  const handleUpdateOwnProfile = async () => {
    if (!profile?.uid) return;
    try { await updateDoc(doc(db, 'users', profile.uid), { displayName: ownProfileData.displayName, photoURL: ownProfileData.photoURL, updatedAt: serverTimestamp() }); setToast({ message: 'Perfil actualizado', type: 'success' }); }
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${profile.uid}`); }
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete) return;
    try { await addDoc(collection(db, 'coach_feedback'), { coachId: profile?.uid, coachName: profile?.displayName || 'Coach', athleteId: selectedAthlete.uid, content: adviceText, createdAt: serverTimestamp() }); setAdviceText(''); setToast({ message: 'Feedback enviado', type: 'success' }); }
    catch (e) { handleFirestoreError(e, OperationType.CREATE, 'coach_feedback'); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  const getDayReadinessColor = (wellness: WellnessEntry[]) => {
    if (wellness.length === 0) return 'bg-slate-800 opacity-20';
    const latest = wellness[0];
    const avg = (latest.sleepQuality + (6 - latest.stressLevel) + latest.nutrition) / 3;
    return avg >= 4 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : avg >= 2.5 ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  };

  const todayWodNode = useMemo(() => wods.find(w => w.date === getTodayDate()), [wods]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-32 pt-6 selection:bg-emerald-500 selection:text-white">
      
      {/* HEADER STAFF */}
      <header className="space-y-6 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-lime-400 text-black px-3 py-1 rounded-md text-[9px] font-black uppercase italic tracking-widest shadow-md">Admin Root</div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Jungle HP Ops v5.2</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
               Box <span className="text-lime-400 underline decoration-slate-800 decoration-4 underline-offset-4">Control</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/80 p-3 pr-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
             <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-12 h-12 rounded-xl border-2 border-slate-700 object-cover" alt="" />
             <div className="hidden sm:block">
                <p className="text-sm text-white font-black uppercase italic leading-none">{profile?.displayName}</p>
                <div className="flex items-center gap-2 mt-1">
                   <ShieldAlert className="w-3 h-3 text-lime-500" />
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Access Locked</p>
                </div>
             </div>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex bg-slate-900/90 backdrop-blur-xl p-2 rounded-3xl border border-slate-800 w-full overflow-x-auto scrollbar-hide shadow-lg relative">
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
                "flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", 
                activeTab === item.id 
                  ? "bg-emerald-700 text-white shadow-lg scale-105 z-10" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              )}
            >
              <item.icon className="w-5 h-5" /> 
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* RENDER DE PESTAÑAS */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Atletas Activos', value: athletes.length, icon: Users, color: 'text-lime-400' },
                  { label: 'Check-ins Hoy', value: Object.keys(todayWellness).length, icon: ShieldAlert, color: 'text-emerald-500' },
                  { label: 'WODs Cargados', value: todayWellness.length, icon: Dumbbell, color: 'text-lime-400' },
                  { label: 'Fatiga Promedio', value: '4.8 RPE', icon: TrendingDown, color: 'text-red-500' },
                ].map((stat, i) => (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={stat.label} className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-lg">
                    <stat.icon className={cn("w-6 h-6 mb-4", stat.color)} />
                    <div className="text-3xl font-black italic tracking-tighter text-white leading-none mb-2">{stat.value}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                   <section className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-lime-400 flex items-center justify-center shadow-lg"><Zap className="w-6 h-6 text-black" /></div>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Daily <span className="text-lime-400 underline decoration-slate-800 decoration-4">Podium</span></h3>
                        </div>
                        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><p className="text-xs text-slate-400 font-black uppercase tracking-widest italic">{formatDate(getTodayDate())}</p></div>
                      </div>
                      {todayWodNode ? <TacticalRankEngine wodId={todayWodNode.id!} type={todayWodNode.type as any} /> : (
                        <div className="p-16 text-center border-2 border-dashed border-slate-800/50 rounded-3xl bg-slate-950/40">
                           <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                           <p className="text-slate-600 italic text-sm font-black uppercase tracking-widest mb-4">No hay WOD programado hoy</p>
                           <button onClick={() => setActiveTab('wods')} className="bg-slate-900 text-emerald-500 border border-emerald-900/40 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-950 transition-all">Crear Sesión <Plus className="w-4 h-4 inline ml-2" /></button>
                        </div>
                      )}
                   </section>
                </div>
                
                <section className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-full">
                   <h3 className="text-xs font-black italic uppercase tracking-widest flex items-center gap-3 text-slate-400 mb-6"><HistoryIcon className="w-5 h-5 text-lime-400" /> Activity Stream</h3>
                   <div className="space-y-3 overflow-y-auto flex-1 scrollbar-hide pr-2">
                     {recentSessions.length > 0 ? recentSessions.map((s) => (
                       <div key={s.id} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-900 flex items-center justify-between hover:bg-slate-800 transition-all cursor-pointer" onClick={() => { const ath = athletes.find(a => a.uid === s.athleteId); if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }}}>
                         <div className="flex items-center gap-4">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.athleteId}`} className="w-10 h-10 rounded-xl border border-slate-800 object-cover" alt="" />
                            <div><p className="text-[11px] font-black italic uppercase text-slate-200">{s.athleteName}</p><p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{s.date}</p></div>
                         </div>
                         <p className="text-lg font-black italic text-lime-400 tracking-tighter">{s.score}</p>
                       </div>
                     )) : <div className="text-center opacity-30 py-10"><Activity className="w-8 h-8 mx-auto mb-2 animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest">Esperando logs...</p></div>}
                   </div>
                   <div className="mt-6 pt-6 border-t border-slate-800/80"><button onClick={copyToClipboard} className="w-full bg-slate-950 text-slate-500 border border-slate-800 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-xl">{copied ? 'URL Copiada' : 'Compartir Box'} <Share2 className="w-4 h-4" /></button></div>
                </section>
              </div>
            </motion.div>
          )}

          {/* PULSE */}
          {activeTab === 'pulse' && (
            <motion.div key="pulse" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
               <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-800 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                     <div><div className="flex items-center gap-3 mb-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><p className="text-red-500 text-[10px] font-black uppercase tracking-widest italic">Health Radar</p></div><h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">Jungle <span className="text-lime-400 underline decoration-lime-900/50 decoration-4">Pulse</span></h3></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {athletes.filter(a => a.role === 'athlete').map((a) => {
                      const w = todayWellness[a.uid];
                      return (
                        <div key={a.uid} className="bg-slate-950/80 p-6 rounded-[28px] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-colors">
                           <div className="flex items-center gap-6"><div className="relative"><img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-16 h-16 rounded-2xl border-2 border-slate-800 object-cover" alt="" /><div className={cn("absolute -bottom-2 -right-2 w-5 h-5 rounded-full border-4 border-slate-950", getDayReadinessColor([w].filter(Boolean)))} /></div><div><h4 className="text-xl font-black uppercase italic text-white tracking-tighter mb-1">{a.displayName}</h4><div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-[9px] font-black uppercase italic text-slate-500 tracking-widest flex items-center gap-2 w-fit">{w ? <ClipboardCheck className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}{w ? 'SYNC OK' : 'PENDING'}</div></div></div>
                           {w ? (<div className="flex gap-4">{[{ val: w.sleepQuality, label: 'Sleep' }, { val: w.nutrition, label: 'Fuel' }, { val: 6 - w.stressLevel, label: 'Strain' }].map((item, i) => (<div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center w-24"><p className="text-[9px] text-slate-500 font-black uppercase mb-2 italic tracking-widest">{item.label}</p><div className="flex justify-center gap-1 mb-2">{[1,2,3,4,5].map(s => (<div key={s} className={cn("w-1.5 h-1.5 rounded-full", s <= item.val ? "bg-lime-400" : "bg-slate-800")} />))}</div><p className="text-xl font-black italic text-white font-mono">{item.val}<span className="text-[10px] text-slate-700 ml-1">/5</span></p></div>))}</div>) : <div className="text-center px-10 py-6 border-2 border-dashed border-slate-800 rounded-2xl"><p className="text-[10px] font-black uppercase italic tracking-widest text-slate-600">AWAITING_SIGNAL</p></div>}
                        </div>
                      );
                    })}
                  </div>
               </div>
            </motion.div>
          )}

          {/* ATLETAS (VAULT) */}
          {activeTab === 'athletes' && (
            <motion.div key="athletes-tab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
               {!selectedAthlete ? (
                  <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-xl">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"><h3 className="text-4xl font-black italic uppercase tracking-tighter text-white">Athlete <span className="text-emerald-500">Vault</span></h3><div className="relative w-full md:w-80"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" /><input placeholder="BUSCAR ATLETA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-emerald-700" /></div></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAthletes.map(a => (
                           <button key={a.uid} onClick={() => setSelectedAthlete(a)} className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-emerald-600 transition-all group text-left">
                              <div className="flex items-center gap-4"><img src={a.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.uid}`} className="w-12 h-12 rounded-xl border border-slate-700 object-cover" alt="" /><div><p className="text-sm font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors">{a.displayName}</p><p className="text-[9px] font-black uppercase text-slate-600 tracking-widest mt-1">{a.role} LEVEL</p></div></div><ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-emerald-500" />
                           </button>
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="space-y-6">
                     <button onClick={() => setSelectedAthlete(null)} className="text-xs font-black uppercase tracking-widest text-emerald-500 italic flex items-center gap-2 hover:text-emerald-400 transition-colors"><ArrowLeft className="w-4 h-4" /> VOLVER AL VAULT</button>
                     <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-6 mb-10 border-b border-slate-800/50 pb-8"><img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-24 h-24 rounded-[24px] border-4 border-slate-800 object-cover" alt="" /><div><h3 className="text-4xl font-black italic uppercase tracking-tighter mb-3">{selectedAthlete.displayName}</h3><div className="flex gap-4"><span className="bg-slate-950 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-800">{selectedAthlete.role} ACCESS</span><span className="bg-lime-400/10 text-lime-400 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-lime-400/20">VERIFIED</span></div></div></div>
                        <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-900 mb-8"><h4 className="text-xs font-black uppercase text-white tracking-widest mb-6 italic">Evolution Radar</h4><PerformanceVisualizer data={athleteData.sessions} /></div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800"><h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-widest mb-6">Logs Históricos</h4><div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">{athleteData.sessions.map(s => (<div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center"><div className="flex items-center gap-4"><div className="text-center leading-none"><p className="text-lg font-black text-white">{s.date.split('-')[2]}</p><p className="text-[9px] font-black uppercase text-slate-500 mt-1">{s.date.split('-')[1]}</p></div><div><p className="text-xs font-black uppercase italic text-slate-200">{s.modality || 'Session'}</p><p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">RPE: {s.rpe}</p></div></div><p className="text-xl font-black italic text-lime-400 tracking-tighter">{s.score}</p></div>))}</div></div>
                           <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800"><h4 className="text-[11px] font-black uppercase text-lime-500 tracking-widest mb-6">Command Feedback</h4><textarea placeholder="Enviar corrección técnica..." value={adviceText} onChange={e => setAdviceText(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs italic text-slate-300 outline-none focus:border-lime-500 mb-4" /><button onClick={handleAdviceSubmit} disabled={!adviceText.trim()} className="w-full bg-emerald-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Enviar Feedback</button><div className="mt-6 space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">{feedbackHistory.map(f => (<div key={f.id} className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20 border-l-2 border-l-lime-400"><p className="text-xs italic text-slate-300">"{f.content}"</p><p className="text-[8px] font-black uppercase text-lime-500 mt-2 tracking-widest text-right">Delivered</p></div>))}</div></div>
                        </div>
                     </div>
                  </div>
               )}
            </motion.div>
          )}

          {/* WODS SCHEDULE */}
          {activeTab === 'wods' && (
            <motion.div key="wods-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="flex justify-between items-center"><h3 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter">WOD <span className="text-emerald-500 underline decoration-4 underline-offset-4">Schedule</span></h3><button onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date: getTodayDate() }); setShowWodForm(true); }} className="bg-emerald-700 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-600 active:scale-95"><Plus className="w-4 h-4" /> AGREGAR WOD</button></div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {weekDates.map((date, idx) => {
                   const dayWods = wods.filter(w => w.date === date); const isToday = date === getTodayDate();
                   return (
                     <div key={date} className={cn("p-6 rounded-[32px] border transition-all flex flex-col h-full min-h-[350px] relative", isToday ? "border-emerald-500 bg-slate-900 shadow-2xl scale-[1.02]" : "border-slate-800 bg-slate-900/50")}>
                        {isToday && <span className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">HOY</span>}
                        <div className="mb-6"><p className={cn("text-lg font-black uppercase italic tracking-widest", isToday ? "text-emerald-400" : "text-slate-600")}>{weekDays[idx]}</p><p className="text-[10px] font-mono text-slate-500 font-black tracking-widest">{date.split('-').reverse().slice(0,2).join('/')}</p></div>
                        <div className="flex-1 space-y-4">
                           {dayWods.map(w => (<div key={w.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 group"><h4 className="text-base font-black uppercase italic text-white mb-2">{w.title}</h4><p className="text-[11px] text-slate-500 italic line-clamp-4 mb-4">"{w.description}"</p><div className="flex justify-between items-center pt-3 border-t border-slate-800/50"><button onClick={() => { setEditingWod(w); setNewWod(w as any); setShowWodForm(true); }} className="text-[9px] font-black uppercase text-slate-400 hover:text-white">EDITAR</button><button onClick={() => handleWodDelete(w.id!)} className="text-[9px] font-black uppercase text-red-500 hover:text-red-400">BORRAR</button></div></div>))}
                           {dayWods.length === 0 && <button onClick={() => { setEditingWod(null); setNewWod({ title: '', description: '', type: '', date }); setShowWodForm(true); }} className="w-full h-full border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-emerald-500 transition-colors p-8"><Plus className="w-8 h-8" /><span className="text-[10px] font-black uppercase tracking-widest">PLANIFICAR</span></button>}
                        </div>
                     </div>
                   );
                 })}
               </div>
            </motion.div>
          )}

          {/* LEADERBOARD ARCHIVE */}
          {activeTab === 'leaderboard' && (
            <motion.div key="rank-tab" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-800 shadow-2xl">
              <h3 className="text-3xl font-black italic uppercase text-white mb-8 flex items-center gap-4"><Trophy className="w-8 h-8 text-lime-400" /> Rank History</h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide mb-8 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                {wods.length > 0 ? wods.map(w => (<button key={w.id} onClick={() => setSelectedWodForLeaderboard(w)} className={cn("px-6 py-3 rounded-xl text-[10px] font-black uppercase border transition-all whitespace-nowrap", selectedWodForLeaderboard?.id === w.id ? "bg-emerald-700 border-emerald-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white")}>{w.title}</button>)) : <p className="text-xs font-black italic text-slate-600">No hay datos</p>}
              </div>
              {selectedWodForLeaderboard ? <TacticalRankEngine wodId={selectedWodForLeaderboard.id!} type={selectedWodForLeaderboard.type as any} /> : <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl"><Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" /><p className="text-xs font-black uppercase tracking-widest text-slate-600">SELECCIONA UN WOD</p></div>}
            </motion.div>
          )}

          {/* TEAM MANAGEMENT */}
          {activeTab === 'team' && (
            <motion.div key="team-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-800 shadow-2xl">
               <h3 className="text-3xl font-black italic uppercase text-white mb-10 flex items-center gap-4"><ShieldAlert className="w-8 h-8 text-amber-500" /> Staff Control</h3>
               <div className="space-y-4">
                 {athletes.map(u => (
                   <div key={u.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-950 rounded-3xl border border-slate-800 hover:border-slate-600 transition-all gap-6">
                      <div className="flex items-center gap-6"><img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-16 h-16 rounded-2xl border-2 border-slate-700 object-cover" alt="" /><div><p className="text-xl font-black uppercase text-white italic">{u.displayName}</p><p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">ROL: {u.role}</p></div></div>
                      <div className="flex gap-4"><button onClick={() => handleRoleChange(u.uid, u.role === 'coach' ? 'athlete' : 'coach')} className={cn("px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", u.role === 'coach' ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-emerald-700 text-white border-emerald-500/50")}>{u.role === 'coach' ? 'Revocar' : 'Hacer Coach'}</button><button onClick={() => handleDeleteAthlete(u.uid)} disabled={u.uid === profile?.uid} className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/30 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button></div>
                   </div>
                 ))}
               </div>
            </motion.div>
          )}

          {/* PROFILE CONFIG */}
          {activeTab === 'profile' && (
            <motion.div key="profile-tab" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl max-w-2xl mx-auto text-center">
               <div className="w-32 h-32 mx-auto mb-8 relative"><img src={ownProfileData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-full h-full rounded-3xl border-4 border-slate-800 object-cover" alt="" /><div className="absolute -bottom-2 -right-2 bg-lime-400 p-2 rounded-xl text-black"><Settings className="w-5 h-5" /></div></div>
               <h3 className="text-3xl font-black italic uppercase text-white mb-2">Staff Identity</h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10">Configuración Personal</p>
               <div className="space-y-6 text-left">
                  <div><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">Nombre Público</label><input value={ownProfileData.displayName} onChange={e => setOwnProfileData({...ownProfileData, displayName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-lg font-black italic text-white outline-none focus:border-lime-500 transition-colors" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block ml-2">URL de Avatar</label><input value={ownProfileData.photoURL} onChange={e => setOwnProfileData({...ownProfileData, photoURL: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-400 outline-none focus:border-lime-500 transition-colors" /></div>
                  <button onClick={handleUpdateOwnProfile} className="w-full bg-lime-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white transition-colors mt-4">Guardar Cambios</button>
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL FORMULARIO WOD */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 p-8 md:p-10 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl relative scrollbar-hide">
                <button onClick={() => setShowWodForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-950 p-2 rounded-full border border-slate-800"><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="text-3xl font-black italic uppercase text-white mb-8 leading-none">{editingWod ? 'Update' : 'Schedule'} <span className="text-emerald-500">WOD</span></h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Fecha</label><input type="date" value={newWod.date} onChange={e => setNewWod({...newWod, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Lógica</label><select value={newWod.type} onChange={e => setNewWod({...newWod, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-black uppercase text-white focus:border-emerald-500 outline-none"><option value="">-- SELECCIONAR --</option><option value="time">FOR TIME</option><option value="weight">STRENGTH / KG</option><option value="reps">AMRAP</option></select></div></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Nombre del WOD</label><input placeholder="Ej: FRAN..." value={newWod.title} onChange={e => setNewWod({...newWod, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xl font-black italic text-white focus:border-emerald-500 outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Descripción</label><textarea placeholder="Detalle técnico..." value={newWod.description} onChange={e => setNewWod({...newWod, description: e.target.value})} rows={5} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:border-emerald-500 outline-none" /></div>
                  <div className="flex gap-4 pt-4"><button onClick={() => setShowWodForm(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-500 hover:text-white">Cancelar</button><button onClick={handleWodSubmit} className="flex-[2] bg-emerald-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600">Guardar Sesión</button></div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST COMPACTO */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-4 right-4 z-[500] flex justify-center pointer-events-none">
            <div className={cn("px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-xl", toast.type === 'success' ? "bg-emerald-950/90 border-emerald-500/50 text-white" : "bg-red-950/90 border-red-500/50 text-white")}>
               <div className={cn("p-1.5 rounded-full", toast.type === 'success' ? "bg-lime-400" : "bg-red-500")}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-black" /> : <ShieldAlert className="w-5 h-5 text-black" />}
               </div>
               <div className="flex flex-col">
                  <span className="text-xs font-black uppercase italic tracking-widest leading-none mb-1">{toast.message}</span>
                  <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest leading-none font-mono">System Protocol_OK</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
