import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/components/auth/AuthGuard';
import { db } from '@/src/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc, limit, deleteDoc } from 'firebase/firestore';
import { UserProfile, WellnessEntry, Wod, WorkoutSession, CoachFeedback } from '@/src/types';
import { handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Calendar, Plus, MessageSquare, Send, ChevronRight, Search, Activity, History as HistoryIcon, Clock, Weight, Repeat, FileText, Trophy, Medal, LayoutDashboard, Share2, ArrowUpRight, TrendingUp, Dumbbell, AlertTriangle, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { cn, formatDate, getTodayDate, getWeekRange } from '@/src/lib/utils';

interface CoachViewProps {
  activeTab?: 'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team';
  onTabChange?: (tab: string) => void;
}

export default function CoachView({ activeTab: propsTab, onTabChange }: CoachViewProps) {
  const { profile } = useAuth();
  const [internalTab, setInternalTab] = useState<'athletes' | 'wods' | 'leaderboard' | 'dashboard' | 'pulse' | 'team'>('dashboard');
  
  const activeTab = propsTab || internalTab;
  const setActiveTab = (tab: any) => onTabChange ? onTabChange(tab) : setInternalTab(tab);

  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserProfile | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

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
    
    const confirmDelete = window.confirm('¿Estás seguro de eliminar a este atleta? Esta acción no se puede deshacer');
    if (!confirmDelete) return;
    
    try {
      console.log('Ejecutando borrado en Firebase para ID:', userId);
      await deleteDoc(doc(db, 'users', userId));
      
      // Actualización de Interfaz (Optimistic UI)
      setAthletes(prev => prev.filter(athlete => athlete.uid !== userId));
      
      setToast({ message: 'Atleta eliminado correctamente', type: 'success' });
    } catch (e) {
      console.error('Error detallado al eliminar atleta:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
    }
  };

  const [athleteData, setAthleteData] = useState<{ wellness: WellnessEntry[], sessions: WorkoutSession[] }>({ wellness: [], sessions: [] });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
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
  const [leaderboardData, setLeaderboardData] = useState<(WorkoutSession & { athleteName?: string, athletePhoto?: string })[]>([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'All' | 'Rx' | 'Scaled'>('All');
  const [todaySessions, setTodaySessions] = useState<(WorkoutSession & { athleteName?: string })[]>([]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredAthletes = athletes.filter(a => 
    a.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const [todayWellness, setTodayWellness] = useState<Record<string, WellnessEntry>>({});

  useEffect(() => {
    // List all users
    const athletesQuery = query(collection(db, 'users'));
    const unsubAthletes = onSnapshot(athletesQuery, (snap) => {
      setAthletes(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // List today's wellness for badges
    const today = getTodayDate();
    const wellnessQuery = query(collection(db, 'wellness_logs'), where('date', '==', today));
    const unsubWellness = onSnapshot(wellnessQuery, (snap) => {
      const wMap: Record<string, WellnessEntry> = {};
      snap.docs.forEach(d => { wMap[d.data().athleteId] = d.data() as WellnessEntry; });
      setTodayWellness(wMap);
    });

    // List WODs for current week
    const wodsQuery = query(
      collection(db, 'wods'), 
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd),
      orderBy('date', 'asc')
    );
    const unsubWods = onSnapshot(wodsQuery, (snap) => {
      const fetchedWods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      setWods(fetchedWods);
      // Automatically select the first one (closest) for the leaderboard
      if (fetchedWods.length > 0 && !selectedWodForLeaderboard) {
        setSelectedWodForLeaderboard(fetchedWods.find(w => w.date === today) || fetchedWods[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wods');
    });

    // Recent sessions for dashboard
    const recentQuery = query(collection(db, 'workout_results'), orderBy('createdAt', 'desc'), limit(5));
    const unsubRecent = onSnapshot(recentQuery, (snap) => {
      setRecentSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    // Today's sessions for Daily Pulse
    const todaySessionsQuery = query(collection(db, 'workout_results'), where('date', '==', getTodayDate()));
    const unsubTodaySessions = onSnapshot(todaySessionsQuery, (snap) => {
      setTodaySessions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    });

    return () => {
      unsubAthletes();
      unsubWellness();
      unsubWods();
      unsubRecent();
      unsubTodaySessions();
    };
  }, []);

  useEffect(() => {
    if (!selectedWodForLeaderboard) return;

    const q = query(
      collection(db, 'workout_results'),
      where('wodId', '==', selectedWodForLeaderboard.id),
      orderBy('score', 'asc')
    );

    const unsubLeaderboard = onSnapshot(q, (snap) => {
      setLeaderboardData(snap.docs.map(d => {
        const data = d.data();
        const athlete = athletes.find(a => a.uid === data.athleteId);
        return {
          id: d.id,
          ...data,
          athleteName: athlete?.displayName || 'Atleta',
          athletePhoto: athlete?.photoURL
        };
      }) as any);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workout_results');
    });

    return () => unsubLeaderboard();
  }, [selectedWodForLeaderboard, athletes]);

  useEffect(() => {
    if (!selectedAthlete) return;

    const wellnessQuery = query(collection(db, 'wellness_logs'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'));
    const sessionQuery = query(collection(db, 'workout_results'), where('athleteId', '==', selectedAthlete.uid), orderBy('date', 'desc'));
    const feedbackQuery = query(collection(db, 'coach_feedback'), where('athleteId', '==', selectedAthlete.uid), orderBy('createdAt', 'desc'));

    const unsubWellness = onSnapshot(wellnessQuery, (snap) => {
      setAthleteData(prev => ({ ...prev, wellness: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WellnessEntry) }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wellness_logs');
    });
    const unsubSessions = onSnapshot(sessionQuery, (snap) => {
      setAthleteData(prev => ({ ...prev, sessions: snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkoutSession) }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workout_results');
    });
    const unsubFeedback = onSnapshot(feedbackQuery, (snap) => {
      setFeedbackHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CoachFeedback));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coach_feedback');
    });

    return () => {
      unsubWellness();
      unsubSessions();
      unsubFeedback();
    };
  }, [selectedAthlete]);

  const handleWodSubmit = async () => {
    try {
      if (editingWod) {
        await setDoc(doc(db, 'wods', editingWod.id!), {
          ...editingWod,
          title: newWod.title,
          description: newWod.description,
          type: newWod.type,
          date: newWod.date,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'wods'), {
          ...newWod,
          coachId: profile?.uid,
          components: [],
          createdAt: serverTimestamp()
        });
      }
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
      setEditingWod(null);
      setShowWodForm(false);
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'wods');
    }
  };

  const handleWodDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este WOD?')) return;
    try {
      await deleteDoc(doc(db, 'wods', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'wods');
    }
  };

  const openWodForm = (wod?: Wod) => {
    if (wod) {
      setEditingWod(wod);
      setNewWod({ 
        title: wod.title || '', 
        description: wod.description || '', 
        date: wod.date || getTodayDate(), 
        type: wod.type || '' 
      });
    } else {
      setEditingWod(null);
      setNewWod({ title: '', description: '', type: '', date: getTodayDate() });
    }
    setShowWodForm(true);
  };

  const [adviceText, setAdviceText] = useState('');

  const enviarMensaje = (texto: string) => {
    // Función vacía para conectar API en el futuro
    console.log('API Placeholder: Enviando mensaje...', texto);
  };

  const handleAdviceSubmit = async () => {
    if (!adviceText.trim() || !selectedAthlete || !profile) return;
    
    console.log('Capturando consejo:', adviceText);
    enviarMensaje(adviceText);
    
    const targetId = athleteData.sessions[0]?.id || 'direct';
    const type = athleteData.sessions[0] ? 'session' : 'wellness';

    try {
      await addDoc(collection(db, 'coach_feedback'), {
        coachId: profile.uid,
        athleteId: selectedAthlete.uid,
        targetId,
        targetType: type,
        content: adviceText,
        createdAt: serverTimestamp()
      });
      setAdviceText('');
      setToast({ message: 'Consejo enviado', type: 'success' });
    } catch (e) { 
      handleFirestoreError(e, OperationType.CREATE, 'coach_feedback');
    }
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
    <div className="space-y-6 max-w-5xl mx-auto px-4">
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
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-lime-400" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Jungle Coach <span className="text-lime-400">/ Staff</span></h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Elite Performance Management</p>
          </div>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full overflow-x-auto scrollbar-hide">
          {[
            { id: 'dashboard', label: '', icon: LayoutDashboard, tooltip: 'Inicio' },
            { id: 'pulse', label: '', icon: Activity, tooltip: 'Pulse' },
            { id: 'athletes', label: '', icon: Users, tooltip: 'Atletas' },
            { id: 'wods', label: '', icon: Calendar, tooltip: 'Prog' },
            { id: 'leaderboard', label: '', icon: Trophy, tooltip: 'Rank' },
            { id: 'team', label: '', icon: Users, tooltip: 'Team' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === item.id ? "bg-emerald-700 text-white shadow-lg" : "text-slate-500"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.tooltip}</span>
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* Stats Bar Compacted */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Atletas', value: athletes.length, icon: Users, color: 'text-lime-400' },
              { label: 'Reportes', value: Object.keys(todayWellness).length, icon: Activity, color: 'text-emerald-500' },
              { label: 'WODs', value: wods.length, icon: Calendar, color: 'text-emerald-500' },
              { label: 'Avg. RPE', value: '7.8', icon: TrendingUp, color: 'text-lime-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900 p-4 rounded-[20px] border border-slate-800 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-1">
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">{stat.label}</p>
                   <stat.icon className={cn("w-3 h-3", stat.color)} />
                </div>
                <div className="text-xl font-black italic tracking-tighter text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-slate-900 rounded-[28px] p-4 border border-slate-800">
                <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 text-slate-100 mb-3">
                  <Activity className="w-4 h-4 text-lime-400" />
                  Readiness Team
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {athletes.map(athlete => (
                    <button
                      key={athlete.uid}
                      onClick={() => {
                        setSelectedAthlete(athlete);
                        setActiveTab('athletes');
                      }}
                      className="group bg-slate-950 rounded-xl p-1.5 border border-slate-800 hover:border-emerald-700/50 transition-all text-center"
                    >
                      <div className="relative inline-block mb-1">
                        <img 
                          src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} 
                          className="w-8 h-8 rounded-lg object-cover mx-auto"
                          alt="" 
                        />
                        {todayWellness[athlete.uid] && (
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950",
                            getDayReadinessColor([todayWellness[athlete.uid]])
                          )} />
                        )}
                      </div>
                      <p className="text-[7px] font-black uppercase truncate w-full">{athlete.displayName.split(' ')[0]}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 rounded-[28px] p-4 border border-slate-800">
                <h3 className="text-sm font-black italic uppercase tracking-tighter flex items-center gap-2 mb-3">
                  <HistoryIcon className="w-4 h-4 text-emerald-500" />
                  Últimas Sesiones
                </h3>
                <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
                  {recentSessions.map(session => (
                    <div key={session.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex items-center justify-between hover:bg-slate-900/50 transition-all cursor-pointer" onClick={() => {
                      const ath = athletes.find(a => a.uid === session.athleteId);
                      if (ath) { setSelectedAthlete(ath); setActiveTab('athletes'); }
                    }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-[7px] font-black border border-slate-800 italic">{session.athleteName?.[0]}</div>
                        <div>
                          <p className="text-[10px] font-black italic uppercase">{session.athleteName}</p>
                          <p className="text-[7px] text-slate-600 uppercase font-bold">{session.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black italic text-lime-400">{session.score}</p>
                        <p className="text-[7px] text-slate-700 uppercase font-black">RPE {session.rpe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="bg-emerald-700 rounded-[28px] p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full min-h-[280px]">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none mb-3">BOX <br/><span className="text-lime-400">ACCESS</span></h3>
                  <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-950/10 mb-4 font-mono text-[8px] break-all italic opacity-60">
                    {window.location.host}
                  </div>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="w-full bg-lime-400 text-slate-950 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {copied ? '¡COPIADO!' : 'COPIAR LINK'} 
                  <ArrowUpRight className="w-3 h-3" />
                </button>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-950/5 rounded-full blur-[40px]" />
              </section>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'athletes' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {!selectedAthlete ? (
            <div className="bg-slate-900 rounded-[28px] p-4 border border-slate-800">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700" />
                <input 
                  placeholder="FILTRAR..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-[9px] font-black uppercase tracking-widest outline-none focus:border-emerald-700 text-slate-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredAthletes.map((athlete) => (
                  <button
                    key={athlete.uid}
                    onClick={() => setSelectedAthlete(athlete)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-emerald-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-8 h-8 rounded-lg border border-slate-800" alt="" />
                        {todayWellness[athlete.uid] && (
                          <div className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950", getDayReadinessColor([todayWellness[athlete.uid]]))} />
                        )}
                      </div>
                      <p className="text-xs font-black italic uppercase tracking-tighter truncate">{athlete.displayName}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button 
                onClick={() => setSelectedAthlete(null)} 
                className="text-[9px] font-black uppercase tracking-widest text-emerald-500 italic flex items-center gap-1.5"
              >
                ← Volver a la lista
              </button>
              
              <div className="bg-slate-900 rounded-[28px] p-5 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-5">
                  <img src={selectedAthlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAthlete.uid}`} className="w-12 h-12 rounded-xl border border-slate-800" alt="" />
                  <div>
                    <h3 className="text-lg font-black italic uppercase tracking-tighter leading-none">{selectedAthlete.displayName}</h3>
                    <p className="text-[8px] text-slate-600 uppercase font-black mt-1 italic tracking-widest">Athlete Profile</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase text-slate-500">Readiness</p>
                    <div className={cn("w-3 h-3 rounded-full shadow-lg shadow-current", getDayReadinessColor(athleteData.wellness))} />
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase text-slate-500">Último RPE</p>
                    <p className="text-sm font-black italic text-lime-400">{athleteData.sessions[0]?.rpe || '--'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800 text-slate-100">
                   <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-600 italic">Historial Reciente</h4>
                   <div className="space-y-1.5">
                     {athleteData.sessions.slice(0, 3).map(s => (
                       <div key={s.id} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <span className="text-[7px] text-slate-500 font-mono uppercase">{s.date.split('-').slice(1).join('/')}</span>
                            <p className="text-[10px] font-black italic uppercase text-lime-400">{s.score}</p>
                         </div>
                         <p className="text-[8px] text-slate-600 uppercase font-black">RPE {s.rpe}</p>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Advice Input Integrated Footer */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                   <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                     <input 
                       placeholder="DAR CONSEJO..." 
                       value={adviceText}
                       onChange={(e) => setAdviceText(e.target.value)}
                       className="flex-1 bg-transparent px-3 py-2 text-[10px] font-black uppercase outline-none text-slate-300 placeholder-slate-800 italic"
                       onKeyDown={(e) => { if (e.key === 'Enter') handleAdviceSubmit(); }}
                     />
                     <button 
                       onClick={handleAdviceSubmit}
                       disabled={!adviceText.trim() || !profile}
                       className="bg-emerald-700 text-white px-5 rounded-lg text-[10px] font-black uppercase active:scale-95 transition-all"
                     >
                       OK
                     </button>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pulse' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Daily Pulse
          </h3>
          <div className="space-y-2">
            {athletes.filter(a => a.role === 'athlete').map(athlete => {
                const wellness = todayWellness[athlete.uid];
                const session = todaySessions.find(s => s.athleteId === athlete.uid);
                return (
                  <div key={athlete.uid} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={athlete.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.uid}`} className="w-10 h-10 rounded-xl" alt="" />
                      <div>
                        <p className="text-xs font-black uppercase italic leading-none">{athlete.displayName}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{wellness ? 'Reportado' : 'Pendiente'}</p>
                      </div>
                    </div>
                    {session && <p className="text-sm font-black italic text-lime-400">{session.score}</p>}
                  </div>
                );
            })}
          </div>
        </div>
      )}

      {activeTab === 'wods' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl p-4 rounded-3xl border border-zinc-800 shadow-2xl">
            <h3 className="text-sm font-black italic uppercase tracking-tighter text-slate-100 px-2 flex items-center gap-2">
               <Calendar className="w-4 h-4 text-emerald-500" />
               Programación Semanal
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black uppercase text-slate-600 italic tracking-[0.2em]">Semana Actual</span>
              <button onClick={() => openWodForm()} className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-900/20">
                <Plus className="w-4 h-4" /> Nuevo WOD
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {weekDates.map((date, idx) => {
              const dayWods = wods.filter(w => w.date === date);
              const isToday = date === getTodayDate();
              
              return (
                <div key={date} className={cn(
                  "bg-zinc-900/40 backdrop-blur-sm rounded-[32px] border p-6 flex flex-col transition-all relative overflow-hidden",
                  isToday ? "border-emerald-500/50 bg-slate-900/60 ring-1 ring-emerald-500/20 shadow-2xl shadow-emerald-900/20" : "border-zinc-800/50 shadow-xl"
                )}>
                  {isToday && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />}
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 italic", isToday ? "text-emerald-400" : "text-zinc-600")}>
                        {weekDays[idx]}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400 opacity-60 tracking-wider">
                         {date.split('-').slice(2)[0]}.{date.split('-').slice(1,2)[0]}
                      </p>
                    </div>
                    {isToday && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                  </div>

                  <div className="flex-1 space-y-3 relative z-10">
                    {dayWods.length > 0 ? (
                      dayWods.map(wod => (
                        <div key={wod.id} className="group bg-slate-950/80 p-5 rounded-2xl border border-zinc-800/80 hover:border-emerald-700/50 transition-all shadow-inner">
                          <h4 className="text-xs font-black uppercase italic leading-tight text-white line-clamp-1 mb-1.5">{wod.title}</h4>
                          <p className="text-[9px] text-zinc-500 line-clamp-2 mt-1 italic leading-relaxed font-medium">"{wod.description}"</p>
                          
                          <div className="flex gap-4 mt-5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <button onClick={() => openWodForm(wod)} className="text-[8px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Editar</button>
                            <button onClick={() => handleWodDelete(wod.id!)} className="text-[8px] font-black uppercase text-red-500/70 hover:text-red-400 transition-colors">Borrar</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingWod(null);
                          setNewWod({ title: '', description: '', type: '', date });
                          setShowWodForm(true);
                        }}
                        className="w-full h-full min-h-[100px] border border-dashed border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center gap-3 group hover:border-emerald-700/50 transition-all hover:bg-emerald-700/5"
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest group-hover:text-emerald-500 transition-colors">Programar WOD</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
              {wods.map(wod => (
                <button 
                  key={wod.id} 
                  onClick={() => setSelectedWodForLeaderboard(wod)}
                  className={cn("px-4 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all whitespace-nowrap", selectedWodForLeaderboard?.id === wod.id ? "bg-emerald-700 border-emerald-700" : "bg-slate-950 border-slate-800 text-slate-600")}
                >
                  {wod.title}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {leaderboardData.map((entry, idx) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black italic text-slate-700 w-4">#{idx+1}</span>
                    <img src={entry.athletePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.athleteId}`} className="w-8 h-8 rounded-full" alt="" />
                    <p className="text-xs font-black uppercase italic tracking-tight">{entry.athleteName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black italic text-lime-400 leading-none">{entry.score}</p>
                    <p className="text-[7px] text-slate-600 uppercase font-black">RPE {entry.rpe}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-black italic uppercase mb-4">Gestión de Staff</h3>
            <div className="space-y-2">
              {athletes.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                   <div className="flex items-center gap-3">
                     <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-8 h-8 rounded-lg" alt="" />
                     <p className="text-xs font-black uppercase truncate max-w-[120px]">{user.displayName}</p>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => handleRoleChange(user.uid, user.role === 'coach' ? 'athlete' : 'coach')}
                       className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase", user.role === 'coach' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-700 text-white")}
                     >
                       {user.role === 'coach' ? 'Atleta' : 'Coach'}
                     </button>
                     <button onClick={() => handleDeleteAthlete(user.uid)} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WOD Form Modal Compact */}
      <AnimatePresence>
        {showWodForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 p-8 rounded-[32px] w-full max-w-lg border border-slate-800"
            >
              <h3 className="text-2xl font-black italic uppercase text-center mb-6">{editingWod ? 'EDIT' : 'NEW'} WOD</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" value={newWod.date} onChange={e => setNewWod({...newWod, date: e.target.value})} />
                   <input type="text" placeholder="TIPO (AMRAP...)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase" value={newWod.type} onChange={e => setNewWod({...newWod, type: e.target.value})} />
                </div>
                <input type="text" placeholder="TITLE" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-black italic" value={newWod.title} onChange={e => setNewWod({...newWod, title: e.target.value})} />
                <textarea className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm" rows={5} placeholder="DESCRIPTION..." value={newWod.description} onChange={e => setNewWod({...newWod, description: e.target.value})} />
                <div className="flex gap-3">
                  <button onClick={() => setShowWodForm(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                  <button onClick={handleWodSubmit} className="flex-2 bg-emerald-700 text-white py-3 px-8 rounded-xl font-black uppercase text-[10px]">{editingWod ? 'Update' : 'Post'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}