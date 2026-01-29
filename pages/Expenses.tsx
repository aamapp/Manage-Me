
import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, Tag, X, Wallet, ShoppingCart } from 'lucide-react';
import { CURRENCY, EXPENSE_CATEGORY_LABELS } from '../constants';
import { useAppContext } from '../context/AppContext';

interface ExpenseRecord {
  id: string;
  category: string;
  date: string;
  amount: number;
  notes: string;
}

export const Expenses: React.FC = () => {
  const { user } = useAppContext();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(`mm_expenses_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(`mm_expenses_${user.id}`, JSON.stringify(expenses));
  }, [expenses, user.id]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
    category: 'Studio Rent',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: ''
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.notes) return;
    
    const expense: ExpenseRecord = {
      ...newExpense as ExpenseRecord,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses([expense, ...expenses]);
    setModalOpen(false);
    setNewExpense({ 
      category: 'Studio Rent', 
      date: new Date().toISOString().split('T')[0], 
      amount: 0, 
      notes: '' 
    });
  };

  const filteredExpenses = expenses.filter(e => 
    e.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
    EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenseAll = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">খরচসমূহ</h1>
          <p className="text-slate-500">আপনার স্টুডিও পরিচালনা এবং গিয়ার ক্রয়ের সমস্ত হিসাব এখানে রাখুন।</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>নতুন খরচ যোগ করুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm col-span-1 md:col-span-2 flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
            <Receipt size={32} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট খরচ</p>
            <h3 className="text-2xl font-bold text-slate-800">{user.currency || '৳'} {totalExpenseAll.toLocaleString('bn-BD')}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">মোট লেনদেন</p>
          <h3 className="text-xl font-bold text-slate-800">{expenses.length} টি</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">গড় খরচ</p>
          <h3 className="text-xl font-bold text-slate-800">{user.currency || '৳'} {expenses.length > 0 ? (totalExpenseAll / expenses.length).toLocaleString('bn-BD', { maximumFractionDigits: 0 }) : 0}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ক্যাটাগরি বা নোট দিয়ে সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredExpenses.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
              <p>কোনো খরচের রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-medium">
                  <th className="px-6 py-4">তারিখ</th>
                  <th className="px-6 py-4">ক্যাটাগরি</th>
                  <th className="px-6 py-4">বিবরণ (নোট)</th>
                  <th className="px-6 py-4 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{expense.date}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 font-semibold text-slate-700">
                        <Tag size={14} className="text-indigo-400" />
                        {EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 italic">"{expense.notes}"</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-500">{user.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">নতুন খরচ যোগ করুন</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">খরচের বিবরণ (নোট)</label>
                <input required type="text" value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" placeholder="যেমন: নতুন স্টুডিও ভাড়া" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">টাকার পরিমাণ</label>
                  <input required type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900">
                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">তারিখ</label>
                <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" />
              </div>
              <button type="submit" className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 mt-4">খরচ সেভ করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
