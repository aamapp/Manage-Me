
import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Image as ImageIcon,
  DollarSign, PieChart as PieIcon, Wallet,
  Calendar, Filter, RefreshCcw, FileJson, User as UserIcon, Clock
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { PROJECT_TYPE_LABELS, APP_NAME } from '../constants';

export const Reports: React.FC = () => {
  const { projects, user } = useAppContext();
  const currency = user?.currency || '৳';
  const reportRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!startDate && !endDate) return true;
      const projectDate = new Date(p.createdat);
      const start = startDate ? new Date(startDate) : new Date('1970-01-01');
      const end = endDate ? new Date(endDate) : new Date('2099-12-31');
      return projectDate >= start && projectDate <= end;
    });
  }, [projects, startDate, endDate]);

  const stats = useMemo(() => {
    const totalIncome = filteredProjects.reduce((acc, p) => acc + (p.paidamount || 0), 0);
    const totalBudget = filteredProjects.reduce((acc, p) => acc + (p.totalamount || 0), 0);
    const totalDue = filteredProjects.reduce((acc, p) => acc + (p.dueamount || 0), 0);
    const totalExpenses = 0; // Temporary placeholder

    return {
      totalIncome,
      totalBudget,
      totalDue,
      totalExpenses,
      profit: totalIncome - totalExpenses
    };
  }, [filteredProjects]);

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
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      result.push({
        name: monthNames[mIdx],
        income: 0,
        expense: 0
      });
    }
    return result;
  }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadJSON = () => {
    const reportData = {
      reportType: "Custom Range Report",
      period: (startDate || "All Time") + " to " + (endDate || "All Time"),
      generatedBy: user?.name,
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

  const hasData = filteredProjects.length > 0;

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
            className="bg-white text-slate-700 border px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FileJson size={18} />
            <span className="hidden sm:inline">JSON ডাউনলোড</span>
          </button>
          
          <button 
            onClick={handleDownloadImage}
            disabled={!hasData || isCapturing}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isCapturing ? <RefreshCcw size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            <span>{isCapturing ? 'ছবি তৈরি হচ্ছে...' : 'ছবি হিসেবে সেভ'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">শুরু তারিখ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">শেষ তারিখ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm" />
          </div>
        </div>
        <button onClick={resetFilter} className="p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl"><RefreshCcw size={20} /></button>
      </div>

      <div ref={reportRef} className="space-y-6 p-4 rounded-3xl bg-slate-50">
        <div className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">সাউন্ড ডিজাইন রিপোর্ট</h2>
              <p className="text-slate-500 text-xs font-bold uppercase">{APP_NAME}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-indigo-600 font-bold text-sm"><UserIcon size={14} /> {user?.name}</div>
            <div className="text-[10px] text-slate-400">{new Date().toLocaleString('bn-BD')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">মোট আয়</p>
            <h3 className="text-2xl font-black text-slate-800">{currency} {stats.totalIncome.toLocaleString('bn-BD')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">নিট লাভ</p>
            <h3 className="text-2xl font-black text-indigo-600">{currency} {stats.profit.toLocaleString('bn-BD')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">বকেয়া</p>
            <h3 className="text-2xl font-black text-amber-600">{currency} {stats.totalDue.toLocaleString('bn-BD')}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">রেকর্ড সংখ্যা</p>
            <h3 className="text-2xl font-black text-slate-800">{filteredProjects.length} টি</h3>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white p-20 rounded-3xl text-center border">
            <p className="text-slate-500">এই সময়ের মধ্যে কোনো ডাটা পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border h-80">
              <h3 className="text-lg font-bold text-slate-800 mb-6">আয় বনাম খরচ</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" name="আয়" fill="#6366f1" />
                  <Bar dataKey="expense" name="খরচ" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl border h-80">
              <h3 className="text-lg font-bold text-slate-800 mb-6">প্রজেক্টের ধরন</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {typeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
