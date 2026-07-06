import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = "" }) => {
  const { isOnline } = useAppContext();
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return localStorage.getItem('manage_me_last_online_time') || '';
  });

  useEffect(() => {
    if (isOnline) {
      const updateTime = () => {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
        const currentFullTime = `${formattedDate}, ${formattedTime}`;
        localStorage.setItem('manage_me_last_online_time', currentFullTime);
        setLastUpdated(currentFullTime);
      };

      // Set immediately when we are online
      updateTime();

      // Update every 10 seconds while online so the last online timestamp stays highly accurate
      const interval = setInterval(updateTime, 10000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div 
      className={`transition-all duration-500 ease-in-out overflow-hidden bg-[#eb3b30] text-white ${className}`}
    >
      <div className="px-3 py-3 flex items-center justify-center gap-1.5 text-[10.5px] min-[360px]:text-xs font-bold font-sans tracking-tight text-center">
        <WifiOff size={14} className="animate-pulse shrink-0" />
        <span className="leading-none select-none">
          আপনি অফলাইনে আছেন {lastUpdated && `(আপডেট: ${lastUpdated})`}
        </span>
      </div>
    </div>
  );
};
