import React, { useState, useEffect, useTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Receipt,
  Menu,
  X,
  LogOut,
  Settings,
  BarChart3,
  Users,
  Tags,
  Trash2,
  HardDrive,
  Info,
  Globe,
  Phone,
  Facebook,
  Instagram,
  Send,
  MessageCircle,
  ArrowLeft,
  UserCog,
  BookOpen,
  User,
  ShoppingBag,
  Bot,
  Bell,
} from "lucide-react";
import { createPortal } from "react-dom";
import { APP_NAME } from "@/constants";
import { User as UserType } from "@/types";
import { useAppContext } from "@/context/AppContext";
import { OfflineBanner } from "./OfflineBanner";
import { AppLogo } from "./AppLogo";

interface LayoutProps {
  children: React.ReactNode;
  user: UserType;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isAboutOpen, setAboutOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false); // New state for logout confirmation
  const [isProcessing, setIsProcessing] = useState(false); // New state for processing animation
  const [processingMessage, setProcessingMessage] = useState(
    "কন্টেন্ট তৈরি হচ্ছে...",
  ); // Dynamic message
  const [isNavigating, setIsNavigating] = useState(false);

  // Swipe state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);

  const {
    adminSelectedUserId,
    setAdminSelectedUserId,
    trashedProjects,
    trashedExpenses,
    trashedGhazalNotes,
    isOnline,
    notifications,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isAiAssistant = location.pathname === "/ai-assistant";
  const isNotifications = location.pathname === "/notifications";
  const isFullScreenPage = isAiAssistant || isNotifications || isReportPreviewOpen;
  const isExpensesPage = location.pathname === "/expenses";

  const handleNavigate = (path: string) => {
    setMoreMenuOpen(false);

    if (
      location.pathname + location.search === path ||
      location.pathname === path
    ) {
      setIsNavigating(true);
      setTimeout(() => {
        setIsNavigating(false);
      }, 50);
      return;
    }

    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
      setTimeout(() => {
        setIsNavigating(false);
      }, 50);
    }, 50);
  };

  useEffect(() => {
    setIsNavigating(false);
    setIsReportPreviewOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleReportPreview = (e: any) => {
      setIsReportPreviewOpen(!!e?.detail?.active);
    };
    window.addEventListener("reports:preview", handleReportPreview);
    return () => {
      window.removeEventListener("reports:preview", handleReportPreview);
    };
  }, []);

  useEffect(() => {
    const handleProcessing = (e: any) => {
      if (typeof e.detail === "object") {
        setIsProcessing(e.detail.show);
        setProcessingMessage(e.detail.message || "প্রসেস হচ্ছে...");
      } else {
        setIsProcessing(e.detail);
        setProcessingMessage("প্রসেস হচ্ছে...");
      }
    };
    window.addEventListener("app:processing", handleProcessing);
    return () => window.removeEventListener("app:processing", handleProcessing);
  }, []);

  useEffect(() => {
    if (isMoreMenuOpen || isAboutOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMoreMenuOpen, isAboutOpen]);

  const trashCount =
    trashedProjects.length + trashedExpenses.length + trashedGhazalNotes.length;

  const isAdmin = user.role === "admin";
  const showAdminUserList = isAdmin && !adminSelectedUserId;

  // Primary Tabs for Bottom Nav (Most used features)
  const PRIMARY_NAV = [
    {
      name: "ড্যাশবোর্ড",
      path: "/dashboard",
      icon: <LayoutDashboard size={22} />,
    },
    { name: "প্রজেক্ট", path: "/projects", icon: <Briefcase size={22} /> },
    { name: "আয়", path: "/income", icon: <TrendingUp size={22} /> },
    { name: "খরচ", path: "/expenses", icon: <Receipt size={22} /> },
  ];

  // Secondary items for "More" Menu Drawer
  const SECONDARY_NAV = [
    {
      name: "এআই অ্যাসিস্ট্যান্ট",
      path: "/ai-assistant",
      icon: <Bot size={20} />,
      desc: "স্মার্ট হেল্পার",
    },
    {
      name: "ফর্দি",
      path: "/shopping-lists",
      icon: <ShoppingBag size={20} />,
      desc: "বাজারের তালিকা",
    },
    {
      name: "গজল নোট",
      path: "/ghazal-notes",
      icon: <BookOpen size={20} />,
      desc: "গজলের লিরিক সংগ্রহ",
    },
    {
      name: "ক্লায়েন্ট",
      path: "/clients",
      icon: <Users size={20} />,
      desc: "ক্লায়েন্ট তালিকা",
    },
    {
      name: "খরচের খাত",
      path: "/categories",
      icon: <Tags size={20} />,
      desc: "ক্যাটাগরি ম্যানেজমেন্ট",
    },
    {
      name: "রিপোর্ট",
      path: "/reports",
      icon: <BarChart3 size={20} />,
      desc: "আয়-ব্যয় রিপোর্ট",
    },
    {
      name: "রিসাইকেল বিন",
      path: "/trash",
      icon: <Trash2 size={20} />,
      desc: "ডিলিট করা প্রজেক্ট",
    },
    {
      name: "প্রজেক্ট ব্যাকআপ",
      path: "/projects-backup",
      icon: <HardDrive size={20} />,
      desc: "সম্পন্ন প্রজেক্ট ব্যাকআপ",
    },
    {
      name: "সেটিংস",
      path: "/settings",
      icon: <Settings size={20} />,
      desc: "অ্যাপ কনফিগারেশন",
    },
  ];

  const handleNavigation = (path: string) => {
    setMoreMenuOpen(false);
    if (
      location.pathname + location.search === path ||
      location.pathname === path
    ) {
      setIsNavigating(true);
      setTimeout(() => {
        setIsNavigating(false);
      }, 50);
      return;
    }

    setIsNavigating(true);
    setTimeout(() => {
      navigate(path);
      setTimeout(() => {
        setIsNavigating(false);
      }, 50);
    }, 50);
  };

  const handleBackToUsers = () => {
    setAdminSelectedUserId(null);
    handleNavigate("/admin-users");
  };

  // Developer Contact Links
  const DEVELOPER_INFO = {
    image:
      "https://drive.google.com/thumbnail?id=1SQpzaFRvgwEaKI8wbnNkvt_JhrxrjhGb&sz=w500",
    name: "আব্দুল্লাহ আল মামুন",
    title: "Full Stack Developer",
    facebook: "https://facebook.com/share/1C5Sw9sBRR/",
    whatsapp: "https://wa.me/8801612505145",
    instagram:
      "https://instagram.com/h.m.abdullah_al_mamun?igsh=d3NpZjBjYWRhMXly",
    telegram: "https://t.me/abdullahalmamunofficial",
    website: "https://aam.infinityfreeapp.com/",
    phone: "tel:+8801612505145",
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;

    if (isMoreMenuOpen || isAboutOpen || isProcessing || isNavigating) return;

    const dx = touchStart.x - touchEnd.x;
    const dy = touchStart.y - touchEnd.y;

    const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);

    if (isHorizontalSwipe && Math.abs(dx) > minSwipeDistance) {
      const isLeftSwipe = dx > 0;
      const isRightSwipe = dx < 0;

      const currentPath = location.pathname;
      const primaryPaths = PRIMARY_NAV.map((nav) => nav.path);
      const currentIndex = primaryPaths.indexOf(currentPath);

      if (currentIndex !== -1) {
        if (isLeftSwipe && currentIndex < primaryPaths.length - 1) {
          handleNavigate(primaryPaths[currentIndex + 1]);
        } else if (isRightSwipe && currentIndex > 0) {
          handleNavigate(primaryPaths[currentIndex - 1]);
        }
      }
    }
  };

  return (
    <div className={`min-h-screen bg-[#fafbfd] font-sans w-full selection:bg-indigo-100 selection:text-indigo-700 flex flex-col lg:flex-row ${isExpensesPage ? 'overflow-x-clip' : 'overflow-x-hidden'}`}>
      {/* Desktop Sidebar - Visible only on LG screens */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 h-screen lg:fixed lg:top-0 lg:left-0 z-50">
        <div className="p-6 border-b border-slate-100">
          <div
            onClick={() => setAboutOpen(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 ${isProcessing ? "logo-processing" : "group-hover:scale-105"}`}
            >
              <AppLogo variant="color" size="100%" />
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight group-hover:text-indigo-600 transition-colors">
              {APP_NAME}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <div className="px-3 mb-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              প্রধান মেনু
            </h3>
          </div>
          {PRIMARY_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200
                  ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                  }
                `}
              >
                <span
                  className={`relative ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                >
                  {item.icon}
                  {item.path === "/trash" && trashCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                      {trashCount}
                    </span>
                  )}
                </span>
                {item.name}
              </button>
            );
          })}

          <div className="px-3 mt-6 mb-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              অন্যান্য
            </h3>
          </div>
          {SECONDARY_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200
                  ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                  }
                `}
              >
                <span
                  className={`relative ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                >
                  {item.icon}
                  {item.path === "/trash" && trashCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black px-1 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
                      {trashCount}
                    </span>
                  )}
                </span>
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div
            onClick={() => handleNavigate("/profile")}
            className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3 mb-3 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-medium">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-colors border border-rose-100"
          >
            <LogOut size={16} />
            লগআউট করুন
          </button>
        </div>
      </aside>

      {/* Mobile Header (App Bar) - Fixed to ensure it stays on top */}
      {!isFullScreenPage && !isExpensesPage && (
        <header className="fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex lg:hidden items-center justify-between px-5 z-40 max-w-[100vw] shadow-sm transition-all duration-200">
          <div className="flex items-center gap-2">
            {/* Show Back Button for Admin if User Selected */}
            {isAdmin && adminSelectedUserId ? (
              <button
                onClick={handleBackToUsers}
                className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div
                onClick={() => setAboutOpen(true)}
                className="flex items-center gap-2.5 cursor-pointer active:opacity-70 transition-opacity group"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 ${isProcessing ? "logo-processing" : "group-active:scale-95"}`}
                >
                  <AppLogo variant="color" size="100%" />
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                  {APP_NAME}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigate("/notifications")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors relative"
            >
              <Bell size={20} />
              {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div
              className="flex items-center cursor-pointer active:scale-95 transition-transform"
              onClick={() => handleNavigate("/profile")}
            >
              {isAdmin && adminSelectedUserId && (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 mr-2">
                  User View
                </span>
              )}
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-9 h-9 rounded-full border-2 border-white shadow-md object-cover ring-1 ring-slate-100"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`;
                  }}
                />
              ) : (
                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
                  <User size={18} />
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 ${
          isFullScreenPage
            ? "p-0"
            : isExpensesPage
            ? "pt-0 pb-[72px] lg:pb-8 px-0"
            : "pt-[68px] lg:pt-8 pb-[72px] lg:pb-8 px-3 lg:px-8"
        } animate-in fade-in duration-300 w-full max-w-[100vw] lg:max-w-none ${isExpensesPage ? 'overflow-x-clip' : 'overflow-x-hidden'} lg:ml-72`}
      >
        <div
          className={`max-w-7xl mx-auto w-full ${isFullScreenPage ? "h-[100dvh] lg:h-auto" : ""}`}
        >
          <OfflineBanner />
          {children}
        </div>
      </main>

      {/* Fixed Bottom Navigation Bar - Hide if Admin is on User List page or on Desktop */}
      {(!isAdmin || adminSelectedUserId) && !isFullScreenPage && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe lg:hidden">
          <nav className="flex justify-between items-center px-6 h-[60px] w-full max-w-lg mx-auto">
            {PRIMARY_NAV.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`
                      flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200
                      ${isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}
                    `}
                >
                  <div
                    className={`transition-transform duration-200 ${isActive ? "-translate-y-0.5" : ""}`}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${isActive ? "text-indigo-600" : "text-slate-500"} ${isActive ? "opacity-100" : "opacity-80"}`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setMoreMenuOpen(true)}
              className={`
                  flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200
                  ${isMoreMenuOpen ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}
                `}
            >
              <div
                className={`transition-transform duration-200 ${isMoreMenuOpen ? "-translate-y-0.5" : ""} relative`}
              >
                <Menu size={22} />
                {trashCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full min-w-[14px] h-[14px] flex items-center justify-center shadow-sm ring-1 ring-white animate-in zoom-in duration-300">
                    {trashCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-bold ${isMoreMenuOpen ? "text-indigo-600" : "text-slate-500"} ${isMoreMenuOpen ? "opacity-100" : "opacity-80"}`}
              >
                মেনু
              </span>
            </button>
          </nav>
        </div>
      )}

      {/* "More" Menu Drawer */}
      {isMoreMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setMoreMenuOpen(false)}
            />

            <div className="relative bg-white rounded-t-[2rem] p-4 pb-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[75vh] overflow-y-auto w-full max-w-lg mx-auto border-t border-slate-100">
              <div
                className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 cursor-pointer"
                onClick={() => setMoreMenuOpen(false)}
              />

              <div
                onClick={() => handleNavigation("/profile")}
                className="flex items-center justify-between gap-1 mb-5 bg-slate-50 p-2.5 rounded-3xl border border-slate-100 relative overflow-hidden cursor-pointer active:bg-slate-100 transition-colors"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full -mr-10 -mt-10 opacity-50 blur-xl"></div>

                <div className="flex items-center gap-2 relative z-10 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white border-2 border-white flex items-center justify-center shadow-md">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 truncate leading-tight">
                      {user.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {isAdmin ? "Admin" : user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="relative z-10 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 font-bold text-[10px] active:scale-95 transition-all border border-rose-100 shadow-sm flex-shrink-0"
                >
                  <LogOut size={12} />
                  লগআউট
                </button>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    handleBackToUsers();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3.5 mb-4 rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-sm active:scale-[0.98] transition-all border border-indigo-100"
                >
                  <UserCog size={18} />
                  ইউজার লিস্টে ফিরে যান
                </button>
              )}

              <h3
                className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2"
                style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              >
                অন্যান্য মেনু
              </h3>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {SECONDARY_NAV.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-100 shadow-sm active:scale-95 transition-all group hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm mb-1.5 relative">
                      {React.cloneElement(
                        item.icon as React.ReactElement<{ size?: number }>,
                        { size: 14 },
                      )}
                      {item.path === "/trash" && trashCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full min-w-[14px] h-[14px] flex items-center justify-center shadow-sm ring-2 bg-white group-hover:ring-indigo-600 transition-all animate-in zoom-in duration-300">
                          {trashCount}
                        </span>
                      )}
                    </div>
                    <p
                      className="font-normal text-slate-700 text-[10px] leading-tight text-center"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      {item.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ABOUT MODAL (Developer Info) - Keeps existing code structure... */}
      {isAboutOpen &&
        createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setAboutOpen(false)}
            />

            <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 pt-8 text-center relative">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-10 -left-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 text-indigo-700 font-black text-3xl mb-3 shadow-lg ring-4 ring-white/20">
                    <AppLogo variant="color" size="100%" />
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {APP_NAME}
                  </h2>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                    ভার্সন ১.০.০
                  </p>
                </div>

                <button
                  onClick={() => setAboutOpen(false)}
                  className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 active:scale-90"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <p className="text-slate-500 text-sm leading-relaxed">
                    অডিও প্রফেশনালদের জন্য একটি পূর্ণাঙ্গ প্রজেক্ট এবং আর্থিক
                    ব্যবস্থাপনা সিস্টেম। আপনার সাউন্ড ডিজাইনিং ক্যারিয়ারকে সহজ ও
                    গোছানো রাখুন।
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex flex-col items-center mb-4 -mt-10">
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-200">
                      <img
                        src={DEVELOPER_INFO.image}
                        alt="Developer"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2">
                      {DEVELOPER_INFO.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {DEVELOPER_INFO.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <a
                      href={DEVELOPER_INFO.facebook}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(DEVELOPER_INFO.facebook, "_blank");
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Facebook size={20} />
                      <span className="text-[10px] font-bold">ফেইসবুক</span>
                    </a>
                    <a
                      href={DEVELOPER_INFO.whatsapp}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(DEVELOPER_INFO.whatsapp, "_blank");
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle size={20} />
                      <span className="text-[10px] font-bold">হোয়াটসঅ্যাপ</span>
                    </a>
                    <a
                      href={DEVELOPER_INFO.phone}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      <Phone size={20} />
                      <span className="text-[10px] font-bold">কল করুন</span>
                    </a>
                    <a
                      href={DEVELOPER_INFO.instagram}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(DEVELOPER_INFO.instagram, "_blank");
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                    >
                      <Instagram size={20} />
                      <span className="text-[10px] font-bold">ইন্সটাগ্রাম</span>
                    </a>
                    <a
                      href={DEVELOPER_INFO.telegram}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(DEVELOPER_INFO.telegram, "_blank");
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                    >
                      <Send size={20} />
                      <span className="text-[10px] font-bold">টেলিগ্রাম</span>
                    </a>
                    <a
                      href={DEVELOPER_INFO.website}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(DEVELOPER_INFO.website, "_blank");
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <Globe size={20} />
                      <span className="text-[10px] font-bold">ওয়েবসাইট</span>
                    </a>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Developed with ❤️ by{" "}
                    <span className="text-indigo-600 font-bold">
                      {DEVELOPER_INFO.name}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Fullscreen Processing Overlay */}
      {isProcessing &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-50/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="premium-loader-container !w-16 !h-16 p-3.5">
                <div className="premium-loader-ring"></div>
                <div className="premium-loader-text w-full h-full flex items-center justify-center">
                  <AppLogo variant="transparent-color" size="100%" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-slate-600 font-medium text-lg tracking-wide animate-pulse">
                  {processingMessage}
                </p>
                <p className="text-slate-400 text-sm">দয়া করে অপেক্ষা করুন</p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Page Transition Loading Overlay */}
      {isNavigating &&
        !isProcessing &&
        createPortal(
          <div className="fixed inset-0 z-[9998] bg-slate-50/10 backdrop-blur-[8px] flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-4 drop-shadow-xl transform scale-75">
              <div className="premium-loader-container !w-20 !h-20 p-4.5">
                <div className="premium-loader-ring"></div>
                <div className="premium-loader-text w-full h-full flex items-center justify-center">
                  <AppLogo variant="transparent-color" size="100%" />
                </div>
              </div>
              <p className="text-indigo-600 font-semibold tracking-widest text-lg md:text-xl uppercase animate-pulse">
                লোড হচ্ছে...
              </p>
            </div>
          </div>,
          document.body,
        )}

      {/* App Logout Confirmation Modal */}
      {isLogoutConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
            {/* Overlay background click to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => setIsLogoutConfirmOpen(false)} 
            />
            
            <div 
              className="relative bg-white rounded-[32px] shadow-2xl max-w-[340px] w-full p-6 pb-7 animate-in zoom-in-95 duration-200 border border-slate-50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title matches the screenshot */}
              <h3 className="text-[25px] font-black text-slate-900 text-center mb-3 leading-tight tracking-tight">
                লগ আউট
              </h3>
              
              {/* Message matches the screenshot */}
              <p className="text-[17px] font-semibold text-slate-800 text-center mb-7 max-w-[270px] mx-auto leading-relaxed">
                আপনি কি আসলেই লগ আউট করতে চান?
              </p>

              {/* Confirm & Cancel Buttons formatted like the screenshot:
                  "না" (vibrant blue container, white text, prominent/primary action to stay)
                  "হ্যাঁ" (light grey container, dark slate/black text, secondary action to exit)
              */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 py-3.5 rounded-full font-black text-white bg-[#1e75eb] hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all active:scale-[0.96] text-[16.5px] cursor-pointer"
                >
                  না
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutConfirmOpen(false);
                    onLogout();
                  }}
                  className="flex-1 py-3.5 rounded-full font-bold text-slate-900 bg-[#eaeaea] hover:bg-[#dfdfdf] transition-all active:scale-[0.96] text-[16.5px] cursor-pointer"
                >
                  হ্যাঁ
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
