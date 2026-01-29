
import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Download, Image as ImageIcon,
  DollarSign, PieChart as PieIcon, Wallet,
  Calendar, Filter, RefreshCcw, Search, FileJson, User as UserIcon, Clock
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { PROJECT_TYPE_LABELS, APP_NAME } from '../constants';

export const Reports: React.FC = () => {
  const { projects, user } = useAppContext();
  const currency = user.currency || '৳';
  const reportRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!startDate && !endDate) return true;
      const projectDate = new Date(p.createdAt);
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : new Date('2099-12-31');
      return projectDate >= start && projectDate <= end;
    });
  }, [projects, startDate, endDate]);

  const stats = useMemo(() => {
    const totalIncome = filteredProjects.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalBudget = filteredProjects.reduce((acc, p) => acc + p.totalAmount, 0);
    const totalDue = filteredProjects.reduce((acc, p) => acc + p.dueAmount, 0);
    
    const savedExpenses = localStorage.getItem(`mm_expenses_${user.id}`);
    const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
    
    const filteredExpenses = expenses.filter((e: any) => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date);
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : new Date('2099-12-31');
      return expenseDate >= start && expenseDate <= end;
    });

    const totalExpenses = filteredExpenses.reduce((acc: number, e: any) => acc + e.amount, 0);

    return {
      totalIncome,
      totalBudget,
      totalDue,
      totalExpenses,
      profit: totalIncome - totalExpenses
    };
  }, [filteredProjects, user.id, startDate, endDate]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProjects.forEach(p => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: PROJECT_TYPE_LABELS[type] || type,
      value: count
    }));
  }, [filteredProjects]);

  const chartData = useMemo(() => {
    const incomeRecordsRaw = localStorage.getItem(`mm_income_records_${user.id}`);
    const expenseRecordsRaw = localStorage.getItem(`mm_expenses_${user.id}`);
    const incomeRecords = incomeRecordsRaw ? JSON.parse(incomeRecordsRaw) : [];
    const expenseRecords = expenseRecordsRaw ? JSON.parse(expenseRecordsRaw) : [];

    const filterByDate = (dateStr: string) => {
      if (!startDate && !endDate) return true;
      const d = new Date(dateStr);
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : new Date('2099-12-31');
      return d >= start && d <= end;
    };

    const filteredIncome = incomeRecords.filter((r: any) => filterByDate(r.date));
    const filteredExpense = expenseRecords.filter((r: any) => filterByDate(r.date));

    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    if (!startDate && !endDate) {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIdx = d.getMonth();
        const year = d.getFullYear();
        
        const mIncome = filteredIncome
          .filter((r: any) => {
            const rd = new Date(r.date);
            return rd.getMonth() === mIdx && rd.getFullYear() === year;
          })
          .reduce((acc: number, curr: any) => acc + curr.amount, 0);

        const mExpense = filteredExpense
          .filter((r: any) => {
            const rd = new Date(r.date);
            return rd.getMonth() === mIdx && rd.getFullYear() === year;
          })
          .reduce((acc: number, curr: any) => acc + curr.amount, 0);

        result.push({
          name: monthNames[mIdx],
          income: mIncome,
          expense: mExpense
        });
      }
    } else {
      const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const end = endDate ? new Date(endDate) : now;
      
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (curr <= endLimit) {
        const mIdx = curr.getMonth();
        const year = curr.getFullYear();
        
        const mIncome = filteredIncome
          .filter((r: any) => {
            const rd = new Date(r.date);
            return rd.getMonth() === mIdx && rd.getFullYear() === year;
          })
          .reduce((acc: number, curr: any) => acc + curr.amount, 0);

        const mExpense = filteredExpense
          .filter((r: any) => {
            const rd = new Date(r.date);
            return rd.getMonth() === mIdx && rd.getFullYear() === year;
          })
          .reduce((acc: number, curr: any) => acc + curr.amount, 0);

        result.push({
          name: monthNames[mIdx],
          income: mIncome,
          expense: mExpense
        });
        
        curr.setMonth(curr.getMonth() + 1);
        if (result.length > 24) break; 
      }
    }
    
    return result;
  }, [user.id, startDate, endDate]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadJSON = () => {
    const reportData = {
      reportType: "Custom Range Report",
      period: (startDate || "All Time") + " to " + (endDate || "All Time"),
      generatedBy: user.name,
      stats,
      data: filteredProjects
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
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        logging: false,
        useCORS: true,
        // Ensure hidden capturing headers become visible during export if needed, 
        // though we'll keep them always visible in the ref but nicely styled.
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Manage-Me-Report-${user.name.replace(/\s+/g, '-')}-${new Date().toLocaleDateString()}.png`;
      link.click();
    } catch (err) {
      console.error('Image capture failed:', err);
      alert('ছবি তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsCapturing(false);
    }
  };

  const hasData = filteredProjects.length > 0 || chartData.some(d => d.income > 0 || d.expense > 0);

  // Helper for formatting date display in the report
  const formatDateRange = () => {
    if (!startDate && !endDate) return "সব সময়ের হিসাব";
    return `${startDate || 'শুরু'} থেকে ${endDate || 'বর্তমান'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">রিপোর্ট ও এনালাইটিক্স</h1>
          <p className="text-slate-500">আপনার সৃজনশীল ব্যবসার আর্থিক প্রবৃদ্ধি পর্যবেক্ষণ করুন।</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadJSON}
            disabled={!hasData}
            className={`px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
              ${hasData ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
            `}
          >
            <FileJson size={18} />
            <span className="hidden sm:inline">JSON ডাউনলোড</span>
          </button>
          
          <button 
            onClick={handleDownloadImage}
            disabled={!hasData || isCapturing}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
              ${hasData ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              ${isCapturing ? 'animate-pulse opacity-70 cursor-wait' : ''}
            `}
          >
            {isCapturing ? <RefreshCcw size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            <span>{isCapturing ? 'ছবি তৈরি হচ্ছে...' : 'ছবি হিসেবে সেভ'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar size={14} /> শুরু তারিখ
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar size={14} /> শেষ তারিখ
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={resetFilter}
             className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
             title="রিসেট করুন"
           >
             <RefreshCcw size={20} />
           </button>
           <div className="h-10 w-[1px] bg-slate-100 mx-2 hidden md:block"></div>
           <div className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
             <Filter size={18} />
             {filteredProjects.length} টি রেকর্ড পাওয়া গেছে
           </div>
        </div>
      </div>

      {/* This ref section will be captured as an image */}
      <div ref={reportRef} className="space-y-6 p-4 rounded-3xl bg-slate-50">
        
        {/* NEW EXPORT HEADER - Visible in Capture */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-100">
              M
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">সাউন্ড ডিজাইন রিপোর্ট</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{APP_NAME} | প্রজেক্ট ম্যানেজমেন্ট</p>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-2 text-indigo-600">
              <UserIcon size={14} />
              <span className="text-sm font-bold">{user.name}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-400">
              <Calendar size={14} />
              <span className="text-[11px] font-semibold">{formatDateRange()}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-300">
              <Clock size={14} />
              <span className="text-[10px] font-medium">প্রস্তুত করা হয়েছে: {new Date().toLocaleString('bn-BD')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">মোট আয়</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{currency} {stats.totalIncome.toLocaleString('bn-BD')}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                <TrendingDown size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">মোট খরচ</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{currency} {stats.totalExpenses.toLocaleString('bn-BD')}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">নিট লাভ</span>
            </div>
            <h3 className={`text-2xl font-black ${stats.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {currency} {stats.profit.toLocaleString('bn-BD')}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">বকেয়া</span>
            </div>
            <h3 className="text-2xl font-black text-amber-600">{currency} {stats.totalDue.toLocaleString('bn-BD')}</h3>
          </div>
        </div>

        {!hasData && chartData.every(d => d.income === 0 && d.expense === 0) ? (
          <div className="bg-white p-20 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 animate-pulse">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">এই সময়ে কোনো ডাটা পাওয়া যায়নি</h3>
            <p className="text-slate-500 max-w-sm">অনুগ্রহ করে তারিখের সীমা পরিবর্তন করে দেখুন অথবা নতুন প্রজেক্ট/আয়/ব্যয় যোগ করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                আয় বনাম খরচ (বাছাইকৃত সময়)
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{fill: '#f8fafc'}}
                      formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="income" name="আয়" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="খরচ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <PieIcon size={20} className="text-indigo-600" />
                প্রজেক্টের ধরন
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
