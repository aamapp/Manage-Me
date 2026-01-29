
import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Search, Mail, Phone, MoreHorizontal, X, UserCheck, Pencil, Trash2 } from 'lucide-react';
import { CURRENCY } from '../constants';
import { Client } from '../types';
import { useAppContext } from '../context/AppContext';

export const Clients: React.FC = () => {
  const { clients, setClients, projects, setProjects } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    contact: '',
    totalProjects: 0,
    totalEarnings: 0
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

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setNewClient({ name: '', contact: '', totalProjects: 0, totalEarnings: 0 });
    setModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setIsEditing(true);
    setActiveClientId(client.id);
    setNewClient({ ...client });
    setModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteClient = (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই ক্লায়েন্টটি ডিলিট করতে চান?')) {
      const updatedClients = clients.filter(c => c.id !== id);
      setClients(updatedClients);
      setOpenMenuId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    
    if (isEditing && activeClientId) {
      const oldClient = clients.find(c => c.id === activeClientId);
      const newName = newClient.name;

      // ক্লায়েন্ট লিস্ট আপডেট
      setClients(clients.map(c => c.id === activeClientId ? {
        ...newClient as Client,
        id: activeClientId
      } : c));

      // যদি নাম পরিবর্তন হয়, তবে প্রজেক্ট লিস্টেও আপডেট করা (Sync Logic)
      if (oldClient && oldClient.name !== newName) {
        setProjects(prevProjects => prevProjects.map(p => 
          p.clientName === oldClient.name ? { ...p, clientName: newName } : p
        ));
      }
    } else {
      const client: Client = {
        ...newClient as Client,
        id: Math.random().toString(36).substr(2, 9),
        userId: '1'
      };
      setClients([client, ...clients]);
    }
    
    setModalOpen(false);
    setNewClient({ name: '', contact: '', totalProjects: 0, totalEarnings: 0 });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEarningsAll = clients.reduce((acc, curr) => acc + curr.totalEarnings, 0);

  return (
    <div className="space-y-6">
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
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">মোট ক্লায়েন্ট</p>
          <h3 className="text-2xl font-bold text-slate-800">{clients.length} জন</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">সক্রিয় ক্লায়েন্ট</p>
          <h3 className="text-2xl font-bold text-slate-800">{clients.length} জন</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">মোট আয় (সব ক্লায়েন্ট)</p>
          <h3 className="text-2xl font-bold text-indigo-600">{CURRENCY} {totalEarningsAll.toLocaleString('bn-BD')}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-4 border-b flex items-center bg-slate-50/50 rounded-t-2xl">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ক্লায়েন্ট সার্চ করুন..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-900" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-visible">
          {filteredClients.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>কোনো ক্লায়েন্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium">
                  <th className="px-6 py-4">নাম</th>
                  <th className="px-6 py-4">যোগাযোগ</th>
                  <th className="px-6 py-4">মোট প্রজেক্ট</th>
                  <th className="px-6 py-4">মোট আয়</th>
                  <th className="px-6 py-4 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {client.name[0]}
                        </div>
                        <span className="font-semibold text-slate-800">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Phone size={14} /> {client.contact}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{client.totalProjects} টি</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{CURRENCY} {client.totalEarnings.toLocaleString('bn-BD')}</td>
                    <td className="px-6 py-4 text-center relative overflow-visible">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === client.id ? null : client.id);
                        }}
                        className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      
                      {openMenuId === client.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-6 top-1/2 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-150 z-[100]"
                        >
                          <button 
                            onClick={() => handleOpenEditModal(client)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <Pencil size={16} className="text-indigo-500" />
                            <span className="font-semibold">এডিট করুন</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteClient(client.id)}
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditing ? 'ক্লায়েন্ট এডিট করুন' : 'নতুন ক্লায়েন্ট যোগ করুন'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ক্লায়েন্ট বা স্টুডিওর নাম</label>
                <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" placeholder="যেমন: ডিজিটাল স্টুডিও" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">যোগাযোগ (ফোন/ইমেইল)</label>
                <input required type="text" value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" placeholder="০১৭xxxxxxxx" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">প্রজেক্ট সংখ্যা</label>
                  <input type="number" value={newClient.totalProjects || ''} onChange={e => setNewClient({...newClient, totalProjects: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">মোট আয় ({CURRENCY})</label>
                  <input type="number" value={newClient.totalEarnings || ''} onChange={e => setNewClient({...newClient, totalEarnings: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 mt-4 active:scale-95">
                {isEditing ? 'আপডেট করুন' : 'সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
