
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Plus, Search, MoreVertical, Calendar, DollarSign, Briefcase, X, FolderOpen, Pencil, Trash2, Users, FileText, CheckCircle2, Clock, Play, UserPlus, CalendarDays, Loader2, AlertCircle, ChevronDown, Filter, Music, Calculator, Eye, Wallet, Download, Share2, Copy, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '../constants';
import { Project, ProjectStatus, ProjectType, Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DatePicker } from '@/components/DatePicker';
import { StatusPicker } from '@/components/StatusPicker';

export const Projects: React.FC = () => {
  const { projects, setProjects, clients, setClients, user, refreshData, showToast } = useAppContext();
  const location = useLocation();
  const currency = user?.currency || '৳';
  
  // Added 'Due' to the type for local filtering
  const [filter, setFilter] = useState<ProjectStatus | 'All' | 'Due'>('All');
  
  // New state for Client Filtering
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New: State to control which card has its menu open
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  
  // New: State for View Details Modal
  const [viewProject, setViewProject] = useState<Project | null>(null);
  
  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeAmountField, setActiveAmountField] = useState<'total' | 'paid' | null>(null);

  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  // Ref for click outside detection
  const clientInputRef = useRef<HTMLDivElement>(null);
  
  const [newProject, setNewProject] = useState<any>({
    name: '',
    type: 'NasheedSong',
    status: 'Pending',
    totalamount: 0,
    paidamount: 0,
    deadline: '',
    createdat: new Date().toISOString().split('T')[0],
    clientname: '',
    notes: ''
  });

  // Effect to handle navigation from Dashboard or Clients page
  useEffect(() => {
    if (location.state) {
        if (location.state.filter) {
            setFilter(location.state.filter);
        }
        if (location.state.clientFilter) {
            setClientFilter(location.state.clientFilter);
        }
        // Clear history state to avoid getting stuck if they navigate back/forth without clicking the card
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Card Menu
      if (activeCardMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveCardMenuId(null);
      }
      
      // Close Client Suggestions
      if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCardMenuId]);

  const initiateDelete = (id: string) => {
    setProjectToDelete(id);
    setShowDeleteModal(true);
    setActiveCardMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !projectToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete)
        .eq('userid', user.id);
      
      if (error) {
        if (error.code === '23503') {
          throw new Error('এই প্রজেক্টের পেমেন্ট রেকর্ড আছে। আগে আয় রেকর্ড মুছুন।');
        }
        throw error;
      }
      
      showToast('প্রজেক্ট ডিলিট করা হয়েছে', 'success');
      setProjects(prev => prev.filter(p => p.id !== projectToDelete));
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(err.message || 'ডিলিট করতে সমস্যা হয়েছে');
      setShowDeleteModal(false); // Close on error to reset
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormError(null);
    setClientSearch('');
    setNewProject({ 
      name: '',
      type: 'NasheedSong', 
      status: 'Pending', 
      totalamount: 0, 
      paidamount: 0, 
      deadline: '',
      createdat: new Date().toISOString().split('T')[0],
      clientname: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setIsEditing(true);
    setFormError(null);
    setActiveProjectId(project.id);
    setClientSearch(project.clientname);
    setNewProject({
      ...project,
      createdat: project.createdat ? project.createdat.split('T')[0] : '',
      deadline: project.deadline ? project.deadline.split('T')[0] : ''
    });
    setModalOpen(true);
    setActiveCardMenuId(null);
    setViewProject(null); // Close view modal if open
  };

  // Helper to safely evaluate math expressions
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
    setFormError(null);
    
    // Validation
    if (!newProject.name.trim()) {
      setFormError('প্রজেক্টের নাম আবশ্যক');
      return;
    }
    if (!clientSearch.trim()) {
      setFormError('ক্লায়েন্টের নাম আবশ্যক');
      return;
    }
    if (!user) return;
    
    setIsSubmitting(true);
    
    // Evaluate possible math expressions from keypad
    const totalamount = Number(safeEval(newProject.totalamount)) || 0;
    const paidInput = Number(safeEval(newProject.paidamount)) || 0;
    
    const clientName = clientSearch.trim();
    const projectName = newProject.name.trim();
    const deadlineToSave = newProject.deadline ? newProject.deadline : null;
    const createdAtToSave = newProject.createdat || new Date().toISOString().split('T')[0];

    try {
      // 1. Handle Client Creation
      const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!existingClient) {
        const { data: clientData, error: clientError } = await supabase.from('clients').insert({
          name: clientName,
          contact: 'যোগ করা হয়নি',
          totalprojects: 1,
          totalearnings: paidInput,
          userid: user.id
        }).select().single();
        
        if (clientError) throw clientError;
        if (clientData) setClients(prev => [clientData as any, ...prev]);
      }

      // 2. Insert/Update Project
      if (isEditing && activeProjectId) {
        const existingProject = projects.find(p => p.id === activeProjectId);
        const currentPaid = existingProject ? existingProject.paidamount : 0;
        
        const { error: updateError } = await supabase.from('projects').update({
          name: projectName,
          clientname: clientName,
          type: newProject.type,
          totalamount,
          dueamount: totalamount - currentPaid, 
          status: newProject.status,
          deadline: deadlineToSave,
          createdat: createdAtToSave,
          notes: newProject.notes
        }).eq('id', activeProjectId).eq('userid', user.id);

        if (updateError) throw updateError;

        // --- NEW: Sync Income Records ---
        // If Project Name or Client Name changed, update all associated income records
        if (existingProject && (existingProject.name !== projectName || existingProject.clientname !== clientName)) {
             await supabase.from('income_records').update({
                projectname: projectName,
                clientname: clientName
             }).eq('projectid', activeProjectId).eq('userid', user.id);
        }
        // --------------------------------

        showToast('প্রজেক্ট আপডেট করা হয়েছে', 'success');
      } else {
        // NEW PROJECT LOGIC
        // Step A: Insert Project
        const { data: insertedProject, error: insertError } = await supabase.from('projects').insert({
          name: projectName,
          clientname: clientName,
          type: newProject.type,
          totalamount,
          paidamount: paidInput,
          dueamount: totalamount - paidInput,
          status: newProject.status,
          deadline: deadlineToSave,
          createdat: createdAtToSave,
          notes: newProject.notes,
          userid: user.id
        }).select().single();
        
        if (insertError) throw insertError;
        const pId = insertedProject.id;

        // Step B: Insert Income Record if needed
        if (paidInput > 0) {
            const { error: incomeError } = await supabase.from('income_records').insert({
                projectid: pId,
                projectname: projectName,
                clientname: clientName,
                amount: paidInput,
                date: createdAtToSave,
                method: 'বিকাশ',
                userid: user.id
            });

            if (incomeError) {
               console.error("Income error", incomeError);
            } else {
               // Step C: Force Update Project to ensure consistency
               await supabase.from('projects').update({
                   paidamount: paidInput,
                   dueamount: totalamount - paidInput
               }).eq('id', pId).eq('userid', user.id);
            }
        }
        
        showToast('নতুন প্রজেক্ট তৈরি হয়েছে', 'success');
      }
      
      setModalOpen(false);
      
      setTimeout(async () => {
         await refreshData();
      }, 800);
      
    } catch (err: any) {
      setFormError(err.message || 'ডাটা সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientSuggestions = clients.filter(c => 
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );
  
  const isNewClient = clientSearch && !clients.some(c => c.name.toLowerCase() === clientSearch.trim().toLowerCase());

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setNewProject({ ...newProject, clientname: client.name });
    setShowClientSuggestions(false);
  };

  const openKeypad = (field: 'total' | 'paid') => {
    setActiveAmountField(field);
    setShowKeypad(true);
  };

  const handleKeypadValue = (val: number | string) => {
    if (activeAmountField === 'total') {
      setNewProject({ ...newProject, totalamount: val });
    } else if (activeAmountField === 'paid') {
      setNewProject({ ...newProject, paidamount: val });
    }
  };

  const clearClientFilter = () => {
    setClientFilter(null);
  };

  const filteredProjects = projects.filter(p => {
    let matchesFilter = false;
    
    // Check Status Filter
    if (filter === 'All') {
        matchesFilter = true;
    } else if (filter === 'Due') {
        matchesFilter = p.dueamount > 0;
    } else {
        matchesFilter = p.status === filter;
    }

    // Check Client Filter (if active)
    if (clientFilter && p.clientname !== clientFilter) {
        matchesFilter = false;
    }

    // Check Date Range Filter
    if (dateRange.start && p.createdat) {
        const projectDate = p.createdat.split('T')[0];
        if (projectDate < dateRange.start) matchesFilter = false;
    }
    if (dateRange.end && p.createdat) {
        const projectDate = p.createdat.split('T')[0];
        if (projectDate > dateRange.end) matchesFilter = false;
    }

    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.clientname || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const summaryStats = filteredProjects.reduce((acc, p) => {
    acc.total += p.totalamount;
    acc.paid += p.paidamount;
    acc.due += p.dueamount;
    return acc;
  }, { total: 0, paid: 0, due: 0 });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;
    
    setIsGeneratingPDF(true);
    showToast('পিডিএফ তৈরি হচ্ছে...', 'info');
    
    // Wait a bit for the UI to update
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const element = listRef.current;
      const fileName = `projects_${clientFilter ? clientFilter : 'all'}_${new Date().getTime()}.pdf`;
      
      const opt = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            const pdfHeader = clonedDoc.getElementById('pdf-header');
            if (pdfHeader) pdfHeader.style.display = 'block';
            
            const pdfFooter = clonedDoc.getElementById('pdf-footer');
            if (pdfFooter) pdfFooter.style.display = 'block';

            const container = clonedDoc.getElementById('pdf-container');
            if (container) {
              container.style.width = '100%';
              container.style.maxWidth = '800px';
              container.style.margin = '0 auto';
              container.style.overflow = 'visible';
              container.style.height = 'auto';
              container.style.padding = '20px';
              container.style.borderRadius = '0';
              container.style.backgroundColor = '#ffffff';
              
              // Remove space-y classes and use direct margins for better PDF rendering
              container.classList.remove('space-y-4');
              const nestedSpacedElements = container.querySelectorAll('.space-y-4, .space-y-2');
              nestedSpacedElements.forEach(el => {
                el.classList.remove('space-y-4', 'space-y-2');
                (el as HTMLElement).style.display = 'block';
              });
              
              const truncatedElements = container.querySelectorAll('.truncate');
              truncatedElements.forEach(el => {
                el.classList.remove('truncate');
                (el as HTMLElement).style.whiteSpace = 'normal';
                (el as HTMLElement).style.overflow = 'visible';
              });

              // Remove animation classes that might interfere with PDF rendering
              const animatedElements = container.querySelectorAll('.animate-in, .slide-in-from-bottom-2, .fade-in');
              animatedElements.forEach(el => {
                el.classList.remove('animate-in', 'slide-in-from-bottom-2', 'fade-in', 'slide-in-from-top-2');
                (el as HTMLElement).style.opacity = '1';
                (el as HTMLElement).style.transform = 'none';
              });

              // Remove overflow-x-auto and scrolling classes
              const scrollableElements = container.querySelectorAll('.overflow-x-auto, .no-scrollbar');
              scrollableElements.forEach(el => {
                el.classList.remove('overflow-x-auto', 'no-scrollbar');
                (el as HTMLElement).style.overflow = 'visible';
                (el as HTMLElement).style.display = 'flex';
                (el as HTMLElement).style.flexWrap = 'wrap';
              });

              // Add style to prevent page breaks inside cards
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                .break-inside-avoid {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  display: block !important;
                  margin-bottom: 20px !important;
                  position: relative !important;
                  overflow: visible !important;
                }
                #pdf-container {
                  background-color: white !important;
                  display: block !important;
                }
                /* Ensure nested elements don't cause breaks */
                .break-inside-avoid * {
                  break-inside: auto !important;
                }
              `;
              clonedDoc.head.appendChild(style);
            }
          }
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any, avoid: '.break-inside-avoid' }
      };

      // Generate PDF as blob for Supabase upload
      const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
      
      // Try to upload to Supabase Storage for a real URL (Best for Mobile Apps)
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

      // Try Native Share first (Best for Mobile Apps)
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Project Report',
              text: 'Manage-Me Project Report'
            });
            showToast('শেয়ার সফল হয়েছে', 'success');
            setIsGeneratingPDF(false);
            return;
          } catch (shareError) {
            console.log('Share cancelled or failed', shareError);
          }
        }
      }

      // Fallback: Show Preview Modal with Download Link
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
      {/* Header & Add Button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">প্রজেক্ট তালিকা</h1>
            <button 
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-1.5 rounded-lg transition-all ${showDateFilter || dateRange.start || dateRange.end ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
            >
              <CalendarDays size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">{filteredProjects.length} টি প্রজেক্ট পাওয়া গেছে</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleOpenAddModal}
            className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform"
          >
            <Plus size={22} />
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
              <Filter size={14} className="text-indigo-500" /> তারিখ অনুযায়ী ফিল্টার
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

      {/* Search & Filter - Outside PDF capture */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-2.5 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="সার্চ..." 
            className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-2xl text-xs font-bold shadow-sm outline-none focus:border-indigo-500 h-full"
          >
            <option value="All">সবগুলো</option>
            <option value="Due">বকেয়া প্রজেক্ট</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Report Content Area (for PDF) */}
      <div id="pdf-container" ref={listRef} className="space-y-4 px-1 py-4 bg-white rounded-[2.5rem]">
        {/* PDF Only Header */}
        <div id="pdf-header" className="hidden mb-10">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Music size={36} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">Manage-Me</h1>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Professional Studio Manager</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-1">প্রজেক্ট রিপোর্ট</p>
              <p className="text-[10px] font-bold text-slate-500">তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] font-bold text-slate-400">সময়: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">ক্লায়েন্ট</p>
                <p className="text-xl font-black text-indigo-700">{clientFilter || 'সকল ক্লায়েন্ট'}</p>
             </div>
             <div className="bg-slate-50 border border-slate-100 p-5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মোট প্রজেক্ট</p>
                <p className="text-xl font-black text-slate-700">{filteredProjects.length} টি</p>
             </div>
          </div>

          <div className="mb-8 break-inside-avoid">
             <h2 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-indigo-500 pl-2">হিসাব সারসংক্ষেপ</h2>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">মোট বাজেট</p>
                   <p className="text-lg font-black text-slate-700">{currency}{summaryStats.total.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                   <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">মোট আদায়</p>
                   <p className="text-lg font-black text-emerald-600">{currency}{summaryStats.paid.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                   <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">মোট বকেয়া</p>
                   <p className="text-lg font-black text-rose-600">{currency}{summaryStats.due.toLocaleString('bn-BD')}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Active Client Filter Banner & Stats */}
        {clientFilter && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700">
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                      <Users size={14} />
                    </div>
                    <span className="text-sm font-bold">ক্লায়েন্ট: {clientFilter}</span>
                </div>
                <button 
                    onClick={clearClientFilter}
                    data-html2canvas-ignore="true"
                    className="p-1.5 bg-white rounded-full text-indigo-400 hover:text-rose-500 transition-colors shadow-sm active:scale-90"
                >
                    <X size={14} />
                </button>
            </div>

            {summaryStats && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase leading-none mb-2">মোট বাজেট</p>
                  <p className="text-base font-black text-slate-700 leading-none">{currency}{summaryStats.total.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold text-emerald-500 uppercase leading-none mb-2">মোট আদায়</p>
                  <p className="text-base font-black text-emerald-600 leading-none">{currency}{summaryStats.paid.toLocaleString('bn-BD')}</p>
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold text-rose-500 uppercase leading-none mb-2">মোট বকেয়া</p>
                  <p className="text-base font-black text-rose-600 leading-none">{currency}{summaryStats.due.toLocaleString('bn-BD')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-4 pb-12">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FolderOpen size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো প্রজেক্ট নেই</p>
              {clientFilter && <p className="text-xs mt-1">এই ক্লায়েন্টের জন্য কোনো প্রজেক্ট পাওয়া যায়নি</p>}
            </div>
          ) : (
            filteredProjects.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300 break-inside-avoid">
                  {/* Minimal Card Layout */}
                  <div className="px-2 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                         <Music size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm truncate leading-snug">{p.name}</h3>
                        <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-1">
                          <Users size={10} className="shrink-0" /> {p.clientname}
                        </p>
                        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">বাজেট</span>
                            <span className="text-xs font-black text-slate-800">{currency}{p.totalamount.toLocaleString('bn-BD')}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase">আদায়</span>
                            <span className="text-xs font-black text-emerald-700">{currency}{p.paidamount.toLocaleString('bn-BD')}</span>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${p.dueamount > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                            <span className={`text-[10px] font-bold uppercase ${p.dueamount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>বকেয়া</span>
                            <span className={`text-xs font-black ${p.dueamount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{currency}{p.dueamount.toLocaleString('bn-BD')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions: Menu & Status Icon */}
                    <div className="flex flex-col items-center self-start pt-0.5" data-html2canvas-ignore="true">
                        {/* Tiny Status Icon */}
                        <div className={`p-1 rounded-md bg-slate-50 border border-slate-100 shadow-sm mb-1`}>
                          {p.status === 'Completed' ? (
                            <CheckCircle2 size={10} className="text-emerald-500" />
                          ) : p.status === 'In Progress' ? (
                            <Play size={10} className="text-blue-500 fill-blue-500" />
                          ) : (
                            <Clock size={10} className="text-amber-500" />
                          )}
                        </div>

                        <div className="relative action-menu-container">
                          <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCardMenuId(activeCardMenuId === p.id ? null : p.id);
                              }}
                              className={`p-2 rounded-full transition-colors ${activeCardMenuId === p.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 bg-slate-50'}`}
                          >
                              <MoreVertical size={18} />
                          </button>

                          {/* Dropdown Menu */}
                          {activeCardMenuId === p.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); setViewProject(p); setActiveCardMenuId(null); }}
                                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                  >
                                      <Eye size={14} /> বিস্তারিত
                                  </button>
                                  <div className="h-px bg-slate-50 w-full my-0.5"></div>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(p); }}
                                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                  >
                                      <Pencil size={14} /> এডিট
                                  </button>
                                  <div className="h-px bg-slate-50 w-full my-0.5"></div>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); initiateDelete(p.id); }}
                                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                  >
                                      <Trash2 size={14} /> ডিলিট
                                  </button>
                              </div>
                          )}
                      </div>
                    </div>
                  </div>
              </div>
            ))
          )}
        </div>

        {/* PDF Only Footer */}
        <div id="pdf-footer" className="hidden mt-12 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated by Manage-Me Studio Manager</p>
          <p className="text-[8px] text-slate-300 mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="প্রজেক্ট ডিলিট"
        message="আপনি কি নিশ্চিত যে এই প্রজেক্টটি ডিলিট করতে চান? এর সাথে যুক্ত সকল তথ্য মুছে যাবে।"
        isProcessing={isDeleting}
      />

      {/* View Project Details Modal (Popup) */}
      {viewProject && createPortal(
          <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header with Color Coding based on Status */}
                <div className={`p-6 relative ${viewProject.status === 'Completed' ? 'bg-emerald-600' : viewProject.status === 'In Progress' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                    <button 
                        onClick={() => setViewProject(null)} 
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-3 shadow-inner ring-1 ring-white/30">
                            <Music size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1 leading-tight">{viewProject.name}</h2>
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-bold border border-white/20">
                            {PROJECT_STATUS_LABELS[viewProject.status]}
                        </span>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Basic Info - Full Width Client */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">ক্লায়েন্ট</p>
                            <p className="font-bold text-slate-700 text-base flex items-center gap-1.5">
                                <Users size={16} className="text-indigo-500"/> {viewProject.clientname}
                            </p>
                        </div>

                    {/* Dates */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <div>
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">শুরু</p>
                            <p className="font-bold text-slate-700 text-sm flex items-center gap-1">
                                <Calendar size={14} /> {viewProject.createdat ? viewProject.createdat.split('T')[0] : 'N/A'}
                            </p>
                         </div>
                         <div className="h-8 w-px bg-slate-200"></div>
                         <div className="text-right">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">ডেডলাইন</p>
                            <p className={`font-bold text-sm flex items-center gap-1 justify-end ${viewProject.deadline ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                <Clock size={14} /> {viewProject.deadline ? viewProject.deadline.split('T')[0] : 'নির্ধারিত নেই'}
                            </p>
                         </div>
                    </div>

                    {/* Financials */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Wallet size={14} className="text-emerald-500" /> পেমেন্ট বিবরণ
                        </p>
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                             <div className="flex justify-between items-center">
                                 <span className="text-sm font-bold text-slate-500">বাজেট</span>
                                 <span className="text-base font-black text-slate-800">{currency} {viewProject.totalamount.toLocaleString('bn-BD')}</span>
                             </div>
                             
                             {/* Progress Bar */}
                             <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${viewProject.totalamount > 0 ? (viewProject.paidamount / viewProject.totalamount) * 100 : 0}%` }}
                                />
                             </div>

                             <div className="flex justify-between items-center pt-1">
                                 <div>
                                     <p className="text-xs font-bold text-emerald-600">পরিশোধ</p>
                                     <p className="text-sm font-bold text-emerald-700">{currency} {viewProject.paidamount.toLocaleString('bn-BD')}</p>
                                 </div>
                                 <div className="text-right">
                                    {viewProject.dueamount > 0 ? (
                                        <>
                                            <p className="text-xs font-bold text-rose-500">বাকি আছে</p>
                                            <p className="text-sm font-bold text-rose-600">{currency} {viewProject.dueamount.toLocaleString('bn-BD')}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-bold text-emerald-500">বাকি</p>
                                            <p className="text-sm font-bold text-emerald-600">নেই</p>
                                        </>
                                    )}
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {viewProject.notes && (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                             <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">নোটস</p>
                             <p className="text-xs font-medium text-amber-800 leading-relaxed">{viewProject.notes}</p>
                        </div>
                    )}
                </div>
             </div>
          </div>,
          document.body
      )}

      {/* Add/Edit Modal (Full Screen with Portal) */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            {/* Header - Compact */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {isEditing ? 'প্রজেক্ট এডিট' : 'নতুন প্রজেক্ট'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Form - Compact Layout */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="px-4 pt-3 pb-24 space-y-4">
                  
                  {/* Smart Error Banner */}
                  {formError && (
                    <div className="bg-rose-50 text-rose-600 p-3 rounded-xl flex items-start gap-2 border border-rose-100 animate-in slide-in-from-top-2">
                       <AlertCircle size={16} className="shrink-0 mt-0.5" />
                       <div>
                         <p className="font-bold text-xs">ত্রুটি!</p>
                         <p className="text-[10px] font-medium mt-0.5">{formError}</p>
                       </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">প্রজেক্ট নাম</label>
                    <input type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="নাম লিখুন..." />
                  </div>

                  <div className="relative" ref={clientInputRef}>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ক্লায়েন্ট</label>
                    <input type="text" value={clientSearch} onFocus={() => setShowClientSuggestions(true)} onChange={e => {setClientSearch(e.target.value); setShowClientSuggestions(true);}} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="ক্লায়েন্ট খুঁজুন..." />
                    
                    {showClientSuggestions && (clientSearch || clientSuggestions.length > 0) && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                        {clientSuggestions.map(c => (
                          <div key={c.id} onClick={() => handleSelectClient(c)} className="px-4 py-3 border-b border-slate-50 hover:bg-indigo-50 font-medium text-sm cursor-pointer transition-colors text-slate-700">
                            {c.name}
                          </div>
                        ))}
                        {isNewClient && (
                          <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-xs font-bold border-t">
                            + নতুন ক্লায়েন্ট হিসেবে যোগ হবে
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <StatusPicker 
                    label="স্ট্যাটাস"
                    value={newProject.status}
                    onChange={status => setNewProject({...newProject, status})}
                    options={PROJECT_STATUS_LABELS}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">বাজেট ({currency})</label>
                      <div 
                        onClick={() => openKeypad('total')}
                        className="keypad-trigger w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 active:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                      >
                         <span className="text-sm">{newProject.totalamount || 0}</span>
                         <Calculator size={16} className="text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">পরিশোধ ({currency})</label>
                      <div 
                        onClick={() => openKeypad('paid')}
                        className="keypad-trigger w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 active:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                      >
                         <span className="text-sm">{newProject.paidamount || 0}</span>
                         <Calculator size={16} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <DatePicker 
                       label="শুরু"
                       value={newProject.createdat}
                       onChange={(date) => setNewProject({...newProject, createdat: date})}
                       placeholder="শুরু তারিখ"
                     />
                     <DatePicker 
                       label="ডেডলাইন (অপশনাল)"
                       value={newProject.deadline}
                       onChange={(date) => {
                         const update: any = { ...newProject, deadline: date };
                         // Auto-set status to Completed when a deadline is selected
                         if (date) {
                           update.status = 'Completed';
                         }
                         setNewProject(update);
                       }}
                       placeholder="ডেডলাইন"
                       align="right"
                     />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    সেভ করুন
                  </button>
                </form>
            </div>
            
            {/* Numeric Keypad */}
            <NumericKeypad 
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={handleKeypadValue}
              initialValue={activeAmountField === 'total' ? newProject.totalamount : newProject.paidamount}
              title={activeAmountField === 'total' ? 'বাজেট পরিমাণ' : 'পরিশোধ পরিমাণ'}
            />
        </div>,
        document.body
      )}
      {/* PDF Preview Modal (Fallback for Mobile Apps) */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">পিডিএফ রিপোর্ট</h3>
                 </div>
                 <button 
                  onClick={() => {
                    URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                    setPdfPublicUrl(null);
                  }} 
                  className="w-8 h-8 bg-slate-200 rounded-full text-slate-600 flex items-center justify-center active:scale-90 transition-transform"
                 >
                    <X size={18} />
                 </button>
              </div>
              
              <div className="p-8 text-center space-y-4">
                 <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Download size={36} />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-800 text-lg">রিপোর্ট তৈরি হয়েছে!</h4>
                    <p className="text-xs text-slate-500 mt-1">নিচের অপশনগুলো ব্যবহার করে রিপোর্টটি সেভ করুন।</p>
                 </div>
                 
                 <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-[11px] font-bold border border-amber-100 flex items-start gap-2 text-left">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>যদি অ্যাপ থেকে ডাউনলোড না হয়, তবে <span className="text-indigo-600">"ব্রাউজারে ওপেন করুন"</span> বাটনে ক্লিক করুন।</span>
                 </div>
              </div>

              <div className="p-6 pt-0 space-y-3">
                 {pdfPublicUrl ? (
                   <button 
                     onClick={() => window.open(pdfPublicUrl, '_blank')}
                     className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                   >
                      <ExternalLink size={18} />
                      ব্রাউজারে ওপেন করুন
                   </button>
                 ) : (
                   <a 
                     href={pdfPreviewUrl} 
                     download={`Report-${new Date().getTime()}.pdf`}
                     className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                   >
                      <Download size={18} />
                      ডাউনলোড করুন
                   </a>
                 )}
                 
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={async () => {
                          try {
                            const response = await fetch(pdfPreviewUrl);
                            const blob = await response.blob();
                            const file = new File([blob], `Report-${new Date().getTime()}.pdf`, { type: 'application/pdf' });
                            if (navigator.share) {
                              await navigator.share({
                                files: [file],
                                title: 'Project Report',
                                text: 'Manage-Me Project Report'
                              });
                            }
                          } catch (e) {
                            showToast('শেয়ার করা সম্ভব হচ্ছে না');
                          }
                      }}
                      className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                    >
                        <Share2 size={18} />
                        শেয়ার
                    </button>

                    <button 
                      onClick={() => {
                        const urlToCopy = pdfPublicUrl || pdfPreviewUrl;
                        if (urlToCopy) {
                          navigator.clipboard.writeText(urlToCopy);
                          showToast('লিংক কপি করা হয়েছে', 'success');
                        }
                      }}
                      className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                    >
                        <Copy size={18} />
                        লিংক কপি
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
