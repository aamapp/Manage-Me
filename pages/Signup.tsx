
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Section - Brand */}
      <div className="w-full md:w-1/2 bg-indigo-700 p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-700 font-black text-2xl">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight">{APP_NAME}</span>
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">আপনার সৃজনশীল যাত্রার নতুন শুরু।</h1>
            <p className="text-indigo-100 text-lg">আমাদের কমিউনিটিতে যোগ দিন এবং আপনার প্রজেক্ট ম্যানেজমেন্টকে নিয়ে যান এক নতুন উচ্চতায়।</p>
          </div>
        </div>

        <div className="relative z-10 pt-12 md:pt-0">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[5, 6, 7, 8].map((i) => (
                <img key={i} className="w-10 h-10 rounded-full border-2 border-indigo-700 bg-indigo-100" src={`https://picsum.photos/seed/${i + 10}/100/100`} alt="user" />
              ))}
            </div>
            <p className="text-sm text-indigo-100"><span className="font-bold text-white">১০০০+</span> প্রজেক্ট সফলভাবে সম্পন্ন হয়েছে আমাদের প্ল্যাটফর্মে।</p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/2 -right-20 transform -translate-y-1/2 opacity-10">
          <Music size={400} />
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center md:text-left">
            <button 
              onClick={onGoToLogin}
              className="flex items-center gap-2 text-indigo-600 font-semibold mb-4 hover:gap-3 transition-all"
            >
              <ArrowLeft size={18} />
              <span>লগইন-এ ফিরে যান</span>
            </button>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">একাউন্ট তৈরি করুন</h2>
            <p className="text-slate-500">শুরু করতে নিচের তথ্যগুলো প্রদান করুন</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">পূর্ণ নাম</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম লিখুন" 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

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
              <label className="block text-sm font-semibold text-slate-700 mb-2">পাসওয়ার্ড</label>
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

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                নিবন্ধন করুন
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              ইতিমধ্যে একাউন্ট আছে? {' '}
              <button onClick={onGoToLogin} className="text-indigo-600 font-bold hover:underline">লগইন করুন</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
