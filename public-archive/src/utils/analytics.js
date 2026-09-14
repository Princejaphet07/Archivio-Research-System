// Google Analytics (Firebase Analytics) telemetry module exclusively for Public Archive
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import app from '../firebase/config';
import { normalizeDepartment } from './normalizeDepartment';

let analyticsPromise = null;

/**
 * Lazily resolve Firebase Analytics safely in browser environments
 */
export const getArchiveAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch((err) => {
        console.debug('Analytics isSupported check note:', err?.message);
        return null;
      });
  }
  return analyticsPromise;
};

/**
 * Generic safe event logger that never crashes or interrupts UI execution
 */
export const logPublicEvent = async (eventName, params = {}) => {
  try {
    const analytics = await getArchiveAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, {
        portal: 'public_archive',
        timestamp: new Date().toISOString(),
        ...params
      });
    }
  } catch (err) {
    // Non-blocking: fail silently if browser blocks analytics/telemetry
    console.debug(`[Analytics: ${eventName}] note:`, err?.message);
  }
};

/**
 * 1. Track Paper View
 * Triggered when a public visitor or researcher opens a research manuscript
 */
export const trackPaperView = (paper) => {
  if (!paper) return;
  const title = paper.researchTitle || paper.title || 'Untitled Research';
  const dept = normalizeDepartment(paper.department || paper.program || 'General');
  const cat = paper.researchCategory || paper.category || 'General';
  const year = paper.submissionYear || paper.year || new Date(paper.publishedAt || Date.now()).getFullYear();

  logPublicEvent('view_research_paper', {
    paper_id: String(paper.id || ''),
    paper_title: String(title).slice(0, 100),
    department: String(dept),
    category: String(cat),
    year: Number(year) || 0
  });
};

/**
 * 2. Track Search Queries
 * Triggered when a visitor performs a keyword search in the public archive
 * Sends both standard Google Analytics 'search' event and custom 'search_research'
 */
export const trackSearch = (queryStr, resultCount = 0) => {
  const cleanQuery = String(queryStr || '').trim();
  if (!cleanQuery) return;

  // Standard Google Analytics 4 Search Event (Auto-parsed by GA4 Search reports)
  logPublicEvent('search', {
    search_term: cleanQuery.slice(0, 100)
  });

  // Custom ARCHIVIO research search event with results count
  logPublicEvent('search_research', {
    search_term: cleanQuery.slice(0, 100),
    results_count: Number(resultCount) || 0
  });
};

/**
 * 3. Track Department Filter
 * Triggered when a visitor filters research by department
 */
export const trackDepartmentFilter = (department) => {
  if (!department) return;
  const normDept = normalizeDepartment(department);

  logPublicEvent('filter_department', {
    department: String(normDept)
  });
};

/**
 * 4. Track Year Filter
 * Triggered when a visitor filters research by publication year
 */
export const trackYearFilter = (year) => {
  if (!year) return;

  logPublicEvent('filter_year', {
    year: Number(year) || String(year)
  });
};

/**
 * 5. Track Bookmark Action
 * Triggered when a paper is bookmarked in the library
 */
export const trackBookmark = (paper, action = 'add') => {
  if (!paper) return;
  const title = paper.researchTitle || paper.title || 'Untitled Research';

  logPublicEvent('bookmark_paper', {
    paper_id: String(paper.id || ''),
    paper_title: String(title).slice(0, 100),
    action: action
  });
};

/**
 * 6. Track Like Action
 * Triggered when a paper is liked
 */
export const trackLike = (paper) => {
  if (!paper) return;
  const title = paper.researchTitle || paper.title || 'Untitled Research';

  logPublicEvent('like_paper', {
    paper_id: String(paper.id || ''),
    paper_title: String(title).slice(0, 100)
  });
};

/**
 * 7. Track Citation Generation / Export
 * Triggered when a researcher exports or copies citation in RIS, BibTeX, or link
 */
export const trackCitation = (paper, format = 'link') => {
  if (!paper) return;
  const title = paper.researchTitle || paper.title || 'Untitled Research';

  logPublicEvent('export_citation', {
    paper_id: String(paper.id || ''),
    paper_title: String(title).slice(0, 100),
    format: format
  });
};

/**
 * 8. Track AI Research Chatbot Questions
 * Triggered when a reader asks questions to the AI assistant in the viewer
 */
export const trackAiChat = (paper, questionLength = 0) => {
  logPublicEvent('ai_research_assistant_query', {
    paper_id: String(paper?.id || ''),
    paper_title: String(paper?.researchTitle || paper?.title || '').slice(0, 100),
    question_length: questionLength
  });
};

/**
 * 9. Track Certificate Verification
 * Triggered when public verification of an archival certificate is accessed
 */
export const trackCertificateVerify = (certId, isValid) => {
  logPublicEvent('verify_certificate', {
    certificate_id: String(certId || ''),
    is_valid: Boolean(isValid)
  });
};
