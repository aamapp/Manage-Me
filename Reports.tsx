
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Image as ImageIcon,
  DollarSign, PieChart as PieIcon, Wallet,
  Calendar, Filter, RefreshCcw, FileJson, User as UserIcon, Clock, Briefcase, Receipt
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { APP_NAME } from '../constants';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';

export const Reports: React.FC = () => {
  const { projects, user } = useAppContext();
  const currency = user?.currency || '৳';
  const reportRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Fetch expenses specifically for the report
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('userid', user.id);
      
      if (data) setExpenses(data);
    };
    fetchExpenses();
  }, [user]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!startDate && !endDate) return true;
      const projectDate = new Date(p.createdat);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        if (projectDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day (Inclusive)
        if (projectDate > end) return false;
      }
      
      return true;
    });
  }, [projects, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (expenseDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (expenseDate > end) return false;
      }

      return true;
    });
  }, [expenses, startDate, endDate]);

  const stats = useMemo(() => {
    const totalIncome = filteredProjects.reduce((acc, p) => acc + (p.paidamount || 0), 0);
    const totalDue = filteredProjects.reduce((acc, p) => acc + (p.dueamount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      totalIncome,
      totalDue,
      totalExpenses,
      profit: totalIncome - totalExpenses
    };
  }, [filteredProjects, filteredExpenses]);

  // Income vs Expense Pie Chart Data
  const financialData = useMemo(() => {
    return [
      { name: 'মোট আয়', value: stats.totalIncome, color: '#10b981' }, // Emerald Green
      { name: 'মোট খরচ', value: stats.totalExpenses, color: '#ef4444' } // Red
    ];
  }, [stats]);

  const chartData = useMemo(() => {
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      // Calculate target month and year accurately
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();
      
      // Handle year wrap-around
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlyIncome = filteredProjects
        .filter(p => {
          if (!p.createdat) return false;
          // Parse string directly to prevent timezone shifts
          const [yearStr, monthStr] = p.createdat.split('-');
          const projYear = parseInt(yearStr);
          const projMonthIndex = parseInt(monthStr) - 1;

          return projMonthIndex === targetMonthIndex && projYear === targetYear;
        })
        .reduce((sum, p) => sum + (p.paidamount || 0), 0);

      result.push({
        name: monthNames[targetMonthIndex],
        income: monthlyIncome,
        expense: 0 
      });
    }
    return result;
  }, [filteredProjects]);

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadJSON = () => {
    const reportData = {
      reportType: "Financial Report",
      period: (startDate || "All Time") + " to " + (endDate || "All Time"),
      generatedBy: user?.name,
      stats,
      projects: filteredProjects,
      expenses: filteredExpenses
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report-${startDate || 'all'}-to-${endDate || 'all'}.json`;
    a.click();
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    setIsCapturing(true);
    
    try {
      // Allow time for images to render if needed
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        logging: false,
        useCORS: true, // Critical for user avatar
        allowTaint: true,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Report-${user?.name}-${new Date().toLocaleDateString()}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('ছবি তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsCapturing(false);
    }
  };

  const hasData = filteredProjects.length > 0 || filteredExpenses.length > 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">রিপোর্ট</h1>
          <p className="text-slate-500">আর্থিক প্রবৃদ্ধি পর্যবেক্ষণ করুন।</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadJSON}
            disabled={!hasData}
            className="flex-1 bg-white text-slate-700 border px-4 py-2.5 rounded-xl font-semibold flex justify-center items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileJson size={18} />
            <span className="">JSON</span>
          </button>
          
          <button 
            onClick={handleDownloadImage}
            disabled={!hasData || isCapturing}
            className="flex-1 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold flex justify-center items-center gap-2 text-sm disabled:opacity-50"
          >
            {isCapturing ? <RefreshCcw size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            <span>{isCapturing ? 'তৈরি হচ্ছে...' : 'ইমেজ'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">শুরু তারিখ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">শেষ তারিখ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-slate-700" />
          </div>
        </div>
        <button onClick={resetFilter} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">ফিল্টার রিসেট করুন</button>
      </div>

      <div ref={reportRef} className="space-y-4 p-4 rounded-3xl bg-slate-50">
        <div className="bg-white p-6 rounded-2xl border flex items-center justify-between">
           <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">রিপোর্ট</h2>
                  <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold">{new Date().toLocaleDateString('bn-BD')}</div>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{APP_NAME}</p>
              <p className="text-xs text-slate-400 font-medium">প্রস্তুতকারী: {user?.name}</p>
           </div>
           
           {user?.avatar_url && (
             <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
                <img 
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous" 
                />
             </div>
           )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
             {/* Card 1: Income */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-2 -top-2 opacity-[0.07] transform rotate-12">
                   <Wallet size={64} className="text-slate-800" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">মোট আয়</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{currency} {stats.totalIncome.toLocaleString('bn-BD')}</h3>
             </div>

             {/* Card 2: Profit */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-2 -top-2 opacity-[0.07] transform rotate-12">
                   <TrendingUp size={64} className="text-indigo-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">নিট লাভ</p>
                <h3 className={`text-xl font-black tracking-tight ${stats.profit >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                  {currency} {stats.profit.toLocaleString('bn-BD')}
                </h3>
             </div>

             {/* Card 3: Expense */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-2 -top-2 opacity-[0.07] transform rotate-12">
                   <Receipt size={64} className="text-rose-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">মোট খরচ</p>
                <h3 className="text-xl font-black text-rose-600 tracking-tight">{currency} {stats.totalExpenses.toLocaleString('bn-BD')}</h3>
             </div>

             {/* Card 4: Due */}
             <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute -right-2 -top-2 opacity-[0.07] transform rotate-12">
                   <Clock size={64} className="text-amber-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">বকেয়া</p>
                <h3 className="text-xl font-black text-amber-600 tracking-tight">{currency} {stats.totalDue.toLocaleString('bn-BD')}</h3>
             </div>
        </div>

        {!hasData ? (
          <div className="bg-white p-20 rounded-3xl text-center border">
            <p className="text-slate-500 font-medium text-sm">এই সময়ের মধ্যে কোনো ডাটা পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mt-2">
            <div className="bg-white p-6 rounded-2xl border h-64 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">মাসিক আয় (প্রজেক্ট ভিত্তিক)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="income" name="আয়" fill="#6366f1" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border h-64 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">আয় বনাম খরচ</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={financialData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {financialData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
