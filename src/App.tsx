import React from 'react';
import { AuthProvider, useAuth } from '@/src/components/auth/AuthProvider';
import Shell from '@/src/components/layout/Shell';
import AthleteView from '@/src/components/views/AthleteView';
import CoachView from '@/src/components/views/CoachView';
import { Dumbbell, LogIn } from 'lucide-react';

function AppContent() {
  const { user, profile, signIn } = useAuth();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [viewMode, setViewMode] = React.useState<'coach' | 'athlete' | undefined>();

  // Set default view mode based on role
  React.useEffect(() => {
    if (profile?.role && !viewMode) {
      setViewMode(profile.role);
    }
  }, [profile, viewMode]);

  // Set default tab based on view mode
  React.useEffect(() => {
    if (viewMode === 'athlete') {
      setActiveTab('home');
    } else if (viewMode === 'coach') {
      setActiveTab('dashboard');
    }
  }, [viewMode]);

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 relative overflow-hidden font-sans">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-700/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-800/20 rounded-full blur-[120px] -ml-48 -mb-48" />
        
        <div className="z-10 text-center space-y-12 max-w-sm">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-700 rounded-[28px] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-700/20 rotate-12 transition-transform hover:rotate-0">
              <Dumbbell className="text-lime-400 w-10 h-10" />
            </div>
            <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">Jungle <span className="text-lime-400">HP</span></h1>
            <p className="text-emerald-500 font-mono text-[10px] uppercase font-black tracking-[0.4em] leading-none">Apex Athlete Performance Hub</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tight">Entrena con <span className="text-lime-400">instinto</span>.</h2>
            <p className="text-slate-500 text-sm italic font-medium leading-relaxed">
              Monitorea cada repetición, optimiza tu recuperación y recibe feedback directo de tu coach en la jungla del <span className="text-slate-300">Alto Rendimiento</span>.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              onClick={() => signIn()}
              className="w-full group bg-emerald-700 text-white py-5 px-8 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all hover:bg-emerald-600 active:scale-95 shadow-2xl shadow-emerald-700/20"
            >
              <Dumbbell className="w-5 h-5 transition-transform group-hover:rotate-12" />
              Ingresar a la Jungla
            </button>
            <p className="text-[10px] text-slate-800 font-black uppercase tracking-[0.5em] pt-12 italic">
              ENGINEERED FOR THE WILD AT HEART
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Shell 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      {viewMode === 'coach' ? (
        <CoachView activeTab={activeTab as any} onTabChange={setActiveTab as any} />
      ) : (
        <AthleteView activeTab={activeTab as any} onTabChange={setActiveTab as any} />
      )}
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
