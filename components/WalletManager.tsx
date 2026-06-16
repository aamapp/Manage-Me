import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAppContext } from '@/context/AppContext';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
import { supabase } from '@/lib/supabase';
import { Wallet } from '@/types';
import { AppLogo } from './AppLogo';
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
  ArrowLeft,
  Search,
  FileDown,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const navigate = useNavigate();
  const { 
    user, 
    showToast, 
    refreshData, 
    expenses, 
    setExpenses,
    incomeRecords, 
    setIncomeRecords,
    duePersons, 
    setDuePersons 
  } = useAppContext();
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
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [walletPeriod, setWalletPeriod] = useState<'today' | 'month' | 'all'>('all');
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDetailsWallet === null) {
      setTxSearchQuery('');
      setTxTypeFilter('all');
      setWalletPeriod('all');
    }
  }, [selectedDetailsWallet]);

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
      const oldName = editingWallet.name.trim();
      const newName = formData.name.trim();
      const isNameChanged = oldName !== newName;

      updated = wallets.map(w => {
        if (w.id === editingWallet.id) {
          return {
            ...w,
            name: newName,
            // Maintain balance
            balance: amount,
            lastTransactionDate: 'আজ, ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
          };
        }
        return w;
      });

      if (isNameChanged) {
        // 1. Update related income records
        try {
          if (isDbAvailable) {
            const { error: incErr } = await supabase
              .from('income_records')
              .update({ method: newName })
              .eq('userid', user.id)
              .eq('method', oldName);
            if (incErr) console.error("Database income records update failed:", incErr);
          }

          // Update local state for income records
          if (incomeRecords) {
            setIncomeRecords(prev => prev.map(rec => {
              if (rec.method?.trim() === oldName) {
                return { ...rec, method: newName };
              }
              return rec;
            }));
          }
        } catch (e) {
          console.error("Local/DB Income update error:", e);
        }

        // 2. Update related expense records (matching suffix: [ওয়ালেট: oldName])
        try {
          if (expenses) {
            const updatedExpenses = expenses.map(exp => {
              const parsed = parseExpenseNotes(exp.notes);
              if (parsed.wallet.trim() === oldName) {
                const plainNotes = parsed.notes;
                const newNotes = `${plainNotes} [ওয়ালেট: ${newName}]`.trim();
                return { ...exp, notes: newNotes };
              }
              return exp;
            });

            const modifiedExpenses = updatedExpenses.filter((exp, idx) => exp.notes !== expenses[idx].notes);
            if (modifiedExpenses.length > 0 && isDbAvailable) {
              const { error: expUpdErr } = await supabase
                .from('expenses')
                .upsert(modifiedExpenses);
              if (expUpdErr) console.error("Database expenses update failed:", expUpdErr);
            }

            setExpenses(updatedExpenses);
          }
        } catch (e) {
          console.error("Local/DB Expense update error:", e);
        }

        // 3. Update related due person transactions (transactions list nested walletName field)
        try {
          if (duePersons) {
            const updatedDuePersons = duePersons.map(person => {
              let hasChanged = false;
              const updatedTx = person.transactions?.map(tx => {
                if (tx.walletName?.trim() === oldName) {
                  hasChanged = true;
                  return { ...tx, walletName: newName };
                }
                return tx;
              });
              if (hasChanged) {
                return { ...person, transactions: updatedTx };
              }
              return person;
            });

            const modifiedDuePersons = updatedDuePersons.filter((dp, idx) => dp !== duePersons[idx]);
            if (modifiedDuePersons.length > 0 && isDbAvailable) {
              for (const dp of modifiedDuePersons) {
                const { error: dpUpdErr } = await supabase
                  .from('due_persons')
                  .update({ transactions: dp.transactions })
                  .eq('id', dp.id)
                  .eq('userid', user.id);
                if (dpUpdErr) console.error(`Database due person ${dp.id} update failed:`, dpUpdErr);
              }
            }

            setDuePersons(updatedDuePersons);
          }
        } catch (e) {
          console.error("Local/DB Due persons update error:", e);
        }
      }

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

  const formatTimeToBangla = (dateStr: string, createdAtStr?: string): string => {
    if (!dateStr) return '';
    try {
      let dateObj = new Date(dateStr);
      if ((isNaN(dateObj.getTime()) || dateStr.length <= 10) && createdAtStr) {
        const testObj = new Date(createdAtStr);
        if (!isNaN(testObj.getTime())) {
          dateObj = testObj;
        }
      }
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
          const dateStr = i.createdat || i.created_at || i.date;
          if (dateStr) {
            const parsedD = new Date(dateStr);
            if (!isNaN(parsedD.getTime())) rawDate = parsedD;
          }
          list.push({
            id: i.id,
            type: 'income',
            amount: i.amount,
            date: i.date,
            createdat: i.createdat || i.created_at || i.date,
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
          const dateStr = e.createdat || e.created_at || e.date;
          if (dateStr) {
            const parsedD = new Date(dateStr);
            if (!isNaN(parsedD.getTime())) rawDate = parsedD;
          }
          const categoryLabel = EXPENSE_CATEGORY_LABELS[e.category] || e.category;
          list.push({
            id: e.id,
            type: 'expense',
            amount: e.amount,
            date: e.date,
            createdat: e.createdat || e.created_at || e.date,
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
              const dateStr = tx.createdat || tx.created_at || tx.date;
              if (dateStr) {
                const parsedD = new Date(dateStr);
                if (!isNaN(parsedD.getTime())) rawDate = parsedD;
              }
              list.push({
                id: tx.id,
                type: tx.type === 'receive' ? 'income' : 'expense',
                amount: tx.amount,
                date: tx.date,
                createdat: tx.createdat || tx.created_at || tx.date,
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
    const rawTxList = getWalletTransactions(selectedDetailsWallet.name);
    
    // Period filter calculations for the statistics dashboard
    const now = new Date();
    const currentMonthBengali = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ][now.getMonth()];

    const periodTxList = rawTxList.filter((t) => {
      if (walletPeriod === 'today') {
        return new Date(t.date).toDateString() === now.toDateString();
      }
      if (walletPeriod === 'month') {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });

    const periodIncome = periodTxList
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const periodExpense = periodTxList
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const periodBalance = walletPeriod === 'all' ? selectedDetailsWallet.balance : (periodIncome - periodExpense);

    // Apply client filters (search + type) for the main ledger list
    const filteredTxList = periodTxList.filter((tx) => {
      // Filter by type
      if (txTypeFilter === 'income' && tx.type !== 'income') return false;
      if (txTypeFilter === 'expense' && tx.type !== 'expense') return false;

      // Filter by search query
      if (txSearchQuery.trim() !== '') {
        const query = txSearchQuery.toLowerCase();
        const titleMatch = tx.title?.toLowerCase().includes(query);
        const subMatch = tx.subtitle?.toLowerCase().includes(query);
        return titleMatch || subMatch;
      }

      return true;
    });

    const totalTxCount = periodTxList.length;

    // PDF generation function
    const handleDownloadPdf = () => {
      if (!selectedDetailsWallet) return;

      navigate("/reports", {
        state: {
          action: "download_preview",
          reportType: "wallet",
          walletName: selectedDetailsWallet.name,
          walletBalance: selectedDetailsWallet.balance,
        }
      });
    };

    // Grouping by Date
    const getGroupedTxList = () => {
      const groups: { [d: string]: any[] } = {};
      filteredTxList.forEach((t) => {
        const dLabel = t.date ? t.date.substring(0, 10) : 'অন্যান্য';
        if (!groups[dLabel]) groups[dLabel] = [];
        groups[dLabel].push(t);
      });

      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      return sortedDates.map((dStr) => {
        const list = groups[dStr];
        const incSum = list
          .filter((t) => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const expSum = list
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);

        return {
          date: dStr,
          transactions: list,
          incomeTotal: incSum,
          expenseTotal: expSum,
        };
      });
    };

    const groupedTxList = getGroupedTxList();

    return createPortal(
      <div className="fixed inset-0 bg-[#f8fafc] text-slate-800 z-[1000] overflow-y-auto flex flex-col select-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Glassy Header with Back Button */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between z-40">
          <button
            type="button"
            onClick={() => setSelectedDetailsWallet(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all font-bold text-sm cursor-pointer"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
            <span className="font-sans text-xs uppercase tracking-wider text-slate-655 font-bold">ফিরে যান</span>
          </button>
          
          <div className="text-right flex-1 select-none pr-1 truncate">
            <span className="text-[9px] text-[#1e75eb] font-bold tracking-wider block leading-normal pt-[2px] uppercase">ওয়ালেট ডিটেইলস</span>
            <h3 className="text-sm font-black text-slate-800 mt-1">
              {selectedDetailsWallet.name} - লেনদেনসমূহ
            </h3>
          </div>
        </div>

        {/* Responsive Content Container wrapper styled to match expenses page */}
        <div className="w-full max-w-lg mx-auto px-4 pt-2.5 pb-28 flex-1 flex flex-col gap-2.5">
          
          {/* Dynamic Period Stats Card - Unifying Income and Expense - perfectly matching Expenses.tsx */}
          <div className="bg-[#fafbfd] border border-[#e2e7ec]/80 py-2.5 px-3.5 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] w-full select-none">
            {/* Period Segment Tabs matching the image */}
            <div className="bg-[#f3f5f8] rounded-full flex items-stretch justify-between w-full mb-3 select-none overflow-hidden h-[42px] border border-[#e2e7ec]/60">
              <button
                type="button"
                onClick={() => setWalletPeriod('today')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full cursor-pointer select-none ${
                  walletPeriod === 'today'
                    ? 'bg-[#1e75eb] text-white rounded-l-full'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => setWalletPeriod('all')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full cursor-pointer select-none ${
                  walletPeriod === 'all'
                    ? 'bg-[#1e75eb] text-white'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                মোট
              </button>
              <button
                type="button"
                onClick={() => setWalletPeriod('month')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full cursor-pointer select-none ${
                  walletPeriod === 'month'
                    ? 'bg-[#1e75eb] text-white rounded-r-full'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                {currentMonthBengali}
              </button>
            </div>

            {/* Income, Expense, Net Counts */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#50AD54] mb-0.5">
                  আয়
                </p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#50AD54] truncate">
                  ৳ {toBanglaNumbers(periodIncome.toLocaleString("bn-BD"))}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#db4437] mb-0.5">
                  ব্যয়
                </p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#db4437] truncate">
                  ৳ {toBanglaNumbers(periodExpense.toLocaleString("bn-BD"))}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#1a73e8] mb-0.5">
                  ব্যালেন্স
                </p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#1a73e8] truncate">
                  ৳ {toBanglaNumbers(periodBalance.toLocaleString("bn-BD"))}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Core Filters & Search Deck styled to match expenses page */}
          <div className="flex flex-col gap-2.5">
            
            {/* Filter segments & PDF row matches reference layout on top */}
            <div className="bg-[#f0f3f6] p-[3.5px] rounded-[8px] flex items-center justify-between gap-2.5 border border-[#e2e7ec]/50">
              <div className="flex items-center gap-1 flex-1">
                {/* TAB 1: সব */}
                <button
                   type="button"
                   onClick={() => setTxTypeFilter('all')}
                   className={`flex-1 py-1 h-[42px] rounded-[6px] transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                     txTypeFilter === 'all'
                       ? 'bg-[#e2edfc] text-[#1a73e8]'
                       : 'bg-transparent text-[#8e9aa8] hover:text-[#4b5563]'
                   }`}
                >
                  <span className={`text-[13.5px] font-bold ${txTypeFilter === 'all' ? 'text-[#1a73e8]' : 'text-[#8e9aa8]'}`}>সব</span>
                  <span className={`text-[10px] font-medium leading-none mt-0.5 ${txTypeFilter === 'all' ? 'text-[#1a73e8]' : 'text-[#8e9aa8]/80'}`}>
                    ({toBanglaDigits(totalTxCount)})
                  </span>
                </button>

                {/* TAB 2: আয় */}
                <button
                   type="button"
                   onClick={() => setTxTypeFilter('income')}
                   className={`flex-1 py-1 h-[42px] rounded-[6px] transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                     txTypeFilter === 'income'
                       ? 'bg-[#e2fced] text-[#50AD54]'
                       : 'bg-transparent text-[#8e9aa8] hover:text-[#4b5563]'
                   }`}
                >
                  <span className={`text-[13.5px] font-bold ${txTypeFilter === 'income' ? 'text-[#50AD54]' : 'text-[#8e9aa8]'}`}>আয়</span>
                  <span className={`text-[10px] font-medium leading-none mt-0.5 ${txTypeFilter === 'income' ? 'text-[#50AD54]' : 'text-[#8e9aa8]/80'}`}>
                    ({toBanglaDigits(periodTxList.filter(t => t.type === 'income').length)})
                  </span>
                </button>

                {/* TAB 3: ব্যয় */}
                <button
                   type="button"
                   onClick={() => setTxTypeFilter('expense')}
                   className={`flex-1 py-1 h-[42px] rounded-[6px] transition-all cursor-pointer select-none flex flex-col items-center justify-center ${
                     txTypeFilter === 'expense'
                       ? 'bg-[#fcedeb] text-[#db4437]'
                       : 'bg-transparent text-[#8e9aa8] hover:text-[#4b5563]'
                   }`}
                >
                  <span className={`text-[13.5px] font-bold ${txTypeFilter === 'expense' ? 'text-[#db4437]' : 'text-[#8e9aa8]'}`}>ব্যয়</span>
                  <span className={`text-[10px] font-medium leading-none mt-0.5 ${txTypeFilter === 'expense' ? 'text-[#db4437]' : 'text-[#8e9aa8]/80'}`}>
                    ({toBanglaDigits(periodTxList.filter(t => t.type === 'expense').length)})
                  </span>
                </button>
              </div>

              {/* Action: PDF download button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating || totalTxCount === 0}
                className={`rounded-[6px] border border-[#e2e7ec]/50 bg-white shadow-xs transition-all cursor-pointer flex items-center justify-center h-[42px] w-[42px] shrink-0 ${
                  totalTxCount === 0
                    ? 'opacity-50 cursor-not-allowed text-slate-300'
                    : 'hover:bg-slate-50 text-[#1a73e8] active:scale-95'
                }`}
                title="পিডিএফ রিপোর্ট ডাউনলোড করুন"
              >
                {pdfGenerating ? (
                  <Loader2 size={16} className="animate-spin text-[#1a73e8]" />
                ) : (
                  <FileDown size={16} className="text-[#1a73e8] stroke-[2.2]" />
                )}
              </button>
            </div>

            {/* Clean White Search bar on the bottom matches layout requested */}
            <div className="relative">
              <input
                type="text"
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                placeholder="লেনদেনের নাম দিয়ে অনুসন্ধান করুন..."
                className="w-full bg-white border border-[#e2e7ec]/85 focus:border-[#1e75eb] focus:bg-white focus:ring-2 focus:ring-[#1e75eb]/10 pl-11 pr-4 py-2.5 rounded-[8px] outline-none text-[13.5px] font-medium text-slate-800 tracking-wide transition-all duration-200 shadow-2xs"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.2]" />
              {txSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTxSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-0.5 active:scale-95 transition-all"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Ledger Listing grouped by Date precisely matching Expenses page */}
          <div className="flex flex-col space-y-4 animate-in fade-in duration-300">
            {totalTxCount === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl p-6 shadow-2xs">
                <Banknote size={38} className="mx-auto text-slate-300 mb-2.5" />
                <p className="text-slate-500 font-bold text-sm mb-1">কোনো লেনদেন পাওয়া যায়নি</p>
                <p className="text-slate-400 text-xs">এই ওয়ালেটে এখনো কোনো লেনদেন হিসাব করা হয়নি।</p>
              </div>
            ) : filteredTxList.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
                <Filter size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 font-bold text-xs">খোঁজা হয়েছে কিন্তু মেলেনি!</p>
                <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-wider font-semibold">অনুগ্রহ করে ফিল্টার পরিবর্তন করুন</p>
              </div>
            ) : (
              groupedTxList.map((group) => (
                <div key={group.date} className="space-y-2.5">
                  {/* Day Date Indicator Header */}
                  <div className="flex items-center justify-between py-2 bg-transparent select-none">
                    <span className="text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                      {formatDateToBangla(group.date)}
                    </span>
                    {/* Fine solid line divider */}
                    <div className="flex-1 mx-3 border-b border-solid border-slate-200/60"></div>
                    <div className="flex items-center gap-3 text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                      <span>মোট</span>
                      <span className="text-[#50AD54] font-medium text-[12px] sm:text-[13px]">
                        {toBanglaNumbers(group.incomeTotal)}
                      </span>
                      <span className="text-[#db4437] font-medium text-[12px] sm:text-[13px]">
                        {toBanglaNumbers(group.expenseTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Day Ledger Items Container */}
                  <div className="flex flex-col space-y-2.5">
                    {group.transactions.map((tx) => {
                      const isIncome = tx.type === 'income';
                      return (
                        <div
                          key={tx.id}
                          className={`group relative rounded-[12px] px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 transition-colors duration-200 shadow-[0_2px_6px_rgba(0,0,0,0.01)] border ${
                            isIncome
                              ? 'bg-emerald-50/20 border-emerald-500/[0.015]'
                              : 'bg-rose-50/20 border-rose-500/[0.015]'
                          }`}
                        >
                          {/* Left side: Title, indicator icon, and dynamic details */}
                          <div className="flex flex-col min-w-0 justify-center text-left">
                            <h3 className="font-normal text-slate-800 text-[14.5px] sm:text-[15px] leading-normal pt-[3px] pb-[1px] truncate">
                              {tx.title}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 select-none">
                              <span
                                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0 ${
                                  isIncome
                                    ? 'bg-emerald-100 text-[#50AD54]'
                                    : 'bg-rose-100 text-[#db4437]'
                                }`}
                              >
                                {isIncome ? '+' : '-'}
                              </span>
                              <span className="text-[10.5px] sm:text-[11px] font-medium text-slate-400 pr-1">
                                {formatTimeToBangla(tx.date, tx.createdat)}
                              </span>
                              {tx.subtitle && 
                               tx.subtitle.trim() !== 'অন্যান্য' && 
                               tx.subtitle.trim() !== 'Others' && 
                               tx.subtitle.trim() !== 'Other' && 
                               tx.subtitle.trim() !== 'অন্যান্য খরচ' && 
                               tx.subtitle.trim() !== 'খরচ' && 
                               tx.subtitle.trim() !== tx.title && (
                                 <span className="text-[9px] font-semibold text-[#1e75eb] bg-blue-50/50 border border-blue-100/50 rounded px-1.5 py-0.2 shrink-0">
                                   {tx.subtitle}
                                 </span>
                              )}
                            </div>
                          </div>

                          {/* Right side: Amount and layout */}
                          <div className="flex items-center gap-2.5 shrink-0 my-auto">
                            <span
                              className={`font-medium text-[15px] sm:text-[16px] whitespace-nowrap ${
                                isIncome ? 'text-[#50AD54]' : 'text-[#db4437]'
                              }`}
                            >
                              {toBanglaDigits(tx.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>,
      document.body
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
        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
          <div className="w-16 h-16 mb-4 flex items-center justify-center animate-spin">
            <AppLogo variant="transparent-color" size="100%" />
          </div>
          <p
            className="text-slate-500 font-bold text-xs mt-2 text-center"
            style={{
              fontFamily: "'Kohinoor Bangla', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            ওয়ালেট লোড হচ্ছে...
          </p>
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
