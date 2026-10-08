/**
 * nameUtils.js
 * Utility for formatting and extracting clean user initials.
 */

/**
 * Strips titles, degrees, parentheticals (e.g. (Dean), [Admin]), role tags, and non-alphabetic characters.
 */
export function cleanPersonName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    // Remove content in parentheses or brackets: (Dean), [Adviser], (IT), (College Dean)
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    // Remove prefix honorifics and titles
    .replace(/^(Dr\.|Prof\.|Engr\.|Atty\.|Mr\.|Ms\.|Mrs\.)\s+/i, '')
    // Remove trailing/standalone role indicators: Dean, Adviser, Admin, Student
    .replace(/\b(Dean|Adviser|Super Admin|Admin|Student)\b/gi, '')
    // Remove post-nominal academic credentials/degrees
    .replace(/,\s*(Ph\.?D\.?|M\.?S\.?|B\.?S\.?|D\.?I\.?T\.?|M\.?I\.?T\.?|Ed\.?D\.?|M\.?D\.?|R\.?N\.?|L\.?P\.?T\.?|C\.?P\.?A\.?)/gi, '')
    // Strip everything except letters, spaces, hyphens
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .trim();
}

/**
 * Extracts 2-letter uppercase initials from a user object or name string.
 * Always returns valid alphabetic characters (A-Z), never parentheses or symbols.
 *
 * Examples:
 *   "Pronce Japhet Vender (Dean)" -> "PV"
 *   { firstName: "Pronce", lastName: "Vender" } -> "PV"
 *   "Ira Pongasi" -> "IP"
 *   "Dr. Ira Pongasi, Ph.D." -> "IP"
 */
export function getDisplayInitials(userOrName, fallback = 'PV') {
  if (!userOrName) return fallback;

  let firstName = '';
  let lastName = '';
  let rawName = '';
  let email = '';

  if (typeof userOrName === 'string') {
    rawName = userOrName;
  } else if (typeof userOrName === 'object') {
    firstName = userOrName.firstName || '';
    lastName = userOrName.lastName || '';
    rawName = userOrName.displayName || userOrName.name || '';
    email = userOrName.email || '';
  }

  // 1. Try separated firstName and lastName first
  const cleanFirst = cleanPersonName(firstName);
  const cleanLast = cleanPersonName(lastName);

  if (cleanFirst && cleanLast) {
    const fLetter = cleanFirst.match(/[a-zA-Z]/)?.[0];
    const lastWords = cleanLast.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
    const lLetter = lastWords[lastWords.length - 1]?.match(/[a-zA-Z]/)?.[0];
    if (fLetter && lLetter) {
      return `${fLetter}${lLetter}`.toUpperCase();
    }
  }

  // 2. Try rawName / displayName or combination
  const combined = [cleanFirst, cleanLast].filter(Boolean).join(' ');
  const candidate = cleanPersonName(rawName) || combined;
  const words = candidate.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));

  if (words.length >= 2) {
    const firstChar = words[0].match(/[a-zA-Z]/)?.[0];
    const lastChar = words[words.length - 1].match(/[a-zA-Z]/)?.[0];
    if (firstChar && lastChar) {
      return `${firstChar}${lastChar}`.toUpperCase();
    }
  }

  if (words.length === 1) {
    const letters = words[0].replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 2) {
      return letters.slice(0, 2).toUpperCase();
    }
    if (letters.length === 1) {
      return letters.toUpperCase();
    }
  }

  // 3. Fallback to email handle if name yielded nothing
  if (email && typeof email === 'string' && email.includes('@')) {
    const handle = email.split('@')[0];
    const cleanHandle = handle.replace(/[^a-zA-Z0-9._-]/g, '');
    const parts = cleanHandle.split(/[._-]+/).filter(p => /[a-zA-Z]/.test(p));
    if (parts.length >= 2) {
      const f = parts[0].match(/[a-zA-Z]/)?.[0];
      const l = parts[parts.length - 1].match(/[a-zA-Z]/)?.[0];
      if (f && l) return `${f}${l}`.toUpperCase();
    } else if (parts.length === 1) {
      const letters = parts[0].replace(/[^a-zA-Z]/g, '');
      if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
      if (letters.length === 1) return letters.toUpperCase();
    }
  }

  return fallback;
}
