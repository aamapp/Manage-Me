
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import { Mail, Lock, Music, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password?: string) => void;
  onGoToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onGoToSignup }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('demo@manage-me.com');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 bg-indigo-700 p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-700 font-black text-2xl">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight">{APP_NAME}</span>
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">আপনার অডিও প্রজেক্টগুলো ম্যানেজ করুন সহজেই।</h1>
            <p className="text-indigo-100 text-lg">সাউন্ড ডিজাইনার এবং মিউজিক প্রডিউসারদের জন্য তৈরি বাংলাদেশের সেরা প্রজেক্ট ম্যানেজমেন্ট সফটওয়্যার।</p>
          </div>
        </div>

        <div className="relative z-10 pt-12 md:pt-0">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <img key={i} className="w-10 h-10 rounded-full border-2 border-indigo-700 bg-indigo-100" src={`https://picsum.photos/seed/${i}/100/100`} alt="user" />
              ))}
            </div>
            <p className="text-sm text-indigo-100"><span className="font-bold text-white">৫০০+</span> অডিও প্রফেশনাল আমাদের ওপর ভরসা করেন।</p>
          </div>
        </div>

        <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 opacity-10">
          <Music size={400} />
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">লগইন করুন</h2>
            <p className="text-slate-500">আপনার একাউন্টে ফিরে আসতে তথ্য দিন</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ইমেইল এড্রেস</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">পাসওয়ার্ড</label>
                <a href="#" className="text-sm text-indigo-600 font-semibold hover:underline">পাসওয়ার্ড ভুলে গেছেন?</a>
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
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-900 placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              প্রবেশ করুন
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              একাউন্ট নেই? {' '}
              <button onClick={onGoToSignup} className="text-indigo-600 font-bold hover:underline">নতুন একাউন্ট তৈরি করুন</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
