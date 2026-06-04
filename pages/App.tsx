
import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Layout } from '@/components/Layout';
import { Toast } from '@/components/Toast';
import { AppLock } from '@/components/AppLock'; 
import { ScrollToTop } from '@/components/ScrollToTop';
import { AppLogo } from '@/components/AppLogo';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { supabase, isConfigured } from '@/lib/supabase';
import { requestNotificationPermission, setupOnMessageListener } from '@/lib/firebase';

// Direct imports for main pages
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { Clients } from '@/pages/Clients';
import { Income } from '@/pages/Income';
import { Expenses } from '@/pages/Expenses';
import { Categories } from '@/pages/Categories';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { AdminUserList } from '@/pages/AdminUserList'; // New Import
import { GhazalNotes } from '@/pages/GhazalNotes';
import { IconGenerator } from '@/pages/IconGenerator';
import { Profile } from '@/pages/Profile';
import { Notifications } from '@/pages/Notifications';
import ShoppingLists from '@/pages/ShoppingLists';
import Trash from '@/pages/Trash';
import { AIAssistant } from '@/pages/AIAssistant';
import { ProjectsBackup } from '@/pages/ProjectsBackup';

const Login = lazy(() => import('@/pages/Login').then(module => ({ default: module.Login })));
const Signup = lazy(() => import('@/pages/Signup').then(module => ({ default: module.Signup })));

const AuthListener: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        showToast('পাসওয়ার্ড রিকভারি মোড চালু হয়েছে। দয়া করে নতুন পাসওয়ার্ড দিন।', 'success');
        navigate('/update-password');
      }
    });

    const handleAppToast = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'info');
      }
    };
    window.addEventListener('app_toast', handleAppToast);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('app_toast', handleAppToast);
    };
  }, [navigate, showToast]);

  return null;
};

const AppContent: React.FC = () => {
  // Added 'setUser' to destructuring to enable manual optimistic logout
  const { user, setUser, loading, toast, showToast, hideToast, isAppLocked, setIsAppLocked, appPin, isFingerprintEnabled } = useAppContext();

  useEffect(() => {
    if (user && isConfigured) {
      setupOnMessageListener();
      // Optional/Wait for user interaction if needed in real production, but for now we attempt to request:
      requestNotificationPermission(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Expose the global callback for Android native bridge to call upon biometric success
    (window as any).onBiometricSuccess = () => {
      setIsAppLocked(false);
      showToast('লক খোলা হয়েছে', 'success');
    };
    
    // Auto-request biometric when app starts if supported and locked
    if (isAppLocked && isFingerprintEnabled && (window as any).AndroidBridge) {
      try {
        (window as any).AndroidBridge.requestFingerprintAuth();
      } catch (err) {
        console.error('Failed to trigger native biometric', err);
      }
    }
  }, [isAppLocked, isFingerprintEnabled, setIsAppLocked]);

  const handleLogin = async (email: string, password?: string) => {
    if (!isConfigured) {
      showToast('সুপাবেজ কনফিগার করা হয়নি। lib/supabase.ts চেক করুন।');
      return;
    }
    if (!password) return;
    try {
      // Create a timeout promise to prevent infinite loading
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ইন্টারনেট স্লো। দয়া করে আবার চেষ্টা করুন।')), 10000)
      );

      // Race against the timeout
      const { error } = await Promise.race([loginPromise, timeoutPromise]) as any;
      
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
  
  const handleResetPassword = async (email: string) => {
    if (!isConfigured) {
      showToast('সুপাবেজ কনফিগারেশন চেক করুন।');
      return;
    }
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });
      if (error) throw error;
      showToast('পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে।', 'success');
    } catch (err: any) {
      showToast(err.message || 'ইমেইল পাঠাতে সমস্যা হয়েছে।');
    }
  };

  const handleLogout = async () => {
    // OPTIMISTIC LOGOUT:
    // 1. Clear local state IMMEDIATELY (This triggers the redirect to Login page)
    setUser(null);
    showToast('লগআউট সফল হয়েছে।', 'success');

    // 2. Perform network logout in background (Fire and forget)
    // We do NOT await this, so UI doesn't freeze if internet is slow
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Background logout error (likely network related):', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="premium-loader-container !w-16 !h-16 p-3.5">
            <div className="premium-loader-ring"></div>
            <div className="premium-loader-text w-full h-full flex items-center justify-center">
              <AppLogo variant="color" size="100%" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
             <p className="text-slate-600 font-medium text-lg tracking-wide animate-pulse">অ্যাপ চালু হচ্ছে...</p>
             <p className="text-slate-400 text-sm">দয়া করে অপেক্ষা করুন</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAppLocked && (appPin || isFingerprintEnabled)) {
    return (
      <AppLock 
        mode="unlock" 
        savedPin={appPin || undefined} 
        onSuccess={() => setIsAppLocked(false)} 
      />
    );
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <AuthListener />
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="premium-loader-container !w-14 !h-14 p-3 font-normal">
              <div className="premium-loader-ring"></div>
              <div className="premium-loader-text w-full h-full flex items-center justify-center">
                <AppLogo variant="color" size="100%" />
              </div>
            </div>
            <p className="text-indigo-600 font-bold tracking-widest text-[10px] uppercase animate-pulse">লোড হচ্ছে...</p>
          </div>
        </div>
      }>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} onResetPassword={handleResetPassword} onGoToSignup={() => window.location.hash = '/signup'} /> : <Navigate to={user.role === 'admin' ? "/admin-users" : "/dashboard"} replace />} 
          />
          <Route 
            path="/signup" 
            element={!user ? <Signup onSignup={handleSignup} onGoToLogin={() => window.location.hash = '/login'} /> : <Navigate to="/dashboard" replace />} 
          />
          
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/generate-icon" element={<IconGenerator />} />

          <Route 
            path="/*" 
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/admin-users" element={user.role === 'admin' ? <AdminUserList /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/income" element={<Income />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/ghazal-notes" element={<GhazalNotes />} />
                    <Route path="/shopping-lists" element={<ShoppingLists />} />
                    <Route path="/trash" element={<Trash />} />
                    <Route path="/projects-backup" element={<ProjectsBackup />} />
                    {/* Default Route Logic */}
                    <Route path="*" element={<Navigate to={user.role === 'admin' ? "/admin-users" : "/dashboard"} replace />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
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
