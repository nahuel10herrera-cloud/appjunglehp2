import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { logOut } from '@/src/lib/firebase';
import { Trophy, Dumbbell, ClipboardList, TrendingUp, LogOut, LayoutDashboard, Calendar, Activity, Users } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ShellProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  viewMode?: 'coach' | 'athlete';
  onViewModeChange?: (mode: 'coach' | 'athlete') => void;
}

export default function Shell({ children, activeTab, onTabChange, viewMode, onViewModeChange }: ShellProps) {
  const { profile } = useAuth();

  const navItems = (viewMode || profile?.role) === 'coach' ? [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'wods', label: 'WODs', icon: Calendar },
    { id: 'athletes', label: 'Atletas', icon: ClipboardList },
    { id: 'team', label: 'Equipo', icon: Users },
  ] : [
    { id: 'home', label: 'Hoy', icon: LayoutDashboard },
    { id: 'benchmarks', label: 'Récords', icon: Trophy },
    { id: 'stats', label: 'Evolución', icon: Activity },
    { id: 'history', label: 'Perfil', icon: TrendingUp },
    { id: 'wods', label: 'WODs', icon: Dumbbell },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans text-slate-100 pb-20 md:pb-0">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-6 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="w-8 h-8 flex items-center justify-center">
          <Dumbbell className="text-lime-400 w-5 h-5" />
        </div>
        
        <h1 className="font-black text-xl leading-tight uppercase tracking-tighter italic absolute left-1/2 -translate-x-1/2">Jungle <span className="text-lime-400">HP</span></h1>
        
        <div className="flex items-center gap-2">
          {profile?.role === 'coach' && onViewModeChange && (
            <button 
              onClick={() => onViewModeChange(viewMode === 'coach' ? 'athlete' : 'coach')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-700/20 hover:bg-emerald-600 transition-colors"
            >
              {viewMode === 'coach' ? 'Ver Atleta' : 'Ver Coach'}
            </button>
          )}
          <button 
            onClick={() => logOut()}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <Dumbbell className="text-lime-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight uppercase tracking-tighter italic">Jungle <span className="text-lime-400">HP</span></h1>
              <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-[0.2em]">{profile?.role}</p>
            </div>
          </div>

          {profile?.role === 'coach' && onViewModeChange && (
            <div className="mb-10 bg-slate-950 rounded-2xl p-4 border border-slate-800">
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 italic text-center">Modo de Vista</p>
               <div className="flex gap-2">
                 <button 
                   onClick={() => onViewModeChange('coach')}
                   className={cn(
                     "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                     viewMode === 'coach' ? "bg-emerald-700 text-white" : "bg-slate-900 text-slate-500"
                   )}
                 >
                   Coach
                 </button>
                 <button 
                   onClick={() => onViewModeChange('athlete')}
                   className={cn(
                     "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                     viewMode === 'athlete' ? "bg-emerald-700 text-white" : "bg-slate-900 text-slate-500"
                   )}
                 >
                   Atleta
                 </button>
               </div>
            </div>
          )}

          <div className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all group",
                  activeTab === item.id 
                    ? "bg-emerald-700 text-white shadow-lg shadow-emerald-700/20" 
                    : "text-slate-500 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-lime-400" : "text-emerald-500 group-hover:text-lime-400")} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-slate-800 bg-slate-950/20">
          <button 
            onClick={() => logOut()}
            className="w-full flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-lime-400 transition-colors text-[10px] font-black uppercase tracking-[0.2em] italic"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800 px-6 py-3 flex items-center justify-around z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-lime-400" : "text-slate-500"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === item.id ? "bg-emerald-700/10" : ""
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-emerald-700/5 blur-[120px] -z-10" />
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
