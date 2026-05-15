import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signIn } from '@/src/lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { Loader2 } from 'lucide-react';

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

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Atleta',
            role: firebaseUser.email === 'nahuel10herrera@gmail.com' ? 'coach' : 'athlete',
            createdAt: serverTimestamp()
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile as any);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const value = { user, profile, loading, signIn: async () => { await signIn(); } };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ESTO ES LO QUE FALTA O ESTÁ DANDO ERROR:
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
