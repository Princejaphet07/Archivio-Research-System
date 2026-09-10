/**
 * Official Southwestern University PHINMA School Email Validator
 * Enforces authentic institutional email formats and guards against fake/made-up emails.
 */

// Blacklist of obvious placeholders and fake username prefixes
const BLACKLISTED_USERNAMES = [
  'test',
  'testing',
  'fake',
  'himo2',
  'himohimo',
  'asdf',
  'sample',
  'temp',
  'random',
  'dummy',
  'admin',
  'student',
  'student1',
  'user',
  '123456',
  'password'
];

/**
 * Strictly validates an SWU PHINMA Student Institutional Email.
 * Must strictly end with `.swu@phinmaed.com` (e.g. prdo.vender.swu@phinmaed.com, jcreyes.swu@phinmaed.com).
 * 
 * @param {string} emailInput 
 * @returns {{ isValid: boolean, error?: string, normalizedEmail?: string }}
 */
export function validateStudentSchoolEmail(emailInput) {
  if (!emailInput || typeof emailInput !== 'string') {
    return { isValid: false, error: 'Please provide a valid school email address.' };
  }

  const email = emailInput.trim().toLowerCase();

  // Basic structure check
  if (!email.includes('@')) {
    return { isValid: false, error: 'Email must contain an "@" symbol.' };
  }

  // Check domain
  if (!email.endsWith('@phinmaed.com')) {
    return { 
      isValid: false, 
      error: 'Invalid domain. Student emails must belong to the official PHINMA Education domain (@phinmaed.com).' 
    };
  }

  // Strictly enforce SWU campus subdomain for students: .swu@phinmaed.com
  if (!email.endsWith('.swu@phinmaed.com')) {
    return { 
      isValid: false, 
      error: 'Invalid student format. SWU PHINMA student emails must specifically end with ".swu@phinmaed.com" (e.g. username.swu@phinmaed.com).' 
    };
  }

  // Extract username prefix before .swu@phinmaed.com
  const prefix = email.slice(0, email.length - '.swu@phinmaed.com'.length);

  // Check prefix length
  if (prefix.length < 3) {
    return { isValid: false, error: 'The email username is too short to be a valid school email.' };
  }

  // Syntax check: alphanumeric and dots only, no consecutive dots, cannot start/end with dot
  const validPattern = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
  if (!validPattern.test(prefix)) {
    return { 
      isValid: false, 
      error: 'Invalid username format. School emails can only contain lowercase letters, numbers, and single dots between words.' 
    };
  }

  // Check blacklisted fake/placeholder usernames
  if (BLACKLISTED_USERNAMES.includes(prefix) || prefix.includes('himo2') || prefix.includes('fake') || prefix.includes('test')) {
    return { 
      isValid: false, 
      error: 'This email appears to be a placeholder or fake email. Please enter a genuine student institutional email.' 
    };
  }

  return { isValid: true, normalizedEmail: email };
}

/**
 * Validates an Adviser or Dean institutional email (@phinmaed.com).
 * 
 * @param {string} emailInput 
 * @returns {{ isValid: boolean, error?: string, normalizedEmail?: string }}
 */
export function validateAdviserSchoolEmail(emailInput) {
  if (!emailInput || typeof emailInput !== 'string') {
    return { isValid: false, error: 'Please provide a valid institutional email address.' };
  }

  const email = emailInput.trim().toLowerCase();

  if (!email.endsWith('@phinmaed.com')) {
    return { 
      isValid: false, 
      error: 'Invalid domain. Faculty emails must belong to the official PHINMA Education domain (@phinmaed.com).' 
    };
  }

  const prefix = email.split('@')[0];
  if (prefix.length < 3) {
    return { isValid: false, error: 'Email username is too short.' };
  }

  const validPattern = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
  if (!validPattern.test(prefix)) {
    return { isValid: false, error: 'Invalid faculty email format.' };
  }

  if (BLACKLISTED_USERNAMES.includes(prefix) || prefix.includes('himo2') || prefix.includes('fake')) {
    return { isValid: false, error: 'Please enter a genuine institutional email address.' };
  }

  return { isValid: true, normalizedEmail: email };
}

/**
 * Online verification verifying format + resolving domain MX records via backend.
 * Falls back safely to strict format validation if the email service backend is offline.
 * 
 * @param {string} email 
 * @param {'student'|'adviser'} [role='student']
 * @returns {Promise<{ isValid: boolean, error?: string, normalizedEmail?: string, offlineFallback?: boolean }>}
 */
export async function verifySchoolEmailOnline(email, role = 'student') {
  // First run strict local validation
  const localCheck = role === 'student' 
    ? validateStudentSchoolEmail(email) 
    : validateAdviserSchoolEmail(email);

  if (!localCheck.isValid) {
    return localCheck;
  }

  // Next perform MX and backend verification
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
    const res = await fetch(`${backendUrl}/api/verify-school-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: localCheck.normalizedEmail, role })
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.valid) {
        return { isValid: false, error: data.error || 'School email verification failed.' };
      }
      return { isValid: true, normalizedEmail: localCheck.normalizedEmail };
    }
  } catch (err) {
    console.warn('School email backend MX check unavailable, using strict local validation:', err);
  }

  // Gracefully fallback to strict local validation if backend is unreachable
  return { isValid: true, normalizedEmail: localCheck.normalizedEmail, offlineFallback: true };
}
