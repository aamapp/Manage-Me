
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isProcessing?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isProcessing = false,
  confirmText = "ডিলিট",
  cancelText = "বাতিল",
  type = 'danger'
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 mx-auto ${type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
          <AlertTriangle size={28} />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">{title}</h3>
        <p className="text-sm text-slate-500 text-center mb-8 font-medium leading-relaxed">{message}</p>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
