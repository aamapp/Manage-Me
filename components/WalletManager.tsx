import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Wallet } from '@/types';
import { 
  Wallet as WalletIcon, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Check, 
  Loader2, 
  X,
  CreditCard,
  Banknote,
  AlertTriangle
} from 'lucide-react';

export const WalletManager: React.FC = () => {
  const { user, showToast } = useAppContext();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDbAvailable, setIsDbAvailable] = useState<boolean>(true);
  
  // Floating Action Button visibility based on scroll direction (optimized with direct DOM ref to run at 60fps without React lagging)
  const fabRef = useRef<HTMLButtonElement>(null);
  const isFabVisibleRef = useRef(true);
  const lastScrollY = useRef(0);

  const setFabVisibleDirectly = (visible: boolean) => {
    if (isFabVisibleRef.current === visible) return;
    isFabVisibleRef.current = visible;
    
    const el = fabRef.current;
    if (!el) return;
    
    if (visible) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(32px) scale(0.9)';
      el.style.pointerEvents = 'none';
    }
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let lastTouchY = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diffScrollY = currentScrollY - lastScrollY.current;
      
      if (diffScrollY > 0) {
        setFabVisibleDirectly(false);
      } else if (diffScrollY < 0) {
        setFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (currentScrollY < 30) {
        setFabVisibleDirectly(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        lastTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const currentY = e.touches[0].clientY;
      const diffY = currentY - lastTouchY;
      
      // finger moved UP (scrolling DOWN) -> Hide FAB instantly
      if (diffY < 0) {
        setFabVisibleDirectly(false);
      } 
      // finger moved DOWN (scrolling UP) -> Show FAB instantly
      else if (diffY > 0) {
        setFabVisibleDirectly(true);
      }
      
      lastTouchY = currentY;
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setFabVisibleDirectly(true);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        setFabVisibleDirectly(false);
      } else if (e.deltaY < 0) {
        setFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setFabVisibleDirectly(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Modal & form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    isDefault: false
  });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Default wallets: on fresh account, only 'ক্যাশ' is created as default with 0 balance
  const getDefaultWallets = (userId: string): Wallet[] => {
    return [
      {
        id: `wallet-cash-${userId}`,
        name: 'ক্যাশ',
        balance: 0,
        isDefault: true,
        lastTransactionDate: 'নতুন ওয়ালেট',
        userid: userId,
        createdAt: new Date().toISOString()
      }
    ];
  };

  // Convert English numerals to Bengali digits
  const toBanglaDigits = (num: number | string): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    
    // Format number to have commas (e.g. 9,000)
    let str = num.toString();
    
    // If it's a numeric value, format search
    if (typeof num === 'number') {
      str = Math.abs(num).toLocaleString('en-US');
    }

    let converted = str.replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);

    if (typeof num === 'number' && num < 0) {
      converted = '-' + converted;
    }
    
    return converted;
  };

  // Fetch wallets
  const fetchWallets = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('userid', user.id);
        
      if (error) {
        throw error;
      };

      if (data && data.length > 0) {
        // Automatic cleanup check for existing mock wallets (leaving only 'ক্যাশ' or active user custom wallets)
        const dummyIds = [
          `wallet-rashidul-${user.id}`,
          `wallet-bkash-${user.id}`,
          `wallet-nagad-${user.id}`,
          `wallet-tahaj-${user.id}`
        ];
        const dummyNames = ['রাশিদুল ইসলাম', 'বিকাশ', 'নগদ', 'তাহাজ উদ্দিন'];
        const hasDummies = data.some(w => dummyIds.includes(w.id) || dummyNames.includes(w.name));
        const hasLegacyCashBalance = data.some(w => w.name === 'ক্যাশ' && w.balance === 9005);

        let processedData = data;

        if (hasDummies || hasLegacyCashBalance) {
          // Keep other wallets, and ensure 'ক্যাশ' exists with 0 balance
          processedData = data.filter(w => !dummyIds.includes(w.id) && !dummyNames.includes(w.name));
          
          const cashWallet = processedData.find(w => w.name === 'ক্যাশ' || w.id === `wallet-cash-${user.id}`);
          if (!cashWallet) {
            processedData.push({
              id: `wallet-cash-${user.id}`,
              name: 'ক্যাশ',
              balance: 0,
              isDefault: true,
              lastTransactionDate: 'নতুন ওয়ালেট',
              userid: user.id,
              createdAt: new Date().toISOString()
            });
          } else if (cashWallet.balance === 9005) {
            cashWallet.balance = 0;
            cashWallet.lastTransactionDate = 'নতুন ওয়ালেট';
          }

          // Trigger background clean up
          try {
            const deleteIds = data
              .filter(w => dummyIds.includes(w.id) || dummyNames.includes(w.name))
              .map(w => w.id);
            if (deleteIds.length > 0) {
              await supabase.from('wallets').delete().in('id', deleteIds);
            }
            await supabase.from('wallets').upsert(processedData);
          } catch (dbErr) {
            console.warn("Error deleting mock rows from DB:", dbErr);
          }
        }

        // Sort: default wallets first, then by name
        const sortedData = [...processedData].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setWallets(sortedData);
        setIsDbAvailable(true);
        localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(sortedData));
      } else {
        // No DB records, seed one standard default 'ক্যাশ' wallet
        const defaults = getDefaultWallets(user.id);
        try {
          const { error: insertError } = await supabase.from('wallets').insert(defaults);
          if (!insertError) {
            setWallets(defaults);
            setIsDbAvailable(true);
            localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(defaults));
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("DB insert seeding ignored, fallback to local cache");
        }
        setWallets(defaults);
        setIsDbAvailable(true);
        localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(defaults));
      }
    } catch (err) {
      console.warn("Database WALLETS table not available, using local cache fallback:", err);
      setIsDbAvailable(false);
      initializeLocalStorageFallback();
    } finally {
      setLoading(false);
    }
  };

  const initializeLocalStorageFallback = () => {
    if (!user) return;
    const cached = localStorage.getItem(`manage_me_wallets_${user.id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const dummyIds = [
          `wallet-rashidul-${user.id}`,
          `wallet-bkash-${user.id}`,
          `wallet-nagad-${user.id}`,
          `wallet-tahaj-${user.id}`
        ];
        const dummyNames = ['রাশিদুল ইসলাম', 'বিকাশ', 'নগদ', 'তাহাজ উদ্দিন'];
        const hasDummies = parsed.some((w: any) => dummyIds.includes(w.id) || dummyNames.includes(w.name));
        const hasLegacyCashBalance = parsed.some((w: any) => w.name === 'ক্যাশ' && w.balance === 9005);

        if (hasDummies || hasLegacyCashBalance) {
          const processed = parsed.filter((w: any) => !dummyIds.includes(w.id) && !dummyNames.includes(w.name));
          const cashWallet = processed.find((w: any) => w.name === 'ক্যাশ' || w.id === `wallet-cash-${user.id}`);
          if (!cashWallet) {
            processed.push({
              id: `wallet-cash-${user.id}`,
              name: 'ক্যাশ',
              balance: 0,
              isDefault: true,
              lastTransactionDate: 'নতুন ওয়ালেট',
              userid: user.id,
              createdAt: new Date().toISOString()
            });
          } else if (cashWallet.balance === 9005) {
            cashWallet.balance = 0;
            cashWallet.lastTransactionDate = 'নতুন ওয়ালেট';
          }
          setWallets(processed);
          localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(processed));
        } else {
          setWallets(parsed);
        }
      } catch (e) {
        const defaults = getDefaultWallets(user.id);
        setWallets(defaults);
        localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(defaults));
      }
    } else {
      const defaults = getDefaultWallets(user.id);
      setWallets(defaults);
      localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(defaults));
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [user?.id]);

  // Handle menu outside click close
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Save changes locally and to Supabase
  const saveWalletsState = async (updatedWallets: Wallet[]) => {
    if (!user) return;
    
    // Sort so default is always first
    const sorted = [...updatedWallets].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setWallets(sorted);
    localStorage.setItem(`manage_me_wallets_${user.id}`, JSON.stringify(sorted));

    if (isDbAvailable) {
      try {
        // Since we want robust sync, let's upsert to Supabase
        const { error } = await supabase.from('wallets').upsert(sorted);
        if (error) console.error("Database sync failed:", error);
      } catch (e) {
        console.warn("Offline or database upsert failed, changes locally saved");
      }
    }
  };

  // Switch default wallet
  const handleSetDefault = async (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const updated = wallets.map(w => ({
      ...w,
      isDefault: w.id === walletId
    }));
    
    await saveWalletsState(updated);
    showToast('আপনার ডিফল্ট ওয়ালেটটি পরিবর্তন করা হয়েছে।', 'success');
    setActiveMenuId(null);
  };

  // Delete a wallet
  const handleDelete = async (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const targetWallet = wallets.find(w => w.id === walletId);
    if (!targetWallet) return;
    
    if (targetWallet.isDefault) {
      showToast('ডিফল্ট ওয়ালেটটি মুছে ফেলা সম্ভব নয়! ডিলিট করার আগে অন্য ওয়ালেট ডিফল্ট করুন।', 'error');
      setActiveMenuId(null);
      return;
    }

    if (!window.confirm(`আপনি কি সত্যিই "${targetWallet.name}" ওয়ালেটটি মুছে ফেলতে চান?`)) {
      setActiveMenuId(null);
      return;
    }

    const updated = wallets.filter(w => w.id !== walletId);
    
    // Remove from DB if possible
    if (isDbAvailable) {
      try {
        await supabase.from('wallets').delete().eq('id', walletId);
      } catch (err) {
        console.warn("DB delete failed, deleted state saved locally");
      }
    }

    await saveWalletsState(updated);
    showToast('ওয়ালেট সফলভাবে মুছে ফেলা হয়েছে।', 'success');
    setActiveMenuId(null);
  };

  // Open Edit Dialog
  const handleOpenEdit = (wallet: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      balance: wallet.balance.toString(),
      isDefault: !!wallet.isDefault
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingWallet(null);
    setFormData({
      name: '',
      balance: '',
      isDefault: wallets.length === 0 // If first wallet, default to true
    });
    setIsModalOpen(true);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name.trim()) {
      showToast('ওয়ালেটের নাম দেওয়া প্রয়োজনীয়!', 'error');
      return;
    }

    setSubmitting(true);
    const amount = Number(formData.balance) || 0;
    
    let updated: Wallet[];

    if (editingWallet) {
      // Editing Mode
      const isNowDefault = formData.isDefault;
      updated = wallets.map(w => {
        if (w.id === editingWallet.id) {
          return {
            ...w,
            name: formData.name.trim(),
            balance: amount,
            isDefault: isNowDefault,
            lastTransactionDate: 'আজ, ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
          };
        }
        // If the current wallet is editing to default, other wallets must not be default
        if (isNowDefault && w.id !== editingWallet.id) {
          return { ...w, isDefault: false };
        }
        return w;
      });
      showToast('ওয়ালেট সফলভাবে সংশোধন করা হয়েছে।', 'success');
    } else {
      // Add Mode
      const isNowDefault = formData.isDefault || wallets.length === 0;
      const newId = `wallet-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
      const newWallet: Wallet = {
        id: newId,
        name: formData.name.trim(),
        balance: amount,
        isDefault: isNowDefault,
        lastTransactionDate: 'নতুন ওয়ালেট',
        userid: user.id,
        createdAt: new Date().toISOString()
      };

      if (isNowDefault) {
        // Clear all other defaults
        updated = wallets.map(w => ({ ...w, isDefault: false }));
        updated.push(newWallet);
      } else {
        updated = [...wallets, newWallet];
      }
      showToast('নতুন ওয়ালেট সফলভাবে যুক্ত করা হয়েছে।', 'success');
    }

    await saveWalletsState(updated);
    setIsModalOpen(false);
    setSubmitting(false);
  };

  // Toggle transaction action menu
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Calculations
  const walletCount = wallets.length;
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="w-full max-w-lg mx-auto pb-24 px-0.5 select-none relative animate-in fade-in duration-300">
      
      {/* 1. Header Card - Total Balance */}
      <div className="bg-white border border-slate-100 rounded-2xl py-5 px-4 text-center shadow-[0_2px_12px_rgba(30,117,235,0.02)] mb-4 transition-all mx-0.5">
        <span className="text-slate-500 font-medium text-xs tracking-wide">
          মোট ব্যালেন্স • {toBanglaDigits(walletCount)}টি ওয়ালেট
        </span>
        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1.5">
          ৳ {totalBalance.toLocaleString('en-US')}/-
        </div>
      </div>

      {/* 2. Wallets Loading View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <p className="text-slate-400 text-xs">ওয়ালেট লোড হচ্ছে...</p>
        </div>
      ) : walletCount === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl p-5 mx-0.5">
          <WalletIcon size={40} className="mx-auto text-slate-300 mb-2.5" />
          <p className="text-slate-500 font-semibold text-sm mb-1">কোনো ওয়ালেট পাওয়া যায়নি</p>
          <p className="text-slate-400 text-xs mb-3.5">একটি নতুন ওয়ালেট যোগ করুন আপনার হিসাব ট্র্যাকিং শুরু করতে।</p>
          <button 
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all"
          >
            <Plus size={14} /> ওয়ালেট যোগ করুন
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 px-0.5">
          {/* List wallets */}
          {wallets.map((wallet) => {
            const hasNegativeBalance = wallet.balance < 0;
            const hasPositiveBalance = wallet.balance > 0;
            
            return (
              <div 
                key={wallet.id}
                className="bg-white border border-slate-100/95 rounded-xl py-3.5 px-4 shadow-[0_1.5px_6px_rgba(0,0,0,0.012)] hover:shadow-sm hover:border-blue-100/60 transition-all duration-300 flex items-center justify-between relative group"
              >
                {/* Left side: Icon & Title info */}
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
                  <div className="w-[40px] h-[40px] rounded-full bg-blue-50/70 border border-blue-100/25 flex items-center justify-center text-blue-600/80 transition-all group-hover:scale-105 duration-300 flex-shrink-0">
                    <WalletIcon size={18} className="stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap pb-0.5">
                      <span className="font-normal text-[#1e293b] text-[15px] sm:text-[16px] leading-[1.3] truncate max-w-[150px] sm:max-w-[220px]">
                        {wallet.name}
                      </span>
                      {wallet.isDefault && (
                        <span className="bg-blue-50 text-[9px] text-blue-600 font-bold px-1.5 py-0.5 rounded border border-blue-100/40 shrink-0">
                          ডিফল্ট
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-normal text-[11px] mt-0.5 block leading-[1.3]">
                      {wallet.lastTransactionDate ? (
                        wallet.lastTransactionDate.startsWith('শেষ') ? wallet.lastTransactionDate : `শেষ লেনদেন: ${wallet.lastTransactionDate}`
                      ) : (
                        'শেষ লেনদেন: নেই'
                      )}
                    </span>
                  </div>
                </div>

                {/* Right side: Balance and more menu */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <div className={`font-normal text-right text-[15px] sm:text-base font-mono leading-[1.3] mr-1.5 ${
                    hasNegativeBalance 
                      ? 'text-red-500' 
                      : hasPositiveBalance 
                        ? 'text-emerald-500' 
                        : 'text-slate-800'
                  }`}>
                    ৳ {to_with_sign_digits(wallet.balance)}
                  </div>
                  
                  {/* Action Dropdown Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => toggleMenu(wallet.id, e)}
                      className="p-1 px-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeMenuId === wallet.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-7 bg-white border border-slate-100/90 rounded-xl shadow-md w-40 py-1 z-50 text-slate-700 font-medium text-xs animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        {!wallet.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(wallet.id, e)}
                            className="flex items-center gap-1 w-full text-left py-1.5 px-2.5 hover:bg-slate-50 text-blue-600 transition-all font-semibold"
                          >
                            <Check size={12} /> ডিফল্ট করুন
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(wallet, e)}
                          className="flex items-center gap-1 w-full text-left py-1.5 px-2.5 hover:bg-slate-50 transition-all"
                        >
                          <Edit2 size={11} /> সম্পাদনা করুন
                        </button>
                        {!wallet.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(wallet.id, e)}
                            className="flex items-center gap-1 w-full text-left py-1.5 px-2.5 hover:bg-red-50 text-red-600 transition-all font-semibold border-t border-slate-50 mt-1"
                          >
                            <Trash2 size={11} /> মুছে ফেলুন
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Floating Action Button to Add New Wallet */}
      <button
        ref={fabRef}
        type="button"
        id="add-wallet-fab"
        onClick={handleOpenAdd}
        className="fixed bottom-[76px] lg:bottom-8 right-5 lg:right-8 bg-[#1a73e8] hover:bg-blue-700 active:scale-95 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 transition-all duration-[150ms] ease-out z-40 cursor-pointer pointer-events-auto opacity-100 scale-100 translate-y-0"
        style={{
          willChange: 'transform, opacity',
        }}
        title="নতুন ওয়ালেট যোগ করুন"
      >
        <Plus size={28} />
      </button>

      {/* 4. Overlay Form Modal (Floating) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#f8fafc]">
              <h3 className="text-[17px] font-bold text-slate-800">
                {editingWallet ? 'ওয়ালেট সম্পন্ন করুন' : 'নতুন ওয়ালেট যুক্ত করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Input: Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">ওয়ালেটের নাম</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="বিকাশ, নগদ, রকেট ইত্যাদি"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-none text-[#1e293b] text-sm transition-all"
                />
              </div>

              {/* Input: Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">প্রারম্ভিক ব্যালেন্স (৳)</label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  placeholder="উদাহরণ: ৯০০০"
                  className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl outline-none text-[#1e293b] font-mono text-sm transition-all"
                />
              </div>

              {/* Checkbox: isDefault */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="wallet-default-checkbox"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  disabled={editingWallet?.isDefault} // Cannot turn off default if it's already default
                  className="w-[17px] h-[17px] accent-blue-600 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                />
                <label 
                  htmlFor="wallet-default-checkbox" 
                  className={`text-xs font-semibold text-slate-600 cursor-pointer select-none ${editingWallet?.isDefault ? 'opacity-70' : ''}`}
                >
                  ডিফল্ট ওয়ালেট হিসেবে সেট করুন
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center text-sm transition-all"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-center text-sm transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> লোড হচ্ছে
                    </>
                  ) : (
                    editingWallet ? 'সংরক্ষণ করুন' : 'যোগ করুন'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Helper helper to format positive and negative amounts cleanly
  function to_with_sign_digits(amt: number): string {
    const isNeg = amt < 0;
    const formatted = Math.abs(amt).toLocaleString('en-US');
    if (isNeg) {
      return `-${formatted}`;
    }
    return formatted;
  }
};
