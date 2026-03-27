import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useAppContext();
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isOnline) {
      // Set the time when it went offline
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
      setLastUpdated(`${formattedDate}, ${formattedTime}`);
      isFirstRender.current = false;
    } else {
      // Show "Online" message briefly when connection is restored
      // BUT only if it's not the first render (meaning it was offline before)
      if (!isFirstRender.current) {
        setShowOnlineMessage(true);
        const timer = setTimeout(() => {
          setShowOnlineMessage(false);
        }, 3000); // Hide after 3 seconds
        return () => clearTimeout(timer);
      }
      isFirstRender.current = false;
    }
  }, [isOnline]);

  if (isOnline && !showOnlineMessage) return null;

  return (
    <div 
      className={`w-full rounded-2xl transition-all duration-500 ease-in-out overflow-hidden shadow-sm border mb-4
        ${!isOnline ? 'bg-rose-500 text-white border-rose-400' : 'bg-emerald-500 text-white border-emerald-400'}
      `}
    >
      <div className="px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold">
        {!isOnline ? (
          <>
            <WifiOff size={16} className="animate-pulse" />
            <span className="leading-tight">⚠️ আপনি এখন অফলাইনে আছেন {lastUpdated && `(সর্বশেষ আপডেট: ${lastUpdated})`}</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span className="leading-tight">ইন্টারনেট কানেকশন ফিরে এসেছে!</span>
          </>
        )}
      </div>
    </div>
  );
};
