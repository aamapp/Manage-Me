
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Plus, Search, Calendar, DollarSign, X, ReceiptText, Briefcase, CreditCard, AlertCircle, MoreVertical, Pencil, Trash2, Users, Loader2, CalendarDays, Wallet, Clock, Zap, Rocket, Landmark, Banknote, Calculator, Download, Music, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { Project, IncomeRecord } from '../types';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';

// Custom Bkash Icon to match the brand logo shape (Origami Bird)
const BkashIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="currentColor"
    className={className}
  >
    {/* Sharp angular path representing the origami bird */}
    <path d="M5 5 L50 45 L95 35 L75 65 L25 95 L35 55 Z" />
  </svg>
);

export const Income: React.FC = () => {
  // Use incomeRecords directly from context (cached data)
  const { projects, incomeRecords, user, showToast, refreshData, adminSelectedUserId, isOnline } = useAppContext();
  const currency = user?.currency || '৳';
  
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
  
  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{id: string, payment: any} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mobile action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);

  // Ref for click outside detection
  const projectInputRef = useRef<HTMLDivElement>(null);

  const [newPayment, setNewPayment] = useState<any>({
    projectName: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'বিকাশ'
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Action Menu
      if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
      
      // Close Project Suggestions
      if (projectInputRef.current && !projectInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  const initiateDelete = (id: string, payment: any) => {
    setPaymentToDelete({ id, payment });
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !paymentToDelete) return;
    setIsDeleting(true);
    
    try {
      let query = supabase.from('income_records').delete().eq('id', paymentToDelete.id);
      
      // If not admin, restrict delete to own records
      if (user.role !== 'admin') {
        query = query.eq('userid', user.id);
      }

      const { error: delError } = await query;
      
      if (delError) throw delError;

      const projectId = paymentToDelete.payment.projectid || paymentToDelete.payment.projectId;
      const targetProj = projects.find(p => p.id === projectId);
      
      if (targetProj) {
        const newPaid = Math.max(0, targetProj.paidamount - paymentToDelete.payment.amount);
        await supabase.from('projects').update({
          paidamount: newPaid,
          dueamount: targetProj.totalamount - newPaid
        }).eq('id', targetProj.id);
      }
      
      showToast('পেমেন্ট রেকর্ড ডিলিট করা হয়েছে', 'success');
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(`ভুল: ${err.message}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setPaymentToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast('অফলাইনে নতুন আয় যোগ করা যাবে না', 'error');
      return;
    }
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (payment: any) => {
    if (!isOnline) {
      showToast('অফলাইনে আয় এডিট করা যাবে না', 'error');
      return;
    }
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
    setError(null);
    if (!selectedProjectId || !user) {
      setError('দয়া করে একটি প্রজেক্ট সিলেক্ট করুন।');
      return;
    }

    setIsSubmitting(true);
    const amount = Number(safeEval(newPayment.amount)) || 0;
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    // Use selected user ID if admin is viewing a specific user, otherwise current user ID
    const targetUserId = (user.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user.id;

    try {
      if (isEditing && activePaymentId) {
        const oldPayment = incomeRecords.find(p => p.id === activePaymentId);
        const delta = amount - (oldPayment?.amount || 0);

        let query = supabase.from('income_records').update({
          amount,
          date: newPayment.date,
          method: newPayment.method
        }).eq('id', activePaymentId);

        if (user.role !== 'admin') {
            query = query.eq('userid', user.id);
        }

        const { error: updErr } = await query;

        if (updErr) throw updErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + delta;
          await supabase.from('projects').update({
            paidamount: newPaid,
            dueamount: Math.max(0, selectedProject.totalamount - newPaid)
          }).eq('id', selectedProjectId);
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
          userid: targetUserId
        });

        if (insErr) throw insErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + amount;
          await supabase.from('projects').update({
            paidamount: newPaid,
            dueamount: Math.max(0, selectedProject.totalamount - newPaid)
          }).eq('id', selectedProjectId);
        }
        showToast('নতুন পেমেন্ট রেকর্ড করা হয়েছে', 'success');
      }

      setModalOpen(false);
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

  const filteredPayments = incomeRecords.filter(p => 
    (p.projectname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clientname || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter: Match name AND ensure Due Amount > 0
  const projectSuggestions = projects.filter(p => 
    (p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) && 
    p.dueamount > 0
  );

  const handleSelectProject = (project: Project) => {
    setProjectSearch(project.name);
    setNewPayment({ ...newPayment, projectName: project.name, clientName: project.clientname });
    setSelectedProjectId(project.id);
    setSelectedProjectDue(project.dueamount);
    setShowSuggestions(false);
    setError(null);
  };

  const totalIncome = incomeRecords.reduce((acc, curr) => acc + curr.amount, 0);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;
    
    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);
    showToast('পিডিএফ তৈরি হচ্ছে...', 'info');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const element = listRef.current;
      const fileName = `income_report_${new Date().getTime()}.pdf`;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.style.overflow = 'visible';
          clonedDoc.documentElement.style.height = 'auto';
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.height = 'auto';
          
          const pdfHeader = clonedDoc.getElementById('pdf-header');
          const pdfStats = clonedDoc.getElementById('pdf-stats');
          const pdfFooter = clonedDoc.getElementById('pdf-footer');
          const container = clonedDoc.getElementById('pdf-container');

          if (container) {
            container.style.width = '794px';
            container.style.maxWidth = 'none';
            container.style.margin = '0';
            container.style.padding = '40px'; 
            container.style.backgroundColor = '#ffffff';
            container.style.display = 'block';
            container.style.overflow = 'visible';
            container.style.height = 'auto';
            
            container.classList.remove('space-y-4', 'rounded-[2.5rem]', 'px-1');

            const allElements = container.querySelectorAll('*');
            allElements.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.transition = 'none';
              htmlEl.style.animation = 'none';
              htmlEl.style.boxShadow = 'none';
              htmlEl.style.transform = 'none';
              htmlEl.style.opacity = '1';
            });

            const textElements = container.querySelectorAll('h1:not(.pdf-exact-text), h2:not(.pdf-exact-text), h3:not(.pdf-exact-text), h4, h5, h6, p:not(.pdf-exact-text), span:not(.pdf-exact-text), div.text-xs:not(.pdf-exact-text), div.text-sm:not(.pdf-exact-text)');
            textElements.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = '1.8';
              htmlEl.style.paddingTop = '2px';
              htmlEl.style.paddingBottom = '2px';
              htmlEl.style.overflow = 'visible';
            });

            const truncatedElements = container.querySelectorAll('.truncate, .line-clamp-1, .line-clamp-2, .leading-snug, .leading-tight, .leading-none');
            truncatedElements.forEach(el => {
              el.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'leading-snug', 'leading-tight', 'leading-none');
              (el as HTMLElement).style.whiteSpace = 'normal';
              (el as HTMLElement).style.overflow = 'visible';
            });

            const listContainer = clonedDoc.getElementById('income-list-container');
            if (listContainer) {
              listContainer.style.display = 'block';
              listContainer.style.width = '100%';
              listContainer.style.overflow = 'visible';
              listContainer.classList.remove('grid', 'md:grid-cols-2', 'xl:grid-cols-3', 'gap-4');

              const cards = Array.from(listContainer.querySelectorAll('.income-card-pdf'));
              
              container.innerHTML = '';
              
              if (pdfHeader) {
                pdfHeader.style.marginBottom = '24px';
                container.appendChild(pdfHeader);
              }
              
              if (pdfStats) {
                pdfStats.style.marginBottom = '30px';
                container.appendChild(pdfStats);
              }
              
              cards.forEach((card) => {
                const cardEl = card as HTMLElement;
                cardEl.style.display = 'block';
                cardEl.style.width = '100%';
                cardEl.style.marginBottom = '20px';
                container.appendChild(cardEl);
              });
              
              if (pdfFooter) {
                pdfFooter.style.marginTop = '24px';
                container.appendChild(pdfFooter);
              }
            }
          }

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            .income-card-pdf {
              display: block !important;
              width: 100% !important;
              position: relative !important;
              margin-bottom: 20px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      
      // Create a download link and trigger it
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);

      showToast('পিডিএফ ডাউনলোড হয়েছে', 'success');
      
    } catch (error) {
      console.error('PDF Error:', error);
      showToast('পিডিএফ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getPaymentMethodStyle = (method: string) => {
    switch(method) {
      case 'বিকাশ': 
        return { 
          style: 'bg-pink-50 text-pink-600', 
          icon: <BkashIcon size={12} /> 
        };
      case 'নগদ': 
        return { 
          style: 'bg-orange-50 text-orange-600', 
          icon: <Zap size={10} /> 
        };
      case 'রকেট': 
        return { 
          style: 'bg-purple-50 text-purple-600', 
          icon: <Rocket size={10} /> 
        };
      case 'ব্যাংক': 
        return { 
          style: 'bg-indigo-50 text-indigo-600', 
          icon: <Landmark size={10} /> 
        };
      default: 
        return { 
          style: 'bg-emerald-50 text-emerald-600', 
          icon: <Banknote size={10} /> 
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {user?.role === 'admin' ? (adminSelectedUserId ? 'ইউজার আয়' : 'আয় (অ্যাডমিন ভিউ)') : 'আয় (পেমেন্ট)'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">মোট আয়: <span className="text-emerald-600 font-bold">{currency} {totalIncome.toLocaleString('bn-BD')}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleOpenAddModal}
            className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform"
          >
            <Download size={22} />
          </button>
        </div>
      </div>

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="পেমেন্ট খুঁজুন..." 
          className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div id="pdf-container" ref={listRef} className={`${isGeneratingPDF ? 'block' : 'space-y-4 rounded-[2.5rem]'} px-1 py-4 bg-white`}>
        {isGeneratingPDF && (
          <div id="pdf-header" className="mb-8 border-b border-slate-200 pb-6 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                <Music size={28} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-3xl font-black text-slate-900 leading-none mb-1.5 tracking-tight pdf-exact-text" style={{ lineHeight: '1' }}>Manage-Me</h1>
                <h2 className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase leading-none pdf-exact-text" style={{ lineHeight: '1' }}>Professional Studio Manager</h2>
              </div>
            </div>

            <div className="text-right flex flex-col justify-center">
              <h2 className="text-xl font-black text-slate-800 mb-2 pdf-exact-text" style={{ lineHeight: '1.2' }}>আয় রিপোর্ট</h2>
              <p className="text-xs font-bold text-slate-500 mb-1 pdf-exact-text" style={{ lineHeight: '1.2' }}>তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-xs font-bold text-slate-500 pdf-exact-text" style={{ lineHeight: '1.2' }}>সময়: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}

        {isGeneratingPDF && (
          <div id="pdf-stats" className="mb-8 flex flex-col gap-6">
            <div className="flex gap-6">
              <div className="flex-1 bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-emerald-500 mb-2">মোট আয়</p>
                <p className="text-3xl font-black text-emerald-700">{currency} {totalIncome.toLocaleString('bn-BD')}</p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">রেকর্ড সংখ্যা</p>
                <p className="text-3xl font-black text-slate-700">{filteredPayments.length} টি</p>
              </div>
            </div>
          </div>
        )}

        <div 
          id="income-list-container" 
          className={isGeneratingPDF ? "block w-full pb-12" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20"}
        >
          {filteredPayments.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো পেমেন্ট নেই</p>
            </div>
          ) : (
            filteredPayments.map((payment) => {
              const { style, icon } = getPaymentMethodStyle(payment.method);
              return (
                <div 
                  key={payment.id} 
                  className={`income-card-pdf bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative ${isGeneratingPDF ? '' : 'animate-in slide-in-from-bottom-2 duration-300'}`}
                  style={isGeneratingPDF ? { 
                    breakInside: 'avoid', 
                    pageBreakInside: 'avoid',
                    width: '100%',
                    display: 'block',
                    paddingBottom: '20px',
                    marginBottom: '0'
                  } : {}}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                       <div className={`${isGeneratingPDF ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl'} bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0`}>
                         <DollarSign size={isGeneratingPDF ? 28 : 20} />
                       </div>
                       <div className="min-w-0">
                         <h3 className={`font-bold text-slate-800 ${isGeneratingPDF ? 'text-lg mb-1.5' : 'text-sm'} truncate`}>{payment.projectname}</h3>
                         <p className={`${isGeneratingPDF ? 'text-sm' : 'text-xs'} text-slate-500 font-medium`}>{payment.clientname}</p>
                       </div>
                    </div>
                    
                    {!isGeneratingPDF && (
                      <div className="relative action-menu-container">
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               setActiveMenuId(activeMenuId === payment.id ? null : payment.id);
                            }}
                            className={`p-2 -mr-2 rounded-full transition-colors ${activeMenuId === payment.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-300 hover:text-emerald-600 active:bg-slate-50'}`}
                          >
                            <MoreVertical size={20} />
                          </button>
                          
                          {activeMenuId === payment.id && (
                             <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                  <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (!isOnline) {
                                          showToast('অফলাইনে আয় এডিট করা যাবে না', 'error');
                                          return;
                                        }
                                        handleOpenEditModal(payment); 
                                      }}
                                      disabled={!isOnline}
                                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-colors
                                        ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'}
                                      `}
                                  >
                                      <Pencil size={14} /> এডিট
                                  </button>
                                  <div className="h-px bg-slate-50 w-full my-0.5"></div>
                                  <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (!isOnline) {
                                          showToast('অফলাইনে আয় ডিলিট করা যাবে না', 'error');
                                          return;
                                        }
                                        initiateDelete(payment.id, payment); 
                                      }}
                                      disabled={!isOnline}
                                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-colors
                                        ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'}
                                      `}
                                  >
                                       <Trash2 size={14} /> ডিলিট
                                  </button>
                              </div>
                          )}
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex justify-between items-end border-t border-slate-50 ${isGeneratingPDF ? 'pt-4 mt-2' : 'pt-3 mt-1'}`}>
                    <div>
                       <p className={`${isGeneratingPDF ? 'text-xs' : 'text-[10px]'} text-slate-400 font-bold uppercase mb-0.5`}>তারিখ</p>
                       <p className={`${isGeneratingPDF ? 'text-sm' : 'text-xs'} font-bold text-slate-600 flex items-center gap-1`}>
                         <Calendar size={isGeneratingPDF ? 14 : 12} /> {payment.date}
                       </p>
                    </div>
                    <div className="text-right">
                       <span className={`${isGeneratingPDF ? 'text-xs px-3 py-1' : 'text-[10px] px-2 py-0.5'} rounded font-bold mb-1 inline-flex items-center gap-1 ${style}`}>
                         {icon}
                         {payment.method}
                       </span>
                       <p className={`${isGeneratingPDF ? 'text-2xl' : 'text-lg'} font-black text-emerald-600`}>{currency} {payment.amount.toLocaleString('bn-BD')}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="পেমেন্ট ডিলিট"
        message="আপনি কি নিশ্চিত? এটি ডিলিট করলে প্রজেক্টের বকেয়া আবার বেড়ে যাবে।"
        isProcessing={isDeleting}
      />

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">{isEditing ? 'এডিট পেমেন্ট' : 'নতুন পেমেন্ট'}</h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="px-4 pt-3 pb-24 space-y-4">
                  {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
                  
                  <div className="relative" ref={projectInputRef}>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">প্রজেক্ট</label>
                    <input 
                        type="text" 
                        value={projectSearch} 
                        onFocus={() => setShowSuggestions(true)} 
                        onChange={e => {setProjectSearch(e.target.value); setShowSuggestions(true);}} 
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" 
                        placeholder="প্রজেক্ট খুঁজুন..." 
                    />
                    {showSuggestions && projectSuggestions.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                        {projectSuggestions.map(p => (
                          <div key={p.id} onClick={() => handleSelectProject(p)} className="px-4 py-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer transition-colors">
                            <div className="font-bold text-sm text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.clientname}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedProjectId && (
                      <div className="flex justify-end mt-2 animate-in slide-in-from-top-1">
                        <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                           বকেয়া: <span className="text-rose-600">{currency} {selectedProjectDue.toLocaleString('bn-BD')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পরিমাণ ({currency})</label>
                    <div 
                      onClick={() => setShowKeypad(true)}
                      className="keypad-trigger w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-emerald-600 active:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                    >
                       <span>{newPayment.amount || 0}</span>
                       <Calculator size={18} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DatePicker 
                      label="তারিখ"
                      value={newPayment.date}
                      onChange={(date) => setNewPayment({...newPayment, date: date})}
                      placeholder="তারিখ"
                    />
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পদ্ধতি</label>
                      <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="বিকাশ">বিকাশ</option>
                        <option value="নগদ">নগদ</option>
                        <option value="রকেট">রকেট</option>
                        <option value="ব্যাংক">ব্যাংক</option>
                        <option value="নগদ (ক্যাশ)">ক্যাশ</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Wallet />}
                    সেভ করুন
                  </button>
                </form>
            </div>
            
            <NumericKeypad 
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={(val) => setNewPayment({...newPayment, amount: val})}
              initialValue={newPayment.amount}
              title="পেমেন্ট পরিমাণ"
            />
        </div>,
        document.body
      )}
    </div>
  );
};
