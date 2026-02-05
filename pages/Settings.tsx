
import React, { useState, useRef } from 'react';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2, Loader2, Camera, UploadCloud, AlertCircle, Lock, Key } from 'lucide-react';
import { APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { AppLock } from '../components/AppLock';

export const Settings: React.FC = () => {
  const { user, setUser, showToast, appPin, setAppPin } = useAppContext();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    language: user?.language || 'bn',
    currency: user?.currency || '৳',
    avatar_url: user?.avatar_url || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  // 'setup' means setting a new pin, 'disable' means verifying pin to turn it off
  const [pinAction, setPinAction] = useState<'setup' | 'disable' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    // Unique timestamp to prevent cache issues
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    setIsUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Only update local state for preview
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      showToast('ছবি আপলোড হয়েছে! নিচে "পরিবর্তন সেভ করুন" বাটনে ক্লিক করুন।', 'success');

    } catch (error: any) {
      console.error(error);
      showToast('ছবি আপলোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      // 1. Update Auth Metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          phone: formData.phone,
          occupation: formData.occupation,
          language: formData.language,
          currency: formData.currency,
          avatar_url: formData.avatar_url
        }
      });

      if (error) throw error;

      // 2. Update Profiles Table (Source of Truth)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            name: formData.name,
            avatar_url: formData.avatar_url
        })
        .eq('id', user.id);
        
      if (profileError) console.error("Profile update failed", profileError);

      setUser(prev => prev ? ({
        ...prev,
        name: formData.name,
        phone: formData.phone,
        occupation: formData.occupation,
        language: formData.language as 'bn' | 'en',
        currency: formData.currency as '৳' | '$',
        avatar_url: formData.avatar_url
      }) : null);

      showToast('সেটিংস সফলভাবে সেভ হয়েছে', 'success');
    } catch (err: any) {
      showToast(`সেভ করতে সমস্যা হয়েছে: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
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
          // If PIN exists, we want to disable it. 
          // Open AppLock in 'unlock' mode to verify current PIN first.
          setPinAction('disable');
      } else {
          // If no PIN, we want to setup a new one.
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
        {/* Profile Header (Centered & Improved for Mobile) */}
        <div className="p-8 border-b flex flex-col items-center gap-4 bg-slate-50/50">
          <div 
             onClick={() => !isUploading && fileInputRef.current?.click()}
             className="w-28 h-28 rounded-full bg-white border-4 border-slate-200 shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer transition-all active:scale-95"
          >
             {formData.avatar_url ? (
               <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <span className="text-slate-400 text-4xl font-bold">{formData.name ? formData.name.charAt(0) : 'U'}</span>
             )}
             
             {/* Hover/Tap Overlay */}
             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <UploadCloud className="text-white" size={32} />
             </div>

             {/* Loading State */}
             {isUploading && (
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                 <Loader2 className="animate-spin text-white" size={32} />
               </div>
             )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          
          <div className="text-center">
             <h3 className="text-xl font-bold text-slate-800">{formData.name || 'ইউজার'}</h3>
             <p className="text-slate-500 text-sm font-medium">{formData.email}</p>
             <p className="text-indigo-600 text-xs font-bold mt-2 flex items-center justify-center gap-1">
                <Camera size={12} />
                ছবি পরিবর্তন করতে বৃত্তে ক্লিক করুন
             </p>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* General Settings */}
          <div className="space-y-4">
             <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">পূর্ণ নাম</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">পেশা</label>
                  <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium" placeholder="যেমন: সাউন্ড ইঞ্জিনিয়ার" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">মুদ্রা (Currency)</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium cursor-pointer">
                    <option value="৳">টাকা (৳)</option>
                    <option value="$">ইউএস ডলার ($)</option>
                    </select>
                </div>
             </div>
             <button onClick={handleSave} disabled={isSaving || isUploading} className="w-full flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 mt-2">
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
                        disabled={!newPassword || isChangingPass}
                        className="bg-slate-800 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-900 active:scale-95 transition-all whitespace-nowrap"
                    >
                        {isChangingPass ? <Loader2 size={16} className="animate-spin" /> : 'আপডেট'}
                    </button>
                </div>
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
