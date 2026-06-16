import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useAppContext();
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!isOnline) {
      // Set the time when it went offline
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      const formattedDate = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
      setLastUpdated(`${formattedDate}, ${formattedTime}`);
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div 
      className="w-full rounded-2xl transition-all duration-500 ease-in-out overflow-hidden shadow-sm border mb-4 bg-rose-500 text-white border-rose-400"
    >
      <div className="px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold">
        <WifiOff size={16} className="animate-pulse" />
        <span className="leading-tight">⚠️ আপনি এখন অফলাইনে আছেন {lastUpdated && `(সর্বশেষ আপডেট: ${lastUpdated})`}</span>
      </div>
    </div>
  );
};
