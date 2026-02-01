
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import { Mail, Lock, User, Music, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface SignupProps {
  onSignup: (name: string, email: string, password?: string) => void;
  onGoToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSignup, onGoToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password) {
      onSignup(name, email, password);
    } else {
      alert('সবগুলো ঘর পূরণ করুন।');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Brand Header */}
      <div className="bg-indigo-700 p-8 pt-10 pb-16 rounded-b-[3rem] shadow-xl text-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
             <h1 className="text-2xl font-black text-white tracking-tight mb-2">নতুন একাউন্ট</h1>
            <p className="text-indigo-200 text-sm font-medium">আমাদের কমিউনিটিতে যোগ দিন</p>
        </div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Music size={200} />
        </div>
      </div>

      <div className="flex-1 px-6 -mt-10 relative z-20 pb-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
          <button 
              onClick={onGoToLogin}
              className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-6 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>লগইন-এ ফিরে যান</span>
            </button>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">পূর্ণ নাম</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম" 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ইমেইল</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">পাসওয়ার্ড</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 p-2"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 mt-4"
            >
              নিবন্ধন করুন
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
