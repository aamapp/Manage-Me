
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project, Client, User, IncomeRecord, UserProfile, Expense, GhazalNote } from '@/types';
import { supabase, isConfigured } from '@/lib/supabase';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Visible Data (Filtered by Selected User if Admin)
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  trashedProjects: Project[];
  setTrashedProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomeRecords: IncomeRecord[];
  setIncomeRecords: React.Dispatch<React.SetStateAction<IncomeRecord[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  trashedExpenses: Expense[];
  setTrashedExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  ghazalNotes: GhazalNote[];
  setGhazalNotes: React.Dispatch<React.SetStateAction<GhazalNote[]>>;
  trashedGhazalNotes: GhazalNote[];
  setTrashedGhazalNotes: React.Dispatch<React.SetStateAction<GhazalNote[]>>;
  trashedClients: Client[];
  setTrashedClients: React.Dispatch<React.SetStateAction<Client[]>>;
  
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
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  isAppLocked: boolean;
  setIsAppLocked: React.Dispatch<React.SetStateAction<boolean>>;
  appPin: string | null;
  setAppPin: (pin: string | null) => void;
  isOnline: boolean;
  
  // Admin Specific
  adminSelectedUserId: string | null;
  setAdminSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    // Hydrate user from localStorage on mount (Last Known User)
    const savedUser = localStorage.getItem('last_known_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('last_known_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('last_known_user');
    }
  };
  
  // Visible State (What components see)
  const [projects, setProjects] = useState<Project[]>([]);
  const [trashedProjects, setTrashedProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trashedExpenses, setTrashedExpenses] = useState<Expense[]>([]);
  const [ghazalNotes, setGhazalNotes] = useState<GhazalNote[]>([]);
  const [trashedGhazalNotes, setTrashedGhazalNotes] = useState<GhazalNote[]>([]);
  const [trashedClients, setTrashedClients] = useState<Client[]>([]);

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
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Admin Selection State
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  
  // Performance optimization: Prevent multiple simultaneous refreshes
  const isFetchingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'error') => {
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
    
    // 1. Load from cache first for immediate UI (Offline Support)
    const cacheKey = `manage_me_cache_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.projects) setProjects(parsed.projects);
        if (parsed.trashedProjects) setTrashedProjects(parsed.trashedProjects);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.trashedClients) setTrashedClients(parsed.trashedClients);
        if (parsed.incomeRecords) setIncomeRecords(parsed.incomeRecords);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.trashedExpenses) setTrashedExpenses(parsed.trashedExpenses);
        if (parsed.ghazalNotes) setGhazalNotes(parsed.ghazalNotes);
        if (parsed.trashedGhazalNotes) setTrashedGhazalNotes(parsed.trashedGhazalNotes);
        if (parsed.allProjects) setAllProjects(parsed.allProjects);
        if (parsed.allClients) setAllClients(parsed.allClients);
        if (parsed.allIncomeRecords) setAllIncomeRecords(parsed.allIncomeRecords);
        if (parsed.allExpenses) setAllExpenses(parsed.allExpenses);
        if (parsed.userProfiles) setUserProfiles(parsed.userProfiles);
      } catch (e) {
        console.warn("Cache hydration failed", e);
      }
    }

    // If offline, don't attempt network fetch
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // If already fetching, ignore this request to save bandwidth
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const isAdmin = user.role === 'admin';

      // Base queries - fetch everything initially
      let projQuery = supabase.from('projects').select('*').neq('id', `cb-${Date.now()}`);
      let clientQuery = supabase.from('clients').select('*').neq('id', `cb-${Date.now()}`);
      let incomeQuery = supabase.from('income_records').select('*').neq('id', `cb-${Date.now()}`);
      let expenseQuery = supabase.from('expenses').select('*').neq('id', `cb-${Date.now()}`);
      let ghazalQuery = supabase.from('ghazal_notes').select('*').neq('id', `cb-${Date.now()}`);

      // If NOT admin, filter at DB level for efficiency/security
      if (!isAdmin) {
        projQuery = projQuery.eq('userid', user.id);
        clientQuery = clientQuery.eq('userid', user.id);
        incomeQuery = incomeQuery.eq('userid', user.id);
        expenseQuery = expenseQuery.eq('userid', user.id);
        ghazalQuery = ghazalQuery.eq('userid', user.id);
      }

      const [projRes, clientRes, incomeRes, expenseRes, ghazalRes] = await Promise.all([
        projQuery.order('createdat', { ascending: false }),
        clientQuery.order('name', { ascending: true }),
        incomeQuery.order('date', { ascending: false }),
        expenseQuery.order('date', { ascending: false }),
        ghazalQuery.order('createdat', { ascending: false })
      ]);

      if (projRes.error) console.warn(`Project load error: ${projRes.error.message}`);
      
      const pData = projRes.data as Project[] || [];
      const cData = clientRes.data as Client[] || [];
      const iData = incomeRes.data as IncomeRecord[] || [];
      const eData = expenseRes.data as Expense[] || [];
      const gData = ghazalRes.data as GhazalNote[] || [];

      if (isAdmin) {
        // Store everything in Master State
        setAllProjects(pData);
        setAllClients(cData);
        setAllIncomeRecords(iData);
        setAllExpenses(eData);
        
        // Fetch User Profiles for Admin List
        const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
        let profilesData: UserProfile[] = [];
        if (!profError && profiles) {
            profilesData = profiles as UserProfile[];
            setUserProfiles(profilesData);
        }

        // Update Cache for Admin
        const cacheKey = `manage_me_cache_${user.id}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          allProjects: pData,
          allClients: cData,
          allIncomeRecords: iData,
          allExpenses: eData,
          userProfiles: profilesData,
          lastUpdated: Date.now()
        }));

        // Filter Visible State based on Selection
        if (adminSelectedUserId) {
            const userProjects = pData.filter(p => p.userid === adminSelectedUserId);
            const userExpenses = eData.filter(e => e.userid === adminSelectedUserId);
            const userGhazals = gData.filter(g => g.userid === adminSelectedUserId);

            setProjects(userProjects.filter(p => !p.notes?.startsWith('[TRASH]')));
            setTrashedProjects(userProjects.filter(p => p.notes?.startsWith('[TRASH]')));
            setClients(cData.filter(c => c.userid === adminSelectedUserId));
            setIncomeRecords(iData.filter(i => i.userid === adminSelectedUserId));
            setExpenses(userExpenses.filter(e => !e.notes?.startsWith('[TRASH]')));
            setTrashedExpenses(userExpenses.filter(e => e.notes?.startsWith('[TRASH]')));
            setGhazalNotes(userGhazals.filter(g => !g.lyrics?.startsWith('[TRASH]')));
            setTrashedGhazalNotes(userGhazals.filter(g => g.lyrics?.startsWith('[TRASH]')));
            setClients(cData.filter(c => c.userid === adminSelectedUserId && !c.contact?.startsWith('[TRASH]')));
            setTrashedClients(cData.filter(c => c.userid === adminSelectedUserId && c.contact?.startsWith('[TRASH]')));
            setIncomeRecords(iData.filter(i => {
              if (i.userid !== adminSelectedUserId) return false;
              const isProjectTrashed = pData.find(p => p.id === i.projectid)?.notes?.startsWith('[TRASH]');
              const isClientTrashed = cData.find(c => c.name === i.clientname)?.contact?.startsWith('[TRASH]');
              return !isProjectTrashed && !isClientTrashed;
            }));
            setExpenses(userExpenses.filter(e => !e.notes?.startsWith('[TRASH]')));
            setTrashedExpenses(userExpenses.filter(e => e.notes?.startsWith('[TRASH]')));
        } else {
            // If no user selected, show NOTHING in the main views (forces selection from list)
            setProjects([]);
            setTrashedProjects([]);
            setClients([]);
            setTrashedClients([]);
            setIncomeRecords([]);
            setExpenses([]);
            setTrashedExpenses([]);
            setGhazalNotes([]);
            setTrashedGhazalNotes([]);
        }
      } else {
        // Normal User: Visible = All fetched
        const userProjects = pData.filter(p => !p.notes?.startsWith('[TRASH]'));
        const userTrashedProjects = pData.filter(p => p.notes?.startsWith('[TRASH]'));
        const userClients = cData.filter(c => !c.contact?.startsWith('[TRASH]'));
        const userTrashedClients = cData.filter(c => c.contact?.startsWith('[TRASH]'));
        const userIncome = iData.filter(i => {
          const isProjectTrashed = pData.find(p => p.id === i.projectid)?.notes?.startsWith('[TRASH]');
          const isClientTrashed = cData.find(c => c.name === i.clientname)?.contact?.startsWith('[TRASH]');
          return !isProjectTrashed && !isClientTrashed;
        });
        const userExpenses = eData.filter(e => !e.notes?.startsWith('[TRASH]'));
        const userTrashedExpenses = eData.filter(e => e.notes?.startsWith('[TRASH]'));
        const userGhazals = gData.filter(g => !g.lyrics?.startsWith('[TRASH]'));
        const userTrashedGhazals = gData.filter(g => g.lyrics?.startsWith('[TRASH]'));

        setProjects(userProjects);
        setTrashedProjects(userTrashedProjects);
        setClients(userClients);
        setTrashedClients(userTrashedClients);
        setIncomeRecords(userIncome);
        setExpenses(userExpenses);
        setTrashedExpenses(userTrashedExpenses);
        setGhazalNotes(userGhazals);
        setTrashedGhazalNotes(userTrashedGhazals);

        // Update Cache for Offline Support
        const cacheKey = `manage_me_cache_${user.id}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          projects: userProjects,
          trashedProjects: userTrashedProjects,
          clients: userClients,
          trashedClients: userTrashedClients,
          incomeRecords: userIncome,
          expenses: userExpenses,
          trashedExpenses: userTrashedExpenses,
          ghazalNotes: userGhazals,
          trashedGhazalNotes: userTrashedGhazals,
          lastUpdated: Date.now()
        }));
      }

    } catch (error: any) {
      console.error("Refresh Data Error:", error);
      if (error.message?.includes('JWT') || 
          error.message?.includes('Unauthorized') || 
          error.message?.includes('Refresh Token') ||
          error.message?.includes('refresh_token_not_found') ||
          error.status === 400 ||
          error.status === 401) {
          
          // Clear local storage manually as a fallback
          for (const key in localStorage) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut().catch(() => {});
          setUser(null);
          showToast('আপনার সেশনের মেয়াদ শেষ হয়েছে, দয়া করে পুনরায় লগইন করুন।', 'info');
      } else {
          showToast(`কানেকশন এরর: ${error.message}`);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Handle Online/Offline Status with Active Ping Check
  useEffect(() => {
    const checkActualConnectivity = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        // Try to fetch a tiny resource with a cache-buster to verify actual internet access
        // Using a 3-second timeout for faster detection
        const response = await fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors', 
          cache: 'no-store',
          signal: AbortSignal.timeout(3000) 
        });
        setIsOnline(true);
      } catch (error) {
        // If fetch fails, it's likely no actual internet (e.g. no MB)
        setIsOnline(false);
      }
    };

    const handleOnline = () => checkActualConnectivity();
    const handleOffline = () => setIsOnline(false);
    const handleFocus = () => checkActualConnectivity();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    // Periodic check every 5 seconds for high responsiveness
    const interval = setInterval(checkActualConnectivity, 5000);

    // Initial check
    checkActualConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Effect to re-filter data when Admin selection changes without re-fetching
  useEffect(() => {
    if (user?.role === 'admin') {
        if (adminSelectedUserId) {
            const userProjects = allProjects.filter(p => p.userid === adminSelectedUserId);
            setProjects(userProjects.filter(p => !p.notes?.startsWith('[TRASH]')));
            setTrashedProjects(userProjects.filter(p => p.notes?.startsWith('[TRASH]')));
            setClients(allClients.filter(c => c.userid === adminSelectedUserId));
            setIncomeRecords(allIncomeRecords.filter(i => i.userid === adminSelectedUserId));
            setExpenses(allExpenses.filter(e => e.userid === adminSelectedUserId));
        } else {
            setProjects([]);
            setTrashedProjects([]);
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
        // Force a session refresh to get the latest metadata on mobile
        // Wrap in try-catch to handle offline gracefully
        let session = null;
        try {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          session = refreshedSession;
        } catch (e) {
          console.log("Offline or refresh failed, trying to get cached session");
        }
        
        if (!session) {
          const { data: { session: cachedSession } } = await supabase.auth.getSession();
          session = cachedSession;
        }
        
        // If still no session and we are offline, check if we have a token in localStorage
        // If we do, don't give up yet - wait for network to return
        if (!session && !navigator.onLine && mounted) {
          const hasToken = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
          if (hasToken) {
            console.log("Offline with existing token, waiting for network to re-authenticate...");
            const handleOnline = () => {
              window.removeEventListener('online', handleOnline);
              initSession();
            };
            window.addEventListener('online', handleOnline);
            // We don't set loading to false here, we wait for the online event
            return;
          }
        }
        
        if (session?.user && mounted) {
           // 1. Fetch from profiles table (Source of Truth) FIRST
           // Add a cache-buster to the query to bypass mobile WebView cache
           let profile = null;
           try {
             const { data: profData } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', session.user.id)
               .neq('id', `cb-${Date.now()}`)
               .abortSignal(AbortSignal.timeout(5000)) // Add timeout for reliability
               .maybeSingle();
             profile = profData;
           } catch (e) {
             console.log("Offline or profile fetch failed, using metadata or cached user");
           }

           const metadata = session.user.user_metadata;
           
           // 2. Set user state, prioritizing profile table data
           // Add a cache-buster to avatar_url to force mobile browsers to reload
           const avatarUrl = profile?.avatar_url || metadata?.avatar_url || '';
           const cacheBuster = avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : '';

           const updatedUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: profile?.name || metadata?.name || 'User',
              phone: profile?.phone || metadata?.phone || '',
              occupation: profile?.occupation || metadata?.occupation || '',
              avatar_url: cacheBuster || avatarUrl,
              language: profile?.language || metadata?.language || 'bn',
              currency: profile?.currency || metadata?.currency || '৳',
              role: metadata?.role || 'user',
              createdat: profile?.createdat || session.user.created_at
           };
           
           setUser(updatedUser);
        } else if (!session && navigator.onLine) {
           // Only clear if online and definitely no session
           setUser(null);
        }
      } catch (err: any) {
        console.error("Session Init Error:", err);
        if (err.message?.includes('Refresh Token Not Found') || 
            err.message?.includes('Invalid Refresh Token') ||
            err.message?.includes('refresh_token_not_found') ||
            err.status === 400 || 
            err.status === 401) {
            
            for (const key in localStorage) {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            }
            supabase.auth.signOut().catch(() => {});
            if (mounted) setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          // If offline, don't treat this as a fatal logout yet
          if (!navigator.onLine) {
            console.log("Token refresh failed while offline, ignoring...");
            return;
          }

          for (const key in localStorage) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut().catch(() => {});
          if (mounted) setUser(null);
          showToast('আপনার সেশনের মেয়াদ শেষ হয়েছে, দয়া করে পুনরায় লগইন করুন।', 'info');
          return;
      }

      if (session?.user) {
        if (mounted) {
            const metadata = session.user.user_metadata;
            
            // Background Sync with Profile Table (Source of Truth)
            supabase.from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .neq('id', `cb-${Date.now()}`)
              .abortSignal(AbortSignal.timeout(5000))
              .maybeSingle()
             .then(({ data: profile }) => {
                 if (mounted) {
                     const avatarUrl = profile?.avatar_url || metadata?.avatar_url || '';
                     const cacheBuster = avatarUrl ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : '';

                     setUser({
                         id: session.user.id,
                         email: session.user.email || '',
                         name: profile?.name || metadata?.name || 'User',
                         phone: profile?.phone || metadata?.phone || '',
                         occupation: profile?.occupation || metadata?.occupation || '',
                         avatar_url: cacheBuster || avatarUrl,
                         language: profile?.language || metadata?.language || 'bn',
                         currency: profile?.currency || metadata?.currency || '৳',
                         role: metadata?.role || 'user',
                         createdat: profile?.createdat || session.user.created_at
                     });
                 }
             });
        }
      } else if (event === 'SIGNED_OUT') {
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

  // Real-time Data Sync
  useEffect(() => {
    if (!user || !isConfigured) return;

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income_records' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ghazal_notes' }, () => refreshData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      projects, setProjects, trashedProjects, setTrashedProjects, clients, setClients, 
      incomeRecords, setIncomeRecords, expenses, setExpenses, trashedExpenses, setTrashedExpenses,
      ghazalNotes, setGhazalNotes, trashedGhazalNotes, setTrashedGhazalNotes,
      trashedClients, setTrashedClients,
      allProjects, allClients, allIncomeRecords, allExpenses,
      userProfiles,
      user, setUser, loading, refreshData,
      toast, showToast, hideToast,
      isAppLocked, setIsAppLocked,
      appPin, setAppPin,
      adminSelectedUserId, setAdminSelectedUserId,
      isOnline
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
