import React from 'react';
import { ArrowLeft, Trash2, Gift, Bell, AlertCircle, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, dismissNotification, dismissAllNotifications } = useAppContext();

  const handleDeleteAll = () => {
    if (notifications.length === 0) return;
    if (window.confirm('আপনি কি সব নোটিফিকেশন সরাতে চান?')) {
      dismissAllNotifications();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'gift':
        return <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0"><Gift size={20} /></div>;
      case 'bell':
        return <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 shrink-0"><Bell size={20} className="fill-blue-500 text-blue-500" /></div>;
      case 'alert':
        return <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0"><AlertCircle size={20} className="fill-orange-500 text-white" /></div>;
      default:
        return <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Info size={20} /></div>;
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short' });
    const month = monthFormatter.format(date);
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = hours.toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:bg-slate-200 transition-colors z-20"
        >
          <ArrowLeft size={22} className="text-slate-800" strokeWidth={2.5}/>
        </button>
        <h1 className="text-[19px] font-normal text-slate-800 tracking-wide" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>নোটিফিকেশন</h1>
        <button 
          onClick={handleDeleteAll}
          className="w-10 h-10 flex items-center justify-center -mr-2 rounded-full active:bg-slate-200 transition-colors z-20"
        >
          <Trash2 size={20} className="text-slate-800" strokeWidth={2.5}/>
        </button>
      </div>

      <div className="p-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 mt-20 text-slate-500">
            <Bell size={48} className="text-slate-300 mb-2" />
            <p>কোনো নোটিফিকেশন নেই</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="bg-white rounded-[16px] p-3 flex gap-3 items-start shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] cursor-pointer active:scale-[0.99] transition-transform relative pr-10"
            >
              {getIcon(notification.icon)}
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-1 truncate" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{notification.title}</h3>
                <p className="text-[13px] text-slate-500 leading-snug mb-1 truncate">{notification.body}</p>
                <span className="text-[11px] text-slate-400 font-medium">{formatDate(notification.createdat)}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notification.id);
                }}
                className="absolute right-3 top-3 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
