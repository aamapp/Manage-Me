
import React, { useState, useEffect } from 'react';
import { Tags, Edit2, Trash2, X, Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { EXPENSE_CATEGORY_LABELS } from '../constants';
import { ConfirmModal } from '../components/ConfirmModal';

export const Categories: React.FC = () => {
  const { user, showToast, adminSelectedUserId } = useAppContext();
  const [categories, setCategories] = useState<{name: string, count: number, total: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('expenses').select('category, amount');
    
    // Filter Logic:
    // 1. If Admin has selected a user -> Show ONLY that user's data
    // 2. If Normal User -> Show ONLY their own data
    // 3. If Admin with NO selection -> Show ALL data
    
    if (user.role === 'admin' && adminSelectedUserId) {
        query = query.eq('userid', adminSelectedUserId);
    } else if (user.role !== 'admin') {
        query = query.eq('userid', user.id);
    }

    const { data, error } = await query;
    
    if (error) {
      showToast('ডাটা লোড করতে সমস্যা হয়েছে');
    } else if (data) {
      // Aggregate data
      const catMap = new Map<string, {count: number, total: number}>();
      
      data.forEach((item: any) => {
        const cat = item.category || 'Uncategorized';
        const current = catMap.get(cat) || { count: 0, total: 0 };
        catMap.set(cat, {
          count: current.count + 1,
          total: current.total + item.amount
        });
      });
      
      const sortedCats = Array.from(catMap.entries()).map(([name, stats]) => ({
        name,
        ...stats
      })).sort((a, b) => b.total - a.total);

      setCategories(sortedCats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [user, adminSelectedUserId]); // Re-fetch when admin selects a user

  const handleOpenRename = (currentName: string) => {
    setTargetCategory(currentName);
    setNewName(currentName);
    setRenameModalOpen(true);
  };

  const handleRename = async () => {
    if (!user || !targetCategory || !newName.trim() || targetCategory === newName) return;
    setIsProcessing(true);

    try {
      let query = supabase
        .from('expenses')
        .update({ category: newName.trim() })
        .eq('category', targetCategory);
        
      if (user.role !== 'admin') {
         query = query.eq('userid', user.id);
      }
      
      // If admin is viewing specific user, ensure we only rename for that user if possible
      // Note: Current DB structure doesn't easily allow filtering UPDATE by user if userid isn't unique to the category logic
      // But since expenses row has userid, we SHOULD limit it to avoid touching other users' data if names collide globally
      if (user.role === 'admin' && adminSelectedUserId) {
          query = query.eq('userid', adminSelectedUserId);
      }

      const { error } = await query;

      if (error) throw error;
      
      showToast('ক্যাটাগরি সফলভাবে রিনেম হয়েছে', 'success');
      setRenameModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || 'সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateDelete = (categoryName: string) => {
    setCategoryToDelete(categoryName);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !categoryToDelete) return;
    setIsDeleting(true);
    
    try {
        let query = supabase.from('expenses').delete().eq('category', categoryToDelete);
        
        if (user.role !== 'admin') {
            query = query.eq('userid', user.id);
        }
        
        // Ensure Admin only deletes for selected user
        if (user.role === 'admin' && adminSelectedUserId) {
            query = query.eq('userid', adminSelectedUserId);
        }

        const { error } = await query;
        
        if (error) throw error;
        showToast('ক্যাটাগরি এবং সংশ্লিষ্ট খরচ মুছে ফেলা হয়েছে', 'success');
        fetchCategories();
        setShowDeleteModal(false);
    } catch (err: any) {
        showToast(err.message);
        setShowDeleteModal(false);
    } finally {
        setIsDeleting(false);
        setCategoryToDelete(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
             {user?.role === 'admin' ? (adminSelectedUserId ? 'ইউজার খরচ খাত' : 'খরচের খাত (অ্যাডমিন)') : 'খরচের খাত'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">ক্যাটাগরি ম্যানেজমেন্ট</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
           <Tags size={20} />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : categories.length === 0 ? (
           <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <Tags size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">কোনো ক্যাটাগরি নেই</p>
            <p className="text-xs mt-1">খরচ যুক্ত করার সময় ক্যাটাগরি তৈরি হবে</p>
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div>
                <h3 className="font-bold text-slate-800 text-base">{EXPENSE_CATEGORY_LABELS[cat.name] || cat.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                   {cat.count} টি রেকর্ড • মোট: {user?.currency} {cat.total.toLocaleString('bn-BD')}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenRename(cat.name)}
                  className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => initiateDelete(cat.name)}
                  className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="ক্যাটাগরি ডিলিট"
        message={`সতর্কতা: আপনি "${categoryToDelete}" ক্যাটাগরি ডিলিট করছেন। এর সাথে যুক্ত সকল খরচের রেকর্ড মুছে যাবে। আপনি কি নিশ্চিত?`}
        isProcessing={isDeleting}
      />

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">ক্যাটাগরি রিনেম</h3>
              <button onClick={() => setRenameModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-xs font-medium mb-4 flex gap-2">
               <AlertTriangle size={16} className="shrink-0" />
               <p>নাম পরিবর্তন করলে এই ক্যাটাগরির সকল খরচের রেকর্ডে নাম আপডেট হয়ে যাবে।</p>
            </div>

            <label className="block text-sm font-bold text-slate-600 mb-2">নতুন নাম</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
            />

            <button 
              onClick={handleRename}
              disabled={isProcessing}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex justify-center items-center gap-2"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              সেভ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
