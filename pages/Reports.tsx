
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp,
  Wallet,
  RefreshCcw, Clock, Receipt, Download, Share2, Hexagon, X, AlertCircle
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
  
  // State for Image Preview Modal (Fallback for Android)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    setIsCapturing(true);
    
    try {
      // Small delay to ensure DOM is ready and prevent blank areas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = reportRef.current;
      
      // Enhanced configuration for WebView/Mobile compatibility
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high quality
        backgroundColor: '#ffffff',
        useCORS: true, // Essential for loading external profile images
        allowTaint: false, // Must be false to allow data extraction
        logging: false,
        scrollY: -window.scrollY, // Correct scrolling offset
        windowWidth: element.scrollWidth, // Capture full width
        windowHeight: element.scrollHeight // Capture full height
      });

      // 1. Generate Data URL (Base64) - This is the fallback for display
      const dataUrl = canvas.toDataURL('image/png');
      
      // 2. Open Preview Modal immediately (most reliable UX)
      setPreviewImage(dataUrl);
      
      // 3. Try Native Share in background (Preferred for Android if supported)
      if (navigator.share && navigator.canShare) {
          try {
              const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
              if (blob) {
                  const file = new File([blob], `Report-${Date.now()}.png`, { type: 'image/png' });
                  if (navigator.canShare({ files: [file] })) {
                    // Slight delay to let modal open first
                    setTimeout(async () => {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'Manage-Me Report',
                                text: `Financial Report for ${user?.name}`
                            });
                        } catch(e) {
                            // Share cancelled or failed, user still has modal
                        }
                    }, 500);
                  }
              }
          } catch (error) {
              console.warn('Native share failed or cancelled', error);
          }
      }

      setIsCapturing(false);

    } catch (err) {
      console.error(err);
      alert('রিপোর্ট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setIsCapturing(false);
    }
  };

  const hasData = filteredProjects.length > 0 || filteredExpenses.length > 0;

  const getReportPeriodText = () => {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('bn-BD');
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `${formatDate(startDate)} থেকে বর্তমান`;
    } else if (endDate) {
      return `শুরু থেকে ${formatDate(endDate)}`;
    } else {
      return new Date().toLocaleDateString('bn-BD');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">রিপোর্ট</h1>
          <p className="text-slate-500">আর্থিক প্রবৃদ্ধি পর্যবেক্ষণ করুন।</p>
        </div>
        
        {/* Filter Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">শুরু তারিখ</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-slate-700 cursor-pointer" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">শেষ তারিখ</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-slate-700 cursor-pointer" />
            </div>
            </div>
            {(startDate || endDate) && (
            <button onClick={resetFilter} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">ফিল্টার রিসেট করুন</button>
            )}
        </div>

        {/* Action Button */}
        <div className="w-full">
          <button 
            onClick={handleDownloadImage}
            disabled={!hasData || isCapturing}
            className="w-full bg-indigo-600 text-white px-5 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all hover:bg-indigo-700"
          >
            {isCapturing ? <RefreshCcw size={18} className="animate-spin" /> : <Share2 size={18} />}
            <span>{isCapturing ? 'তৈরি হচ্ছে...' : 'রিপোর্ট শেয়ার / ডাউনলোড'}</span>
          </button>
        </div>
      </div>

      {/* Report Content (Capture Area) */}
      <div className="overflow-hidden rounded-none shadow-xl">
        <div id="report-container" ref={reportRef} className="bg-white min-h-[750px] relative w-full mx-auto">
            
            {/* Watermark Pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 flex items-center justify-center overflow-hidden">
                <Hexagon size={500} strokeWidth={0.5} />
            </div>

            {/* Compact Premium Header */}
            <div className="bg-slate-900 px-6 py-8 text-white flex justify-between items-center relative overflow-hidden z-10">
                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <span className="font-black text-lg">M</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">{APP_NAME}</h1>
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] pl-1">ফাইন্যান্সিয়াল রিপোর্ট</p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="text-right">
                        <p className="font-bold text-sm text-white">{user?.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                    </div>
                    {user?.avatar_url ? (
                        <img 
                            src={user.avatar_url} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full border border-slate-600 object-cover" 
                            crossOrigin="anonymous" 
                        />
                    ) : (
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-sm border border-slate-600">
                            {user?.name?.charAt(0)}
                        </div>
                    )}
                </div>
            </div>

            {/* Date Ribbon */}
            <div className="bg-indigo-50 border-b border-indigo-100 py-2 text-center text-xs font-bold text-indigo-900 tracking-wide flex justify-center items-center gap-2">
                <Clock size={12} className="text-indigo-600" />
                <span>সময়কাল: {getReportPeriodText()}</span>
            </div>

            {/* Main Content Body */}
            <div className="p-6 space-y-6 relative z-10">
                
                {/* Compact Executive Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between h-24">
                        <div className="flex justify-between items-start">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">মোট আয়</p>
                             <Wallet size={16} className="text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">{currency} {stats.totalIncome.toLocaleString('bn-BD')}</h3>
                    </div>
                    
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex flex-col justify-between h-24">
                         <div className="flex justify-between items-start">
                             <p className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider">মোট খরচ</p>
                             <Receipt size={16} className="text-rose-200" />
                         </div>
                         <h3 className="text-2xl font-black text-rose-600">{currency} {stats.totalExpenses.toLocaleString('bn-BD')}</h3>
                    </div>
                    
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between h-24">
                         <div className="flex justify-between items-start">
                            <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider">নিট লাভ</p>
                            <TrendingUp size={16} className="text-indigo-200" />
                         </div>
                         <h3 className={`text-2xl font-black ${stats.profit >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                            {currency} {stats.profit.toLocaleString('bn-BD')}
                         </h3>
                    </div>
                    
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between h-24">
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider">বকেয়া</p>
                            <Clock size={16} className="text-amber-200" />
                        </div>
                         <h3 className="text-2xl font-black text-amber-600">{currency} {stats.totalDue.toLocaleString('bn-BD')}</h3>
                    </div>
                </div>

                {/* Charts Area */}
                {!hasData ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Hexagon size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">কোনো ডাটা পাওয়া যায়নি</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Income Chart */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                <h3 className="font-bold text-sm text-slate-800">মাসিক আয়ের বিবরণ</h3>
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dy={5} />
                                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc', radius: 4}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '6px 10px', fontSize: '11px' }}
                                        formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                                    />
                                    <Bar dataKey="income" fill="#4f46e5" radius={[4, 4, 4, 4]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Combined Stats & Pie Chart Block */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                                <h3 className="font-bold text-sm text-slate-800">আয় বনাম খরচ বিশ্লেষণ</h3>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {/* Chart */}
                                <div className="h-56 w-full md:w-1/2 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                        <Pie 
                                            data={financialData} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={50} 
                                            outerRadius={70} 
                                            paddingAngle={5} 
                                            dataKey="value"
                                        >
                                            {financialData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                            formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            height={36} 
                                            iconType="circle" 
                                            wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                                        />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Stats Text */}
                                <div className="w-full md:w-1/2 flex flex-col gap-3">
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase">প্রফিট মার্জিন</p>
                                            <p className="text-xs text-indigo-400/80 mt-0.5">মোট আয়ের লাভ অংশ</p>
                                        </div>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-2xl font-black text-indigo-600">
                                                {stats.totalIncome > 0 ? Math.round((stats.profit / stats.totalIncome) * 100) : 0}
                                            </span>
                                            <span className="text-sm font-bold text-indigo-400">%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-rose-400 uppercase">খরচের অনুপাত</p>
                                            <p className="text-xs text-rose-400/80 mt-0.5">মোট আয়ের ব্যয় অংশ</p>
                                        </div>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-2xl font-black text-rose-500">
                                                {stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0}
                                            </span>
                                            <span className="text-sm font-bold text-rose-400">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Simple Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 mt-4 flex justify-between items-center">
                <div className="flex items-center gap-1.5 opacity-60">
                    <span className="font-bold text-xs text-slate-600">{APP_NAME}</span>
                </div>
                <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString('bn-BD', { dateStyle: 'full' })}</p>
            </div>
            
            {/* Bottom Color Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
        </div>
      </div>

      {/* Image Preview Modal (Fallback for Android WebView) */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 text-sm">রিপোর্ট প্রিভিউ</h3>
                 <button onClick={() => setPreviewImage(null)} className="p-2 bg-slate-200 rounded-full text-slate-600 hover:bg-slate-300 transition-colors">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center items-center">
                 <img src={previewImage} alt="Report Preview" className="max-w-full h-auto shadow-lg rounded-lg object-contain" />
              </div>

              <div className="p-4 border-t bg-white">
                 <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-bold mb-3 text-center border border-amber-100 flex items-center justify-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>ছবিটি গ্যালারিতে সেভ করতে <span className="text-indigo-600 font-black">লং-প্রেস (Long Press)</span> করুন।</span>
                 </div>
                 <a 
                   href={previewImage} 
                   download={`Report-${new Date().getTime()}.png`}
                   className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                 >
                    <Download size={18} />
                    ডাউনলোড
                 </a>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
