import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/components/auth/AuthProvider';
import { db } from '@/src/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc, limit, deleteDoc } from 'firebase/firestore';
import { UserProfile, WellnessEntry, Wod, WorkoutSession, CoachFeedback } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, Plus, Search, Activity, History as HistoryIcon, Trophy, LayoutDashboard, ArrowUpRight, TrendingUp, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange, parseScoreToNumber } from '@/src/lib/utils';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team';
  onTabChange?: (tab: string) => void;
}

// 1. COMPONENTE DE RANKING (El motor que ordena los resultados)
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
    });
    return () => unsubscribe();
  }, [wodId, type]);

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-[32px] overflow-hidden shadow-2xl mb-6">
      <div className="p-5 bg-emerald-950/20 border-b border-slate-800/50 flex justify-between items-center">
        <h3 className="text-lime-400 font-black italic uppercase text-xs tracking-[0.2em] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-lime-400" /> Ranking Jungle HP
        </h3>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full uppercase font-black">
          {type === 'time' ? 'Por Tiempo' : type === 'weight' ? 'Por Kilos' : 'Por Reps'}
        </span>
      </div>
      <div className="divide-y divide-slate-800/30">
        {results.length > 0 ? results.map((res, index) => (
          <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all">
            <div className="flex items-center gap-4">
              <span className={`text-xl font-black italic w-8 ${index === 0 ? 'text-lime-400' : 'text-slate-700'}`}>#{index + 1}</span>
              <div>
                <p className="text-slate-100 font-black uppercase text-sm">{res.athleteName}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RPE {res.rpe} • {res.modality}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lime-400 font-black text-xl font-mono tracking-tighter leading-none">{res.score}</p>
            </div>
          </div>
        )) : <p className="p-10 text-center text-slate-600 text-[10px] uppercase font-black italic">Sin resultados todavía</p>}
      </div>
    </div>
  );
}

// 2. VISTA PRINCIPAL DEL COACH
export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team'>('dashboard');
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserProfile | null>(null);
  const [wods, setWods] = useState<Wod[]>([]);
  const [selectedWodForLeaderboard, setSelectedWodForLeaderboard] = useState<Wod | null>(null);
  const [todayWellness, setTodayWellness] = useState<Record<string, WellnessEntry>>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [copied, setCopied] = useState(false);
  const { start: weekStart, end: weekEnd } = getWeekRange();

  useEffect(() => {
    const unsubAthletes = onSnapshot(query(collection(db, 'users')), (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    });

    const unsubWods = onSnapshot(query(collection(db, 'wods'), where('date', '>=', weekStart), where('date', '<=', weekEnd), orderBy('date', 'asc')), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetched);
      if (fetched.length > 0 && !selectedWodForLeaderboard) {
        setSelectedWodForLeaderboard(fetched.find(w => w.date === getTodayDate()) || fetched[0]);
      }
    });

    return () => { unsubAthletes(); unsubWods(); };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-20">
      {/* Header */}
      <header className="space-y-3">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Jungle Coach <span className="text-lime-400">/ Staff</span></h2>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-hide">
          {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' }, { id: 'pulse', icon: Activity, label: 'Pulse' }, { id: 'athletes', icon: Users, label: 'Atletas' }, { id: 'wods', icon: Calendar, label: 'Prog' }, { id: 'leaderboard', icon: Trophy, label: 'Rank' }, { id: 'team', icon: Users, label: 'Team' }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex-1 flex flex-col items-center py-2.5 rounded-xl text-[8px] font-black uppercase transition-all", activeTab === item.id ? "bg-emerald-700 text-white" : "text-slate-500")}>
              <item.icon className="w-4 h-4 mb-1" /> {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white font-black italic uppercase text-lg">
              <p className="text-[8px] text-slate-500 mb-1">ATLETAS</p> {athletes.length}
            </div>
            {/* Aquí podés agregar más estadísticas */}
          </div>

          <section className="bg-slate-900 rounded-[28px] p-6 border border-slate-800">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-lime-400" />
              <h3 className="text-sm font-black italic uppercase tracking-tighter text-slate-100">WOD del día</h3>
            </div>
            
            {/* RANKING EN EL DASHBOARD */}
            {wods.find(w => w.date === getTodayDate()) ? (
              <WodRanking 
                wodId={wods.find(w => w.date === getTodayDate())!.id!} 
                type={wods.find(w => w.date === getTodayDate())!.type as any} 
              />
            ) : (
              <p className="text-slate-600 italic text-[10px] uppercase font-black">No hay WOD programado para hoy</p>
            )}
          </section>
        </div>
      )}

      {/* RANKING (Leaderboard) */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-2xl">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 p-1">
              {wods.map(wod => (
                <button key={wod.id} onClick={() => setSelectedWodForLeaderboard(wod)} className={cn("px-5 py-2 rounded-xl text-[10px] font-black uppercase border transition-all whitespace-nowrap", selectedWodForLeaderboard?.id === wod.id ? "bg-emerald-700 border-emerald-500 text-white" : "bg-slate-950 border-slate-800 text-slate-500")}>
                  {wod.title}
                </button>
              ))}
            </div>
            {selectedWodForLeaderboard && <WodRanking wodId={selectedWodForLeaderboard.id!} type={selectedWodForLeaderboard.type as any} />}
          </div>
        </div>
      )}

      {/* Otras pestañas simplificadas por espacio, podés agregar el resto de tu lógica de atletas/team aquí */}
    </div>
  );
}
