import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Bell, Shield, Palette, Globe, Save, CheckCircle2, Loader2, Camera, UploadCloud, AlertCircle, Lock, Key, Trash2, Fingerprint, Download, Image as ImageIcon, Check, RefreshCw, ArrowLeft, Upload, FileText, CheckCircle, Database, Coins, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { AppLogo } from '@/components/AppLogo';
import { APP_NAME } from '../constants';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { AppLock } from '@/components/AppLock';
import { ConfirmModal } from '@/components/ConfirmModal';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    setUser, 
    showToast, 
    appPin, 
    setAppPin, 
    isOnline, 
    isFingerprintEnabled, 
    setIsFingerprintEnabled,
    refreshData,
    projects,
    clients,
    incomeRecords,
    expenses,
    ghazalNotes,
    shoppingLists,
    duePersons
  } = useAppContext();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    occupation: user?.occupation || '',
    language: user?.language || 'bn',
    currency: user?.currency || '৳',
    reminder_times: user?.reminder_times || ['09:00', '15:00', '21:00']
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  
  // 'setup' means setting a new pin, 'disable' means verifying pin to turn it off
  const [pinAction, setPinAction] = useState<'setup' | 'disable' | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system' | 'backup'>('profile');
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Backup & Restore States
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'ready' | 'error'>('idle');
  const [importErrorMessage, setImportErrorMessage] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [exportSelections, setExportSelections] = useState({
    projects: true,
    project_income: true,
    clients: true,
    shopping_lists: true,
    ghazal_notes: true,
    car_rent: true,
    wallets: true,
  });

  const [importSelections, setImportSelections] = useState<Record<string, boolean>>({
    projects: true,
    project_income: true,
    wallets: true,
    wallet_income: true,
    expenses: true,
    clients: true,
    shopping_lists: true,
    ghazal_notes: true,
    due_persons: true,
    car_rent_friends: true,
    car_rent_trips: true,
    car_rent_collections: true,
    car_rent_driver_payments: true,
  });

  // Wallet selection modal states
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'backup') {
      supabase
        .from('wallets')
        .select('*')
        .eq('userid', user.id)
        .then(({ data, error }) => {
          if (data && !error) {
            const active = data.filter((w: any) => !w.name?.startsWith('[TRASH]'));
            setAvailableWallets(active);
            setSelectedWalletIds(new Set(active.map((w: any) => w.id)));
          }
        });
    }
  }, [user, activeTab]);

  // Logo Download States
  const [isCapturingLogo, setIsCapturingLogo] = useState(false);
  const [isLogoDownloadDone, setIsLogoDownloadDone] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  // === Backup & Restore Logic ===
  
  const handleExportData = async () => {
    if (!user) {
      showToast('ইউজার সেশন পাওয়া যায়নি।', 'error');
      return;
    }

    const hasAnyExportSelection = Object.values(exportSelections).some(v => v);
    if (!hasAnyExportSelection) {
      showToast('দয়া করে ব্যাকআপের জন্য কমপক্ষে একটি ক্যাটাগরি সিলেক্ট করুন।', 'error');
      return;
    }

    setIsExporting(true);
    try {
      showToast('ডাটা ব্যাকআপ ফাইল প্রস্তুত করা হচ্ছে...', 'info');
      
      // 1. Fetch Supabase Data live dynamically based on user selections
      const projectsData = exportSelections.projects ? (await supabase.from('projects').select('*').eq('userid', user.id)).data || [] : [];
      const clientsData = exportSelections.clients ? (await supabase.from('clients').select('*').eq('userid', user.id)).data || [] : [];
      const ghazalNotesData = exportSelections.ghazal_notes ? (await supabase.from('ghazal_notes').select('*').eq('userid', user.id)).data || [] : [];
      const shoppingListsData = exportSelections.shopping_lists ? (await supabase.from('shopping_lists').select('*').eq('userid', user.id)).data || [] : [];

      // Project Incomes
      let projectIncomesData: any[] = [];
      if (exportSelections.project_income) {
        const { data } = await supabase.from('income_records').select('*').eq('userid', user.id);
        if (data) {
          projectIncomesData = data.filter((r: any) => Boolean(r.projectid));
        }
      }

      // Wallets & associated transactions (Incomes, Expenses, Dues)
      let walletsData: any[] = [];
      let walletIncomesData: any[] = [];
      let walletExpensesData: any[] = [];
      let walletDuesData: any[] = [];

      if (exportSelections.wallets) {
        const { data: allWallets } = await supabase.from('wallets').select('*').eq('userid', user.id);
        if (allWallets) {
          walletsData = allWallets.filter((w: any) => !w.name?.startsWith('[TRASH]') && (selectedWalletIds.size === 0 || selectedWalletIds.has(w.id)));
        }
        const selectedWalletNames = walletsData.map((w: any) => w.name);

        // Wallet Incomes (non-project)
        const { data: allIncomes } = await supabase.from('income_records').select('*').eq('userid', user.id);
        if (allIncomes) {
          walletIncomesData = allIncomes.filter((r: any) => !r.projectid && (selectedWalletNames.length === 0 || selectedWalletNames.includes(r.method)));
        }

        // Wallet Expenses
        const { data: allExpenses } = await supabase.from('expenses').select('*').eq('userid', user.id);
        if (allExpenses) {
          walletExpensesData = allExpenses.filter((exp: any) => {
            if (exp.notes?.startsWith('[TRASH]')) return false;
            if (selectedWalletNames.length === 0) return true;
            if (!exp.notes) return selectedWalletNames.includes('ক্যাশ');
            return selectedWalletNames.some((wName: string) => exp.notes.includes(`[ওয়ালেট: ${wName}]`) || exp.notes.includes(`[Wallet: ${wName}]`));
          });
        }

        // Wallet Dues
        const { data: allDues } = await supabase.from('due_persons').select('*').eq('userid', user.id);
        if (allDues) {
          walletDuesData = allDues.filter((dp: any) => {
            if (dp.name?.startsWith('[TRASH]')) return false;

            // If no specific wallet filter is set (all wallets selected or none), include active due persons
            if (selectedWalletIds.size === 0 || selectedWalletIds.size === availableWallets.length) {
              return true;
            }

            let txs: any[] = [];
            if (Array.isArray(dp.transactions)) {
              txs = dp.transactions;
            } else if (typeof dp.transactions === 'string') {
              try {
                txs = JSON.parse(dp.transactions);
              } catch (e) {
                txs = [];
              }
            }

            // Check if any transaction in this due person matches the selected wallet names
            return txs.some((tx: any) => {
              const txWallet = tx.walletName || 'ক্যাশ';
              return selectedWalletNames.includes(txWallet) ||
                (txWallet === 'Cash' && selectedWalletNames.includes('ক্যাশ')) ||
                (txWallet === 'ক্যাশ' && selectedWalletNames.includes('Cash'));
            });
          }).map((dp: any) => {
            if (selectedWalletIds.size === 0 || selectedWalletIds.size === availableWallets.length) {
              return dp;
            }

            let txs: any[] = [];
            if (Array.isArray(dp.transactions)) {
              txs = dp.transactions;
            } else if (typeof dp.transactions === 'string') {
              try {
                txs = JSON.parse(dp.transactions);
              } catch (e) {
                txs = [];
              }
            }

            const matchingTxs = txs.filter((tx: any) => {
              const txWallet = tx.walletName || 'ক্যাশ';
              return selectedWalletNames.includes(txWallet) ||
                (txWallet === 'Cash' && selectedWalletNames.includes('ক্যাশ')) ||
                (txWallet === 'ক্যাশ' && selectedWalletNames.includes('Cash'));
            });

            return {
              ...dp,
              transactions: matchingTxs
            };
          });
        }
      }

      const incomeRecordsData = [...projectIncomesData, ...walletIncomesData];
      const expensesData = walletExpensesData;
      const duePersonsData = walletDuesData;

      // 2. Fetch Firebase Car Rent Data defensively based on user selections
      let carRentFriends: any[] = [];
      let carRentTrips: any[] = [];
      let carRentCollections: any[] = [];
      let carRentDriverPayments: any[] = [];

      if (exportSelections.car_rent) {
        try {
          const userKeys = Array.from(new Set([user.id, user.email].filter(Boolean) as string[]));

          const fetchCol = async (colName: string) => {
            let list: any[] = [];
            try {
              const q = query(collection(db, colName), where("userid", "in", userKeys));
              const snap = await getDocs(q);
              snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
              if (list.length > 0) return list;
            } catch (e) {
              console.warn(`Query with 'in' failed for ${colName} in export:`, e);
            }

            try {
              const snap = await getDocs(collection(db, colName));
              snap.forEach(docSnap => {
                const data = docSnap.data() as any;
                if (!data.userid || userKeys.includes(data.userid)) {
                  list.push({ id: docSnap.id, ...data });
                }
              });
            } catch (e) {
              console.error(`Export fetch failed for ${colName}:`, e);
            }
            return list;
          };

          carRentFriends = await fetchCol("car_rent_friends");
          carRentTrips = await fetchCol("car_rent_trips");
          carRentCollections = await fetchCol("car_rent_collections");
          carRentDriverPayments = await fetchCol("car_rent_driver_payments");

          // Local cache fallback if Firestore returned empty
          if (carRentFriends.length === 0 && carRentTrips.length === 0) {
            const cacheKey = `car_rent_cache_${user.id}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                carRentFriends = parsed.friends || [];
                carRentTrips = parsed.trips || [];
                carRentCollections = parsed.collections || [];
                carRentDriverPayments = parsed.driverPayments || [];
              } catch (e) {
                console.error("Failed to read car rent cache for export:", e);
              }
            }
          }
        } catch (fbErr) {
          console.warn("Firestore data fetch skipped or failed:", fbErr);
        }
      }

      // 3. Check if there are actual items in selected export
      const totalExportItems = 
        (projectsData?.length || 0) +
        (clientsData?.length || 0) +
        (incomeRecordsData?.length || 0) +
        (expensesData?.length || 0) +
        (walletsData?.length || 0) +
        (ghazalNotesData?.length || 0) +
        (shoppingListsData?.length || 0) +
        (duePersonsData?.length || 0) +
        carRentFriends.length +
        carRentTrips.length +
        carRentCollections.length +
        carRentDriverPayments.length;

      if (totalExportItems === 0) {
        showToast('আপনার নির্বাচিত ক্যাটাগরিতে (যেমন: শপিং লিস্ট) কোনো ডাটা নেই (০টি আইটেম)! ফাঁকা ফাইল ইমপোর্ট করা যাবে না।', 'info');
      }

      // 4. Assemble complete backup object
      const nowIso = new Date().toISOString();
      const backupData = {
        version: "2.0.0",
        app: "আয় বায়",
        appName: "আয় বায়",
        app_name: "আয় বায়",
        exportedAt: nowIso,
        userId: user.id,
        userEmail: user.email,
        metadata: {
          appName: "আয় বায়",
          app: "আয় বায়",
          app_name: "আয় বায়",
          version: "2.0.0",
          exportedAt: nowIso,
          userId: user.id,
          userEmail: user.email,
        },
        data: {
          // Direct root fields inside data for cloned apps expecting json.data.shopping_lists
          projects: projectsData || [],
          clients: clientsData || [],
          income_records: incomeRecordsData || [],
          expenses: expensesData || [],
          wallets: walletsData || [],
          ghazal_notes: ghazalNotesData || [],
          shopping_lists: shoppingListsData || [],
          due_persons: duePersonsData || [],
          car_rent_friends: carRentFriends,
          car_rent_trips: carRentTrips,
          car_rent_collections: carRentCollections,
          car_rent_driver_payments: carRentDriverPayments,

          // Nested fields for apps expecting json.data.supabase / json.data.firebase
          supabase: {
            projects: projectsData || [],
            clients: clientsData || [],
            income_records: incomeRecordsData || [],
            expenses: expensesData || [],
            wallets: walletsData || [],
            ghazal_notes: ghazalNotesData || [],
            shopping_lists: shoppingListsData || [],
            due_persons: duePersonsData || []
          },
          firebase: {
            car_rent_friends: carRentFriends,
            car_rent_trips: carRentTrips,
            car_rent_collections: carRentCollections,
            car_rent_driver_payments: carRentDriverPayments
          }
        },
        // Direct top level fields for maximum compatibility
        projects: projectsData || [],
        clients: clientsData || [],
        income_records: incomeRecordsData || [],
        expenses: expensesData || [],
        wallets: walletsData || [],
        ghazal_notes: ghazalNotesData || [],
        shopping_lists: shoppingListsData || [],
        due_persons: duePersonsData || [],
        car_rent_friends: carRentFriends,
        car_rent_trips: carRentTrips,
        car_rent_collections: carRentCollections,
        car_rent_driver_payments: carRentDriverPayments
      };

      // 4. Download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `manage_me_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('নির্বাচিত ডাটা সফলভাবে ব্যাকআপ ফাইল আকারে ডাউনলোড করা হয়েছে!', 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('ডাটা এক্সপোর্ট করতে সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const processBackupFile = (file: File) => {
    setImportFile(file);
    setImportStatus('validating');
    setImportErrorMessage('');
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (!json || typeof json !== 'object') {
          throw new Error('অবৈধ ব্যাকআপ ফাইল ফরম্যাট। সঠিক JSON ফাইল নির্বাচন করুন।');
        }

        const d = json.data || json;
        const sData = d.supabase || d;
        const fData = d.firebase || d;

        const allIncomeRecords = (sData.income_records || d.income_records) || [];
        const projectIncomesCount = allIncomeRecords.filter((r: any) => Boolean(r.projectid)).length;
        const walletIncomesCount = allIncomeRecords.filter((r: any) => !r.projectid).length;

        const counts = {
          projects: (sData.projects || d.projects)?.length || 0,
          clients: (sData.clients || d.clients)?.length || 0,
          project_income: projectIncomesCount,
          wallet_income: walletIncomesCount,
          income_records: allIncomeRecords.length,
          wallets: (sData.wallets || d.wallets)?.length || 0,
          expenses: (sData.expenses || d.expenses)?.length || 0,
          ghazal_notes: (sData.ghazal_notes || d.ghazal_notes)?.length || 0,
          shopping_lists: (sData.shopping_lists || d.shopping_lists)?.length || 0,
          due_persons: (sData.due_persons || d.due_persons)?.length || 0,
          car_rent_friends: (fData.car_rent_friends || d.car_rent_friends)?.length || 0,
          car_rent_trips: (fData.car_rent_trips || d.car_rent_trips)?.length || 0,
          car_rent_collections: (fData.car_rent_collections || d.car_rent_collections)?.length || 0,
          car_rent_driver_payments: (fData.car_rent_driver_payments || d.car_rent_driver_payments)?.length || 0,
        };

        const totalRecords = 
          counts.projects +
          counts.clients +
          counts.project_income +
          counts.wallet_income +
          counts.wallets +
          counts.expenses +
          counts.ghazal_notes +
          counts.shopping_lists +
          counts.due_persons +
          counts.car_rent_friends +
          counts.car_rent_trips +
          counts.car_rent_collections +
          counts.car_rent_driver_payments;

        if (totalRecords === 0) {
          throw new Error('ব্যাকআপ ফাইলে কোনো ডাটা পাওয়া যায়নি।');
        }

        // Initialize selections dynamically based on what is present in the backup file
        setImportSelections({
          projects: counts.projects > 0,
          clients: counts.clients > 0,
          project_income: counts.project_income > 0,
          wallets: counts.wallets > 0,
          wallet_income: counts.wallet_income > 0,
          expenses: counts.expenses > 0,
          ghazal_notes: counts.ghazal_notes > 0,
          shopping_lists: counts.shopping_lists > 0,
          due_persons: counts.due_persons > 0,
          car_rent_friends: counts.car_rent_friends > 0,
          car_rent_trips: counts.car_rent_trips > 0,
          car_rent_collections: counts.car_rent_collections > 0,
          car_rent_driver_payments: counts.car_rent_driver_payments > 0,
        });

        setImportPreview({
          counts,
          totalRecords,
          exportedAt: json.exportedAt || json.metadata?.exportedAt,
          userEmail: json.userEmail || json.metadata?.userEmail || 'অজানা ইমেইল',
          raw: json
        });
        setImportStatus('ready');
      } catch (err: any) {
        console.error('File parsing error:', err);
        setImportStatus('error');
        setImportErrorMessage(err.message || 'ফাইলটি পড়তে সমস্যা হয়েছে। দয়া করে সঠিক JSON ফাইল আপলোড করুন।');
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportErrorMessage('ফাইলটি লোড করতে সমস্যা হয়েছে।');
    };
    reader.readAsText(file);
  };

  const handleImportData = async () => {
    if (!user || !importPreview) return;

    // Check if at least one selected category has actual records to import
    const activeImportCount = Object.entries(importSelections)
      .filter(([key, enabled]) => enabled && key !== 'income_records')
      .reduce((sum, [key]) => sum + (importPreview.counts[key] || 0), 0);

    if (activeImportCount === 0) {
      showToast('দয়া করে ইমপোর্টের জন্য কমপক্ষে একটি ক্যাটাগরি সিলেক্ট করুন যার ডাটা ফাইলে রয়েছে।', 'error');
      return;
    }

    setIsImporting(true);
    try {
      showToast('ডাটা ইমপোর্ট শুরু হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...', 'info');

      const rawBackup = importPreview.raw;
      const d = rawBackup.data || rawBackup;
      const sData = d.supabase || d;
      const fData = d.firebase || d;

      // Filter income records according to user project vs wallet selections
      const allIncomesFromBackup = (sData.income_records || d.income_records) || [];
      const incomeListToRestore = allIncomesFromBackup.filter((r: any) => {
        const isProjectInc = Boolean(r.projectid || r.projectId);
        if (isProjectInc && importSelections.project_income) return true;
        if (!isProjectInc && (importSelections.wallet_income || importSelections.wallets)) return true;
        return false;
      });

      // Helper to validate UUID format
      const isValidUuid = (str?: string): boolean => {
        if (!str || typeof str !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      };

      // Maps to track project/client ID remappings for cross-user imports
      const projectIdMap = new Map<string, string>();
      const clientIdMap = new Map<string, string>();

      // 1. Restore Supabase tables (Only those selected by the user)
      const supabaseTables = [
        { name: 'projects', list: sData.projects || d.projects, enabled: importSelections.projects },
        { name: 'clients', list: sData.clients || d.clients, enabled: importSelections.clients },
        { name: 'income_records', list: incomeListToRestore, enabled: Boolean(importSelections.project_income || importSelections.wallet_income || importSelections.wallets) },
        { name: 'expenses', list: sData.expenses || d.expenses, enabled: Boolean(importSelections.expenses || importSelections.wallets) },
        { name: 'ghazal_notes', list: sData.ghazal_notes || d.ghazal_notes, enabled: importSelections.ghazal_notes },
        { name: 'shopping_lists', list: sData.shopping_lists || d.shopping_lists, enabled: importSelections.shopping_lists },
        { name: 'due_persons', list: sData.due_persons || d.due_persons, enabled: Boolean(importSelections.due_persons || importSelections.wallets) },
        { name: 'wallets', list: sData.wallets || d.wallets, enabled: importSelections.wallets },
      ].filter(table => table.enabled);

      for (const table of supabaseTables) {
        if (table.list && table.list.length > 0) {
          const preparedList = table.list.map((item: any) => {
            const isSameUser = item.userid === user.id;
            const hasValidUuid = isValidUuid(item.id);

            // Determine target UUID
            let targetId: string;
            if (isSameUser && hasValidUuid) {
              targetId = item.id;
            } else {
              targetId = crypto.randomUUID();
              if (item.id) {
                if (table.name === 'projects') projectIdMap.set(item.id, targetId);
                if (table.name === 'clients') clientIdMap.set(item.id, targetId);
              }
            }

            if (table.name === 'income_records') {
              const rawProjId = item.projectid || item.projectId || null;
              const mappedProjId = (rawProjId && projectIdMap.has(rawProjId))
                ? projectIdMap.get(rawProjId)
                : (isValidUuid(rawProjId) ? rawProjId : null);

              return {
                id: targetId,
                projectid: mappedProjId,
                projectname: item.projectname || item.projectName || '',
                clientname: item.clientname || item.clientName || '',
                amount: Number(item.amount) || 0,
                date: item.date || new Date().toISOString().split('T')[0],
                createdat: item.createdat || item.createdAt || new Date().toISOString(),
                method: item.method || 'ক্যাশ',
                userid: user.id,
              };
            } else {
              const cleaned: any = { ...item };
              cleaned.id = targetId;
              cleaned.userid = user.id;
              delete cleaned.userId;
              delete cleaned.user_id;

              if (cleaned.projectid || cleaned.projectId) {
                const rawP = cleaned.projectid || cleaned.projectId;
                cleaned.projectid = projectIdMap.has(rawP)
                  ? projectIdMap.get(rawP)
                  : (isValidUuid(rawP) ? rawP : null);
                delete cleaned.projectId;
              }
              if (cleaned.clientid || cleaned.clientId) {
                const rawC = cleaned.clientid || cleaned.clientId;
                cleaned.clientid = clientIdMap.has(rawC)
                  ? clientIdMap.get(rawC)
                  : (isValidUuid(rawC) ? rawC : null);
                delete cleaned.clientId;
              }

              return cleaned;
            }
          });

          let { error } = await supabase.from(table.name).upsert(preparedList);

          if (error) {
            console.warn(`Upsert conflict/error on ${table.name} (${error.message}), retrying with fresh UUIDs via insert...`);
            const freshList = preparedList.map((item: any) => ({
              ...item,
              id: crypto.randomUUID(),
              userid: user.id,
            }));
            const retryResult = await supabase.from(table.name).insert(freshList);
            error = retryResult.error;
          }

          if (error) {
            console.error(`Error importing table ${table.name}:`, error);
            throw new Error(`${table.name} ডাটা ইমপোর্ট করতে সমস্যা হয়েছে: ${error.message}`);
          }
        }
      }

      window.dispatchEvent(new CustomEvent('wallets-updated'));

      // 2. Restore Firebase (Car Rent) tables (Only those selected by the user)
      const firebaseCollections = [
        { name: 'car_rent_friends', list: fData.car_rent_friends || d.car_rent_friends, enabled: importSelections.car_rent_friends, valFunc: (d: any) => ({ id: d.id, name: d.name, phone: d.phone || "", userid: user.id, createdAt: d.createdAt || new Date().toISOString() }) },
        { name: 'car_rent_trips', list: fData.car_rent_trips || d.car_rent_trips, enabled: importSelections.car_rent_trips, valFunc: (d: any) => ({ id: d.id, date: d.date, examName: d.examName, totalRent: Number(d.totalRent) || 0, participantIds: d.participantIds || [], userid: user.id, createdAt: d.createdAt || new Date().toISOString() }) },
        { name: 'car_rent_collections', list: fData.car_rent_collections || d.car_rent_collections, enabled: importSelections.car_rent_collections, valFunc: (d: any) => ({ id: d.id, date: d.date, friendId: d.friendId, amount: Number(d.amount) || 0, tripId: d.tripId || null, paymentMethod: d.paymentMethod || null, userid: user.id, createdAt: d.createdAt || new Date().toISOString() }) },
        { name: 'car_rent_driver_payments', list: fData.car_rent_driver_payments || d.car_rent_driver_payments, enabled: importSelections.car_rent_driver_payments, valFunc: (d: any) => ({ id: d.id, date: d.date, amount: Number(d.amount) || 0, remarks: d.remarks || "", userid: user.id, createdAt: d.createdAt || new Date().toISOString() }) }
      ].filter(col => col.enabled);

      for (const col of firebaseCollections) {
        if (col.list && col.list.length > 0) {
          const CHUNK_SIZE = 400;
          for (let i = 0; i < col.list.length; i += CHUNK_SIZE) {
            const chunk = col.list.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            
            chunk.forEach((item: any) => {
              const itemId = item.id || col.name.substring(0, 4) + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
              const cleanItem = col.valFunc({ ...item, id: itemId });
              
              const ref = doc(db, col.name, cleanItem.id);
              batch.set(ref, cleanItem);
            });
            try {
              await batch.commit();
            } catch (firestoreErr: any) {
              handleFirestoreError(firestoreErr, OperationType.WRITE, col.name);
            }
          }
        }
      }

      setImportFile(null);
      setImportPreview(null);
      setImportStatus('idle');
      
      showToast('নির্বাচিত ডাটা সফলভাবে ইমপোর্ট সম্পন্ন হয়েছে!', 'success');
      
      if (refreshData) {
        await refreshData();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      showToast('ডাটা ইমপোর্ট ব্যর্থ হয়েছে: ' + (err.message || 'অজানা ত্রুটি'), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadLogoHD = async () => {
    if (!logoRef.current) return;
    setIsCapturingLogo(true);
    try {
      const canvas = await html2canvas(logoRef.current, {
        width: 1024,
        height: 1024,
        scale: 1,
        backgroundColor: null,
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = "icon.png";
      link.click();
      setIsLogoDownloadDone(true);
      showToast('এইচডি লোগো ডাউনলোড সম্পূর্ণ হয়েছে!', 'success');
      setTimeout(() => setIsLogoDownloadDone(false), 3000);
    } catch (err) {
      console.error('Export logo failed:', err);
      showToast('লোগো ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsCapturingLogo(false);
    }
  };

  const handleCheckUpdate = () => {
    if (!isOnline) {
      showToast('অফলাইনে আপডেট চেক করা সম্ভব নয়', 'error');
      return;
    }
    setIsCheckingUpdate(true);
    const checkEvent = new CustomEvent('check-app-update-manually', {
      detail: {
        callback: (res: { success: boolean; updateAvailable?: boolean; error?: string }) => {
          setIsCheckingUpdate(false);
          if (!res.success) {
            showToast(res.error || 'আপডেট চেক করতে সমস্যা হয়েছে', 'error');
          } else if (res.updateAvailable) {
            showToast('নতুন আপডেট উপলব্ধ রয়েছে!', 'success');
          } else {
            showToast('আপনার অ্যাপটি ইতিমধ্যেই আপ-টু-ডেট রয়েছে!', 'success');
          }
        }
      }
    });
    window.dispatchEvent(checkEvent);
  };

  // Sync form data if user updates externally
  useEffect(() => {
    if (user) {
        setFormData(prev => ({
            ...prev,
            name: user.name || prev.name,
            phone: user.phone || prev.phone,
            occupation: user.occupation || prev.occupation,
            currency: user.currency || prev.currency,
            reminder_times: user.reminder_times || prev.reminder_times
        }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    if (!isOnline) {
      showToast('অফলাইনে ছবি আপলোড করা যাবে না', 'error');
      return;
    }
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    setIsUploading(true);

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Auth Metadata (for session persistence)
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (authError) throw authError;

      // 4. Update Profiles Table (Source of Truth) - Use UPSERT to ensure record exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
          console.warn("Profile table update warning:", profileError.message);
      }

      // 5. Update Local State
      setUser(prev => prev ? ({ ...prev, avatar_url: publicUrl }) : null);
      showToast('প্রোফাইল ছবি আপডেট হয়েছে!', 'success');

    } catch (error: any) {
      console.error("Upload Error Details:", error);
      showToast(`ছবি আপলোড করতে সমস্যা হয়েছে: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!isOnline) {
      showToast('অফলাইনে সেটিংস সেভ করা যাবে না', 'error');
      return;
    }
    
    // 1. UI Loading State
    setIsSaving(true);
    
    // Snapshot for rollback
    const previousUser = { ...user };
    
    // 2. Optimistic Update - Use functional update to avoid stale closures
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        name: formData.name,
        phone: formData.phone,
        occupation: formData.occupation,
        language: formData.language as 'bn' | 'en',
        currency: formData.currency
      };
    });

    // 3. Fake delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // 4. Stop Loading
    setIsSaving(false);
    showToast('সেটিংস সেভ হয়েছে', 'success');

    // 5. Background Network Sync
    (async () => {
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    name: formData.name,
                    phone: formData.phone,
                    occupation: formData.occupation,
                    language: formData.language,
                    currency: formData.currency
                    // Removed avatar_url to prevent overwriting with stale state
                }
            });

            if (authError) throw authError;

            // Update profiles table silently (only fields that exist in the DB schema)
            const { error: profileError } = await supabase.from('profiles').upsert({ 
                id: user.id,
                name: formData.name
            }, { onConflict: 'id' });

            if (profileError) {
                console.warn("Profile table update warning:", profileError.message);
                // Not throwing here because user_metadata is already updated successfully, and profiles table is just a secondary mirror
            }

        } catch (err: any) {
            console.error("Background Sync Error:", err);
            // Revert UI on critical failure only
            setUser(previousUser);
            showToast(`সেভ করতে সমস্যা হয়েছে: ${err.message || 'নেটওয়ার্ক এরর'}`, 'error');
        }
    })();
  };

  const handleChangePassword = async () => {
    if (!isOnline) {
      showToast('অফলাইনে পাসওয়ার্ড পরিবর্তন করা যাবে না', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
        showToast('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
        return;
    }
    setIsChangingPass(true);
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast('পাসওয়ার্ড পরিবর্তন সফল হয়েছে', 'success');
        setNewPassword('');
    } catch (err: any) {
        showToast(`ভুল: ${err.message}`, 'error');
    } finally {
        setIsChangingPass(false);
    }
  };

  const handlePinToggle = () => {
      if (appPin) {
          setPinAction('disable');
      } else {
          setPinAction('setup');
      }
  };

  const handlePinSuccess = (pin: string) => {
      if (pinAction === 'setup') {
          setAppPin(pin);
          showToast('অ্যাপ লক চালু করা হয়েছে!', 'success');
      } else if (pinAction === 'disable') {
          setAppPin(null);
          showToast('অ্যাপ লক বন্ধ করা হয়েছে', 'success');
      }
      setPinAction(null);
  };

  const getAppUsageDurationString = () => {
    if (!user?.createdat) return `${APP_NAME} এর সাথে ১ দিন`;
    try {
      const startDate = new Date(user.createdat);
      const endDate = new Date();
      
      let years = endDate.getFullYear() - startDate.getFullYear();
      let months = endDate.getMonth() - startDate.getMonth();
      let days = endDate.getDate() - startDate.getDate();
      
      if (days < 0) {
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      
      if (months < 0) {
        months += 12;
        years--;
      }
      
      const toBn = (num: number) => num.toLocaleString('bn-BD');
      
      const parts: string[] = [];
      if (years > 0) {
        parts.push(`${toBn(years)} বছর`);
      }
      if (months > 0) {
        parts.push(`${toBn(months)} মাস`);
      }
      if (days > 0 || parts.length === 0) {
        parts.push(`${toBn(days || 1)} দিন`);
      }
      
      return `${APP_NAME} এর সাথে ${parts.join(' ')}`;
    } catch (e) {
      return `${APP_NAME} এর সাথে ১ দিন`;
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-24 pt-0 min-h-screen bg-slate-50/50 font-sans">
      {/* Header with back button and Save button */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between mb-8 max-w-5xl mx-auto border-b border-slate-200/50 h-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              সেটিং
            </h1>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isUploading || !isOnline}
          className={`px-6 py-2 rounded-full text-sm font-bold text-white transition-all shadow-md active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5 ${
            isSaving || isUploading || !isOnline
              ? 'bg-blue-300 shadow-none cursor-not-allowed'
              : 'bg-[#1a73e8] hover:bg-[#155fc0] shadow-blue-100 hover:shadow-blue-200/50'
          }`}
          id="header-save-btn"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>সেইভ</span>
        </button>
      </div>

      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Centered Profile Section (replacing deep blue header banner) */}
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 max-w-xl mx-auto select-none">
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div 
              onClick={() => !isUploading && isOnline && fileInputRef.current?.click()}
              className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-indigo-50 flex items-center justify-center relative cursor-pointer active:scale-95 hover:scale-[1.02] transition-all duration-300 group"
              title="প্রোফাইল ছবি পরিবর্তন করুন"
              id="settings-avatar-container"
            >
              {user.avatar_url ? (
                <img 
                  key={user.avatar_url}
                  src={user.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
              ) : (
                <span className="text-[#1a73e8] text-4xl font-extrabold">{formData.name ? formData.name.charAt(0) : 'U'}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-indigo-400" size={28} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isUploading && isOnline) {
                  fileInputRef.current?.click();
                }
              }}
              className={`absolute bottom-0 right-1 bg-[#1a73e8] hover:bg-[#155fc0] text-white p-2.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-90 z-20 border-2 border-white flex items-center justify-center ${isUploading || !isOnline ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
              title="ছবি পরিবর্তন করুন"
              id="avatar-upload-trigger"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={isUploading || !isOnline} 
            />
          </div>

          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-4 text-center">
            {formData.name || 'সম্মানিত ইউজার'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 text-center">
            {formData.occupation || 'পেশা যুক্ত করা হয়নি'}
          </p>

          {/* Days joined pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8] font-bold text-xs sm:text-sm shadow-sm">
            <span>💙</span>
            <span>{getAppUsageDurationString()}</span>
          </div>
        </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-4 p-[4px] bg-[#f0f3f6] rounded-2xl gap-1 max-w-2xl mx-auto border border-slate-200/40 shadow-inner select-none" id="settings-tab-switcher">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-4 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'profile' 
              ? 'bg-[#e2edfc] text-[#1a73e8] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-profile-btn"
        >
          <UserIcon size={14} className="sm:w-4 sm:h-4" />
          <span>প্রোফাইল</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-4 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'security' 
              ? 'bg-[#e2fced] text-[#50AD54] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-security-btn"
        >
          <Shield size={14} className="sm:w-4 sm:h-4" />
          <span>নিরাপত্তা</span>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-4 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'system' 
              ? 'bg-[#fcedeb] text-[#db4437] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-system-btn"
        >
          <RefreshCw size={14} className="sm:w-4 sm:h-4" />
          <span>সিস্টেম</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-4 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-300 cursor-pointer ${
            activeTab === 'backup' 
              ? 'bg-[#fdf8e2] text-[#c6930a] shadow-sm font-bold scale-[1.01]' 
              : 'text-[#8e9aa8] hover:text-slate-700 hover:bg-white/40'
          }`}
          id="tab-backup-btn"
        >
          <Database size={14} className="sm:w-4 sm:h-4" />
          <span>ব্যাকআপ</span>
        </button>
      </div>

      <div className="transition-all duration-300">
        {/* Profile Tab content */}
        {activeTab === 'profile' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-profile">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">প্রোফাইল আপডেট</h3>
              <p className="text-xs text-slate-400">আপনার ব্যক্তিগত তথ্য পরিবর্তন করুন যা পুরো একাউন্টে দেখতে পাবেন।</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পূর্ণ নাম</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all" 
                    id="profile-name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পেশা</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    name="occupation" 
                    placeholder="যেমন: সাউন্ড ইঞ্জিনিয়ার" 
                    value={formData.occupation} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all" 
                    id="profile-occupation-input"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">পছন্দের মুদ্রা (Currency Symbol)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-indigo-600 text-lg">{formData.currency}</span>
                  <select 
                    name="currency" 
                    value={formData.currency} 
                    onChange={handleChange} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm md:text-base transition-all cursor-pointer appearance-none"
                    id="profile-currency-select"
                  >
                    <option value="৳">বাংলাদেশী টাকা (৳)</option>
                    <option value="$">ইউএস ডলার ($)</option>
                    <option value="₹">ইন্ডিয়ান রুপি (₹)</option>
                    <option value="€">ইউরো (€)</option>
                    <option value="£">পাউন্ড (£)</option>
                    <option value="SAR">সৌদি রিয়াল (SAR)</option>
                    <option value="AED">আমিরাতি দিরহাম (AED)</option>
                    <option value="MYR">মালয়েশিয়ান রিঙ্গিত (MYR)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={isSaving || isUploading || !isOnline} 
              className={`w-full flex justify-center items-center gap-2 px-6 py-4 rounded-xl font-extrabold text-sm md:text-base text-white transition-all shadow-lg active:scale-95 duration-200 cursor-pointer mt-4 ${isSaving || isUploading || !isOnline ? 'bg-indigo-300 shadow-none cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-100 hover:shadow-indigo-200/50'}`}
              id="profile-save-changes-btn"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'সেভ হচ্ছে...' : 'সেটিংস পরিবর্তন সেভ করুন'}
            </button>
          </div>
        )}

        {/* Security Tab Content */}
        {activeTab === 'security' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-security">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">নিরাপত্তা ও অ্যাক্সেস</h3>
              <p className="text-xs text-slate-400">আপনার একাউন্টকে সুরক্ষিত রাখতে অতিরিক্ত নিরাপত্তা কোড এবং নোটিফিকেশন সেট করুন।</p>
            </div>

            <div className="space-y-4">
              {/* Notification Row */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-sm">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${user?.fcm_token ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm shadow-indigo-50' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    <Bell size={22} className={user?.fcm_token ? "animate-bounce" : ""} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base">পুশ নোটিফিকেশন</h4>
                    <p className="text-xs text-slate-500 leading-normal">{user?.fcm_token ? 'দারুণ! নোটিফিকেশন সার্ভিসটি অ্যাক্টিভ আছে।' : 'জরুরী আপডেট পেতে নোটিফিকেশন পারমিশন ইনঅ্যাক্টিভ।'}</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (!isOnline) {
                      showToast('অফলাইনে নোটিফিকেশন পরিবর্তন করা সম্ভব নয়', 'error');
                      return;
                    }
                    try {
                      const { requestNotificationPermission } = await import('@/lib/firebase');
                      await requestNotificationPermission(user.id);
                      showToast('নোটিফিকেশন পারমিশন আপডেট হয়েছে। মেহেরবানি করে পেজটি রিলোড দিন।', 'info');
                    } catch (err) {
                      showToast('পারমিশন রিকোয়েস্ট ব্যর্থ হয়েছে। ব্রাউজারে নোটিফিকেশন ব্লক করা থাকতে পারে।', 'error');
                    }
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm text-center transition-all duration-200 active:scale-95 border cursor-pointer ${user?.fcm_token ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-md shadow-indigo-100'}`}
                  id="toggle-notifications-btn"
                >
                  {user?.fcm_token ? 'অবস্থা রিসেট' : 'চালু করুন'}
                </button>
              </div>

              {/* App Lock & Fingerprint Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* App Lock */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex items-center justify-between transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${appPin ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">অ্যাপ লক পিন</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{appPin ? 'পিন কোড সক্রিয় আছে' : 'পিন দিয়ে অ্যাপ লক করুন'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handlePinToggle}
                    className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 outline-none cursor-pointer border ${appPin ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                    id="settings-pin-toggle"
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${appPin ? 'left-6' : 'left-0.5'}`}></div>
                  </button>
                </div>

                {/* Fingerprint Lock */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex items-center justify-between transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isFingerprintEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">ফিঙ্গারপ্রিন্ট আনলক</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{isFingerprintEnabled ? 'বায়োমেট্রিক সক্রিয় আছে' : 'বায়োমেট্রিক সুবিধা ব্যবহার করুন'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newState = !isFingerprintEnabled;
                      setIsFingerprintEnabled(newState);
                      if (newState) {
                        showToast('ফিঙ্গারপ্রিন্ট সুবিধা চালু করা হয়েছে', 'success');
                      } else {
                        showToast('ফিンダーপ্রিন্ট সুবিধা বন্ধ করা হয়েছে', 'success');
                      }
                    }}
                    className={`relative w-12 h-6.5 rounded-full transition-colors duration-300 outline-none cursor-pointer border ${isFingerprintEnabled ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'}`}
                    id="settings-fingerprint-toggle"
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${isFingerprintEnabled ? 'left-6' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>

              {/* Change Password Card */}
              <div className="bg-slate-50/20 rounded-2xl border border-slate-100 p-5 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key size={18} className="text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base">নতুন পাসওয়ার্ড সেট করুন</h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="অধিক নিরাপদ পাসওয়ার্ড দিন..." 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white text-slate-800 font-bold text-sm transition-all"
                      id="settings-new-password-input"
                    />
                  </div>
                  <button 
                    onClick={handleChangePassword}
                    disabled={!newPassword || isChangingPass || !isOnline}
                    className={`px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm text-white transition-all duration-200 active:scale-95 shadow-md whitespace-nowrap cursor-pointer ${!newPassword || isChangingPass || !isOnline ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200/50'}`}
                    id="settings-password-update-btn"
                  >
                    {isChangingPass ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span>আপডেট হচ্ছে...</span>
                      </div>
                    ) : 'পাসওয়ার্ড পরিবর্তন'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab Content */}
        {activeTab === 'system' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8" id="tab-content-system">
            <div className="border-b border-slate-100 pb-5 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">সিস্টেম ও ব্র্যান্ডিং</h3>
              <p className="text-xs text-slate-400 font-medium">앱 বা ব্র্যান্ড লোগো এবং স্টোরেজ ডেটা নিয়ন্ত্রণ করুন।</p>
            </div>

            <div className="space-y-6">
              {/* Branding and Logo Card */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 transition-all duration-300 hover:shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <ImageIcon size={18} className="text-indigo-600" />
                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base">অফিসিয়াল লোগো ডাউনলোড</h4>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Mini Logo Preview */}
                    <div className="w-14 h-14 bg-[#06153a] rounded-xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden shrink-0">
                      <AppLogo variant="navy-striped" size="100%" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm md:text-base">স্মার্ট লোগো প্যাক</p>
                      <p className="text-xs text-slate-500 leading-normal max-w-md">১০২৪x১০২৪ সাইজের ক্রিস্প এইচডি রেজোলিউশনে অ্যান্ড্রয়েড স্টুডিও বা ব্র্যান্ডিং কাজের জন্য ডাউনলোড করুন।</p>
                    </div>
                  </div>
                  <button 
                    onClick={downloadLogoHD}
                    disabled={isCapturingLogo}
                    className={`w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-xs md:text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border border-transparent cursor-pointer
                      ${isLogoDownloadDone ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}
                    `}
                    id="settings-download-logo-btn"
                  >
                    {isCapturingLogo ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>প্রসেসিং...</span>
                      </>
                    ) : isLogoDownloadDone ? (
                      <>
                        <Check size={16} />
                        <span>ডাউনলোড হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>ডাউনলোড করুন</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Behind the scenes 1024x1024 pixel clean layout for crisp image extraction */}
                <div className="fixed -top-[9999px] -left-[9999px] -z-50 pointer-events-none opacity-0 select-none overflow-hidden" style={{ width: '1024px', height: '1024px' }}>
                  <div 
                    ref={logoRef}
                    style={{ 
                      width: '1024px', 
                      height: '1024px', 
                      backgroundColor: '#06153a', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <AppLogo variant="navy-striped" size="100%" rounded={false} />
                  </div>
                </div>
              </div>

              {/* Updates Row */}
              <div className="space-y-4">
                {/* Actual update check */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 hover:shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-indigo-50/80 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <RefreshCw size={20} className={isCheckingUpdate ? "animate-spin" : ""} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm md:text-base">সিস্টেম আপডেট</h4>
                      <p className="text-xs text-slate-500 leading-normal max-w-md">সার্ভারে কোড ও সংস্করণের নতুন ডেটাবেস আপডেট চেক করুন।</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 shadow-md shadow-indigo-100 disabled:shadow-none transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    id="settings-check-update-btn"
                  >
                    {isCheckingUpdate ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>গবেষণা হচ্ছে...</span>
                      </>
                    ) : (
                      <span>আপডেট চেক করুন</span>
                    )}
                  </button>
                </div>

                {/* Demo preview check */}
                <div className="bg-gradient-to-r from-violet-50/30 to-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-305 hover:shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-white text-indigo-600 border border-indigo-100 shadow-sm rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">✨</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-indigo-950 text-sm md:text-base">ডেমো আপডেট মডাল</h4>
                      <p className="text-xs text-indigo-600/80 leading-normal max-w-md font-medium">ইনস্টল প্রসেস এবং ডাউনলোড ইন্টারফেস দেখার প্রিভিউ সংস্করণ।</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('trigger-demo-update-modal'));
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 active:scale-95 shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer whitespace-nowrap"
                    id="settings-demo-update-btn"
                  >
                     প্রিভিউ দেখুন
                  </button>
                </div>
              </div>

              {/* Clear Cache Danger Zone */}
              <div className="border-t border-rose-100/60 pt-5 mt-6">
                <div className="flex items-start md:items-center justify-between bg-rose-50/40 border border-rose-100/60 p-4 md:p-5 rounded-2xl flex-col md:flex-row gap-4">
                  <div className="space-y-1">
                    <h4 className="text-rose-800 font-extrabold text-sm md:text-base">বিপদজনক অঞ্চল (Danger Zone)</h4>
                    <p className="text-xs text-rose-500 max-w-lg leading-normal font-medium">লোকাল ক্যাশ মেমোরি পরিষ্কার করুন। এটি করলে অ্যাপ সেশন থেকে আপনাকে সাথে সাথে সফলভাবে লগআউট করা হবে।</p>
                  </div>
                  <button 
                    onClick={() => setShowClearCacheModal(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 py-3 px-5 bg-rose-600 text-white rounded-xl font-extrabold text-xs md:text-sm hover:bg-rose-700 shadow-md shadow-rose-100 hover:border-transparent cursor-pointer active:scale-95 duration-200"
                    id="settings-clear-cache-btn"
                  >
                    <Trash2 size={16} />
                    অ্যাপ ক্যাশ সাফ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup & Restore Tab Content */}
        {activeTab === 'backup' && (
          <div className="space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 animate-fadeIn" id="tab-content-backup">
            <div className="pb-4 mb-2">
              <h3 className="text-lg font-black text-slate-800 mb-1">ডাটা ব্যাকআপ ও রিস্টোর</h3>
              <p className="text-xs text-slate-400 font-medium">আপনার অ্যাকাউন্টের সব ডাটা ফাইল আকারে ডাউনলোড করুন এবং পরবর্তীতে অন্য কোনো ডিভাইস বা অ্যাকাউন্টে রিস্টোর করুন।</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 pt-2">
              {/* Export Panel */}
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg flex items-center justify-center shadow-sm">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base">ডাটা এক্সপোর্ট (Export)</h4>
                    <p className="text-[10px] text-slate-400">আপনার সব বর্তমান তথ্য ব্যাকআপ ফাইল হিসেবে সেভ করুন</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    এই ব্যাকআপ ফাইলের ভেতর আপনার প্রজেক্ট, কাস্টমার লিস্ট, আয়-ব্যয়, গজল নোট, শপিং লিস্ট, দেনা-পাওনা এবং কার রেন্ট সিস্টেমের সমস্ত তথ্য সুরক্ষিতভাবে সংকলিত থাকবে।
                  </p>

                  {/* Summary counts of exportable items with custom interactive checkboxes */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-3 text-xs select-none">
                    <div className="font-bold text-slate-600 mb-1 flex items-center justify-between border-b border-slate-200/50 pb-2">
                      <span className="flex items-center gap-1.5"><span>📊</span> ব্যাকআপের ক্যাটাগরি নির্বাচন করুন:</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const allTrue = Object.values(exportSelections).every(v => v);
                          setExportSelections({
                            projects: !allTrue,
                            project_income: !allTrue,
                            clients: !allTrue,
                            shopping_lists: !allTrue,
                            ghazal_notes: !allTrue,
                            car_rent: !allTrue,
                            wallets: !allTrue,
                          });
                        }}
                        className="text-[10px] text-amber-600 font-extrabold hover:underline cursor-pointer"
                      >
                        {Object.values(exportSelections).every(v => v) ? 'সব আনসিলেক্ট করুন' : 'সব সিলেক্ট করুন'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-slate-500 font-medium select-none">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.projects}
                          onChange={(e) => setExportSelections({ ...exportSelections, projects: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <span>প্রজেক্টসমূহ ({(projects || []).length}টি)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.project_income}
                          onChange={(e) => setExportSelections({ ...exportSelections, project_income: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <span>প্রজেক্টের আয় ({(incomeRecords || []).filter(r => Boolean(r.projectid)).length}টি)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.clients}
                          onChange={(e) => setExportSelections({ ...exportSelections, clients: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <span>কাস্টমারসমূহ ({(clients || []).length}টি)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.shopping_lists}
                          onChange={(e) => setExportSelections({ ...exportSelections, shopping_lists: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <span>শপিং লিস্ট ({(shoppingLists || []).length}টি)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.ghazal_notes}
                          onChange={(e) => setExportSelections({ ...exportSelections, ghazal_notes: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <span>গজলের নোট ({(ghazalNotes || []).length}টি)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-700 text-[#1a73e8] font-bold transition-colors">
                        <input
                          type="checkbox"
                          checked={exportSelections.car_rent}
                          onChange={(e) => setExportSelections({ ...exportSelections, car_rent: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                        />
                        <span>কার রেন্ট ডাটা (Firestore)</span>
                      </label>
                      <div className="col-span-2 mt-1 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                          <input
                            type="checkbox"
                            checked={exportSelections.wallets}
                            onChange={(e) => setExportSelections({ ...exportSelections, wallets: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-400 border-slate-300 accent-amber-600 cursor-pointer"
                          />
                          <span>
                            ওয়ালেট ({selectedWalletIds.size}/{availableWallets.length || 1}টি সিলেক্টেড)
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowWalletModal(true)}
                          className="px-2.5 py-1 text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" /> নির্দিষ্ট ওয়ালেট সিলেক্ট করুন
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-extrabold text-sm hover:from-amber-600 hover:to-amber-700 active:scale-95 transition-all duration-200 shadow-md shadow-amber-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>ব্যাকআপ তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>ব্যাকআপ ফাইল ডাউনলোড করুন</span>
                    </>
                  )}
                </button>
              </div>

              {/* Import Panel */}
              <div className="space-y-5 flex flex-col lg:pl-14 pt-8 lg:pt-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg flex items-center justify-center shadow-sm">
                    <Upload size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm md:text-base">ডাটা ইমপোর্ট (Import)</h4>
                    <p className="text-[10px] text-slate-400">ব্যাকআপ ফাইল থেকে আপনার তথ্য রিস্টোর বা আপডেট করুন</p>
                  </div>
                </div>

                {importStatus === 'idle' && (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => importFileInputRef.current?.click()}
                    className={`flex-1 min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300 cursor-pointer ${
                      dragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-500 hover:bg-slate-50/30'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={importFileInputRef}
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileChange} 
                    />
                    <UploadCloud size={32} className="text-slate-400 mb-2.5 animate-pulse" />
                    <p className="font-black text-xs text-slate-700">ডিভাইস থেকে ব্যাকআপ ফাইল নির্বাচন করুন</p>
                    <p className="text-[10px] text-slate-400 mt-1">অথবা ফাইলটি এখানে ড্র্যাগ অ্যান্ড ড্রপ করুন (শুধুমাত্র .json ফরম্যাট)</p>
                  </div>
                )}

                {importStatus === 'validating' && (
                  <div className="flex-1 min-h-[220px] border border-slate-100 bg-slate-50/40 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-inner">
                    <Loader2 className="animate-spin text-indigo-500 mb-2.5" size={28} />
                    <p className="font-black text-xs text-slate-700">ফাইলটি যাচাই করা হচ্ছে...</p>
                    <p className="text-[10px] text-slate-400 mt-1">ব্যাকআপ ফাইলের গঠন পরীক্ষা করা হচ্ছে</p>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div className="flex-1 min-h-[220px] border border-rose-100 bg-rose-50/20 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="text-rose-500 mb-2" size={28} />
                    <p className="font-black text-xs text-rose-800">ভুল ব্যাকআপ ফাইল!</p>
                    <p className="text-[10px] text-rose-600 max-w-xs mt-1 leading-normal font-medium">{importErrorMessage}</p>
                    <button
                      onClick={() => setImportStatus('idle')}
                      className="mt-4 px-4 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      আবার চেষ্টা করুন
                    </button>
                  </div>
                )}

                {importStatus === 'ready' && importPreview && (
                  <div className="flex-1 space-y-4">
                    {/* Validation Successful Header */}
                    <div className="bg-emerald-50 border border-emerald-100/80 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-800 animate-fadeIn">
                      <CheckCircle className="shrink-0 text-emerald-600 mt-0.5" size={16} />
                      <div className="text-xs">
                        <p className="font-extrabold">সঠিক ব্যাকআপ ফাইল পাওয়া গেছে!</p>
                        <p className="text-[10px] text-emerald-600/90 font-medium mt-0.5">উৎসের ইমেইল: {importPreview.userEmail}</p>
                        {importPreview.exportedAt && (
                          <p className="text-[10px] text-emerald-600/90 font-medium">রপ্তানির সময়: {new Date(importPreview.exportedAt).toLocaleString('bn-BD')}</p>
                        )}
                      </div>
                    </div>

                    {/* Breakdown of elements being imported with custom checkboxes */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-3 text-xs select-none">
                      <div className="font-bold text-slate-600 border-b border-slate-200/50 pb-2 flex justify-between items-center select-none">
                        <span className="flex items-center gap-1">📋 ইমপোর্ট ডাটা নির্বাচন করুন:</span>
                        <button 
                          type="button"
                          onClick={() => {
                            const availableKeys = Object.keys(importSelections).filter(key => importPreview.counts[key] > 0);
                            const allTrue = availableKeys.every(key => importSelections[key]);
                            const updatedSelections = { ...importSelections };
                            availableKeys.forEach(key => {
                              updatedSelections[key] = !allTrue;
                            });
                            setImportSelections(updatedSelections);
                          }}
                          className="text-[10px] text-indigo-600 font-extrabold hover:underline cursor-pointer"
                        >
                          {Object.keys(importSelections).filter(key => importPreview.counts[key] > 0).every(key => importSelections[key]) ? 'সব আনসিলেক্ট করুন' : 'সব সিলেক্ট করুন'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-500 font-medium max-h-[145px] overflow-y-auto select-none pr-1">
                        {importPreview.counts.projects > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.projects}
                              onChange={(e) => setImportSelections({ ...importSelections, projects: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>প্রজেক্ট ({importPreview.counts.projects}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.clients > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.clients}
                              onChange={(e) => setImportSelections({ ...importSelections, clients: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>কাস্টমার ({importPreview.counts.clients}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.project_income > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.project_income}
                              onChange={(e) => setImportSelections({ ...importSelections, project_income: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>প্রজেক্টের আয় ({importPreview.counts.project_income}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.wallets > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.wallets}
                              onChange={(e) => setImportSelections({ ...importSelections, wallets: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>ওয়ালেট ({importPreview.counts.wallets}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.wallet_income > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.wallet_income}
                              onChange={(e) => setImportSelections({ ...importSelections, wallet_income: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>ওয়ালেট/সাধারণ আয় ({importPreview.counts.wallet_income}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.expenses > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.expenses}
                              onChange={(e) => setImportSelections({ ...importSelections, expenses: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>দৈনিক খরচ/ব্যয় ({importPreview.counts.expenses}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.ghazal_notes > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.ghazal_notes}
                              onChange={(e) => setImportSelections({ ...importSelections, ghazal_notes: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>গজল নোট ({importPreview.counts.ghazal_notes}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.shopping_lists > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.shopping_lists}
                              onChange={(e) => setImportSelections({ ...importSelections, shopping_lists: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>শপিং লিস্ট ({importPreview.counts.shopping_lists}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.due_persons > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.due_persons}
                              onChange={(e) => setImportSelections({ ...importSelections, due_persons: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-indigo-500 focus:ring-indigo-400 border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>দেনা-পাওনা ({importPreview.counts.due_persons}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.car_rent_friends > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-[#1a73e8] text-[#1a73e8] font-bold transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.car_rent_friends}
                              onChange={(e) => setImportSelections({ ...importSelections, car_rent_friends: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>রেন্ট ফ্রেন্ড ({importPreview.counts.car_rent_friends}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.car_rent_trips > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-[#1a73e8] text-[#1a73e8] font-bold transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.car_rent_trips}
                              onChange={(e) => setImportSelections({ ...importSelections, car_rent_trips: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>রেন্ট ট্রিপ ({importPreview.counts.car_rent_trips}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.car_rent_collections > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-[#1a73e8] text-[#1a73e8] font-bold transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.car_rent_collections}
                              onChange={(e) => setImportSelections({ ...importSelections, car_rent_collections: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>রেন্ট কালেকশন ({importPreview.counts.car_rent_collections}টি)</span>
                          </label>
                        )}
                        {importPreview.counts.car_rent_driver_payments > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer hover:text-[#1a73e8] text-[#1a73e8] font-bold transition-colors">
                            <input
                              type="checkbox"
                              checked={!!importSelections.car_rent_driver_payments}
                              onChange={(e) => setImportSelections({ ...importSelections, car_rent_driver_payments: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 accent-indigo-600 cursor-pointer"
                            />
                            <span>ড্রাইভার পেমেন্ট ({importPreview.counts.car_rent_driver_payments}টি)</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportPreview(null);
                          setImportStatus('idle');
                        }}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs md:text-sm active:scale-95 transition-all duration-200 cursor-pointer"
                        disabled={isImporting}
                      >
                        অন্য ফাইল
                      </button>
                      <button
                        onClick={handleImportData}
                        disabled={isImporting}
                        className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs md:text-sm active:scale-95 transition-all duration-200 shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>ইমপোর্ট হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>ইমপোর্ট সম্পন্ন করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ব্যাকআপের জন্য ওয়ালেট নির্বাচন</h3>
                  <p className="text-[11px] text-slate-400">নির্দিষ্ট ওয়ালেটের আয়, ব্যয় ও লেনদেন ব্যাকআপ নিন</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl">
              <span>ওয়ালেটের তালিকা ({availableWallets.length}টি)</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedWalletIds.size === availableWallets.length) {
                    setSelectedWalletIds(new Set());
                  } else {
                    setSelectedWalletIds(new Set(availableWallets.map(w => w.id)));
                  }
                }}
                className="text-amber-600 hover:underline text-[11px] font-extrabold cursor-pointer"
              >
                {selectedWalletIds.size === availableWallets.length ? 'সব আনসিলেক্ট করুন' : 'সব সিলেক্ট করুন'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {availableWallets.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">কোনো একটিভ ওয়ালেট পাওয়া যায়নি</p>
              ) : (
                availableWallets.map((wallet) => {
                  const isChecked = selectedWalletIds.has(wallet.id);
                  return (
                    <label 
                      key={wallet.id} 
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isChecked 
                          ? 'bg-amber-50/70 border-amber-200 text-slate-800' 
                          : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const newSet = new Set(selectedWalletIds);
                            if (newSet.has(wallet.id)) {
                              newSet.delete(wallet.id);
                            } else {
                              newSet.add(wallet.id);
                            }
                            setSelectedWalletIds(newSet);
                          }}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 accent-amber-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">{wallet.name}</p>
                          <p className="text-[10px] text-slate-400">টাইপ: {wallet.type || 'সাধারণ'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/60">
                        ৳{Number(wallet.balance || 0).toLocaleString('bn-BD')}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs transition-colors shadow-sm cursor-pointer"
              >
                সংরক্ষণ করুন ({selectedWalletIds.size}টি নির্বাচিত)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Action Modal (Setup or Disable) */}
      {pinAction && (
          <AppLock 
            // If we are disabling, we use 'unlock' mode (verify current pin).
            // If we are setting up, we use 'setup' mode.
            mode={pinAction === 'disable' ? 'unlock' : 'setup'}
            savedPin={pinAction === 'disable' ? appPin : undefined}
            onSuccess={handlePinSuccess}
            onCancel={() => setPinAction(null)}
          />
      )}

      {/* Clear Cache Premium Confirmation Modal */}
      <ConfirmModal 
        isOpen={showClearCacheModal}
        onClose={() => setShowClearCacheModal(false)}
        onConfirm={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        }}
        title="ক্যাশ ক্লিয়ার করুন"
        message="আপনি কি অ্যাপের ক্যাশ ক্লিয়ার করতে চান? এটি আপনাকে লগআউট করে দিবে এবং সব তথ্য নতুন করে লোড হবে।"
        confirmText="ক্লিয়ার করুন"
        cancelText="বাতিল"
        type="danger"
      />
      </div>
    </div>
  );
};
