
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectDue, setSelectedProjectDue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState<any>({
    projectName: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'বিকাশ'
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeletePayment = async (e: React.MouseEvent, payment: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    if (window.confirm('আপনি কি নিশ্চিত? এটি ডিলিট করলে প্রজেক্টের বকেয়া আবার বেড়ে যাবে।')) {
      setIsDeleting(payment.id);
      setOpenMenuId(null);
      
      try {
        const { error: delError } = await supabase
          .from('income_records')
          .delete()
          .eq('id', payment.id)
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
    setOpenMenuId(null);
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
  const totalDue = projects.reduce((acc, curr) => acc + (curr.dueamount || 0), 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">আয় (পেমেন্ট রেকর্ড)</h1>
          <p className="text-slate-500">সমস্ত পেমেন্ট ডাটাবেসে সেভ হচ্ছে।</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          <span>পেমেন্ট রেকর্ড করুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট আয়</p>
            <h3 className="text-xl font-bold text-slate-800">{currency} {totalIncome.toLocaleString('bn-BD')}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট বকেয়া</p>
            <h3 className="text-xl font-bold text-rose-600">{currency} {totalDue.toLocaleString('bn-BD')}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
        <div className="p-4 border-b bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-slate-500">ডাটা লোড হচ্ছে...</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px] no-scrollbar">
            {filteredPayments.length === 0 ? (
              <div className="p-20 text-center text-slate-400">
                <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-5 border-b border-slate-100">তারিখ</th>
                    <th className="px-6 py-5 border-b border-slate-100">প্রজেক্ট</th>
                    <th className="px-6 py-5 border-b border-slate-100">ক্লায়েন্ট</th>
                    <th className="px-6 py-5 border-b border-slate-100">পদ্ধতি</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-right">পরিমাণ</th>
                    <th className="px-6 py-5 border-b border-slate-100 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5 text-slate-500">{payment.date}</td>
                      <td className="px-6 py-5 font-bold text-slate-800">{payment.projectname}</td>
                      <td className="px-6 py-5 text-slate-600">{payment.clientname}</td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-bold text-slate-500">{payment.method}</span>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-emerald-600">{currency} {payment.amount.toLocaleString('bn-BD')}</td>
                      <td className="px-6 py-5 text-center relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === payment.id ? null : payment.id); }}
                          className="p-2 text-slate-400 hover:text-indigo-600"
                        >
                          {isDeleting === payment.id ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <MoreVertical size={18} />}
                        </button>
                        {openMenuId === payment.id && (
                          <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in zoom-in duration-100">
                            <button onClick={() => handleOpenEditModal(payment)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Pencil size={14} className="text-indigo-500" /> এডিট
                            </button>
                            <button onClick={(e) => handleDeletePayment(e, payment)} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                              <Trash2 size={14} /> ডিলিট
                            </button>
                          </div>
                        )}
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'এডিট করুন' : 'পেমেন্ট রেকর্ড'}</h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
              
              <div className="relative" ref={suggestionRef}>
                <label className="block text-sm font-bold text-slate-700 mb-1">প্রজেক্ট</label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={projectSearch} 
                    onFocus={() => setShowSuggestions(true)} 
                    onChange={e => {setProjectSearch(e.target.value); setShowSuggestions(true);}} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 font-bold" 
                    placeholder="প্রজেক্ট সার্চ করুন..." 
                  />
                  {showSuggestions && projectSuggestions.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[200] max-h-48 overflow-y-auto no-scrollbar py-2">
                      {projectSuggestions.map(p => (
                        <button key={p.id} type="button" onClick={() => handleSelectProject(p)} className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex flex-col transition-colors group">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">{p.name}</span>
                            <span className="text-[10px] font-bold text-rose-500">বকেয়া: {currency}{p.dueamount.toLocaleString('bn-BD')}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{p.clientname}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProjectId && (
                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Users size={12}/> {newPayment.clientName}</span>
                    <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      বকেয়া: {currency} {selectedProjectDue.toLocaleString('bn-BD')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">পরিমাণ ({currency})</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required 
                    type="number" 
                    value={newPayment.amount || ''} 
                    onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg text-emerald-600" 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">পেমেন্ট তারিখ</label>
                  <div className="relative">
                    <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      required 
                      type="date" 
                      value={newPayment.date} 
                      onChange={e => setNewPayment({...newPayment, date: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">পেমেন্ট পদ্ধতি</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select 
                    value={newPayment.method} 
                    onChange={e => setNewPayment({...newPayment, method: e.target.value})} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                  >
                    <option value="বিকাশ">বিকাশ</option>
                    <option value="নগদ">নগদ</option>
                    <option value="রকেট">রকেট</option>
                    <option value="ব্যাংক">ব্যাংক</option>
                    <option value="নগদ (ক্যাশ)">নগদ (ক্যাশ)</option>
                  </select>
                </div>
              </div>

              <button 
                disabled={isSubmitting} 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Wallet size={20} />}
                {isEditing ? 'আপডেট করুন' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
