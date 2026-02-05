
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus, Search, Tag, X, ShoppingCart, Loader2, Trash2, MoreVertical, Pencil, Calculator } from 'lucide-react';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '../components/NumericKeypad';
import { ConfirmModal } from '../components/ConfirmModal';

export const Expenses: React.FC = () => {
  const { user, showToast, adminSelectedUserId } = useAppContext();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New states for Edit/Delete menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  
  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{id: string, userid: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);

  // Category input suggestion states
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryInputRef = useRef<HTMLDivElement>(null);
  
  const [newExpense, setNewExpense] = useState<any>({
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: ''
  });

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('expenses').select('*');
    
    // Filter Logic:
    // 1. If Admin has selected a user -> Show ONLY that user's data
    // 2. If Normal User -> Show ONLY their own data
    // 3. If Admin with NO selection -> Show ALL data
    
    if (user.role === 'admin' && adminSelectedUserId) {
        query = query.eq('userid', adminSelectedUserId);
    } else if (user.role !== 'admin') {
        query = query.eq('userid', user.id);
    }

    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      showToast(`খরচ লোড এরর: ${error.message}`);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [user, adminSelectedUserId]); // Re-fetch when admin selects a user

  // Click outside to close suggestions and menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Category Suggestions
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
      
      // Close Action Menu
      if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Derive unique categories from existing expenses for suggestions
  const uniqueCategories = Array.from(new Set(expenses.map((e: any) => e.category as string).filter(Boolean))) as string[];
  
  const allSuggestions: string[] = uniqueCategories;

  const filteredSuggestions = allSuggestions.filter(c => 
    (EXPENSE_CATEGORY_LABELS[c] || c).toLowerCase().includes((newExpense.category || '').toLowerCase())
  );

  const handleSelectCategory = (category: string) => {
    // Use localized label if available, otherwise use the category key itself
    const label = EXPENSE_CATEGORY_LABELS[category] || category;
    setNewExpense({ ...newExpense, category: label });
    setShowCategorySuggestions(false);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setActiveExpenseId(null);
    setNewExpense({ category: '', date: new Date().toISOString().split('T')[0], amount: 0, notes: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (expense: any) => {
    setIsEditing(true);
    setActiveExpenseId(expense.id);
    setNewExpense({
      // Use localized label for input field when editing
      category: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
      date: expense.date,
      amount: expense.amount,
      notes: expense.notes
    });
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const safeEval = (val: any) => {
    try {
      // eslint-disable-next-line no-new-func
      return new Function('return ' + (val || '0'))();
    } catch {
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category || !user) return;
    
    setIsSubmitting(true);
    
    // Evaluate possible math expressions
    const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
    
    // Use selected user ID if admin is viewing a specific user, otherwise current user ID
    const targetUserId = (user.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user.id;

    try {
      if (isEditing && activeExpenseId) {
        let query = supabase.from('expenses').update({
          category: newExpense.category,
          amount: parsedAmount,
          date: newExpense.date,
          notes: newExpense.notes
        }).eq('id', activeExpenseId);
        
        // If not admin, restrict to own records
        if (user.role !== 'admin') {
            query = query.eq('userid', user.id);
        }

        const { error } = await query;
        if (error) throw error;
        showToast('খরচ আপডেট হয়েছে', 'success');
      } else {
        // Insert new expense
        const { error } = await supabase.from('expenses').insert({
          category: newExpense.category,
          amount: parsedAmount,
          date: newExpense.date,
          notes: newExpense.notes,
          userid: targetUserId
        });

        if (error) throw error;
        showToast('খরচ সফলভাবে সেভ হয়েছে', 'success');
      }
      
      setModalOpen(false);
      fetchExpenses();
      if (!isEditing) {
        setNewExpense({ category: '', date: new Date().toISOString().split('T')[0], amount: 0, notes: '' });
      }
    } catch (error: any) {
      showToast(`সমস্যা: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (id: string, userid: string) => {
    setExpenseToDelete({id, userid});
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      let query = supabase.from('expenses').delete().eq('id', expenseToDelete.id);
      
      // If not admin, restrict to own records
      if (user?.role !== 'admin') {
          query = query.eq('userid', user?.id);
      }
      
      const { error } = await query;
      if (error) showToast(error.message);
      else {
        showToast('খরচ মুছে ফেলা হয়েছে', 'success');
        fetchExpenses();
      }
      setShowDeleteModal(false);
    } catch(err: any) {
      showToast(err.message);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (EXPENSE_CATEGORY_LABELS[e.category] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenseAll = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
             {user?.role === 'admin' ? (adminSelectedUserId ? 'ইউজার খরচ' : 'খরচসমূহ (অ্যাডমিন ভিউ)') : 'খরচসমূহ'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">মোট খরচ: <span className="text-rose-600 font-bold">{user?.currency || '৳'} {totalExpenseAll.toLocaleString('bn-BD')}</span></p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="বিবরণ বা ক্যাটাগরি দিয়ে খুঁজুন..." 
          className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-20">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-rose-600" size={24} /></div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">কোনো খরচ নেই</p>
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
                  <p className="text-xs text-slate-500 font-medium">{EXPENSE_CATEGORY_LABELS[expense.category] || expense.category} • {expense.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <span className="font-black text-rose-600 text-base mr-1">{user?.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</span>
                
                {/* Action Menu */}
                <div className="relative action-menu-container">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === expense.id ? null : expense.id);
                      }}
                      className={`p-2 -mr-2 rounded-full transition-colors ${activeMenuId === expense.id ? 'bg-rose-50 text-rose-600' : 'text-slate-300 hover:text-rose-600 active:bg-slate-50'}`}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenuId === expense.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(expense); }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                                <Pencil size={14} /> এডিট
                            </button>
                            <div className="h-px bg-slate-50 w-full my-0.5"></div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); initiateDelete(expense.id, expense.userid); }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={14} /> ডিলিট
                            </button>
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="খরচ ডিলিট"
        message="আপনি কি এই খরচের রেকর্ডটি মুছে ফেলতে চান?"
        isProcessing={isDeleting}
      />

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {isEditing ? 'খরচ এডিট' : 'নতুন খরচ'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="px-4 pt-3 pb-24 space-y-4">
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">বিবরণ</label>
                    <input required type="text" value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm" placeholder="কিসের জন্য খরচ?" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        পরিমাণ ({user?.currency})
                    </label>
                    <div 
                      onClick={() => setShowKeypad(true)}
                      className="keypad-trigger w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-rose-600 active:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                    >
                       <span>{newExpense.amount || 0}</span>
                       <Calculator size={18} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">তারিখ</label>
                      <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500" />
                    </div>
                    
                    {/* Category Input with Suggestions */}
                    <div className="relative" ref={categoryInputRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ক্যাটাগরি</label>
                      <input 
                        type="text"
                        value={newExpense.category}
                        onFocus={() => setShowCategorySuggestions(true)}
                        onChange={e => {
                          setNewExpense({...newExpense, category: e.target.value});
                          setShowCategorySuggestions(true);
                        }}
                        className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="ক্যাটাগরি লিখুন..."
                        required
                      />
                      
                      {showCategorySuggestions && (newExpense.category || filteredSuggestions.length > 0) && (
                        <div className="absolute top-full right-0 left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                          {filteredSuggestions.map((cat, idx) => (
                            <div key={idx} onClick={() => handleSelectCategory(cat)} className="px-4 py-3 border-b border-slate-50 hover:bg-rose-50 font-medium text-sm cursor-pointer transition-colors text-slate-700">
                              {EXPENSE_CATEGORY_LABELS[cat] || cat}
                            </div>
                          ))}
                          {!filteredSuggestions.some(c => (EXPENSE_CATEGORY_LABELS[c] || c).toLowerCase() === (newExpense.category || '').toLowerCase()) && newExpense.category && (
                            <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-xs font-bold border-t">
                              + নতুন ক্যাটাগরি হিসেবে যোগ হবে
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Receipt />}
                    খরচ সেভ করুন
                  </button>
                </form>
            </div>
            
            <NumericKeypad 
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={(val) => setNewExpense({...newExpense, amount: val})}
              initialValue={newExpense.amount}
              title="খরচের পরিমাণ"
            />
        </div>,
        document.body
      )}
    </div>
  );
};
