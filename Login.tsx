
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import { Mail, Lock, Music, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password?: string) => void;
  onGoToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onGoToSignup }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Brand Header */}
      <div className="bg-indigo-700 p-8 pt-12 rounded-b-[3rem] shadow-xl text-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-700 font-black text-3xl mb-4 shadow-lg">
              M
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">{APP_NAME}</h1>
            <p className="text-indigo-200 text-sm font-medium">অডিও প্রজেক্ট ম্যানেজমেন্ট অ্যাপ</p>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Music size={200} />
        </div>
      </div>

      <div className="flex-1 px-6 -mt-8 relative z-20 pb-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">লগইন</h2>
            <p className="text-slate-500 text-sm">আপনার একাউন্টে প্রবেশ করুন</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ইমেইল</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">পাসওয়ার্ড</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
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
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 mt-2"
            >
              প্রবেশ করুন
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-500 text-sm">
              একাউন্ট নেই? {' '}
              <button onClick={onGoToSignup} className="text-indigo-600 font-bold hover:underline">নিবন্ধন করুন</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
