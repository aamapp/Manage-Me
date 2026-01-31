
import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Search, Phone, MoreHorizontal, X, Pencil, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { CURRENCY } from '../constants';
import { Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const Clients: React.FC = () => {
  const { clients, setClients, user, refreshData, showToast } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    contact: '',
    totalprojects: 0,
    totalearnings: 0
  });

  const handleDeleteClient = async (id: string) => {
    if (!user) return;
    if (window.confirm('আপনি কি নিশ্চিত? ক্লায়েন্ট ডিলিট করলে ডাটাবেস থেকে মুছে যাবে।')) {
      setIsDeleting(id);
      setActiveMenuId(null);
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)
          .eq('userid', user.id);
        
        if (error) throw error;
        
        showToast('ক্লায়েন্ট ডিলিট করা হয়েছে', 'success');
        await refreshData();
      } catch (err: any) {
        showToast(`সমস্যা: ${err.message}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setNewClient({ name: '', contact: '', totalprojects: 0, totalearnings: 0 });
    setModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setIsEditing(true);
    setActiveClientId(client.id);
    setNewClient({ ...client });
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

        const { error } = await supabase.from('clients').update({
          name: newName,
          contact: newClient.contact,
          totalprojects: newClient.totalprojects,
          totalearnings: newClient.totalearnings
        }).eq('id', activeClientId).eq('userid', user.id);
        
        if (error) throw error;

        if (oldName !== newName) {
           await supabase.from('projects').update({ clientname: newName }).eq('clientname', oldName).eq('userid', user.id);
           await supabase.from('income_records').update({ clientname: newName }).eq('clientname', oldName).eq('userid', user.id);
        }

        showToast('ক্লায়েন্ট আপডেট করা হয়েছে', 'success');
      } else {
        const { error } = await supabase.from('clients').insert({
          name: newClient.name,
          contact: newClient.contact,
          totalprojects: newClient.totalprojects || 0,
          totalearnings: newClient.totalearnings || 0,
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
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.contact || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ক্লায়েন্ট তালিকা</h1>
          <p className="text-xs text-slate-500">{clients.length} জন ক্লায়েন্ট</p>
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
          className="w-full bg-transparent outline-none text-sm font-medium" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3 pb-20">
        {filteredClients.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>কোনো ক্লায়েন্ট নেই</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg">
                    {client.name ? client.name[0] : 'C'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{client.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone size={10} /> {client.contact || 'N/A'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                  className="p-2 -mr-2 text-slate-300 hover:text-indigo-600"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-xl">
                 <div className="text-center border-r border-slate-200">
                   <p className="text-[10px] text-slate-400 font-bold uppercase">প্রজেক্ট</p>
                   <p className="font-bold text-slate-800">{client.totalprojects} টি</p>
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] text-slate-400 font-bold uppercase">মোট আয়</p>
                   <p className="font-bold text-indigo-600">{CURRENCY} {client.totalearnings.toLocaleString('bn-BD')}</p>
                 </div>
              </div>

              {activeMenuId === client.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 animate-in fade-in">
                  <button onClick={() => handleOpenEditModal(client)} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
                    <Pencil size={14} /> এডিট
                  </button>
                  <button onClick={() => handleDeleteClient(client.id)} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 flex items-center justify-center gap-2">
                    <Trash2 size={14} /> ডিলিট
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? 'ক্লায়েন্ট এডিট' : 'নতুন ক্লায়েন্ট'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">নাম</label>
                <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ক্লায়েন্ট নাম..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">যোগাযোগ</label>
                <input required type="text" value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="মোবাইল নম্বর..." />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4 mb-4">
                {isSubmitting && <Loader2 size={20} className="animate-spin" />}
                সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
