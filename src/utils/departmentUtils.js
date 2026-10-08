/**
 * departmentUtils.js
 * Utility functions for department name normalization, synonym matching, and duplicate prevention.
 */

const STOP_WORDS = new Set(['of', 'and', 'the', 'in', 'for', '&', 'at']);

/**
 * Normalizes a department name by trimming, lowercasing, and stripping common prefixes/suffixes
 * such as "College of", "Department of", "School of", etc.
 *
 * Examples:
 *   "College of IT" -> "it"
 *   "Department of IT" -> "it"
 *   "  IT  " -> "it"
 *   "College of Engineering" -> "engineering"
 */
export function normalizeDepartmentName(name) {
  if (!name || typeof name !== 'string') return '';
  let str = name.trim().toLowerCase();

  // Standardize multiple spaces and common punctuation
  str = str.replace(/[._\-–—/]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Strip prefixes
  const prefixes = [
    /^college\s+of\s+/,
    /^department\s+of\s+/,
    /^dept\s+of\s+/,
    /^dept\.\s+of\s+/,
    /^school\s+of\s+/,
    /^faculty\s+of\s+/,
    /^division\s+of\s+/,
    /^institute\s+of\s+/
  ];
  for (const p of prefixes) {
    str = str.replace(p, '').trim();
  }

  // Strip suffixes
  const suffixes = [
    /\s+college$/,
    /\s+department$/,
    /\s+dept$/,
    /\s+dept\.$/,
    /\s+school$/,
    /\s+faculty$/,
    /\s+division$/,
    /\s+institute$/
  ];
  for (const s of suffixes) {
    str = str.replace(s, '').trim();
  }

  return str;
}

/**
 * Extracts initials/acronym from multi-word title, skipping stop words.
 * Example:
 *   "Information Technology" -> "it"
 *   "Computer Science" -> "cs"
 */
export function getAcronym(name) {
  if (!name || typeof name !== 'string') return '';
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOP_WORDS.has(w));
  if (words.length <= 1) return '';
  return words.map(w => w[0]).join('');
}

/**
 * Common synonymous academic college / department groups in the university.
 */
const KNOWN_DEPARTMENT_GROUPS = [
  ['it', 'information technology', 'info tech', 'college of it', 'college of information technology', 'dept of it', 'department of it', 'cit'],
  ['cs', 'computer science', 'comp sci', 'college of computer science', 'department of computer science'],
  ['ccs', 'computer studies', 'college of computer studies'],
  ['is', 'information systems', 'college of information systems'],
  ['emc', 'entertainment and multimedia computing', 'entertainment & multimedia computing'],
  ['coe', 'eng', 'engineering', 'college of engineering', 'department of engineering'],
  ['cba', 'business administration', 'college of business administration', 'business'],
  ['con', 'nursing', 'college of nursing'],
  ['crim', 'criminology', 'criminal justice', 'ccj', 'ccje', 'college of criminology', 'college of criminal justice'],
  ['cas', 'arts and sciences', 'arts & sciences', 'college of arts and sciences'],
  ['ced', 'education', 'college of education'],
  ['cop', 'pharm', 'pharmacy', 'college of pharmacy'],
  ['cod', 'dent', 'dentistry', 'dental medicine', 'college of dentistry'],
  ['pt', 'physical therapy', 'college of physical therapy'],
  ['mt', 'medtech', 'medical technology', 'college of medical technology'],
  ['rt', 'radtech', 'radiologic technology', 'college of radiologic technology'],
  ['psych', 'psychology', 'college of psychology'],
  ['comm', 'communication', 'college of communication'],
  ['polsci', 'political science']
];

/**
 * Determines whether two department names refer to the same department.
 * Handles:
 * - Direct case & whitespace differences ("IT" vs "it" vs " IT ")
 * - Prefix/suffix differences ("IT" vs "College of IT" vs "Department of IT")
 * - Acronym vs full name ("IT" vs "Information Technology" vs "College of Information Technology")
 * - Known synonymous department groups
 */
export function areDepartmentsEqual(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const rawA = nameA.trim().toLowerCase();
  const rawB = nameB.trim().toLowerCase();
  if (rawA === rawB) return true;

  const coreA = normalizeDepartmentName(nameA);
  const coreB = normalizeDepartmentName(nameB);
  if (coreA && coreB && coreA === coreB) return true;

  // Acronym matching (e.g. "it" vs "information technology")
  const acrA = getAcronym(coreA);
  const acrB = getAcronym(coreB);
  if (coreA && acrB && coreA === acrB) return true;
  if (coreB && acrA && coreB === acrA) return true;

  // Known groups matching
  for (const group of KNOWN_DEPARTMENT_GROUPS) {
    const matchA = group.includes(rawA) || group.includes(coreA);
    const matchB = group.includes(rawB) || group.includes(coreB);
    if (matchA && matchB) return true;
  }

  return false;
}

/**
 * Finds a matching department from a list of departments.
 * @param {string} candidateName - The name to test
 * @param {Array<Object|string>} departmentsList - Array of department objects (with .name) or strings
 * @returns {Object|string|null} - The matched existing department, or null if none
 */
export function findMatchingDepartment(candidateName, departmentsList = []) {
  if (!candidateName || !departmentsList || !departmentsList.length) return null;
  return departmentsList.find(dept => {
    const existingName = typeof dept === 'string' ? dept : (dept.name || '');
    return areDepartmentsEqual(candidateName, existingName);
  }) || null;
}
