
import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Tag, X, ShoppingCart, Loader2, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const Expenses: React.FC = () => {
  const { user, showToast } = useAppContext();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newExpense, setNewExpense] = useState<any>({
    category: 'Studio Rent',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: ''
  });

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('userid', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      showToast(`খরচ লোড এরর: ${error.message}`);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !user) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: newExpense.date,
      notes: newExpense.notes,
      userid: user.id
    });

    if (error) {
      showToast(`সেভ হয়নি: ${error.message}`);
    } else {
      showToast('খরচ সফলভাবে সেভ হয়েছে', 'success');
      setModalOpen(false);
      fetchExpenses();
      setNewExpense({ category: 'Studio Rent', date: new Date().toISOString().split('T')[0], amount: 0, notes: '' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('আপনি কি এই খরচের রেকর্ডটি মুছে ফেলতে চান?')) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) showToast(error.message);
      else fetchExpenses();
    }
  };

  const filteredExpenses = expenses.filter(e => 
    (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenseAll = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">খরচসমূহ</h1>
          <p className="text-xs text-slate-500">মোট খরচ: <span className="text-rose-600 font-bold">{user?.currency || '৳'} {totalExpenseAll.toLocaleString('bn-BD')}</span></p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="বিবরণ দিয়ে খুঁজুন..." 
          className="w-full bg-transparent outline-none text-sm font-medium" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-20">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-rose-600" /></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
            <p>কোনো খরচ নেই</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div key={expense.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{expense.notes}</h3>
                  <p className="text-xs text-slate-500">{EXPENSE_CATEGORY_LABELS[expense.category] || expense.category} • {expense.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <span className="font-bold text-rose-600 text-base">{user?.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</span>
                <button 
                  onClick={() => handleDelete(expense.id)}
                  className="p-2 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-full"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">নতুন খরচ</h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 overflow-y-auto">
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">বিবরণ</label>
                <input required type="text" value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="কিসের জন্য খরচ?" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পরিমাণ ({user?.currency})</label>
                <input required type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="0" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">তারিখ</label>
                   <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ক্যাটাগরি</label>
                   <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none">
                     {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                       <option key={key} value={key}>{label}</option>
                     ))}
                   </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4 mb-4">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Receipt />}
                খরচ সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
