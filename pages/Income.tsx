
import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Plus, Search, Calendar, DollarSign, X, ReceiptText, Briefcase, CreditCard, AlertCircle, MoreVertical, Pencil, Trash2, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Project } from '../types';

interface PaymentRecord {
  id: string;
  projectId: string;
  project: string;
  clientName: string; // নতুন ফিল্ড যুক্ত
  date: string;
  amount: number;
  method: string;
}

export const Income: React.FC = () => {
  const { projects, setProjects, user } = useAppContext();
  const currency = user.currency || '৳';
  
  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(`mm_income_records_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState<Partial<PaymentRecord>>({
    project: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'বিকাশ'
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`mm_income_records_${user.id}`, JSON.stringify(payments));
  }, [payments, user.id]);

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

  const handleOpenAddModal = () => {
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (payment: PaymentRecord) => {
    setIsEditing(true);
    setActivePaymentId(payment.id);
    setNewPayment({ ...payment });
    setProjectSearch(payment.project);
    setSelectedProjectId(payment.projectId);
    setModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeletePayment = (payment: PaymentRecord) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই পেমেন্ট রেকর্ডটি ডিলিট করতে চান? এটি প্রজেক্টের ব্যালেন্স থেকেও কমে যাবে।')) {
      setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === payment.projectId) {
          const newPaid = Math.max(0, p.paidAmount - payment.amount);
          return {
            ...p,
            paidAmount: newPaid,
            dueAmount: p.totalAmount - newPaid
          };
        }
        return p;
      }));

      const updatedPayments = payments.filter(p => p.id !== payment.id);
      setPayments(updatedPayments);
      setOpenMenuId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProjectId) {
      setError('দয়া করে তালিকা থেকে একটি সঠিক প্রজেক্ট সিলেক্ট করুন।');
      return;
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (!selectedProject) return;

    const amount = Number(newPayment.amount) || 0;
    if (amount <= 0) {
      setError('দয়া করে সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (isEditing && activePaymentId) {
      const oldPayment = payments.find(p => p.id === activePaymentId);
      const delta = amount - (oldPayment?.amount || 0);

      setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === selectedProjectId) {
          const newPaid = p.paidAmount + delta;
          return {
            ...p,
            paidAmount: newPaid,
            dueAmount: Math.max(0, p.totalAmount - newPaid)
          };
        }
        return p;
      }));

      setPayments(prev => prev.map(p => p.id === activePaymentId ? {
        ...newPayment as PaymentRecord,
        id: activePaymentId,
        projectId: selectedProjectId!,
        project: selectedProject.name,
        clientName: selectedProject.clientName,
        amount: amount
      } : p));
    } else {
      const payment: PaymentRecord = {
        ...newPayment as PaymentRecord,
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        project: selectedProject.name,
        clientName: selectedProject.clientName,
        amount: amount
      };
      
      setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === selectedProjectId) {
          const newPaid = p.paidAmount + amount;
          return {
            ...p,
            paidAmount: newPaid,
            dueAmount: Math.max(0, p.totalAmount - newPaid)
          };
        }
        return p;
      }));

      setPayments([payment, ...payments]);
    }
    
    setModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewPayment({ project: '', clientName: '', date: new Date().toISOString().split('T')[0], amount: 0, method: 'বিকাশ' });
    setProjectSearch('');
    setSelectedProjectId(null);
    setError(null);
    setActivePaymentId(null);
  };

  const filteredPayments = payments.filter(p => 
    p.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.date.includes(searchTerm)
  );

  const projectSuggestions = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSelectProject = (project: Project) => {
    setProjectSearch(project.name);
    setNewPayment({ ...newPayment, project: project.name, clientName: project.clientName });
    setSelectedProjectId(project.id);
    setShowSuggestions(false);
    setError(null);
  };

  const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">আয় (পেমেন্ট রেকর্ড)</h1>
          <p className="text-slate-500">আপনার অর্জিত সমস্ত পেমেন্টের ইতিহাস এখানে সংরক্ষণ করুন।</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          <span>পেমেন্ট রেকর্ড করুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট লেনদেন</p>
            <h3 className="text-xl font-bold text-slate-800">{payments.length} টি</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">গড় পেমেন্ট</p>
            <h3 className="text-xl font-bold text-slate-800">{currency} {payments.length > 0 ? (totalIncome / payments.length).toLocaleString('bn-BD', { maximumFractionDigits: 0 }) : 0}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
        <div className="p-4 border-b bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="প্রজেক্ট বা ক্লায়েন্ট দিয়ে সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto min-h-[400px] no-scrollbar">
          {filteredPayments.length === 0 ? (
            <div className="p-20 text-center text-slate-400">
              <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-5 border-b border-slate-100">তারিখ</th>
                  <th className="px-6 py-5 border-b border-slate-100">প্রজেক্ট</th>
                  <th className="px-6 py-5 border-b border-slate-100">ক্লায়েন্ট/স্টুডিও</th>
                  <th className="px-6 py-5 border-b border-slate-100">পদ্ধতি</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right">পরিমাণ</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map((payment, index) => {
                  const isNearBottom = filteredPayments.length > 3 && index >= filteredPayments.length - 2;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5 text-slate-500 whitespace-nowrap">{payment.date}</td>
                      <td className="px-6 py-5 font-bold text-slate-800">{payment.project}</td>
                      <td className="px-6 py-5 font-semibold text-slate-600">
                         <div className="flex items-center gap-2">
                           <Users size={14} className="text-slate-400" />
                           {payment.clientName}
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-500 whitespace-nowrap">
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600 text-base">
                        {currency} {payment.amount.toLocaleString('bn-BD')}
                      </td>
                      <td className="px-6 py-5 text-center relative">
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === payment.id ? null : payment.id);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {openMenuId === payment.id && (
                            <div 
                              ref={menuRef}
                              className={`absolute right-0 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in duration-150 origin-top-right
                                ${isNearBottom ? 'bottom-full mb-2' : 'mt-1'}
                              `}
                            >
                              <button 
                                onClick={() => handleOpenEditModal(payment)}
                                className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-slate-700 hover:bg-indigo-50 flex items-center gap-3 transition-colors"
                              >
                                <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                  <Pencil size={14} />
                                </div>
                                <span>এডিট করুন</span>
                              </button>
                              <button 
                                onClick={() => handleDeletePayment(payment)}
                                className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors border-t border-slate-50 mt-1"
                              >
                                <div className="w-7 h-7 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                                  <Trash2 size={14} />
                                </div>
                                <span>ডিলিট করুন</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'পেমেন্ট রেকর্ড এডিট করুন' : 'পেমেন্ট রেকর্ড করুন'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600 text-xs animate-in slide-in-from-top-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <div className="relative" ref={suggestionRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">প্রজেক্টের নাম</label>
                <div className="relative">
                  <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required 
                    type="text" 
                    autoComplete="off"
                    value={projectSearch} 
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setProjectSearch(e.target.value);
                      setNewPayment({...newPayment, project: e.target.value});
                      setSelectedProjectId(null);
                      setShowSuggestions(true);
                      setError(null);
                    }} 
                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium 
                      ${selectedProjectId ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`} 
                    placeholder="প্রজেক্টের নাম লিখে সিলেক্ট করুন" 
                  />
                </div>
                
                {showSuggestions && projectSuggestions.length > 0 && (
                  <div className="absolute z-[160] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto no-scrollbar py-2">
                    <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">প্রজেক্ট তালিকা</p>
                    {projectSuggestions.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProject(p)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-bold ${p.dueAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            বাকি: {currency}{p.dueAmount.toLocaleString('bn-BD')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">টাকার পরিমাণ</label>
                  <input 
                    required 
                    type="number" 
                    value={newPayment.amount || ''} 
                    onChange={e => {
                      setNewPayment({...newPayment, amount: Number(e.target.value)});
                      setError(null);
                    }} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-bold" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-rose-600 mb-1.5">বর্তমান বকেয়া</label>
                  <div className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-black flex items-center h-[50px]">
                    {(() => {
                      const proj = projects.find(p => p.id === selectedProjectId);
                      return proj ? `${currency} ${proj.dueAmount.toLocaleString('bn-BD')}` : '--';
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">তারিখ</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required 
                      type="date" 
                      value={newPayment.date} 
                      onChange={e => setNewPayment({...newPayment, date: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">পদ্ধতি</label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select 
                      value={newPayment.method} 
                      onChange={e => setNewPayment({...newPayment, method: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium appearance-none cursor-pointer"
                    >
                      <option>বিকাশ</option>
                      <option>নগদ</option>
                      <option>ব্যাংক ট্রান্সফার</option>
                      <option>নগদ (ক্যাশ)</option>
                      <option>নগদ (অটো-সিঙ্ক)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg mt-4 active:scale-95
                  ${selectedProjectId ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {isEditing ? 'আপডেট করুন' : 'রেকর্ড সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
