
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, MoreVertical, Calendar, DollarSign, Briefcase, X, FolderOpen, Pencil, Trash2, Users, FileText, CheckCircle2, Clock, UserPlus, CalendarDays, Loader2, AlertCircle, ChevronDown, Filter } from 'lucide-react';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '../constants';
import { Project, ProjectStatus, ProjectType, Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const Projects: React.FC = () => {
  const { projects, setProjects, clients, setClients, user, refreshData, showToast } = useAppContext();
  const currency = user?.currency || '৳';
  const [filter, setFilter] = useState<ProjectStatus | 'All'>('All');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // New: State to control which card has its menu open
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  
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

  const handleDeleteProject = async (id: string) => {
    if (!user) return;
    
    if (window.confirm('আপনি কি নিশ্চিত যে এই প্রজেক্টটি ডিলিট করতে চান?')) {
      setIsDeleting(id);
      setActiveCardMenuId(null);
      
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id)
          .eq('userid', user.id);
        
        if (error) {
          if (error.code === '23503') {
            throw new Error('এই প্রজেক্টের পেমেন্ট রেকর্ড আছে। আগে আয় রেকর্ড মুছুন।');
          }
          throw error;
        }
        
        showToast('প্রজেক্ট ডিলিট করা হয়েছে', 'success');
        setProjects(prev => prev.filter(p => p.id !== id));
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'ডিলিট করতে সমস্যা হয়েছে');
      } finally {
        setIsDeleting(null);
      }
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
    const totalamount = Number(newProject.totalamount) || 0;
    const paidamount = Number(newProject.paidamount) || 0;
    const dueamount = totalamount - paidamount;
    const clientName = clientSearch.trim();
    const projectName = newProject.name.trim();
    // Handle optional deadline: send null if empty string
    const deadlineToSave = newProject.deadline ? newProject.deadline : null;

    try {
      const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!existingClient) {
        const { data: clientData, error: clientError } = await supabase.from('clients').insert({
          name: clientName,
          contact: 'যোগ করা হয়নি',
          totalprojects: 1,
          totalearnings: paidamount,
          userid: user.id
        }).select().single();
        
        if (clientError) throw clientError;
        if (clientData) setClients(prev => [clientData as any, ...prev]);
      }

      if (isEditing && activeProjectId) {
        const { error: updateError } = await supabase.from('projects').update({
          name: projectName,
          clientname: clientName,
          type: newProject.type,
          totalamount,
          paidamount,
          dueamount,
          status: newProject.status,
          deadline: deadlineToSave,
          notes: newProject.notes
        }).eq('id', activeProjectId).eq('userid', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new project and get the returned data to use the ID
        const { data: insertedProject, error: insertError } = await supabase.from('projects').insert({
          name: projectName,
          clientname: clientName,
          type: newProject.type,
          totalamount,
          paidamount,
          dueamount,
          status: newProject.status,
          deadline: deadlineToSave,
          notes: newProject.notes,
          userid: user.id
        }).select().single();
        
        if (insertError) throw insertError;

        // If paid amount is added during creation, also add it to income records
        if (paidamount > 0 && insertedProject) {
          const { error: incomeError } = await supabase.from('income_records').insert({
            projectid: insertedProject.id,
            projectname: insertedProject.name,
            clientname: insertedProject.clientname,
            amount: paidamount,
            date: insertedProject.createdat || new Date().toISOString().split('T')[0],
            method: 'নগদ (ক্যাশ)', // Default method for initial project creation
            userid: user.id
          });
          
          if (incomeError) console.error('Error auto-creating income record:', incomeError);
        }
      }
      
      await refreshData();
      setModalOpen(false);
      showToast(isEditing ? 'প্রজেক্ট আপডেট হয়েছে' : 'প্রজেক্ট সেভ হয়েছে এবং আয় যুক্ত হয়েছে', 'success');
    } catch (err: any) {
      setFormError(err.message || 'ডাটা সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.clientname || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const clientSuggestions = clients.filter(c => 
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );
  
  const isNewClient = clientSearch && !clients.some(c => c.name.toLowerCase() === clientSearch.trim().toLowerCase());

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setNewProject({ ...newProject, clientname: client.name });
    setShowClientSuggestions(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">প্রজেক্ট তালিকা</h1>
          <p className="text-xs text-slate-500 font-medium">{filteredProjects.length} টি প্রজেক্ট পাওয়া গেছে</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-2.5 flex items-center gap-2 shadow-sm">
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
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Projects List (Cards instead of Table) */}
      <div className="space-y-4 pb-12">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FolderOpen size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          filteredProjects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300">
              {/* Card Header */}
              <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                <div className="flex-1 min-w-0 mr-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {PROJECT_TYPE_LABELS[p.type]}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base mt-1.5 truncate">{p.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <Users size={12} /> {p.clientname}
                  </p>
                </div>
                
                {/* Floating Action Menu Button */}
                <div className="relative action-menu-container">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          setActiveCardMenuId(activeCardMenuId === p.id ? null : p.id);
                      }}
                      className={`p-2 -mr-2 rounded-full transition-colors ${activeCardMenuId === p.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 active:bg-slate-50'}`}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeCardMenuId === p.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(p); }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                                <Pencil size={14} /> এডিট
                            </button>
                            <div className="h-px bg-slate-50 w-full my-0.5"></div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                            >
                                {isDeleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} 
                                ডিলিট
                            </button>
                        </div>
                    )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 pt-3">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">ডেডলাইন</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <Calendar size={14} className="text-slate-400" />
                      {p.deadline ? p.deadline : <span className="text-slate-400 text-xs italic">নির্ধারিত নেই</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">বাজেট</p>
                    <p className="text-lg font-bold text-slate-800">{currency} {p.totalamount.toLocaleString('bn-BD')}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${p.totalamount > 0 ? (p.paidamount / p.totalamount) * 100 : 0}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500">
                    পরিশোধ: <span className="text-slate-800">{Math.round(p.totalamount > 0 ? (p.paidamount / p.totalamount) * 100 : 0)}%</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                    ${p.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      p.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-amber-50 text-amber-600 border-amber-100'}
                  `}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                </div>

                {p.dueamount > 0 && (
                   <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
                     <span className="text-xs font-medium text-slate-500">বাকি আছে</span>
                     <span className="text-sm font-bold text-rose-500">{currency} {p.dueamount.toLocaleString('bn-BD')}</span>
                   </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'প্রজেক্ট এডিট' : 'নতুন প্রজেক্ট'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-5 pb-24">
                  
                  {/* Smart Error Banner */}
                  {formError && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 border border-rose-100 animate-in slide-in-from-top-2">
                       <AlertCircle size={20} className="shrink-0 mt-0.5" />
                       <div>
                         <p className="font-bold text-sm">ত্রুটি!</p>
                         <p className="text-xs font-medium mt-0.5">{formError}</p>
                       </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">প্রজেক্ট নাম</label>
                    <input type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-base" placeholder="নাম লিখুন..." />
                  </div>

                  <div className="relative" ref={clientInputRef}>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">ক্লায়েন্ট</label>
                    <input type="text" value={clientSearch} onFocus={() => setShowClientSuggestions(true)} onChange={e => {setClientSearch(e.target.value); setShowClientSuggestions(true);}} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-base" placeholder="ক্লায়েন্ট খুঁজুন..." />
                    
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

                  <div>
                     <label className="text-sm font-bold text-slate-600 mb-2 block">স্ট্যাটাস</label>
                     <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-base">
                       {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                         <option key={key} value={key}>{label}</option>
                       ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-600 mb-2 block">বাজেট ({currency})</label>
                      <input type="number" value={newProject.totalamount || ''} onChange={e => setNewProject({...newProject, totalamount: Number(e.target.value)})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-base" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-600 mb-2 block">পরিশোধ ({currency})</label>
                      <input type="number" value={newProject.paidamount || ''} onChange={e => setNewProject({...newProject, paidamount: Number(e.target.value)})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none text-base" placeholder="0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-bold text-slate-600 mb-2 block">শুরু</label>
                       <input required type="date" value={newProject.createdat} onChange={e => setNewProject({...newProject, createdat: e.target.value})} className="w-full px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-600 mb-2 block">ডেডলাইন (অপশনাল)</label>
                       <input type="date" value={newProject.deadline} onChange={e => setNewProject({...newProject, deadline: e.target.value})} className="w-full px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                     </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    সেভ করুন
                  </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
