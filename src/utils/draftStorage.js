/**
 * ARCHIVIO Draft Storage Utility
 * Buffers manuscript annotations and qualitative revision feedback in client-side storage
 * to prevent catastrophic data loss during long review sessions or accidental tab closure.
 */

const STORAGE_PREFIX = 'archivio_review_draft_';

export const getDraftKey = (documentIdOrUrl, reqKey = '') => {
  if (!documentIdOrUrl) return null;
  // Clean special characters to create a safe storage key
  const safeIdentifier = String(documentIdOrUrl).replace(/[^a-zA-Z0-9_-]/g, '_').slice(-80);
  const safeReq = reqKey ? `_${String(reqKey).replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
  return `${STORAGE_PREFIX}${safeIdentifier}${safeReq}`;
};

/**
 * Saves draft content with a timestamp
 */
export const saveDraft = (identifier, reqKey, data) => {
  const key = getDraftKey(identifier, reqKey);
  if (!key) return false;
  try {
    const payload = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('ARCHIVIO draft storage quota or access error:', err);
    return false;
  }
};

/**
 * Retrieves draft content if available
 */
export const getDraft = (identifier, reqKey) => {
  const key = getDraftKey(identifier, reqKey);
  if (!key) return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item);
  } catch (err) {
    console.warn('Failed to parse draft from storage:', err);
    return null;
  }
};

/**
 * Clears draft after successfully committing to the cloud database
 */
export const clearDraft = (identifier, reqKey) => {
  const key = getDraftKey(identifier, reqKey);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to remove draft from storage:', err);
  }
};

/**
 * Format timestamp into friendly relative age (e.g., "3m ago")
 */
export const formatDraftTime = (timestamp) => {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};
