
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Briefcase, TrendingUp, Receipt, Menu, 
  X, LogOut, Bell, Search, User, ChevronRight, Settings, 
  BarChart3, Users 
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; email: string };
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Primary Tabs for Bottom Nav
  const PRIMARY_NAV = [
    { name: 'হোম', path: '/dashboard', icon: <LayoutDashboard size={24} /> },
    { name: 'প্রজেক্ট', path: '/projects', icon: <Briefcase size={24} /> },
    { name: 'আয়', path: '/income', icon: <TrendingUp size={24} /> },
    { name: 'খরচ', path: '/expenses', icon: <Receipt size={24} /> },
  ];

  // Secondary items for "More" Menu
  const SECONDARY_NAV = [
    { name: 'ক্লায়েন্ট লিস্ট', path: '/clients', icon: <Users size={20} />, desc: 'ক্লায়েন্ট এবং স্টুডিও ম্যানেজমেন্ট' },
    { name: 'রিপোর্ট', path: '/reports', icon: <BarChart3 size={20} />, desc: 'আয়-ব্যয় এবং প্রজেক্ট রিপোর্ট' },
    { name: 'সেটিংস', path: '/settings', icon: <Settings size={20} />, desc: 'প্রোফাইল এবং অ্যাপ কনফিগারেশন' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Mobile Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            M
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
            {user.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-4">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-50 pb-safe">
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
                {/* Active Indicator Dot */}
                {isActive && <span className="absolute top-1 w-1 h-1 bg-indigo-600 rounded-full"></span>}
                {item.icon}
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
          
          {/* More Menu Trigger */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90
              ${isMoreMenuOpen ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            <Menu size={24} />
            <span className="text-[10px] font-bold">মেনু</span>
          </button>
        </div>
      </nav>

      {/* "More" Menu Drawer (Bottom Sheet style) */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMoreMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{user.name}</h3>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">মেনু</p>
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              ))}
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-600 font-bold active:scale-[0.98] transition-all"
            >
              <LogOut size={20} />
              লগআউট করুন
            </button>
            
            <div className="mt-8 text-center">
              <button 
                onClick={() => setMoreMenuOpen(false)}
                className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
