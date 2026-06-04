
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { MoreVertical, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isCurrency?: boolean;
  color: 'indigo' | 'emerald' | 'rose' | 'blue' | 'amber' | 'purple';
  onClick?: () => void;
  trend?: {
    value: number | string;
    label: string;
    isPositive: boolean;
    colorClass?: string;
  }
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, isCurrency, color, onClick, trend }) => {
  const { user } = useAppContext();
  const currency = user?.currency || '৳';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeValue = isNaN(numValue as number) ? 0 : numValue;

  // Premium Color Themes
  const themes = {
    indigo: { 
      iconBg: 'bg-indigo-50 text-indigo-600', 
      ring: 'group-hover:ring-indigo-100',
    },
    emerald: { 
      iconBg: 'bg-emerald-50 text-emerald-600', 
      ring: 'group-hover:ring-emerald-100',
    },
    rose: { 
      iconBg: 'bg-rose-50 text-rose-600', 
      ring: 'group-hover:ring-rose-100',
    },
    blue: { 
      iconBg: 'bg-blue-50 text-blue-600', 
      ring: 'group-hover:ring-blue-100',
    },
    amber: { 
      iconBg: 'bg-amber-50 text-amber-600', 
      ring: 'group-hover:ring-amber-100',
    },
    purple: { 
      iconBg: 'bg-purple-50 text-purple-600', 
      ring: 'group-hover:ring-purple-100',
    },
  }[color];

  return (
    <div 
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl p-3.5 sm:p-4
        border border-slate-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] 
        flex flex-col group transition-all duration-300
        ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-lg hover:border-transparent hover:ring-2 ' + themes.ring : ''}
      `}
    >
        <div className="flex justify-between items-center w-full">
            <div className="flex flex-col min-w-0 pr-2">
                <p className="text-slate-500 text-[14px] font-semibold tracking-wide mb-1" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{title}</p>
        
                <h3 className="text-[17px] sm:text-[19px] font-black text-slate-800 tracking-tight leading-none truncate">
                    {isCurrency ? (
                        <span className="flex items-baseline gap-1">
                            <span className="text-[14px] font-bold text-slate-400">{currency}</span>
                            <span className="truncate">{Number(safeValue).toLocaleString('en-US')}</span>
                        </span>
                    ) : (
                        <span className="truncate">{Number(safeValue).toLocaleString('en-US')}</span>
                    )}
                </h3>
            </div>
            
            <div className={`w-[36px] h-[36px] rounded-lg ${themes?.iconBg} flex items-center justify-center shrink-0`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2.5 })}
            </div>
        </div>

        {trend && (
           <div className="flex items-center gap-1 mt-3">
             <div className={`${trend.colorClass || (trend.isPositive ? 'text-emerald-500' : 'text-rose-500')} flex items-center gap-0.5 font-bold text-[12px] sm:text-[13px]`}>
               {trend.isPositive ? (
                  <ArrowUpRight size={14} strokeWidth={3} />
               ) : (
                  <ArrowDownRight size={14} strokeWidth={3} />
               )}
               <span className="tracking-tight">
                  {trend.value}{typeof trend.value === 'number' && '%'}
               </span>
             </div>
             <span className="text-[12px] sm:text-[13px] font-medium text-slate-500" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{trend.label}</span>
           </div>
        )}
    </div>
  );
};
