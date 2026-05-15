import React from 'react';
import { useAuth } from './AuthProvider'; // <--- Importa del cerebro
import Login from './Login';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  if (!profile) return <Login />;

  return <>{children}</>;
}
