/**
 * Utility to normalize department/program names across ARCHIVIO public portal.
 * Ensures consistent naming across Popular tags, Categories, Paper badges, and Filters.
 */
export const normalizeDepartment = (name) => {
  if (!name || typeof name !== 'string') return 'Information Technology';
  const lower = name.trim().toLowerCase();

  if (
    lower.includes('information technology') ||
    lower === 'bsit' ||
    lower === 'bs it' ||
    lower.includes('college of information technology') ||
    lower.includes('department of information technology')
  ) {
    return 'Information Technology';
  }

  if (
    lower.includes('information system') ||
    lower === 'bsis' ||
    lower === 'bs is'
  ) {
    return 'Information Systems';
  }

  if (
    lower.includes('computer science') ||
    lower === 'bscs' ||
    lower === 'bs cs' ||
    lower.includes('college of computer studies')
  ) {
    return 'Computer Science';
  }

  if (
    lower.includes('nursing') ||
    lower === 'bsn' ||
    lower.includes('college of nursing')
  ) {
    return 'Nursing';
  }

  if (
    lower.includes('business') ||
    lower.includes('management') ||
    lower.includes('accountancy') ||
    lower === 'bsba' ||
    lower.includes('college of business')
  ) {
    return 'Business Administration';
  }

  if (
    lower.includes('education') ||
    lower.includes('teaching') ||
    lower === 'bsed' ||
    lower === 'beed'
  ) {
    return 'Education';
  }

  if (
    lower.includes('engineering') ||
    lower.includes('college of engineering')
  ) {
    return 'Engineering';
  }

  if (
    lower.includes('architecture') ||
    lower.includes('college of architecture')
  ) {
    return 'Architecture';
  }

  if (
    lower.includes('pharmacy') ||
    lower.includes('college of pharmacy')
  ) {
    return 'Pharmacy';
  }

  if (
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
    .replace(/^BS\s+/i, '')
    .trim();

  return cleaned || 'Information Technology';
};

export default normalizeDepartment;
