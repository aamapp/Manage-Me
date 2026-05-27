import React, { useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Briefcase, 
  Wallet,
  ArrowUpRight,
  Inbox,
  Music,
  LayoutDashboard,
  AlertCircle,
  Users
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { useAppContext } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, incomeRecords, user } = useAppContext();
  const currency = user?.currency || '৳';

  // Calculate dynamic stats
  const totalCollected = incomeRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalBudget = projects.reduce((acc, curr) => acc + (curr.totalamount || 0), 0);
  const totalDue = projects.reduce((acc, curr) => acc + (curr.dueamount || 0), 0);
  const totalProjects = projects.length;

  // Last 6 months Income aggregation
  const chartData = useMemo(() => {
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();
      
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlySum = incomeRecords.filter(record => {
        if (!record.date) return false;
        const [yearStr, monthStr] = record.date.split('-');
        const recYear = parseInt(yearStr);
        const recMonthIndex = parseInt(monthStr) - 1;
        
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

  // Status counters
  const pendingCount = projects.filter(p => p.status === 'Pending').length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  const statusSummary = [
    { 
      key: 'Pending', 
      label: 'পেন্ডিং', 
      count: pendingCount, 
      stroke: '#F97316', // Orange
      textColor: 'text-amber-500',
    },
    { 
      key: 'In Progress', 
      label: 'চলমান', 
      count: inProgressCount, 
      stroke: '#3b82f6', // Blue
      textColor: 'text-blue-500',
    },
    { 
      key: 'Completed', 
      label: 'সম্পন্ন', 
      count: completedCount, 
      stroke: '#10b981', // Green
      textColor: 'text-emerald-500',
    },
  ];

  const recentProjects = [...projects]
    .sort((a, b) => (b.createdat || '').localeCompare(a.createdat || ''))
    .slice(0, 5);

  const handleDueClick = () => {
    navigate('/projects', { state: { filter: 'Due' } });
  };

  const handleStatusClick = (statusKey: string) => {
    navigate('/projects', { state: { filter: statusKey } });
  };

  return (
    <div className="space-y-3.5 w-full max-w-full pt-1 pb-8 px-1 select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
      
      {/* 1. Quad Metrics Cards Grid - Dual-ring hover shadows */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          title="মোট বাজেট" 
          value={totalBudget} 
          isCurrency={true} 
          icon={<Briefcase />} 
          color="indigo" 
          trend={{
            value: "21.7%",
            label: "এই মাসে",
            isPositive: false,
            colorClass: "text-rose-500"
          }}
        />
        
        <StatCard 
          title="মোট আদায়" 
          value={totalCollected} 
          isCurrency={true} 
          icon={<Wallet />} 
          color="emerald" 
          trend={{
            value: "155%",
            label: "এই মাসে",
            isPositive: true,
            colorClass: "text-emerald-500"
          }}
        />

        <StatCard 
          title="মোট প্রজেক্ট" 
          value={totalProjects} 
          icon={<LayoutDashboard />} 
          color="blue" 
          trend={{
            value: "12%",
            label: "টি নতুন",
            isPositive: true,
            colorClass: "text-blue-500"
          }}
        />
        
        <StatCard 
          title="মোট বকেয়া" 
          value={totalDue} 
          isCurrency={true} 
          icon={<AlertCircle />} 
          color="rose" 
          onClick={handleDueClick}
          trend={{
            value: "115.4%",
            label: "এই মাসে",
            isPositive: false,
            colorClass: "text-rose-500"
          }}
        />
      </div>

      {/* 2. Monthly Income Graph Section - Shorter height & compact headers */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100/90 shadow-sm w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50/50 text-indigo-600 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">মাসিক আয়</span>
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 mt-0.5 rounded-full flex items-center gap-0.5 scale-95 origin-left">
                গত মাসের তুলনায় ▲ +155%
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center active:scale-95 hover:bg-indigo-100/70 transition-all shadow-sm"
          >
            <ArrowUpRight size={16} />
          </button>
        </div>
        
        {/* Shorter Height (h-[125px]) for compact fit */}
        <div className="h-[125px] w-full -ml-3">
          {!hasChartData ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-1.5 border border-dashed border-slate-100 rounded-3xl ml-2">
              <Wallet size={24} className="opacity-45 text-slate-400" />
              <p className="text-[10px] text-center px-4 font-bold text-slate-400">আয় বা পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncomeG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} 
                  dy={6}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 600}}
                />
                <Tooltip 
                  cursor={{stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '4 4'}}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.05)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'system-ui',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number) => [`${currency} ${value.toLocaleString('en-US')}`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncomeG)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Radial circular status gauges */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm mb-2.5">প্রজেক্ট স্ট্যাটাস</h3>
        
        <div className="grid grid-cols-3 gap-1 py-0.5">
          {statusSummary.map((status) => {
            const percent = totalProjects > 0 ? (status.count / totalProjects) * 100 : 0;
            const radius = 30; // Shrunk from 35 for compaction
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (Math.max(5, percent) / 100) * circumference;

            return (
              <div 
                key={status.key} 
                onClick={() => handleStatusClick(status.key)}
                className="flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-all text-center"
              >
                {/* Decreased visual dimension of circular container */}
                <div className="relative w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 86 86">
                    {/* Ring background circle */}
                    <circle
                      cx="43"
                      cy="43"
                      r={radius}
                      className="text-slate-100/90"
                      strokeWidth="4.5"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Dynamic colored arc progress representation */}
                    <circle
                      cx="43"
                      cy="43"
                      r={radius}
                      stroke={status.stroke}
                      strokeWidth="5.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Absolute visual content in inner circle */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-0.5">
                    <span className={`text-[9px] sm:text-[10px] font-bold ${status.textColor} leading-none mb-0.5 shadow-none`}>
                      {status.label}
                    </span>
                    <span className="text-[17px] sm:text-lg font-black text-slate-800 leading-none">
                      {status.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Projects matching List aesthetics */}
      <div className="pb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">সাম্প্রতিক প্রজেক্ট</h3>
          </div>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-[10px] sm:text-[11px] font-bold bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100/20 px-3 py-1 rounded-full transition-all active:scale-95 shadow-sm"
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400">
              <Inbox size={28} className="mx-auto mb-1.5 opacity-25 text-indigo-500" />
              <p className="text-xs font-bold text-slate-400">কোনো প্রজেক্ট এখনো তৈরি হয়নি</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.015)] active:scale-[0.98] transition-all flex items-center justify-between hover:shadow-md hover:border-slate-200/80 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2.5">
                   <div className="w-9 h-9 rounded-xl bg-indigo-50/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                     <Music size={16} strokeWidth={2.5} />
                   </div>
                   
                   <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 mb-0.5">
                         <h4 className="font-extrabold text-slate-800 text-[12px] sm:text-[13px] truncate leading-tight group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                         <span className={`w-1.5 h-1.5 rounded-full ring-2 ring-white shrink-0 ${p.status === 'Completed' ? 'bg-emerald-500' : p.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate font-semibold flex items-center gap-1 leading-none">
                         <Users size={10} className="text-slate-400" /> {p.clientname}
                      </p>
                   </div>
                </div>
                
                <div className="text-right whitespace-nowrap">
                  <p className="font-extrabold text-slate-800 text-[12px] sm:text-[13px] leading-tight">{currency} {p.totalamount?.toLocaleString('en-US')}</p>
                  <p className="text-[8px] text-slate-400 mt-1 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded inline-block">
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
