import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isProcessing?: boolean;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "primary";
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
  type = "danger",
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-[310px] w-full p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4 mx-auto ${
            type === "danger"
              ? "bg-[#ffebeb] text-[#f04438]"
              : type === "warning"
                ? "bg-amber-50 text-amber-500"
                : "bg-indigo-50 text-indigo-500"
          }`}
        >
          {type === "danger" ? (
            <Trash size={32} strokeWidth={2} />
          ) : (
            <AlertTriangle size={32} strokeWidth={2} />
          )}
        </div>

        <h3 className="text-[22px] font-bold text-slate-900 text-center mb-2.5 leading-tight">
          {title}
        </h3>
        <p className="text-[15px] text-slate-600 text-center mb-8">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-full font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-95 text-[15px]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 py-3 rounded-full font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-[15px] ${
              type === "danger"
                ? "bg-[#f04438] hover:bg-red-600"
                : type === "warning"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-indigo-500 hover:bg-indigo-600"
            }`}
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
