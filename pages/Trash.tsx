import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  RotateCcw, 
  Receipt, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Briefcase,
  Users,
  BookOpen,
  ShoppingBag,
  Coins,
  User
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

type TrashTab = 'projects' | 'clients' | 'expenses' | 'ghazal_notes' | 'shopping_lists' | 'due_persons' | 'wallets';

const Trash: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user,
    trashedProjects, 
    trashedExpenses, 
    trashedGhazalNotes, 
    trashedClients,
    trashedShoppingLists,
    trashedDuePersons,
    showToast, refreshData, isOnline
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<TrashTab>('projects');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<{ ids: string[]; type: TrashTab; action: 'restore' | 'delete' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [trashedWallets, setTrashedWallets] = useState<any[]>([]);

  // Clear selections when switching tabs
  React.useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const fetchTrashedWallets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('userid', user.id);
      if (error) throw error;
      if (data) {
        const filtered = data.filter((w: any) => w.name && w.name.startsWith('[TRASH]'));
        setTrashedWallets(filtered);
      }
    } catch (err) {
      console.error("Error fetching trashed wallets:", err);
    }
  };

  React.useEffect(() => {
    fetchTrashedWallets();
  }, [user]);

  const getCurrentTabItems = () => {
    switch (activeTab) {
      case 'projects': return trashedProjects;
      case 'clients': return trashedClients;
      case 'expenses': return trashedExpenses;
      case 'ghazal_notes': return trashedGhazalNotes;
      case 'shopping_lists': return trashedShoppingLists;
      case 'due_persons': return trashedDuePersons;
      case 'wallets': return trashedWallets;
      default: return [];
    }
  };

  const currentItems = getCurrentTabItems();
  const isAllSelected = currentItems.length > 0 && selectedIds.length === currentItems.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentItems.map((item: any) => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const executeRestoreItems = async (idsToRestore: string[], tabType: TrashTab) => {
    if (idsToRestore.length === 0) return;
    setIsRestoring(true);
    try {
      for (const id of idsToRestore) {
        if (tabType === 'projects') {
          const project = trashedProjects.find(p => p.id === id);
          const updateData = { notes: project?.notes?.replace('[TRASH]', '').trim() || '' };
          await supabase.from('projects').update(updateData).eq('id', id);
        } else if (tabType === 'expenses') {
          const expense = trashedExpenses.find(e => e.id === id);
          const updateData = { notes: expense?.notes?.replace('[TRASH]', '').trim() || '' };
          await supabase.from('expenses').update(updateData).eq('id', id);
        } else if (tabType === 'ghazal_notes') {
          const note = trashedGhazalNotes.find(n => n.id === id);
          const updateData = { lyrics: note?.lyrics?.replace('[TRASH]', '').trim() || '' };
          await supabase.from('ghazal_notes').update(updateData).eq('id', id);
        } else if (tabType === 'clients') {
          const client = trashedClients.find(c => c.id === id);
          const updateData = { contact: client?.contact?.replace('[TRASH]', '').trim() || '' };
          await supabase.from('clients').update(updateData).eq('id', id);
        } else if (tabType === 'shopping_lists') {
          const list = trashedShoppingLists.find(s => s.id === id);
          const updateData = { title: list?.title?.replace('[TRASH]', '').trim() || '' };
          await supabase.from('shopping_lists').update(updateData).eq('id', id);
        } else if (tabType === 'due_persons') {
          const person = trashedDuePersons.find(d => d.id === id);
          const originalName = person?.name?.replace('[TRASH]', '').trim() || '';
          await supabase.from('due_persons').update({ name: originalName }).eq('id', id);

          if (person && person.transactions && person.transactions.length > 0) {
            const dueTxIds: string[] = [];
            const expenseIdsToRestore: string[] = [];
            person.transactions.forEach((tx: any) => {
              if (tx.expense_id) expenseIdsToRestore.push(tx.expense_id);
              if (tx.id) dueTxIds.push(tx.id);
            });

            for (const txId of dueTxIds) {
              const { data: expData } = await supabase
                .from('expenses')
                .select('id')
                .ilike('notes', `%[due_tx_id:${txId}]%`);

              if (expData) {
                expData.forEach((e: any) => {
                  if (!expenseIdsToRestore.includes(e.id)) expenseIdsToRestore.push(e.id);
                });
              }
            }

            if (expenseIdsToRestore.length > 0) {
              const { data: expensesToRestore } = await supabase
                .from('expenses')
                .select('id, notes')
                .in('id', expenseIdsToRestore);

              if (expensesToRestore) {
                for (const exp of expensesToRestore) {
                  if (exp.notes && exp.notes.startsWith('[TRASH]')) {
                    await supabase
                      .from('expenses')
                      .update({ notes: exp.notes.replace('[TRASH]', '').trim() })
                      .eq('id', exp.id);
                  }
                }
              }
            }
          }
        } else if (tabType === 'wallets') {
          const wallet = trashedWallets.find(w => w.id === id);
          const originalName = wallet?.name?.replace('[TRASH]', '').trim() || '';
          await supabase.from('wallets').update({ name: originalName }).eq('id', id);

          if (user) {
            const { data: expData } = await supabase
              .from('expenses')
              .select('*')
              .eq('userid', user.id);

            if (expData) {
              const targetExpenses = expData.filter((e: any) => {
                if (!e.notes || !e.notes.startsWith('[TRASH]')) return false;
                return e.notes.includes(`[ওয়ালেট: ${originalName}]`);
              });

              for (const exp of targetExpenses) {
                await supabase
                  .from('expenses')
                  .update({ notes: exp.notes.replace('[TRASH]', '').trim() })
                  .eq('id', exp.id);
              }
            }
          }
        }
      }

      showToast(
        idsToRestore.length > 1
          ? `${idsToRestore.length}টি আইটেম রিস্টোর করা হয়েছে`
          : 'সফলভাবে রিস্টোর করা হয়েছে',
        'success'
      );

      if (tabType === 'wallets') {
        fetchTrashedWallets();
        window.dispatchEvent(new CustomEvent('wallets-updated'));
      }
      await refreshData();
      setSelectedIds([]);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsRestoring(false);
      setShowConfirm(false);
      setPendingAction(null);
    }
  };

  const executeDeleteItems = async (idsToDelete: string[], tabType: TrashTab) => {
    if (idsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      for (const id of idsToDelete) {
        if (tabType === 'wallets') {
          const wallet = trashedWallets.find(w => w.id === id);
          if (wallet && user) {
            const originalName = wallet.name.replace('[TRASH]', '').trim();
            const { data: expData } = await supabase
              .from('expenses')
              .select('id, notes')
              .eq('userid', user.id);

            if (expData) {
              const expIdsToDelete = expData
                .filter((e: any) => e.notes && e.notes.includes(`[ওয়ালেট: ${originalName}]`))
                .map((e: any) => e.id);

              if (expIdsToDelete.length > 0) {
                await supabase.from('expenses').delete().in('id', expIdsToDelete);
              }
            }

            await supabase
              .from('income_records')
              .delete()
              .eq('userid', user.id)
              .eq('method', originalName);
          }
          await supabase.from('wallets').delete().eq('id', id);
        } else if (tabType === 'due_persons') {
          const person = trashedDuePersons.find(d => d.id === id);
          if (person && user) {
            const expenseIdsToDelete: string[] = [];
            const dueTxIds: string[] = [];

            if (person.transactions && person.transactions.length > 0) {
              person.transactions.forEach((tx: any) => {
                if (tx.expense_id) expenseIdsToDelete.push(tx.expense_id);
                if (tx.id) dueTxIds.push(tx.id);
              });

              for (const txId of dueTxIds) {
                const { data: expData } = await supabase
                  .from('expenses')
                  .select('id')
                  .ilike('notes', `%[due_tx_id:${txId}]%`);

                if (expData) {
                  expData.forEach((e: any) => {
                    if (!expenseIdsToDelete.includes(e.id)) expenseIdsToDelete.push(e.id);
                  });
                }
              }

              if (expenseIdsToDelete.length > 0) {
                await supabase.from('expenses').delete().in('id', expenseIdsToDelete);
              }
            }
          }
          await supabase.from('due_persons').delete().eq('id', id);
        } else if (tabType === 'clients') {
          const client = trashedClients.find(c => c.id === id);
          if (client) {
            await supabase.from('projects').delete().eq('clientname', client.name);
            await supabase.from('income_records').delete().eq('clientname', client.name);
          }
          await supabase.from('clients').delete().eq('id', id);
        } else {
          const table =
            tabType === 'projects' ? 'projects' :
            tabType === 'expenses' ? 'expenses' :
            tabType === 'ghazal_notes' ? 'ghazal_notes' : 'shopping_lists';

          await supabase.from(table).delete().eq('id', id);
        }
      }

      showToast(
        idsToDelete.length > 1
          ? `${idsToDelete.length}টি আইটেম স্থায়ীভাবে মুছে ফেলা হয়েছে`
          : 'স্থায়ীভাবে মুছে ফেলা হয়েছে',
        'success'
      );

      if (tabType === 'wallets') {
        fetchTrashedWallets();
        window.dispatchEvent(new CustomEvent('wallets-updated'));
      }
      await refreshData();
      setSelectedIds([]);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setPendingAction(null);
    }
  };

  const openConfirm = (id: string, type: TrashTab, action: 'restore' | 'delete') => {
    if (!isOnline) {
      showToast(`অফলাইনে ${action === 'restore' ? 'রিস্টোর' : 'ডিলিট'} করা যাবে না`, 'error');
      return;
    }
    setPendingAction({ ids: [id], type, action });
    setShowConfirm(true);
  };

  const openBulkConfirm = (action: 'restore' | 'delete') => {
    if (!isOnline) {
      showToast(`অফলাইনে ${action === 'restore' ? 'রিস্টোর' : 'ডিলিট'} করা যাবে না`, 'error');
      return;
    }
    if (selectedIds.length === 0) return;
    setPendingAction({ ids: selectedIds, type: activeTab, action });
    setShowConfirm(true);
  };

  const handleRestore = () => {
    if (pendingAction) {
      executeRestoreItems(pendingAction.ids, pendingAction.type);
    }
  };

  const handlePermanentDelete = () => {
    if (pendingAction) {
      executeDeleteItems(pendingAction.ids, pendingAction.type);
    }
  };

  const renderProjects = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedProjects.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা প্রজেক্ট নেই</p>
        </div>
      ) : (
        trashedProjects.map((project) => {
          const isSelected = selectedIds.includes(project.id);
          return (
            <div key={project.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(project.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{project.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-4 h-4 text-slate-400 shrink-0" /> 
                    <span className="truncate">{project.clientname || 'Unknown Client'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-400 shrink-0" /> <span>বাজেট: ৳{project.totalamount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> <span>পেইড: ৳{project.paidamount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" /> <span>ডিউ: ৳{project.dueamount}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100 font-sans">
                <button
                  onClick={() => openConfirm(project.id, 'projects', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(project.id, 'projects', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderClients = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedClients.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা ক্লায়েন্ট নেই</p>
        </div>
      ) : (
        trashedClients.map((client) => {
          const isSelected = selectedIds.includes(client.id);
          return (
            <div key={client.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(client.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{client.name}</h3>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono break-all mt-2 max-h-32 overflow-y-auto">
                  {client.contact.replace('[TRASH]', '').trim()}
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openConfirm(client.id, 'clients', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(client.id, 'clients', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedExpenses.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা খরচ নেই</p>
        </div>
      ) : (
        trashedExpenses.map((expense) => {
          const isSelected = selectedIds.includes(expense.id);
          return (
            <div key={expense.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(expense.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{expense.category}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-400" /> <span>পরিমাণ: ৳{expense.amount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> <span>তারিখ: {new Date(expense.date).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>
                {expense.notes && (
                  <div className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{expense.notes.replace('[TRASH]', '').trim()}"
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openConfirm(expense.id, 'expenses', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(expense.id, 'expenses', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderGhazalNotes = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedGhazalNotes.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা গজল নোট নেই</p>
        </div>
      ) : (
        trashedGhazalNotes.map((note) => {
          const isSelected = selectedIds.includes(note.id);
          return (
            <div key={note.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(note.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{note.title}</h3>
                </div>
                <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line font-serif">
                  {note.lyrics.replace('[TRASH]', '').trim()}
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openConfirm(note.id, 'ghazal_notes', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(note.id, 'ghazal_notes', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderShoppingLists = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedShoppingLists.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা শপিং লিস্ট নেই</p>
        </div>
      ) : (
        trashedShoppingLists.map((list) => {
          const isSelected = selectedIds.includes(list.id);
          return (
            <div key={list.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(list.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{list.title.replace('[TRASH]', '').trim()}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> <span>তারিখ: {new Date(list.date).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-400" /> <span>{list.items?.length || 0} টি পণ্য</span>
                  </div>
                </div>
                <div className="text-slate-700 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg inline-block text-sm border border-slate-100">
                  মোট বাজেট: ৳{list.totalamount}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openConfirm(list.id, 'shopping_lists', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(list.id, 'shopping_lists', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderDuePersons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedDuePersons.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <svg
            className="w-12 h-12 text-slate-300 mx-auto mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 4v16l-4.5-4.5" />
            <path d="M15 20V4l4.5 4.5" />
          </svg>
          <p className="text-slate-500 font-medium">কোন ডিলিট করা দেনা-পাওনা হিসাব নেই</p>
        </div>
      ) : (
        trashedDuePersons.map((person) => {
          const isSelected = selectedIds.includes(person.id);
          const balance = person.transactions ? person.transactions.reduce((acc: number, tx: any) => {
            if (tx.type === 'receive') return acc + tx.amount;
            if (tx.type === 'give') return acc - tx.amount;
            return acc;
          }, 0) : 0;

          return (
            <div key={person.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(person.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 4v16l-4.5-4.5" />
                      <path d="M15 20V4l4.5 4.5" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{person.name.replace('[TRASH]', '').trim()}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{person.phone || 'ফোন নম্বর নেই'}</span>
                  </div>
                  {person.address && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{person.address}</span>
                    </div>
                  )}
                </div>
                <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg inline-block border ${
                  balance >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'
                }`}>
                  {balance >= 0 ? `পাবেন: ৳${balance}` : `দেবেন: ৳${Math.abs(balance)}`}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 font-sans">
                <button
                  onClick={() => openConfirm(person.id, 'due_persons', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(person.id, 'due_persons', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderWallets = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trashedWallets.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">কোন ডিলিট করা ওয়ালেট নেই</p>
        </div>
      ) : (
        trashedWallets.map((wallet) => {
          const isSelected = selectedIds.includes(wallet.id);
          const originalName = wallet.name.replace('[TRASH]', '').trim();
          return (
            <div key={wallet.id} className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isSelected ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-150 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectItem(wallet.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{originalName}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-slate-400 shrink-0" /> <span>ব্যালেন্স: ৳{wallet.balance}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" /> <span>তৈরি: {new Date(wallet.createdAt || wallet.created_at || Date.now()).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100 font-sans">
                <button
                  onClick={() => openConfirm(wallet.id, 'wallets', 'restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" /> রিস্টোর
                </button>
                <button
                  onClick={() => openConfirm(wallet.id, 'wallets', 'delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-colors duration-200 cursor-pointer ${!isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" /> ডিলিট
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-24 pt-0 min-h-screen bg-slate-50/50 font-sans">
      {/* Header Content */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-between mb-2.5 max-w-5xl mx-auto border-b border-slate-200/60 h-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 hover:border-slate-300 cursor-pointer shrink-0 shadow-sm"
            title="ড্যাশবোর্ডে ফিরে যান"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">রিসাইকেল বিন</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header Tabs styled like Expenses Page */}
        <div className="max-w-2xl mx-auto sticky top-14 z-40 bg-white/95 backdrop-blur-md h-14 text-slate-800 border sm:border sm:rounded-2xl border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] select-none mb-4">
          <div className="flex items-center justify-between w-full h-full px-2 relative">
            
            {/* Tab 1: Projects */}
            <button
              onClick={() => setActiveTab('projects')}
              title="ডিলিট করা প্রজেক্ট সমূহ"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'projects'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <Briefcase size={14} strokeWidth={2.4} />
                {trashedProjects.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'projects' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedProjects.length}
                  </span>
                )}
              </div>
              {activeTab === 'projects' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 2: Clients */}
            <button
              onClick={() => setActiveTab('clients')}
              title="ডিলিট করা ক্লায়েন্ট সমূহ"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'clients'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <Users size={14} strokeWidth={2.4} />
                {trashedClients.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'clients' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedClients.length}
                  </span>
                )}
              </div>
              {activeTab === 'clients' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 3: Expenses */}
            <button
              onClick={() => setActiveTab('expenses')}
              title="ডিলিট করা খরচ সমূহ"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'expenses'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 9H4l4.5-4.5" />
                  <path d="M4 15h16l-4.5 4.5" />
                </svg>
                {trashedExpenses.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'expenses' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedExpenses.length}
                  </span>
                )}
              </div>
              {activeTab === 'expenses' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 4: Due Persons */}
            <button
              onClick={() => setActiveTab('due_persons')}
              title="ডিলিট করা দেনা-পাওনা হিসাব"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'due_persons'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 4v16l-4.5-4.5" />
                  <path d="M15 20V4l4.5 4.5" />
                </svg>
                {trashedDuePersons.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'due_persons' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedDuePersons.length}
                  </span>
                )}
              </div>
              {activeTab === 'due_persons' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 5: Ghazal Notes */}
            <button
              onClick={() => setActiveTab('ghazal_notes')}
              title="ডিলিট করা গজল নোট সমূহ"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'ghazal_notes'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <BookOpen size={14} strokeWidth={2.4} />
                {trashedGhazalNotes.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'ghazal_notes' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedGhazalNotes.length}
                  </span>
                )}
              </div>
              {activeTab === 'ghazal_notes' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 6: Shopping Lists */}
            <button
              onClick={() => setActiveTab('shopping_lists')}
              title="ডিলিট করা বাজার লিস্ট"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'shopping_lists'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <ShoppingBag size={14} strokeWidth={2.4} />
                {trashedShoppingLists.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'shopping_lists' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedShoppingLists.length}
                  </span>
                )}
              </div>
              {activeTab === 'shopping_lists' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

            {/* Tab 7: Wallets */}
            <button
              onClick={() => setActiveTab('wallets')}
              title="ডিলিট করা ওয়ালেট সমূহ"
              className="flex flex-col items-center justify-center h-full w-[44px] cursor-pointer group focus:outline-none relative"
            >
              <div
                className={`w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === 'wallets'
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <Coins size={14} strokeWidth={2.4} />
                {trashedWallets.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 px-0.5 rounded-full text-[8.5px] font-sans font-bold flex items-center justify-center border ${
                    activeTab === 'wallets' ? 'bg-white text-[#1a73e8] border-[#1a73e8]' : 'bg-[#eff6ff] text-[#1a73e8] border-[#dbeafe]'
                  }`}>
                    {trashedWallets.length}
                  </span>
                )}
              </div>
              {activeTab === 'wallets' && (
                <div className="absolute bottom-0 h-[3px] w-7 bg-[#1a73e8] rounded-t-[3px]" />
              )}
            </button>

          </div>
        </div>

        {/* Select All & Bulk Action Bar */}
        {currentItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 font-medium text-sm">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer"
              />
              <span>সব নির্বাচন করুন</span>
              {selectedIds.length > 0 && (
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-bold border border-blue-100">
                  {selectedIds.length} / {currentItems.length}
                </span>
              )}
            </label>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openBulkConfirm('restore')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                    !isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> রিস্টোর করুন ({selectedIds.length})
                </button>
                <button
                  onClick={() => openBulkConfirm('delete')}
                  disabled={!isOnline}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
                    !isOnline ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-red-600 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> ডিলিট করুন ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content with dynamic transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === 'projects' && renderProjects()}
            {activeTab === 'clients' && renderClients()}
            {activeTab === 'expenses' && renderExpenses()}
            {activeTab === 'ghazal_notes' && renderGhazalNotes()}
            {activeTab === 'shopping_lists' && renderShoppingLists()}
            {activeTab === 'due_persons' && renderDuePersons()}
            {activeTab === 'wallets' && renderWallets()}
          </motion.div>
        </AnimatePresence>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={pendingAction?.action === 'restore' ? handleRestore : handlePermanentDelete}
          title={pendingAction?.action === 'restore' ? "রিস্টোর নিশ্চিত করুন" : "স্থায়ীভাবে ডিলিট নিশ্চিত করুন"}
          message={
            pendingAction?.action === 'restore'
              ? pendingAction && pendingAction.ids.length > 1
                ? `আপনি কি নির্বাচিত ${pendingAction.ids.length}টি আইটেম রিস্টোর করতে চান?`
                : "আপনি কি এই আইটেমটি রিস্টোর করতে চান?"
              : pendingAction && pendingAction.ids.length > 1
                ? `নির্বাচিত ${pendingAction.ids.length}টি আইটেম স্থায়ীভাবে মুছে ফেলা হবে এবং আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?`
                : "এটি স্থায়ীভাবে মুছে ফেলা হবে এবং আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?"
          }
          confirmText={pendingAction?.action === 'restore' ? "রিস্টোর করুন" : "ডিলিট করুন"}
          type={pendingAction?.action === 'restore' ? "primary" : "danger"}
          isProcessing={pendingAction?.action === 'restore' ? isRestoring : isDeleting}
        />
      </div>
    </div>
  );
};

export default Trash;
