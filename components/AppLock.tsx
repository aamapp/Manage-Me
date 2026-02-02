
import React, { useState, useEffect } from 'react';
import { Delete, Lock, Unlock, X } from 'lucide-react';

interface AppLockProps {
  mode: 'unlock' | 'setup';
  onSuccess: (pin: string) => void;
  onCancel?: () => void; // Optional cancel for setup or internal verify
  savedPin?: string | null; // For unlock mode verification
}

export const AppLock: React.FC<AppLockProps> = ({ mode, onSuccess, onCancel, savedPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [firstPin, setFirstPin] = useState('');

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  // Check PIN when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      if (mode === 'unlock') {
        if (pin === savedPin) {
          onSuccess(pin);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 300);
        }
      } else if (mode === 'setup') {
        if (!confirmStep) {
          // Move to confirm step
          setFirstPin(pin);
          setConfirmStep(true);
          setPin('');
        } else {
          // Verify confirmation
          if (pin === firstPin) {
            onSuccess(pin);
          } else {
            setError(true); // PIN mismatch
            setTimeout(() => {
              setPin('');
              setConfirmStep(false);
              setFirstPin('');
            }, 500);
          }
        }
      }
    }
  }, [pin, mode, savedPin, confirmStep, firstPin, onSuccess]);

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-300">
      
      {/* Show Cancel/Close button if onCancel is provided (e.g. inside Settings) */}
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      )}

      <div className="mb-8 flex flex-col items-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${error ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
          {error ? <Lock size={32} /> : <Unlock size={32} />}
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {mode === 'unlock' ? 'অ্যাপ লক' : confirmStep ? 'পিন নিশ্চিত করুন' : 'নতুন পিন দিন'}
        </h2>
        <p className={`text-sm font-medium ${error ? 'text-rose-400' : 'text-slate-400'}`}>
          {error 
            ? (mode === 'unlock' ? 'ভুল পিন! আবার চেষ্টা করুন' : 'পিন মিলছে না!') 
            : (mode === 'unlock' ? 'আপনার পিন কোড দিন' : '৪ সংখ্যার পিন সেট করুন')}
        </p>
      </div>

      {/* PIN Dots */}
      <div className="flex gap-4 mb-10">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              i < pin.length 
                ? (error ? 'bg-rose-500 scale-110' : 'bg-indigo-500 scale-110') 
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:scale-95 transition-all text-2xl font-bold text-white flex items-center justify-center mx-auto"
          >
            {num}
          </button>
        ))}
        
        {/* Empty Space for alignment */}
        <div className="flex items-center justify-center" />
        
        <button
          onClick={() => handlePress('0')}
          className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:scale-95 transition-all text-2xl font-bold text-white flex items-center justify-center mx-auto"
        >
          0
        </button>
        
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full hover:bg-slate-700 active:scale-95 transition-all text-rose-500 flex items-center justify-center mx-auto"
        >
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
};
