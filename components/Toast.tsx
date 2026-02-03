
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
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-50' : 'bg-rose-50';
  const borderColor = type === 'success' ? 'border-emerald-200' : 'border-rose-200';
  const textColor = type === 'success' ? 'text-emerald-800' : 'text-rose-800';
  const iconColor = type === 'success' ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in zoom-in-95 fade-in duration-300 w-full max-w-sm px-6 pointer-events-none">
      <div className={`${bgColor} ${borderColor} ${textColor} border-2 px-4 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto`}>
        <div className={iconColor}>
          {type === 'success' ? <CheckCircle size={28} /> : <XCircle size={28} />}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{type === 'success' ? 'সফল হয়েছে!' : 'ত্রুটি!'}</p>
          <p className="text-xs opacity-90 font-medium leading-relaxed">{message}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 -mr-2 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X size={18} className="opacity-50" />
        </button>
      </div>
    </div>
  );
};
