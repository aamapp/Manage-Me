
import React from 'react';
import { useAppContext } from '../context/AppContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isCurrency?: boolean;
  variant?: 'primary' | 'default' | 'success' | 'warning' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, isCurrency, variant = 'default' }) => {
  const { user } = useAppContext();
  const currency = user?.currency || '৳';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeValue = isNaN(numValue as number) ? 0 : numValue;

  if (variant === 'primary') {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-4 shadow-lg shadow-indigo-200 text-white flex flex-col justify-between h-24">
        <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
        
        <div className="flex justify-between items-start z-10">
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">{title}</p>
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16, color: 'white' })}
          </div>
        </div>
        
        <div className="z-10">
          <h3 className="text-xl font-bold tracking-tight">
            {isCurrency ? (
              <>
                <span className="text-base font-bold opacity-80 mr-1">{currency}</span>
                {Number(safeValue).toLocaleString('bn-BD')}
              </>
            ) : safeValue}
          </h3>
        </div>
      </div>
    );
  }

  const variantStyles = {
    default: { bg: 'bg-white', text: 'text-slate-800', border: 'border-slate-100', iconBg: 'bg-slate-50', iconColor: 'text-slate-500' },
    success: { bg: 'bg-white', text: 'text-slate-800', border: 'border-emerald-100', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    warning: { bg: 'bg-white', text: 'text-slate-800', border: 'border-amber-100', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
    info: { bg: 'bg-white', text: 'text-slate-800', border: 'border-blue-100', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' }
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div className={`${style.bg} border ${style.border} rounded-2xl p-3 shadow-sm flex flex-col justify-between h-24`}>
      <div className="flex justify-between items-start">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <div className={`${style.iconBg} ${style.iconColor} p-1.5 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
        </div>
      </div>
      <div>
         <h3 className={`text-xl font-bold ${style.text} tracking-tight`}>
          {isCurrency ? `${currency} ${Number(safeValue).toLocaleString('bn-BD')}` : safeValue}
        </h3>
      </div>
    </div>
  );
};
