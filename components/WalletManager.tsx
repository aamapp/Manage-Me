import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '@/context/AppContext';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
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
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  ArrowLeft
} from 'lucide-react';

const parseExpenseNotes = (fullNotes: string): { notes: string; wallet: string } => {
  if (!fullNotes) return { notes: '', wallet: 'ক্যাশ' };
  const match = fullNotes.match(/(.*)\s*\[ওয়ালেট:\s*(.*)\]$/);
  if (match) {
    return {
      notes: match[1].trim(),
      wallet: match[2].trim()
    };
  }
  return {
    notes: fullNotes,
    wallet: 'ক্যাশ'
  };
};

export const WalletManager: React.FC = () => {
  const { user, showToast, refreshData, expenses, incomeRecords, duePersons } = useAppContext();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDbAvailable, setIsDbAvailable] = useState<boolean>(true);

  // State for Add Money directly to wallet
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [payWallet, setPayWallet] = useState<Wallet | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paySource, setPaySource] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);

  // State for details view modal
  const [selectedDetailsWallet, setSelectedDetailsWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    // Dispatch immediately
    window.dispatchEvent(new CustomEvent('wallet-subview-changed', {
      detail: { hasSubView: selectedDetailsWallet !== null }
    }));

    // Dispatch after a tiny 60ms timeout to ensure DOM/React cycle settling
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('wallet-subview-changed', {
        detail: { hasSubView: selectedDetailsWallet !== null }
      }));
    }, 60);

    return () => {
      clearTimeout(t);
      window.dispatchEvent(new CustomEvent('wallet-subview-changed', {
        detail: { hasSubView: false }
      }));
    };
  }, [selectedDetailsWallet]);
  
  useEffect(() => {
    const handleGlobalAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === 'wallet') {
        handleOpenAdd();
      }
    };
    window.addEventListener('open-add-modal', handleGlobalAdd);
    return () => window.removeEventListener('open-add-modal', handleGlobalAdd);
  }, [wallets]);

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
  const fetchWallets = async (background = false) => {
    if (!user) return;
    if (!background) setLoading(true);
    
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

    const handleWalletsUpdated = () => fetchWallets(true);
    window.addEventListener('wallets-updated', handleWalletsUpdated);
    return () => window.removeEventListener('wallets-updated', handleWalletsUpdated);
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

  // Open Add Money Modal
  const handleOpenAddMoney = (wallet: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayWallet(wallet);
    setPayAmount('');
    setPaySource('');
    setIsPayModalOpen(true);
    setActiveMenuId(null);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !payWallet) return;

    const amountNum = Number(payAmount);
    if (!payAmount || isNaN(amountNum) || amountNum <= 0) {
      showToast('দয়া করে সঠিক টাকার পরিমাণ দিন', 'error');
      return;
    }

    setPaySubmitting(true);
    try {
      const sourceName = paySource.trim() || 'সরাসরি ওয়ালেটে যুক্ত';
      const timestamp = new Date().toISOString();

      // 1. Double check current wallets
      const updated = wallets.map(w => {
        if (w.id === payWallet.id) {
          const newBal = Number(w.balance || 0) + amountNum;
          return {
            ...w,
            balance: newBal,
            lastTransactionDate: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
          };
        }
        return w;
      });

      // 2. Add to Supabase
      if (isDbAvailable) {
        const { error: insErr } = await supabase.from('income_records').insert({
          id: `income-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`,
          projectid: null,
          projectname: sourceName,
          clientname: 'সরাসরি ওয়ালেট যোগ',
          amount: amountNum,
          date: timestamp,
          method: payWallet.name,
          userid: user.id
        });

        if (insErr) {
          console.error("Failed to insert income record:", insErr);
          throw insErr;
        }
      }

      await saveWalletsState(updated);
      
      // Refresh AppContext data to keep all charts/totals in sync immediately!
      try {
        await refreshData();
      } catch (err) {
        console.warn("Refresh context error ignored: ", err);
      }

      window.dispatchEvent(new CustomEvent('wallets-updated'));
      showToast(`সফলভাবে ৳${toBanglaDigits(amountNum)}/- ${payWallet.name} ওয়ালেটে যুক্ত হয়েছে!`, 'success');
      setIsPayModalOpen(false);
    } catch (err: any) {
      console.error("Error adding money to wallet:", err);
      showToast('টাকা যুক্ত করতে সমস্যা হয়েছে: ' + err.message, 'error');
    } finally {
      setPaySubmitting(false);
    }
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
    // Maintain old balance when editing name, or default to 0 for a new wallet
    const amount = editingWallet ? Number(editingWallet.balance || 0) : 0;
    
    let updated: Wallet[];

    if (editingWallet) {
      // Editing Mode: Only name is updated
      updated = wallets.map(w => {
        if (w.id === editingWallet.id) {
          return {
            ...w,
            name: formData.name.trim(),
            // Maintain balance
            balance: amount,
            lastTransactionDate: 'আজ, ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
          };
        }
        return w;
      });
      showToast('ওয়ালেটের নাম সফলভাবে পরিবর্তন করা হয়েছে।', 'success');
    } else {
      // Add Mode: Balance is initialized to 0
      const isNowDefault = wallets.length === 0; // First wallet is default by default
      const newId = `wallet-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
      const newWallet: Wallet = {
        id: newId,
        name: formData.name.trim(),
        balance: 0,
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
    
    try {
      await refreshData();
    } catch (err) {
      console.warn("Refresh context error ignored: ", err);
    }

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

  // Helper functions for Bengali formatting and fetching detailed transaction list
  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const formatDateToBangla = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      
      const day = dateObj.getDate();
      const monthIdx = dateObj.getMonth();
      const year = dateObj.getFullYear();
      
      const banglaMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      
      return `${toBanglaNumbers(day)} ${banglaMonths[monthIdx]}, ${toBanglaNumbers(year)}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeToBangla = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return '';
      
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      
      return `${toBanglaNumbers(hours)}:${toBanglaNumbers(minutesStr)} ${ampm}`;
    } catch {
      return '';
    }
  };

  const getWalletTransactions = (walletName: string) => {
    const list: any[] = [];

    // 1. Incomes
    if (incomeRecords) {
      incomeRecords.forEach((i) => {
        const method = i.method || 'বিকাশ';
        if (method.trim() === walletName.trim()) {
          let rawDate = new Date();
          if (i.date) {
            const parsedD = new Date(i.date);
            if (!isNaN(parsedD.getTime())) rawDate = parsedD;
          }
          list.push({
            id: i.id,
            type: 'income',
            amount: i.amount,
            date: i.date,
            title: i.projectname || 'আয়',
            subtitle: i.clientname || 'সরাসরি ওয়ালেট যোগ',
            rawDate,
          });
        }
      });
    }

    // 2. Expenses
    if (expenses) {
      expenses.forEach((e) => {
        const parsed = parseExpenseNotes(e.notes);
        if (parsed.wallet.trim() === walletName.trim()) {
          let rawDate = new Date();
          if (e.date) {
            const parsedD = new Date(e.date);
            if (!isNaN(parsedD.getTime())) rawDate = parsedD;
          }
          const categoryLabel = EXPENSE_CATEGORY_LABELS[e.category] || e.category;
          list.push({
            id: e.id,
            type: 'expense',
            amount: e.amount,
            date: e.date,
            title: parsed.notes || categoryLabel || 'অন্যান্য খরচ',
            subtitle: categoryLabel || 'খরচ',
            rawDate,
          });
        }
      });
    }

    // 3. Due transactions
    if (duePersons) {
      duePersons.forEach((person) => {
        if (person.transactions) {
          person.transactions.forEach((tx) => {
            const wName = tx.walletName || 'ক্যাশ';
            if (wName.trim() === walletName.trim()) {
              let rawDate = new Date();
              if (tx.date) {
                const parsedD = new Date(tx.date);
                if (!isNaN(parsedD.getTime())) rawDate = parsedD;
              }
              list.push({
                id: tx.id,
                type: tx.type === 'receive' ? 'income' : 'expense',
                amount: tx.amount,
                date: tx.date,
                title: tx.description || `${tx.type === 'receive' ? 'টাকা গ্রহণ' : 'টাকা প্রদান'}`,
                subtitle: `দেনাদার/পাওনাদার: ${person.name}`,
                rawDate,
              });
            }
          });
        }
      });
    }

    // Sort by date descending
    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  };

  if (selectedDetailsWallet) {
    const txList = getWalletTransactions(selectedDetailsWallet.name);
    const totalTxCount = txList.length;

    return (
      <div className="w-full max-w-lg mx-auto pb-24 px-1.5 select-none relative animate-in slide-in-from-right duration-300">
        
        {/* Nice Header with Back Button */}
        <div className="flex items-center justify-between pb-3.5 pt-1.5 mb-4 border-b border-slate-100/90">
          <button
            type="button"
            onClick={() => setSelectedDetailsWallet(null)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-all font-bold text-[14px] cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>ফিরে যান</span>
          </button>
          
          <h3 className="text-[17px] font-black text-slate-800 tracking-tight text-right flex-1 pr-1 truncate">
            {selectedDetailsWallet.name} - এর লেনদেন
          </h3>
        </div>

        {/* Wallet Info Banner */}
        <div className="bg-white border border-slate-100 rounded-2xl py-4.5 px-6 text-center shadow-[0_2px_12px_rgba(30,117,235,0.015)] mb-4">
          <span className="text-slate-500 font-medium text-[11px] tracking-wide">
            বর্তমান ব্যালেন্স • মোট লেনদেন: {toBanglaDigits(totalTxCount)}টি
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#1e75eb] tracking-tight mt-1.5">
            ৳ {to_with_sign_digits(selectedDetailsWallet.balance)}/-
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-2.5">
          {totalTxCount === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
              <Banknote size={38} className="mx-auto text-slate-300 mb-2.5" />
              <p className="text-slate-500 font-bold text-sm mb-1">কোনো লেনদেন পাওয়া যায়নি</p>
              <p className="text-slate-400 text-xs">এই ওয়ালেটে এখনো কোনো লেনদেন হিসাব করা হয়নি।</p>
            </div>
          ) : (
            txList.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div 
                  key={tx.id}
                  className="bg-white border border-slate-100/90 rounded-lg p-3.5 flex justify-between items-center shadow-[0_1.5px_6px_rgba(0,0,0,0.008)] hover:shadow-sm hover:border-slate-200 transition-all duration-200"
                >
                  {/* Left Side: Icon, Title & Date */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isIncome 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-rose-50 text-rose-600'
                    }`}>
                      {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13.5px] font-bold text-slate-800 leading-tight truncate">
                        {tx.title}
                      </h4>
                      {tx.subtitle && 
                       tx.subtitle.trim() !== 'অন্যান্য' && 
                       tx.subtitle.trim() !== 'Others' && 
                       tx.subtitle.trim() !== 'Other' && 
                       tx.subtitle.trim() !== 'অন্যান্য খরচ' && 
                       tx.subtitle.trim() !== 'খরচ' && 
                       tx.subtitle.trim() !== tx.title && (
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                          {tx.subtitle}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 shrink-0">
                          <Calendar size={10} className="text-slate-300" />
                          {formatDateToBangla(tx.date)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 shrink-0 ml-1.5">
                          <Clock size={10} className="text-slate-300" />
                          {formatTimeToBangla(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Amount */}
                  <div className={`text-[14px] sm:text-[15px] font-bold font-mono tracking-tight shrink-0 text-right ${
                    isIncome ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {isIncome ? '+' : '-'} ৳ {toBanglaDigits(tx.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

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
                onClick={() => setSelectedDetailsWallet(wallet)}
                className="bg-white border border-slate-100/95 rounded-xl py-3.5 px-4 shadow-[0_1.5px_6px_rgba(0,0,0,0.012)] hover:shadow-sm hover:border-blue-100/60 transition-all duration-300 flex items-center justify-between relative group cursor-pointer"
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
                        className="absolute right-0 top-7 bg-white border border-slate-100/90 rounded-xl shadow-md w-[150px] py-1 z-50 text-slate-700 font-medium text-xs animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleOpenAddMoney(wallet, e)}
                          className="flex items-center gap-1.5 w-full text-left py-1.5 px-2.5 hover:bg-[#ecfdf5] text-emerald-600 transition-all font-semibold border-b border-slate-50"
                        >
                          <Plus size={12} /> টাকা যুক্ত করুন
                        </button>

                        {!wallet.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefault(wallet.id, e)}
                            className="flex items-center gap-1.5 w-full text-left py-1.5 px-2.5 hover:bg-slate-50 text-blue-600 transition-all font-semibold"
                          >
                            <Check size={12} /> ডিফল্ট করুন
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(wallet, e)}
                          className="flex items-center gap-1.5 w-full text-left py-1.5 px-2.5 hover:bg-slate-50 transition-all"
                        >
                          <Edit2 size={11} /> সম্পাদনা করুন
                        </button>
                        {!wallet.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(wallet.id, e)}
                            className="flex items-center gap-1.5 w-full text-left py-1.5 px-2.5 hover:bg-red-50 text-red-600 transition-all font-semibold border-t border-slate-50 mt-1"
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

      {/* 3. Floating Action Button is now handled globally at Parent Level */}

      {/* 4. Overlay Form Modal (Floating) */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[320px] rounded-[28px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative max-h-[90vh]">
            {/* Modal Header/Title Centered and Clean, exactly as customized in prompt */}
            <div className="text-center pt-8 pb-5 px-6">
              {/* Profile-like Wallet Icon Container */}
              <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-[#1e75eb] border border-blue-100 shadow-sm animate-in zoom-in-50 duration-300">
                <WalletIcon size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-[18px] font-medium text-slate-800 leading-tight">
                {editingWallet ? 'ওয়ালেট সম্পাদনা করুন' : 'নতুন ওয়ালেট অ্যাড করুন'}
              </h3>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input: Name */}
              <div className="px-6 relative">
                <div className="relative">
                  <input
                    id="wallet-name-input"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder=" "
                    className="peer w-full py-3.5 pl-11 pr-4 bg-transparent border border-slate-200 focus:border-blue-500 rounded-[16px] outline-none text-[#1e293b] text-[15px] font-medium transition-all shadow-xs"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-blue-500 transition-colors pointer-events-none">
                    <WalletIcon size={18} strokeWidth={1.5} />
                  </div>
                  <label
                    htmlFor="wallet-name-input"
                    className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                      top-0 left-10 -translate-y-1/2 text-[12px] text-slate-400 font-bold
                      peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-medium
                      peer-focus:top-0 peer-focus:left-10 peer-focus:-translate-y-1/2 peer-focus:text-[12px] peer-focus:text-blue-500 peer-focus:font-bold"
                  >
                    ওয়ালেটের নাম
                  </label>
                </div>
              </div>

              {/* Submit Buttons styled exactly matching the screenshot pill layout */}
              <div className="flex items-center justify-center gap-6 pb-8 pt-2 px-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#1e75eb] font-bold text-[16px] py-2 hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#1e75eb] hover:bg-[#1563cc] text-white font-bold text-[16px] px-8 py-2.5 rounded-full shadow-md shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    editingWallet ? 'সংরক্ষণ' : 'অ্যাড'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Add Money (টাকা যুক্ত করুন) Modal */}
      {isPayModalOpen && payWallet && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[320px] rounded-[28px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative max-h-[90vh]">
            <div className="text-center pt-8 pb-5 px-6">
              {/* Profile-like Wallet Icon Container for Add Money */}
              <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-sm animate-in zoom-in-50 duration-300">
                <WalletIcon size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-[18px] font-medium text-slate-800 leading-tight">
                টাকা যুক্ত করুন
              </h3>
              <p className="text-slate-400 font-bold text-[12px] mt-1.5 bg-slate-50 px-2.5 py-1 rounded-full inline-block">
                ওয়ালেট: {payWallet.name}
              </p>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              {/* Input: Amount */}
              <div className="px-6 relative">
                <div className="relative">
                  <input
                    id="pay-amount-input"
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder=" "
                    className="peer w-full py-3.5 pl-11 pr-4 bg-transparent border-2 border-slate-100 focus:border-emerald-500 rounded-[16px] outline-none text-[#1e293b] text-[15px] font-mono font-bold transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-500 transition-colors pointer-events-none">
                    <span className="text-[17px] font-bold font-sans">৳</span>
                  </div>
                  <label
                    htmlFor="pay-amount-input"
                    className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                      top-0 left-10 -translate-y-1/2 text-[12px] text-slate-400 font-bold
                      peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-medium
                      peer-focus:top-0 peer-focus:left-10 peer-focus:-translate-y-1/2 peer-focus:text-[12px] peer-focus:text-emerald-500 peer-focus:font-bold"
                  >
                    টাকার পরিমাণ
                  </label>
                </div>
              </div>

              {/* Input: Source / Notes */}
              <div className="px-6 relative">
                <div className="relative">
                  <input
                    id="pay-source-input"
                    type="text"
                    value={paySource}
                    onChange={(e) => setPaySource(e.target.value)}
                    placeholder=" "
                    className="peer w-full py-3.5 pl-11 pr-4 bg-transparent border-2 border-slate-100 focus:border-emerald-500 rounded-[16px] outline-none text-[#1e293b] text-[15px] font-medium transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-500 transition-colors pointer-events-none">
                    <CreditCard size={16} strokeWidth={1.5} />
                  </div>
                  <label
                    htmlFor="pay-source-input"
                    className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                      top-0 left-10 -translate-y-1/2 text-[12px] text-slate-400 font-bold
                      peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-medium
                      peer-focus:top-0 peer-focus:left-10 peer-focus:-translate-y-1/2 peer-focus:text-[12px] peer-focus:text-emerald-500 peer-focus:font-bold"
                  >
                    আয়ের উৎস/বিবরণ (ঐচ্ছিক)
                  </label>
                </div>
              </div>

              <div className="text-center px-6 text-slate-400 text-[11px] font-semibold">
                * টাকা যুক্ত করলে সেটি লেনদেনে আয় হিসেবে যুক্ত হবে
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-6 pb-8 pt-2 px-6">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="text-slate-500 font-bold text-[16px] py-2 hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[16px] px-8 py-2.5 rounded-full shadow-md shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {paySubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'অ্যাড'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
