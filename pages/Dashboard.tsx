
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
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useAppContext } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, incomeRecords, user } = useAppContext();
  const currency = user?.currency || '৳';

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate Stats
  const totalCollected = incomeRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalBudget = projects.reduce((acc, curr) => acc + (curr.totalamount || 0), 0);
  const totalDue = projects.reduce((acc, curr) => acc + (curr.dueamount || 0), 0);
  const totalProjects = projects.length;

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

  const currentMonthIncome = chartData[5]?.income || 0;
  const prevMonthIncome = chartData[4]?.income || 0;
  let percentageChange = 0;
  if (prevMonthIncome === 0) {
    if (currentMonthIncome > 0) percentageChange = 100;
  } else {
    percentageChange = Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100);
  }
  const isPositive = percentageChange >= 0;
  const changeColor = isPositive ? "text-emerald-600" : "text-rose-600";
  const changeIcon = isPositive ? "▲" : "▼";
  const changeSign = isPositive ? "+" : "";
  const badgeTheme = isPositive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600";
  const outerTheme = isPositive ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100";
  const currentMonthName = chartData[5]?.name || "বর্তমান";

  // Added 'key' to identify status for filtering
  const statusSummary = [
    { key: 'Pending', label: 'পেন্ডিং', count: projects.filter(p => p.status === 'Pending').length, textColor: 'text-amber-500' },
    { key: 'In Progress', label: 'চলমান', count: projects.filter(p => p.status === 'In Progress').length, textColor: 'text-blue-500' },
    { key: 'Completed', label: 'সম্পন্ন', count: projects.filter(p => p.status === 'Completed').length, textColor: 'text-emerald-500' },
  ];

  const recentProjects = [...projects].sort((a, b) => b.createdat.localeCompare(a.createdat)).slice(0, 5);

  const handleDueClick = () => {
    // Navigate to projects page with a state to trigger the 'Due' filter
    navigate('/projects', { state: { filter: 'Due' } });
  };

  const handleStatusClick = (statusKey: string) => {
    navigate('/projects', { state: { filter: statusKey } });
  };

  return (
    <div className="space-y-4 w-full max-w-full pt-1 pb-4 px-1">
      {/* Stats Grid - Responsive columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Row 1 */}
        <StatCard 
          title="মোট বাজেট" 
          value={totalBudget} 
          isCurrency={true} 
          icon={<Briefcase />} 
          color="indigo" 
        />
        
        <StatCard 
          title="মোট আদায়" 
          value={totalCollected} 
          isCurrency={true} 
          icon={<Wallet />} 
          color="emerald" 
        />

        {/* Row 2 */}
        <StatCard 
          title="মোট প্রজেক্ট" 
          value={totalProjects} 
          icon={<LayoutDashboard />} 
          color="blue" 
        />
        
        <StatCard 
          title="মোট বকেয়া" 
          value={totalDue} 
          isCurrency={true} 
          icon={<AlertCircle />} 
          color="rose" 
          onClick={handleDueClick}
        />
      </div>

      {/* Middle Section - Chart and Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Chart Section - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white p-4 lg:p-5 rounded-[20px] lg:rounded-3xl border border-slate-100 shadow-sm w-full overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full">
              <div className="bg-indigo-50 p-2 sm:p-2.5 rounded-xl text-indigo-600 shrink-0">
                <Wallet size={18} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
              </div>
              <div className="shrink-0 hidden sm:flex flex-col justify-center">
                 <h3 className="font-bold text-slate-800 text-sm sm:text-base md:text-lg lg:text-xl leading-tight">মাসিক আয়</h3>
                 <p className="text-[10px] sm:text-[11px] md:text-[13px] text-slate-400 font-medium mt-0.5 whitespace-nowrap text-ellipsis overflow-hidden">গত ৬ মাসের আয়ের হিসাব</p>
              </div>
              <div className="shrink-0 flex sm:hidden flex-col justify-center">
                 <h3 className="font-bold text-slate-800 text-sm leading-tight">মাসিক আয়</h3>
              </div>
              
              <div className={`flex border rounded-[12px] lg:rounded-xl p-1 sm:p-1.5 pr-2 sm:pr-3 lg:pr-4 items-center gap-1 sm:gap-2.5 w-max shrink-0 sm:ml-2 ${outerTheme}`}>
                <div className={`${badgeTheme} p-1 sm:p-1.5 lg:p-1.5 rounded-lg lg:rounded-[10px] shrink-0`}>
                  {isPositive ? <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" /> : <TrendingDown size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="text-slate-800 text-[9px] sm:text-[11px] lg:text-[12px] font-bold whitespace-nowrap">গত মাসের তুলনায়</span>
                    <span className={`${changeColor} text-[9px] sm:text-[11px] lg:text-[12px] font-extrabold flex items-center whitespace-nowrap`}>
                      {changeIcon} {changeSign}{percentageChange}%
                    </span>
                  </div>
                  <span className="text-slate-400 text-[8px] sm:text-[9px] lg:text-[10px] font-semibold leading-tight whitespace-nowrap hidden sm:block">{currentMonthName} মাস পর্যন্ত</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/reports')}
              className="text-indigo-600 bg-indigo-50 p-2 sm:p-2.5 rounded-xl hover:bg-indigo-100 active:scale-90 transition-all font-bold shrink-0 ml-auto"
            >
              <ArrowUpRight size={18} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
          
          <div className="h-32 w-full -ml-2 lg:h-40 z-10 focus:outline-none [&_*]:outline-none">
            {!isMounted ? null : !hasChartData ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-2xl ml-2">
                <Wallet size={32} className="opacity-50" />
                <p className="text-xs text-center px-4 font-medium">পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}}
                  />
                  <Tooltip 
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '4 4'}}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '12px 16px'
                    }}
                    formatter={(value: number) => [`${currency} ${value.toLocaleString('en-US')}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Status Summary - Takes 1 column on desktop */}
        <div className="bg-white p-4 lg:p-5 rounded-[20px] lg:rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 text-base">প্রজেক্ট স্ট্যাটাস</h3>
          <div className="flex flex-row justify-between items-center flex-1 lg:px-2">
            {statusSummary.map((status) => {
              const radius = 44;
              const circumference = 2 * Math.PI * radius;
              const offset = totalProjects > 0 ? circumference - (status.count / totalProjects) * circumference : circumference;
              
              return (
                <div 
                    key={status.key} 
                    onClick={() => handleStatusClick(status.key)}
                    className="cursor-pointer group flex flex-col items-center transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="relative flex flex-col items-center justify-center w-[80px] h-[80px] sm:w-[90px] sm:h-[90px]">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-sm">
                      <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="5" fill="transparent" />
                      <circle 
                         cx="50" cy="50" r={radius} 
                         stroke="currentColor" 
                         strokeWidth="5" 
                         fill="transparent" 
                         strokeDasharray={circumference} 
                         strokeDashoffset={offset} 
                         strokeLinecap="round" 
                         className={`${status.textColor} transition-all duration-1000 ease-out`} 
                      />
                    </svg>
                    <div className="flex flex-col items-center justify-center z-10 pt-1">
                      <span className={`text-[12px] font-medium ${status.textColor} mt-1`}>{status.label}</span>
                      <span className="text-[22px] font-extrabold text-slate-800 leading-tight mt-0.5">{status.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Projects List (Cards) */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-slate-800 text-base">সাম্প্রতিক প্রজেক্ট</h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-xs font-bold bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400">
              <Inbox size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
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
                      <p className="text-[11px] text-slate-500 truncate font-medium flex items-center gap-1">
                         <Users size={10} /> {p.clientname}
                      </p>
                   </div>
                </div>
                
                <div className="text-right whitespace-nowrap">
                  <p className="font-bold text-slate-800 text-sm">{currency} {p.totalamount.toLocaleString('en-US')}</p>
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
