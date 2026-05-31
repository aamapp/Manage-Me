
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Circle,
  MoreVertical,
  ArrowLeft,
  Save,
  X,
  Package,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '@/context/AppContext';
import { ShoppingList, ShoppingItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/ConfirmModal';

const ShoppingLists: React.FC = () => {
  const { 
    shoppingLists, 
    user, 
    isOnline, 
    showToast, 
    refreshData, 
    adminSelectedUserId 
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  
  // Form State for New/Edit List
  const [listTitle, setListTitle] = useState('');
  const [listDate, setListDate] = useState(new Date().toISOString().split('T')[0]);
  const [listNotes, setListNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form State for Items
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Delete States
  const [listToDeleteId, setListToDeleteId] = useState<string | null>(null);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  const filteredLists = useMemo(() => {
    return shoppingLists.filter(list => 
      list.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shoppingLists, searchQuery]);

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast('অফলাইনে নতুন ফর্দ যোগ করা সম্ভব নয়।', 'info');
      return;
    }
    setIsEditing(false);
    setListTitle('');
    setListDate(new Date().toISOString().split('T')[0]);
    setListNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (list: ShoppingList, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
      showToast('অফলাইনে ফর্দ এডিট করা সম্ভব নয়।', 'info');
      return;
    }
    setIsEditing(true);
    setSelectedList(list);
    setListTitle(list.title);
    setListDate(list.date);
    setListNotes(list.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveList = async () => {
    if (!listTitle) {
      showToast('দয়া করে ফর্দের নাম লিখুন।');
      return;
    }

    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'ফর্দ সংরক্ষণ করা হচ্ছে...' } }));

    try {
      const targetUserId = adminSelectedUserId || user?.id;
      if (!targetUserId) return;

      if (isEditing && selectedList) {
        const { error } = await supabase
          .from('shopping_lists')
          .update({
            title: listTitle,
            date: listDate,
            notes: listNotes
          })
          .eq('id', selectedList.id);

        if (error) throw error;
        showToast('ফর্দ আপডেট করা হয়েছে।', 'success');
      } else {
        const { error } = await supabase
          .from('shopping_lists')
          .insert([{
            title: listTitle,
            date: listDate,
            notes: listNotes,
            userid: targetUserId,
            items: [],
            totalamount: 0
          }]);

        if (error) throw error;
        showToast('নতুন ফর্দ যোগ করা হয়েছে।', 'success');
      }

      setIsAddModalOpen(false);
      refreshData();
    } catch (error: any) {
      showToast(`এরর: ${error.message}`);
    } finally {
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
    }
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline) {
      showToast('অফলাইনে ফর্দ ডিলিট করা সম্ভব নয়।', 'info');
      return;
    }
    setListToDeleteId(id);
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDeleteId) return;
    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'ফর্দ ডিলিট করা হচ্ছে...' } }));
    try {
      // Soft delete by prefixing title with [TRASH]
      const listToDelete = shoppingLists.find(l => l.id === listToDeleteId);
      if (!listToDelete) return;

      const { error } = await supabase
        .from('shopping_lists')
        .update({ title: `[TRASH]${listToDelete.title}` })
        .eq('id', listToDeleteId);

      if (error) throw error;
      showToast('ফর্দ ডিলিট করা হয়েছে।', 'success');
      refreshData();
      if (isDetailView) setIsDetailView(false);
    } catch (error: any) {
      showToast(`এরর: ${error.message}`);
    } finally {
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
      setListToDeleteId(null);
    }
  };

  const handleOpenListDetails = (list: ShoppingList) => {
    setSelectedList(list);
    setIsDetailView(true);
  };

  const handleBackToLists = () => {
    setIsDetailView(false);
    setSelectedList(null);
  };

  // Item Management
  const handleOpenAddItem = () => {
    if (!isOnline) {
      showToast('অফলাইনে আইটেম যোগ করা সম্ভব নয়।', 'info');
      return;
    }
    setEditingItem(null);
    setItemName('');
    setItemQuantity('');
    setItemPrice('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ShoppingItem) => {
    if (!isOnline) {
      showToast('অফলাইনে আইটেম এডিট করা সম্ভব নয়।', 'info');
      return;
    }
    setEditingItem(item);
    setItemName(item.name);
    setItemQuantity(item.quantity);
    setItemPrice(item.price.toString());
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemName) {
      showToast('দয়া করে আইটেমের নাম লিখুন।');
      return;
    }

    if (!selectedList) return;

    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'আইটেম সংরক্ষণ করা হচ্ছে...' } }));
    try {
      let updatedItems = [...(selectedList.items || [])];
      const price = parseFloat(itemPrice) || 0;

      if (editingItem) {
        updatedItems = updatedItems.map(item => 
          item.id === editingItem.id 
            ? { ...item, name: itemName, quantity: itemQuantity, price } 
            : item
        );
      } else {
        const newItem: ShoppingItem = {
          id: crypto.randomUUID(),
          name: itemName,
          quantity: itemQuantity,
          price,
          isBought: false
        };
        updatedItems.push(newItem);
      }

      const totalamount = updatedItems.reduce((sum, item) => sum + (item.price || 0), 0);

      const { error } = await supabase
        .from('shopping_lists')
        .update({ 
          items: updatedItems,
          totalamount
        })
        .eq('id', selectedList.id);

      if (error) throw error;
      
      // Update local state to reflect changes immediately
      setSelectedList({ ...selectedList, items: updatedItems, totalamount });
      setIsItemModalOpen(false);
      refreshData();
      showToast(editingItem ? 'আইটেম আপডেট করা হয়েছে।' : 'আইটেম যোগ করা হয়েছে।', 'success');
    } catch (error: any) {
      showToast(`এরর: ${error.message}`);
    } finally {
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
    }
  };

  const toggleBought = async (itemId: string) => {
    if (!selectedList || !isOnline) {
      if (!isOnline) showToast('অফলাইনে স্ট্যাটাস পরিবর্তন করা সম্ভব নয়।', 'info');
      return;
    }

    try {
      const updatedItems = selectedList.items.map(item => 
        item.id === itemId ? { ...item, isBought: !item.isBought } : item
      );

      const { error } = await supabase
        .from('shopping_lists')
        .update({ items: updatedItems })
        .eq('id', selectedList.id);

      if (error) throw error;
      setSelectedList({ ...selectedList, items: updatedItems });
      refreshData();
    } catch (error: any) {
      showToast(`এরর: ${error.message}`);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedList || !isOnline) {
      if (!isOnline) showToast('অফলাইনে আইটেম ডিলিট করা সম্ভব নয়।', 'info');
      return;
    }
    setItemToDeleteId(itemId);
  };

  const handleConfirmDeleteItem = async () => {
    if (!selectedList || !itemToDeleteId) return;

    window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: true, message: 'আইটেম ডিলিট করা হচ্ছে...' } }));
    try {
      const updatedItems = selectedList.items.filter(item => item.id !== itemToDeleteId);
      const totalamount = updatedItems.reduce((sum, item) => sum + (item.price || 0), 0);

      const { error } = await supabase
        .from('shopping_lists')
        .update({ 
          items: updatedItems,
          totalamount
        })
        .eq('id', selectedList.id);

      if (error) throw error;
      setSelectedList({ ...selectedList, items: updatedItems, totalamount });
      refreshData();
      showToast('আইটেম ডিলিট করা হয়েছে।', 'success');
    } catch (error: any) {
      showToast(`এরর: ${error.message}`);
    } finally {
      window.dispatchEvent(new CustomEvent('app:processing', { detail: { show: false } }));
      setItemToDeleteId(null);
    }
  };

  if (isDetailView && selectedList) {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={handleBackToLists}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-gray-900">{selectedList.title}</h1>
            <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" /> {selectedList.date}
            </p>
          </div>
          <button 
            onClick={(e) => handleDeleteList(selectedList.id, e)}
            className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">মোট খরচ</p>
            <p className="text-2xl font-bold text-blue-700">৳{selectedList.totalamount.toLocaleString()}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        {selectedList.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm text-gray-600 italic">
            "{selectedList.notes}"
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">আইটেম লিস্ট ({selectedList.items?.length || 0})</h2>
            <button 
              onClick={handleOpenAddItem}
              className="text-sm font-medium text-blue-600 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> আইটেম যোগ করুন
            </button>
          </div>

          {(!selectedList.items || selectedList.items.length === 0) ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">কোন আইটেম যোগ করা হয়নি</p>
            </div>
          ) : (
            selectedList.items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-4 rounded-xl shadow-sm border ${item.isBought ? 'border-green-100 bg-green-50/30' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleBought(item.id)}
                    className={`transition-colors ${item.isBought ? 'text-green-500' : 'text-gray-300'}`}
                  >
                    {item.isBought ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${item.isBought ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {item.quantity && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5">
                          <Package className="w-3 h-3" /> {item.quantity}
                        </span>
                      )}
                      {item.price > 0 && (
                        <span className="text-xs font-medium text-blue-600 flex items-center gap-0.5">
                          ৳{item.price}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEditItem(item)}
                      className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Item Modal */}
        <AnimatePresence>
          {isItemModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
              >
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-gray-900">
                    {editingItem ? 'আইটেম এডিট করুন' : 'নতুন আইটেম যোগ করুন'}
                  </h3>
                  <button onClick={() => setIsItemModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">আইটেমের নাম</label>
                    <div className="relative">
                      <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="যেমন: চাল, ডাল, তেল..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">পরিমাণ</label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="৫ কেজি"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">দাম (৳)</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="number"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="৫০০"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 flex gap-3">
                  <button 
                    onClick={() => setIsItemModalOpen(false)}
                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={handleSaveItem}
                    className="flex-1 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> সংরক্ষণ করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ফর্দি (Shopping List)</h1>
          <p className="text-sm text-gray-500">আপনার বাজারের তালিকা ম্যানেজ করুন</p>
        </div>
        <div className="bg-blue-100 p-3 rounded-2xl">
          <ShoppingBag className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="ফর্দি খুঁজুন..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      {/* Lists Grid */}
      <div className="space-y-4">
        {filteredLists.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">কোন ফর্দি পাওয়া যায়নি</p>
            <button 
              onClick={handleOpenAddModal}
              className="mt-4 text-blue-600 font-semibold flex items-center gap-1 mx-auto"
            >
              <Plus className="w-5 h-5" /> নতুন ফর্দি তৈরি করুন
            </button>
          </div>
        ) : (
          filteredLists.map((list) => (
            <motion.div 
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleOpenListDetails(list)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {list.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {list.date}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Package className="w-3 h-3" /> {list.items?.length || 0} টি আইটেম
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-blue-600">৳{list.totalamount.toLocaleString()}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleOpenEditModal(list, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteList(list.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 ml-2 group-hover:text-blue-400 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenAddModal}
        className="fixed right-6 bottom-24 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center z-50"
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* Add/Edit List Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'ফর্দি এডিট করুন' : 'নতুন ফর্দি তৈরি করুন'}
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ফর্দের নাম</label>
                  <div className="relative">
                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-all"
                      placeholder="যেমন: সাপ্তাহিক বাজার, ইফতারি বাজার..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">তারিখ</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="date"
                      value={listDate}
                      onChange={(e) => setListDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">নোট (ঐচ্ছিক)</label>
                  <textarea 
                    value={listNotes}
                    onChange={(e) => setListNotes(e.target.value)}
                    className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none h-24"
                    placeholder="অতিরিক্ত কোন তথ্য..."
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-2xl transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleSaveList}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> সংরক্ষণ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!listToDeleteId}
        onClose={() => setListToDeleteId(null)}
        onConfirm={handleConfirmDeleteList}
        title="ফর্দ ডিলিট"
        message="আপনি কি নিশ্চিতভাবে এই ফর্দটি ডিলিট করতে চান?"
      />

      <ConfirmModal
        isOpen={!!itemToDeleteId}
        onClose={() => setItemToDeleteId(null)}
        onConfirm={handleConfirmDeleteItem}
        title="আইটেম ডিলিট"
        message="আপনি কি নিশ্চিতভাবে এই আইটেমটি ডিলিট করতে চান?"
      />
    </div>
  );
};

export default ShoppingLists;
