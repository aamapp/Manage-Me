
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Client, User, IncomeRecord } from '../types';
import { supabase, isConfigured } from '../lib/supabase';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomeRecords: IncomeRecord[];
  setIncomeRecords: React.Dispatch<React.SetStateAction<IncomeRecord[]>>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  
  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appPin, setAppPinState] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Helper to update PIN in state and local storage
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
      const [projRes, clientRes, incomeRes] = await Promise.all([
        supabase.from('projects').select('*').eq('userid', user.id).order('createdat', { ascending: false }),
        supabase.from('clients').select('*').eq('userid', user.id).order('name', { ascending: true }),
        supabase.from('income_records').select('*').eq('userid', user.id).order('date', { ascending: false })
      ]);

      if (projRes.error) showToast(`প্রজেক্ট লোড এরর: ${projRes.error.message}`);
      if (clientRes.error) showToast(`ক্লায়েন্ট লোড এরর: ${clientRes.error.message}`);
      if (incomeRes.error) showToast(`আয় রেকর্ড লোড এরর: ${incomeRes.error.message}`);
      
      if (projRes.data) setProjects(projRes.data as any);
      if (clientRes.data) setClients(clientRes.data as any);
      if (incomeRes.data) setIncomeRecords(incomeRes.data as any);
    } catch (error: any) {
      showToast(`কানেকশন এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for saved PIN on load
    const savedPin = localStorage.getItem('manage_me_pin');
    if (savedPin) {
        setAppPinState(savedPin);
        setIsAppLocked(true); // Lock initially if PIN exists
    }

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
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
          role: 'user'
        });
      }
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
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
          role: 'user'
        });
      } else {
        setUser(null);
        setProjects([]);
        setClients([]);
        setIncomeRecords([]);
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
      user, setUser, loading, refreshData,
      toast, showToast, hideToast,
      isAppLocked, setIsAppLocked,
      appPin, setAppPin
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
