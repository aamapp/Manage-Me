
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
      
      // Filter income records for this specific month/year
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">স্বাগতম, আপনার ড্যাশবোর্ড</h1>
        <p className="text-slate-500">আপনার সাউন্ড ডিজাইন প্রজেক্টগুলোর সংক্ষিপ্ত চিত্র এখানে দেখুন।</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="মোট আয়" value={totalIncome} isCurrency={true} icon={<Wallet size={24} />} />
        <StatCard title="মোট প্রজেক্ট" value={totalProjects} icon={<Briefcase size={24} />} />
        <StatCard title="সম্পন্ন প্রজেক্ট" value={completedProjects} icon={<CheckCircle2 size={24} />} />
        <StatCard title="চলমান প্রজেক্ট" value={ongoingProjects} icon={<Clock size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">মাসিক আয় (ছয় মাস)</h3>
            <button 
              onClick={() => navigate('/reports')}
              className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline"
            >
              বিস্তারিত রিপোর্ট <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="h-80 w-full flex-1">
            {!hasChartData ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                   <Wallet size={32} />
                </div>
                <p className="text-sm">পর্যাপ্ত আর্থিক তথ্য (পেমেন্ট রেকর্ড) পাওয়া গেলে এখানে চার্ট প্রদর্শিত হবে।</p>
                <button 
                  onClick={() => navigate('/income')}
                  className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                >
                  প্রথম আয় রেকর্ড করুন
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11}}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, 'আয়']}
                  />
                  <Bar 
                    dataKey="income" 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 5 ? '#6366f1' : '#c7d2fe'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">প্রজেক্ট সামারি</h3>
          <div className="space-y-4">
            {statusSummary.map((status) => (
              <div key={status.label}>
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-slate-600">{status.label}</span>
                  <span className="font-bold text-slate-800">{status.count} টি</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`${status.color} h-full transition-all duration-1000`} 
                    style={{ width: `${totalProjects > 0 ? (status.count / totalProjects) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">পরবর্তী ডেডলাইন</p>
                <p className="text-sm font-semibold text-slate-600">
                  {projects.length > 0 ? "শিডিউল চেক করুন" : "কোনো ডেডলাইন নেই"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">সাম্প্রতিক প্রজেক্টসমূহ</h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-sm font-semibold hover:underline"
          >
            সব প্রজেক্ট দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
              <Inbox size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">সাম্প্রতিক কোনো প্রজেক্ট পাওয়া যায়নি</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">প্রজেক্ট</th>
                  <th className="px-6 py-4 font-medium">ক্লায়েন্ট</th>
                  <th className="px-6 py-4 font-medium">টাইপ</th>
                  <th className="px-6 py-4 font-medium">স্ট্যাটাস</th>
                  <th className="px-6 py-4 text-right">বাজেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProjects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                    <td className="px-6 py-4 text-slate-600">{p.clientname}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {PROJECT_TYPE_LABELS[p.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold
                        ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          p.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                          'bg-amber-100 text-amber-700'}
                      `}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      {currency} {(p.totalamount || 0).toLocaleString('bn-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
