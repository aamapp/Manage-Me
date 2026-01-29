
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Client, User } from '../types';

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  loading: boolean;
}

const defaultUser: User = {
  id: '1',
  name: "ডেমো ইউজার",
  email: "demo@manage-me.com",
  language: 'bn',
  currency: '৳',
  role: 'user'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('mm_current_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(`mm_projects_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(`mm_clients_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);

  // ডাটা সেভ করা
  useEffect(() => {
    if (user.id) {
      localStorage.setItem(`mm_projects_${user.id}`, JSON.stringify(projects));
      localStorage.setItem(`mm_clients_${user.id}`, JSON.stringify(clients));
      localStorage.setItem('mm_current_user', JSON.stringify(user));
    }
  }, [projects, clients, user]);

  return (
    <AppContext.Provider value={{ projects, setProjects, clients, setClients, user, setUser, loading }}>
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
