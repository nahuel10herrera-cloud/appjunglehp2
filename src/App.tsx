import React from 'react';
import { AuthProvider, useAuth } from '@/src/components/auth/AuthProvider';
import { AuthGuard } from '@/src/components/auth/AuthGuard'; // <-- FALTA ESTO
import Shell from '@/src/components/layout/Shell';
import AthleteView from '@/src/components/views/AthleteView';
import CoachView from '@/src/components/views/CoachView';

function AppContent() {
  const { profile } = useAuth(); // Ya no necesitamos 'user' ni 'signIn' acá, lo maneja el Guard
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [viewMode, setViewMode] = React.useState<'coach' | 'athlete' | undefined>();

  // Setea el modo de vista inicial según el rol
  React.useEffect(() => {
    if (profile?.role && !viewMode) {
      setViewMode(profile.role);
    }
  }, [profile, viewMode]);

  // Ajusta la pestaña según el modo
  React.useEffect(() => {
    if (viewMode === 'athlete') {
      setActiveTab('home');
    } else if (viewMode === 'coach') {
      setActiveTab('dashboard');
    }
  }, [viewMode]);

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

// EL SECRETO ESTÁ ACÁ ABAJO:
export default function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    </AuthProvider>
  );
}
