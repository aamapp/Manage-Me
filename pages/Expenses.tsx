
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus, Search, Tag, X, ShoppingCart, Loader2, Trash2, MoreVertical, Pencil, Calculator, CalendarDays, Download, Filter, Music } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';

export const Expenses: React.FC = () => {
  // Use cached expenses from AppContext
  const { user, showToast, adminSelectedUserId, expenses, setExpenses, refreshData } = useAppContext();
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

  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Category input suggestion states
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryInputRef = useRef<HTMLDivElement>(null);
  
  const [newExpense, setNewExpense] = useState<any>({
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: ''
  });

  // Removed fetchExpenses() logic because it is now handled globally in AppContext

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
      await refreshData(); // Refresh global context
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
        await refreshData(); // Refresh global context
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

  const filteredExpenses = expenses.filter(e => {
    let matchesFilter = true;

    // Check Date Range Filter
    if (dateRange.start && e.date) {
        if (e.date < dateRange.start) matchesFilter = false;
    }
    if (dateRange.end && e.date) {
        if (e.date > dateRange.end) matchesFilter = false;
    }

    const matchesSearch = (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (e.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (EXPENSE_CATEGORY_LABELS[e.category] || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const totalExpenseFiltered = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;
    
    setIsGeneratingPDF(true);
    showToast('পিডিএফ তৈরি হচ্ছে...', 'info');
    
    // Wait a bit for the UI to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const element = listRef.current;
      const fileName = `expenses_${new Date().getTime()}.pdf`;
      
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          width: 1024,
          scrollY: 0,
          scrollX: 0,
          onclone: (clonedDoc: Document) => {
            clonedDoc.documentElement.style.overflow = 'visible';
            clonedDoc.body.style.overflow = 'visible';
            clonedDoc.documentElement.style.height = 'auto';
            clonedDoc.body.style.height = 'auto';
            clonedDoc.body.style.width = '1024px';

            const pdfHeader = clonedDoc.getElementById('pdf-header');
            if (pdfHeader) {
              pdfHeader.style.display = 'block';
              pdfHeader.style.breakAfter = 'avoid';
            }
            
            const pdfFooter = clonedDoc.getElementById('pdf-footer');
            if (pdfFooter) pdfFooter.style.display = 'block';

            const container = clonedDoc.getElementById('pdf-container');
            if (container) {
              container.style.width = '1024px';
              container.style.maxWidth = 'none';
              container.style.margin = '0';
              container.style.overflow = 'visible';
              container.style.height = 'auto';
              container.style.padding = '40px';
              container.style.boxSizing = 'border-box';
              container.style.backgroundColor = '#ffffff';
              container.style.borderRadius = '0';
              container.style.boxShadow = 'none';
              
              container.classList.remove('space-y-4', 'space-y-6', 'space-y-8', 'rounded-[2.5rem]', 'px-1');
              container.style.borderRadius = '0';
              container.style.paddingLeft = '40px';
              container.style.paddingRight = '40px';

              const allElements = container.querySelectorAll('*');
              allElements.forEach(el => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.overflow = 'visible';
                htmlEl.style.transition = 'none';
                htmlEl.style.animation = 'none';
                htmlEl.style.boxShadow = 'none';
              });
              
              const nestedSpacedElements = container.querySelectorAll('.space-y-4, .space-y-2, .space-y-6');
              nestedSpacedElements.forEach(el => {
                el.classList.remove('space-y-4', 'space-y-2', 'space-y-6', 'pb-12');
                (el as HTMLElement).style.display = 'block';
                (el as HTMLElement).style.paddingBottom = '0';
              });
              
              const truncatedElements = container.querySelectorAll('.truncate, .leading-snug, .leading-none, .leading-tight, .leading-relaxed');
              truncatedElements.forEach(el => {
                el.classList.remove('truncate', 'leading-snug', 'leading-none', 'leading-tight', 'leading-relaxed');
                (el as HTMLElement).style.whiteSpace = 'normal';
                (el as HTMLElement).style.overflow = 'visible';
                (el as HTMLElement).style.lineHeight = '1.5';
              });

              const scrollableElements = container.querySelectorAll('.overflow-x-auto, .no-scrollbar');
              scrollableElements.forEach(el => {
                el.classList.remove('overflow-x-auto', 'no-scrollbar');
                (el as HTMLElement).style.overflow = 'visible';
                (el as HTMLElement).style.display = 'flex';
                (el as HTMLElement).style.flexWrap = 'wrap';
              });

              const summaryCards = container.querySelectorAll('.summary-cards-container > div');
              summaryCards.forEach(card => {
                const el = card as HTMLElement;
                el.style.flex = '1';
                el.style.minWidth = '0';
                el.style.backgroundColor = el.classList.contains('bg-rose-50/50') ? '#fff1f2' : '#f8fafc';
                el.style.borderColor = el.classList.contains('border-rose-100') ? '#ffe4e6' : '#f1f5f9';
                el.style.display = 'block';
                el.style.padding = '20px';
                el.style.borderRadius = '16px';
                
                const texts = el.querySelectorAll('p');
                texts.forEach(text => {
                  const p = text as HTMLElement;
                  p.style.opacity = '1';
                  p.style.visibility = 'visible';
                  if (p.classList.contains('text-slate-400') || p.classList.contains('text-rose-400')) {
                    p.style.color = '#64748b';
                  } else if (p.classList.contains('text-slate-700') || p.classList.contains('text-rose-700')) {
                    p.style.color = '#1e293b';
                  }
                });
              });

              const expenseCards = Array.from(container.querySelectorAll('.expense-card-pdf'));
              if (expenseCards.length > 0) {
                const parent = expenseCards[0].parentNode;
                if (parent) {
                  (parent as HTMLElement).style.display = 'block';
                  (parent as HTMLElement).style.width = '100%';
                  (parent as HTMLElement).classList.remove('grid', 'flex');
                  
                  expenseCards.forEach((card) => {
                    const el = card as HTMLElement;
                    el.style.pageBreakInside = 'avoid';
                    el.style.breakInside = 'avoid-page';
                    el.style.display = 'block';
                    el.style.width = '100%';
                    el.style.boxSizing = 'border-box';
                    el.style.position = 'relative';
                    el.style.overflow = 'visible';
                    el.style.marginBottom = '25px';
                    el.style.padding = '0';
                    el.style.border = 'none';
                    el.style.float = 'none';
                    el.style.clear = 'both';
                  });
                }
              }

              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                .expense-card-pdf {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                  display: block !important;
                  width: 100% !important;
                  margin-bottom: 25px !important;
                  position: relative !important;
                  overflow: visible !important;
                  clear: both !important;
                }
                .expense-card-pdf > div {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                  box-shadow: none !important;
                  border: 1px solid #cbd5e1 !important;
                  border-radius: 12px !important;
                  overflow: visible !important;
                  background-color: white !important;
                  display: block !important;
                  width: 100% !important;
                  position: relative !important;
                }
                .summary-cards-container {
                  break-inside: avoid-page !important;
                  page-break-inside: avoid !important;
                  display: block !important;
                  margin-bottom: 32px !important;
                  overflow: visible !important;
                  width: 100% !important;
                  clear: both !important;
                }
                .summary-cards-container > div {
                  display: inline-block !important;
                  width: 30% !important;
                  margin-right: 3% !important;
                  background-color: #f8fafc !important;
                  border: 1px solid #f1f5f9 !important;
                  padding: 20px !important;
                  border-radius: 16px !important;
                  vertical-align: top !important;
                  box-sizing: border-box !important;
                }
                .summary-cards-container > div:last-child {
                  margin-right: 0 !important;
                }
                .summary-cards-container > div:first-child {
                  background-color: #fff1f2 !important;
                  border-color: #ffe4e6 !important;
                }
                .summary-cards-container p {
                  margin: 0 !important;
                  display: block !important;
                }
                #expenses-list-container {
                  display: block !important;
                  width: 100% !important;
                  overflow: visible !important;
                  padding-bottom: 50px !important;
                }
                #pdf-container {
                  background-color: white !important;
                  display: block !important;
                  border-radius: 0 !important;
                  overflow: visible !important;
                  width: 1024px !important;
                  padding-bottom: 100px !important;
                }
                #pdf-container * {
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact;
                  transition: none !important;
                  animation: none !important;
                  box-shadow: none !important;
                }
              `;
              clonedDoc.head.appendChild(style);
            }
          }
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: '.expense-card-pdf' }
      };

      const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
      
      let publicUrl = null;
      try {
        const { data, error } = await supabase.storage
          .from('reports')
          .upload(`pdfs/${fileName}`, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (!error && data) {
          const { data: { publicUrl: url } } = supabase.storage
            .from('reports')
            .getPublicUrl(`pdfs/${fileName}`);
          publicUrl = url;
          setPdfPublicUrl(url);
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload failed, falling back to blob', storageErr);
      }

      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Expense Report',
              text: 'Manage-Me Expense Report'
            });
            showToast('শেয়ার সফল হয়েছে', 'success');
            setIsGeneratingPDF(false);
            return;
          } catch (shareError) {
            console.log('Share cancelled or failed', shareError);
          }
        }
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(blobUrl);
      showToast('পিডিএফ তৈরি হয়েছে', 'success');
      
    } catch (error) {
      console.error('PDF Error:', error);
      showToast('পিডিএফ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">
               {user?.role === 'admin' ? (adminSelectedUserId ? 'ইউজার খরচ' : 'খরচসমূহ (অ্যাডমিন ভিউ)') : 'খরচসমূহ'}
            </h1>
            <button 
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-1.5 rounded-lg transition-all ${showDateFilter || dateRange.start || dateRange.end ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}
            >
              <CalendarDays size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">মোট খরচ: <span className="text-rose-600 font-bold">{user?.currency || '৳'} {totalExpenseFiltered.toLocaleString('bn-BD')}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleOpenAddModal}
            className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
          >
            <Download size={22} />
          </button>
        </div>
      </div>

      {/* Date Range Filter UI */}
      {showDateFilter && (
        <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter size={14} className="text-rose-500" /> তারিখ অনুযায়ী ফিল্টার
            </h3>
            {(dateRange.start || dateRange.end) && (
              <button 
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg"
              >
                রিসেট
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker 
              label="শুরু"
              value={dateRange.start}
              onChange={(date) => setDateRange({ ...dateRange, start: date })}
              placeholder="শুরু তারিখ"
            />
            <DatePicker 
              label="শেষ"
              value={dateRange.end}
              onChange={(date) => setDateRange({ ...dateRange, end: date })}
              placeholder="শেষ তারিখ"
              align="right"
            />
          </div>
        </div>
      )}

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

      {/* Report Content Area (for PDF) */}
      <div id="pdf-container" ref={listRef} className={`${isGeneratingPDF ? 'block' : 'space-y-4 rounded-[2.5rem]'} px-1 py-4 bg-white`}>
        {/* PDF Only Header */}
        <div id="pdf-header" className={isGeneratingPDF ? "block mb-10" : "hidden"}>
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Music size={36} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">Manage-Me</h1>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Professional Studio Manager</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-1">খরচ রিপোর্ট</p>
              <p className="text-[10px] font-bold text-slate-500">তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] font-bold text-slate-400">সময়: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div 
            className={`flex gap-4 mb-8 ${isGeneratingPDF ? 'summary-cards-container' : ''}`}
            style={isGeneratingPDF ? { breakInside: 'avoid', pageBreakInside: 'avoid' } : {}}
          >
             <div className="flex-1 bg-rose-50/50 border border-rose-100 p-5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">মোট খরচ</p>
                <p className="text-xl font-black text-rose-700">{user?.currency || '৳'} {totalExpenseFiltered.toLocaleString('bn-BD')}</p>
             </div>
             <div className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মোট রেকর্ড</p>
                <p className="text-xl font-black text-slate-700">{filteredExpenses.length} টি</p>
             </div>
             <div className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">সময়কাল</p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {dateRange.start || dateRange.end ? (
                    <>
                      {dateRange.start ? new Date(dateRange.start).toLocaleDateString('bn-BD') : 'শুরু'} 
                      {' - '} 
                      {dateRange.end ? new Date(dateRange.end).toLocaleDateString('bn-BD') : 'বর্তমান'}
                    </>
                  ) : 'সকল সময়'}
                </p>
             </div>
          </div>
        </div>

        <div 
          id="expenses-list-container"
          className={isGeneratingPDF ? "block w-full pb-12" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20"}
        >
          {filteredExpenses.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো খরচ নেই</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className={isGeneratingPDF ? 'expense-card-pdf' : ''}
                style={isGeneratingPDF ? { 
                  breakInside: 'avoid', 
                  pageBreakInside: 'avoid',
                  width: '100%',
                  display: 'block',
                  marginBottom: '30px'
                } : {}}
              >
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm relative ${isGeneratingPDF ? '' : 'animate-in slide-in-from-bottom-2 duration-300'}`}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Tag size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{expense.notes}</h3>
                        <p className="text-xs text-slate-500 font-medium">{EXPENSE_CATEGORY_LABELS[expense.category] || expense.category} • {expense.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="font-black text-rose-600 text-base mr-1 whitespace-nowrap">{user?.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</span>
                      
                      {!isGeneratingPDF && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="খরচ ডিলিট"
        message="আপনি কি এই খরচের রেকর্ডটি মুছে ফেলতে চান?"
        isProcessing={isDeleting}
      />

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">রিপোর্ট তৈরি হয়েছে</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ডাউনলোড বা শেয়ার করুন</p>
                </div>
              </div>
              <button 
                onClick={() => setPdfPreviewUrl(null)}
                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner">
                <Receipt size={48} />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-600">আপনার খরচের রিপোর্টটি সফলভাবে তৈরি করা হয়েছে।</p>
                <p className="text-xs text-slate-400">নিচের বাটনটি ক্লিক করে আপনার ডিভাইসে সেভ করুন।</p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <a 
                  href={pdfPreviewUrl} 
                  download={`expenses_${new Date().getTime()}.pdf`}
                  onClick={() => setTimeout(() => setPdfPreviewUrl(null), 500)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <Download size={20} /> ডাউনলোড করুন
                </a>
                
                {pdfPublicUrl && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pdfPublicUrl);
                      showToast('লিঙ্ক কপি করা হয়েছে', 'success');
                    }}
                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    লিঙ্ক কপি করুন
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
                    <DatePicker 
                      label="তারিখ"
                      value={newExpense.date}
                      onChange={(date) => setNewExpense({...newExpense, date: date})}
                      placeholder="তারিখ"
                    />
                    
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
