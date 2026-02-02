
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export const UpdatePassword: React.FC = () => {
  const { showToast, setUser } = useAppContext();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;

      showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', 'success');
      
      // Update local user state if needed or just navigate
      if (data.user) {
         // Assuming user logic is handled in AppContext via onAuthStateChange, 
         // but we can force navigation to dashboard
      }
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Lock size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">নতুন পাসওয়ার্ড সেট করুন</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী পাসওয়ার্ড দিন।</p>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">নতুন পাসওয়ার্ড</label>
            <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            পাসওয়ার্ড সেভ করুন
          </button>
        </form>
      </div>
    </div>
  );
};
