import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

export default function NetworkStatusPill() {
  const { isOnline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [prevStatus, setPrevStatus] = useState(isOnline);

  useEffect(() => {
    if (!prevStatus && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    setPrevStatus(isOnline);
  }, [isOnline, prevStatus]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 pointer-events-auto shadow-2xl rounded-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border animate-bounce ${
        !isOnline
          ? 'bg-amber-600/90 text-white border-amber-400/30'
          : 'bg-emerald-600/90 text-white border-emerald-400/30'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 animate-pulse text-amber-200 shrink-0" />
          <span>Offline mode &mdash; using locally cached data</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>Back online &mdash; connection restored</span>
        </>
      )}
    </div>
  );
}
