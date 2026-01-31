
import React, { useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Wallet,
  ArrowUpRight,
  Inbox,
  ChevronRight
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '../constants';
import { useAppContext } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, incomeRecords, user } = useAppContext();
  const currency = user?.currency || '৳';

  const totalIncome = incomeRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const ongoingProjects = projects.filter(p => p.status === 'In Progress').length;

  const chartData = useMemo(() => {
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      
      const monthlySum = incomeRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === mIdx && recordDate.getFullYear() === year;
      }).reduce((sum, rec) => sum + (rec.amount || 0), 0);

      result.push({
        name: monthNames[mIdx],
        income: monthlySum 
      });
    }
    return result;
  }, [incomeRecords]);

  const hasChartData = chartData.some(d => d.income > 0);

  const statusSummary = [
    { label: 'পেন্ডিং', count: projects.filter(p => p.status === 'Pending').length, color: 'bg-amber-500' },
    { label: 'চলমান', count: projects.filter(p => p.status === 'In Progress').length, color: 'bg-blue-500' },
    { label: 'সম্পন্ন', count: projects.filter(p => p.status === 'Completed').length, color: 'bg-emerald-500' },
  ];

  const recentProjects = [...projects].sort((a, b) => b.createdat.localeCompare(a.createdat)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">স্বাগতম, {user?.name.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 text-sm">আপনার সাউন্ড ডিজাইন প্রজেক্টের ওভারভিউ</p>
      </div>

      {/* Stats Grid - optimized for mobile 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="মোট আয়" value={totalIncome} isCurrency={true} icon={<Wallet size={20} />} />
        <StatCard title="মোট প্রজেক্ট" value={totalProjects} icon={<Briefcase size={20} />} />
        <StatCard title="সম্পন্ন" value={completedProjects} icon={<CheckCircle2 size={20} />} />
        <StatCard title="চলমান" value={ongoingProjects} icon={<Clock size={20} />} />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">মাসিক আয়</h3>
          <button 
            onClick={() => navigate('/reports')}
            className="text-indigo-600 bg-indigo-50 p-2 rounded-full active:scale-90 transition-transform"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        
        <div className="h-64 w-full">
          {!hasChartData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-2xl">
              <Wallet size={32} className="opacity-50" />
              <p className="text-xs text-center px-4">পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                />
                <Bar 
                  dataKey="income" 
                  radius={[4, 4, 4, 4]} 
                  barSize={24}
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#6366f1' : '#e0e7ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Project Status Summary */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4">প্রজেক্ট স্ট্যাটাস</h3>
        <div className="space-y-4">
          {statusSummary.map((status) => (
            <div key={status.label}>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-slate-600 font-medium">{status.label}</span>
                <span className="font-bold text-slate-800">{status.count} টি</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`${status.color} h-full transition-all duration-1000 rounded-full`} 
                  style={{ width: `${totalProjects > 0 ? (status.count / totalProjects) * 100 : 0}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects List (Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-slate-800 text-lg">সাম্প্রতিক প্রজেক্ট</h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-sm font-semibold hover:underline"
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center text-slate-400">
              <Inbox size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[80px]">
                      {PROJECT_TYPE_LABELS[p.type]}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${p.status === 'Completed' ? 'bg-emerald-500' : p.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{p.clientname}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-bold text-slate-800 text-sm">{currency} {p.totalamount.toLocaleString('bn-BD')}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{p.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
