import React from 'react';
import { useAuth } from './AuthProvider';
import Login from './Login';
import { Loader2 } from 'lucide-react';

/**
 * AuthGuard: El "Portero" de Jungle HP.
 * Verifica si el usuario tiene un perfil activo antes de mostrar la app.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  // 1. MIENTRAS CARGA: Mostramos una pantalla negra con un spinner 
  // para que no haya "flasheos" blancos molestos.
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // 2. SI NO HAY PERFIL: Significa que no inició sesión con Google.
  // Lo mandamos directo a la pantalla de Login que creamos.
  if (!profile) {
    return <Login />;
  }

  // 3. TODO OK: Si hay perfil, renderizamos el Dashboard (los hijos).
  return <>{children}</>;
}
