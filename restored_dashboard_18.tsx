
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
  Music,
  Users
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
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      // Calculate target month and year correctly
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();
      
      // Handle year wrap-around (e.g. if now is Jan, prev months are last year)
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlySum = incomeRecords.filter(record => {
        if (!record.date) return false;
        // Parse "YYYY-MM-DD" directly to avoid timezone issues with new Date()
        const [yearStr, monthStr] = record.date.split('-');
        const recYear = parseInt(yearStr);
        const recMonthIndex = parseInt(monthStr) - 1; // 0-indexed for comparison
        
        return recMonthIndex === targetMonthIndex && recYear === targetYear;
      }).reduce((sum, rec) => sum + (rec.amount || 0), 0);

      result.push({
        name: monthNames[targetMonthIndex],
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
    <div className="space-y-5 w-full max-w-full overflow-hidden pt-2">
      {/* Stats Grid - Compact 2x2 Layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Primary Income Card */}
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
          title="সম্পন্ন" 
          value={completedProjects} 
          icon={<CheckCircle2 />} 
          variant="success"
        />
        <StatCard 
          title="চলমান" 
          value={ongoingProjects} 
          icon={<Clock />} 
          variant="info"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm w-full overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
             <h3 className="font-bold text-slate-800 text-sm">মাসিক আয়</h3>
             <p className="text-[10px] text-slate-400 font-medium mt-0.5">গত ৬ মাসের আয়ের হিসাব</p>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="text-indigo-600 bg-indigo-50 p-2 rounded-xl active:scale-90 transition-transform"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        
        <div className="h-48 w-full -ml-2">
          {!hasChartData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-2xl ml-2">
              <Wallet size={28} className="opacity-50" />
              <p className="text-[10px] text-center px-4 font-medium">পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
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
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                />
                <Bar 
                  dataKey="income" 
                  radius={[4, 4, 4, 4]} 
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
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 text-sm">প্রজেক্ট স্ট্যাটাস</h3>
        <div className="space-y-3">
          {statusSummary.map((status) => (
            <div key={status.label}>
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-slate-600 font-bold">{status.label}</span>
                <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded text-[10px]">{status.count}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
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
      <div className="pb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-slate-800 text-sm">সাম্প্রতিক প্রজেক্ট</h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-[10px] font-bold bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400">
              <Inbox size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-medium">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                   {/* Smart Icon */}
                   <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                     <Music size={20} />
                   </div>
                   
                   <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                         <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                         <span className={`w-2 h-2 rounded-full ring-1 ring-white shrink-0 ${p.status === 'Completed' ? 'bg-emerald-500' : p.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-medium">{p.clientname}</p>
                   </div>
                </div>
                
                <div className="text-right whitespace-nowrap">
                  <p className="font-bold text-slate-800 text-sm">{currency} {p.totalamount.toLocaleString('bn-BD')}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-bold bg-slate-50 px-1.5 py-0.5 rounded inline-block">
                    {p.deadline ? p.deadline : 'No Date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
