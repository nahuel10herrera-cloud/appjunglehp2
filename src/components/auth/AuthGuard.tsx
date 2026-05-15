import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signIn } from '@/src/lib/firebase'; // Asegurate que signIn use GoogleAuthProvider
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { Loader2, Dumbbell, ArrowRight, Shield, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState('');
  const [wantsToBeCoach, setWantsToBeCoach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // EL USUARIO YA EXISTE: Actualizamos última entrada y cargamos perfil
          await setDoc(docRef, { lastLogin: serverTimestamp() }, { merge: true });
          const profileData = docSnap.data() as UserProfile;
          
          // Forzar rol de coach si es tu mail
          if (firebaseUser.email === 'nahuel10herrera@gmail.com' && profileData.role !== 'coach') {
             await setDoc(docRef, { role: 'coach' }, { merge: true });
             setProfile({ ...profileData, role: 'coach' });
          } else {
             setProfile(profileData);
          }
          setNeedsName(false);
        } else {
          // EL USUARIO ES NUEVO: Activamos la pantalla de "Bienvenida"
          // Pero ya guardamos el nombre que traiga de Google por defecto
          setName(firebaseUser.displayName || '');
          setNeedsName(true); 
        }
      } else {
        setProfile(null);
        setNeedsName(false);
      }
      setLoading(false);
    });
  }, []);

  const handleFinishSetup = async () => {
    if (!user || !name.trim()) return;
    setIsSubmitting(true);
    
    const userDocRef = doc(db, 'users', user.uid);
    const isOwner = user.email === 'nahuel10herrera@gmail.com';

    const newProfileData = {
      uid: user.uid,
      email: user.email,
      displayName: name.trim(),
      photoURL: user.photoURL, // Guardamos la foto de Google
      role: (wantsToBeCoach || isOwner) ? 'coach' : 'athlete' as const,
      location: 'Mendoza',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, newProfileData);
      setProfile({
        ...newProfileData,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      } as any);
      setNeedsName(false);
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn: async () => {
      try {
        await signIn(); // Llama a la función de Google en firebase.ts
      } catch (error) {
        console.error("Auth error", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Pantalla de Bienvenida para nuevos usuarios
  if (needsName) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* ... (Todo tu diseño de bienvenida se mantiene igual) ... */}
        <div className="max-w-md w-full relative z-10 text-center">
             {/* El contenido de tu formulario de bienvenida aquí */}
             <h1 className="text-white text-3xl font-black italic uppercase mb-8">Configura tu Perfil</h1>
             <input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white mb-4"
                placeholder="Tu nombre..."
             />
             <button 
                onClick={handleFinishSetup}
                className="w-full bg-emerald-600 py-4 rounded-2xl text-white font-black uppercase"
                disabled={isSubmitting}
             >
                {isSubmitting ? 'Guardando...' : 'Comenzar'}
             </button>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
