/**
 * Centralized Backend URL resolver for ARCHIVIO.
 * 
 * Automatically resolves to:
 * - http://localhost:3001 when running locally on localhost/127.0.0.1
 * - import.meta.env.VITE_BACKEND_URL or Render URL in deployed production environments
 */
export function getBackendUrl() {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }

  return import.meta.env.VITE_BACKEND_URL || 'https://archivio-email-service.onrender.com';
}
