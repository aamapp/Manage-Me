
import React, { useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Briefcase, TrendingUp, Receipt, Menu, 
  X, LogOut, Settings, 
  BarChart3, Users, Tags
} from 'lucide-react';
import { APP_NAME } from '../constants';
import { User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserType;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Primary Tabs for Bottom Nav (Most used features)
  const PRIMARY_NAV = [
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: <LayoutDashboard size={22} /> },
    { name: 'প্রজেক্ট', path: '/projects', icon: <Briefcase size={22} /> },
    { name: 'আয়', path: '/income', icon: <TrendingUp size={22} /> },
    { name: 'খরচ', path: '/expenses', icon: <Receipt size={22} /> },
  ];

  // Secondary items for "More" Menu Drawer
  const SECONDARY_NAV = [
    { name: 'ক্লায়েন্ট', path: '/clients', icon: <Users size={20} />, desc: 'ক্লায়েন্ট তালিকা' },
    { name: 'খরচের খাত', path: '/categories', icon: <Tags size={20} />, desc: 'ক্যাটাগরি ম্যানেজমেন্ট' },
    { name: 'রিপোর্ট', path: '/reports', icon: <BarChart3 size={20} />, desc: 'আয়-ব্যয় রিপোর্ট' },
    { name: 'সেটিংস', path: '/settings', icon: <Settings size={20} />, desc: 'অ্যাপ কনফিগারেশন' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setTimeout(() => {
        setMoreMenuOpen(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans w-full overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-700 flex flex-col">
      {/* Mobile Header (App Bar) - Fixed to ensure it stays on top */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-5 z-40 max-w-[100vw] shadow-sm transition-all duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200 ring-2 ring-white">
            M
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="w-9 h-9 rounded-full border-2 border-white shadow-md object-cover ring-1 ring-slate-100"
            />
          ) : (
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
              {user.name.charAt(0)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {/* Added pt-20 to push content down below the fixed header (16 + 4 units spacing) */}
      <main className="flex-1 pt-20 pb-20 px-4 animate-in fade-in duration-300 w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
        <nav className="flex justify-between items-center px-6 h-[60px] w-full max-w-lg mx-auto">
          {PRIMARY_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  setMoreMenuOpen(false);
                  navigate(item.path);
                }}
                className={`
                  flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200
                  ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <div className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`}>
                    {item.icon}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-slate-500'} ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                    {item.name}
                </span>
              </button>
            );
          })}
          
          {/* Menu Button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`
              flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200
              ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            <div className={`transition-transform duration-200 ${isMoreMenuOpen ? '-translate-y-0.5' : ''}`}>
                <Menu size={22} />
            </div>
            <span className={`text-[10px] font-bold ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-500'} ${isMoreMenuOpen ? 'opacity-100' : 'opacity-80'}`}>
                মেনু
            </span>
          </button>
        </nav>
      </div>

      {/* "More" Menu Drawer */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setMoreMenuOpen(false)}
          />
          
          <div className="relative bg-white rounded-t-[2rem] p-4 pb-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto w-full max-w-lg mx-auto border-t border-slate-100">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center gap-4 mb-5 bg-slate-50 p-3 rounded-3xl border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full -mr-10 -mt-10 opacity-50 blur-xl"></div>
               
               <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-white border-2 border-white flex items-center justify-center shadow-md relative z-10">
                 {user.avatar_url ? (
                   <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-indigo-600 text-lg font-bold">{user.name.charAt(0)}</span>
                 )}
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">অন্যান্য মেনু</h3>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {SECONDARY_NAV.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-95 transition-all group hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm mb-2">
                    {item.icon}
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                </button>
              ))}
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm active:scale-[0.98] transition-all hover:bg-rose-100 hover:shadow-sm border border-rose-100"
            >
              <LogOut size={18} />
              লগআউট করুন
            </button>
            
            <div className="mt-4 text-center">
               <button 
                onClick={() => setMoreMenuOpen(false)} 
                className="w-9 h-9 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center justify-center"
               >
                 <X size={18}/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
