/**
 * citationFormatter.js
 * Comprehensive academic citation formatting for ARCHIVIO (Public Archive).
 * Formats citations strictly according to official APA 7, MLA 9, and IEEE standards:
 * - Proper author name inversion and ordering (single, dual, multiple authors)
 * - Sentence casing for APA 7 (with acronyms and proper noun preservation)
 * - Title casing for MLA 9 and IEEE (with minor word lowercasing)
 * - Accurate italics and punctuation inside/outside quotation marks
 * - Automated typo correction for research manuscripts
 */

// Common typographical errors in research submissions
const COMMON_TYPOS = [
  [/\baccesible\b/gi, 'accessible'],
  [/\baccesibility\b/gi, 'accessibility'],
  [/\breseach\b/gi, 'research'],
  [/\bmanagment\b/gi, 'management'],
  [/\bsystm\b/gi, 'system'],
  [/\bdevelopement\b/gi, 'development'],
  [/\bimplementaion\b/gi, 'implementation'],
  [/\benviroment\b/gi, 'environment'],
  [/\btechnolgy\b/gi, 'technology'],
  [/\binstituion\b/gi, 'institution'],
  [/\buniveristy\b/gi, 'university'],
  [/\bassessement\b/gi, 'assessment'],
  [/\bacademc\b/gi, 'academic'],
  [/\bevalution\b/gi, 'evaluation'],
  [/\befficent\b/gi, 'efficient'],
  [/\bintegretion\b/gi, 'integration'],
  [/\bperfromance\b/gi, 'performance'],
  [/\banalisys\b/gi, 'analysis'],
  [/\bframwork\b/gi, 'framework'],
  [/\balgoritm\b/gi, 'algorithm'],
  [/\bapplicaiton\b/gi, 'application'],
  [/\bstudnets\b/gi, 'students'],
  [/\baccedemic\b/gi, 'academic']
];

/**
 * Standard acronyms and proper nouns that must remain capitalized in all casings.
 */
const ACRONYMS_AND_PROPER = new Set([
  'IT', 'AI', 'IoT', 'ICT', 'SWU', 'PHINMA', 'UI', 'UX', 'UI/UX', 'API', 'APIs',
  'SQL', 'MySQL', 'PHP', 'CSS', 'HTML', 'RFID', 'GIS', 'GPS', 'ML', 'DL', 'NLP',
  'SMS', 'QR', 'COVID-19', 'IEEE', 'APA', 'MLA', 'PDF', 'URL', 'LAN', 'WAN', 'WLAN',
  'VR', 'AR', 'DBMS', 'LMS', 'POS', 'ERP', 'CMS', 'CRM', 'Cebu', 'Philippines',
  'Filipino', 'Bisaya', 'Tagalog', 'English', 'Google', 'Android', 'iOS', 'Java',
  'Python', 'Arduino', 'Southwestern', 'University'
]);

/**
 * Minor words (articles, coordinating conjunctions, and prepositions)
 * that should be lowercase in MLA 9 and IEEE title casing unless at the boundary.
 */
const MINOR_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'but', 'for', 'or', 'nor', 'so', 'yet',
  'as', 'at', 'by', 'for', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via',
  'with', 'into', 'onto', 'from', 'over', 'under'
]);

/**
 * Normalizes extra whitespace and corrects common manuscript spelling typos.
 */
export function cleanTitleText(rawTitle) {
  if (!rawTitle) return 'Untitled Research';
  let title = String(rawTitle).trim().replace(/\s+/g, ' ');

  COMMON_TYPOS.forEach(([pattern, replacement]) => {
    title = title.replace(pattern, (match) => {
      if (match === match.toUpperCase()) return replacement.toUpperCase();
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement.toLowerCase();
    });
  });

  return title;
}

/**
 * Converts a research title to APA 7th Edition Sentence Case:
 * - Capitalizes the first letter of the first word.
 * - Capitalizes the first letter of the first word following a subtitle delimiter (e.g. ": ", "? ", "! ", "— ").
 * - Preserves designated acronyms and proper nouns in uppercase (e.g. IT, AI, SWU PHINMA).
 * - Converts all other words to lowercase.
 */
