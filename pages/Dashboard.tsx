
import React, { useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
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

  // Added 'key' to identify status for filtering
  const statusSummary = [
    { key: 'Pending', label: 'পেন্ডিং', count: projects.filter(p => p.status === 'Pending').length, color: 'bg-amber-500' },
    { key: 'In Progress', label: 'চলমান', count: projects.filter(p => p.status === 'In Progress').length, color: 'bg-blue-500' },
    { key: 'Completed', label: 'সম্পন্ন', count: projects.filter(p => p.status === 'Completed').length, color: 'bg-emerald-500' },
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
    <div className="space-y-6 w-full max-w-full pt-2 pb-6 px-1">
      {/* Stats Grid - Responsive columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm w-full overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
               <h3 className="font-bold text-slate-800 text-base">মাসিক আয়</h3>
               <p className="text-xs text-slate-400 font-medium mt-0.5">গত ৬ মাসের আয়ের হিসাব</p>
            </div>
            <button 
              onClick={() => navigate('/reports')}
              className="text-indigo-600 bg-indigo-50 p-2.5 rounded-xl hover:bg-indigo-100 active:scale-90 transition-all"
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
          
          <div className="h-48 w-full -ml-2">
            {!isMounted ? null : !hasChartData ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-2xl ml-2">
                <Wallet size={32} className="opacity-50" />
                <p className="text-xs text-center px-4 font-medium">পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                    cursor={{fill: '#f8fafc', radius: 8}}
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
                  <Bar 
                    dataKey="income" 
                    radius={[6, 6, 6, 6]} 
                    barSize={30}
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

        {/* Project Status Summary - Takes 1 column on desktop */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 text-base">প্রজেক্ট স্ট্যাটাস</h3>
          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {statusSummary.map((status) => (
              <div 
                  key={status.key} 
                  onClick={() => handleStatusClick(status.key)}
                  className="cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-2 text-sm group-hover:text-indigo-600 transition-colors">
                  <span className="text-slate-600 font-bold group-hover:text-indigo-600">{status.label}</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg text-xs">{status.count}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`${status.color} h-full transition-all duration-1000 rounded-full shadow-sm`} 
                    style={{ width: `${totalProjects > 0 ? (status.count / totalProjects) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Projects List (Cards) */}
      <div className="pb-6">
        <div className="flex items-center justify-between mb-4 px-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
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
