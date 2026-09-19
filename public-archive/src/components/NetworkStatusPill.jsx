import React, { useState, useEffect, useCallback } from 'react';

/**
 * Custom Hook: useNetworkStatus
 * Returns { isOnline, wasOffline, checkConnection, isChecking }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      // Fast ping to verify actual internet connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch('/manifest.webmanifest?ping=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok || response.type === 'opaque') {
        setIsOnline(true);
      } else {
        setIsOnline(false);
        setWasOffline(true);
      }
    } catch (_) {
      setIsOnline(false);
      setWasOffline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isOnline, wasOffline, setWasOffline, checkConnection, isChecking };
}

/**
 * Global Network Status Pill Component
 * Floats at the top of the screen with smooth slide-down animation
 */
export default function NetworkStatusPill() {
  const { isOnline, wasOffline, setWasOffline, checkConnection, isChecking } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, setWasOffline]);

  // If online and not currently showing the reconnected toast, render nothing
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] px-4 w-full max-w-lg pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {/* OFFLINE PILL */}
      {!isOnline && (
        <div className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-900/90 dark:bg-stone-950/95 backdrop-blur-md text-stone-100 rounded-full shadow-2xl border border-amber-500/40 text-xs sm:text-sm transition-all duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsating Amber Beacon */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>

            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39m3.66 0A10.94 10.94 0 0119 12.55M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
            </svg>

            <div className="truncate">
              <span className="font-bold text-amber-300">Offline Mode Active</span>
              <span className="hidden sm:inline text-stone-300 text-xs ml-1.5">• Naka-save gihapon imong bookmarks</span>
            </div>
          </div>

          <button
            type="button"
            onClick={checkConnection}
            disabled={isChecking}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-amber-100 rounded-full text-xs font-semibold border border-amber-500/30 transition-all duration-150 disabled:opacity-50"
            title="Check internet connection"
          >
            <svg className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isChecking ? 'Checking...' : 'Sulayi Pag-usab'}</span>
          </button>
        </div>
      )}

      {/* RECONNECTED PILL */}
      {isOnline && showReconnected && (
        <div className="pointer-events-auto flex items-center justify-center gap-2.5 px-5 py-2.5 bg-emerald-900/90 dark:bg-emerald-950/95 backdrop-blur-md text-emerald-100 rounded-full shadow-2xl border border-emerald-500/40 text-xs sm:text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Konektado Na Pag-usab! • Connection Restored</span>
        </div>
      )}
    </div>
  );
}
