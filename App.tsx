
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from './components/Layout';
import { Toast } from './components/Toast';
import { AppProvider, useAppContext } from './context/AppContext';
import { supabase, isConfigured } from './lib/supabase';

// Lazy loading components to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Projects = lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })));
const Clients = lazy(() => import('./pages/Clients').then(module => ({ default: module.Clients })));
const Income = lazy(() => import('./pages/Income').then(module => ({ default: module.Income })));
const Expenses = lazy(() => import('./pages/Expenses').then(module => ({ default: module.Expenses })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Signup = lazy(() => import('./pages/Signup').then(module => ({ default: module.Signup })));

// A simple loading fallback for lazy loaded components
const PageLoader = () => (
  <div className="h-full w-full flex flex-col items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-slate-400 text-sm font-medium animate-pulse">পেজ লোড হচ্ছে...</p>
  </div>
);

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
      
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
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
                  <Suspense fallback={<PageLoader />}>
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
                  </Suspense>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </Suspense>
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
