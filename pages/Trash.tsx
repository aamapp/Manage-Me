import React, { useState } from 'react';
import { Trash2, RotateCcw, FolderOpen, Music, Receipt, Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

type TrashTab = 'projects' | 'expenses' | 'ghazal_notes' | 'clients';

const Trash: React.FC = () => {
  const { 
    trashedProjects, 
    trashedExpenses, 
    trashedGhazalNotes, 
    trashedClients,
    showToast, refreshData 
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<TrashTab>('projects');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: TrashTab } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'restore' | 'delete'>('restore');

  const handleRestore = async () => {
    if (!selectedItem) return;
    setIsRestoring(true);
    try {
      let table = '';
      let updateData = {};
      
      if (selectedItem.type === 'projects') {
        table = 'projects';
        const project = trashedProjects.find(p => p.id === selectedItem.id);
        updateData = { notes: project?.notes?.replace('[TRASH]', '').trim() || '' };
      } else if (selectedItem.type === 'expenses') {
        table = 'expenses';
        const expense = trashedExpenses.find(e => e.id === selectedItem.id);
        updateData = { notes: expense?.notes?.replace('[TRASH]', '').trim() || '' };
      } else if (selectedItem.type === 'ghazal_notes') {
        table = 'ghazal_notes';
        const note = trashedGhazalNotes.find(n => n.id === selectedItem.id);
        updateData = { lyrics: note?.lyrics?.replace('[TRASH]', '').trim() || '' };
      } else if (selectedItem.type === 'clients') {
        table = 'clients';
        const client = trashedClients.find(c => c.id === selectedItem.id);
        updateData = { contact: client?.contact?.replace('[TRASH]', '').trim() || '' };
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', selectedItem.id);

      if (error) throw error;
      showToast('সফলভাবে রিস্টোর করা হয়েছে', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsRestoring(false);
      setShowConfirm(false);
      setSelectedItem(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      const table = selectedItem.type === 'projects' ? 'projects' : 
                    selectedItem.type === 'expenses' ? 'expenses' : 
                    selectedItem.type === 'clients' ? 'clients' : 'ghazal_notes';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      // If it's a client, also delete its projects and income records
      if (selectedItem.type === 'clients') {
        const client = trashedClients.find(c => c.id === selectedItem.id);
        if (client) {
          await supabase.from('projects').delete().eq('clientname', client.name);
          await supabase.from('income_records').delete().eq('clientname', client.name);
        }
      }

      showToast('স্থায়ীভাবে মুছে ফেলা হয়েছে', 'success');
      await refreshData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setSelectedItem(null);
    }
  };

  const openConfirm = (id: string, type: TrashTab, action: 'restore' | 'delete') => {
    setSelectedItem({ id, type });
    setConfirmAction(action);
    setShowConfirm(true);
  };

  const renderProjects = () => (
    <div className="space-y-4">
      {trashedProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">কোন ডিলিট করা প্রজেক্ট নেই</p>
        </div>
      ) : (
        trashedProjects.map((project) => (
          <div key={project.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{project.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {project.client_name || 'Unknown Client'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Receipt className="w-4 h-4" /> বাজেট: ৳{project.budget}
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> পেইড: ৳{project.paid_amount}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-orange-500" /> ডিউ: ৳{project.due_amount}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openConfirm(project.id, 'projects', 'restore')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openConfirm(project.id, 'projects', 'delete')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-4">
      {trashedExpenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">কোন ডিলিট করা খরচ নেই</p>
        </div>
      ) : (
        trashedExpenses.map((expense) => (
          <div key={expense.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{expense.category}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Receipt className="w-4 h-4" /> পরিমাণ: ৳{expense.amount}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> তারিখ: {new Date(expense.date).toLocaleDateString('bn-BD')}
                  </div>
                </div>
                {expense.notes && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    {expense.notes.replace('[TRASH]', '').trim()}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openConfirm(expense.id, 'expenses', 'restore')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openConfirm(expense.id, 'expenses', 'delete')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderGhazalNotes = () => (
    <div className="space-y-4">
      {trashedGhazalNotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">কোন ডিলিট করা গজল নোট নেই</p>
        </div>
      ) : (
        trashedGhazalNotes.map((note) => (
          <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{note.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {note.lyrics.replace('[TRASH]', '').trim()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openConfirm(note.id, 'ghazal_notes', 'restore')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openConfirm(note.id, 'ghazal_notes', 'delete')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderClients = () => (
    <div className="space-y-4">
      {trashedClients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">কোন ডিলিট করা ক্লায়েন্ট নেই</p>
        </div>
      ) : (
        trashedClients.map((client) => (
          <div key={client.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{client.name}</h3>
                <p className="text-sm text-gray-600">
                  {client.contact.replace('[TRASH]', '').trim()}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openConfirm(client.id, 'clients', 'restore')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openConfirm(client.id, 'clients', 'delete')}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">রিসাইকেল বিন</h1>
        <p className="text-sm text-gray-500">মুছে ফেলা আইটেমগুলো এখান থেকে রিস্টোর বা স্থায়ীভাবে ডিলিট করতে পারেন।</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'projects' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          প্রজেক্ট ({trashedProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          ক্লায়েন্ট ({trashedClients.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'expenses' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          খরচ ({trashedExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('ghazal_notes')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ghazal_notes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Music className="w-4 h-4" />
          গজল নোট ({trashedGhazalNotes.length})
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'projects' && renderProjects()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'ghazal_notes' && renderGhazalNotes()}
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmAction === 'restore' ? handleRestore : handlePermanentDelete}
        title={confirmAction === 'restore' ? "রিস্টোর নিশ্চিত করুন" : "স্থায়ীভাবে ডিলিট নিশ্চিত করুন"}
        message={confirmAction === 'restore' 
          ? "আপনি কি এই আইটেমটি রিস্টোর করতে চান?" 
          : "এটি স্থায়ীভাবে মুছে ফেলা হবে এবং আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?"}
        confirmText={confirmAction === 'restore' ? "রিস্টোর করুন" : "ডিলিট করুন"}
        confirmColor={confirmAction === 'restore' ? "blue" : "red"}
        isLoading={confirmAction === 'restore' ? isRestoring : isDeleting}
      />
    </div>
  );
};

export default Trash;
