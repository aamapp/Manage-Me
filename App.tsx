
import React from 'react';
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
import { supabase, isConfigured } from './lib/supabase';

const AppContent: React.FC = () => {
  const { user, loading, toast, showToast, hideToast } = useAppContext();

  const handleLogin = async (email: string, password?: string) => {
    if (!isConfigured) {
      showToast('সুপাবেজ কনফিগার করা হয়নি। lib/supabase.ts চেক করুন।');
      return;
    }
    if (!password) return;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast(error.message);
      } else {
        showToast('লগইন সফল হয়েছে!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'একটি অজানা সমস্যা হয়েছে।');
    }
  };

  const handleSignup = async (name: string, email: string, password?: string) => {
    if (!isConfigured) {
      showToast('সুপাবেজ কনফিগার করা হয়নি।');
      return;
    }
    if (!password) return;
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) {
        showToast(error.message);
      } else {
        showToast('অ্যাকাউন্ট তৈরি সফল! ইমেইল ভেরিফাই করুন।', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'একটি সমস্যা হয়েছে।');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast('লগআউট সফল হয়েছে।', 'success');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
      
      {!isConfigured && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white p-2 text-center text-xs font-bold z-[300]">
          সতর্কতা: সুপাবেজ কনফিগারেশন চেক করুন।
        </div>
      )}
      
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} onGoToSignup={() => window.location.hash = '/signup'} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/signup" 
          element={!user ? <Signup onSignup={handleSignup} onGoToLogin={() => window.location.hash = '/login'} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/*" 
          element={
            user ? (
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
