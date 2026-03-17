import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Trash2, RotateCcw, AlertTriangle, FolderOpen, Music, Users, Clock, CheckCircle2, Play } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PROJECT_STATUS_LABELS } from '@/constants';

const Trash = () => {
  const { trashedProjects, user, refreshData, showToast, setTrashedProjects } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState<string | null>(null);
  const [projectToPermanentDelete, setProjectToPermanentDelete] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currency = user?.currency || '৳';

  const handleRestore = async () => {
    if (!user || !projectToRestore) return;
    setIsProcessing(true);
    
    try {
      const project = trashedProjects.find(p => p.id === projectToRestore);
      if (!project) throw new Error('প্রজেক্ট পাওয়া যায়নি');

      const newNotes = project.notes?.replace('[TRASH]', '') || '';

      const { error } = await supabase
        .from('projects')
        .update({ notes: newNotes })
        .eq('id', projectToRestore)
        .eq('userid', user.id);
      
      if (error) throw error;
      
      showToast('প্রজেক্ট রিস্টোর করা হয়েছে', 'success');
      await refreshData();
      setShowRestoreModal(false);
    } catch (err: any) {
      showToast(err.message || 'রিস্টোর করতে সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
      setProjectToRestore(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!user || !projectToPermanentDelete) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToPermanentDelete)
        .eq('userid', user.id);
      
      if (error) {
        if (error.code === '23503') {
          throw new Error('এই প্রজেক্টের পেমেন্ট রেকর্ড আছে। আগে আয় রেকর্ড মুছুন।');
        }
        throw error;
      }
      
      showToast('প্রজেক্ট স্থায়ীভাবে ডিলিট করা হয়েছে', 'success');
      setTrashedProjects(prev => prev.filter(p => p.id !== projectToPermanentDelete));
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(err.message || 'ডিলিট করতে সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
      setProjectToPermanentDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-24 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Trash2 className="text-rose-500" size={24} /> রিসাইকেল বিন
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">ডিলিট করা প্রজেক্টগুলো এখানে জমা থাকে</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trashedProjects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
            <Trash2 size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">রিসাইকেল বিন খালি</p>
          </div>
        ) : (
          trashedProjects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-rose-100 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-400"></div>
              <div className="px-4 py-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                       <Music size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-snug">{p.name}</h3>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Users size={10} /> {p.clientname}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setProjectToRestore(p.id); setShowRestoreModal(true); }}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                      title="রিস্টোর করুন"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                      onClick={() => { setProjectToPermanentDelete(p.id); setShowDeleteModal(true); }}
                      className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                      title="স্থায়ীভাবে ডিলিট করুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">বাজেট</span>
                    <span className="text-xs font-black text-slate-800">{currency}{p.totalamount.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">আদায়</span>
                    <span className="text-xs font-black text-slate-700">{currency}{p.paidamount.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">বকেয়া</span>
                    <span className="text-xs font-black text-slate-700">{currency}{p.dueamount.toLocaleString('bn-BD')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal 
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleRestore}
        title="প্রজেক্ট রিস্টোর"
        message="আপনি কি এই প্রজেক্টটি পুনরায় ফিরিয়ে আনতে চান?"
        isProcessing={isProcessing}
      />

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handlePermanentDelete}
        title="স্থায়ীভাবে ডিলিট"
        message="আপনি কি নিশ্চিত যে এই প্রজেক্টটি স্থায়ীভাবে ডিলিট করতে চান? এটি আর ফিরিয়ে আনা সম্ভব হবে না।"
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default Trash;
