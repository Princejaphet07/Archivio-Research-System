import React, { useState, useEffect, useCallback } from 'react';
import logo from '../assets/logo.png';

/**
 * Real probe checking true internet reachability.
 * Avoids relative localhost URLs which return 200 even without Wi-Fi.
 */
export async function realInternetProbe() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    // Probe global high-availability endpoint using no-cors mode
    await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return true;
  } catch (_) {
    // Secondary fallback probe
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 2500);
      await fetch('https://cloudflare.com/favicon.ico?' + Date.now(), {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller2.signal
      });
      clearTimeout(timeoutId2);
      return true;
    } catch (__) {
      return false;
    }
  }
}

/**
 * Custom Hook: useNetworkStatus
 * Returns { isOnline, wasOffline, setWasOffline, checkConnection, isChecking }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      const ok = await realInternetProbe();
      setIsOnline(ok);
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
      const ok = await realInternetProbe();
      setIsOnline(ok);
      if (!ok) setWasOffline(true);
      return ok;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isOnline, wasOffline, setWasOffline, checkConnection, isChecking };
}

/**
 * Fullscreen White Offline Screen Guard
 * Blocks public archive view when offline, then shows loading animation upon reconnection.
 */
export default function NetworkStatusPill() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isChecking, setIsChecking] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [checkError, setCheckError] = useState(null);

  useEffect(() => {
    // Initial verification on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
    }

    const handleOnline = async () => {
      const reallyOnline = await realInternetProbe();
      if (reallyOnline) {
        setCheckError(null);
        setIsOnline(true);
        setIsReconnecting(true);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsReconnecting(false);
            setIsFadingOut(false);
          }, 500);
        }, 1600);
      } else {
        setIsOnline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
      setIsFadingOut(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If online, not reconnecting, and not fading out, do not render guard
  if (isOnline && !isReconnecting && !isFadingOut) {
    return null;
  }

  const handleRetry = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setCheckError(null);

    const startTime = Date.now();
    // Test real external internet connectivity
    const online = await realInternetProbe();
    const elapsed = Date.now() - startTime;

    // Minimum delay of 1.2 seconds so user sees searching progress
    if (elapsed < 1200) {
      await new Promise((res) => setTimeout(res, 1200 - elapsed));
    }

    setIsChecking(false);

    if (!online) {
      // STILL OFFLINE: Keep white screen firmly locked, DO NOT exit to archive!
      setIsOnline(false);
      setCheckError('No internet connection found. Please check your Wi-Fi and try again.');
      return;
    }

    // RECONNECTED: Show the loading transition screen
    setIsOnline(true);
    setIsReconnecting(true);
    setCheckError(null);

    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsReconnecting(false);
        setIsFadingOut(false);
      }, 500);
    }, 1600);
  };

  return (
    <div
      className={`fixed inset-0 z-[999999] bg-white flex flex-col items-center justify-between p-4 sm:p-6 text-center select-none transition-opacity duration-500 overflow-y-auto min-h-screen ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="alertdialog"
      aria-modal="true"
      aria-label="Offline Mode Notice"
    >
      {/* Subtle Background Accent Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#801e38]/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative Brand Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#801e38] via-[#d4af37] to-[#801e38]" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center my-auto py-6 sm:py-8">
        {/* ARCHIVIO Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
          <img
            src={logo}
            alt="ARCHIVIO Logo"
            className="h-11 sm:h-14 w-auto object-contain drop-shadow-sm"
          />
          <div className="text-left">
            <span className="block text-[9px] sm:text-[10px] font-bold tracking-widest text-[#801e38] uppercase">
              Southwestern University PHINMA
            </span>
            <span className="block font-serif font-extrabold text-lg sm:text-xl tracking-tight text-stone-900">
              ARCHIVIO
            </span>
          </div>
        </div>

        {isReconnecting ? (
          /* ================= RECONNECTING LOADING VIEW ================= */
          <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center py-4 w-full">
            {/* Animated Reconnection Loader */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-stone-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#801e38] border-t-[#d4af37] animate-spin"></div>
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-[#801e38] animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-xl sm:text-3xl font-serif font-bold text-[#801e38] mb-1.5 sm:mb-2">
              Connection Restored!
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm font-medium mb-4 px-2">
              Reconnecting to ARCHIVIO Research System...
            </p>

            <div className="w-40 sm:w-48 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#801e38] to-[#d4af37] rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : (
          /* ================= OFFLINE NOTICE VIEW ================= */
          <div className="animate-in fade-in duration-300 flex flex-col items-center w-full">
            {/* Disconnected Wi-Fi Icon */}
            <div className="mb-5 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#801e38]/10 border border-[#801e38]/20 flex items-center justify-center text-[#801e38] shadow-sm">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39m3.66 0A10.94 10.94 0 0119 12.55M8.53 16.11a6 6 0 016.95 0M12 20h.01"
                  />
                </svg>
              </div>
            </div>

            {/* Offline Headings */}
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#801e38] mb-1.5 sm:mb-2 tracking-tight">
              You Are Offline
            </h2>
            <p className="text-sm sm:text-lg font-semibold text-stone-800 mb-1.5 sm:mb-2 px-2">
              Please connect to the internet to access ARCHIVIO
            </p>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xs sm:max-w-sm leading-relaxed mb-5 sm:mb-6 px-2">
              An active internet connection is required to search, browse, and access academic research papers in the repository.
            </p>

            {/* Connection Status Pill */}
            {isChecking ? (
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 mb-5 sm:mb-6 animate-pulse max-w-full">
                <svg className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span className="truncate">Searching for Wi-Fi and internet signal...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 mb-5 sm:mb-6 max-w-full">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="truncate">Waiting for Wi-Fi or mobile data...</span>
              </div>
            )}

            {/* Retry Button */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl bg-[#801e38] hover:bg-[#68182d] text-white text-sm font-semibold shadow-md shadow-[#801e38]/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-75 cursor-pointer touch-manipulation"
            >
              {isChecking ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Searching for Connection...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Check Connection</span>
                </>
              )}
            </button>

            {/* Error Message Alert if check failed */}
            {checkError && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 w-full max-w-sm text-left">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{checkError}</span>
              </div>
            )}

            <p className="text-[11px] text-stone-400 mt-4 px-2">
              ARCHIVIO will automatically unlock as soon as your connection is restored.
            </p>
          </div>
        )}
      </div>

      {/* Decorative Bottom Tagline */}
      <div className="relative z-10 pt-4 pb-2 text-[10px] sm:text-[11px] text-stone-400 font-sans tracking-wide">
        Southwestern University PHINMA • Institutional Research Repository
      </div>
    </div>
  );
}
