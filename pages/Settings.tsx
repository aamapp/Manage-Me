
import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2, Loader2, Camera, UploadCloud, AlertCircle, Lock, Key, Trash2 } from 'lucide-react';
import { APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { AppLock } from '@/components/AppLock';

export const Settings: React.FC = () => {
  const { user, setUser, showToast, appPin, setAppPin, isOnline } = useAppContext();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    language: user?.language || 'bn',
    currency: user?.currency || '৳'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  // 'setup' means setting a new pin, 'disable' means verifying pin to turn it off
  const [pinAction, setPinAction] = useState<'setup' | 'disable' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form data if user updates externally
  useEffect(() => {
    if (user) {
        setFormData(prev => ({
            ...prev,
            name: user.name || prev.name,
            phone: user.phone || prev.phone,
            occupation: user.occupation || prev.occupation,
            currency: user.currency || prev.currency
        }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    if (!isOnline) {
      showToast('অফলাইনে ছবি আপলোড করা যাবে না', 'error');
      return;
    }
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    setIsUploading(true);

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Auth Metadata (for session persistence)
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (authError) throw authError;

      // 4. Update Profiles Table (Source of Truth) - Use UPSERT to ensure record exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // 5. Update Local State
      setUser(prev => prev ? ({ ...prev, avatar_url: publicUrl }) : null);
      showToast('প্রোফাইল ছবি আপডেট হয়েছে!', 'success');

    } catch (error: any) {
      console.error("Upload Error Details:", error);
      showToast(`ছবি আপলোড করতে সমস্যা হয়েছে: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!isOnline) {
      showToast('অফলাইনে সেটিংস সেভ করা যাবে না', 'error');
      return;
    }
    
    // 1. UI Loading State
    setIsSaving(true);
    
    // Snapshot for rollback
    const previousUser = { ...user };
    
    // 2. Optimistic Update - Use functional update to avoid stale closures
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        name: formData.name,
        phone: formData.phone,
        occupation: formData.occupation,
        language: formData.language as 'bn' | 'en',
        currency: formData.currency
      };
    });

    // 3. Fake delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // 4. Stop Loading
    setIsSaving(false);
    showToast('সেটিংস সেভ হয়েছে', 'success');

    // 5. Background Network Sync
    (async () => {
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    name: formData.name,
                    phone: formData.phone,
                    occupation: formData.occupation,
                    language: formData.language,
                    currency: formData.currency
                    // Removed avatar_url to prevent overwriting with stale state
                }
            });

            if (authError) throw authError;

            // Update profiles table silently with all fields
            const { error: profileError } = await supabase.from('profiles').upsert({ 
                id: user.id,
                name: formData.name,
                phone: formData.phone,
                occupation: formData.occupation,
                currency: formData.currency,
                language: formData.language
                // Removed avatar_url to prevent overwriting with stale state
            }, { onConflict: 'id' });

            if (profileError) throw profileError;

        } catch (err: any) {
            console.error("Background Sync Error:", err);
            // Revert UI on critical failure only
            setUser(previousUser);
            showToast(`সেভ করতে সমস্যা হয়েছে: ${err.message || 'নেটওয়ার্ক এরর'}`, 'error');
        }
    })();
  };

  const handleChangePassword = async () => {
    if (!isOnline) {
      showToast('অফলাইনে পাসওয়ার্ড পরিবর্তন করা যাবে না', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
        showToast('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
        return;
    }
    setIsChangingPass(true);
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast('পাসওয়ার্ড পরিবর্তন সফল হয়েছে', 'success');
        setNewPassword('');
    } catch (err: any) {
        showToast(`ভুল: ${err.message}`, 'error');
    } finally {
        setIsChangingPass(false);
    }
  };

  const handlePinToggle = () => {
      if (appPin) {
          setPinAction('disable');
      } else {
          setPinAction('setup');
      }
  };

  const handlePinSuccess = (pin: string) => {
      if (pinAction === 'setup') {
          setAppPin(pin);
          showToast('অ্যাপ লক চালু করা হয়েছে!', 'success');
      } else if (pinAction === 'disable') {
          setAppPin(null);
          showToast('অ্যাপ লক বন্ধ করা হয়েছে', 'success');
      }
      setPinAction(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">সেটিংস</h1>
        <p className="text-slate-500">প্রোফাইল এবং সিকিউরিটি কনফিগারেশন</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b flex items-center gap-5 bg-slate-50/50">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-indigo-100 flex items-center justify-center relative">
               {user.avatar_url ? (
                 <img 
                   key={user.avatar_url}
                   src={user.avatar_url} 
                   alt="Profile" 
                   className="w-full h-full object-cover" 
                 />
               ) : (
                 <span className="text-indigo-600 text-3xl font-bold">{formData.name ? formData.name.charAt(0) : 'U'}</span>
               )}
               {isUploading && (
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                   <Loader2 className="animate-spin text-white" size={24} />
                 </div>
               )}
            </div>
            <label 
              className={`absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-md transition-transform z-20 ${isUploading || !isOnline ? 'opacity-50 pointer-events-none cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-90 cursor-pointer'}`}
            >
              <Camera size={14} />
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={isUploading || !isOnline} 
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{formData.name || 'ইউজার'}</h3>
            <p className="text-slate-500 text-xs font-medium">{formData.occupation || 'পেশা যুক্ত করা হয়নি'}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* General Settings */}
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">পূর্ণ নাম</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">পেশা</label>
                  <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" placeholder="যেমন: সাউন্ড ইঞ্জিনিয়ার" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">মুদ্রা (Currency)</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer">
                        <option value="৳">টাকা (৳)</option>
                        <option value="$">ইউএস ডলার ($)</option>
                        <option value="₹">ইন্ডিয়ান রুপি (₹)</option>
                        <option value="€">ইউরো (€)</option>
                        <option value="£">পাউন্ড (£)</option>
                        <option value="SAR">সৌদি রিয়াল (SAR)</option>
                        <option value="AED">আমিরাতি দিরহাম (AED)</option>
                        <option value="MYR">মালয়েশিয়ান রিঙ্গিত (MYR)</option>
                    </select>
                </div>
             </div>
             <button onClick={handleSave} disabled={isSaving || isUploading || !isOnline} className={`w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg mt-2 ${isSaving || isUploading || !isOnline ? 'bg-indigo-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-100'}`}>
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
             </button>
          </div>

          {/* Security Section */}
          <div className="pt-6 border-t border-slate-100">
             <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
               <Shield size={16} className="text-indigo-600" />
               সিকিউরিটি
             </h4>

             {/* App Lock */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appPin ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                         <Lock size={20} />
                     </div>
                     <div>
                         <p className="font-bold text-slate-800 text-sm">অ্যাপ লক</p>
                         <p className="text-xs text-slate-500">{appPin ? 'পিন কোড চালু আছে' : 'পিন কোড দিয়ে অ্যাপ লক করুন'}</p>
                     </div>
                 </div>
                 <button 
                    onClick={handlePinToggle}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${appPin ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${appPin ? 'left-7' : 'left-1'}`}></div>
                 </button>
             </div>

             {/* Change Password */}
             <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">পাসওয়ার্ড পরিবর্তন</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="password" 
                            placeholder="নতুন পাসওয়ার্ড দিন..." 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                        />
                    </div>
                    <button 
                        onClick={handleChangePassword}
                        disabled={!newPassword || isChangingPass || !isOnline}
                        className={`text-white px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${!newPassword || isChangingPass || !isOnline ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'}`}
                    >
                        {isChangingPass ? <Loader2 size={16} className="animate-spin" /> : 'আপডেট'}
                    </button>
                </div>
             </div>

             {/* Clear Cache Utility */}
             <div className="pt-6 mt-6 border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (window.confirm('আপনি কি অ্যাপের ক্যাশ ক্লিয়ার করতে চান? এটি আপনাকে লগআউট করে দিবে এবং সব তথ্য নতুন করে লোড হবে।')) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  অ্যাপ ক্যাশ ক্লিয়ার করুন
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Pin Action Modal (Setup or Disable) */}
      {pinAction && (
          <AppLock 
            // If we are disabling, we use 'unlock' mode (verify current pin).
            // If we are setting up, we use 'setup' mode.
            mode={pinAction === 'disable' ? 'unlock' : 'setup'}
            savedPin={pinAction === 'disable' ? appPin : undefined}
            onSuccess={handlePinSuccess}
            onCancel={() => setPinAction(null)}
          />
      )}
    </div>
  );
};
    