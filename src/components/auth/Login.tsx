import React from 'react';
import { auth } from '@/src/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { LogIn } from 'lucide-react';

export default function Login() {
  const loginConGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error login:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8">
        <h1 className="text-5xl font-black italic uppercase text-white">
          Jungle <span className="text-emerald-500">HP</span>
        </h1>
        <button 
          onClick={loginConGoogle}
          className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-3 hover:bg-emerald-500 transition-all"
        >
          <LogIn className="w-5 h-5" />
          Entrar con Google
        </button>
      </div>
    </div>
  );
}
