
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, Play, CheckCircle2 } from 'lucide-react';

interface StatusPickerProps {
  value: string;
  onChange: (status: string) => void;
  options: Record<string, string>;
  label?: string;
}

export const StatusPicker: React.FC<StatusPickerProps> = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock size={16} className="text-amber-500" />;
      case 'In Progress': return <Play size={16} className="text-blue-500" />;
      case 'Completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          <span className="text-sm">{options[value] || value}</span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top">
          <div className="p-1.5 flex flex-col gap-1">
            {Object.entries(options).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-3 rounded-xl flex items-center justify-between transition-colors group ${value === key ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(key)} border`}>
                    {getStatusIcon(key)}
                  </div>
                  <span className="text-sm font-bold">{label}</span>
                </div>
                {value === key && (
                  <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm">
                    <Check size={12} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
