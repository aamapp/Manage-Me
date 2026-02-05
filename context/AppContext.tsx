
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Client, User, IncomeRecord, UserProfile } from '../types';
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
  
  // Master Data (Contains ALL data for Admin)
  allProjects: Project[];
  allClients: Client[];
  allIncomeRecords: IncomeRecord[];
  
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

  // Master State (All data cache for Admin)
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allIncomeRecords, setAllIncomeRecords] = useState<IncomeRecord[]>([]);
  
  // User Profiles
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  
  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appPin, setAppPinState] = useState<string | null>(null);

  // Admin Selection State
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);

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
    try {
      const isAdmin = user.role === 'admin';

      // Base queries - fetch everything initially
      let projQuery = supabase.from('projects').select('*');
      let clientQuery = supabase.from('clients').select('*');
      let incomeQuery = supabase.from('income_records').select('*');

      // If NOT admin, filter at DB level for efficiency/security
      if (!isAdmin) {
        projQuery = projQuery.eq('userid', user.id);
        clientQuery = clientQuery.eq('userid', user.id);
        incomeQuery = incomeQuery.eq('userid', user.id);
      }

      const [projRes, clientRes, incomeRes] = await Promise.all([
        projQuery.order('createdat', { ascending: false }),
        clientQuery.order('name', { ascending: true }),
        incomeQuery.order('date', { ascending: false })
      ]);

      if (projRes.error) showToast(`প্রজেক্ট লোড এরর: ${projRes.error.message}`);
      if (clientRes.error) showToast(`ক্লায়েন্ট লোড এরর: ${clientRes.error.message}`);
      if (incomeRes.error) showToast(`আয় রেকর্ড লোড এরর: ${incomeRes.error.message}`);
      
      const pData = projRes.data as Project[] || [];
      const cData = clientRes.data as Client[] || [];
      const iData = incomeRes.data as IncomeRecord[] || [];

      if (isAdmin) {
        // Store everything in Master State
        setAllProjects(pData);
        setAllClients(cData);
        setAllIncomeRecords(iData);
        
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
        } else {
            // If no user selected, show NOTHING in the main views (forces selection from list)
            setProjects([]);
            setClients([]);
            setIncomeRecords([]);
        }
      } else {
        // Normal User: Visible = All fetched
        setProjects(pData);
        setClients(cData);
        setIncomeRecords(iData);
      }

    } catch (error: any) {
      showToast(`কানেকশন এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Effect to re-filter data when Admin selection changes without re-fetching
  useEffect(() => {
    if (user?.role === 'admin') {
        if (adminSelectedUserId) {
            setProjects(allProjects.filter(p => p.userid === adminSelectedUserId));
            setClients(allClients.filter(c => c.userid === adminSelectedUserId));
            setIncomeRecords(allIncomeRecords.filter(i => i.userid === adminSelectedUserId));
        } else {
            setProjects([]);
            setClients([]);
            setIncomeRecords([]);
        }
    }
  }, [adminSelectedUserId, allProjects, allClients, allIncomeRecords, user]);

  // Helper to sync user state with DB profile
  const syncUserWithProfile = async (sessionUser: any) => {
      if (!sessionUser) return null;
      
      const metadata = sessionUser.user_metadata;
      
      // Fetch fresh profile data from DB (Source of Truth)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
      
      // Prioritize DB profile over auth metadata for name/avatar
      return {
          id: sessionUser.id,
          email: sessionUser.email || '',
          name: profile?.name || metadata?.name || 'User',
          phone: metadata?.phone || '',
          occupation: metadata?.occupation || '',
          avatar_url: profile?.avatar_url || metadata?.avatar_url || '',
          language: metadata?.language || 'bn',
          currency: metadata?.currency || '৳',
          role: metadata?.role || 'user'
      };
  };

  useEffect(() => {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await syncUserWithProfile(session.user);
        setUser(userData);
      }
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = await syncUserWithProfile(session.user);
        setUser(userData);
      } else {
        setUser(null);
        setProjects([]);
        setClients([]);
        setIncomeRecords([]);
        setAllProjects([]);
        setAllClients([]);
        setAllIncomeRecords([]);
        setUserProfiles([]);
        setAdminSelectedUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [showToast]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ 
      projects, setProjects, clients, setClients, 
      incomeRecords, setIncomeRecords,
      allProjects, allClients, allIncomeRecords,
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
