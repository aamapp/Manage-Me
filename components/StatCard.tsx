
import React from 'react';
import { useAppContext } from '../context/AppContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isCurrency?: boolean;
  color: 'indigo' | 'emerald' | 'rose' | 'blue' | 'amber' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, isCurrency, color, onClick }) => {
  const { user } = useAppContext();
  const currency = user?.currency || '৳';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeValue = isNaN(numValue as number) ? 0 : numValue;

  // Premium Color Themes
  const themes = {
    indigo: { 
      iconBg: 'bg-indigo-50 text-indigo-600', 
      ring: 'group-hover:ring-indigo-100',
      gradient: 'from-indigo-500 to-violet-600'
    },
    emerald: { 
      iconBg: 'bg-emerald-50 text-emerald-600', 
      ring: 'group-hover:ring-emerald-100',
      gradient: 'from-emerald-500 to-teal-600'
    },
    rose: { 
      iconBg: 'bg-rose-50 text-rose-600', 
      ring: 'group-hover:ring-rose-100',
      gradient: 'from-rose-500 to-pink-600'
    },
    blue: { 
      iconBg: 'bg-blue-50 text-blue-600', 
      ring: 'group-hover:ring-blue-100',
      gradient: 'from-blue-500 to-cyan-600'
    },
    amber: { 
      iconBg: 'bg-amber-50 text-amber-600', 
      ring: 'group-hover:ring-amber-100',
      gradient: 'from-amber-500 to-orange-600'
    },
    purple: { 
      iconBg: 'bg-purple-50 text-purple-600', 
      ring: 'group-hover:ring-purple-100',
      gradient: 'from-purple-500 to-fuchsia-600'
    },
  }[color];

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden bg-white rounded-2xl p-4 
        border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] 
        flex flex-col justify-between h-24 group transition-all duration-300
        ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-lg' : ''}
        hover:border-transparent hover:ring-2 ${themes.ring}
      `}
    >
        {/* Abstract Background Gradient Blob */}
        <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br ${themes.gradient} opacity-[0.04] blur-xl transition-all duration-500 group-hover:opacity-[0.1] group-hover:scale-125`}></div>

        <div className="flex justify-between items-start z-10 h-full">
            <div className="flex flex-col justify-between h-full">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                    {isCurrency ? (
                        <span className="flex items-baseline gap-0.5">
                            <span className="text-xs text-slate-400 font-bold">{currency}</span>
                            {Number(safeValue).toLocaleString('en-US')}
                        </span>
                    ) : (
                        Number(safeValue).toLocaleString('en-US')
                    )}
                </h3>
            </div>
            
            <div className={`w-9 h-9 rounded-xl ${themes.iconBg} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2.5 })}
            </div>
        </div>
    </div>
  );
};
