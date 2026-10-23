/**
 * Utility to normalize department/program names across ARCHIVIO public portal.
 * Ensures consistent naming across Popular tags, Categories, Paper badges, and Filters.
 */
export const normalizeDepartment = (name) => {
  if (!name || typeof name !== 'string') return 'IT';
  const lower = name.trim().toLowerCase();

  if (
    lower === 'it' ||
    lower === 'cit' ||
    lower === 'info tech' ||
    lower.includes('information technology') ||
    lower === 'bsit' ||
    lower === 'bs it' ||
    lower.includes('college of it') ||
    lower.includes('college of information technology') ||
    lower.includes('department of it') ||
    lower.includes('department of information technology') ||
    lower.includes('bachelor of science in information technology')
  ) {
    return 'IT';
  }

  if (
    lower === 'is' ||
    lower.includes('information system') ||
    lower === 'bsis' ||
    lower === 'bs is'
  ) {
    return 'Information Systems';
  }

  if (
    lower === 'cs' ||
    lower === 'ccs' ||
    lower.includes('computer science') ||
    lower === 'bscs' ||
    lower === 'bs cs' ||
    lower.includes('college of computer studies')
  ) {
    return 'Computer Science';
  }

  if (
    lower === 'nursing' ||
    lower === 'bsn' ||
    lower === 'con' ||
    lower.includes('college of nursing')
  ) {
    return 'Nursing';
  }

  if (
    lower.includes('business') ||
    lower.includes('management') ||
    lower.includes('accountancy') ||
    lower === 'bsba' ||
    lower === 'cba' ||
    lower.includes('college of business')
  ) {
    return 'Business Administration';
  }

  if (
    lower.includes('education') ||
    lower.includes('teaching') ||
    lower === 'bsed' ||
    lower === 'beed' ||
    lower === 'ced'
  ) {
    return 'Education';
  }

  if (
    lower === 'eng' ||
    lower === 'coe' ||
    lower.includes('engineering') ||
    lower.includes('college of engineering')
  ) {
    return 'Engineering';
  }

  if (
    lower === 'coa' ||
    lower.includes('architecture') ||
    lower.includes('college of architecture')
  ) {
    return 'Architecture';
  }

  if (
    lower === 'cop' ||
    lower.includes('pharmacy') ||
    lower.includes('college of pharmacy')
  ) {
    return 'Pharmacy';
  }

  if (
    lower === 'crim' ||
    lower === 'ccj' ||
    lower === 'ccje' ||
    lower.includes('criminology') ||
    lower.includes('college of criminology')
  ) {
    return 'Criminology';
  }

  // Strip common department/degree prefixes if not matched above
  const cleaned = name.trim()
    .replace(/^Bachelor of Science in\s+/i, '')
    .replace(/^Bachelor of Science\s+/i, '')
    .replace(/^Bachelor of\s+/i, '')
    .replace(/^College of\s+/i, '')
    .replace(/^Department of\s+/i, '')
    .replace(/^Dept\.\s+of\s+/i, '')
    .replace(/^Dept\s+of\s+/i, '')
    .replace(/^BS\s+/i, '')
    .trim();

  return cleaned || 'IT';
};

/**
 * Checks whether two department identifiers refer to the same academic department,
 * handling acronyms, full names, degree programs, and common institutional variations.
 */
export const areDepartmentsEqual = (nameA, nameB) => {
  if (!nameA || !nameB) return false;
  const rawA = String(nameA).trim().toLowerCase();
  const rawB = String(nameB).trim().toLowerCase();
  if (rawA === rawB) return true;

  const normA = normalizeDepartment(nameA).toLowerCase();
  const normB = normalizeDepartment(nameB).toLowerCase();
  if (normA && normB && normA === normB) return true;

  const GROUPS = [
    ['it', 'information technology', 'info tech', 'cit', 'bsit', 'bs it', 'college of it', 'department of it', 'college of information technology', 'department of information technology', 'bachelor of science in information technology'],
    ['cs', 'computer science', 'comp sci', 'ccs', 'bscs', 'bs cs', 'college of computer studies', 'college of computer science', 'department of computer science', 'bachelor of science in computer science'],
    ['is', 'information systems', 'bsis', 'bs is', 'college of information systems', 'bachelor of science in information systems'],
    ['emc', 'entertainment and multimedia computing'],
    ['coe', 'eng', 'engineering', 'college of engineering', 'department of engineering'],
    ['cba', 'business administration', 'college of business administration', 'business', 'bsba'],
    ['con', 'nursing', 'college of nursing', 'bsn'],
    ['crim', 'criminology', 'criminal justice', 'ccj', 'ccje', 'college of criminology'],
    ['cas', 'arts and sciences', 'arts & sciences', 'college of arts and sciences'],
    ['ced', 'education', 'college of education', 'bsed', 'beed'],
    ['cop', 'pharm', 'pharmacy', 'college of pharmacy'],
    ['cod', 'dent', 'dentistry', 'college of dentistry'],
    ['pt', 'physical therapy'],
    ['mt', 'medtech', 'medical technology'],
    ['rt', 'radtech', 'radiologic technology'],
    ['psych', 'psychology'],
    ['comm', 'communication']
  ];

  for (const group of GROUPS) {
    const matchA = group.includes(rawA) || group.includes(normA);
    const matchB = group.includes(rawB) || group.includes(normB);
    if (matchA && matchB) return true;
  }

  return false;
};

export default normalizeDepartment;

