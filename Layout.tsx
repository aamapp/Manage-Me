
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Briefcase, TrendingUp, Receipt, Menu, 
  X, LogOut, Bell, Search, User, ChevronRight, Settings, 
  BarChart3, Users 
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
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: <LayoutDashboard size={24} /> },
    { name: 'প্রজেক্ট', path: '/projects', icon: <Briefcase size={24} /> },
    { name: 'আয়', path: '/income', icon: <TrendingUp size={24} /> },
    { name: 'খরচ', path: '/expenses', icon: <Receipt size={24} /> },
  ];

  // Secondary items for "More" Menu Drawer
  const SECONDARY_NAV = [
    { name: 'ক্লায়েন্ট', path: '/clients', icon: <Users size={20} />, desc: 'ক্লায়েন্ট তালিকা' },
    { name: 'রিপোর্ট', path: '/reports', icon: <BarChart3 size={20} />, desc: 'আয়-ব্যয় রিপোর্ট' },
    { name: 'সেটিংস', path: '/settings', icon: <Settings size={20} />, desc: 'অ্যাপ কনফিগারেশন' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 overflow-x-hidden w-full">
      {/* Mobile Header (App Bar) */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 z-40 max-w-[100vw]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200">
            M
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="w-9 h-9 rounded-full border border-slate-200 object-cover shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
              {user.name.charAt(0)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-4 animate-in fade-in duration-300 w-full max-w-[100vw] overflow-x-hidden">
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {PRIMARY_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreMenuOpen(false)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90
                  ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{item.name}</span>
              </Link>
            );
          })}
          
          {/* Menu Button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90
              ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            <div className={`relative p-1 rounded-xl transition-all ${isMoreMenuOpen ? 'bg-indigo-50' : ''}`}>
              <Menu size={24} />
            </div>
            <span className={`text-[10px] font-bold ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-400'}`}>মেনু</span>
          </button>
        </div>
      </nav>

      {/* "More" Menu Drawer (Bottom Sheet) */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMoreMenuOpen(false)}
          />
          
          <div className="relative bg-white rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            
            <div className="flex items-center gap-4 mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
               <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-200">
                 {user.avatar_url ? (
                   <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-indigo-600 text-xl font-bold">{user.name.charAt(0)}</span>
                 )}
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-800">{user.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all group hover:border-indigo-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{item.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </Link>
              ))}
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-lg active:scale-[0.98] transition-all"
            >
              <LogOut size={22} />
              লগআউট
            </button>
            
            <div className="mt-6 text-center">
               <button onClick={() => setMoreMenuOpen(false)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
