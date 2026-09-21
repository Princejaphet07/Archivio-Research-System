/**
 * Centralized Backend URL resolver for ARCHIVIO Public Archive.
 * 
 * Automatically resolves to:
 * - http://localhost:3001 when running locally on localhost/127.0.0.1
 * - Same-origin (window.location.origin) in production Firebase Hosting environments (/api/** rewrite to Cloud Function)
 */
export function getBackendUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }

  // If explicit custom backend URL is configured (ignoring legacy render URL)
  if (import.meta.env.VITE_BACKEND_URL && !import.meta.env.VITE_BACKEND_URL.includes('onrender.com')) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Same-origin for Firebase Hosting rewrites (/api/** -> Cloud Functions)
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return '';
}
