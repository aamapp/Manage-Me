
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Clients } from './pages/Clients';
import { Income } from './pages/Income';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Toast } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';

const AppContent: React.FC = () => {
  const { user, setUser } = useAppContext();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mm_is_logged_in') === 'true';
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
  };

  const handleLogin = (email: string, password?: string) => {
    // লোকাল সিমুলেটেড লগইন
    if (email === 'demo@manage-me.com' && password === 'password123') {
      setIsAuthenticated(true);
      localStorage.setItem('mm_is_logged_in', 'true');
      showToast('লগইন সফল হয়েছে!', 'success');
    } else {
      showToast('ভুল ইমেইল বা পাসওয়ার্ড। ডেমো ট্রাই করুন।');
    }
  };

  const handleSignup = (name: string, email: string, password?: string) => {
    // লোকাল সিমুলেটেড সাইনআপ
    setUser({ ...user, name, email, id: 'user_' + Date.now() });
    setIsAuthenticated(true);
    localStorage.setItem('mm_is_logged_in', 'true');
    showToast('অ্যাকাউন্ট তৈরি সফল হয়েছে!', 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('mm_is_logged_in');
    showToast('আপনি সফলভাবে লগআউট করেছেন।', 'success');
  };

  return (
    <HashRouter>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={handleLogin} onGoToSignup={() => window.location.hash = '/signup'} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/signup" 
          element={!isAuthenticated ? <Signup onSignup={handleSignup} onGoToLogin={() => window.location.hash = '/login'} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/income" element={<Income />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
