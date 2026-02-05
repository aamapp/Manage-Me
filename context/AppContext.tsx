
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project, Client, User, IncomeRecord, UserProfile, Expense } from '../types';
import { supabase, isConfigured } from '../lib/supabase';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AppContextType {
  // Visible Data (Filtered by Selected User if Admin)
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomeRecords: IncomeRecord[];
  setIncomeRecords: React.Dispatch<React.SetStateAction<IncomeRecord[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  
  // Master Data (Contains ALL data for Admin)
  allProjects: Project[];
  allClients: Client[];
  allIncomeRecords: IncomeRecord[];
  allExpenses: Expense[];
  
  // Profiles Data (For Admin List)
  userProfiles: UserProfile[];

  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  refreshData: () => Promise<void>;
  toast: ToastState | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
  isAppLocked: boolean;
  setIsAppLocked: React.Dispatch<React.SetStateAction<boolean>>;
  appPin: string | null;
  setAppPin: (pin: string | null) => void;
  
  // Admin Specific
  adminSelectedUserId: string | null;
  setAdminSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Visible State (What components see)
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Master State (All data cache for Admin)
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allIncomeRecords, setAllIncomeRecords] = useState<IncomeRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  
  // User Profiles
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  
  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appPin, setAppPinState] = useState<string | null>(null);

  // Admin Selection State
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  
  // Performance optimization: Prevent multiple simultaneous refreshes
  const isFetchingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const setAppPin = (pin: string | null) => {
    if (pin) {
        localStorage.setItem('manage_me_pin', pin);
    } else {
        localStorage.removeItem('manage_me_pin');
    }
    setAppPinState(pin);
  };

  const refreshData = async () => {
    if (!user || !isConfigured) return;
    
    // If already fetching, ignore this request to save bandwidth
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const isAdmin = user.role === 'admin';

      // Base queries - fetch everything initially
      let projQuery = supabase.from('projects').select('*');
      let clientQuery = supabase.from('clients').select('*');
      let incomeQuery = supabase.from('income_records').select('*');
      let expenseQuery = supabase.from('expenses').select('*');

      // If NOT admin, filter at DB level for efficiency/security
      if (!isAdmin) {
        projQuery = projQuery.eq('userid', user.id);
        clientQuery = clientQuery.eq('userid', user.id);
        incomeQuery = incomeQuery.eq('userid', user.id);
        expenseQuery = expenseQuery.eq('userid', user.id);
      }

      const [projRes, clientRes, incomeRes, expenseRes] = await Promise.all([
        projQuery.order('createdat', { ascending: false }),
        clientQuery.order('name', { ascending: true }),
        incomeQuery.order('date', { ascending: false }),
        expenseQuery.order('date', { ascending: false })
      ]);

      if (projRes.error) console.warn(`Project load error: ${projRes.error.message}`);
      
      const pData = projRes.data as Project[] || [];
      const cData = clientRes.data as Client[] || [];
      const iData = incomeRes.data as IncomeRecord[] || [];
      const eData = expenseRes.data as Expense[] || [];

      if (isAdmin) {
        // Store everything in Master State
        setAllProjects(pData);
        setAllClients(cData);
        setAllIncomeRecords(iData);
        setAllExpenses(eData);
        
        // Fetch User Profiles for Admin List
        const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
        if (!profError && profiles) {
            setUserProfiles(profiles as UserProfile[]);
        }

        // Filter Visible State based on Selection
        if (adminSelectedUserId) {
            setProjects(pData.filter(p => p.userid === adminSelectedUserId));
            setClients(cData.filter(c => c.userid === adminSelectedUserId));
            setIncomeRecords(iData.filter(i => i.userid === adminSelectedUserId));
            setExpenses(eData.filter(e => e.userid === adminSelectedUserId));
        } else {
            // If no user selected, show NOTHING in the main views (forces selection from list)
            setProjects([]);
            setClients([]);
            setIncomeRecords([]);
            setExpenses([]);
        }
      } else {
        // Normal User: Visible = All fetched
        setProjects(pData);
        setClients(cData);
        setIncomeRecords(iData);
        setExpenses(eData);
      }

    } catch (error: any) {
      showToast(`কানেকশন এরর: ${error.message}`);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Effect to re-filter data when Admin selection changes without re-fetching
  useEffect(() => {
    if (user?.role === 'admin') {
        if (adminSelectedUserId) {
            setProjects(allProjects.filter(p => p.userid === adminSelectedUserId));
            setClients(allClients.filter(c => c.userid === adminSelectedUserId));
            setIncomeRecords(allIncomeRecords.filter(i => i.userid === adminSelectedUserId));
            setExpenses(allExpenses.filter(e => e.userid === adminSelectedUserId));
        } else {
            setProjects([]);
            setClients([]);
            setIncomeRecords([]);
            setExpenses([]);
        }
    }
  }, [adminSelectedUserId, allProjects, allClients, allIncomeRecords, allExpenses, user]);

  useEffect(() => {
    let mounted = true;
    
    // Check local storage for PIN
    const savedPin = localStorage.getItem('manage_me_pin');
    if (savedPin) {
        setAppPinState(savedPin);
        setIsAppLocked(true); 
    }

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 5000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (error) {
            console.warn("Session Init Warning:", error);
        }

        if (session?.user && mounted) {
           // Basic sync from metadata first (Fastest)
           const metadata = session.user.user_metadata;
           setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: metadata?.name || 'User',
              phone: metadata?.phone || '',
              occupation: metadata?.occupation || '',
              avatar_url: metadata?.avatar_url || '',
              language: metadata?.language || 'bn',
              currency: metadata?.currency || '৳',
              role: metadata?.role || 'user'
           });

           // Background fetch for profile updates (Source of truth)
           supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
             .then(({ data: profile }) => {
                 if (profile && mounted) {
                     setUser(prev => ({
                         ...prev!,
                         name: profile.name || prev!.name,
                         avatar_url: profile.avatar_url || prev!.avatar_url,
                     }));
                 }
             });
        }
      } catch (err) {
        console.error("Session Init Error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        if (mounted) {
            // OPTIMIZATION: Set User Immediately from Session Metadata to prevent UI blocking
            const metadata = session.user.user_metadata;
            
            // 1. Immediate UI update
            setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: metadata?.name || 'User',
                phone: metadata?.phone || '',
                occupation: metadata?.occupation || '',
                avatar_url: metadata?.avatar_url || '',
                language: metadata?.language || 'bn',
                currency: metadata?.currency || '৳',
                role: metadata?.role || 'user'
            });
            
            // 2. Background Sync with Profile Table (Non-blocking)
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
             .then(({ data: profile }) => {
                 if (profile && mounted) {
                     setUser(prev => {
                         // Only update if actually different to prevent unnecessary renders
                         if (prev && (prev.name !== profile.name || prev.avatar_url !== profile.avatar_url)) {
                             return {
                                 ...prev,
                                 name: profile.name || prev.name,
                                 avatar_url: profile.avatar_url || prev.avatar_url,
                             };
                         }
                         return prev;
                     });
                 }
             });
        }
      } else {
        if (mounted) {
            setUser(null);
            setProjects([]);
            setClients([]);
            setIncomeRecords([]);
            setExpenses([]);
            setAllProjects([]);
            setAllClients([]);
            setAllIncomeRecords([]);
            setAllExpenses([]);
            setUserProfiles([]);
            setAdminSelectedUserId(null);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [showToast]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      projects, setProjects, clients, setClients, 
      incomeRecords, setIncomeRecords, expenses, setExpenses,
      allProjects, allClients, allIncomeRecords, allExpenses,
      userProfiles,
      user, setUser, loading, refreshData,
      toast, showToast, hideToast,
      isAppLocked, setIsAppLocked,
      appPin, setAppPin,
      adminSelectedUserId, setAdminSelectedUserId
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
