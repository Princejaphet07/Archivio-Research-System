import React from 'react';

/**
 * Wraps dynamic React.lazy imports with auto-retry and cache-busting reload.
 * Prevents "Failed to fetch dynamically imported module" when a new deployment
 * changes chunk hashes while the user has an active browser session.
 */
export function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('archivio_chunk_reload_retry') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('archivio_chunk_reload_retry', 'false');
      return component;
    } catch (error) {
      console.warn('Dynamic chunk import failed:', error);
      
      const isDynamicImportError = 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('MIME type') ||
        error?.name === 'ChunkLoadError';

      if (isDynamicImportError && !pageHasBeenForceRefreshed) {
        console.info('New deployment detected! Refreshing page to load latest version...');
        window.sessionStorage.setItem('archivio_chunk_reload_retry', 'true');
        window.location.reload();
        // Return a never-resolving promise while the browser unloads
        return new Promise(() => {});
      }

      // If already retried or it is another error, throw it so ErrorBoundary handles it
      throw error;
    }
  });
}
