
import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Plus, Search, Calendar, DollarSign, X, ReceiptText, Briefcase, CreditCard, AlertCircle, MoreVertical, Pencil, Trash2, Users, Loader2, CalendarDays, Wallet, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Project, IncomeRecord } from '../types';
import { supabase } from '../lib/supabase';

export const Income: React.FC = () => {
  const { projects, user, showToast, refreshData } = useAppContext();
  const currency = user?.currency || '৳';
  
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectDue, setSelectedProjectDue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Mobile action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState<any>({
    projectName: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'বিকাশ'
  });

  const fetchIncome = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('income_records')
      .select('*')
      .eq('userid', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      showToast(`আয় লোড করতে সমস্যা: ${error.message}`);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncome();
  }, [user]);

  const handleDeletePayment = async (id: string, payment: any) => {
    if (!user) return;
    if (window.confirm('আপনি কি নিশ্চিত? এটি ডিলিট করলে প্রজেক্টের বকেয়া আবার বেড়ে যাবে।')) {
      setIsDeleting(id);
      setActiveMenuId(null);
      
      try {
        const { error: delError } = await supabase
          .from('income_records')
          .delete()
          .eq('id', id)
          .eq('userid', user.id);
        
        if (delError) throw delError;

        const projectId = payment.projectid || payment.projectId;
        const targetProj = projects.find(p => p.id === projectId);
        if (targetProj) {
          const newPaid = Math.max(0, targetProj.paidamount - payment.amount);
          await supabase.from('projects').update({
            paidamount: newPaid,
            dueamount: targetProj.totalamount - newPaid
          }).eq('id', targetProj.id).eq('userid', user.id);
        }
        
        showToast('পেমেন্ট রেকর্ড ডিলিট করা হয়েছে', 'success');
        await fetchIncome();
        await refreshData();
      } catch (err: any) {
        showToast(`ভুল: ${err.message}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (payment: any) => {
    setIsEditing(true);
    setActivePaymentId(payment.id);
    setNewPayment({ 
      ...payment,
      projectName: payment.projectname || payment.projectName,
      clientName: payment.clientname || payment.clientName
    });
    setProjectSearch(payment.projectname || payment.projectName || '');
    const pId = payment.projectid || payment.projectId;
    setSelectedProjectId(pId);
    
    const proj = projects.find(p => p.id === pId);
    if (proj) setSelectedProjectDue(proj.dueamount);
    
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedProjectId || !user) {
      setError('দয়া করে একটি প্রজেক্ট সিলেক্ট করুন।');
      return;
    }

    setIsSubmitting(true);
    const amount = Number(newPayment.amount) || 0;
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    try {
      if (isEditing && activePaymentId) {
        const oldPayment = payments.find(p => p.id === activePaymentId);
        const delta = amount - (oldPayment?.amount || 0);

        const { error: updErr } = await supabase.from('income_records').update({
          amount,
          date: newPayment.date,
          method: newPayment.method
        }).eq('id', activePaymentId).eq('userid', user.id);

        if (updErr) throw updErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + delta;
          await supabase.from('projects').update({
            paidamount: newPaid,
            dueamount: Math.max(0, selectedProject.totalamount - newPaid)
          }).eq('id', selectedProjectId).eq('userid', user.id);
        }
        showToast('রেকর্ড আপডেট করা হয়েছে', 'success');
      } else {
        const { error: insErr } = await supabase.from('income_records').insert({
          projectid: selectedProjectId,
          projectname: selectedProject?.name,
          clientname: selectedProject?.clientname,
          amount,
          date: newPayment.date,
          method: newPayment.method,
          userid: user.id
        });

        if (insErr) throw insErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + amount;
          await supabase.from('projects').update({
            paidamount: newPaid,
            dueamount: Math.max(0, selectedProject.totalamount - newPaid)
          }).eq('id', selectedProjectId).eq('userid', user.id);
        }
        showToast('নতুন পেমেন্ট রেকর্ড করা হয়েছে', 'success');
      }

      setModalOpen(false);
      await fetchIncome();
      await refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewPayment({ projectName: '', clientName: '', date: new Date().toISOString().split('T')[0], amount: 0, method: 'বিকাশ' });
    setProjectSearch('');
    setSelectedProjectId(null);
    setSelectedProjectDue(0);
    setError(null);
    setActivePaymentId(null);
  };

  const filteredPayments = payments.filter(p => 
    (p.projectname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientname || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const projectSuggestions = projects.filter(p => 
    (p.name || '').toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSelectProject = (project: Project) => {
    setProjectSearch(project.name);
    setNewPayment({ ...newPayment, projectName: project.name, clientName: project.clientname });
    setSelectedProjectId(project.id);
    setSelectedProjectDue(project.dueamount);
    setShowSuggestions(false);
    setError(null);
  };

  const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">আয় (পেমেন্ট)</h1>
          <p className="text-xs text-slate-500">মোট আয়: <span className="text-emerald-600 font-bold">{currency} {totalIncome.toLocaleString('bn-BD')}</span></p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="পেমেন্ট খুঁজুন..." 
          className="w-full bg-transparent outline-none text-sm font-medium" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-20">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
            <p>কোনো পেমেন্ট নেই</p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div key={payment.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                     <DollarSign size={20} />
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-800 text-sm">{payment.projectname}</h3>
                     <p className="text-xs text-slate-500">{payment.clientname}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setActiveMenuId(activeMenuId === payment.id ? null : payment.id)}
                  className="p-2 -mr-2 text-slate-300 hover:text-emerald-600"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
              
              <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-1">
                <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">তারিখ</p>
                   <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                     <Calendar size={12} /> {payment.date}
                   </p>
                </div>
                <div className="text-right">
                   <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold mb-1 inline-block">
                     {payment.method}
                   </span>
                   <p className="text-lg font-black text-emerald-600">{currency} {payment.amount.toLocaleString('bn-BD')}</p>
                </div>
              </div>

              {activeMenuId === payment.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 animate-in fade-in">
                  <button onClick={() => handleOpenEditModal(payment)} className="flex-1 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
                    <Pencil size={14} /> এডিট
                  </button>
                  <button onClick={() => handleDeletePayment(payment.id, payment)} className="flex-1 py-2 bg-rose-50 rounded-xl text-xs font-bold text-rose-600 flex items-center justify-center gap-2">
                    <Trash2 size={14} /> ডিলিট
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'এডিট পেমেন্ট' : 'নতুন পেমেন্ট'}</h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
              
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">প্রজেক্ট</label>
                <input 
                    type="text" 
                    value={projectSearch} 
                    onFocus={() => setShowSuggestions(true)} 
                    onChange={e => {setProjectSearch(e.target.value); setShowSuggestions(true);}} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="প্রজেক্ট খুঁজুন..." 
                />
                {showSuggestions && projectSuggestions.length > 0 && (
                  <div className="absolute bottom-full mb-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50">
                    {projectSuggestions.map(p => (
                      <div key={p.id} onClick={() => handleSelectProject(p)} className="px-4 py-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer">
                        <div className="font-bold text-sm text-slate-800">{p.name}</div>
                        <div className="text-xs text-rose-500">বকেয়া: {currency}{p.dueamount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পরিমাণ ({currency})</label>
                <input 
                  required type="number" 
                  value={newPayment.amount || ''} 
                  onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none" 
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">তারিখ</label>
                  <input required type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পদ্ধতি</label>
                  <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none">
                    <option value="বিকাশ">বিকাশ</option>
                    <option value="নগদ">নগদ</option>
                    <option value="রকেট">রকেট</option>
                    <option value="ব্যাংক">ব্যাংক</option>
                    <option value="নগদ (ক্যাশ)">ক্যাশ</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4 mb-4">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Wallet />}
                সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
