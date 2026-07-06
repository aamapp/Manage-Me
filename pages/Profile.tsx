
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Briefcase, Calendar, 
  Shield, ArrowLeft, Edit, LogOut, 
  CheckCircle, Clock, Award, MapPin
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, projects, incomeRecords } = useAppContext();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'মার্চ ২০২৪';
    const date = new Date(dateString);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    // Convert year to Bengali digits
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bengaliYear = year.toString().split('').map(d => bengaliDigits[parseInt(d)]).join('');
    
    return `${month} ${bengaliYear}`;
  };

  if (!user) return null;

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const totalEarnings = incomeRecords.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 animate-in fade-in duration-500">
      {/* Header / Cover Area */}
      <div className="relative h-24 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={() => navigate('/')}
            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => navigate('/settings')}
            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="max-w-md mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 p-4 text-center overflow-hidden relative">
          {/* Avatar */}
          <div className="relative inline-block mb-2">
            <div className="w-20 h-20 rounded-[1.2rem] bg-white p-1 shadow-xl ring-1 ring-slate-100 overflow-hidden mx-auto">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  className="w-full h-full object-cover rounded-[1rem]" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 rounded-[1rem] flex items-center justify-center text-indigo-600">
                  <User size={32} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-lg border-2 border-white flex items-center justify-center text-white shadow-lg">
              <CheckCircle size={10} fill="currentColor" className="text-emerald-500" />
            </div>
          </div>

          <h1 className="text-lg font-black text-slate-800 tracking-tight">{user.name}</h1>
          <p className="text-indigo-600 font-bold text-[10px] mt-0.5 uppercase tracking-widest flex items-center justify-center gap-1">
            <Shield size={10} /> {user.role === 'admin' ? 'প্রশাসক' : 'প্রফেশনাল ইউজার'}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-50">
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">প্রজেক্ট</p>
              <p className="text-sm font-black text-slate-800">{totalProjects}</p>
            </div>
            <div className="text-center border-x border-slate-50">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">সম্পন্ন</p>
              <p className="text-sm font-black text-emerald-600">{completedProjects}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">আয়</p>
              <p className="text-sm font-black text-indigo-600">{(totalEarnings / 1000).toFixed(1)}k</p>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">ইউজার ডিটেইলস</h3>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ইমেইল এড্রেস</p>
                <p className="text-sm font-bold text-slate-700 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">পেশা</p>
                <p className="text-sm font-bold text-slate-700 truncate">{user.occupation || 'সাউন্ড ডিজাইনার / অডিও ইঞ্জিনিয়ার'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">লোকেশন</p>
                <p className="text-sm font-bold text-slate-700 truncate">বাংলাদেশ</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">মেম্বারশিপ শুরু</p>
                <p className="text-sm font-bold text-slate-700 truncate">{formatDate(user.createdat)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm active:scale-95 transition-all"
          >
            <Edit size={18} /> সেটিংস
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            <Award size={18} /> রিপোর্ট
          </button>
        </div>
      </div>
    </div>
  );
};
