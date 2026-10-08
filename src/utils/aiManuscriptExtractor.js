import { pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import { getBackendUrl } from './backendUrl';

// Ensure PDF.js worker is properly configured for the browser
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts readable text and page count from a PDF File, Blob, ArrayBuffer, or remote URL.
 * Scans the first 10 pages where the title, approval sheet, and abstract always reside.
 */
export async function extractPdfText(source) {
  let arrayBuffer = null;
  let pageCount = null;

  try {
    if (source instanceof ArrayBuffer) {
      arrayBuffer = source;
    } else if (source instanceof Blob) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string' && source.startsWith('http')) {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      arrayBuffer = await response.arrayBuffer();
    }

    if (!arrayBuffer) {
      return { text: '', pageCount: null };
    }

    // Attempt to extract accurate page count with pdf-lib first (reliable without worker)
    try {
      const pdfLibDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      pageCount = pdfLibDoc.getPageCount();
    } catch (libErr) {
      console.warn('pdf-lib page count warning:', libErr);
    }

    // Extract text from pages 1-10 using pdfjs
    let fullText = '';
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      if (!pageCount) pageCount = pdf.numPages;

      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map(item => ('str' in item ? item.str : ''))
            .join(' ');
          fullText += pageText + '\n\n';
        } catch (pageErr) {
          console.warn(`Failed to read PDF page ${i}:`, pageErr);
        }
      }
    } catch (pdfjsErr) {
      console.warn('pdfjs worker extraction warning, checking text fallback:', pdfjsErr);
    }

    return { text: fullText.trim(), pageCount };
  } catch (err) {
    console.error('Error in extractPdfText:', err);
    return { text: '', pageCount };
  }
}

/**
 * Searches the extracted PDF text for an author-written Abstract section.
 */
export function extractDirectAbstract(text) {
  if (!text || text.length < 50) return null;

  // Regex to detect "Abstract" or "Executive Summary" section up until keywords or next chapters
  const regex = /(?:^|\n|\r)\s*(?:abstract|executive summary)[:\s\n]+([\s\S]{100,2000}?)(?=(?:\n|\r)\s*(?:keywords|key words|table of contents|chapter\s+1|1\.0|1\.\s+introduction|introduction|acknowledgment|dedication)|\n\s*\n\s*\n|$)/i;
  const match = text.match(regex);
  if (match && match[1]) {
    const candidate = match[1].replace(/\s+/g, ' ').trim();
    if (candidate.length >= 80) {
      return candidate;
    }
  }

  return null;
}

/**
 * Generates or extracts an academic abstract using multi-tier fallback:
 * Tier 1: ARCHIVIO Backend API (/api/ai/extract-abstract)
 * Tier 2: Groq Cloud API directly using VITE_GROQ_API_KEY
 * Tier 3: Direct regex extraction of the student's paper abstract
 * Tier 4: Contextual academic synthesis fallback
 */
export async function generateAbstractWithAI(pdfText = '', researchTitle = '', options = {}) {
  const { pdfUrl } = options;
  const trimmedText = (pdfText || '').trim();

  // Check if student's paper already contains an explicit, high-quality abstract
  const directAbstract = extractDirectAbstract(trimmedText);

  // ── Tier 1: Try ARCHIVIO Cloud Backend API ───────────────────────
  try {
    const backendUrl = getBackendUrl();
    const payload = {};
    if (trimmedText && trimmedText.length > 50) payload.pdfText = trimmedText.substring(0, 15000);
    if (pdfUrl && pdfUrl.startsWith('http')) payload.pdfUrl = pdfUrl;
    if (researchTitle) payload.researchTitle = researchTitle;

    if (payload.pdfText || payload.pdfUrl) {
      const res = await fetch(`${backendUrl}/api/ai/extract-abstract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.abstract && data.abstract.trim().length > 40 && !data.abstract.toLowerCase().includes('temporarily unavailable')) {
          return sanitizeAbstract(data.abstract);
        }
      }
    }
  } catch (backendErr) {
    console.warn('Backend abstract extraction unavailable, using client-side AI tier:', backendErr);
  }

  // ── Tier 2: Call Groq API Directly via Client Key ────────────────
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (groqKey && (trimmedText.length > 50 || directAbstract)) {
    const sourceContent = trimmedText ? trimmedText.substring(0, 12000) : directAbstract;
    const modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

    for (const model of modelsToTry) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert academic research assistant for an academic repository. Read the research manuscript text and write a professional, well-structured academic abstract of 150-250 words covering: problem statement, methodology, findings, and conclusion. Return ONLY the abstract paragraph without headings, bold title labels, or bullet points.'
              },
              {
                role: 'user',
                content: `Research Title: ${researchTitle || 'Undergraduate Capstone'}\n\nManuscript Excerpt:\n${sourceContent}`
              }
            ],
            temperature: 0.3
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim().length > 50) {
            return sanitizeAbstract(content);
          }
        }
      } catch (groqErr) {
        console.warn(`Groq model [${model}] error:`, groqErr);
      }
    }
  }

  // ── Tier 3: Use cleanly extracted direct abstract from paper ──────
  if (directAbstract && directAbstract.length >= 80) {
    return directAbstract;
  }

  // ── Tier 4: Heuristic fallback from text opening ──────────────────
  if (trimmedText && trimmedText.length > 100) {
    const introSnippet = trimmedText
      .replace(/^[\s\S]*?(?:chapter\s+1|introduction|background of the study)/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (introSnippet.length > 100) {
      const sentenceMatch = introSnippet.match(/^(?:.*?[.!?]){3,6}/);
      if (sentenceMatch && sentenceMatch[0].length > 120) {
        return sentenceMatch[0].trim();
      }
    }
  }

  return "This research manuscript presents a comprehensive academic investigation, detailing the core problem context, methodological design, analytical findings, and practical recommendations.";
}

/**
 * Extracts 4-7 relevant academic keywords from the abstract and research title.
 */
export async function extractKeywordsWithAI(abstractText = '', researchTitle = '') {
  if (!abstractText || abstractText.length < 20) return [];

  // Try backend first
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/ai/extract-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abstract: abstractText })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.keywords) && data.keywords.length > 0) {
        return data.keywords;
      }
    }
  } catch (err) {}

  // Try Groq directly
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: 'Return ONLY a valid JSON array of 4 to 6 relevant academic keywords or short phrases (2-3 words max) based on the abstract. Example format: ["Smart Campus", "Internet of Things", "Energy Efficiency", "Telemetry"]. No markdown.'
            },
            {
              role: 'user',
              content: `Title: ${researchTitle}\nAbstract: ${abstractText}`
            }
          ]
        })
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}
  }

  // Client-side statistical keyword extraction
  return extractClientKeywords(abstractText, researchTitle);
}

function extractClientKeywords(text, title = '') {
  const combined = `${title} ${text}`.toLowerCase();
  const stopWords = new Set([
    'the','and','for','that','this','with','from','have','were','which','their','these',
    'been','study','research','paper','system','using','also','more','into','such','they',
    'will','about','some','than','then','what','when','where','who','will','would','could',
    'should','after','before','under','over','through','between','presents','presents,'
  ]);

  const words = combined.match(/[a-z]{4,}/g) || [];
  const freq = {};
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function sanitizeAbstract(raw) {
  if (!raw) return '';
  return raw
    .replace(/^#+\s*(?:abstract|executive summary)?:?/gi, '')
    .replace(/^\*\*(?:abstract|executive summary)?:?\*\*/gi, '')
    .replace(/^abstract:\s*/gi, '')
    .replace(/\*\*/g, '')
    .trim();
}
