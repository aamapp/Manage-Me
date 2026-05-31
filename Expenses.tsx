
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus, Search, Tag, X, ShoppingCart, Loader2, Trash2, MoreVertical, Pencil, SquarePen, Calculator, CalendarDays, Download, Filter, Music, Share2, ExternalLink, Copy, AlertCircle, Banknote, ArrowRightLeft, ArrowDown, ArrowUp, Users, MapPin, Phone, User as UserIcon, Calendar, ImagePlus, DollarSign, FileText, ArrowLeft, ArrowUpDown, TrendingUp, ListChecks, Check, Network, Shapes } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { EXPENSE_CATEGORY_LABELS, APP_NAME } from '../constants';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';
import { DuePerson, DueTransaction, BudgetLimit, BudgetTransaction, TodoTask } from '../types';

export const Expenses: React.FC = () => {
  // Use cached expenses and incomes from AppContext
  const { user, showToast, adminSelectedUserId, expenses, setExpenses, refreshData, isOnline, incomeRecords, projects } = useAppContext();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'dues' | 'budget' | 'savings' | 'reports' | 'tasks'>('expenses');

  // Floating Action Button visibility based on scroll direction (optimized with direct DOM ref to run at 60fps without React lagging)
  const fabRef = useRef<HTMLButtonElement>(null);
  const isFabVisibleRef = useRef(true);
  const lastScrollY = useRef(0);

  const setFabVisibleDirectly = (visible: boolean) => {
    if (isFabVisibleRef.current === visible) return;
    isFabVisibleRef.current = visible;
    
    const el = fabRef.current;
    if (!el) return;
    
    if (visible) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(32px) scale(0.9)';
      el.style.pointerEvents = 'none';
    }
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let lastTouchY = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diffScrollY = currentScrollY - lastScrollY.current;
      
      if (diffScrollY > 0) {
        setFabVisibleDirectly(false);
      } else if (diffScrollY < 0) {
        setFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (currentScrollY < 30) {
        setFabVisibleDirectly(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        lastTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const currentY = e.touches[0].clientY;
      const diffY = currentY - lastTouchY;
      
      // finger moved UP (scrolling DOWN) -> Hide FAB instantly
      if (diffY < 0) {
        setFabVisibleDirectly(false);
      } 
      // finger moved DOWN (scrolling UP) -> Show FAB instantly
      else if (diffY > 0) {
        setFabVisibleDirectly(true);
      }
      
      lastTouchY = currentY;
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setFabVisibleDirectly(true);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        setFabVisibleDirectly(false);
      } else if (e.deltaY < 0) {
        setFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setFabVisibleDirectly(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get('view');
    if (viewId) {
      setActiveTab('dues');
    }
  }, [location.search]);
  
  // Stats view period filter ("today", "month", "total")
  const [statsFilter, setStatsFilter] = useState<'today' | 'month' | 'total'>('month');
  // List filter ("all" | "income" | "expense")
  const [listFilter, setListFilter] = useState<'all' | 'income' | 'expense'>('all');

  // New states for Unified Modal (Income vs Expense)
  const [txModalType, setTxModalType] = useState<'expense' | 'income'>('expense');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  const [activeIncomeId, setActiveIncomeId] = useState<string | null>(null);

  // Searchable suggestions for projects (when adding income)
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectDue, setSelectedProjectDue] = useState<number>(0);
  const projectInputRef = useRef<HTMLDivElement>(null);

  // Unified Deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<{ id: string; type: 'expense' | 'income'; userid: string; title: string; amount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<'date' | 'month' | 'year' | 'custom' | ''>('');
  const [modalSubView, setModalSubView] = useState<'main' | 'date' | 'month' | 'year'>('main');
  const [tempCustomDates, setTempCustomDates] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

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

  const [newIncome, setNewIncome] = useState<any>({
    projectid: null,
    projectname: '',
    clientname: '',
    amount: 0,
    date: new Date().toLocaleDateString('en-CA'),
    method: 'বিকাশ'
  });

  const [formErrors, setFormErrors] = useState<any>({});

  // Bangla Formatter helpers
  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const formatDateToBangla = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      
      const day = dateObj.getDate();
      const monthIdx = dateObj.getMonth();
      const year = dateObj.getFullYear();
      
      const banglaMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      
      return `${toBanglaNumbers(day)} ${banglaMonths[monthIdx]}, ${toBanglaNumbers(year)}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeToBangla = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return '';
      
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      
      return `${toBanglaNumbers(hours)}:${toBanglaNumbers(minutesStr)} ${ampm}`;
    } catch {
      return '';
    }
  };

  const getCurrentBengaliMonthName = (): string => {
    const banglaMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return banglaMonths[new Date().getMonth()];
  };

  // Click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
      if (projectInputRef.current && !projectInputRef.current.contains(event.target as Node)) {
        setShowProjectSuggestions(false);
      }
      if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Unique categories for suggestions
  const uniqueCategories = Array.from(new Set(expenses.map((e: any) => e.category as string).filter(Boolean))) as string[];
  const allSuggestions: string[] = uniqueCategories;
  const filteredSuggestions = allSuggestions.filter(c => 
    (EXPENSE_CATEGORY_LABELS[c] || c).toLowerCase().includes((newExpense.category || '').toLowerCase())
  );

  const handleSelectCategory = (category: string) => {
    const label = EXPENSE_CATEGORY_LABELS[category] || category;
    setNewExpense({ ...newExpense, category: label });
    setShowCategorySuggestions(false);
    setFormErrors((prev: any) => ({ ...prev, category: null }));
  };

  // Filter projects for suggestions
  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.clientname || '').toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const handleSelectProject = (project: any) => {
    setSelectedProjectId(project.id);
    setProjectSearch(project.name);
    setNewIncome({ ...newIncome, projectid: project.id });
    setSelectedProjectDue(project.dueamount);
    setShowProjectSuggestions(false);
    setFormErrors((prev: any) => ({ ...prev, project: null }));
  };

  const handlePeriodOptionSelect = (option: 'date' | 'month' | 'year' | 'custom') => {
    setSelectedPeriodOption(option);
    
    const now = new Date();
    const yStr = now.getFullYear();
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yStr}-${mStr}-${dStr}`;

    if (option === 'date') {
      setDateRange({ start: todayStr, end: todayStr });
      setShowDateFilter(false);
    } else if (option === 'month') {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setDateRange({ start: `${yStr}-${mStr}-01`, end: `${yStr}-${mStr}-${lastDay}` });
      setShowDateFilter(false);
    } else if (option === 'year') {
      setDateRange({ start: `${yStr}-01-01`, end: `${yStr}-12-31` });
      setShowDateFilter(false);
    } else if (option === 'custom') {
      setShowDateFilter(true);
    }
    
    setShowFilterModal(false);
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast('অফলাইনে নতুন লেনদেন যোগ করা যাবে না', 'error');
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const localToday = `${y}-${m}-${d}`;
    
    setIsEditing(false);
    setActiveExpenseId(null);
    setActiveIncomeId(null);
    setTxModalType('expense'); // Default to Expense
    setProjectSearch('');
    setSelectedProjectId(null);
    setSelectedProjectDue(0);
    setFormErrors({});

    setNewExpense({ category: '', date: localToday, amount: 0, notes: '' });
    setNewIncome({ projectid: null, projectname: '', clientname: '', amount: 0, date: localToday, method: 'বিকাশ' });
    
    setModalOpen(true);
  };

  const handleOpenEditUnified = (tx: any) => {
    setIsEditing(true);
    setTxModalType(tx.type);
    setActiveMenuId(null);
    setFormErrors({});

    // Extract raw date YYYY-MM-DD from maybe full ISO string
    const rawDate = tx.date.substring(0, 10);

    if (tx.type === 'expense') {
      setActiveExpenseId(tx.id);
      setNewExpense({
        category: EXPENSE_CATEGORY_LABELS[tx.rawItem.category] || tx.rawItem.category,
        date: rawDate,
        amount: tx.amount,
        notes: tx.title
      });
    } else {
      setActiveIncomeId(tx.id);
      setSelectedProjectId(null);
      setProjectSearch('');
      
      setNewIncome({
        projectid: null,
        projectname: tx.rawItem.projectname || '',
        clientname: tx.rawItem.clientname || '',
        amount: tx.amount,
        date: rawDate,
        method: tx.rawItem.method || 'বিকাশ'
      });
    }
    setModalOpen(true);
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
    if (!user) return;

    // Custom Smart Validation
    const errors: any = {};
    if (txModalType === 'expense') {
      if (!newExpense.notes || !newExpense.notes.trim()) {
        errors.notes = 'বিবরণ দেওয়া আবশ্যক';
      }
      
      const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
      if (parsedAmount <= 0) {
        errors.amount = 'সঠিক পরিমাণ দিন (০ থেকে বেশি)';
      }
      
      if (!newExpense.category || !newExpense.category.trim()) {
        errors.category = 'ক্যাটাগরি দেওয়া আবশ্যক';
      }
    } else {
      if (!newIncome.projectname || !newIncome.projectname.trim()) {
        errors.projectname = 'প্রজেক্ট নম্বর / নাম দেওয়া আবশ্যক';
      }
      
      const parsedAmount = Number(safeEval(newIncome.amount)) || 0;
      if (parsedAmount <= 0) {
        errors.amount = 'সঠিক আয়ের পরিমাণ দিন (০ থেকে বেশি)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('দয়া করে সব প্রয়োজনীয় ফিল্ড সঠিকভাবে পূরণ করুন', 'error');
      return;
    }
    
    setIsSubmitting(true);
    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'তথ্য সংরক্ষণ করা হচ্ছে...' } }));
    
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
    
    const targetUserId = (user.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user.id;

    try {
      if (txModalType === 'expense') {
        const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
        let dateToSave = newExpense.date;
        
        if (dateToSave === localToday) {
          dateToSave = new Date(`${dateToSave}T${currentTimeNow}`).toISOString();
        } else if (dateToSave && dateToSave.length === 10) {
          dateToSave = new Date(`${dateToSave}T${currentTimeAtNoon}`).toISOString();
        }

        if (isEditing && activeExpenseId) {
          let query = supabase.from('expenses').update({
            category: newExpense.category,
            amount: parsedAmount,
            date: dateToSave,
            notes: newExpense.notes
          }).eq('id', activeExpenseId);
          
          if (user.role !== 'admin') {
            query = query.eq('userid', user.id);
          }
          const { error } = await query;
          if (error) throw error;
          showToast('খরচ আপডেট হয়েছে', 'success');
        } else {
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
      } else {
        // Saving Income (Direct / Standalone)
        const parsedAmount = Number(safeEval(newIncome.amount)) || 0;
        let dateToSave = newIncome.date;
        
        if (dateToSave === localToday) {
          dateToSave = new Date(`${dateToSave}T${currentTimeNow}`).toISOString();
        } else if (dateToSave && dateToSave.length === 10) {
          dateToSave = new Date(`${dateToSave}T${currentTimeAtNoon}`).toISOString();
        }

        if (isEditing && activeIncomeId) {
          let query = supabase.from('income_records').update({
            projectid: null,
            projectname: newIncome.projectname,
            clientname: newIncome.clientname || '',
            amount: parsedAmount,
            date: dateToSave,
            method: newIncome.method
          }).eq('id', activeIncomeId);

          if (user.role !== 'admin') {
            query = query.eq('userid', user.id);
          }
          const { error: updErr } = await query;
          if (updErr) throw updErr;

          showToast('আয় রেকর্ড আপডেট করা হয়েছে', 'success');
        } else {
          const { error: insErr } = await supabase.from('income_records').insert({
            projectid: null,
            projectname: newIncome.projectname,
            clientname: newIncome.clientname || '',
            amount: parsedAmount,
            date: dateToSave,
            method: newIncome.method,
            userid: targetUserId
          });
          if (insErr) throw insErr;

          showToast('নতুন পেমেন্ট রেকর্ড করা হয়েছে', 'success');
        }
      }
      
      setModalOpen(false);
      await refreshData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
    }
  };

  const initiateDeleteUnified = (tx: any) => {
    setTxToDelete({
      id: tx.id,
      type: tx.type,
      userid: tx.rawItem.userid,
      title: tx.title,
      amount: tx.amount
    });
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      if (txToDelete.type === 'expense') {
        const expenseObj = expenses.find(e => e.id === txToDelete.id);
        if (expenseObj) {
          const { error } = await supabase
            .from('expenses')
            .update({ notes: `[TRASH] ${expenseObj.notes || ''}`.trim() })
            .eq('id', txToDelete.id);
          if (error) throw error;
        }
        showToast('খরচটি রিসাইকেল বিনে পাঠানো হয়েছে', 'success');
      } else {
        // Delete Income
        let query = supabase.from('income_records').delete().eq('id', txToDelete.id);
        if (user?.role !== 'admin') {
          query = query.eq('userid', user?.id);
        }
        const { error } = await query;
        if (error) throw error;

        // Restore project balance
        const incomeObj = incomeRecords.find(i => i.id === txToDelete.id);
        if (incomeObj) {
          const pId = incomeObj.projectid;
          const targetProj = projects.find(p => p.id === pId);
          if (targetProj) {
            const newPaid = Math.max(0, targetProj.paidamount - txToDelete.amount);
            await supabase.from('projects').update({
              paidamount: newPaid,
              dueamount: targetProj.totalamount - newPaid
            }).eq('id', targetProj.id);
          }
        }
        showToast('পেমেন্ট রেকর্ড ডিলিট করা হয়েছে', 'success');
      }
      await refreshData();
      setShowDeleteModal(false);
    } catch(err: any) {
      showToast(err.message);
    } finally {
      setIsDeleting(false);
      setTxToDelete(null);
    }
  };

  // 1. Compute Unified Stats (Today / Current Month / Total)
  // Matching upper statistics card counts exactly
  const stats = useMemo(() => {
    const now = new Date();
    const localTodayStr = now.toLocaleDateString('en-CA');
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const targetUserId = (user?.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user?.id;

    // Filter Incomes
    const filteredIncomes = incomeRecords.filter(item => {
      if (item.userid !== targetUserId) return false;
      if (item.projectid) return false;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return false;

      if (statsFilter === 'today') {
        return d.toLocaleDateString('en-CA') === localTodayStr;
      } else if (statsFilter === 'month') {
        return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
      }
      return true;
    });

    // Filter Expenses
    const filteredExp = expenses.filter(item => {
      if (item.userid !== targetUserId) return false;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return false;

      if (statsFilter === 'today') {
        return d.toLocaleDateString('en-CA') === localTodayStr;
      } else if (statsFilter === 'month') {
        return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
      }
      return true;
    });

    const incomeSum = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const expenseSum = filteredExp.reduce((s, e) => s + e.amount, 0);

    return {
      income: incomeSum,
      expense: expenseSum,
      balance: incomeSum - expenseSum
    };
  }, [expenses, incomeRecords, statsFilter, user, adminSelectedUserId]);

  // 2. Compute Filtered Ledger Transactions (With combined Search & Range Filters)
  const unifiedTransactions = useMemo(() => {
    const combined: any[] = [];
    const targetUserId = (user?.role === 'admin' && adminSelectedUserId) ? adminSelectedUserId : user?.id;

    // Add expenses
    expenses.forEach(e => {
      if (e.userid !== targetUserId) return;
      
      const categoryLabel = EXPENSE_CATEGORY_LABELS[e.category] || e.category;
      const notesVal = e.notes || '';

      // Date Range Filter
      if (dateRange.start && e.date && e.date < dateRange.start) return;
      if (dateRange.end && e.date && e.date > dateRange.end) return;

      // Search Bar Filter
      const matchesSearch = notesVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch) return;

      combined.push({
        id: e.id,
        type: 'expense',
        title: notesVal || categoryLabel,
        category: categoryLabel,
        amount: e.amount,
        date: e.date,
        rawItem: e
      });
    });

    // Add Incomes
    incomeRecords.forEach(i => {
      if (i.userid !== targetUserId) return;
      if (i.projectid) return; // SKIP project-linked incomes!

      let titleVal = '';
      if (i.projectname && i.clientname) {
        titleVal = `${i.projectname} - ${i.clientname}`;
      } else if (i.projectname) {
        titleVal = i.projectname;
      } else if (i.clientname) {
        titleVal = i.clientname;
      } else {
        titleVal = 'আয় রেকর্ড';
      }
      
      const methodLabel = i.method || 'বিকাশ';

      // Date Range Filter
      if (dateRange.start && i.date && i.date < dateRange.start) return;
      if (dateRange.end && i.date && i.date > dateRange.end) return;

      // Search Bar Filter
      const matchesSearch = titleVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            methodLabel.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch) return;

      combined.push({
        id: i.id,
        type: 'income',
        title: titleVal,
        category: methodLabel,
        amount: i.amount,
        date: i.date,
        rawItem: i
      });
    });

    // Filtering tabs ("সব" | "আয়" | "ব্যয়")
    let filtered = combined;
    if (listFilter === 'income') {
      filtered = combined.filter(t => t.type === 'income');
    } else if (listFilter === 'expense') {
      filtered = combined.filter(t => t.type === 'expense');
    }

    // Sort descending by date
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, incomeRecords, dateRange, searchTerm, listFilter, user, adminSelectedUserId]);

  const totalExpenseFiltered = useMemo(() => {
    return unifiedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  }, [unifiedTransactions]);

  // Group by Day for the listing headers
  const groupedTransactions = useMemo(() => {
    const groups: { [d: string]: any[] } = {};
    unifiedTransactions.forEach(t => {
      const dLabel = t.date.substring(0, 10);
      if (!groups[dLabel]) groups[dLabel] = [];
      groups[dLabel].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map(dStr => {
      const list = groups[dStr];
      const incSum = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expSum = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      return {
        date: dStr,
        transactions: list,
        incomeTotal: incSum,
        expenseTotal: expSum
      };
    });
  }, [unifiedTransactions]);

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
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* 6-Icon Navigation Tabs */}
      <div className="bg-white py-0.5 px-1 text-slate-800 w-full max-w-lg mx-auto mb-1.5 select-none">
        <div className="flex items-center justify-around w-full gap-0.5">
          {/* Tab 1: Expenses / Dashboard / লেনদেন */}
          <button
            onClick={() => setActiveTab('expenses')}
            title="লেনদেন / ড্যাশবোর্ড"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'expenses'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <ArrowRightLeft size={13} />
            </div>
            {activeTab === 'expenses' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 2: Dues / লেনা-দেনা */}
          <button
            onClick={() => setActiveTab('dues')}
            title="লেনা-দেনা / দেনা-পাওনা"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'dues'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <ArrowUpDown size={13} />
            </div>
            {activeTab === 'dues' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 3: Budget / বাজেট */}
          <button
            onClick={() => setActiveTab('budget')}
            title="বাজেট"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'budget'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <Receipt size={13} />
            </div>
            {activeTab === 'budget' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 4: Savings / সঞ্চয় ও লক্ষ্য */}
          <button
            onClick={() => setActiveTab('savings')}
            title="সঞ্চয় ও লক্ষ্য"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'savings'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <Plus size={13} />
            </div>
            {activeTab === 'savings' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 5: Reports / রিপোর্ট ও চার্ট */}
          <button
            onClick={() => setActiveTab('reports')}
            title="রিপোর্ট ও চার্ট"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'reports'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <TrendingUp size={13} />
            </div>
            {activeTab === 'reports' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>

          {/* Tab 6: Tasks / টাস্ক */}
          <button
            onClick={() => setActiveTab('tasks')}
            title="টাস্ক"
            className="flex flex-col items-center flex-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                activeTab === 'tasks'
                  ? 'border-[#1a73e8] text-[#1a73e8] bg-white shadow-sm'
                  : 'border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white'
              }`}
            >
              <ListChecks size={13} />
            </div>
            {activeTab === 'tasks' ? (
              <div className="w-4 h-[2px] bg-[#1a73e8] rounded-full mt-0.5 animate-in fade-in zoom-in-95 duration-200" />
            ) : (
              <div className="w-4 h-[2px] bg-transparent rounded-full mt-0.5" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'dues' ? (
        <DuesManager />
      ) : activeTab === 'budget' ? (
        <BudgetManager expenses={expenses} user={user} />
      ) : activeTab === 'savings' ? (
        <SavingsManager />
      ) : activeTab === 'reports' ? (
        <ExpenseCategoryReports expenses={expenses} user={user} />
      ) : activeTab === 'tasks' ? (
        <TasksManager expenses={expenses} user={user} />
      ) : (
        <>
          {/* Dynamic Period Stats Card - Unifying Income and Expense */}
          <div className="bg-[#fafbfd] border border-[#e2e7ec]/80 py-3 px-4 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] w-full max-w-lg mx-auto mb-4 select-none">
            {/* Period Segment Tabs matching the image */}
            <div className="bg-[#f3f5f8] rounded-full flex items-stretch justify-between w-full mb-3 select-none overflow-hidden h-[42px] border border-[#e2e7ec]/60">
              <button
                type="button"
                onClick={() => setStatsFilter('today')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                  statsFilter === 'today'
                    ? 'bg-[#1e75eb] text-white rounded-l-full'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => setStatsFilter('month')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                  statsFilter === 'month'
                    ? 'bg-[#1e75eb] text-white'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                {getCurrentBengaliMonthName()}
              </button>
              <button
                type="button"
                onClick={() => setStatsFilter('total')}
                className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                  statsFilter === 'total'
                    ? 'bg-[#1e75eb] text-white rounded-r-full'
                    : 'text-[#111827] hover:text-black bg-transparent'
                }`}
              >
                মোট
              </button>
            </div>

            {/* Income, Expense, Net Counts */}
            <div className="grid grid-cols-3 gap-2 text-center">
               <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#50AD54] mb-0.5">আয়</p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#50AD54] truncate">
                  ৳ {toBanglaNumbers(stats.income.toLocaleString('bn-BD'))}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#db4437] mb-0.5">ব্যয়</p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#db4437] truncate">
                  ৳ {toBanglaNumbers(stats.expense.toLocaleString('bn-BD'))}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[12px] font-medium text-[#1a73e8] mb-0.5">ব্যালেন্স</p>
                <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#1a73e8] truncate">
                  ৳ {toBanglaNumbers(stats.balance.toLocaleString('bn-BD'))}
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Filter Panel */}
          {showDateFilter && (
            <div className="bg-white border border-slate-100 p-3 rounded-[10px] shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                   <Filter size={14} className="text-rose-500" /> তারিখ ফিল্টার
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

          {/* Search Inputs & Category Option Filters (Combining both) */}
          <div className="space-y-2.5 w-full max-w-lg mx-auto">
            {searchTerm && (
              <div className="bg-white px-4 py-3 rounded-[10px] border border-slate-200/80 shadow-xs flex items-center gap-2">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="বিবরণ বা ক্যাটাগরি দিয়ে খুঁজুন..." 
                  className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* Gray filter bar stretching across exactly like the image */}
            <div className="bg-[#f0f3f6] rounded-[8px] p-[3px] flex items-center justify-between w-full select-none border border-slate-100">
              {/* Left filter segment items */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                    listFilter === 'all'
                      ? 'bg-[#e2edfc] text-[#1a73e8]'
                      : 'text-[#8e9aa8] hover:text-slate-700'
                  }`}
                >
                  সব
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('income')}
                  className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                    listFilter === 'income'
                      ? 'bg-[#e2fced] text-[#50AD54]'
                      : 'text-[#8e9aa8] hover:text-slate-700'
                  }`}
                >
                  আয়
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('expense')}
                  className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                    listFilter === 'expense'
                      ? 'bg-[#fcedeb] text-[#db4437]'
                      : 'text-[#8e9aa8] hover:text-slate-700'
                  }`}
                >
                  ব্যয়
                </button>
              </div>

              {/* Right icon buttons matching the screenshot (CalendarSearch, Shapes, MoreVertical) */}
              <div className="flex items-center gap-4 px-3">
                <button 
                  onClick={() => {
                    // Reset date filter if already active
                    if (dateRange.start || dateRange.end || showDateFilter) {
                      setDateRange({ start: '', end: '' });
                      setShowDateFilter(false);
                      setSelectedPeriodOption('');
                      return;
                    }

                    setModalSubView('main');
                    setTempCustomDates({
                      start: dateRange.start || new Date().toISOString().split('T')[0],
                      end: dateRange.end || new Date().toISOString().split('T')[0]
                    });
                    
                    // Determine which period option is currently active based on real dateRange
                    if (!dateRange.start && !dateRange.end) {
                      setSelectedPeriodOption('');
                    } else {
                      const start = dateRange.start;
                      const end = dateRange.end;
                      if (start && end) {
                        const startParts = start.split('-');
                        const endParts = end.split('-');
                        if (startParts[1] === '01' && startParts[2] === '01' && endParts[1] === '12' && endParts[2] === '31') {
                          setSelectedPeriodOption('year');
                        } else if (startParts[2] === '01') {
                          const y = parseInt(startParts[0]);
                          const m = parseInt(startParts[1]);
                          const lastDay = new Date(y, m, 0).getDate();
                          if (parseInt(endParts[2]) === lastDay && startParts[1] === endParts[1] && startParts[0] === endParts[0]) {
                            setSelectedPeriodOption('month');
                          } else {
                            setSelectedPeriodOption('custom');
                          }
                        } else {
                          setSelectedPeriodOption('custom');
                        }
                      } else {
                        setSelectedPeriodOption('custom');
                      }
                    }
                    
                    setShowFilterModal(true);
                  }}
                  className={`transition-colors shrink-0 ${showDateFilter || dateRange.start || dateRange.end ? 'text-[#1a73e8]' : 'text-[#8e9aa8] md:hover:text-slate-700'}`}
                  title="তারিখ ফিল্টার"
                >
                  <CalendarDays size={19} />
                </button>
                
                <button 
                  onClick={() => {
                    const searchBox = prompt("খুঁজতে টাইপ করুন:");
                    if (searchBox !== null) setSearchTerm(searchBox);
                  }}
                  className={`transition-colors shrink-0 ${searchTerm ? 'text-[#1a73e8]' : 'text-[#8e9aa8] md:hover:text-slate-700'}`}
                  title="অনুসন্ধান"
                >
                  <Shapes size={19} />
                </button>

                <button 
                  onClick={handleDownloadPDF}
                  className="text-[#8e9aa8] md:hover:text-slate-700 transition-[#1a73e8] transition-colors shrink-0 active:scale-95"
                  title="মেনু / ডাউনলোড"
                >
                  <MoreVertical size={19} />
                </button>
              </div>
            </div>
          </div>

          {/* Report Capture Container (supports PDF generation) */}
          <div id="pdf-container" ref={listRef} className={`${isGeneratingPDF ? 'block bg-white p-4' : 'space-y-4 bg-transparent'} w-full max-w-lg mx-auto`}>
            {isGeneratingPDF && (
              <div id="pdf-header" className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 mb-1">{APP_NAME}</h1>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Professional Transact Ledger</p>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold text-slate-800">লেনদেন রিপোর্ট</h2>
                  <p className="text-[10px] text-slate-500">তৈরি হয়েছে: {new Date().toLocaleDateString('bn-BD')}</p>
                </div>
              </div>
            )}

            {isGeneratingPDF && (
              <div id="pdf-stats" className="mb-6 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">মোট আয়</p>
                  <p className="text-lg font-black text-emerald-600">{user?.currency || '৳'} {stats.income.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">মোট ব্যয়</p>
                  <p className="text-lg font-black text-rose-500">{user?.currency || '৳'} {stats.expense.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">ব্যালেন্স</p>
                  <p className="text-lg font-black text-blue-600">{user?.currency || '৳'} {stats.balance.toLocaleString('bn-BD')}</p>
                </div>
              </div>
            )}

            {/* Combined Grouped Transaction Ledger View */}
            <div id="expenses-list-container" className="space-y-4">
              {groupedTransactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                  <Receipt size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-semibold">কোনো লেনদেন পাওয়া যায়নি</p>
                </div>
              ) : (
                groupedTransactions.map((group) => (
                  <div key={group.date} className="space-y-2.5 animate-in fade-in duration-200">
                    
                    {/* Day Date Indicator Header */}
                    <div className={`flex items-center justify-between py-2 ${isGeneratingPDF ? 'bg-white' : 'bg-transparent'} select-none`}>
                      <span className="text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                        {formatDateToBangla(group.date)}
                      </span>
                      {/* Solid indicator line spanning from date to total indicator block */}
                      <div className="flex-1 mx-3 border-b border-solid border-slate-200/60"></div>
                      <div className="flex items-center gap-3 text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                        <span>মোট</span>
                        <span className="text-[#50AD54] font-medium text-[12px] sm:text-[13px]">
                           {toBanglaNumbers(group.incomeTotal)}
                        </span>
                        <span className="text-[#db4437] font-medium text-[12px] sm:text-[13px]">
                           {toBanglaNumbers(group.expenseTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Day Ledger Items Container */}
                    <div className="space-y-2.5">
                       {group.transactions.map((tx) => {
                         const isIncome = tx.type === 'income';
                         return (
                           <div 
                             key={tx.id} 
                             className={`group relative rounded-[12px] px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.015)] border ${
                               isIncome 
                                 ? 'bg-[#f2f7f3] border-[#d1f2d9]/15' 
                                 : 'bg-[#fff5f5] border-[#fbdbda]/15'
                             }`}
                           >
                             {/* Left side: Title and circular badge with Time detail */}
                             <div className="flex flex-col min-w-0 justify-center">
                               <h3 className="font-normal text-slate-800 text-[14.5px] sm:text-[15px] leading-snug truncate">
                                 {tx.title}
                               </h3>
                               <div className="flex items-center gap-1.5 mt-1 select-none">
                                 <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0 ${
                                   isIncome
                                     ? 'bg-[#e6f4ea] text-[#50AD54]'
                                     : 'bg-[#fce8e6] text-[#db4437]'
                                 }`}>
                                   {isIncome ? '+' : '-'}
                                 </span>
                                 <span className="text-[10.5px] sm:text-[11px] font-medium text-slate-400">
                                   {formatTimeToBangla(tx.rawItem.date)}
                                 </span>
                               </div>
                             </div>

                             {/* Right side: Amount and Menu vertically centered */}
                             <div className="flex items-center gap-2.5 shrink-0 my-auto">
                               <span className={`font-medium text-[15px] sm:text-[16px] whitespace-nowrap ${
                                 isIncome ? 'text-[#50AD54]' : 'text-[#db4437]'
                               }`}>
                                 {toBanglaNumbers(tx.amount.toLocaleString('bn-BD'))}
                               </span>

                               {!isGeneratingPDF && (
                                 <div className="relative action-menu-container shrink-0">
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setActiveMenuId(activeMenuId === tx.id ? null : tx.id);
                                     }}
                                     className={`p-1 rounded-lg transition-colors ${activeMenuId === tx.id ? 'bg-slate-100/60 text-slate-800' : 'text-slate-300 hover:text-slate-600'}`}
                                   >
                                     <MoreVertical size={16} />
                                   </button>

                                   {activeMenuId === tx.id && (
                                     <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                       <button 
                                         onClick={(e) => { 
                                           e.stopPropagation(); 
                                           if (!isOnline) {
                                             showToast('অফলাইনে রেকর্ড করা যাবে না', 'error');
                                             return;
                                           }
                                           handleOpenEditUnified(tx); 
                                         }}
                                         disabled={!isOnline}
                                         className="w-full px-3 py-2.5 text-left text-xs font-bold flex items-center gap-2 border-b border-slate-50/50 hover:bg-slate-50 text-slate-700"
                                       >
                                         <Pencil size={13} className="text-slate-500" /> এডিট
                                       </button>
                                       <button 
                                         onClick={(e) => { 
                                           e.stopPropagation(); 
                                           if (!isOnline) {
                                             showToast('অফলাইনে রেকর্ড ডিলিট করা যাবে না', 'error');
                                             return;
                                           }
                                           initiateDeleteUnified(tx); 
                                         }}
                                         disabled={!isOnline}
                                         className="w-full px-3 py-2.5 text-left text-xs font-bold flex items-center gap-2 hover:bg-rose-50/50 text-rose-500"
                                       >
                                         <Trash2 size={13} className="text-rose-500" /> ডিলিট
                                       </button>
                                     </div>
                                   )}
                                 </div>
                                )}
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sticky Floating Action Button on Bottom Right */}
          {!isGeneratingPDF && (
            <button 
              ref={fabRef}
              onClick={handleOpenAddModal}
              className="fixed bottom-[76px] lg:bottom-8 right-5 lg:right-8 bg-[#1a73e8] hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-all duration-[150ms] ease-out z-40 pointer-events-auto opacity-100 scale-100 translate-y-0"
              style={{
                willChange: 'transform, opacity',
              }}
              title="নতুন লেনদেন"
            >
              <Plus size={28} />
            </button>
          )}
        </>
      )}

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={txToDelete?.type === 'expense' ? 'খরচ ডিলিট' : 'পেমেন্ট ডিলিট'}
        message={
          txToDelete?.type === 'expense' 
            ? `আপনি কি"${txToDelete?.title}" খরচের রেকর্ডটি মুছে ফেলতে চান? এটি রিসাইকেল বিনে স্থানান্তরিত হবে।` 
            : `আপনি কি "${txToDelete?.title}" পেমেন্টের রেকর্ডটি মুছে ফেলতে চান? এটি সংশ্লিষ্ট প্রজেক্ট ব্যালেন্স পুনর্নির্মাণ করবে।`
        }
        isProcessing={isDeleting}
      />

      {/* Date Filter Selection Modal */}
      {showFilterModal && (
        <div 
          onClick={() => {
            setIsStartDatePickerOpen(false);
            setIsEndDatePickerOpen(false);
            setShowFilterModal(false);
          }}
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-[2px] overflow-y-auto flex items-start sm:items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] w-full max-w-[305px] p-5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 select-none border border-slate-100 my-auto"
          >
            {/* Conditional Rendering based on active subView */}
            {modalSubView === 'main' && (
              <div className="w-full animate-in fade-in duration-150">
                {/* Modal Title matching Bangladesh "নির্বাচন করুন" */}
                <h3 className="text-[20px] font-black text-slate-800 mb-5 text-center tracking-tight">
                  নির্বাচন করুন
                </h3>

                {/* Vertical Stack of Styled Buttons following design/color in screenshot */}
                <div className="w-full space-y-3">
                  <button
                    type="button"
                    onClick={() => setModalSubView('date')}
                    className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                      selectedPeriodOption === 'custom'
                        ? 'bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/20'
                        : 'bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]'
                    }`}
                  >
                    তারিখ অনুযায়ী
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSubView('month')}
                    className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                      selectedPeriodOption === 'month'
                        ? 'bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/20'
                        : 'bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]'
                    }`}
                  >
                    মাস অনুযায়ী
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSubView('year')}
                    className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                      selectedPeriodOption === 'year'
                        ? 'bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/15'
                        : 'bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]'
                    }`}
                  >
                    বছর অনুযায়ী
                  </button>
                </div>
              </div>
            )}

            {modalSubView === 'date' && (
              <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                {/* Back button + Header */}
                <div className="flex items-center gap-3 mb-5 w-full">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                      setModalSubView('main');
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="text-[17px] font-bold text-slate-800">তারিখ নির্বাচন করুন</span>
                </div>

                {/* Form inputs */}
                <div className={`w-full space-y-4 transition-all duration-300 ${(isStartDatePickerOpen || isEndDatePickerOpen) ? 'pb-[260px]' : ''}`}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">শুরুর তারিখ</label>
                    <DatePicker 
                      value={tempCustomDates.start} 
                      onChange={(date) => setTempCustomDates({ ...tempCustomDates, start: date })}
                      placeholder="শুরুর তারিখ"
                      onOpenChange={(open) => setIsStartDatePickerOpen(open)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500">শেষের তারিখ</label>
                    <DatePicker 
                      value={tempCustomDates.end} 
                      onChange={(date) => setTempCustomDates({ ...tempCustomDates, end: date })}
                      placeholder="শেষের তারিখ"
                      align="right"
                      onOpenChange={(open) => setIsEndDatePickerOpen(open)}
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange({ start: tempCustomDates.start, end: tempCustomDates.end });
                      setSelectedPeriodOption('custom');
                      setShowDateFilter(true);
                      setShowFilterModal(false);
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                    }}
                    className="w-full h-[52px] mt-4 bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white rounded-2xl font-bold hover:opacity-95 text-[16px] transition-all shadow-lg shadow-blue-500/15"
                  >
                    নিশ্চিত করুন
                  </button>
                </div>
              </div>
            )}

            {modalSubView === 'month' && (
              <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                {/* Back button + Header */}
                <div className="flex items-center gap-3 mb-5 w-full">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                      setModalSubView('main');
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="text-[17px] font-bold text-slate-800">চলতি বছরের মাসসমূহ</span>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-3 gap-2 w-full max-h-[350px] overflow-y-auto pr-0.5">
                  {[
                    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
                  ].map((mName, idx) => {
                    const currentYearValue = new Date().getFullYear();
                    const mNumStr = String(idx + 1).padStart(2, '0');
                    const lastDayOfM = new Date(currentYearValue, idx + 1, 0).getDate();
                    const startVal = `${currentYearValue}-${mNumStr}-01`;
                    const endVal = `${currentYearValue}-${mNumStr}-${lastDayOfM}`;
                    const isActiveM = dateRange.start === startVal && dateRange.end === endVal;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDateRange({ start: startVal, end: endVal });
                          setSelectedPeriodOption('month');
                          setShowDateFilter(false);
                          setShowFilterModal(false);
                        }}
                        className={`py-3 rounded-xl text-[13px] font-bold transition-all duration-150 active:scale-95 text-center ${
                          isActiveM 
                            ? 'bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-md shadow-blue-500/15'
                            : 'bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {modalSubView === 'year' && (
              <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                {/* Back button + Header */}
                <div className="flex items-center gap-3 mb-5 w-full">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                      setModalSubView('main');
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="text-[17px] font-bold text-slate-800">সাল নির্বাচন করুন</span>
                </div>

                {/* Years Stack */}
                <div className="flex flex-col gap-2.5 w-full max-h-[350px] overflow-y-auto pr-0.5">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((yearValue) => {
                    const startVal = `${yearValue}-01-01`;
                    const endVal = `${yearValue}-12-31`;
                    const isActiveY = dateRange.start === startVal && dateRange.end === endVal;

                    return (
                      <button
                        key={yearValue}
                        type="button"
                        onClick={() => {
                          setDateRange({ start: startVal, end: endVal });
                          setSelectedPeriodOption('year');
                          setShowDateFilter(false);
                          setShowFilterModal(false);
                        }}
                        className={`w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-150 active:scale-95 text-center ${
                          isActiveY 
                            ? 'bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-md shadow-blue-500/15'
                            : 'bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]'
                        }`}
                      >
                        {toBanglaNumbers(yearValue)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                {isEditing 
                  ? (txModalType === 'expense' ? 'খরচ এডিট' : 'পেমেন্ট এডিট') 
                  : (txModalType === 'expense' ? 'নতুন খরচ' : 'নতুন পেমেন্ট')}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="px-4 pt-3 pb-24 space-y-4">
                  
                  {/* Transaction Type Slider Segment (ONLY visible on Adding) */}
                  {!isEditing && (
                    <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setTxModalType('expense');
                          setFormErrors({});
                        }}
                        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                          txModalType === 'expense'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        ব্যয়
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTxModalType('income');
                          setFormErrors({});
                        }}
                        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                          txModalType === 'income'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        আয়
                      </button>
                    </div>
                  )}

                  {txModalType === 'expense' ? (
                    /* Expense Specific Fields */
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">বিবরণ</label>
                        <input 
                          type="text" 
                          value={newExpense.notes} 
                          onChange={e => {
                            setNewExpense({...newExpense, notes: e.target.value});
                            if (formErrors.notes) setFormErrors({...formErrors, notes: null});
                          }} 
                          className={`w-full px-3 py-3 bg-slate-50 border rounded-xl font-bold text-slate-800 outline-none text-sm transition-all focus:ring-2 ${
                            formErrors.notes 
                              ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' 
                              : 'border-slate-200 focus:ring-rose-500 focus:border-rose-500'
                          }`} 
                          placeholder="কিসের জন্য খরচ?" 
                        />
                        {formErrors.notes && (
                          <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle size={14} className="shrink-0" /> {formErrors.notes}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                            পরিমাণ ({user?.currency})
                        </label>
                        <div 
                          onClick={() => {
                            setShowKeypad(true);
                            if (formErrors.amount) setFormErrors({...formErrors, amount: null});
                          }}
                          className={`keypad-trigger w-full px-3 py-3 bg-slate-50 border rounded-xl font-black text-xl transition-all flex items-center justify-between cursor-pointer ${
                            formErrors.amount 
                              ? 'border-rose-500 text-rose-600 bg-rose-50/20' 
                              : 'border-slate-200 text-rose-600 active:bg-slate-100'
                          }`}
                        >
                           <span>{newExpense.amount || 0}</span>
                           <Calculator size={18} className="text-slate-500" />
                        </div>
                        {formErrors.amount && (
                          <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle size={14} className="shrink-0" /> {formErrors.amount}
                          </p>
                        )}
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
                            onFocus={() => {
                              setShowCategorySuggestions(true);
                              if (formErrors.category) setFormErrors({...formErrors, category: null});
                            }}
                            onChange={e => {
                              setNewExpense({...newExpense, category: e.target.value});
                              setShowCategorySuggestions(true);
                              if (formErrors.category) setFormErrors({...formErrors, category: null});
                            }}
                            className={`w-full px-3 py-3 bg-white border rounded-xl font-bold text-sm text-slate-800 outline-none transition-all focus:ring-2 ${
                              formErrors.category 
                                ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' 
                                : 'border-slate-200 focus:ring-rose-500 focus:border-rose-500'
                            }`}
                            placeholder="ক্যাটাগরি..."
                          />
                          {formErrors.category && (
                            <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              <AlertCircle size={14} className="shrink-0" /> {formErrors.category}
                            </p>
                          )}
                          
                          {showCategorySuggestions && (newExpense.category || filteredSuggestions.length > 0) && (
                            <div className="absolute top-full right-0 left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                              {filteredSuggestions.map((cat, idx) => (
                                <div key={idx} onClick={() => handleSelectCategory(cat)} className="px-4 py-3 border-b border-slate-50 hover:bg-rose-50 font-medium text-xs cursor-pointer transition-colors text-slate-700">
                                  {EXPENSE_CATEGORY_LABELS[cat] || cat}
                                </div>
                              ))}
                              {!filteredSuggestions.some(c => (EXPENSE_CATEGORY_LABELS[c] || c).toLowerCase() === (newExpense.category || '').toLowerCase()) && newExpense.category && (
                                <div className="px-4 py-2 bg-rose-50 text-rose-700 text-[10px] font-bold border-t">
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
                    </>
                  ) : (
                    /* Income Specific Fields */
                    <>
                      {/* Project Number / Name Text Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">প্রজেক্ট নম্বর / নাম</label>
                        <input 
                          type="text"
                          value={newIncome.projectname || ''}
                          onChange={e => {
                            setNewIncome({...newIncome, projectname: e.target.value});
                            if (formErrors.projectname) setFormErrors({...formErrors, projectname: null});
                          }}
                          className={`w-full px-3 py-3 bg-white border rounded-xl font-bold text-sm text-slate-800 outline-none transition-all focus:ring-2 ${
                            formErrors.projectname 
                              ? 'border-rose-500 focus:ring-rose-200 bg-rose-50/20' 
                              : 'border-slate-200 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                          placeholder="প্রজেক্ট নম্বর বা নাম লিখুন..."
                        />
                        {formErrors.projectname && (
                          <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle size={14} className="shrink-0" /> {formErrors.projectname}
                          </p>
                        )}
                      </div>

                      {/* Optional Title / Description Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">অপশনাল টাইটেল / বিবরণ</label>
                        <input 
                          type="text"
                          value={newIncome.clientname || ''}
                          onChange={e => setNewIncome({...newIncome, clientname: e.target.value})}
                          className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none transition-all focus:ring-2 focus:ring-emerald-500"
                          placeholder="আয়ের অপশনাল টাইটেল বা বিবরণ..."
                        />
                      </div>

                      {/* Payment Method Select Buttons */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">পেমেন্ট মেথড</label>
                        <div className="grid grid-cols-5 gap-1.5 select-none">
                          {['বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক', 'ক্যাশ'].map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setNewIncome({ ...newIncome, method })}
                              className={`py-2 text-center text-xs font-bold rounded-xl transition-all border ${
                                newIncome.method === method
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Transaction Amount Picker */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                            সংগৃহীত পরিমাণ ({user?.currency})
                        </label>
                        <div 
                          onClick={() => {
                            setShowKeypad(true);
                            if (formErrors.amount) setFormErrors({...formErrors, amount: null});
                          }}
                          className={`keypad-trigger w-full px-3 py-3 bg-slate-50 border rounded-xl font-black text-xl transition-all flex items-center justify-between cursor-pointer ${
                            formErrors.amount 
                              ? 'border-rose-500 text-emerald-600 bg-rose-50/20' 
                              : 'border-slate-200 text-emerald-600 active:bg-slate-100'
                          }`}
                        >
                           <span>{newIncome.amount || 0}</span>
                           <Calculator size={18} className="text-slate-500" />
                        </div>
                        {formErrors.amount && (
                          <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                            <AlertCircle size={14} className="shrink-0" /> {formErrors.amount}
                          </p>
                        )}
                      </div>

                      {/* Date Picker */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">তারিখ</label>
                        <DatePicker 
                          value={newIncome.date}
                          onChange={(date) => setNewIncome({...newIncome, date: date})}
                          placeholder="সংগ্রহের তারিখ"
                        />
                      </div>

                      <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Receipt />}
                        আয় সেভ করুন
                      </button>
                    </>
                  )}
                </form>
            </div>
            
            <NumericKeypad 
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={(val) => {
                if (txModalType === 'expense') {
                  setNewExpense({...newExpense, amount: val});
                } else {
                  setNewIncome({...newIncome, amount: val});
                }
              }}
              initialValue={txModalType === 'expense' ? newExpense.amount : newIncome.amount}
              title={txModalType === 'expense' ? "খরচের পরিমাণ" : "আয়ের পরিমাণ"}
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

// ==========================================
// 3. SAVINGS & GOALS TRACKER VIEW
// ==========================================

interface SavingsGoal {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  notes?: string;
  createdAt: string;
  history: { id: string; amount: number; type: 'deposit' | 'withdraw'; date: string; notes?: string }[];
}

const SavingsManager: React.FC = () => {
  const { user, showToast } = useAppContext();
  const userId = user?.id || 'default';
  
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const cached = localStorage.getItem(`savings_goals_${userId}`);
    return cached ? JSON.parse(cached) : [
      {
        id: 'default-1',
        title: 'ভবিষ্যত সঞ্চয়',
        category: 'জরুরি তহবিল',
        targetAmount: 50000,
        currentAmount: 15000,
        deadline: '2026-12-31',
        notes: 'জরুরি যেকোনো প্রয়োজনের জন্য ফান্ড',
        createdAt: '2026-05-01',
        history: [
          { id: 'h-1', amount: 10000, type: 'deposit', date: '2026-05-01', notes: 'প্রাথমিক সঞ্চয়' },
          { id: 'h-2', amount: 5000, type: 'deposit', date: '2026-05-15', notes: 'মে মাসের কিস্তি' }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`savings_goals_${userId}`, JSON.stringify(goals));
  }, [goals, userId]);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  
  // New Goal Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Tx Fields
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      title,
      category: category || 'অন্যান্য',
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      deadline,
      notes,
      createdAt: new Date().toISOString().split('T')[0],
      history: currentAmount && Number(currentAmount) > 0 ? [
        {
          id: crypto.randomUUID(),
          amount: Number(currentAmount),
          type: 'deposit',
          date: new Date().toISOString().split('T')[0],
          notes: 'প্রাথমিক সঞ্চয়'
        }
      ] : []
    };

    setGoals([newGoal, ...goals]);
    showToast('নতুন সঞ্চয় লক্ষ্য তৈরি হয়েছে!', 'success');
    resetForm();
    setAddModalOpen(false);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleSavingsTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !txAmount) return;

    const amountNum = Number(txAmount);
    let updatedCurrent = selectedGoal.currentAmount;

    if (txType === 'deposit') {
      updatedCurrent += amountNum;
    } else {
      if (amountNum > selectedGoal.currentAmount) {
        showToast('সঞ্চয়ের চেয়ে বেশি টাকা তোলা যাবে না!', 'error');
        return;
      }
      updatedCurrent -= amountNum;
    }

    const newTx = {
      id: crypto.randomUUID(),
      amount: amountNum,
      type: txType,
      date: new Date().toISOString().split('T')[0],
      notes: txNotes
    };

    const updated = goals.map(g => {
      if (g.id === selectedGoal.id) {
        return {
          ...g,
          currentAmount: updatedCurrent,
          history: [newTx, ...g.history]
        };
      }
      return g;
    });

    setGoals(updated);
    showToast(txType === 'deposit' ? 'টাকা সফলভাবে জমা হয়েছে' : 'টাকা সফলভাবে তোলা হয়েছে', 'success');
    setTxAmount('');
    setTxNotes('');
    setTxModalOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const handleConfirmDeleteGoal = () => {
    if (goalToDelete) {
      setGoals(goals.filter(g => g.id !== goalToDelete));
      showToast('সঞ্চয় লক্ষ্য মুছে ফেলা হয়েছে', 'success');
      setGoalToDelete(null);
    }
  };

  const currency = user?.currency || '৳';

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">সঞ্চয় ও লক্ষ্য</h2>
          <p className="text-xs text-slate-500 font-medium">আপনার ভবিষ্যতের জন্য সুনির্দিষ্ট সঞ্চয় পরিকল্পনা গড়ে তুলুন</p>
        </div>
        <button
          onClick={() => { resetForm(); setAddModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Plus size={16} /> লক্ষ্য যোগ করুন
        </button>
      </div>

      {/* Grid of Goals */}
      {goals.length === 0 ? (
        <div className="bg-white border border-slate-100 p-10 rounded-2xl text-center text-slate-400">
          <p className="text-sm font-medium">কোনো সঞ্চয় লক্ষ্য তৈরি করা হয়নি এখনও।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 relative overflow-hidden text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-1.5">{goal.title}</h3>
                    {goal.notes && <p className="text-xs text-slate-400 font-medium mt-0.5">{goal.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 bg-rose-50 text-rose-500 rounded-lg shrink-0 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500 font-medium">অগ্রগতি</span>
                    <span className="text-indigo-600 font-black">{percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Amount details */}
                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">বর্তমান সঞ্চয়</span>
                    <span className="text-sm font-black text-emerald-600 mt-0.5 block">{currency} {goal.currentAmount.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">টার্গেট লক্ষ্য</span>
                    <span className="text-sm font-black text-slate-700 mt-0.5 block">{currency} {goal.targetAmount.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* Action Controls & Date */}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-black">টার্গেট ডেট: {goal.deadline}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setTxType('deposit');
                        setTxModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                    >
                      টাকা জমা
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setTxType('withdraw');
                        setTxModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-black hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
                    >
                      উত্তোলন
                    </button>
                  </div>
                </div>

                {/* History list preview */}
                {goal.history && goal.history.length > 0 && (
                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">শেষ লেনদেন সমূহ</span>
                    <div className="divide-y divide-slate-50 max-h-24 overflow-y-auto pr-1">
                      {goal.history.slice(0, 3).map(h => (
                        <div key={h.id} className="flex justify-between py-1 text-[10px]">
                          <span className={`font-medium ${h.type === 'deposit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {h.type === 'deposit' ? 'মেলালেন +' : 'তুললেন -'} {currency}{h.amount} <span className="text-slate-400">({h.notes || 'কোনো নোট নেই'})</span>
                          </span>
                          <span className="text-slate-400 font-medium">{h.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative text-left">
            <h3 className="text-base font-bold text-slate-800 text-center mb-4">নতুন সঞ্চয় লক্ষ্য তৈরি</h3>
            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">লক্ষে্যর নাম</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="যেমন: নতুন ল্যাপটপ কেনা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">খাত / ক্যাটাগরি</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="যেমন: ডিভাইস" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">লক্ষ্য তারিখ</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">টার্গেট পরিমাণ</label>
                  <input required type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="টার্গেট টাকা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">প্রাথমিক জমা</label>
                  <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder="প্রাথমিক টাকা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">বিবরণ (ঐচ্ছিক)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="সংক্ষিপ্ত বর্ণনা..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs h-20 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">বাতিল</button>
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm animate-pulse-once">তৈরি করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Deposit/Withdrawal Modal */}
      {isTxModalOpen && selectedGoal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative text-left">
            <h3 className="text-base font-bold text-slate-800 text-center mb-2">
              {txType === 'deposit' ? 'সঞ্চয় জমা করুন' : 'সঞ্চয় উত্তোলন করুন'}
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4">লক্ষ্য: {selectedGoal.title}</p>
            <form onSubmit={handleSavingsTransaction} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">টাকার পরিমাণ</label>
                <input required type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="টাকা টাইপ করুন" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-800 text-base" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">নোট বা মন্তব্য</label>
                <input type="text" value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="যেমন: মে মাসের বোনাস" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setTxAmount(''); setTxNotes(''); setTxModalOpen(false); }} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">বাতিল</button>
                <button type="submit" className={`flex-1 py-3 text-white font-bold text-xs rounded-xl transition-colors shadow-sm ${txType === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                  {txType === 'deposit' ? 'জমা করুন' : 'উত্তোলন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {goalToDelete && (
        <ConfirmModal
          isOpen={!!goalToDelete}
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleConfirmDeleteGoal}
          title="লক্ষ্য ডিলিট"
          message="আপনি কি এই সঞ্চয় লক্ষ্যটি মুছে ফেলতে চান?"
        />
      )}
    </div>
  );
};

// ==========================================
// 4. REPORTS & ANALYSIS VIEW (CATEGORY-WISE)
// ==========================================

const ExpenseCategoryReports: React.FC<{ expenses: any[]; user: any }> = ({ expenses, user }) => {
  const [reportRange, setReportRange] = useState<'weekly' | 'monthly' | 'all'>('monthly');
  const currency = user?.currency || '৳';

  const finalExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const expenseDate = new Date(e.date);
      if (reportRange === 'weekly') {
        const diff = now.getTime() - expenseDate.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (reportRange === 'monthly') {
        const diff = now.getTime() - expenseDate.getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [expenses, reportRange]);

  const categoryTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    finalExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    
    const sorted = Object.entries(totals).map(([category, amount]) => {
      return {
        name: EXPENSE_CATEGORY_LABELS[category] || category,
        amount,
      };
    }).sort((a, b) => b.amount - a.amount);

    const totalCost = sorted.reduce((sum, item) => sum + item.amount, 0);

    return sorted.map(item => ({
      ...item,
      percentage: totalCost > 0 ? Math.round((item.amount / totalCost) * 100) : 0,
    }));
  }, [finalExpenses]);

  const totalFilteredExpense = useMemo(() => {
    return categoryTotals.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryTotals]);

  const COLORS = ['#4f46e5', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between text-left">
        <div>
          <h2 className="text-lg font-bold text-slate-800">খরচের ক্যাটাগরিভিত্তিক রিপোর্ট</h2>
          <p className="text-xs text-slate-500 font-medium">আপনার কোন খাতগুলোতে সবচেয়ে বেশি খরচ হচ্ছে তার বিশ্লেষণ</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start md:self-auto select-none mt-1">
          <button
            onClick={() => setReportRange('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            সাপ্তাহিক
          </button>
          <button
            onClick={() => setReportRange('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            মাসিক
          </button>
          <button
            onClick={() => setReportRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            সকল সময়
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm text-center">
        <span className="text-xs text-indigo-700 font-bold tracking-wider block uppercase">
          {reportRange === 'weekly' ? 'গত ৭ দিনের মোট খরচ' : reportRange === 'monthly' ? 'গত ৩০ দিনের মোট খরচ' : 'সর্বমোট ব্যয়িত অর্থ'}
        </span>
        <h3 className="text-3xl font-black text-indigo-900 mt-1 font-mono">
          {currency} {totalFilteredExpense.toLocaleString('bn-BD')}
        </h3>
        <span className="text-[10px] text-indigo-600 font-medium mt-1 inline-block bg-white/60 px-2 py-0.5 rounded-full">
          মোট খরচের ক্যাটাগরি রেকর্ড: {categoryTotals.length} টি
        </span>
      </div>

      {categoryTotals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-slate-100 text-slate-400 font-medium">
          কোনো খরচের হদিস পাওয়া যায়নি এই সময়কালে।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span> ক্যাটাগরি শেয়ার (অংশ)
            </h3>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 font-mono">
              {categoryTotals.map((item, idx) => (
                <div key={idx} className="space-y-1 text-left">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      {item.name}
                    </span>
                    <span className="text-slate-500 font-medium text-right">{currency} {item.amount.toLocaleString('bn-BD')} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2.5 mb-4">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full"></span> গ্রাফিক্যাল ক্যাটাগরি বিশ্লেষণ
            </h3>
            
            <div className="h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={30}>
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(val: number) => [`${currency} ${val.toLocaleString('bn-BD')}`, 'টাকা']}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 font-black uppercase">খাত অংশ</span>
                <span className="text-xs font-bold text-slate-600 font-mono">{categoryTotals.length} টি</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold text-slate-500 pt-3 border-t border-slate-100 mt-2">
              {categoryTotals.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Budget interfaces are imported from /types.ts

// ------------------------------------------
// BUDGET MANAGER PAGE/TAB
// ------------------------------------------
const BudgetManager: React.FC<{ expenses: any[]; user: any }> = ({ expenses, user }) => {
  const { showToast } = useAppContext();
  const userId = user?.id || 'default';
  const currency = user?.currency || '৳';

  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => {
    const cached = localStorage.getItem(`budget_limits_${userId}`);
    return cached ? JSON.parse(cached) : [
      { category: 'বাজার', limitAmount: 10000, transactions: [] },
      { category: 'যাতায়াত', limitAmount: 2000, transactions: [] },
      { category: 'ওষুধ', limitAmount: 3000, transactions: [] }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`budget_limits_${userId}`, JSON.stringify(budgets));
  }, [budgets, userId]);

  const [activeView, setActiveView] = useState<'list' | 'details'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // States for budget creation/limit setting
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budCategory, setBudCategory] = useState('');
  const [budLimit, setBudLimit] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);

  // States for budget sub-transactions (like Dues)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'add' | 'spend'>('spend');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Floating Action Button visibility based on scroll direction (optimized with direct DOM ref to run at 60fps without React lagging)
  const budgetFabRef = useRef<HTMLButtonElement>(null);
  const isBudgetFabVisibleRef = useRef(true);
  const lastBudgetScrollY = useRef(0);

  const setBudgetFabVisibleDirectly = (visible: boolean) => {
    if (isBudgetFabVisibleRef.current === visible) return;
    isBudgetFabVisibleRef.current = visible;
    
    const el = budgetFabRef.current;
    if (!el) return;
    
    if (visible) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(32px) scale(0.9)';
      el.style.pointerEvents = 'none';
    }
  };

  useEffect(() => {
    // Reset FAB visibility to visible on mount/view change
    isBudgetFabVisibleRef.current = true;
    if (budgetFabRef.current) {
      budgetFabRef.current.style.opacity = '1';
      budgetFabRef.current.style.transform = 'translateY(0) scale(1)';
      budgetFabRef.current.style.pointerEvents = 'auto';
    }

    lastBudgetScrollY.current = window.scrollY;
    let lastBudgetTouchY = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diffScrollY = currentScrollY - lastBudgetScrollY.current;
      
      if (diffScrollY > 0) {
        setBudgetFabVisibleDirectly(false);
      } else if (diffScrollY < 0) {
        setBudgetFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (currentScrollY < 30) {
        setBudgetFabVisibleDirectly(true);
      }
      
      lastBudgetScrollY.current = currentScrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        lastBudgetTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const currentY = e.touches[0].clientY;
      const diffY = currentY - lastBudgetTouchY;
      
      // finger moved UP (scrolling DOWN) -> Hide FAB instantly
      if (diffY < 0) {
        setBudgetFabVisibleDirectly(false);
      } 
      // finger moved DOWN (scrolling UP) -> Show FAB instantly
      else if (diffY > 0) {
        setBudgetFabVisibleDirectly(true);
      }
      
      lastBudgetTouchY = currentY;
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setBudgetFabVisibleDirectly(true);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        setBudgetFabVisibleDirectly(false);
      } else if (e.deltaY < 0) {
        setBudgetFabVisibleDirectly(true);
      }
      
      // Always show when close to the top
      if (window.scrollY < 30) {
        setBudgetFabVisibleDirectly(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [activeView]);

  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const getCurrentBengaliMonthAndYear = (): string => {
    const now = new Date();
    const banglaMonths = [
      'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return `${banglaMonths[now.getMonth()]} ${toBanglaNumbers(now.getFullYear())}`;
  };

  // Helper: Find budget object for selected category
  const budgetObj = useMemo(() => {
    if (!selectedCategory) return null;
    return budgets.find(b => b.category.toLowerCase() === selectedCategory.toLowerCase()) || null;
  }, [budgets, selectedCategory]);

  // Sub-transaction calculation for ALL budgets to display in the list view
  const actualCurrentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const grouped: { [key: string]: number } = {};
    expenses.forEach(e => {
      const expenseDate = new Date(e.date);
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
         grouped[e.category] = (grouped[e.category] || 0) + e.amount;
      }
    });

    // Add custom spend transactions for each budget category
    budgets.forEach(bud => {
      const customSpent = (bud.transactions || [])
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'spend' &&
                 d.getMonth() === currentMonth &&
                 d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      grouped[bud.category] = (grouped[bud.category] || 0) + customSpent;
    });

    return grouped;
  }, [expenses, budgets]);

  // Adjust budgets limits to include any custom allocations
  const currentBudgetsLimits = useMemo(() => {
    const lims: { [key: string]: number } = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    budgets.forEach(bud => {
      const customAddSum = (bud.transactions || [])
        .filter(t => {
          const d = new Date(t.date);
          return t.type === 'add' &&
                 d.getMonth() === currentMonth &&
                 d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      lims[bud.category] = bud.limitAmount + customAddSum;
    });
    return lims;
  }, [budgets]);

  const totalCurrentSpent = useMemo(() => {
    return Object.values(actualCurrentMonthExpenses).reduce((sum, val) => sum + val, 0);
  }, [actualCurrentMonthExpenses]);

  const totalCurrentBudget = useMemo(() => {
    return Object.values(currentBudgetsLimits).reduce((sum, val) => sum + val, 0);
  }, [currentBudgetsLimits]);

  const overallRatio = totalCurrentBudget > 0 ? Math.min(Math.round((totalCurrentSpent / totalCurrentBudget) * 100), 100) : 0;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budCategory || !budLimit) return;

    const limitNum = Number(budLimit);
    const existingIdx = budgets.findIndex(b => b.category.toLowerCase() === budCategory.toLowerCase());

    if (existingIdx !== -1) {
      const updated = [...budgets];
      updated[existingIdx].limitAmount = limitNum;
      setBudgets(updated);
    } else {
      setBudgets([...budgets, { category: budCategory, limitAmount: limitNum, transactions: [] }]);
    }

    showToast('বাজেট লিমিট সেভ হয়েছে!', 'success');
    setBudCategory('');
    setBudLimit('');
    setBudgetModalOpen(false);
  };

  const handleDeleteBudget = (category: string) => {
    setBudgetToDelete(category);
  };

  const handleConfirmDeleteBudget = () => {
    if (budgetToDelete) {
      setBudgets(budgets.filter(b => b.category !== budgetToDelete));
      showToast('বাজেট অপসারণ করা হয়েছে', 'success');
      if (selectedCategory?.toLowerCase() === budgetToDelete.toLowerCase()) {
        setSelectedCategory(null);
        setActiveView('list');
      }
      setBudgetToDelete(null);
    }
  };

  const resetTxForm = () => {
    setEditingTransactionId(null);
    setTxType('spend');
    setTxAmount('');
    setTxDescription('');
    setTxDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenEditTx = (tx: any) => {
    setEditingTransactionId(tx.id);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxDescription(tx.description);
    setTxDate(tx.date);
    setIsTxModalOpen(true);
  };

  const handleDeleteBudgetTransaction = (txId: string) => {
    setTxToDeleteId(txId);
  };

  const handleConfirmDeleteBudgetTransaction = () => {
    if (!selectedCategory || !txToDeleteId) return;
    const updatedBudgets = budgets.map(b => {
      if (b.category.toLowerCase() === selectedCategory.toLowerCase()) {
        return {
          ...b,
          transactions: (b.transactions || []).filter(t => t.id !== txToDeleteId)
        };
      }
      return b;
    });
    setBudgets(updatedBudgets);
    showToast('লেনদেনটি মুছে ফেলা হয়েছে', 'success');
    setTxToDeleteId(null);
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !txAmount) return;

    const amountNum = Number(txAmount);
    const updatedBudgets = budgets.map(b => {
      if (b.category.toLowerCase() === selectedCategory.toLowerCase()) {
        const txs = b.transactions || [];
        if (editingTransactionId) {
          // Edit existing
          return {
            ...b,
            transactions: txs.map(t => t.id === editingTransactionId
              ? { ...t, type: txType, amount: amountNum, description: txDescription, date: txDate }
              : t
            )
          };
        } else {
          // Add new
          const newTx: BudgetTransaction = {
            id: crypto.randomUUID(),
            type: txType,
            amount: amountNum,
            description: txDescription || (txType === 'add' ? 'অগ্রিম বরাদ্দ বৃদ্ধি' : 'সরাসরি ব্যয়'),
            date: txDate
          };
          return {
            ...b,
            transactions: [newTx, ...txs]
          };
        }
      }
      return b;
    });

    setBudgets(updatedBudgets);
    showToast(editingTransactionId ? 'লেনদেন আপডেট করা হয়েছে' : 'বাজেট লেনদেন যোগ করা হয়েছে', 'success');
    resetTxForm();
    setIsTxModalOpen(false);
  };

  // Preparation of Details View combined history
  const matchedExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return expenses.filter(e => e.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [expenses, selectedCategory]);

  const mappedMatched = useMemo(() => {
    return matchedExpenses.map(e => ({
      id: e.id || `exp-${e.created_at || Math.random()}`,
      type: 'spend' as const,
      amount: e.amount,
      description: e.notes || 'সরাসরি ব্যয় (ড্যাশবোর্ড)',
      date: e.date,
      isExternal: true
    }));
  }, [matchedExpenses]);

  const mappedCustom = useMemo(() => {
    if (!budgetObj) return [];
    return (budgetObj.transactions || []).map(t => ({
      ...t,
      isExternal: false
    }));
  }, [budgetObj]);

  const combinedHistory = useMemo(() => {
    const combined = [...mappedCustom, ...mappedMatched];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mappedCustom, mappedMatched]);

  const detailSpent = actualCurrentMonthExpenses[selectedCategory || ''] || 0;
  const detailBudget = currentBudgetsLimits[selectedCategory || ''] || 0;

  if (activeView === 'details' && selectedCategory) {
    const remainingBudgetLeft = detailBudget - detailSpent;
    const ratio = detailBudget > 0 ? Math.min(Math.round((detailSpent / detailBudget) * 100), 200) : 0;

    let badgeText = 'বাজেট ঠিক আছে';
    let alertColor = 'bg-emerald-50 border-emerald-100 text-emerald-600';

    if (ratio >= 100) {
      badgeText = 'বাজেট ওভার!';
      alertColor = 'bg-rose-50 border-rose-100 text-[#e11d48]';
    } else if (ratio >= 80) {
      badgeText = 'সীমার কাছাকাছি!';
      alertColor = 'bg-amber-50 border-amber-100 text-[#f59e0b]';
    }

    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-20">
        {/* Back Button Header */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full max-w-lg mx-auto">
          <button
            onClick={() => {
              setActiveView('list');
              setSelectedCategory(null);
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="text-left">
            <h2 className="text-base font-bold text-slate-800">বাজেট বিবরণ</h2>
            <p className="text-[10px] text-slate-400 font-semibold">খরচ ও বরাদ্দের বিস্তারিত বিবরণ</p>
          </div>
        </div>

        {/* Budget Detailed Progress Banner */}
        <div className="bg-white border border-[#e2e7ec]/80 p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] w-full max-w-lg mx-auto text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#111827] tracking-tight">
                {EXPENSE_CATEGORY_LABELS[selectedCategory] || selectedCategory}
              </h3>
              <span className={`text-[10px] font-bold mt-1 inline-block px-2.5 py-0.5 rounded-full border ${alertColor}`}>
                {badgeText} ({toBanglaNumbers(ratio)}%)
              </span>
            </div>
            <button
              onClick={() => handleDeleteBudget(selectedCategory)}
              className="p-2 text-slate-300 hover:text-rose-500 rounded-full hover:bg-slate-50 transition-colors"
              title="বাজেট ক্যাটাগরি মুছুন"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="space-y-3.5">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex items-center">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(ratio, 100)}%`,
                  backgroundColor: ratio >= 100 ? '#e11d48' : ratio >= 80 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>ব্যয়িত: {currency} {toBanglaNumbers(detailSpent.toLocaleString('bn-BD'))}</span>
              <span>বাজেট: {currency} {toBanglaNumbers(detailBudget.toLocaleString('bn-BD'))}</span>
            </div>

            {/* Remaining budget notification box */}
            <div className={`p-3 rounded-2xl flex items-center justify-between border ${remainingBudgetLeft >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                {remainingBudgetLeft >= 0 ? (
                  <>
                    <ArrowDown size={14} className="text-emerald-600 animate-bounce" />
                    <span className="text-emerald-700">অবশিষ্ট বাজেট</span>
                  </>
                ) : (
                  <>
                    <ArrowUp size={14} className="text-rose-600 animate-bounce" />
                    <span className="text-rose-700">অতিরিক্ত ব্যয়</span>
                  </>
                )}
              </div>
              <div className={`text-sm font-black ${remainingBudgetLeft >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currency} {toBanglaNumbers(Math.abs(remainingBudgetLeft).toLocaleString('bn-BD'))}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction log/Ledger */}
        <div className="w-full max-w-lg mx-auto">
          <div className="flex justify-between items-center px-1 mb-2.5 text-left">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">লেনদেনের ইতিহাস</h3>
              <p className="text-[10px] text-slate-400 font-semibold">বরাদ্দ ও ব্যয়ের সমন্বিত তালিকা</p>
            </div>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 select-none">
              <p className="text-xs font-bold text-slate-500">কোনো লেনদেন রেকর্ড নেই</p>
              <p className="text-[9px] text-slate-400 mt-0.5">নিচের + বাটনে চাপ দিয়ে বরাদ্দ বা ব্যয় যোগ করুন</p>
            </div>
          ) : (
            <div className="space-y-2">
              {combinedHistory.map((item) => {
                const isAdd = item.type === 'add';
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl flex items-center justify-between border shadow-sm text-left transition-all relative ${
                      isAdd ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/30 border-rose-100/55'
                    }`}
                  >
                    <div className="flex gap-2.5 min-w-0 items-start">
                      <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${isAdd ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                        {isAdd ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                            {item.description}
                          </h4>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.isExternal 
                              ? 'bg-slate-100 text-slate-500' 
                              : isAdd 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                          }`}>
                            {item.isExternal ? 'ড্যাশবোর্ড' : isAdd ? 'বরাদ্দ' : 'সরাসরি'}
                          </span>
                        </div>
                        <p className="text-[9px] font-semibold text-slate-400 mt-1">{toBanglaNumbers(item.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-xs font-black select-none ${isAdd ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isAdd ? '+' : '-'} {currency}{toBanglaNumbers(item.amount.toLocaleString('bn-BD'))}
                      </span>
                      {!item.isExternal && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTx(item)}
                            className="p-1 text-slate-400 hover:text-[#1a73e8] rounded-md hover:bg-slate-50 cursor-pointer"
                            title="এডিট"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteBudgetTransaction(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-50 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating action button inside detailed view */}
        <button
          ref={budgetFabRef}
          onClick={() => { resetTxForm(); setIsTxModalOpen(true); }}
          className="fixed bottom-[76px] lg:bottom-8 right-5 lg:right-8 bg-[#10b981] hover:bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100 active:scale-95 transition-all duration-[150ms] ease-out z-40 cursor-pointer pointer-events-auto opacity-100 scale-100 translate-y-0"
          style={{
            willChange: 'transform, opacity',
          }}
          title="বাজেট লেনদেন যোগ করুন"
        >
          <Plus size={28} />
        </button>

        {/* Add/Edit Sub-Transaction Modal inside detailed view */}
        {isTxModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-150">
              <h3 className="text-sm font-bold text-slate-800 text-center mb-1">বাজেট লেনদেন লগার</h3>
              <p className="text-[10px] text-slate-400 text-center mb-5 font-semibold">বরাদ্দ বৃদ্ধি বা খরচের বিবরণ সেভ করুন</p>
              
              <form onSubmit={handleSaveTx} className="space-y-4">
                {/* Transaction Type Selection Selector Toggle */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2">লেনদেনের ধরণ</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTxType('spend')}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        txType === 'spend'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      ব্যয় (Spend)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('add')}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        txType === 'add'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/50'
                      }`}
                    >
                      বরাদ্দ (Add Budget)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">বিবরণ বা নাম</label>
                  <input required type="text" value={txDescription} onChange={e => setTxDescription(e.target.value)} placeholder="যেমন: সপ্তাহিক তরকারি বাজার, বাড়তি টাকা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">টাকার পরিমাণ</label>
                    <input required type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="টাকা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-black text-slate-800 text-base" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">তারিখ</label>
                    <input required type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsTxModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">বাতিল</button>
                  <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm">নিশ্চিত করুন</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Normal List View ---
  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      {/* Budget Overview Card */}
      <div className="bg-white border border-[#e2e7ec]/80 p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] w-full max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-extrabold text-[#111827] tracking-tight">বাজেট ম্যানেজমেন্ট</h3>
          <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            <CalendarDays size={14} />
            {getCurrentBengaliMonthAndYear()}
          </span>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex items-center">
            <div
              className="h-full rounded-full transition-all duration-300 bg-[#1a73e8]"
              style={{ width: `${overallRatio}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 font-mono">
            <span>মোট খরচ: {currency} {toBanglaNumbers(totalCurrentSpent.toLocaleString('bn-BD'))}</span>
            <span className="text-[#1a73e8] font-black">{toBanglaNumbers(overallRatio)}%</span>
            <span>মোট বাজেট: {currency} {toBanglaNumbers(totalCurrentBudget.toLocaleString('bn-BD'))}</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-1">
        {budgets.length === 0 ? (
          /* Image Accurate Beautiful Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-xs">
              <Receipt size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">কোন বাজেট নেই</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">নিচের + বাটনে ক্লিক করে বাজেট যোগ করুন</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-500 pl-2">বাজেট লিমিট তালিকা</h3>
              <span className="text-[10px] font-bold text-slate-400">সব খাতের বাজেট সম্বলিত তালিকা</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5">
              {budgets.map((bud, idx) => {
                const actual = actualCurrentMonthExpenses[bud.category] || 0;
                const limitWithAllocations = currentBudgetsLimits[bud.category] || bud.limitAmount;
                const ratio = limitWithAllocations > 0 ? Math.min(Math.round((actual / limitWithAllocations) * 100), 200) : 0;
                
                let badgeText = 'বাজেট ঠিক আছে';
                let alertColor = 'bg-emerald-50 border-emerald-100 text-emerald-600';

                if (ratio >= 100) {
                  badgeText = 'বাজেট ওভার!';
                  alertColor = 'bg-rose-50 border-rose-100 text-rose-600';
                } else if (ratio >= 80) {
                  badgeText = 'সীমার কাছাকাছি!';
                  alertColor = 'bg-amber-50 border-amber-100 text-[#f59e0b]';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedCategory(bud.category);
                      setActiveView('details');
                    }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3.5 relative overflow-hidden text-left hover:shadow-md transition-shadow duration-300 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">{EXPENSE_CATEGORY_LABELS[bud.category] || bud.category}</h4>
                        <span className={`text-[9px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full border ${alertColor}`}>
                          {badgeText} ({toBanglaNumbers(ratio)}%)
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBudget(bud.category);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>ব্যয়িত: {currency} {toBanglaNumbers(actual.toLocaleString('bn-BD'))}</span>
                        <span>বাজেট: {currency} {toBanglaNumbers(limitWithAllocations.toLocaleString('bn-BD'))}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(ratio, 100)}%`, backgroundColor: ratio >= 100 ? '#e11d48' : ratio >= 80 ? '#f59e0b' : '#10b981' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (Screenshot Accurate Layout) */}
      <button
        ref={budgetFabRef}
        onClick={() => { setBudCategory(''); setBudLimit(''); setBudgetModalOpen(true); }}
        className="fixed bottom-[76px] lg:bottom-8 right-5 lg:right-8 bg-[#1a73e8] hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-all duration-[150ms] ease-out z-40 cursor-pointer pointer-events-auto opacity-100 scale-100 translate-y-0"
        style={{
          willChange: 'transform, opacity',
        }}
        title="বাজেট সেট করুন"
      >
        <Plus size={28} />
      </button>

      {/* Budget Limit Set Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 text-center mb-4">ঋণ বা খরচের বাজেট লিমিট</h3>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">খাত / ক্যাটাগরি</label>
                <input required type="text" value={budCategory} onChange={e => setBudCategory(e.target.value)} placeholder="যেমন: বাজার, যাতায়াত" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">বাজেট পরিমাণ</label>
                <input required type="number" value={budLimit} onChange={e => setBudLimit(e.target.value)} placeholder="সর্বোচ্চ টাকা লিমিট" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-black text-slate-800 text-base" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setBudgetModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">বাতিল</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm">বাজেট সেভ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {budgetToDelete && (
        <ConfirmModal
          isOpen={!!budgetToDelete}
          onClose={() => setBudgetToDelete(null)}
          onConfirm={handleConfirmDeleteBudget}
          title="বাজেট ডিলিট"
          message={`আপনি কি "${EXPENSE_CATEGORY_LABELS[budgetToDelete] || budgetToDelete}" খাতের বাজেট লিমিট অপসারণ করতে চান?`}
        />
      )}

      {txToDeleteId && (
        <ConfirmModal
          isOpen={!!txToDeleteId}
          onClose={() => setTxToDeleteId(null)}
          onConfirm={handleConfirmDeleteBudgetTransaction}
          title="লেনদেন ডিলিট"
          message="আপনি কি এই লেনদেনটি মুছে ফেলতে চান?"
        />
      )}
    </div>
  );
};

// ------------------------------------------
// TASKS MANAGER / CHECKLIST PAGE/TAB
// ------------------------------------------
const TasksManager: React.FC<{ expenses: any[]; user: any }> = ({ expenses, user }) => {
  const { showToast } = useAppContext();
  const userId = user?.id || 'default';
  const currency = user?.currency || '৳';

  const [tasks, setTasks] = useState<TodoTask[]>(() => {
    const cached = localStorage.getItem(`budget_tasks_${userId}`);
    return cached ? JSON.parse(cached) : [
      { id: 't-1', title: 'চলতি মাসের বিদ্যুৎ বিল পরিশোধ করা', amount: 1200, dueDate: new Date().toISOString().split('T')[0], completed: false, createdAt: new Date().toISOString().split('T')[0] },
      { id: 't-2', title: 'ইন্টারনেট বিল পরিশোধ করা', amount: 500, dueDate: new Date().toISOString().split('T')[0], completed: true, createdAt: new Date().toISOString().split('T')[0] }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`budget_tasks_${userId}`, JSON.stringify(tasks));
  }, [tasks, userId]);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAmount, setTaskAmount] = useState('');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);

  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    const newTask: TodoTask = {
      id: crypto.randomUUID(),
      title: taskTitle,
      amount: taskAmount ? Number(taskAmount) : undefined,
      dueDate: taskDate,
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setTasks([newTask, ...tasks]);
    showToast('চেকলিস্টে নতুন কাজ যোগ হয়েছে!', 'success');
    setTaskTitle('');
    setTaskAmount('');
    setTaskDate(new Date().toISOString().split('T')[0]);
    setTaskModalOpen(false);
  };

  const toggleTaskCompleted = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    showToast('কাজের অবস্থা আপডেট হয়েছে!', 'success');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    showToast('কাজ ডিলিট হয়েছে', 'success');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      <div className="flex justify-between items-center mb-1 text-left w-full max-w-lg mx-auto px-1">
        <div>
          <h3 className="text-base font-bold text-slate-800">খরচের চেকলিস্ট</h3>
          <p className="text-xs text-slate-400 font-medium">প্রয়োজনীয় খরচের বা গুরুত্বপূর্ণ কাজের চেকলিস্ট তৈরি ও ট্র্যাকিং করুন</p>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-xs">
              <ListChecks size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">কোনো কাজ বা ডিল নেই</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">নিচের + বাটনে ক্লিক করে কাজ যোগ করুন</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition-all text-left ${
                  task.completed ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                      task.completed ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'border-slate-300 hover:border-[#1a73e8]'
                    }`}
                  >
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 text-left">
                    <h4 className={`text-xs font-bold leading-tight ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400">
                      <span>মেয়াদ: {toBanglaNumbers(task.dueDate)}</span>
                      {task.amount && <span>• প্রাক্কলিত: {currency} {toBanglaNumbers(task.amount.toLocaleString('bn-BD'))}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg shrink-0 transition-colors cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Floating Action Button */}
      <button
        onClick={() => { setTaskTitle(''); setTaskAmount(''); setTaskModalOpen(true); }}
        className="fixed bottom-[76px] lg:bottom-8 right-5 lg:right-8 bg-[#1a73e8] hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-all duration-[150ms] ease-out z-40 cursor-pointer"
        title="নতুন কাজ যোগ করুন"
      >
        <Plus size={28} />
      </button>

      {/* Checklist Tasks Set Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 text-center mb-4">নতুন খরচ বা ডিল যোগ</h3>
            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">কাজের নাম</label>
                <input required type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="যেমন: বাড়ি ভাড়া পরিশোধ করা" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">সম্ভাব্য খরচ</label>
                  <input type="number" value={taskAmount} onChange={e => setTaskAmount(e.target.value)} placeholder="ঐচ্ছিক" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">টার্গেট ডেট</label>
                  <input required type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1a73e8] font-bold text-slate-800 text-xs" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setTaskModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors">বাতিল</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm">কাজ যোগ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
