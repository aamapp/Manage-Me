
import React, { useState } from 'react';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2 } from 'lucide-react';
import { APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';

export const Settings: React.FC = () => {
  const { user, setUser } = useAppContext();
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    occupation: user.occupation || '',
    language: user.language || 'bn',
    currency: user.currency || '৳'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setUser(prev => ({
        ...prev,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        occupation: formData.occupation,
        language: formData.language as 'bn' | 'en',
        currency: formData.currency as '৳' | '$'
      }));
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">সেটিংস</h1>
        <p className="text-slate-500">আপনার একাউন্ট এবং অ্যাপলিকেশন সেটিংস এখান থেকে পরিবর্তন করুন।</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center gap-4 bg-slate-50/50">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
            {formData.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{formData.name}</h3>
            <p className="text-slate-500 text-sm">প্রোফাইল তথ্য আপডেট করুন</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">পূর্ণ নাম</label>
              <input 
                type="text" 
                name="name"
                value={formData.name} 
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ইমেইল এড্রেস</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ফোন নম্বর</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">পেশা</label>
              <input 
                type="text" 
                name="occupation"
                value={formData.occupation} 
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe size={18} className="text-indigo-600" />
              অ্যাপলিকেশন সেটিংস
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">ভাষা</label>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer"
                >
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">মুদ্রা (Currency)</label>
                <select 
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer"
                >
                  <option value="৳">টাকা (৳)</option>
                  <option value="$">ইউএস ডলার ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg 
                ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:scale-95'}
              `}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {isSaving ? 'সেভ হচ্ছে...' : 'পরিবর্তনগুলো সেভ করুন'}
            </button>

            {showSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                <CheckCircle2 size={20} />
                <span>সফলভাবে সেভ হয়েছে!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};