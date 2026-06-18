import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { 
  Check, 
  Loader2, 
  HardDrive, 
  MoreVertical, 
  AlertCircle, 
  ChevronDown, 
  ArrowLeft, 
  Layers, 
  ShieldCheck, 
  ShieldAlert 
} from 'lucide-react';

export const ProjectsBackup: React.FC = () => {
    const navigate = useNavigate();
    const { projects, user, showToast, refreshData } = useAppContext();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);

    const completedProjects = useMemo(() => {
        return projects.filter(p => p.status === 'Completed');
    }, [projects]);

    const backedUpProjects = useMemo(() => {
        return completedProjects.filter(p => (p.notes || '').includes('[BACKUP_DONE]'));
    }, [completedProjects]);

    const pendingBackupProjects = useMemo(() => {
        return completedProjects.filter(p => !(p.notes || '').includes('[BACKUP_DONE]'));
    }, [completedProjects]);

    const uniqueClients = useMemo(() => {
        const clients = completedProjects.map(p => p.clientname).filter(Boolean);
        return Array.from(new Set(clients)) as string[];
    }, [completedProjects]);

    const filteredProjects = useMemo(() => {
        if (selectedClient === 'all') return completedProjects;
        return completedProjects.filter(p => p.clientname === selectedClient);
    }, [completedProjects, selectedClient]);

    const handleClientChange = (client: string) => {
        setIsFiltering(true);
        setSelectedClient(client);
        setIsDropdownOpen(false);
        // Simulate a smart delay to show the spinner
        setTimeout(() => {
            setIsFiltering(false);
        }, 500);
    };

    const handleToggleBackup = async (project: any, status: boolean) => {
        if (!user) return;
        setIsUpdating(project.id);
        setActiveMenuId(null);
        
        let notes = project.notes || '';
        notes = notes.replace(/\[BACKUP_DONE\]/g, '').replace(/\[BACKUP_PENDING\]/g, '').trim();
        
        const newTag = status ? '[BACKUP_DONE]' : '[BACKUP_PENDING]';
        const newNotes = `${newTag} ${notes}`.trim();
        
        try {
            const { error } = await supabase
                .from('projects')
                .update({ notes: newNotes })
                .eq('id', project.id)
                .eq('userid', user.id);
                
            if (error) throw error;
            
            showToast(status ? 'ব্যাকআপ সম্পন্ন হয়েছে' : 'ব্যাকআপ পেন্ডিং তালিকাভুক্ত', 'success');
            await refreshData();
        } catch (err: any) {
            showToast(err.message || 'সেভ করতে সমস্যা হয়েছে', 'error');
        } finally {
            setIsUpdating(null);
        }
    };

    const toBn = (num: number): string => {
        return num.toLocaleString('bn-BD');
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-24 min-h-screen bg-slate-50/50 font-sans">
            {/* Smart Spinner Overlay */}
            {isFiltering && (
                <div className="fixed inset-0 z-[150] bg-white/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-tight">ফিল্টার হচ্ছে...</p>
                    </div>
                </div>
            )}

            {/* Header Content */}
            <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto border-b border-slate-200/50 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 cursor-pointer shrink-0 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">প্রজেক্ট ব্যাকআপ</h1>
                    </div>
                </div>
            </div>

            {/* Dashboard Statistics Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-5xl mx-auto mb-6 px-1">
                {/* Card 1: Total Completed Projects */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-slate-500 text-[10px] sm:text-[13px] font-bold leading-tight text-center select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                        সম্পন্ন প্রজেক্ট
                    </p>
                    <div className="bg-white rounded-xl p-2 sm:p-4 border border-slate-100/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-1.5 sm:gap-3 transition-all hover:border-blue-100 hover:shadow-sm">
                        <div className="min-w-0 flex-1 py-0.5">
                            <h3 className="text-[13px] sm:text-lg md:text-xl font-black text-slate-800 tracking-tight leading-normal truncate">
                                {toBn(completedProjects.length)} টি
                            </h3>
                        </div>
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Layers size={14} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Card 2: Backups Completed */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-slate-500 text-[10px] sm:text-[13px] font-bold leading-tight text-center select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                        ব্যাকআপ হয়েছে
                    </p>
                    <div className="bg-white rounded-xl p-2 sm:p-4 border border-slate-100/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-1.5 sm:gap-3 transition-all hover:border-emerald-100 hover:shadow-sm">
                        <div className="min-w-0 flex-1 py-0.5">
                            <h3 className="text-[13px] sm:text-lg md:text-xl font-black text-emerald-600 tracking-tight leading-normal truncate">
                                {toBn(backedUpProjects.length)} টি
                            </h3>
                        </div>
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={14} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Card 3: Pending Backups */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-slate-500 text-[10px] sm:text-[13px] font-bold leading-tight text-center select-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                        পেন্ডিং ব্যাকআপ
                    </p>
                    <div className="bg-white rounded-xl p-2 sm:p-4 border border-slate-100/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-1.5 sm:gap-3 transition-all hover:border-rose-100 hover:shadow-sm">
                        <div className="min-w-0 flex-1 py-0.5">
                            <h3 className="text-[13px] sm:text-lg md:text-xl font-black text-rose-600 tracking-tight leading-normal truncate">
                                {toBn(pendingBackupProjects.length)} টি
                            </h3>
                        </div>
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <ShieldAlert size={14} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Project list container */}
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 font-sans">প্রজেক্ট তালিকা ({toBn(filteredProjects.length)})</h3>
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">সম্পন্নকৃত প্রজেক্টগুলোর তালিকা</span>
                        </div>
                        
                        {/* Dropdown for Clients aligned to the right inside table header */}
                        <div className="relative shrink-0">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-w-[130px] justify-between shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                                <span className="truncate">{selectedClient === 'all' ? 'সমস্ত ক্লায়েন্ট' : selectedClient}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-[160] max-h-60 overflow-y-auto animate-in zoom-in-95 duration-200 origin-top-right">
                                    <button 
                                        onClick={() => handleClientChange('all')}
                                        className={`w-full text-left px-4 py-3 text-xs font-bold border-b border-slate-50 transition-colors ${selectedClient === 'all' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        সমস্ত ক্লায়েন্ট
                                    </button>
                                    {uniqueClients.map(client => (
                                        <button 
                                            key={client}
                                            onClick={() => handleClientChange(client)}
                                            className={`w-full text-left px-4 py-3 text-xs font-bold border-b border-slate-50 transition-colors ${selectedClient === client ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {client}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`divide-y divide-slate-100 transition-opacity duration-300 ${isFiltering ? 'opacity-30' : 'opacity-100'}`}>
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-16 text-slate-300">
                                <HardDrive size={48} className="mx-auto mb-3 opacity-20 text-slate-400" />
                                <p className="font-bold text-sm text-slate-400">কোনো সম্পন্ন প্রজেক্ট নেই</p>
                                <p className="text-xs text-slate-400 mt-1">প্রথমে প্রজেক্ট পেজে গিয়ে সম্পন্ন করুন</p>
                            </div>
                        ) : (
                            filteredProjects.map(p => {
                                const isDone = (p.notes || '').includes('[BACKUP_DONE]');
                                
                                return (
                                    <div key={p.id} className="px-6 py-4 flex items-center justify-between relative hover:bg-slate-50/50 transition-colors">
                                        <div className='flex items-center gap-4 flex-1 min-w-0'>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                {isDone ? <Check size={18} /> : <AlertCircle size={18} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-sm text-slate-800 truncate leading-snug mb-1">{p.name}</h3>
                                                <div className='flex items-center gap-2 flex-wrap'>
                                                    <p className="text-xs text-slate-500 font-medium truncate max-w-[120px]">
                                                        👤 {p.clientname || 'ক্লায়েন্ট নেই'}
                                                    </p>
                                                    <span className="text-slate-300">•</span>
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition-colors ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                        {isDone ? 'ব্যাকআপ হয়েছে' : 'পেন্ডিং'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative shrink-0 ml-4">
                                            <button 
                                                onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                                                className={`p-2 rounded-xl border border-slate-200 bg-white shadow-sm transition-all active:scale-95 flex items-center justify-center cursor-pointer ${activeMenuId === p.id ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {isUpdating === p.id ? <Loader2 className="animate-spin text-slate-500" size={16} /> : <MoreVertical size={16} />}
                                            </button>
                                            
                                            {activeMenuId === p.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenuId(null)}></div>
                                                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden text-xs animate-in zoom-in-95 duration-200 origin-top-right">
                                                        <button 
                                                            onClick={() => handleToggleBackup(p, true)}
                                                            className="w-full text-left px-4 py-3.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-bold border-b border-slate-50 cursor-pointer"
                                                        >
                                                            <Check size={16} className="text-emerald-500"/> ব্যাকআপ সম্পন্ন করুন
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleBackup(p, false)}
                                                            className="w-full text-left px-4 py-3.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-bold cursor-pointer"
                                                        >
                                                            <AlertCircle size={16} className="text-rose-500"/> ব্যাকআপ পেন্ডিং রাখুন
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
