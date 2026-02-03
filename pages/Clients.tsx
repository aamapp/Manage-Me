
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, Search, Phone, MoreHorizontal, X, Pencil, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { CURRENCY } from '../constants';
import { Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { ConfirmModal } from '../components/ConfirmModal';

export const Clients: React.FC = () => {
  const { clients, projects, setClients, user, refreshData, showToast } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    contact: ''
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // Helper function to calculate stats dynamically
  const getClientStats = (clientName: string) => {
    const clientProjects = projects.filter(p => p.clientname === clientName);
    const totalProjects = clientProjects.length;
    // Calculate total earnings based on paid amounts of projects associated with this client
    const totalEarnings = clientProjects.reduce((sum, p) => sum + (p.paidamount || 0), 0);
    return { totalProjects, totalEarnings };
  };

  const initiateDelete = (id: string) => {
    setClientToDelete(id);
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !clientToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete)
        .eq('userid', user.id);
      
      if (error) throw error;
      
      showToast('ক্লায়েন্ট ডিলিট করা হয়েছে', 'success');
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(`সমস্যা: ${err.message}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setNewClient({ name: '', contact: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setIsEditing(true);
    setActiveClientId(client.id);
    setNewClient({ name: client.name, contact: client.contact });
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !user) return;
    setIsSubmitting(true);
    
    try {
      if (isEditing && activeClientId) {
        const originalClient = clients.find(c => c.id === activeClientId);
        const oldName = originalClient?.name;
        const newName = newClient.name;

        // Keep existing contact or default to empty if not edited (since input is hidden)
        const contactToSave = newClient.contact || ''; 

        const { error } = await supabase.from('clients').update({
          name: newName,
          contact: contactToSave
        }).eq('id', activeClientId).eq('userid', user.id);
        
        if (error) throw error;

        if (oldName !== newName) {
           // Update linked projects and income records if client name changes
           await supabase.from('projects').update({ clientname: newName }).eq('clientname', oldName).eq('userid', user.id);
           await supabase.from('income_records').update({ clientname: newName }).eq('clientname', oldName).eq('userid', user.id);
        }

        showToast('ক্লায়েন্ট আপডেট করা হয়েছে', 'success');
      } else {
        const { error } = await supabase.from('clients').insert({
          name: newClient.name,
          contact: '', // Default empty contact as field is removed
          totalprojects: 0, 
          totalearnings: 0,
          userid: user.id
        });
        
        if (error) throw error;
        showToast('নতুন ক্লায়েন্ট যোগ করা হয়েছে', 'success');
      }
      
      await refreshData();
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ক্লায়েন্ট তালিকা</h1>
          <p className="text-xs text-slate-500 font-medium">{clients.length} জন ক্লায়েন্ট</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="ক্লায়েন্ট খুঁজুন..." 
          className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-20">
        {filteredClients.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">কোনো ক্লায়েন্ট নেই</p>
          </div>
        ) : (
          filteredClients.map(client => {
            // Dynamic calculation for display
            const stats = getClientStats(client.name);
            
            return (
              <div key={client.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg">
                      {client.name ? client.name[0] : 'C'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{client.name}</h3>
                      {/* Removed contact display */}
                    </div>
                  </div>
                  
                  {/* Floating Action Menu */}
                  <div className="relative action-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === client.id ? null : client.id);
                        }}
                        className={`p-2 -mr-2 rounded-full transition-colors ${activeMenuId === client.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-indigo-600 active:bg-slate-50'}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {activeMenuId === client.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(client); }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                              >
                                  <Pencil size={14} /> এডিট
                              </button>
                              <div className="h-px bg-slate-50 w-full my-0.5"></div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); initiateDelete(client.id); }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                              >
                                  <Trash2 size={14} /> ডিলিট
                              </button>
                          </div>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-xl">
                  <div className="text-center border-r border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">প্রজেক্ট</p>
                    <p className="font-bold text-slate-800 text-base">{stats.totalProjects} টি</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">মোট আয়</p>
                    <p className="font-bold text-indigo-600 text-base">{CURRENCY} {stats.totalEarnings.toLocaleString('bn-BD')}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="ক্লায়েন্ট ডিলিট"
        message="আপনি কি নিশ্চিত? ক্লায়েন্ট ডিলিট করলে ডাটাবেস থেকে মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।"
        isProcessing={isDeleting}
      />

      {/* Full Screen Modal with Portal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'ক্লায়েন্ট এডিট' : 'নতুন ক্লায়েন্ট'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Form */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-5 pb-24">
                  <div>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">নাম</label>
                    <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-base" placeholder="ক্লায়েন্ট নাম..." />
                  </div>
                  
                  {/* Contact Input Removed */}
                  
                  <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4">
                    {isSubmitting && <Loader2 size={24} className="animate-spin" />}
                    সেভ করুন
                  </button>
                </form>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};
