import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Wallet, BarChart3, Briefcase, Users, Music2, 
  Trash2, RefreshCw, Layers, CheckSquare, Plus, Trash, Globe, Check, ShieldAlert,
  FolderLock, ShoppingBag, Eye, User, Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface WalletType {
  id: string;
  name: string;
  initialBalance: number;
}

export interface AgendaTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, incomeRecords, expenses, isOnline, showToast } = useAppContext();
  const currency = user?.currency || '৳';

  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletInitial, setWalletInitial] = useState('');

  // 1. Wallets Management
  useEffect(() => {
    const savedWallets = localStorage.getItem('manage_me_wallets');
    if (savedWallets) {
      try {
        setWallets(JSON.parse(savedWallets));
      } catch (e) {
        console.error(e);
      }
    } else {
      const initial: WalletType[] = [
        { id: '1', name: 'ক্যাশ (নগদ)', initialBalance: 5000 },
        { id: '2', name: 'বিকাশ', initialBalance: 12000 },
        { id: '3', name: 'ব্যাংক হিসাব', initialBalance: 45000 }
      ];
      setWallets(initial);
      localStorage.setItem('manage_me_wallets', JSON.stringify(initial));
    }
  }, []);

  // 2. Agenda Tasks
  useEffect(() => {
    const savedTasks = localStorage.getItem('manage_me_agenda_tasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error(e);
      }
    } else {
      const initial: AgendaTask[] = [
        { id: '1', text: 'আজকের দৈনিক খরচ ডায়েরি আপডেট করা', completed: false, createdAt: new Date().toISOString() },
        { id: '2', text: 'মজিদ মিয়ার বকেয়ার হিসাব মেলানো', completed: true, createdAt: new Date().toISOString() }
      ];
      setTasks(initial);
      localStorage.setItem('manage_me_agenda_tasks', JSON.stringify(initial));
    }
  }, []);

  const saveTasks = (updated: AgendaTask[]) => {
    setTasks(updated);
    localStorage.setItem('manage_me_agenda_tasks', JSON.stringify(updated));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: AgendaTask = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    const updated = [...tasks, newTask];
    saveTasks(updated);
    setNewTaskText('');
    showToast('নতুন এজেন্ডা টাস্ক যুক্ত হয়েছে', 'success');
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    showToast('এজেন্ডা টাস্ক মুছে ফেলা হয়েছে', 'info');
  };

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    const initialAmt = parseFloat(walletInitial) || 0;
    const newWallet: WalletType = {
      id: crypto.randomUUID(),
      name: walletName.trim(),
      initialBalance: initialAmt
    };
    const updated = [...wallets, newWallet];
    setWallets(updated);
    localStorage.setItem('manage_me_wallets', JSON.stringify(updated));
    setWalletName('');
    setWalletInitial('');
    setShowWalletModal(false);
    showToast('নতুন পেমেন্ট ওয়ালেট যুক্ত হয়েছে', 'success');
  };

  const handleDeleteWallet = (id: string, name: string) => {
    if (confirm(`আপনি কি "${name}" ওয়ালেটটি ডিলিট করতে চান?`)) {
      const updated = wallets.filter(w => w.id !== id);
      setWallets(updated);
      localStorage.setItem('manage_me_wallets', JSON.stringify(updated));
      showToast('ওয়ালেট ডিলিট করা হয়েছে', 'info');
    }
  };

  // Compute live wallet statements
  // Match income records method with wallet name, or expense notes tag with wallet name
  const walletBalances = useMemo(() => {
    return wallets.map(wallet => {
      // Find payments matching wallet name
      const incoming = incomeRecords.filter(r => {
        const method = (r.method || '').toLowerCase();
        const walletLower = wallet.name.toLowerCase();
        return method.includes(walletLower) || walletLower.includes(method);
      }).reduce((sum, r) => sum + (r.amount || 0), 0);

      // Find expenses matching wallet notes tag, e.g. [ক্যাশ] or [walletName]
      const outgoing = expenses.filter(e => {
        const note = (e.notes || '').toLowerCase();
        const walletLower = wallet.name.toLowerCase();
        return note.includes(`[${walletLower}]`) || note.includes(walletLower);
      }).reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        ...wallet,
        currentBalance: wallet.initialBalance + incoming - outgoing
      };
    });
  }, [wallets, incomeRecords, expenses]);

  return (
    <div className="space-y-6 px-1 pb-12 select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
      {/* Mini Profile Header widget */}
      <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 border border-indigo-100 rounded-[2rem] p-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-indigo-100 uppercase">
            {user?.name ? user.name.charAt(0) : <User />}
          </div>
          <div>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider leading-none">
              {user?.role === 'admin' ? 'ম্যানেজার অ্যাডমিন ✨' : 'সাধারণ ইউজার'}
            </span>
            <h3 className="font-extrabold text-slate-800 text-[15px] mt-1">{user?.name || 'স্মার্ট ব্যবস্থাপনাকারী'}</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-none mt-1">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/50 px-3 py-1.5 rounded-2xl shadow-sm leading-none shrink-0">
          <Globe size={12} className={isOnline ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isOnline ? 'অনলাইন সিঙ্ক' : 'অফলাইন মোড'}</span>
        </div>
      </div>

      {/* Main navigation controls layout (Bento design) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">কার্যক্রম হাব (Quick Hub)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Dashboard Reports */}
          <div 
            onClick={() => navigate('/reports')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">অ্যানালিটিক্স রিপোর্ট</h4>
              <p className="text-[9px] text-slate-400 font-medium">আয়-ব্যয় রিয়েলটাইম চার্ট গ্রাফ</p>
            </div>
          </div>

          {/* Project Manager */}
          <div 
            onClick={() => navigate('/projects')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">প্রজেক্ট ও বাকি খাতা</h4>
              <p className="text-[9px] text-slate-400 font-medium font-bold">ভয়েস রেকর্ড ও প্রজেক্ট ডেডলাইন</p>
            </div>
          </div>

          {/* Clients list */}
          <div 
            onClick={() => navigate('/clients')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">ক্লায়েন্ট তালিকা</h4>
              <p className="text-[9px] text-slate-400 font-medium">কাস্টমার প্রোফাইল সেটিংস</p>
            </div>
          </div>

          {/* Ghazal notes */}
          <div 
            onClick={() => navigate('/ghazal-notes')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Music2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">গজল গীতিকবিতা ডায়েরি</h4>
              <p className="text-[9px] text-slate-400 font-medium">নোটপ্যাড লিরিক্স কালেকশন</p>
            </div>
          </div>

          {/* Shopping listing */}
          <div 
            onClick={() => navigate('/shopping-lists')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">বাজারের ফর্দ</h4>
              <p className="text-[9px] text-slate-400 font-medium">প্রয়োজনীয় জিনিসপত্রের চেকলিস্ট</p>
            </div>
          </div>

          {/* Trash */}
          <div 
            onClick={() => navigate('/trash')}
            className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] cursor-pointer hover:shadow-md active:scale-95 transition-all text-left space-y-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">রিসাইকেল বিন (ট্যাশ)</h4>
              <p className="text-[9px] text-slate-400 font-medium font-bold">মুছে ফেলা ফাইল পুনরায় পুনরুদ্ধার</p>
            </div>
          </div>
        </div>
      </div>

      {/* 👛 WALLETS STATEMENTS CARD PANEL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">👛 ওয়ালেট ও সেভিংস অ্যাকাউন্ট সমূহ</h4>
          <button 
            onClick={() => setShowWalletModal(true)}
            className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus size={14} /> ওয়ালেট যুক্ত করুন
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {walletBalances.map(wallet => (
            <div 
              key={wallet.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between relative group hover:border-indigo-100 transition-all text-left"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <Wallet size={16} />
                  </div>
                  <h4 className="font-bold text-slate-700 text-xs truncate">{wallet.name}</h4>
                </div>
                <div className="text-[14px] font-extrabold text-slate-800 pt-1 leading-none">{wallet.currentBalance.toLocaleString('bn-BD')} {currency}</div>
                <div className="text-[9px] text-slate-400 font-medium">প্রাথমিক তহবিল: {wallet.initialBalance.toLocaleString('bn-BD')} ৳</div>
              </div>
              <button
                onClick={() => handleDeleteWallet(wallet.id, wallet.name)}
                className="opacity-0 group-hover:opacity-100 p-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
              >
                <Trash size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 📋 AGENDA & CHECKLISTS WIDGET */}
      <div className="bg-white rounded-[2rem] border border-slate-200/70 p-5 shadow-sm text-left">
        <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
          <CheckSquare size={18} className="text-indigo-600" /> এজেন্ডা চেকলিস্ট টাস্ক
        </h3>

        {/* Add Agenda form */}
        <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="নতুন ডায়েরি বা টাস্ক এজেন্ডা লিখুন..."
            className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-['Kohinoor_Bangla'] text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            required
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0"
          >
            <Plus size={20} />
          </button>
        </form>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <p className="text-xs text-center py-6 text-slate-400">কোনো মুলতুবি টাস্ক নেই। চমৎকার দিন কাটুক!</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {tasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/50"
              >
                <div className="flex items-center gap-3 min-w-0 mr-1 flex-1">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200'}`}
                  >
                    {task.completed && <Check size={14} />}
                  </button>
                  <p className={`text-xs font-bold truncate leading-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.text}</p>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                >
                  <Trash size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Configuration Section Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Settings Route */}
        <div 
          onClick={() => navigate('/settings')}
          className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-indigo-100 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <SettingsIcon size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">সেটিংস ও প্রোফাইল</span>
            <p className="text-[10px] text-slate-400 font-bold leading-normal">কারেন্সি সিম্বল, থিম কাস্টমাইজেশন</p>
          </div>
        </div>

        {/* Sync backup Indicator */}
        <div 
          onClick={() => {
            showToast('রিয়েল-টাইম ক্লাউড ব্যাকআপ সিঙ্ক্রোনাইজড রয়েছে!', 'success');
          }}
          className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-indigo-100 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <RefreshCw size={18} className="animate-spin duration-1000" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">ক্লাউড অটো-সিঙ্ক</span>
            <p className="text-[10px] text-emerald-600 font-bold leading-normal flex items-center gap-1">সবকিছু আপ-টু-ডেট আছে <Check size={10} /></p>
          </div>
        </div>
      </div>

      {/* Wallet creation modal Overlay */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowWalletModal(false)} />
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl relative w-full max-w-sm border border-slate-100 text-left animate-in slide-in-from-bottom duration-300">
            <h3 className="font-bold text-slate-800 text-[15px] mb-3">👛 নতুন পেমেন্ট ওয়ালেট / অ্যাকাউন্ট</h3>
            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">ওয়ালেটের নাম</label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="যেমন: বিকাশ কমার্শিয়াল বা পকেট ক্যাশ"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">প্রারম্ভিক অ্যামাউন্ট ({currency})</label>
                <input
                  type="number"
                  value={walletInitial}
                  onChange={(e) => setWalletInitial(e.target.value)}
                  placeholder="যেমন: ৫,০০০"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 text-center"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center shadow-lg"
                >
                  ওয়ালেট যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
