import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2, Loader2, Camera, UploadCloud, AlertCircle, Lock, Key, Trash2, Fingerprint, Download, Image as ImageIcon, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { AppLogo } from '@/components/AppLogo';
import { APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { AppLock } from '@/components/AppLock';
import { ConfirmModal } from '@/components/ConfirmModal';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, showToast, appPin, setAppPin, isOnline, isFingerprintEnabled, setIsFingerprintEnabled } = useAppContext();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    language: user?.language || 'bn',
    currency: user?.currency || '৳',
    reminder_times: user?.reminder_times || ['09:00', '15:00', '21:00']
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  // 'setup' means setting a new pin, 'disable' means verifying pin to turn it off
  const [pinAction, setPinAction] = useState<'setup' | 'disable' | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system'>('profile');
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Logo Download States
  const [isCapturingLogo, setIsCapturingLogo] = useState(false);
  const [isLogoDownloadDone, setIsLogoDownloadDone] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  const downloadLogoHD = async () => {
    if (!logoRef.current) return;
    setIsCapturingLogo(true);
    try {
      const canvas = await html2canvas(logoRef.current, {
        width: 1024,
        height: 1024,
        scale: 1,
        backgroundColor: null,
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = "icon.png";
      link.click();
      setIsLogoDownloadDone(true);
      showToast('এইচডি লোগো ডাউনলোড সম্পূর্ণ হয়েছে!', 'success');
      setTimeout(() => setIsLogoDownloadDone(false), 3000);
    } catch (err) {
      console.error('Export logo failed:', err);
      showToast('লোগো ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsCapturingLogo(false);
    }
  };

  const handleCheckUpdate = () => {
    if (!isOnline) {
      showToast('অফলাইনে আপডেট চেক করা সম্ভব নয়', 'error');
      return;
    }
    setIsCheckingUpdate(true);
    const checkEvent = new CustomEvent('check-app-update-manually', {
      detail: {
        callback: (res: { success: boolean; updateAvailable?: boolean; error?: string }) => {
          setIsCheckingUpdate(false);
          if (!res.success) {
            showToast(res.error || 'আপডেট চেক করতে সমস্যা হয়েছে', 'error');
          } else if (res.updateAvailable) {
            showToast('নতুন আপডেট উপলব্ধ রয়েছে!', 'success');
          } else {
            showToast('আপনার অ্যাপটি ইতিমধ্যেই আপ-টু-ডেট রয়েছে!', 'success');
          }
        }
      }
    });
    window.dispatchEvent(checkEvent);
  };

  // Sync form data if user updates externally
  useEffect(() => {
    if (user) {
        setFormData(prev => ({
            ...prev,
            name: user.name || prev.name,
            phone: user.phone || prev.phone,
            occupation: user.occupation || prev.occupation,
            currency: user.currency || prev.currency,
            reminder_times: user.reminder_times || prev.reminder_times
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

      if (profileError) {
          console.warn("Profile table update warning:", profileError.message);
      }

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

            // Update profiles table silently (only fields that exist in the DB schema)
            const { error: profileError } = await supabase.from('profiles').upsert({ 
                id: user.id,
                name: formData.name
            }, { onConflict: 'id' });

            if (profileError) {
                console.warn("Profile table update warning:", profileError.message);
                // Not throwing here because user_metadata is already updated successfully, and profiles table is just a secondary mirror
            }

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

  const getAppUsageDurationString = () => {
    if (!user?.createdat) return `${APP_NAME} এর সাথে ১ দিন`;
    try {
      const startDate = new Date(user.createdat);
      const endDate = new Date();
      
      let years = endDate.getFullYear() - startDate.getFullYear();
      let months = endDate.getMonth() - startDate.getMonth();
      let days = endDate.getDate() - startDate.getDate();
      
      if (days < 0) {
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      
      if (months < 0) {
        months += 12;
        years--;
      }
      
      const toBn = (num: number) => num.toLocaleString('bn-BD');
      
      const parts: string[] = [];
      if (years > 0) {
        parts.push(`${toBn(years)} বছর`);
      }
      if (months > 0) {
        parts.push(`${toBn(months)} মাস`);
      }
      if (days > 0 || parts.length === 0) {
        parts.push(`${toBn(days || 1)} দিন`);
      }
      
      return `${APP_NAME} এর সাথে ${parts.join(' ')}`;
    } catch (e) {
      return `${APP_NAME} এর সাথে ১ দিন`;
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-24 pt-0 min-h-screen bg-slate-50/50 font-sans">
      {/* Header with back button and Save button */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between mb-8 max-w-5xl mx-auto border-b border-slate-200/50 h-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              সেটিং
            </h1>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isUploading || !isOnline}
          className={`px-6 py-2 rounded-full text-sm font-bold text-white transition-all shadow-md active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5 ${
            isSaving || isUploading || !isOnline
              ? 'bg-blue-300 shadow-none cursor-not-allowed'
              : 'bg-[#1a73e8] hover:bg-[#155fc0] shadow-blue-100 hover:shadow-blue-200/50'
          }`}
          id="header-save-btn"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>সেইভ</span>
        </button>
      </div>

      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Centered Profile Section (replacing deep blue header banner) */}
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 max-w-xl mx-auto select-none">
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div 
              onClick={() => !isUploading && isOnline && fileInputRef.current?.click()}
              className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-indigo-50 flex items-center justify-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-300 group"
              title="প্রোফাইল ছবি পরিবর্তন করুন"
              id="settings-avatar-container"
            >
              {user.avatar_url ? (
                <img 
                  key={user.avatar_url}
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
              ) : (
                <span className="text-[#1a73e8] text-4xl font-extrabold">{formData.name ? formData.name.charAt(0) : 'U'}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-indigo-400" size={28} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isUploading && isOnline) {
                  fileInputRef.current?.click();
                }
              }}
              className={`absolute bottom-0 right-1 bg-[#1a73e8] hover:bg-[#155fc0] text-white p-2.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-90 z-20 border-2 border-white flex items-center justify-center ${isUploading || !isOnline ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
              title="ছবি পরিবর্তন করুন"
              id="avatar-upload-trigger"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={isUploading || !isOnline} 
            />
          </div>

          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-4 text-center">
            {formData.name || 'সম্মানিত ইউজার'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 text-center">
            {formData.occupation || 'পেশা যুক্ত করা হয়নি'}
          </p>

          {/* Days joined pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8] font-bold text-xs sm:text-sm shadow-sm">
            <span>💙</span>
            <span>{getAppUsageDurationString()}</span>
          </div>
        </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-3 p-[4px] bg-[#f0f3f6] rounded-2xl gap-1.5 max-w-2xl mx-auto border border-slate-200/40 shadow-inner select-none" id="settings-tab-switcher">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'profile' 
              ? 'bg-[#e2edfc] text-[#1a73e8] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-profile-btn"
        >
          <UserIcon size={16} />
          <span>প্রোফাইল</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'security' 
              ? 'bg-[#e2fced] text-[#50AD54] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-security-btn"
        >
          <Shield size={16} />
          <span>নিরাপত্তা</span>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'system' 
              ? 'bg-[#fcedeb] text-[#db4437] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-system-btn"
        >
          <RefreshCw size={16} />
          <span>সিস্টেম</span>
        </button>
      </div>

      <div className="transition-all duration-300">
        {/* Profile Tab content */}
        {activeTab === 'profile' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-profile">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">প্রোফাইল আপডেট</h3>
              <p className="text-xs text-slate-400">আপনার ব্যক্তিগত তথ্য পরিবর্তন করুন যা পুরো একাউন্টে দেখতে পাবেন।</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পূর্ণ নাম</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all" 
                    id="profile-name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পেশা</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="occupation" 
                    placeholder="যেমন: সাউন্ড ইঞ্জিনিয়ার" 
                    value={formData.occupation} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all" 
                    id="profile-occupation-input"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পছন্দের মুদ্রা (Currency Symbol)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-indigo-600 text-lg">{formData.currency}</span>
                  <select 
                    name="currency" 
                    value={formData.currency} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all cursor-pointer appearance-none"
                    id="profile-currency-select"
                  >
                    <option value="৳">বাংলাদেশী টাকা (৳)</option>
                    <option value="$">ইউএস ডলার ($)</option>
                    <option value="₹">ইন্ডিয়ান রুপি (₹)</option>
                    <option value="€">ইউরো (€)</option>
                    <option value="£">পাউন্ড (£)</option>
                    <option value="SAR">সৌদি রিয়াল (SAR)</option>
                    <option value="AED">আমিরাতি দিরহাম (AED)</option>
                    <option value="MYR">মালয়েশিয়ান রিঙ্গিত (MYR)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={isSaving || isUploading || !isOnline} 
              className={`w-full flex justify-center items-center gap-2 px-6 py-4 rounded-xl font-extrabold text-sm md:text-base text-white transition-all shadow-lg active:scale-95 duration-200 cursor-pointer mt-4 ${isSaving || isUploading || !isOnline ? 'bg-indigo-300 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-100 hover:shadow-indigo-200/50'}`}
              id="profile-save-changes-btn"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'সেভ হচ্ছে...' : 'সেটিংস পরিবর্তন সেভ করুন'}
            </button>
          </div>
        )}

        {/* Security Tab Content */}
        {activeTab === 'security' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-security">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">নিরাপত্তা ও অ্যাক্সেস</h3>
              <p className="text-xs text-slate-400">আপনার একাউন্টকে সুরক্ষিত রাখতে অতিরিক্ত নিরাপত্তা কোড এবং নোটিফিকেশন সেট করুন।</p>
            </div>

            <div className="space-y-4">
              {/* Notification Row */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-sm">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${user?.fcm_token ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm shadow-indigo-50' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    <Bell size={22} className={user?.fcm_token ? "animate-bounce" : ""} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base">পুশ নোটিফিকেশন</h4>
                    <p className="text-xs text-slate-500 leading-normal">{user?.fcm_token ? 'দারুণ! নোটিফিকেশন সার্ভিসটি অ্যাক্টিভ আছে।' : 'জরুরী আপডেট পেতে নোটিফিকেশন পারমিশন ইনঅ্যাক্টিভ।'}</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (!isOnline) {
                      showToast('অফলাইনে নোটিফিকেশন পরিবর্তন করা সম্ভব নয়', 'error');
                      return;
                    }
                    try {
                      const { requestNotificationPermission } = await import('@/lib/firebase');
                      await requestNotificationPermission(user.id);
                      showToast('নোটিফিকেশন পারমিশন আপডেট হয়েছে। মেহেরবানি করে পেজটি রিলোড দিন।', 'info');
                    } catch (err) {
                      showToast('পারমিশন রিকোয়েস্ট ব্যর্থ হয়েছে। ব্রাউজারে নোটিফিকেশন ব্লক করা থাকতে পারে।', 'error');
                    }
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-200 active:scale-95 border cursor-pointer ${user?.fcm_token ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-md shadow-indigo-100'}`}
                  id="toggle-notifications-btn"
                >
                  {user?.fcm_token ? 'অবস্থা রিসেট' : 'চালু করুন'}
                </button>
              </div>

              {/* App Lock & Fingerprint Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* App Lock */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex items-center justify-between transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${appPin ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">অ্যাপ লক পিন</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{appPin ? 'পিন কোড সক্রিয় আছে' : 'পিন দিয়ে অ্যাপ লক করুন'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handlePinToggle}
                    className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 outline-none cursor-pointer border ${appPin ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                    id="settings-pin-toggle"
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${appPin ? 'left-6' : 'left-0.5'}`}></div>
                  </button>
                </div>

                {/* Fingerprint Lock */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex items-center justify-between transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isFingerprintEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">ফিঙ্গারপ্রিন্ট আনলক</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{isFingerprintEnabled ? 'বায়োমেট্রিক সক্রিয় আছে' : 'বায়োমেট্রিক সুবিধা ব্যবহার করুন'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newState = !isFingerprintEnabled;
                      setIsFingerprintEnabled(newState);
                      if (newState) {
                        showToast('ফিঙ্গারপ্রিন্ট সুবিধা চালু করা হয়েছে', 'success');
                      } else {
                        showToast('ফিンダーপ্রিন্ট সুবিধা বন্ধ করা হয়েছে', 'success');
                      }
                    }}
                    className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 outline-none cursor-pointer border ${isFingerprintEnabled ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                    id="settings-fingerprint-toggle"
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${isFingerprintEnabled ? 'left-6' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-slate-50/20 rounded-2xl border border-slate-100 p-5 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key size={18} className="text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base">নতুন পাসওয়ার্ড সেট করুন</h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="অধিক নিরাপদ পাসওয়ার্ড দিন..." 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm transition-all"
                      id="settings-new-password-input"
                    />
                  </div>
                  <button 
                    onClick={handleChangePassword}
                    disabled={!newPassword || isChangingPass || !isOnline}
                    className={`px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm text-white transition-all duration-200 active:scale-95 shadow-md whitespace-nowrap cursor-pointer ${!newPassword || isChangingPass || !isOnline ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200/50'}`}
                    id="settings-password-update-btn"
                  >
                    {isChangingPass ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>আপডেট হচ্ছে...</span>
                      </div>
                    ) : 'পাসওয়ার্ড পরিবর্তন'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab Content */}
        {activeTab === 'system' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-system">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">সিস্টেম ও ব্র্যান্ডিং</h3>
              <p className="text-xs text-slate-400 font-medium">앱 বা ব্র্যান্ড লোগো এবং স্টোরেজ ডেটা নিয়ন্ত্রণ করুন।</p>
            </div>

            <div className="space-y-6">
              {/* Branding and Logo Card */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 transition-all duration-300 hover:shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <ImageIcon size={18} className="text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base">অফিসিয়াল লোগো ডাউনলোড</h4>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Mini Logo Preview */}
                    <div className="w-14 h-14 bg-[#06153a] rounded-xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden shrink-0">
                      <AppLogo variant="navy-striped" size="100%" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm md:text-base">স্মার্ট লোগো প্যাক</p>
                      <p className="text-xs text-slate-500 leading-normal max-w-md">১০২৪x১০২৪ সাইজের ক্রিস্প এইচডি রেজোলিউশনে অ্যান্ড্রয়েড স্টুডিও বা ব্র্যান্ডিং কাজের জন্য ডাউনলোড করুন।</p>
                    </div>
                  </div>
                  <button 
                    onClick={downloadLogoHD}
                    disabled={isCapturingLogo}
                    className={`w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-xs md:text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border border-transparent cursor-pointer
                      ${isLogoDownloadDone ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}
                    `}
                    id="settings-download-logo-btn"
                  >
                    {isCapturingLogo ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>প্রসেসিং...</span>
                      </>
                    ) : isLogoDownloadDone ? (
                      <>
                        <Check size={16} />
                        <span>ডাউনলোড হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>ডাউনলোড করুন</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Behind the scenes 1024x1024 pixel clean layout for crisp image extraction */}
                <div className="fixed -top-[9999px] -left-[9999px] -z-50 pointer-events-none opacity-0 select-none overflow-hidden" style={{ width: '1024px', height: '1024px' }}>
                  <div 
                    ref={logoRef}
                    style={{ 
                      width: '1024px', 
                      height: '1024px', 
                      backgroundColor: '#06153a', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <AppLogo variant="navy-striped" size="100%" rounded={false} />
                  </div>
                </div>
              </div>

              {/* Updates Row */}
              <div className="space-y-4">
                {/* Actual update check */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-indigo-50/80 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <RefreshCw size={20} className={isCheckingUpdate ? "animate-spin" : ""} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm md:text-base">সিস্টেম আপডেট</h4>
                      <p className="text-xs text-slate-500 leading-normal max-w-md">সার্ভারে কোড ও সংস্করণের নতুন ডেটাবেস আপডেট চেক করুন।</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 shadow-md shadow-indigo-100 disabled:shadow-none transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    id="settings-check-update-btn"
                  >
                    {isCheckingUpdate ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>গবেষণা হচ্ছে...</span>
                      </>
                    ) : (
                      <span>আপডেট চেক করুন</span>
                    )}
                  </button>
                </div>

                {/* Demo preview check */}
                <div className="bg-gradient-to-r from-violet-50/30 to-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-305 hover:shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-white text-indigo-600 border border-indigo-100 shadow-sm rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">✨</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-indigo-950 text-sm md:text-base">ডেমো আপডেট মডাল</h4>
                      <p className="text-xs text-indigo-600/80 leading-normal max-w-md font-medium">ইনস্টল প্রসেস এবং ডাউনলোড ইন্টারফেস দেখার প্রিভিউ সংস্করণ।</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('trigger-demo-update-modal'));
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 active:scale-95 shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer whitespace-nowrap"
                    id="settings-demo-update-btn"
                  >
                     প্রিভিউ দেখুন
                  </button>
                </div>
              </div>

              {/* Clear Cache Danger Zone */}
              <div className="border-t border-rose-100/60 pt-5 mt-6">
                <div className="flex items-start md:items-center justify-between bg-rose-50/40 border border-rose-100/60 p-4 md:p-5 rounded-2xl flex-col md:flex-row gap-4">
                  <div className="space-y-1">
                    <h4 className="text-rose-800 font-extrabold text-sm md:text-base">বিপদজনক অঞ্চল (Danger Zone)</h4>
                    <p className="text-xs text-rose-500 max-w-lg leading-normal font-medium">লোকাল ক্যাশ মেমোরি পরিষ্কার করুন। এটি করলে অ্যাপ সেশন থেকে আপনাকে সাথে সাথে সফলভাবে লগআউট করা হবে।</p>
                  </div>
                  <button 
                    onClick={() => setShowClearCacheModal(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 py-3 px-5 bg-rose-600 text-white rounded-xl font-extrabold text-xs md:text-sm hover:bg-rose-700 shadow-md shadow-rose-100 hover:border-transparent cursor-pointer active:scale-95 duration-200"
                    id="settings-clear-cache-btn"
                  >
                    <Trash2 size={16} />
                    অ্যাপ ক্যাশ সাফ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Clear Cache Premium Confirmation Modal */}
      <ConfirmModal 
        isOpen={showClearCacheModal}
        onClose={() => setShowClearCacheModal(false)}
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        }}
        title="ক্যাশ ক্লিয়ার করুন"
        message="আপনি কি অ্যাপের ক্যাশ ক্লিয়ার করতে চান? এটি আপনাকে লগআউট করে দিবে এবং সব তথ্য নতুন করে লোড হবে।"
        confirmText="ক্লিয়ার করুন"
        cancelText="বাতিল"
        type="danger"
      />
      </div>
    </div>
  );
};
