import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signIn, handleFirestoreError, OperationType } from '@/src/lib/firebase';
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
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            // El usuario ya existe, actualizar lastLogin
            await setDoc(docRef, { 
              lastLogin: serverTimestamp() 
            }, { merge: true });
            
            const profileData = docSnap.data() as UserProfile;
            
            // Migrar admin a coach si es necesario (nahuel10herrera@gmail.com)
            if (user.email === 'nahuel10herrera@gmail.com' && profileData.role !== 'coach') {
              const updatedProfile = { ...profileData, role: 'coach' as const };
              await setDoc(docRef, { role: 'coach' }, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(profileData);
            }
            setNeedsName(false);
          } else {
            // El usuario NO existe: Crear documento usando setDoc con ID = user.uid
            console.log('Creando nuevo perfil de usuario para:', user.uid);
            
            const isCoach = user.email === 'nahuel10herrera@gmail.com';
            const newProfileData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Atleta Jungle',
              role: isCoach ? 'coach' : 'athlete' as const,
              location: 'Mendoza',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };

            await setDoc(docRef, newProfileData);
            
            setProfile({
              ...newProfileData,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            } as any);
            
            setNeedsName(false);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
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
    const newProfileData = {
      uid: user.uid,
      displayName: name.trim(),
      role: (wantsToBeCoach || user.email === 'nahuel10herrera@gmail.com') ? 'coach' : 'athlete' as const,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(userDocRef, newProfileData);
      setProfile({
        ...newProfileData,
        createdAt: new Date().toISOString()
      } as any);
      setNeedsName(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
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
        await signIn();
      } catch (error) {
        console.error("Auth error", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (needsName) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-100 overflow-hidden relative">
        {/* Ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-700/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-900/10 rounded-full blur-[120px] -ml-48 -mb-48" />

        <div className="max-w-md w-full relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="w-20 h-20 bg-emerald-700 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-700/20 rotate-12">
              <Dumbbell className="text-lime-400 w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-2">Bienvenido a <span className="text-lime-400">Jungle HP</span></h1>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[40px] border border-slate-800 shadow-2xl text-left"
            >
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-4 block italic">Identidad Atleta</label>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight mb-6">¿Cómo te llamas?</h2>
                  
                  <input 
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishSetup()}
                    placeholder="Escribe tu nombre..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xl font-black italic tracking-tight text-white outline-none focus:border-emerald-500 transition-all placeholder-slate-800 shadow-inner"
                  />
                </div>

                <button 
                  onClick={() => setWantsToBeCoach(!wantsToBeCoach)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-2xl border transition-all",
                    wantsToBeCoach 
                      ? "bg-emerald-700/10 border-emerald-500 text-emerald-400" 
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Shield className={cn("w-5 h-5", wantsToBeCoach ? "text-lime-400" : "text-slate-800")} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Soy Coach (Staff)</span>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    wantsToBeCoach ? "border-lime-400 bg-lime-400" : "border-slate-800"
                  )}>
                    {wantsToBeCoach && <Check className="w-3 h-3 text-slate-950" />}
                  </div>
                </button>

                <button 
                  disabled={!name.trim() || isSubmitting}
                  onClick={handleFinishSetup}
                  className="w-full bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Comenzar mi Entrenamiento
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => signIn()}
                    className="w-full text-slate-500 py-2 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Ya tengo una cuenta Staff (Google)
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-[9px] text-slate-800 font-black uppercase tracking-[0.6em] italic"
          >
            Engineering Apex Athletes
          </motion.p>
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
