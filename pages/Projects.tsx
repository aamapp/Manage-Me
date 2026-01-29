
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, MoreVertical, Calendar, DollarSign, Briefcase, X, FolderOpen, Pencil, Trash2, Users, FileText, CheckCircle2, Clock, UserPlus, CalendarDays } from 'lucide-react';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '../constants';
import { Project, ProjectStatus, ProjectType, Client } from '../types';
import { useAppContext } from '../context/AppContext';

export const Projects: React.FC = () => {
  const { projects, setProjects, clients, setClients, user } = useAppContext();
  const currency = user.currency || '৳';
  const [filter, setFilter] = useState<ProjectStatus | 'All'>('All');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    type: 'NasheedSong',
    status: 'Pending',
    totalAmount: 0,
    paidAmount: 0,
    deadline: '',
    createdAt: new Date().toISOString().split('T')[0],
    clientName: '',
    notes: ''
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setClientSearch('');
    setNewProject({ 
      name: '',
      type: 'NasheedSong', 
      status: 'Pending', 
      totalAmount: 0, 
      paidAmount: 0, 
      deadline: '',
      createdAt: new Date().toISOString().split('T')[0],
      clientName: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setIsEditing(true);
    setActiveProjectId(project.id);
    setClientSearch(project.clientName);
    setNewProject({ ...project });
    setModalOpen(true);
    setOpenMenuId(null);
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setViewModalOpen(true);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('আপনি কি নিশ্চিত যে এই প্রজেক্টটি ডিলিট করতে চান?')) {
      setProjects(projects.filter(p => p.id !== id));
      setOpenMenuId(null);
    }
  };

  const syncPaymentRecord = (projId: string, projName: string, clientName: string, amount: number) => {
    if (amount <= 0) return;
    const incomeRecordsRaw = localStorage.getItem(`mm_income_records_${user.id}`);
    const payments = incomeRecordsRaw ? JSON.parse(incomeRecordsRaw) : [];
    
    const newPayment = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: projId,
      project: projName,
      clientName: clientName,
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      method: 'নগদ (অটো-সিঙ্ক)'
    };
    localStorage.setItem(`mm_income_records_${user.id}`, JSON.stringify([newPayment, ...payments]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientName) return;
    
    const totalAmount = Number(newProject.totalAmount) || 0;
    const paidAmount = Number(newProject.paidAmount) || 0;
    const dueAmount = totalAmount - paidAmount;
    const clientName = newProject.clientName.trim();
    const projectName = newProject.name.trim();

    // Client Sync logic
    const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!existingClient) {
      const newClientObj: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: clientName,
        contact: 'যোগ করা হয়নি',
        totalProjects: 1,
        totalEarnings: paidAmount,
        userId: user.id
      };
      setClients(prev => [newClientObj, ...prev]);
    } else if (!isEditing) {
      setClients(prev => prev.map(c => 
        c.id === existingClient.id 
        ? { ...c, totalProjects: c.totalProjects + 1, totalEarnings: c.totalEarnings + paidAmount }
        : c
      ));
    }

    if (isEditing && activeProjectId) {
      const oldProject = projects.find(p => p.id === activeProjectId);
      const deltaPaid = paidAmount - (oldProject?.paidAmount || 0);
      
      // Sync names to income records if project name changed
      const incomeRecordsRaw = localStorage.getItem(`mm_income_records_${user.id}`);
      if (incomeRecordsRaw) {
        const payments = JSON.parse(incomeRecordsRaw);
        const updatedPayments = payments.map((p: any) => 
          p.projectId === activeProjectId ? { ...p, project: projectName, clientName: clientName } : p
        );
        localStorage.setItem(`mm_income_records_${user.id}`, JSON.stringify(updatedPayments));
      }

      if (deltaPaid > 0) syncPaymentRecord(activeProjectId, projectName, clientName, deltaPaid);

      setProjects(projects.map(p => p.id === activeProjectId ? {
        ...newProject as Project,
        id: activeProjectId,
        name: projectName,
        clientName: clientName,
        totalAmount,
        paidAmount,
        dueAmount
      } : p));
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      const project: Project = {
        ...newProject as Project,
        id: newId,
        name: projectName,
        clientName: clientName,
        totalAmount,
        paidAmount,
        dueAmount,
        userId: user.id
      } as Project;
      
      if (paidAmount > 0) syncPaymentRecord(newId, projectName, clientName, paidAmount);
      setProjects([project, ...projects]);
    }
    setModalOpen(false);
  };

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const clientSuggestions = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const isNewClient = clientSearch && !clients.some(c => c.name.toLowerCase() === clientSearch.trim().toLowerCase());

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setNewProject({ ...newProject, clientName: client.name });
    setShowClientSuggestions(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">প্রজেক্ট তালিকা</h1>
          <p className="text-slate-500">আপনার সমস্ত ডাটা লোকাল স্টোরেজে সুরক্ষিত আছে।</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>নতুন প্রজেক্ট</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center bg-slate-50 px-4 py-2.5 rounded-xl gap-2 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="প্রজেক্ট বা ক্লায়েন্ট নাম সার্চ করুন..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button onClick={() => setFilter('All')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${filter === 'All' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>সবগুলো</button>
          {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key as ProjectStatus)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${filter === key ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <FolderOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">কোন প্রজেক্ট পাওয়া যায়নি</h3>
          <p className="text-slate-500 max-w-xs mb-8">নতুন প্রজেক্ট শুরু করতে "নতুন প্রজেক্ট" বাটনে ক্লিক করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
                {openMenuId === p.id && (
                  <div ref={menuRef} className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-100 z-50">
                    <button onClick={(e) => handleOpenEditModal(e, p)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <Pencil size={16} className="text-indigo-500" />
                      <span className="font-semibold">এডিট করুন</span>
                    </button>
                    <button onClick={(e) => handleDeleteProject(e, p.id)} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors">
                      <Trash2 size={16} />
                      <span className="font-semibold">ডিলিট করুন</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{PROJECT_TYPE_LABELS[p.type]}</span>
                <h3 className="text-lg font-bold text-slate-800 mt-2 line-clamp-1 pr-8">{p.name}</h3>
                <p className="text-slate-500 text-sm">{p.clientName}</p>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm flex items-center gap-1"><DollarSign size={14} /> বাজেট</span>
                  <span className="font-bold text-slate-800">{currency} {p.totalAmount.toLocaleString('bn-BD')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm flex items-center gap-1"><Calendar size={14} /> ডেডলাইন</span>
                  <span className="font-medium text-slate-700">{p.deadline}</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs mb-6">
                <span className="text-slate-500">পরিশোধিত: {p.totalAmount > 0 ? Math.round((p.paidAmount / p.totalAmount) * 100) : 0}%</span>
                <span className="text-rose-500 font-semibold">বাকি: {currency} {p.dueAmount.toLocaleString('bn-BD')}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : p.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{PROJECT_STATUS_LABELS[p.status]}</span>
                <button onClick={() => handleViewDetails(p)} className="text-indigo-600 text-sm font-bold hover:underline">ভিউ ডিটেইলস</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aesthetic Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-visible animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'প্রজেক্ট এডিট করুন' : 'নতুন প্রজেক্ট যোগ করুন'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar overflow-x-visible">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">প্রজেক্টের নাম</label>
                <div className="relative">
                   <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input required type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-semibold" placeholder="যেমন: নতুন নাশীদ অ্যালবাম" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative" ref={suggestionRef}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ক্লায়েন্টের নাম</label>
                  <div className="relative">
                    <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required 
                      type="text" 
                      autoComplete="off"
                      value={clientSearch} 
                      onFocus={() => setShowClientSuggestions(true)}
                      onChange={e => {
                        setClientSearch(e.target.value);
                        setNewProject({...newProject, clientName: e.target.value});
                        setShowClientSuggestions(true);
                      }} 
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 ${showClientSuggestions ? 'border-indigo-300' : 'border-slate-200'}`} 
                      placeholder="নাম লিখুন বা সিলেক্ট করুন" 
                    />
                    
                    {showClientSuggestions && (clientSuggestions.length > 0 || isNewClient) && (
                      <div className="absolute z-[110] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                        <div className="max-h-48 overflow-y-auto no-scrollbar py-2">
                          {clientSuggestions.map(c => (
                            <button key={c.id} type="button" onClick={() => handleSelectClient(c)} className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between transition-colors group">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{c.name}</span>
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{c.totalProjects}টি প্রজেক্ট</span>
                            </button>
                          ))}
                          {isNewClient && (
                            <div className="bg-emerald-50 p-3 px-4 border-t border-slate-100 flex items-center gap-3">
                              <UserPlus size={16} className="text-emerald-600" />
                              <p className="text-xs text-slate-700 font-medium leading-tight">"<span className="font-bold text-slate-900">{clientSearch}</span>" নতুন ক্লায়েন্ট হিসেবে যুক্ত হবে।</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">প্রজেক্ট টাইপ</label>
                  <select value={newProject.type} onChange={e => setNewProject({...newProject, type: e.target.value as ProjectType})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium">
                    {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">মোট বাজেট ({currency})</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="number" value={newProject.totalAmount || ''} onChange={e => setNewProject({...newProject, totalAmount: Number(e.target.value)})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">পরিশোধিত ({currency})</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                    <input type="number" value={newProject.paidAmount || ''} onChange={e => setNewProject({...newProject, paidAmount: Number(e.target.value)})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold text-emerald-600" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">যুক্তের তারিখ</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="date" value={newProject.createdAt} onChange={e => setNewProject({...newProject, createdAt: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ডেডলাইন</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input required type="date" value={newProject.deadline} onChange={e => setNewProject({...newProject, deadline: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">বর্তমান অবস্থা</label>
                <select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value as ProjectStatus})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium">
                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">নোটস (ঐচ্ছিক)</label>
                <textarea rows={2} value={newProject.notes} onChange={e => setNewProject({...newProject, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 resize-none font-medium" placeholder="প্রজেক্ট সম্পর্কে কিছু লিখুন..." />
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg active:scale-95 mt-4">
                {isEditing ? 'পরিবর্তন সেভ করুন' : 'প্রজেক্ট সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-700 p-8 text-white relative">
              <button onClick={() => setViewModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
              <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">{PROJECT_TYPE_LABELS[selectedProject.type]}</span>
              <h2 className="text-2xl font-bold mt-4">{selectedProject.name}</h2>
              <p className="text-indigo-100 flex items-center gap-2 mt-1 opacity-80"><Users size={16} />{selectedProject.clientName}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">বাজেট</p><p className="text-lg font-bold text-slate-800">{currency} {selectedProject.totalAmount.toLocaleString('bn-BD')}</p></div>
                <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">পরিশোধিত</p><p className="text-lg font-bold text-emerald-600">{currency} {selectedProject.paidAmount.toLocaleString('bn-BD')}</p></div>
                <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">বকেয়া</p><p className="text-lg font-bold text-rose-500">{currency} {selectedProject.dueAmount.toLocaleString('bn-BD')}</p></div>
                <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">ডেডলাইন</p><p className="text-lg font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" />{selectedProject.deadline}</p></div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${selectedProject.status === 'Completed' ? 'bg-emerald-500' : selectedProject.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                   <span className="font-bold text-slate-700">{PROJECT_STATUS_LABELS[selectedProject.status]}</span>
                </div>
                <button 
                  onClick={() => { setViewModalOpen(false); handleOpenEditModal({ stopPropagation: () => {} } as any, selectedProject); }}
                  className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
                >
                  <Pencil size={16} /> এডিট
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
