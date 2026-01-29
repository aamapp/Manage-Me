
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
    // Fix: Using lowercase userid to match database column
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
    // Fix: Using lowercase userid
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">খরচসমূহ</h1>
          <p className="text-slate-500">আপনার সমস্ত খরচ এখন ক্লাউড ডাটাবেসে সেভ হচ্ছে।</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>নতুন খরচ</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
            <Receipt size={32} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট খরচ</p>
            <h3 className="text-2xl font-bold text-slate-800">{user?.currency || '৳'} {totalExpenseAll.toLocaleString('bn-BD')}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center bg-slate-50/50">
          <div className="relative w-full max-sm:max-w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-rose-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p>কোনো রেকর্ড পাওয়া যায়নি</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-6 py-4">তারিখ</th>
                    <th className="px-6 py-4">ক্যাটাগরি</th>
                    <th className="px-6 py-4">বিবরণ</th>
                    <th className="px-6 py-4 text-right">পরিমাণ</th>
                    <th className="px-6 py-4 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">{expense.date}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 font-semibold">
                          <Tag size={14} className="text-indigo-400" />
                          {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 italic">"{expense.notes}"</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-500">{user?.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleDelete(expense.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-6">নতুন খরচ যোগ করুন</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">পরিমাণ</label>
                <input required type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl">
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">বিবরণ</label>
                <input required type="text" value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" placeholder="কিসের জন্য খরচ?" />
              </div>
              <div className="flex gap-4 mt-6">
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="animate-spin" size={20} />} সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
