
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus, Search, Tag, X, ShoppingCart, Loader2, Trash2, MoreVertical, Pencil, SquarePen, Calculator, CalendarDays, Download, Filter, Music, Share2, ExternalLink, Copy, AlertCircle, Banknote, ArrowRightLeft, ArrowDown, ArrowUp, Users, MapPin, Phone, User as UserIcon, Calendar, ImagePlus, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { EXPENSE_CATEGORY_LABELS, APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';
import { DuePerson, DueTransaction } from '../types';

export const Expenses: React.FC = () => {
  // Use cached expenses from AppContext
  const { user, showToast, adminSelectedUserId, expenses, setExpenses, refreshData, isOnline } = useAppContext();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'dues'>('expenses');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get('view');
    if (viewId) {
      setActiveTab('dues');
    }
  }, [location.search]);
  
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
    date: new Date().toLocaleDateString('en-CA'),
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
    if (!isOnline) {
      showToast('অফলাইনে নতুন খরচ যোগ করা যাবে না', 'error');
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const localToday = `${y}-${m}-${d}`;
    
    setIsEditing(false);
    setActiveExpenseId(null);
    setNewExpense({ category: '', date: localToday, amount: 0, notes: '' });
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
    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'খরচ সংরক্ষণ করা হচ্ছে...' } }));
    
    // Evaluate possible math expressions
    const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
    
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const localToday = `${y}-${m}-${d}`;
    
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const currentTimeAtNoon = '12:00:00';
    const currentTimeNow = `${hh}:${mm}:${ss}`;
    
    let dateToSave = newExpense.date;
    
    // Use selected user ID if admin is viewing a specific user, otherwise current user ID
    const targetUserId = (user.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user.id;

    try {
      if (isEditing && activeExpenseId) {
        if (dateToSave === localToday) {
           dateToSave = new Date(`${dateToSave}T${currentTimeNow}`).toISOString();
        } else if (dateToSave && dateToSave.length === 10) {
           dateToSave = new Date(`${dateToSave}T${currentTimeAtNoon}`).toISOString();
        }

        let query = supabase.from('expenses').update({
          category: newExpense.category,
          amount: parsedAmount,
          date: dateToSave,
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
        if (dateToSave === localToday) {
           dateToSave = new Date(`${dateToSave}T${currentTimeNow}`).toISOString();
        } else if (dateToSave && dateToSave.length === 10) {
           dateToSave = new Date(`${dateToSave}T${currentTimeAtNoon}`).toISOString();
        }

        // Insert new expense
        const { error } = await supabase.from('expenses').insert({
          category: newExpense.category,
          amount: parsedAmount,
          date: dateToSave,
          notes: newExpense.notes,
          userid: targetUserId
        });

        if (error) throw error;
        showToast('খরচ সফলভাবে সেভ হয়েছে', 'success');
      }
      
      setModalOpen(false);
      await refreshData(); // Refresh global context
      if (!isEditing) {
        setNewExpense({ category: '', date: new Date().toLocaleDateString('en-CA'), amount: 0, notes: '' });
      }
    } catch (error: any) {
      showToast(`সমস্যা: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
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
      const expense = expenses.find(e => e.id === expenseToDelete.id);
      if (!expense) throw new Error('Expense not found');

      const { error } = await supabase
        .from('expenses')
        .update({ notes: `[TRASH] ${expense.notes || ''}`.trim() })
        .eq('id', expenseToDelete.id);
      
      if (error) throw error;
      showToast('খরচটি রিসাইকেল বিনে পাঠানো হয়েছে', 'success');
      await refreshData();
      setShowDeleteModal(false);
    } catch(err: any) {
      showToast(err.message);
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };

  const filteredExpenses = React.useMemo(() => expenses.filter(e => {
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
  }), [expenses, dateRange, searchTerm]);

  const totalExpenseFiltered = React.useMemo(() => filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0), [filteredExpenses]);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;
    
    window.scrollTo(0, 0); // Ensure we are at the top for reliable capture
    setIsGeneratingPDF(true);
    window.dispatchEvent(new CustomEvent('app:processing', { detail: true }));
    showToast('পিডিএফ তৈরি হচ্ছে...', 'info');
    
    // Wait a bit for the UI to update
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const element = listRef.current;
      const fileName = `ManageMe_Expense_Report_${new Date().toLocaleDateString('en-CA')}.pdf`;
      
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2, // Reduced scale for better performance and smaller file size
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.getElementById('pdf-container');
          if (container) {
            container.style.width = '794px';
            container.style.maxWidth = 'none';
            container.style.margin = '0';
            container.style.padding = '40px'; 
            container.style.backgroundColor = '#ffffff';
            container.classList.remove('space-y-4', 'space-y-6', 'space-y-8', 'rounded-[2.5rem]', 'px-1');

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
            });

            // Fix M logo text position
            const logoTexts = container.querySelectorAll('.pdf-logo-text');
            logoTexts.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = '1';
              htmlEl.style.padding = '0';
              htmlEl.style.position = 'relative';
              htmlEl.style.top = '-3px';
            });

            // Fix specific badges that get messed up by the global text fix
            const badges = container.querySelectorAll('.pdf-badge');
            badges.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = '1';
              htmlEl.style.paddingTop = '0px';
              htmlEl.style.paddingBottom = '0px';
              htmlEl.style.display = 'inline-flex';
              htmlEl.style.alignItems = 'center';
              htmlEl.style.justifyContent = 'center';
            });
            
            const badgeTexts = container.querySelectorAll('.pdf-badge-text');
            badgeTexts.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.position = 'relative';
              htmlEl.style.top = '-2px';
            });

            const truncatedElements = container.querySelectorAll('.truncate, .line-clamp-1, .line-clamp-2, .leading-snug, .leading-tight, .leading-none');
            truncatedElements.forEach(el => {
              el.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'leading-snug', 'leading-tight', 'leading-none');
              (el as HTMLElement).style.whiteSpace = 'normal';
              (el as HTMLElement).style.overflow = 'visible';
            });
            
            const listContainer = clonedDoc.getElementById('expenses-list-container');
            if (listContainer && container) {
              const cards = Array.from(listContainer.querySelectorAll('.expense-card-pdf'));
              const header = clonedDoc.getElementById('pdf-header');
              const stats = clonedDoc.getElementById('pdf-stats');
              
              // Clear the container to rebuild as a single list
              container.innerHTML = '';
              
              if (header) {
                header.style.marginBottom = '24px';
                container.appendChild(header);
              }
              if (stats) {
                stats.style.marginBottom = '32px';
                container.appendChild(stats);
              }
              
              // Add all cards sequentially
              cards.forEach(card => {
                const cardEl = card as HTMLElement;
                cardEl.style.display = 'block';
                cardEl.style.width = '100%';
                cardEl.style.marginBottom = '20px';
                container.appendChild(cardEl);
              });
            }
          }

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            .expense-card-pdf {
              display: block !important;
              width: 100% !important;
              position: relative !important;
            }
            .expense-card-pdf > div {
              border: 1px solid #cbd5e1 !important;
              border-radius: 12px !important;
              background-color: white !important;
              box-shadow: none !important;
              padding: 16px !important;
              display: block !important;
            }
            h1, h2, h3, h4, h5, h6, p, span, div {
              line-height: 1.6 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Calculate dimensions in mm (1px = 0.264583mm)
      const imgWidth = canvas.width / 2; // scale is 2
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

      showToast('পিডিএফ তৈরি ও ডাউনলোড হয়েছে', 'success');
      
    } catch (error) {
      console.error('PDF Error:', error);
      showToast('পিডিএফ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsGeneratingPDF(false);
      window.dispatchEvent(new CustomEvent('app:processing', { detail: false }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Sub-Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit mx-auto lg:mx-0">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt size={18} /> খরচের হিসাব
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'dues'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowRightLeft size={18} /> দেনা পাওনা
        </button>
      </div>

      {activeTab === 'dues' ? (
        <DuesManager />
      ) : (
        <>
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
            onClick={handleDownloadPDF}
            className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
          >
            <Download size={22} />
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="bg-rose-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 active:scale-90 transition-transform"
          >
            <Plus size={24} />
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
      <div id="pdf-container" ref={listRef} className={`${isGeneratingPDF ? 'block' : 'space-y-4 rounded-xl sm:rounded-2xl'} px-1 sm:px-2 py-4 bg-white`}>
        
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
              <h2 className="text-xl font-black text-slate-800 mb-2 pdf-exact-text" style={{ lineHeight: '1.2' }}>খরচ রিপোর্ট</h2>
              <p className="text-xs font-bold text-slate-500 mb-1 pdf-exact-text" style={{ lineHeight: '1.2' }}>তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-xs font-bold text-slate-500 pdf-exact-text" style={{ lineHeight: '1.2' }}>সময়: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}

        {/* PDF Only Summary Section */}
        {isGeneratingPDF && (
          <div id="pdf-stats" className="mb-8 flex flex-col gap-6">
            <div className="flex gap-6">
              <div className="flex-1 bg-white border border-rose-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-rose-500 mb-2">মোট খরচ</p>
                <p className="text-3xl font-black text-rose-700">{user?.currency || '৳'} {totalExpenseFiltered.toLocaleString('bn-BD')}</p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">মোট রেকর্ড</p>
                <p className="text-3xl font-black text-slate-700">{filteredExpenses.length} টি</p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">সময়কাল</p>
                <p className="text-xl font-black text-slate-700 mt-1">
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
        )}

        {/* Original Summary Cards (Hidden in PDF) */}
        {!isGeneratingPDF && (
          <div className="grid grid-cols-3 gap-2 mb-4">
             <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-rose-400 uppercase leading-none mb-2">মোট খরচ</p>
                <p className="text-sm md:text-base font-black text-rose-700 leading-none truncate">{user?.currency || '৳'} {totalExpenseFiltered.toLocaleString('bn-BD')}</p>
             </div>
             <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-2">মোট রেকর্ড</p>
                <p className="text-sm md:text-base font-black text-slate-700 leading-none truncate">{filteredExpenses.length} টি</p>
             </div>
             <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-2">সময়কাল</p>
                <p className="text-xs font-black text-slate-700 leading-none truncate">
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
        )}

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
                  paddingBottom: '20px',
                  marginBottom: '0'
                } : {}}
              >
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm relative ${isGeneratingPDF ? '' : 'animate-in slide-in-from-bottom-2 duration-300'}`}>
                  <div className={`${isGeneratingPDF ? 'px-6 py-6' : 'p-4'} flex items-center justify-between`}>
                    <div className={`flex items-center ${isGeneratingPDF ? 'gap-4' : 'gap-3'} overflow-hidden`}>
                      <div className={`${isGeneratingPDF ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl'} bg-rose-50 text-rose-600 flex items-center justify-center shrink-0`}>
                        <Tag size={isGeneratingPDF ? 28 : 18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-bold text-slate-800 ${isGeneratingPDF ? 'text-lg mb-1.5' : 'text-sm'} truncate`}>{expense.notes}</h3>
                        <p className={`${isGeneratingPDF ? 'text-sm' : 'text-xs'} text-slate-500 font-medium`}>{EXPENSE_CATEGORY_LABELS[expense.category] || expense.category} • {expense.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className={`font-black text-rose-600 ${isGeneratingPDF ? 'text-xl' : 'text-base'} mr-1 whitespace-nowrap`}>{user?.currency || '৳'} {expense.amount.toLocaleString('bn-BD')}</span>
                      
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
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (!isOnline) {
                                            showToast('অফলাইনে খরচ এডিট করা যাবে না', 'error');
                                            return;
                                          }
                                          handleOpenEditModal(expense); 
                                        }}
                                        disabled={!isOnline}
                                        className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 transition-colors
                                          ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}
                                        `}
                                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                                    >
                                        <SquarePen size={18} className={!isOnline ? 'text-slate-300' : 'text-slate-500'} /> এডিট
                                    </button>
                                    <div className="h-px bg-slate-50 w-full"></div>
                                    <button 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (!isOnline) {
                                            showToast('অফলাইনে খরচ ডিলিট করা যাবে না', 'error');
                                            return;
                                          }
                                          initiateDelete(expense.id, expense.userid); 
                                        }}
                                        disabled={!isOnline}
                                        className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 transition-colors
                                          ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'}
                                        `}
                                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                                    >
                                        <Trash2 size={18} className={!isOnline ? 'text-slate-300' : 'text-rose-500'} /> ডিলিট
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
      </>
      )}

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
                onClick={() => {
                  setPdfPreviewUrl(null);
                  setPdfPublicUrl(null);
                }}
                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner">
                <Receipt size={48} />
              </div>
              
              <div className="flex flex-col w-full gap-3">
                {pdfPublicUrl ? (
                  <button 
                    onClick={() => window.open(pdfPublicUrl, '_blank')}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={20} /> ব্রাউজারে ওপেন করুন
                  </button>
                ) : (
                  <a 
                    href={pdfPreviewUrl} 
                    download={`expenses_${new Date().getTime()}.pdf`}
                    onClick={() => setTimeout(() => setPdfPreviewUrl(null), 500)}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Download size={20} /> ডাউনলোড করুন
                  </a>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch(pdfPreviewUrl!);
                        const blob = await response.blob();
                        const file = new File([blob], `expenses_${Date.now()}.pdf`, { type: 'application/pdf' });
                        if (navigator.share) {
                          await navigator.share({
                            files: [file],
                            title: 'Expense Report',
                            text: 'Manage-Me Expense Report'
                          });
                        } else {
                          alert('আপনার ডিভাইসে শেয়ার অপশনটি সাপোর্ট করছে না');
                        }
                      } catch (e) {
                        alert('শেয়ার করা সম্ভব হচ্ছে না');
                      }
                    }}
                    className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                  >
                    <Share2 size={18} /> শেয়ার
                  </button>

                  <button 
                    onClick={() => {
                      const urlToCopy = pdfPublicUrl || pdfPreviewUrl;
                      if (urlToCopy) {
                        navigator.clipboard.writeText(urlToCopy);
                        showToast('লিঙ্ক কপি করা হয়েছে', 'success');
                      }
                    }}
                    className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                  >
                    <Copy size={18} /> লিংক কপি
                  </button>
                </div>
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
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">তারিখ</label>
                      <DatePicker 
                        value={newExpense.date}
                        onChange={(date) => setNewExpense({...newExpense, date: date})}
                        placeholder="তারিখ"
                      />
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

const DuesManager: React.FC = () => {
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
      <div className="bg-slate-50 min-h-[500px] rounded-3xl pb-16 relative">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-t-3xl border-b border-slate-100">
          <button onClick={() => setActiveView('list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-700" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">ব্যক্তির বিবরণ</h2>
        </div>

        <div className="p-3 space-y-3">
          {/* File Card */}
          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 relative">
            <div className="flex gap-3 items-start">
              <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-indigo-500 font-bold text-lg bg-indigo-100">
                 {person.avatar ? <img src={person.avatar} alt="Avatar" className="w-full h-full object-cover" /> : person.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-slate-800">{person.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 mt-0.5 text-xs">
                  <MapPin size={12} /> {person.address || 'ঠিকানা নেই'}
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-0.5 text-xs">
                  <span className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center p-0.5"><Phone size={10} className="text-emerald-600" /></span> {person.phone}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium absolute bottom-3 right-3">{person.date}</div>
          </div>

          {/* Summary Card */}
          <div className={`p-2.5 rounded-xl flex items-center justify-between border ${balance > 0 ? 'bg-emerald-50 border-emerald-100' : balance < 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`} style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
            <div className={`flex items-center gap-2 font-bold ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {balance > 0 ? <ArrowDown size={18} /> : balance < 0 ? <ArrowUp size={18} /> : null} 
              {balance > 0 ? 'পাবো' : balance < 0 ? 'দিবো' : 'হিসাব শূন্য'}
            </div>
            <div className={`text-lg font-black ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {Math.abs(balance).toLocaleString('en-IN') || '০'}
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {person.transactions.map(t => (
              <div key={t.id} className={`p-2.5 rounded-xl flex items-center gap-2.5 border shadow-sm ${t.type === 'receive' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'receive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {t.type === 'receive' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs truncate">{t.description || (t.type === 'receive' ? 'পেলাম' : 'দিলাম')}</h4>
                  <div className="text-[9px] text-slate-400 font-medium">{t.date}</div>
                </div>
                <div className={`text-sm font-bold shrink-0 ${t.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.amount.toLocaleString('en-IN')}
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTxMenuId(activeTxMenuId === t.id ? null : t.id);
                    }}
                    className={`p-2 -mr-1 rounded-full transition-colors ${activeTxMenuId === t.id ? 'bg-slate-200 text-slate-800' : 'text-slate-300 hover:text-slate-500 active:bg-slate-100'}`}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeTxMenuId === t.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleOpenEditTransaction(t);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        <SquarePen size={18} className="text-slate-500" /> এডিট
                      </button>
                      <div className="h-px bg-slate-50 w-full"></div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setTxToDeleteId(t.id);
                          setShowTxDeleteModal(true);
                          setActiveTxMenuId(null);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 text-rose-500 hover:bg-rose-50 transition-colors"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        <Trash2 size={18} className="text-rose-500" /> ডিলিট
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAB */}
        <button 
          onClick={() => { resetTransactionForm(); setAddTransactionModalOpen(true); }}
          className="fixed lg:absolute bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition-all z-10"
        >
          <Plus size={28} />
        </button>

        {/* Add Transaction Modal */}
        {isAddTransactionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-center text-slate-800 mb-6">{isEditingTx ? 'লেনদেন আপডেট করুন' : 'লেনদেন অ্যাড করুন'}</h3>
                  
                  <div className="flex gap-4 mb-6">
                    <button 
                      type="button"
                      onClick={() => setTransactionType('receive')}
                      className={`flex-1 py-3 rounded-xl font-bold text-lg border transition-colors ${transactionType === 'receive' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-emerald-600 border-slate-200'}`}
                    >
                      পেলাম
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTransactionType('give')}
                      className={`flex-1 py-3 rounded-xl font-bold text-lg border transition-colors ${transactionType === 'give' ? 'bg-rose-50 text-rose-600 border-slate-200' : 'bg-slate-50 text-rose-500 border-slate-200'}`}
                    >
                      দিলাম
                    </button>
                  </div>

                  <form className="space-y-4" onSubmit={handleAddTransaction}>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={20} /></div>
                      <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="টাকার পরিমাণ দিন" className="w-full py-3.5 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none" required />
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FileText size={20} /></div>
                      <input type="text" value={txDescription} onChange={e => setTxDescription(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক)" className="w-full py-3.5 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none" />
                    </div>
                    <div className="relative z-10">
                      <DatePicker 
                        label="তারিখ"
                        value={txDate}
                        onChange={(date) => setTxDate(date)}
                        placeholder="তারিখ"
                      />
                    </div>

                    <button type="submit" disabled={isSubmittingTx} className="w-full flex justify-center items-center gap-2 py-3.5 mt-2 bg-blue-600 text-white font-bold text-lg rounded-xl transition-colors hover:bg-blue-700 shadow-md">
                      {isSubmittingTx ? <Loader2 size={24} className="animate-spin" /> : null}
                      {isEditingTx ? 'আপডেট করুন' : 'সেভ করুন'}
                    </button>
                    <button type="button" onClick={() => { setAddTransactionModalOpen(false); resetTransactionForm(); }} className="w-full py-3 mt-2 text-slate-500 font-bold text-sm rounded-xl transition-colors hover:bg-slate-100">
                      বাতিল করুন
                    </button>
                  </form>
                </div>
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
  
  const filteredPersons = persons.filter(p => p.name.includes(searchQuery) || p.phone.includes(searchQuery));

  const totalReceive = persons.reduce((acc, p) => acc + (getPersonBalance(p) > 0 ? getPersonBalance(p) : 0), 0);
  const totalGive = persons.reduce((acc, p) => acc + (getPersonBalance(p) < 0 ? Math.abs(getPersonBalance(p)) : 0), 0);

  return (
    <div className="space-y-3 relative min-h-[500px]">
      {/* Top Summaries */}
      <div className="grid grid-cols-3 gap-2 px-1">
         <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
            <div className="flex items-center justify-center gap-1 text-emerald-500 font-bold text-[10px] mb-0.5">
              <ArrowDown size={14} /> পাবো
            </div>
            <div className="text-lg font-black text-emerald-600">{totalReceive.toLocaleString('en-IN') || '০'}</div>
         </div>
         <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
            <div className="flex items-center justify-center gap-1 text-rose-500 font-bold text-[10px] mb-0.5">
              <ArrowUp size={14} /> দিবো
            </div>
            <div className="text-lg font-black text-rose-600">{totalGive.toLocaleString('en-IN') || '০'}</div>
         </div>
         <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
            <div className="flex items-center justify-center gap-1 text-blue-500 font-bold text-[10px] mb-0.5">
              <UserIcon size={14} /> মোট
            </div>
            <div className="text-lg font-black text-blue-600">{persons.length} জন</div>
         </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={20} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          className="w-full py-3 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all text-slate-700"
        />
      </div>

      {/* Persons List */}
      <div className="space-y-2 pb-20 mt-1">
        {filteredPersons.map(person => {
          const balance = getPersonBalance(person);
          const bgClass = balance < 0 ? 'bg-rose-50/50' : balance > 0 ? 'bg-emerald-50/50' : 'bg-slate-50/50';
          const textClass = balance < 0 ? 'text-rose-600' : balance > 0 ? 'text-emerald-600' : 'text-slate-600';
          
          return (
            <div 
              key={person.id} 
              onClick={() => { setSelectedPersonId(person.id); setActiveView('details'); }}
              className={`p-2.5 rounded-xl flex items-center gap-3 border border-slate-50 shadow-sm cursor-pointer hover:shadow-md transition-all relative ${bgClass}`}
            >
              <div className="w-11 h-11 bg-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-indigo-500 font-bold text-base bg-indigo-100">
                 {person.avatar ? <img src={person.avatar} alt="Avatar" className="w-full h-full object-cover" /> : person.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-sm font-bold text-slate-800 truncate leading-tight">{person.name}</h3>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{person.phone}</p>
              </div>
              <div className={`text-base font-black shrink-0 ${textClass}`}> 
                {Math.abs(balance).toLocaleString('en-IN') || '০'}
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPersonActiveMenuId(personActiveMenuId === person.id ? null : person.id);
                  }}
                  className={`p-2 -mr-1 rounded-full transition-colors ${personActiveMenuId === person.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600 active:bg-slate-100'}`}
                >
                  <MoreVertical size={16} />
                </button>

                {personActiveMenuId === person.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenEditPerson(person); }}
                      className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      <SquarePen size={18} className="text-slate-500" /> এডিট
                    </button>
                    <div className="h-px bg-slate-50 w-full"></div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setPersonToDeleteId(person.id);
                        setShowPersonDeleteModal(true);
                        setPersonActiveMenuId(null);
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 text-rose-500 hover:bg-rose-50 transition-colors"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      <Trash2 size={18} className="text-rose-500" /> ডিলিট
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button 
        onClick={() => { resetPersonForm(); setAddPersonModalOpen(true); }}
        className="fixed lg:absolute bottom-20 right-6 w-14 h-14 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-teal-600 active:scale-95 transition-all z-10"
      >
        <Plus size={28} />
      </button>

      {/* Delete Person Confirmation */}
      <ConfirmModal 
        isOpen={showPersonDeleteModal}
        onClose={() => setShowPersonDeleteModal(false)}
        onConfirm={handleDeletePerson}
        title="ব্যক্তি ডিলিট"
        message="আপনি কি এই ব্যক্তির সকল তথ্য ও লেনদেনের রেকর্ড মুছে ফেলতে চান?"
        isProcessing={isDeletingPerson}
      />

      {/* Add Person Modal */}
      {isAddPersonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative">
              <div className="p-6 text-center">
                
                <div className="flex justify-center mb-6 mt-4">
                  <label className="w-24 h-24 rounded-full border-2 border-blue-200 bg-blue-50 flex items-center justify-center text-blue-500 overflow-hidden cursor-pointer hover:bg-blue-100 transition-colors">
                    {newPersonAvatar ? (
                      <img src={newPersonAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus size={40} />
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

                <form className="space-y-4" onSubmit={handleAddPerson}>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon size={20} /></div>
                    <input type="text" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="নাম" className="w-full py-3.5 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none" required />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={20} /></div>
                    <input type="tel" value={newPersonPhone} onChange={e => setNewPersonPhone(e.target.value)} placeholder="ফোন নম্বর (ঐচ্ছিক)" className="w-full py-3.5 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={20} /></div>
                    <input type="text" value={newPersonAddress} onChange={e => setNewPersonAddress(e.target.value)} placeholder="ঠিকানা (ঐচ্ছিক)" className="w-full py-3.5 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl outline-none" />
                  </div>
                  <div className="relative z-10">
                    <DatePicker 
                      label="তারিখ"
                      value={newPersonDate}
                      onChange={(date) => setNewPersonDate(date)}
                      placeholder="তারিখ"
                    />
                  </div>

                  <button type="submit" disabled={isSubmittingPerson} className="w-full flex justify-center items-center gap-2 py-3.5 mt-2 bg-blue-600 text-white font-bold text-lg rounded-xl transition-colors hover:bg-blue-700 shadow-md">
                    {isSubmittingPerson ? <Loader2 size={24} className="animate-spin" /> : null}
                    {isEditingPerson ? 'আপডেট করুন' : 'সেভ করুন'}
                  </button>
                  <button type="button" onClick={() => { setAddPersonModalOpen(false); resetPersonForm(); }} className="w-full py-3 mt-2 text-slate-500 font-bold text-sm rounded-xl transition-colors hover:bg-slate-100">
                    বাতিল করুন
                  </button>
                </form>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
