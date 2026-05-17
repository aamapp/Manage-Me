import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Check, Loader2, HardDrive, MoreVertical, AlertCircle, Circle, ChevronDown } from 'lucide-react';

export const ProjectsBackup: React.FC = () => {
    const { projects, user, showToast, refreshData } = useAppContext();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [isFiltering, setIsFiltering] = useState(false);

    const completedProjects = useMemo(() => {
        return projects.filter(p => p.status === 'Completed');
    }, [projects]);

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
        }, 600);
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
            
            showToast(status ? 'ব্যাকআপ সম্পন্ন' : 'ব্যাকআপ পেন্ডিং', 'success');
            await refreshData();
        } catch (err: any) {
            showToast(err.message || 'সেভ করতে সমস্যা হয়েছে');
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <div className="space-y-2 p-1 relative min-h-[60vh]">
            {/* Smart Spinner Overlay */}
            {isFiltering && (
                <div className="fixed inset-0 z-[150] bg-white/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">ফিল্টার হচ্ছে...</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-3 px-1 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                        <HardDrive size={18} />
                    </div>
                    <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>প্রজেক্ট ব্যাকআপ</h1>
                </div>

                <div className="relative shrink-0">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 min-w-[110px] justify-between shadow-sm active:bg-slate-50 transition-all"
                    >
                        <span className="truncate">{selectedClient === 'all' ? 'সমস্ত ক্লায়েন্ট' : selectedClient}</span>
                        <ChevronDown size={10} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-[160] max-h-60 overflow-y-auto animate-in zoom-in-95 duration-200 origin-top-right">
                            <button 
                                onClick={() => handleClientChange('all')}
                                className={`w-full text-left px-3 py-2.5 text-[10px] font-bold border-b border-slate-50 ${selectedClient === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                                সমস্ত ক্লায়েন্ট
                            </button>
                            {uniqueClients.map(client => (
                                <button 
                                    key={client}
                                    onClick={() => handleClientChange(client)}
                                    className={`w-full text-left px-3 py-2.5 text-[10px] font-bold border-b border-slate-50 ${selectedClient === client ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    {client}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className={`space-y-1.5 transition-opacity duration-300 ${isFiltering ? 'opacity-30' : 'opacity-100'}`}>
                {filteredProjects.length === 0 ? (
                    <div className="text-center py-10 text-slate-300">
                        <HardDrive size={40} className="mx-auto mb-2 opacity-10" />
                        <p className="font-bold text-xs">কোনো সম্পন্ন প্রজেক্ট নেই</p>
                    </div>
                ) : (
                    filteredProjects.map(p => {
                        const isDone = (p.notes || '').includes('[BACKUP_DONE]');
                        
                        return (
                            <div key={p.id} className="bg-white px-2 py-2 rounded-md border border-slate-100 flex items-center justify-between relative shadow-sm">
                                <div className='flex items-center gap-2.5 flex-1 min-w-0'>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                        {isDone ? <Check size={12} /> : <AlertCircle size={12} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-xs text-slate-800 truncate leading-tight mb-0.5" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{p.name}</h3>
                                        <div className='flex items-center gap-1.5'>
                                            <p className="text-[9px] text-slate-400 font-bold truncate max-w-[80px]">{p.clientname || 'ক্লায়েন্ট নেই'}</p>
                                            <span className={`text-[8px] px-1 py-0.5 rounded font-bold border ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {isDone ? 'ব্যাকআপ হয়েছে' : 'পেন্ডিং'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative shrink-0 ml-2">
                                    <button 
                                        onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${activeMenuId === p.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {isUpdating === p.id ? <Loader2 className="animate-spin" size={14} /> : <MoreVertical size={14} />}
                                    </button>
                                    
                                    {activeMenuId === p.id && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 rounded-lg shadow-xl z-[160] overflow-hidden text-[10px] animate-in zoom-in-95 duration-200 origin-top-right">
                                            <button 
                                                onClick={() => handleToggleBackup(p, true)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold border-b border-slate-50"
                                            >
                                                <Check size={14} className="text-emerald-500"/> ব্যাকআপ সম্পন্ন করুন
                                            </button>
                                            <button 
                                                onClick={() => handleToggleBackup(p, false)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-bold"
                                            >
                                                <AlertCircle size={14} className="text-amber-500"/> ব্যাকআপ পেন্ডিং রাখুন
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
