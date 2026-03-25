
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Eye, BookOpen, 
  X, Save, AlertCircle, ChevronRight, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { GhazalNote } from '@/types';

export const GhazalNotes: React.FC = () => {
  const { user, showToast, ghazalNotes: notes, refreshData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form states
  const [currentNote, setCurrentNote] = useState<Partial<GhazalNote> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.lyrics.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  const handleSave = async () => {
    if (!user || !currentNote?.title || !currentNote?.lyrics) {
      showToast('শিরোনাম এবং লিরিক অবশ্যই দিতে হবে।', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const noteData = {
        title: currentNote.title,
        lyrics: currentNote.lyrics,
        userid: user.id,
      };

      if (currentNote.id) {
        // Update
        const { error } = await supabase
          .from('ghazal_notes')
          .update(noteData)
          .eq('id', currentNote.id);
        if (error) throw error;
        showToast('নোট আপডেট করা হয়েছে।', 'success');
      } else {
        // Create
        const { error } = await supabase
          .from('ghazal_notes')
          .insert([noteData]);
        if (error) throw error;
        showToast('নতুন নোট যুক্ত করা হয়েছে।', 'success');
      }

      setIsEditModalOpen(false);
      await refreshData();
    } catch (error: any) {
      console.error('Error saving note:', error);
      showToast('সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentNote?.id) return;
    try {
      const { error } = await supabase
        .from('ghazal_notes')
        .update({ lyrics: `[TRASH] ${currentNote.lyrics || ''}`.trim() })
        .eq('id', currentNote.id);
      
      if (error) throw error;
      showToast('নোটটি রিসাইকেল বিনে পাঠানো হয়েছে।', 'success');
      setIsDeleteModalOpen(false);
      await refreshData();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      showToast('ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const openAddModal = () => {
    setCurrentNote({ title: '', lyrics: '' });
    setIsEditModalOpen(true);
  };

  const openEditModal = (note: GhazalNote) => {
    setCurrentNote(note);
    setIsEditModalOpen(true);
  };

  const openViewModal = (note: GhazalNote) => {
    setCurrentNote(note);
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (note: GhazalNote) => {
    setCurrentNote(note);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={28} />
            গজল নোট
          </h1>
          <p className="text-slate-500 text-sm font-medium">আপনার প্রিয় গজলের লিরিকগুলো এখানে সংরক্ষণ করুন</p>
        </div>
        
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus size={20} />
          নতুন নোট
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="গজল খুঁজুন (নাম, লেখক বা লিরিক দিয়ে)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
        />
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 animate-pulse space-y-4">
              <div className="h-6 bg-slate-100 rounded-lg w-3/4"></div>
              <div className="h-4 bg-slate-50 rounded-lg w-1/2"></div>
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-slate-50 rounded-lg w-full"></div>
                <div className="h-3 bg-slate-50 rounded-lg w-full"></div>
                <div className="h-3 bg-slate-50 rounded-lg w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <Music size={20} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(note)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(note)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{note.title}</h3>
                  
                  <div className="relative">
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 whitespace-pre-line">
                      {note.lyrics}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                </div>
                
                <button 
                  onClick={() => openViewModal(note)}
                  className="w-full py-4 px-6 bg-slate-50 border-t border-slate-100 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all group/btn"
                >
                  <Eye size={16} className="group-hover/btn:scale-110 transition-transform" />
                  পুরো লিরিক দেখুন
                  <ChevronRight size={16} className="ml-auto opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <BookOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">কোন নোট পাওয়া যায়নি</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-6">আপনার প্রিয় গজলের লিরিকগুলো এখানে লিখে রাখতে পারেন।</p>
          <button 
            onClick={openAddModal}
            className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline"
          >
            <Plus size={18} />
            প্রথম নোট যুক্ত করুন
          </button>
        </div>
      )}

      {/* View Modal */}
      <AnimatePresence>
        {isViewModalOpen && currentNote && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Music size={20} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-800 tracking-tight">{currentNote.title}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-line font-medium text-center">
                  {currentNote.lyrics}
                </p>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                <button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(currentNote as GhazalNote);
                  }}
                  className="flex items-center gap-2 text-indigo-600 font-bold hover:underline"
                >
                  <Edit2 size={16} />
                  এডিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && currentNote && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {currentNote.id ? 'নোট এডিট করুন' : 'নতুন নোট যুক্ত করুন'}
                </h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">গজলের শিরোনাম *</label>
                  <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                    placeholder="যেমন: ওগো দয়াময়"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">গজলের লিরিক *</label>
                  <textarea
                    value={currentNote.lyrics}
                    onChange={(e) => setCurrentNote({ ...currentNote, lyrics: e.target.value })}
                    placeholder="পুরো লিরিক এখানে লিখুন..."
                    rows={10}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 resize-none flex-1 min-h-[200px]"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={20} />
                  )}
                  সংরক্ষণ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && currentNote && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">আপনি কি নিশ্চিত?</h2>
              <p className="text-slate-500 text-sm mb-8">
                "<span className="font-bold text-slate-700">{currentNote.title}</span>" নোটটি চিরতরে ডিলিট হয়ে যাবে।
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  না, থাক
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
                >
                  হ্যাঁ, ডিলিট
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
