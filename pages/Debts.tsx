import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Search, Plus, MoreVertical, SquarePen, Trash2, Phone, MapPin, 
  ArrowDown, ArrowUp, DollarSign, FileText, Loader2, ImagePlus, User as UserIcon
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';
import { DuePerson, DueTransaction } from '../types';

export const Debts: React.FC = () => {
  const { user, duePersons, setDuePersons, showToast, isOnline } = useAppContext();
  const persons = duePersons;
  const location = useLocation();

  const [activeView, setActiveView] = useState<'list' | 'details'>('list');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get('view');
    if (viewId && persons.length > 0) {
      const person = persons.find(p => p.id === viewId);
      if (person) {
        setSelectedPersonId(viewId);
        setActiveView('details');
      }
    }
  }, [location.search, persons]);
  
  const [isAddPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setAddTransactionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Person Menu and Edit states
  const [personActiveMenuId, setPersonActiveMenuId] = useState<string | null>(null);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  
  // Delete Person Modal
  const [showPersonDeleteModal, setShowPersonDeleteModal] = useState(false);
  const [personToDeleteId, setPersonToDeleteId] = useState<string | null>(null);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);
  
  const [activeTxMenuId, setActiveTxMenuId] = useState<string | null>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  
  const [showTxDeleteModal, setShowTxDeleteModal] = useState(false);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  
  const [transactionType, setTransactionType] = useState<'receive' | 'give'>('receive');

  // Form states for Add Person
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonAddress, setNewPersonAddress] = useState('');
  const [newPersonDate, setNewPersonDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPersonAvatar, setNewPersonAvatar] = useState('');

  // Form states for Add Transaction
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isSubmittingPerson, setIsSubmittingPerson] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setPersonActiveMenuId(null);
      setActiveTxMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const getPersonBalance = (person: DuePerson) => {
    return person.transactions.reduce((acc, curr) => {
      return curr.type === 'give' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }
    
    setIsSubmittingPerson(true);

    try {
      if (isEditingPerson && editingPersonId) {
        const { error } = await supabase
          .from('due_persons')
          .update({
            name: newPersonName,
            phone: newPersonPhone,
            address: newPersonAddress,
            date: newPersonDate,
            avatar: newPersonAvatar
          })
          .eq('id', editingPersonId)
          .eq('userid', user.id);

        if (error) throw error;

        setDuePersons(prev => prev.map(p => 
          p.id === editingPersonId 
            ? { ...p, name: newPersonName, phone: newPersonPhone, address: newPersonAddress, date: newPersonDate, avatar: newPersonAvatar } 
            : p
        ));
        showToast('আপডেট করা হয়েছে', 'success');
      } else {
        const newPerson: DuePerson = {
          id: crypto.randomUUID(),
          name: newPersonName,
          phone: newPersonPhone,
          address: newPersonAddress,
          date: newPersonDate,
          avatar: newPersonAvatar,
          transactions: [],
          userid: user.id
        };

        const { error } = await supabase.from('due_persons').insert([newPerson]);
        if (error) throw error;
        
        setDuePersons([newPerson, ...persons]);
        showToast('যোগ করা হয়েছে', 'success');
      }
      
      resetPersonForm();
      setAddPersonModalOpen(false);
    } catch(e: any) {
      showToast('ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      setIsSubmittingPerson(false);
    }
  };

  const resetPersonForm = () => {
    setNewPersonName('');
    setNewPersonPhone('');
    setNewPersonAddress('');
    setNewPersonAvatar('');
    setNewPersonDate(new Date().toISOString().split('T')[0]);
    setIsEditingPerson(false);
    setEditingPersonId(null);
  };

  const handleOpenEditPerson = (person: DuePerson) => {
    setIsEditingPerson(true);
    setEditingPersonId(person.id);
    setNewPersonName(person.name);
    setNewPersonPhone(person.phone || '');
    setNewPersonAddress(person.address || '');
    setNewPersonAvatar(person.avatar || '');
    setNewPersonDate(person.date);
    setAddPersonModalOpen(true);
    setPersonActiveMenuId(null);
  };

  const handleDeletePerson = async () => {
    if (!personToDeleteId || !user || !isOnline) return;
    
    setIsDeletingPerson(true);
    try {
      const { error } = await supabase
        .from('due_persons')
        .delete()
        .eq('id', personToDeleteId)
        .eq('userid', user.id);

      if (error) throw error;

      setDuePersons(prev => prev.filter(p => p.id !== personToDeleteId));
      showToast('মুছে ফেলা হয়েছে', 'success');
      setShowPersonDeleteModal(false);
    } catch (e: any) {
      showToast('ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      setIsDeletingPerson(false);
      setPersonToDeleteId(null);
    }
  };

  const resetTransactionForm = () => {
    setTxAmount('');
    setTxDescription('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTransactionType('receive');
    setIsEditingTx(false);
    setEditingTxId(null);
  };

  const handleOpenEditTransaction = (tx: DueTransaction) => {
    setIsEditingTx(true);
    setEditingTxId(tx.id);
    setTxAmount(tx.amount.toString());
    setTxDescription(tx.description || '');
    setTxDate(tx.date);
    setTransactionType(tx.type);
    setAddTransactionModalOpen(true);
    setActiveTxMenuId(null);
  };

  const handleDeleteTransaction = async () => {
    if (!txToDeleteId || !selectedPersonId || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }

    setIsDeletingTx(true);
    try {
      const person = persons.find(p => p.id === selectedPersonId);
      if (!person) throw new Error("ব্যক্তি পাওয়া যায়নি");

      const updatedTransactions = person.transactions.filter(t => t.id !== txToDeleteId);

      const { error } = await supabase
        .from('due_persons')
        .update({ transactions: updatedTransactions })
        .eq('id', selectedPersonId)
        .eq('userid', user.id);

      if (error) throw error;

      setDuePersons(prev => prev.map(p => {
        if (p.id === selectedPersonId) {
          return { ...p, transactions: updatedTransactions };
        }
        return p;
      }));

      showToast('লেনদেন মুছে ফেলা হয়েছে', 'success');
      setShowTxDeleteModal(false);
    } catch (e: any) {
      showToast('ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      setIsDeletingTx(false);
      setTxToDeleteId(null);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !selectedPersonId || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }
    
    setIsSubmittingTx(true);
    
    try {
      const person = persons.find(p => p.id === selectedPersonId);
      if (!person) throw new Error("ব্যক্তি পাওয়া যায়নি");
      
      let updatedTransactions;
      
      if (isEditingTx && editingTxId) {
        updatedTransactions = person.transactions.map(t => 
          t.id === editingTxId 
            ? { ...t, type: transactionType, amount: Number(txAmount), description: txDescription, date: txDate }
            : t
        );
      } else {
        const newTx: DueTransaction = {
          id: crypto.randomUUID(),
          type: transactionType,
          amount: Number(txAmount),
          description: txDescription,
          date: txDate
        };
        updatedTransactions = [newTx, ...person.transactions];
      }
      
      const { error } = await supabase
        .from('due_persons')
        .update({ transactions: updatedTransactions })
        .eq('id', selectedPersonId)
        .eq('userid', user.id);
        
      if (error) throw error;
      
      setDuePersons(prev => prev.map(p => {
        if (p.id === selectedPersonId) {
          return { ...p, transactions: updatedTransactions };
        }
        return p;
      }));

      resetTransactionForm();
      setAddTransactionModalOpen(false);
      showToast(isEditingTx ? 'লেনদেন আপডেট করা হয়েছে' : 'লেনদেন যোগ করা হয়েছে', 'success');
    } catch(e: any) {
      showToast('ব্যর্থ হয়েছে: ' + e.message);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  if (activeView === 'details' && selectedPersonId) {
    const person = persons.find(p => p.id === selectedPersonId);
    if (!person) return null;
    
    const balance = getPersonBalance(person);

    return (
      <div className="bg-slate-50 min-h-[500px] rounded-[2rem] pb-16 relative overflow-hidden" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center gap-4 bg-white p-4 border-b border-slate-100">
          <button onClick={() => setActiveView('list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-slate-700" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">ব্যক্তির লেনদেন ইতিহাস</h2>
        </div>

        <div className="p-4 space-y-3">
          {/* File Card */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-indigo-500 font-bold text-lg bg-indigo-100">
                 {person.avatar ? <img src={person.avatar} alt="Avatar" className="w-full h-full object-cover" /> : person.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-slate-800">{person.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 mt-0.5 text-xs">
                  <MapPin size={12} /> {person.address || 'ঠিকানা নেই'}
                </div>
                {person.phone && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-1 text-xs">
                    <span className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center p-0.5"><Phone size={10} className="text-emerald-600" /></span> {person.phone}
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium absolute bottom-3 right-4">{person.date}</div>
          </div>

          {/* Summary Card */}
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${balance > 0 ? 'bg-emerald-50 border-emerald-100' : balance < 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`flex items-center gap-2 font-bold text-sm ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {balance > 0 ? <ArrowDown size={18} /> : balance < 0 ? <ArrowUp size={18} /> : null} 
              {balance > 0 ? 'পাবো (জমা)' : balance < 0 ? 'দিবো (বাকি)' : 'হিসাব শূন্য'}
            </div>
            <div className={`text-xl font-extrabold ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-600'}`} style={{ fontSize: '14px' }}>
              {(Math.abs(balance)).toLocaleString('bn-BD')} ৳
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2 mt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">লেনদেনসমূহ</h4>
            {person.transactions.length === 0 ? (
              <p className="text-xs text-center py-8 text-slate-400">কোনো লেনদেন রেকর্ড নেই</p>
            ) : (
              person.transactions.map(t => (
                <div key={t.id} className={`p-3 rounded-2xl flex items-center gap-3 border shadow-sm ${t.type === 'receive' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'receive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {t.type === 'receive' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-bold text-slate-800 text-[13px] truncate">{t.description || (t.type === 'receive' ? 'পেলাম' : 'দিলাম')}</h4>
                    <div className="text-[10px] text-slate-400 font-medium">{t.date}</div>
                  </div>
                  <div className={`text-[14px] font-bold shrink-0 ${t.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(t.type === 'receive' ? '+' : '-')} {t.amount.toLocaleString('bn-BD')} ৳
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTxMenuId(activeTxMenuId === t.id ? null : t.id);
                      }}
                      className={`p-1.5 rounded-full transition-colors ${activeTxMenuId === t.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600 active:bg-slate-100'}`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeTxMenuId === t.id && (
                      <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenEditTransaction(t);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <SquarePen size={14} className="text-slate-500" /> এডিট
                        </button>
                        <div className="h-px bg-slate-50 w-full"></div>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setTxToDeleteId(t.id);
                            setShowTxDeleteModal(true);
                            setActiveTxMenuId(null);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={14} className="text-rose-500" /> ডিলিট
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Add Transaction */}
        <button 
          onClick={() => { resetTransactionForm(); setAddTransactionModalOpen(true); }}
          className="fixed bottom-20 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-95 transition-all z-10"
        >
          <Plus size={24} />
        </button>

        {/* Add Transaction Modal */}
        {isAddTransactionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative p-5 border border-slate-100">
                  <h3 className="text-base font-bold text-center text-slate-800 mb-4">{isEditingTx ? 'লেনদেন সম্পাদনা' : 'নতুন লেনদেন লিখুন'}</h3>
                  
                  <div className="flex gap-2 mb-4">
                    <button 
                      type="button"
                      onClick={() => setTransactionType('receive')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-colors ${transactionType === 'receive' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-emerald-600 border-slate-200'}`}
                    >
                      পেলাম (জমা)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTransactionType('give')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-colors ${transactionType === 'give' ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'bg-slate-50 text-rose-500 border-slate-200'}`}
                    >
                      দিলাম (বাকি)
                    </button>
                  </div>

                  <form className="space-y-3" onSubmit={handleAddTransaction}>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={16} /></div>
                      <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="টাকার পরিমাণ লিখুন" className="w-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800" required />
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FileText size={16} /></div>
                      <input type="text" value={txDescription} onChange={e => setTxDescription(e.target.value)} placeholder="বিবরণ যেমন: জমা বা ধার পরিশোধ" className="w-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                    </div>
                    <div className="relative z-10">
                      <DatePicker 
                        label="তারিখ"
                        value={txDate}
                        onChange={(date) => setTxDate(date)}
                        placeholder="তারিখ"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => { setAddTransactionModalOpen(false); resetTransactionForm(); }} className="flex-1 py-2.5 text-xs text-slate-500 font-bold border border-slate-200 hover:bg-slate-50 rounded-xl">
                        বাতিল
                      </button>
                      <button type="submit" disabled={isSubmittingTx} className="flex-1 py-2.5 text-xs flex justify-center items-center gap-1.5 bg-indigo-600 text-white font-bold rounded-xl transition-colors hover:bg-indigo-700 shadow-lg">
                        {isSubmittingTx ? <Loader2 size={14} className="animate-spin" /> : null}
                        নিশ্চিত করুন
                      </button>
                    </div>
                  </form>
             </div>
          </div>
        )}

        {/* Delete Transaction Confirmation */}
        <ConfirmModal 
          isOpen={showTxDeleteModal}
          onClose={() => setShowTxDeleteModal(false)}
          onConfirm={handleDeleteTransaction}
          title="লেনদেন ডিলিট"
          message="আপনি কি এই লেনদেনটি মুছে ফেলতে চান?"
          isProcessing={isDeletingTx}
        />
      </div>
    );
  }

  // --- LIST VIEW ---
  const filteredPersons = persons.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.phone || '').includes(searchQuery));

  const totalReceive = persons.reduce((acc, p) => acc + (getPersonBalance(p) > 0 ? getPersonBalance(p) : 0), 0);
  const totalGive = persons.reduce((acc, p) => acc + (getPersonBalance(p) < 0 ? Math.abs(getPersonBalance(p)) : 0), 0);

  return (
    <div className="space-y-4 px-1 pb-6 selection:bg-indigo-100" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">লেনা দেনা খাতা</h1>
          <p className="text-xs text-slate-500 font-medium">কার কাছে কত টাকা পাবেন বা কে পাবে হিসাব রাখুন</p>
        </div>
        <button 
          onClick={() => { resetPersonForm(); setAddPersonModalOpen(true); }}
          className="bg-indigo-600 text-white flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
        >
          <Plus size={16} /> ব্যক্তি যোগ করুন
        </button>
      </div>

      {/* Top Summaries Box */}
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-xs mb-1">
              <ArrowDown size={14} /> পাবেন (আমার পাওনা)
            </div>
            <div className="text-lg font-extrabold text-emerald-600" style={{ fontSize: '14px' }}>
              {totalReceive.toLocaleString('bn-BD')} ৳
            </div>
         </div>
         <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center gap-1 text-rose-600 font-bold text-xs mb-1">
              <ArrowUp size={14} /> দিবেন (দেনা)
            </div>
            <div className="text-lg font-extrabold text-rose-600" style={{ fontSize: '14px' }}>
              {totalGive.toLocaleString('bn-BD')} ৳
            </div>
         </div>
      </div>

      {/* Search */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ব্যক্তির নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Persons List Card */}
      <div className="space-y-2 pb-12">
        {filteredPersons.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center text-slate-400">
            <UserIcon size={36} className="mx-auto mb-3 opacity-20 text-indigo-500" />
            <p className="text-sm font-bold">লেনা দেনার কোনো ব্যক্তি পাওয়া যায়নি</p>
          </div>
        ) : (
          filteredPersons.map(person => {
            const balance = getPersonBalance(person);
            const bgClass = balance < 0 ? 'bg-rose-50/20 hover:bg-rose-50/50' : balance > 0 ? 'bg-emerald-50/20 hover:bg-emerald-50/50' : 'bg-slate-50/20 hover:bg-slate-50/50';
            const borderClass = balance < 0 ? 'border-rose-100' : balance > 0 ? 'border-emerald-100' : 'border-slate-100';
            const textClass = balance < 0 ? 'text-rose-600' : balance > 0 ? 'text-emerald-600' : 'text-slate-600';
            
            return (
              <div 
                key={person.id} 
                onClick={() => { setSelectedPersonId(person.id); setActiveView('details'); }}
                className={`p-3 rounded-2xl flex items-center gap-3 border shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer transition-all relative ${bgClass} ${borderClass}`}
              >
                <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-indigo-500 font-bold text-xs bg-indigo-100">
                   {person.avatar ? <img src={person.avatar} alt="Avatar" className="w-full h-full object-cover" /> : person.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-[14px] font-bold text-slate-800 truncate leading-tight">{person.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{person.phone || 'ফোন নম্বর নেই'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[14px] font-extrabold ${textClass}`}> 
                    {Math.abs(balance).toLocaleString('bn-BD')} ৳
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {balance > 0 ? 'পাবেন' : balance < 0 ? 'দিবেন' : 'পরিশোধিত'}
                  </span>
                </div>
                <div className="relative pl-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPersonActiveMenuId(personActiveMenuId === person.id ? null : person.id);
                    }}
                    className={`p-1.5 rounded-full transition-colors ${personActiveMenuId === person.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600 active:bg-slate-100'}`}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {personActiveMenuId === person.id && (
                    <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenEditPerson(person); }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <SquarePen size={14} className="text-slate-500" /> এডিট
                      </button>
                      <div className="h-px bg-slate-50 w-full"></div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPersonToDeleteId(person.id);
                          setShowPersonDeleteModal(true);
                          setPersonActiveMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-rose-500" /> ডিলিট
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Person Confirmation */}
      <ConfirmModal 
        isOpen={showPersonDeleteModal}
        onClose={() => setShowPersonDeleteModal(false)}
        onConfirm={handleDeletePerson}
        title="ব্যক্তি মুছে ফেলা"
        message="আপনি কি এই ব্যক্তির সকল তথ্য ও লেনদেনের রেকর্ড চূড়ান্তভাবে মুছে ফেলতে চান?"
        isProcessing={isDeletingPerson}
      />

      {/* Add Person Modal */}
      {isAddPersonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative p-5 border border-slate-100 text-center">
                
                <div className="flex justify-center mb-4 mt-2">
                  <label className="w-16 h-16 rounded-full border border-slate-200 bg-indigo-50 flex items-center justify-center text-indigo-500 overflow-hidden cursor-pointer hover:bg-indigo-100 transition-colors">
                    {newPersonAvatar ? (
                      <img src={newPersonAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={24} />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1 * 1024 * 1024) {
                            showToast('ছবির সাইজ ১ মেগাবাইটের কম হতে হবে');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewPersonAvatar(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <form className="space-y-3" onSubmit={handleAddPerson}>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon size={16} /></div>
                    <input type="text" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="নাম লিখুন" className="w-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800" required />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={16} /></div>
                    <input type="tel" value={newPersonPhone} onChange={e => setNewPersonPhone(e.target.value)} placeholder="ফোন নম্বর (ঐচ্ছিক)" className="w-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={16} /></div>
                    <input type="text" value={newPersonAddress} onChange={e => setNewPersonAddress(e.target.value)} placeholder="ঠিকানা বা এলাকা (ঐচ্ছিক)" className="w-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                  </div>
                  <div className="relative z-10">
                    <DatePicker 
                      label="তারিখ"
                      value={newPersonDate}
                      onChange={(date) => setNewPersonDate(date)}
                      placeholder="তারিখ"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => { setAddPersonModalOpen(false); resetPersonForm(); }} className="flex-1 py-2.5 text-xs text-slate-500 font-bold border border-slate-200 hover:bg-slate-50 rounded-xl">
                      বাতিল
                    </button>
                    <button type="submit" disabled={isSubmittingPerson} className="flex-1 py-2.5 text-xs flex justify-center items-center gap-1.5 bg-indigo-600 text-white font-bold rounded-xl transition-colors hover:bg-indigo-700 shadow-md">
                      {isSubmittingPerson ? <Loader2 size={14} className="animate-spin" /> : null}
                      নিশ্চিত সেভ
                    </button>
                  </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
