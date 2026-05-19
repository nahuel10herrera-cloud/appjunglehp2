import React, { useState } from 'react';
import { Calculator, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RMCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [rmWeight, setRmWeight] = useState('');

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-lime-400 font-black uppercase italic tracking-widest hover:border-lime-500/50 transition-all"
      >
        <span>Calculadora de RM</span>
        <Calculator className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-sm border border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black italic uppercase">Calculadora RM</h3>
                <button onClick={() => setIsOpen(false)}><X className="w-5 h-5"/></button>
              </div>
              <input type="number" value={rmWeight} onChange={(e) => setRmWeight(e.target.value)} className="w-full bg-slate-950 p-4 rounded-xl text-center text-2xl font-black text-lime-400 mb-4" placeholder="Peso (kg)"/>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[95, 90, 85, 80, 75, 70].map(pct => (
                  <div key={pct} className="bg-slate-800 p-2 text-center rounded">{pct}%: {((Number(rmWeight) * pct) / 100).toFixed(1)}kg</div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
