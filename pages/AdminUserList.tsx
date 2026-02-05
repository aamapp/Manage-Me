
import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { User, Wallet, Briefcase, ChevronRight, UserCog, Users, RefreshCw, AlertCircle, Pencil, X, Save, Loader2, Camera, UploadCloud } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const AdminUserList: React.FC = () => {
  const { allProjects, allIncomeRecords, userProfiles, setAdminSelectedUserId, user, refreshData, showToast } = useAppContext();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{id: string, name: string, avatar_url: string} | null>(null);
  const [newName, setNewName] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Determine active users from projects and income records
  const userList = useMemo(() => {
    const userMap = new Map<string, { 
      id: string, 
      projectCount: number, 
      totalIncome: number,
      lastActive: string
    }>();

    // Process Projects
    allProjects.forEach(p => {
        const u = userMap.get(p.userid) || { id: p.userid, projectCount: 0, totalIncome: 0, lastActive: '' };
        u.projectCount += 1;
        if (p.createdat > u.lastActive) u.lastActive = p.createdat;
        userMap.set(p.userid, u);
    });

    // Process Income
    allIncomeRecords.forEach(i => {
        const u = userMap.get(i.userid) || { id: i.userid, projectCount: 0, totalIncome: 0, lastActive: '' };
        u.totalIncome += i.amount;
        if (i.date > u.lastActive) u.lastActive = i.date;
        userMap.set(i.userid, u);
    });
    
    // Check profiles
    userProfiles.forEach(profile => {
        if (!userMap.has(profile.id)) {
            userMap.set(profile.id, {
                id: profile.id,
                projectCount: 0,
                totalIncome: 0,
                lastActive: ''
            });
        }
    });

    return Array.from(userMap.values());
  }, [allProjects, allIncomeRecords, userProfiles]);

  const handleSelectUser = (userId: string) => {
    setAdminSelectedUserId(userId);
    navigate('/dashboard');
  };

  const handleEditClick = (e: React.MouseEvent, userId: string, currentName: string, currentAvatar: string) => {
      e.stopPropagation(); // Prevent navigating to dashboard
      setEditingUser({ id: userId, name: currentName, avatar_url: currentAvatar });
      setNewName(currentName);
      setNewAvatarUrl(currentAvatar || '');
      setIsEditModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingUser) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    // Unique path per user to avoid overwriting others, using timestamp for uniqueness
    const fileName = `${editingUser.id}/${Date.now()}.${fileExt}`;
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

      setNewAvatarUrl(publicUrl);
      showToast('ছবি আপলোড হয়েছে! সেভ বাটনে ক্লিক করুন।', 'success');

    } catch (error: any) {
      console.error(error);
      showToast('ছবি আপলোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser || !newName.trim()) return;

      setIsSaving(true);
      try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
                name: newName,
                avatar_url: newAvatarUrl
            })
            .eq('id', editingUser.id);

          if (error) throw error;

          showToast('প্রোফাইল আপডেট করা হয়েছে', 'success');
          setIsEditModalOpen(false);
          await refreshData();
      } catch (err: any) {
          showToast(`আপডেট ব্যর্থ: ${err.message}`);
      } finally {
          setIsSaving(false);
      }
  };

  if (user?.role !== 'admin') {
      return (
          <div className="p-8 text-center text-slate-500">
              <UserCog size={48} className="mx-auto mb-4 opacity-20" />
              <p>অ্যাক্সেস নেই। শুধুমাত্র অ্যাডমিনদের জন্য।</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-indigo-700 -mx-4 -mt-20 px-6 pt-24 pb-12 rounded-b-[3rem] shadow-xl mb-6 text-white text-center">
          <h1 className="text-2xl font-black mb-2">অ্যাডমিন প্যানেল</h1>
          <p className="text-indigo-200 text-sm font-medium">ব্যবহারকারী নির্বাচন করুন</p>
      </div>

      <div className="px-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                সমস্ত ইউজার ({userList.length})
            </h2>
            <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-indigo-600 transition-colors active:scale-95 shadow-sm"
            >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
            
          {userList.some(u => !userProfiles.find(p => p.id === u.id)) && (
              <div className="mb-4 mx-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-xs text-amber-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>কিছু ইউজারের ডাটা পাওয়া যাচ্ছে না। দয়া করে সুপাবেজ ড্যাশবোর্ডে SQL স্ক্রিপ্টটি রান করুন।</p>
              </div>
          )}

          <div className="space-y-3">
            {userList.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">কোনো ইউজার ডাটা পাওয়া যায়নি</p>
                </div>
            ) : (
                userList.map((u) => {
                    const profile = userProfiles.find(p => p.id === u.id);
                    // Fallback to truncated ID if name is missing
                    const displayName = profile?.name || `User (${u.id.substring(0, 6)}...)`;
                    const displayEmail = profile?.email || 'ইমেইল পাওয়া যায়নি';
                    const avatarUrl = profile?.avatar_url;
                    const isUnknown = !profile?.name;

                    return (
                        <div 
                            key={u.id}
                            onClick={() => handleSelectUser(u.id)}
                            className={`bg-white p-4 rounded-2xl border ${isUnknown ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'} shadow-sm active:scale-[0.98] transition-all hover:border-indigo-200 hover:shadow-md cursor-pointer group relative`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg group-hover:ring-2 ring-indigo-200 overflow-hidden shrink-0">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            displayName.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-base ${isUnknown ? 'text-amber-700' : 'text-slate-800'}`}>
                                            {displayName}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 font-medium">{displayEmail}</p>
                                        {u.lastActive && (
                                            <p className="text-[9px] text-slate-400 mt-0.5">শেষ অ্যাক্টিভ: {u.lastActive.split('T')[0]}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Edit Button */}
                                    <button 
                                        onClick={(e) => handleEditClick(e, u.id, displayName, avatarUrl || '')}
                                        className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-50 pt-3">
                                <div className="text-center border-r border-slate-50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 flex items-center justify-center gap-1">
                                        <Briefcase size={10} /> প্রজেক্ট
                                    </p>
                                    <p className="font-bold text-slate-700 text-lg">{u.projectCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-emerald-600/70 font-bold uppercase mb-0.5 flex items-center justify-center gap-1">
                                        <Wallet size={10} /> মোট আয়
                                    </p>
                                    <p className="font-bold text-emerald-600 text-lg">৳ {u.totalIncome.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <UserCog size={20} className="text-indigo-600" />
                        প্রোফাইল এডিট
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-full bg-slate-100 border-4 border-slate-50 shadow-inner flex items-center justify-center overflow-hidden relative group cursor-pointer"
                        >
                             {newAvatarUrl ? (
                                 <img src={newAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-3xl font-bold text-slate-400">{newName.charAt(0)}</span>
                             )}
                             
                             {/* Overlay */}
                             <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <UploadCloud className="text-white" size={24} />
                             </div>

                             {/* Loading State */}
                             {isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-white" size={24} />
                                </div>
                             )}
                        </div>
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                    
                    <p className="text-center text-xs text-slate-400 -mt-2 mb-4">ছবি পরিবর্তন করতে বৃত্তে ক্লিক করুন</p>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">নাম</label>
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="ইউজারের নাম..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">অবতার লিংক (ম্যানুয়াল)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={newAvatarUrl} 
                                onChange={(e) => setNewAvatarUrl(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                placeholder="https://..."
                            />
                            <Camera size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSaving || isUploading}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex justify-center items-center gap-2 mt-4"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        সেভ করুন
                    </button>
                </form>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
