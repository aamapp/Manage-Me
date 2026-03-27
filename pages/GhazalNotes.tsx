
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Plus, Edit2, Trash2, Eye, BookOpen, 
  X, Save, AlertCircle, ChevronRight, Music, MoreVertical, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { GhazalNote } from '@/types';

export const GhazalNotes: React.FC = () => {
  const { user, showToast, ghazalNotes: notes, refreshData, isOnline } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form states
  const [currentNote, setCurrentNote] = useState<Partial<GhazalNote> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

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
    if (!isOnline) {
      showToast('অফলাইনে নতুন গজল যোগ করা যাবে না', 'error');
      return;
    }
    setCurrentNote({ title: '', lyrics: '' });
    setIsEditModalOpen(true);
  };

  const openEditModal = (note: GhazalNote) => {
    if (!isOnline) {
      showToast('অফলাইনে গজল এডিট করা যাবে না', 'error');
      return;
    }
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
    <div className="space-y-4 pb-10">
      {/* Header & Add Button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">গজল তালিকা</h1>
            <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
              <BookOpen size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">{filteredNotes.length} টি গজল পাওয়া গেছে</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={openAddModal}
            disabled={!isOnline}
            className={`bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-2.5 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="সার্চ..." 
            className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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
                className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col relative"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <Music size={18} />
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-base flex-1 line-clamp-1">{note.title}</h3>
                    
                    <div className="flex items-center gap-1 shrink-0 relative action-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === note.id ? null : note.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === note.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openViewModal(note); }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                              >
                                  <Eye size={14} /> বিস্তারিত
                              </button>
                              <div className="h-px bg-slate-50 w-full my-0.5"></div>
                              <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setActiveMenuId(null); 
                                    if (!isOnline) {
                                      showToast('অফলাইনে গজল এডিট করা যাবে না', 'error');
                                      return;
                                    }
                                    openEditModal(note); 
                                  }}
                                  disabled={!isOnline}
                                  className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-colors
                                    ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}
                                  `}
                              >
                                  <Pencil size={14} /> এডিট
                              </button>
                              <div className="h-px bg-slate-50 w-full my-0.5"></div>
                              <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setActiveMenuId(null); 
                                    if (!isOnline) {
                                      showToast('অফলাইনে গজল ডিলিট করা যাবে না', 'error');
                                      return;
                                    }
                                    openDeleteModal(note); 
                                  }}
                                  disabled={!isOnline}
                                  className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-colors
                                    ${!isOnline ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'}
                                  `}
                              >
                                  <Trash2 size={14} /> ডিলিট
                              </button>
                          </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative cursor-pointer" onClick={() => openViewModal(note)}>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 whitespace-pre-line">
                      {note.lyrics}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                </div>
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

      {/* View Full Screen Overlay */}
      {createPortal(
        <AnimatePresence>
          {isViewModalOpen && currentNote && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[2000] bg-white flex flex-col w-full h-[100dvh] overflow-hidden"
            >
            {/* Header */}
            <div className="flex-none h-16 px-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 transition-colors shrink-0"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <Music size={20} />
                </div>
                <h2 className="font-black text-slate-800 text-lg tracking-tight truncate">
                  {currentNote.title}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(currentNote as GhazalNote);
                }}
                className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors shrink-0"
              >
                <Edit2 size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 md:p-10 pb-32">
              <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-100">
                <p className="text-slate-700 text-lg md:text-xl leading-[2.2] whitespace-pre-line font-medium text-center">
                  {currentNote.lyrics}
                </p>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add/Edit Modal */}
      {isEditModalOpen && currentNote && createPortal(
        <div className="fixed inset-0 z-[2000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            {/* Header - Compact */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {currentNote.id ? 'নোট এডিট করুন' : 'নতুন নোট যুক্ত করুন'}
              </h2>
              <button disabled={isSaving} onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Form - Compact Layout */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 pt-3 pb-24 space-y-4 h-full flex flex-col">
                  
                  <div className="space-y-1.5 shrink-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">গজলের শিরোনাম *</label>
                    <input
                      type="text"
                      value={currentNote.title}
                      onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                      placeholder="যেমন: ওগো দয়াময়"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 flex flex-col min-h-[300px]">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">গজলের লিরিক *</label>
                    <textarea
                      value={currentNote.lyrics}
                      onChange={(e) => setCurrentNote({ ...currentNote, lyrics: e.target.value })}
                      placeholder="পুরো লিরিক এখানে লিখুন..."
                      className="w-full h-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>
            </div>
            
            {/* Fixed Bottom Action */}
            <div className="p-4 bg-white border-t border-slate-100 mt-auto shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {createPortal(
        <AnimatePresence>
          {isDeleteModalOpen && currentNote && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
                "<span className="font-bold text-slate-700">{currentNote.title}</span>" নোটটি রিসাইকেল বিনে জমা হবে।
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
