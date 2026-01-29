
import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Search, Mail, Phone, MoreHorizontal, X, UserCheck, Pencil, Trash2, Loader2 } from 'lucide-react';
import { CURRENCY } from '../constants';
import { Client } from '../types';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export const Clients: React.FC = () => {
  const { clients, setClients, user, refreshData, showToast } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    contact: '',
    totalprojects: 0,
    totalearnings: 0
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClient = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    if (window.confirm('আপনি কি নিশ্চিত যে এই ক্লায়েন্টটি ডিলিট করতে চান? ডাটাবেস থেকে এটি চিরতরে মুছে যাবে।')) {
      setIsDeleting(id);
      setOpenMenuId(null);
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
        showToast(`ডিলিট করতে সমস্যা: ${err.message}`);
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
    setOpenMenuId(null);
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

  const totalEarningsAll = clients.reduce((acc, curr) => acc + curr.totalearnings, 0);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ক্লায়েন্ট ও স্টুডিও</h1>
          <p className="text-slate-500">আপনার সমস্ত ক্লায়েন্টদের তথ্য এখানে ম্যানেজ করুন।</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>নতুন ক্লায়েন্ট</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
             <Users size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">মোট ক্লায়েন্ট</p>
            <h3 className="text-xl font-bold text-slate-800">{clients.length} জন</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
        <div className="p-4 border-b bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ক্লায়েন্ট সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900 shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          {filteredClients.length === 0 ? (
            <div className="p-20 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">কোনো ক্লায়েন্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-5 border-b border-slate-100">নাম</th>
                  <th className="px-6 py-5 border-b border-slate-100">যোগাযোগ</th>
                  <th className="px-6 py-5 border-b border-slate-100">মোট প্রজেক্ট</th>
                  <th className="px-6 py-5 border-b border-slate-100">মোট আয়</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {client.name ? client.name[0] : 'C'}
                        </div>
                        <span className="font-bold text-slate-800">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={14} className="text-slate-400" />
                        <span>{client.contact}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{client.totalprojects} টি</span>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-800 whitespace-nowrap">{CURRENCY} {client.totalearnings.toLocaleString('bn-BD')}</td>
                    <td className="px-6 py-5 text-center relative overflow-visible">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === client.id ? null : client.id);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center justify-center"
                      >
                        {isDeleting === client.id ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <MoreHorizontal size={20} />}
                      </button>
                      
                      {openMenuId === client.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-150 z-[100]"
                        >
                          <button 
                            onClick={() => handleOpenEditModal(client)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <Pencil size={16} className="text-indigo-500" />
                            <span className="font-semibold">এডিট করুন</span>
                          </button>
                          <button 
                            onClick={(e) => handleDeleteClient(e, client.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors border-t border-slate-50"
                          >
                            <Trash2 size={16} />
                            <span className="font-semibold">ডিলিট করুন</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'ক্লায়েন্ট এডিট করুন' : 'নতুন ক্লায়েন্ট যোগ করুন'}
              </h2>
              <button disabled={isSubmitting} onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ক্লায়েন্ট বা স্টুডিওর নাম</label>
                <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold" placeholder="যেমন: ডিজিটাল স্টুডিও" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">যোগাযোগ (ফোন/ইমেইল)</label>
                <input required type="text" value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold" placeholder="০১৭xxxxxxxx" />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 mt-4 active:scale-95 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={20} className="animate-spin" />}
                {isEditing ? 'আপডেট করুন' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
