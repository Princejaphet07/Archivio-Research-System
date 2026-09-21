/**
 * Centralized Backend URL resolver for ARCHIVIO Public Archive.
 * 
 * Automatically resolves to:
 * - http://localhost:3001 only if VITE_USE_LOCAL_BACKEND=true is set in .env.local
 * - Live Firebase Cloud Functions (https://archivio-research-system.web.app) when testing locally on localhost,
 *   so the developer does NOT need to keep a terminal running email-service!
 * - Same-origin (window.location.origin) in production Firebase Hosting environments (/api/** rewrite to Cloud Function)
 */
export function getBackendUrl() {
  // If explicit custom backend URL is configured (ignoring legacy render URL)
  if (import.meta.env.VITE_BACKEND_URL && !import.meta.env.VITE_BACKEND_URL.includes('onrender.com')) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // If developer explicitly opted to run a local node server on port 3001
  if (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true') {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:3001`;
  }

  // Running in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // When running locally on localhost/127.0.0.1, use the live Cloud Function directly
    // so no local terminal email-service is needed!
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://archivio-research-system.web.app';
    }

    // In production Firebase Hosting (same-origin /api rewrite)
    if (window.location.origin) {
      return window.location.origin;
    }
  }

  return 'https://archivio-research-system.web.app';
}
