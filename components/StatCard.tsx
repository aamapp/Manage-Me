
import React from 'react';
import { useAppContext } from '../context/AppContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isCurrency?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, isCurrency }) => {
  const { user } = useAppContext();
  const currency = user.currency || '৳';
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">
          {isCurrency ? `${currency} ${Number(value).toLocaleString('bn-BD')}` : value}
        </h3>
      </div>
      <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
        {icon}
      </div>
    </div>
  );
};