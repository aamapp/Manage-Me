
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
  Inbox
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">স্বাগতম, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">আপনার ড্যাশবোর্ড ওভারভিউ</p>
        </div>
      </div>

      {/* Stats Grid - Revised Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Primary Income Card - Takes Full Width on very small, but 2 cols here as configured in StatCard */}
        <StatCard 
          title="মোট আয়" 
          value={totalIncome} 
          isCurrency={true} 
          icon={<Wallet />} 
          variant="primary"
        />
        
        {/* Secondary Cards */}
        <StatCard 
          title="মোট প্রজেক্ট" 
          value={totalProjects} 
          icon={<Briefcase />} 
          variant="default"
        />
        <StatCard 
          title="চলমান" 
          value={ongoingProjects} 
          icon={<Clock />} 
          variant="info"
        />
         <StatCard 
          title="সম্পন্ন" 
          value={completedProjects} 
          icon={<CheckCircle2 />} 
          variant="success"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm w-full overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
             <h3 className="font-bold text-slate-800 text-lg">মাসিক আয়</h3>
             <p className="text-xs text-slate-400 font-medium">গত ৬ মাসের হিসাব</p>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="text-indigo-600 bg-indigo-50 p-3 rounded-2xl active:scale-90 transition-transform"
          >
            <ArrowUpRight size={20} />
          </button>
        </div>
        
        <div className="h-64 w-full -ml-2">
          {!hasChartData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-2xl ml-2">
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
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 500}}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 8}}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '12px 16px'
                  }}
                  formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                />
                <Bar 
                  dataKey="income" 
                  radius={[6, 6, 6, 6]} 
                  barSize={20}
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#6366f1' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Project Status Summary */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6 text-lg">প্রজেক্ট স্ট্যাটাস</h3>
        <div className="space-y-5">
          {statusSummary.map((status) => (
            <div key={status.label}>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-slate-600 font-bold">{status.label}</span>
                <span className="font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg">{status.count}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className={`${status.color} h-full transition-all duration-1000 rounded-full shadow-sm`} 
                  style={{ width: `${totalProjects > 0 ? (status.count / totalProjects) * 100 : 0}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects List (Cards) */}
      <div className="pb-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-slate-800 text-lg">সাম্প্রতিক প্রজেক্ট</h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-sm font-bold bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center text-slate-400">
              <Inbox size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg truncate max-w-[100px]">
                      {PROJECT_TYPE_LABELS[p.type]}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${p.status === 'Completed' ? 'bg-emerald-500' : p.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-base truncate mb-0.5">{p.name}</h4>
                  <p className="text-xs text-slate-500 truncate font-medium">{p.clientname}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-black text-slate-800 text-base">{currency} {p.totalamount.toLocaleString('bn-BD')}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold bg-slate-50 px-2 py-0.5 rounded-md inline-block">{p.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