export function toSentenceCase(rawTitle) {
  const cleaned = cleanTitleText(rawTitle);
  if (!cleaned) return '';

  const parts = cleaned.split(/([:?!—]\s+)/);

  return parts.map((part) => {
    if (/^[:?!—]\s+$/.test(part)) return part;

    const words = part.split(' ');
    return words.map((w, wordIdx) => {
      if (!w) return '';
      const match = w.match(/^([("‘“]*)(.*?)([)\].,!?;:"’”—]*)$/);
      if (!match) return w.toLowerCase();
      const prefix = match[1];
      const core = match[2];
      const suffix = match[3];

      const upperCore = core.toUpperCase();
      const properMatch = [...ACRONYMS_AND_PROPER].find(a => a.toUpperCase() === upperCore);
      if (properMatch) {
        return prefix + properMatch + suffix;
      }

      if (core.includes('-')) {
        const subwords = core.split('-');
        const processedSubs = subwords.map((sub, sIdx) => {
          const subUpper = sub.toUpperCase();
          const subMatch = [...ACRONYMS_AND_PROPER].find(a => a.toUpperCase() === subUpper);
          if (subMatch) return subMatch;
          if (wordIdx === 0 && sIdx === 0) {
            return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
          }
          return sub.toLowerCase();
        });
        return prefix + processedSubs.join('-') + suffix;
      }

      if (wordIdx === 0) {
        return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
      }

      return prefix + core.toLowerCase() + suffix;
    }).join(' ');
  }).join('');
}

/**
 * Converts a research title to MLA 9th Edition and IEEE Title Case:
 * - Capitalizes the first and last words of the title and subtitles.
 * - Capitalizes all major words (nouns, pronouns, verbs, adjectives, adverbs).
 * - Lowercases articles, conjunctions, and prepositions (unless first/last word).
 * - Preserves designated acronyms and proper nouns.
 */
export function toTitleCase(rawTitle) {
  const cleaned = cleanTitleText(rawTitle);
  if (!cleaned) return '';

  const parts = cleaned.split(/([:?!—]\s+)/);

  return parts.map((part) => {
    if (/^[:?!—]\s+$/.test(part)) return part;

    const words = part.split(' ');
    const lastWordIdx = words.length - 1;

    return words.map((w, wordIdx) => {
      if (!w) return '';
      const match = w.match(/^([("‘“]*)(.*?)([)\].,!?;:"’”—]*)$/);
      if (!match) return w;
      const prefix = match[1];
      const core = match[2];
      const suffix = match[3];

      const upperCore = core.toUpperCase();
      const properMatch = [...ACRONYMS_AND_PROPER].find(a => a.toUpperCase() === upperCore);
      if (properMatch) {
        return prefix + properMatch + suffix;
      }

      if (core.includes('-')) {
        const subwords = core.split('-');
        const processedSubs = subwords.map((sub) => {
          const subUpper = sub.toUpperCase();
          const subMatch = [...ACRONYMS_AND_PROPER].find(a => a.toUpperCase() === subUpper);
          if (subMatch) return subMatch;
          if (MINOR_WORDS.has(sub.toLowerCase())) {
            return sub.toLowerCase();
          }
          return sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
        });
        return prefix + processedSubs.join('-') + suffix;
      }

      const lowerCore = core.toLowerCase();
      // First or last word in clause must be capitalized
      if (wordIdx === 0 || wordIdx === lastWordIdx) {
        return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
      }

      // Minor words lowercase
      if (MINOR_WORDS.has(lowerCore)) {
        return prefix + lowerCore + suffix;
      }

      return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
    }).join(' ');
  }).join('');
}

/**
 * Parses a single author string into structured components:
 * { firstName, lastName, initials, fullName, isGroup }
 */
export function parseSingleAuthor(nameStr) {
  if (!nameStr) return { firstName: '', lastName: 'Unknown Author', initials: '', fullName: 'Unknown Author', isGroup: false };
  const cleaned = String(nameStr).trim().replace(/\s+/g, ' ');

  // Detect group, department, or institutional author
  if (/\b(group|team|committee|department|dept|office|center|university|college)\b/i.test(cleaned)) {
    return { firstName: '', lastName: cleaned, initials: '', fullName: cleaned, isGroup: true };
  }

  // Handle already inverted format: "Lastname, Firstname Middle"
  if (cleaned.includes(',')) {
    const [lastPart, firstPart] = cleaned.split(',').map(s => s.trim());
    const firstTokens = (firstPart || '').split(' ').filter(Boolean);
    const initials = firstTokens.map(t => `${t[0].toUpperCase()}.`).join(' ');
    return {
      firstName: firstPart,
      lastName: lastPart,
      initials,
      fullName: firstPart ? `${firstPart} ${lastPart}` : lastPart,
      isGroup: false
    };
  }

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    return { firstName: '', lastName: tokens[0], initials: `${tokens[0][0].toUpperCase()}.`, fullName: tokens[0], isGroup: false };
  }

  // Handle compound surnames like Dela Cruz, San Juan, Van Buren, etc.
  const prefixes = ['dela', 'del', 'de', 'san', 'santa', 'van', 'von', 'da', 'dos'];
  let lastName = '';
  let firstTokens = [];

  if (tokens.length >= 3 && prefixes.includes(tokens[tokens.length - 2].toLowerCase())) {
    lastName = tokens.slice(-2).join(' ');
    firstTokens = tokens.slice(0, -2);
  } else if (tokens.length >= 4 && tokens[tokens.length - 3].toLowerCase() === 'de' && tokens[tokens.length - 2].toLowerCase() === 'la') {
    lastName = tokens.slice(-3).join(' ');
    firstTokens = tokens.slice(0, -3);
  } else {
    lastName = tokens[tokens.length - 1];
    firstTokens = tokens.slice(0, -1);
  }

  const initials = firstTokens.map(t => `${t[0].toUpperCase()}.`).join(' ');
  const firstName = firstTokens.join(' ');

  return {
    firstName,
    lastName,
    initials,
    fullName: `${firstName} ${lastName}`,
    isGroup: false
  };
}

/**
 * Splits a composite author string (separated by commas or 'and') into structured authors.
 */
export function parseAuthors(authorStr) {
  if (!authorStr) return [];
  // Split authors by comma or " and " or " & " (unless inside parentheses)
  const rawList = String(authorStr)
    .split(/\s*,\s*(?![^()]*\))|\s+and\s+|\s+&\s+/i)
    .map(s => s.trim())
    .filter(Boolean);

  return rawList.map(parseSingleAuthor);
}

