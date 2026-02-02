
import React, { useEffect } from 'react';
import { XCircle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-50' : 'bg-rose-50';
  const borderColor = type === 'success' ? 'border-emerald-200' : 'border-rose-200';
  const textColor = type === 'success' ? 'text-emerald-800' : 'text-rose-800';
  const iconColor = type === 'success' ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div className="fixed top-24 right-6 z-[200] animate-in slide-in-from-right-10 duration-300">
      <div className={`${bgColor} ${borderColor} ${textColor} border-2 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 min-w-[300px]`}>
        <div className={iconColor}>
          {type === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{type === 'success' ? 'সফল হয়েছে!' : 'ত্রুটি!'}</p>
          <p className="text-xs opacity-90">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X size={18} className="opacity-50" />
        </button>
      </div>
    </div>
  );
};
