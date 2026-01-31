
import React, { useState } from 'react';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const Settings: React.FC = () => {
  const { user, setUser, showToast } = useAppContext();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    language: user?.language || 'bn',
    currency: user?.currency || '৳'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          phone: formData.phone,
          occupation: formData.occupation,
          language: formData.language,
          currency: formData.currency
        }
      });

      if (error) throw error;

      setUser(prev => prev ? ({
        ...prev,
        name: formData.name,
        phone: formData.phone,
        occupation: formData.occupation,
        language: formData.language as 'bn' | 'en',
        currency: formData.currency as '৳' | '$'
      }) : null);

      setShowSuccess(true);
      showToast('সেটিংস সফলভাবে সেভ হয়েছে', 'success');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      showToast(`সেভ করতে সমস্যা হয়েছে: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">সেটিংস</h1>
        <p className="text-slate-500">প্রোফাইল কনফিগারেশন</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center gap-4 bg-slate-50/50">
          <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {formData.name ? formData.name.charAt(0) : 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{formData.name || 'ইউজার'}</h3>
            <p className="text-slate-500 text-xs">এডিট প্রোফাইল</p>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">পূর্ণ নাম</label>
              <input 
                type="text" 
                name="name"
                value={formData.name} 
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ইমেইল</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 font-medium cursor-not-allowed" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ফোন নম্বর</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
                placeholder="আপনার ফোন নম্বর"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">পেশা</label>
              <input 
                type="text" 
                name="occupation"
                value={formData.occupation} 
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all font-medium" 
                placeholder="যেমন: সাউন্ড ইঞ্জিনিয়ার"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
              <Globe size={16} className="text-indigo-600" />
              অ্যাপলিকেশন সেটিংস
            </h4>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">ভাষা</label>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer"
                >
                  <option value="৳">টাকা (৳)</option>
                  <option value="$">ইউএস ডলার ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all shadow-lg 
                ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:scale-95'}
              `}
            >
              {isSaving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {isSaving ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