/**
 * Formats authors for APA 7th Edition:
 * - Single author: "Zamoras, J."
 * - Two authors: "Zamoras, J., & Vender, P. J."
 * - 3 to 20 authors: "Zamoras, J., Vender, P. J., & Smith, A."
 * - Over 20 authors: List first 19, then ellipsis "...", then last author.
 */
export function formatAuthorsAPA(authors) {
  if (!authors || authors.length === 0) return 'Unknown Author';
  if (authors.length === 1 && authors[0].isGroup) return authors[0].fullName;

  const formatted = authors.map(a => {
    if (a.isGroup) return a.fullName;
    return a.initials ? `${a.lastName}, ${a.initials}` : a.lastName;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  if (formatted.length <= 20) {
    return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
  }
  return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`;
}

/**
 * Formats authors for MLA 9th Edition:
 * - Single author: "Zamoras, Jerika."
 * - Two authors: "Zamoras, Jerika, and Prince Japhet Vender."
 * - Three or more authors: "Zamoras, Jerika, et al."
 */
export function formatAuthorsMLA(authors) {
  if (!authors || authors.length === 0) return 'Unknown Author';
  if (authors.length === 1 && authors[0].isGroup) return authors[0].fullName;

  if (authors.length === 1) {
    const a = authors[0];
    return a.firstName ? `${a.lastName}, ${a.firstName}` : a.lastName;
  }
  if (authors.length === 2) {
    const a1 = authors[0];
    const a2 = authors[1];
    const firstStr = a1.firstName ? `${a1.lastName}, ${a1.firstName}` : a1.lastName;
    const secondStr = a2.firstName ? `${a2.firstName} ${a2.lastName}` : a2.lastName;
    return `${firstStr}, and ${secondStr}`;
  }
  const a1 = authors[0];
  const firstStr = a1.firstName ? `${a1.lastName}, ${a1.firstName}` : a1.lastName;
  return `${firstStr}, et al.`;
}

/**
 * Formats authors for IEEE Style:
 * - Single author: "J. Zamoras"
 * - Two authors: "J. Zamoras and P. J. Vender"
 * - Three to six authors: "J. Zamoras, P. J. Vender, and A. Smith"
 * - More than six authors: "J. Zamoras et al."
 */
export function formatAuthorsIEEE(authors) {
  if (!authors || authors.length === 0) return 'Unknown Author';
  if (authors.length === 1 && authors[0].isGroup) return authors[0].fullName;

  const formatted = authors.map(a => {
    if (a.isGroup) return a.fullName;
    return a.initials ? `${a.initials} ${a.lastName}` : a.lastName;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length <= 6) {
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
  }
  return `${formatted[0]} et al.`;
}

/**
 * Helper to ensure a title ends cleanly with required punctuation.
 */
function ensureTrailingPunctuation(str, punctuation = '.') {
  if (!str) return '';
  const trimmed = str.trim();
  if (/[.?!]$/.test(trimmed)) return trimmed;
  return trimmed + punctuation;
}

/**
 * Main generator returning full citation objects for APA 7, MLA 9, and IEEE.
 */
export function generateAllCitations({
  title = '',
  authorDisplay = '',
  year = new Date().getFullYear(),
  institution = 'SWU PHINMA'
}) {
  const parsedAuthors = parseAuthors(authorDisplay);
  const cleanYear = year || new Date().getFullYear();
  const cleanInst = institution || 'SWU PHINMA';

  // APA 7: Sentence Case title (italicized), Lastname, Initials author
  const apaAuthor = formatAuthorsAPA(parsedAuthors);
  const rawApaTitle = toSentenceCase(title);
  const apaTitle = ensureTrailingPunctuation(rawApaTitle, '.');
  const apaPlainText = `${apaAuthor} (${cleanYear}). ${apaTitle} ${cleanInst}.`;

  // MLA 9: Title Case in quotation marks (period inside), Lastname, Firstname author, Italicized container/publisher
  const mlaAuthor = formatAuthorsMLA(parsedAuthors);
  const rawMlaTitle = toTitleCase(title);
  const mlaTitleWithPunct = ensureTrailingPunctuation(rawMlaTitle, '.');
  const mlaPlainText = `${mlaAuthor}. "${mlaTitleWithPunct}" ${cleanInst}, ${cleanYear}.`;

  // IEEE: Title Case in quotation marks (comma inside), Initials Lastname author, plain institution
  const ieeeAuthor = formatAuthorsIEEE(parsedAuthors);
  const rawIeeeTitle = toTitleCase(title);
  // In IEEE, comma goes inside quotes
  const trimmedIeeeTitle = rawIeeeTitle.replace(/[.,]$/, '');
  const ieeePlainText = `${ieeeAuthor}, "${trimmedIeeeTitle}," ${cleanInst}, ${cleanYear}.`;

  return {
    apa: {
      author: apaAuthor,
      title: apaTitle,
      year: cleanYear,
      institution: cleanInst,
      plainText: apaPlainText
    },
    mla: {
      author: mlaAuthor,
      title: mlaTitleWithPunct,
      year: cleanYear,
      institution: cleanInst,
      plainText: mlaPlainText
    },
    ieee: {
      author: ieeeAuthor,
      title: trimmedIeeeTitle,
      year: cleanYear,
      institution: cleanInst,
      plainText: ieeePlainText
    }
  };
}
