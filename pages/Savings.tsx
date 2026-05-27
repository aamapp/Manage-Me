import React, { useState, useEffect } from 'react';
import { Target, Plus, Minus, Trash2, Edit2, Wallet, PlusCircle, X, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
}

export const Savings: React.FC = () => {
  const { user, showToast } = useAppContext();
  const currency = user?.currency || '৳';

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');

  // Floating adjust state
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'withdraw'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');

  // Load Initial Goals
  useEffect(() => {
    const saved = localStorage.getItem('manage_me_savings_goals');
    if (saved) {
      try {
        setGoals(JSON.parse(saved));
      } catch (e) {
        console.error('Could not parse savings goals', e);
      }
    } else {
      // Default placeholder data if empty
      const initial: SavingsGoal[] = [
        { id: '1', title: 'ভবিষ্যত তহবিল', targetAmount: 10000, currentAmount: 6500 },
        { id: '2', title: 'জরুরি সঞ্চয়', targetAmount: 20000, currentAmount: 3000 },
        { id: '3', title: 'হজ্জ তহবিল', targetAmount: 200000, currentAmount: 25000 }
      ];
      setGoals(initial);
      localStorage.setItem('manage_me_savings_goals', JSON.stringify(initial));
    }
  }, []);

  const saveToStorage = (newGoals: SavingsGoal[]) => {
    setGoals(newGoals);
    localStorage.setItem('manage_me_savings_goals', JSON.stringify(newGoals));
  };

  const handleOpenAddModal = () => {
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setIsEditing(false);
    setEditingGoalId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: SavingsGoal) => {
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setIsEditing(true);
    setEditingGoalId(goal.id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) {
      showToast('দয়া করে সম্পূর্ণ ফর্ম পূরণ করুন', 'error');
      return;
    }

    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;

    if (isEditing && editingGoalId) {
      const updated = goals.map(g => g.id === editingGoalId ? { ...g, title, targetAmount: target, currentAmount: current } : g);
      saveToStorage(updated);
      showToast('সঞ্চয় লক্ষ্য আপডেট করা হয়েছে', 'success');
    } else {
      const newGoal: SavingsGoal = {
        id: crypto.randomUUID(),
        title,
        targetAmount: target,
        currentAmount: current
      };
      saveToStorage([newGoal, ...goals]);
      showToast('নতুন সঞ্চয় লক্ষ্য যোগ করা হয়েছে', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('আপনি কি এই সঞ্চয় লক্ষ্যটি ডিলিট করতে চান?')) {
      const filtered = goals.filter(g => g.id !== id);
      saveToStorage(filtered);
      showToast('সঞ্চয় লক্ষ্য ডিলিট করা হয়েছে', 'success');
    }
  };

  const handleOpenAdjust = (goalId: string, type: 'add' | 'withdraw') => {
    setAdjustingGoalId(goalId);
    setAdjustType(type);
    setAdjustAmount('');
    setIsAdjusting(true);
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustAmount || !adjustingGoalId) return;

    const amt = parseFloat(adjustAmount) || 0;
    const goal = goals.find(g => g.id === adjustingGoalId);

    if (!goal) return;

    let newAmount = goal.currentAmount;
    if (adjustType === 'add') {
      newAmount += amt;
      showToast(`${amt.toLocaleString('bn-BD')} ${currency} সঞ্চয় করা হয়েছে!`, 'success');
    } else {
      if (newAmount < amt) {
        showToast('লক্ষ্যে পর্যাপ্ত ব্যালেন্স নেই!', 'error');
        return;
      }
      newAmount -= amt;
      showToast(`${amt.toLocaleString('bn-BD')} ${currency} উইথড্র বা খরচ করা হয়েছে!`, 'info');
    }

    const updated = goals.map(g => g.id === adjustingGoalId ? { ...g, currentAmount: newAmount } : g);
    saveToStorage(updated);
    setIsAdjusting(false);
    setAdjustingGoalId(null);
  };

  return (
    <div className="space-y-4 px-1 pb-6 select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
      {/* Tab Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">সঞ্চয় ও লক্ষ্যসমূহ</h1>
          <p className="text-xs text-slate-500 font-medium">ভবিষ্যতের জন্য স্মার্টলি অর্থ জমান</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-indigo-600 text-white flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          <Plus size={16} /> লক্ষ্য যোগ করুন
        </button>
      </div>

      {/* Grid of Goals */}
      {goals.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center text-slate-400">
          <Target size={40} className="mx-auto mb-3 opacity-20 text-indigo-600" />
          <p className="text-sm font-bold">কোনো সঞ্চয় লক্ষ্য তৈরি করা নেই</p>
          <button
            onClick={handleOpenAddModal}
            className="text-xs text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-lg mt-3"
          >
            প্রথম লক্ষ্য সেট করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const pct = Math.min(100, Math.max(0, Math.round((goal.currentAmount / goal.targetAmount) * 100)));
            const isCompleted = pct >= 100;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-[2rem] border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] relative overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Action buttons inside Card */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(goal)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Card Title & Target Status */}
                <div className="space-y-1 pr-14 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Target size={16} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-[15px] truncate">{goal.title}</h3>
                  </div>
                  {isCompleted && (
                    <span className="inline-block bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase leading-none">
                      পূর্ণ লক্ষ্য সম্পন্ন ✨
                    </span>
                  )}
                </div>

                {/* Progress Details Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-500 font-bold text-xs" style={{ fontSize: '14px' }}>
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-slate-400 font-medium">জমেছে</p>
                      <p className="text-slate-800 font-bold">{goal.currentAmount.toLocaleString('bn-BD')} {currency}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[11px] text-slate-400 font-medium">লক্ষ্য</p>
                      <p className="text-slate-700 font-medium">{goal.targetAmount.toLocaleString('bn-BD')} {currency}</p>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`absolute right-0 -top-6 text-[10px] font-bold ${isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {pct.toLocaleString('bn-BD')}% সম্পন্ন
                    </span>
                  </div>
                </div>

                {/* Deposit & Withdraw Micro Controls inside Card */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenAdjust(goal.id, 'add')}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-bold tracking-wide transition-all"
                  >
                    <Plus size={12} /> সঞ্চয় রাখুন
                  </button>
                  <button
                    onClick={() => handleOpenAdjust(goal.id, 'withdraw')}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 text-xs font-bold tracking-wide transition-all"
                  >
                    <Minus size={12} /> উইথড্র করুন
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Adjust Amount Overlay (Popup Sheet) */}
      {isAdjusting && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4">
          <div
            className="absolute inset-0"
            onClick={() => setIsAdjusting(false)}
          />
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl relative w-full max-w-sm border border-slate-100 animate-in slide-in-from-bottom duration-300">
            <button
              onClick={() => setIsAdjusting(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="font-bold text-slate-800 text-[16px] mb-3">
              {adjustType === 'add' ? 'সঞ্চয় যুক্ত করুন' : 'সঞ্চয় উইথড্র করুন'}
            </h3>

            <form onSubmit={handleApplyAdjustment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">অ্যামাউন্ট ({currency})</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="যেমন: ১,০০০"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    autoFocus
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjusting(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-all ${adjustType === 'add' ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700'}`}
                >
                  {adjustType === 'add' ? 'নিশ্চিত জমান' : 'নিশ্চিত উইথড্র'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Creation modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4">
          <div
            className="absolute inset-0"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl relative w-full max-w-sm border border-slate-100 animate-in slide-in-from-bottom duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-full transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="font-bold text-slate-800 text-[16px] mb-3">
              {isEditing ? 'সঞ্চয় লক্ষ্য সম্পাদনা' : 'নতুন সঞ্চয় লক্ষ্য'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">লক্ষ্য বা খাতের নাম</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: জরুরি সঞ্চয়, ল্যাপটপ ফান্ড"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">টার্গেট অ্যামাউন্ট</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="যেমন: ২০,০০০"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">ইতিমধ্যে জমানো ({currency})</label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="যেমন: ৩,০০০"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  {isEditing ? 'পরিবর্তন সেভ' : 'লক্ষ্য তৈরি'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
