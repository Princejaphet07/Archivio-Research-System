import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { db, auth, storage } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAdviser } from '../context/AdviserContext';
import { Card, SectionTitle, StatusBadge } from '../../components/ui/Card';
import BookLoader from '../../components/BookLoader';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { 
  extractPdfText, 
  generateAbstractWithAI, 
  extractKeywordsWithAI 
} from '../../utils/aiManuscriptExtractor';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  ExternalLink, 
  Tag, 
  Building2, 
  BookOpen, 
  Search,
  Eye,
  RotateCcw
} from 'lucide-react';

const ACADEMIC_YEARS = [
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
  '2020-2021',
  '2019-2020',
  'Earlier'
];

const DEFAULT_CATEGORIES = [
  'Information Technology',
  'Computer Science',
  'Business Administration',
  'Accountancy',
  'Health Sciences',
  'Nursing',
  'Education',
  'Engineering',
  'Social Sciences',
  'General'
];

const DRAFT_STORAGE_KEY = 'archivio_adviser_upload_draft';

// In-memory draft singleton that persists across route changes in the same browser session
let inMemoryDraft = {
  file: null,
  fileName: '',
  fileSize: '',
  pageCount: null,
  extractedPdfText: '',
  title: '',
  authors: '',
  department: '',
  category: 'General',
  academicYear: '2024-2025',
  abstract: '',
  keywords: []
};

const saveDraftToStorage = (data) => {
  try {
    const toSave = {
      title: data.title || '',
      authors: data.authors || '',
      department: data.department || '',
      category: data.category || 'General',
      academicYear: data.academicYear || '2024-2025',
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      fileName: data.file?.name || data.fileName || '',
      fileSize: data.file?.size
        ? (data.file.size > 1024 * 1024
            ? (data.file.size / (1024 * 1024)).toFixed(2) + ' MB'
            : (data.file.size / 1024).toFixed(1) + ' KB')
        : (data.fileSize || ''),
      pageCount: data.pageCount || null,
      extractedPdfText: data.extractedPdfText || ''
    };
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Draft save notice:', e);
  }
};

const loadDraftFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const clearDraftStorage = () => {
  inMemoryDraft = {
    file: null,
    fileName: '',
    fileSize: '',
    pageCount: null,
    extractedPdfText: '',
    title: '',
    authors: '',
    department: '',
    category: 'General',
    academicYear: '2024-2025',
    abstract: '',
    keywords: []
  };
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {}
};

export default function UploadManuscript() {
  const { adviserData } = useAdviser();
  const fileInputRef = useRef(null);

  // Restore from memory or session on initial render
  const storedDraft = loadDraftFromStorage();
  const initialFile = inMemoryDraft.file || null;

  // Form State
  const [file, setFile] = useState(initialFile);
  const [extractedPdfText, setExtractedPdfText] = useState(inMemoryDraft.extractedPdfText || storedDraft?.extractedPdfText || '');
  const [pageCount, setPageCount] = useState(inMemoryDraft.pageCount || storedDraft?.pageCount || null);
  const [title, setTitle] = useState(inMemoryDraft.title || storedDraft?.title || '');
  const [authors, setAuthors] = useState(inMemoryDraft.authors || storedDraft?.authors || '');
  const [department, setDepartment] = useState(inMemoryDraft.department || storedDraft?.department || adviserData?.department || adviserData?.program || '');
  const [category, setCategory] = useState(inMemoryDraft.category || storedDraft?.category || 'General');
  const [academicYear, setAcademicYear] = useState(inMemoryDraft.academicYear || storedDraft?.academicYear || '2024-2025');
  const [abstract, setAbstract] = useState(inMemoryDraft.abstract || storedDraft?.abstract || '');
  const [keywords, setKeywords] = useState(inMemoryDraft.keywords || storedDraft?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');

  // UI & Loading States
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isGeneratingAbstract, setIsGeneratingAbstract] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStatusText, setPublishStatusText] = useState('Uploading PDF to cloud storage...');
  const [isDragging, setIsDragging] = useState(false);

  // Document Viewer Modal State
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  // Available Categories from Firestore
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Past Uploads Table
  const [pastUploads, setPastUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [searchTableQuery, setSearchTableQuery] = useState('');

  // Keep in-memory draft and sessionStorage synchronized whenever fields change
  useEffect(() => {
    inMemoryDraft = {
      file,
      fileName: file?.name || inMemoryDraft.fileName || '',
      fileSize: file?.size || inMemoryDraft.fileSize || '',
      pageCount,
      extractedPdfText,
      title,
      authors,
      department,
      category,
      academicYear,
      abstract,
      keywords
    };
    saveDraftToStorage(inMemoryDraft);
  }, [file, pageCount, extractedPdfText, title, authors, department, category, academicYear, abstract, keywords]);

  // Update default department when adviserData loads (if department is empty)
  useEffect(() => {
    if (!department && (adviserData?.department || adviserData?.program)) {
      setDepartment(adviserData?.department || adviserData?.program);
    }
  }, [adviserData, department]);

  // Fetch categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const dbCats = snapshot.docs
        .map(d => d.data()?.name)
        .filter(Boolean);
      if (dbCats.length > 0) {
        const merged = Array.from(new Set([...dbCats, ...DEFAULT_CATEGORIES]));
        setCategories(merged);
      }
    }, (err) => console.warn('Categories notice:', err));
    return () => unsub();
  }, []);

  // Listen for manuscripts uploaded by this adviser
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    const email = currentUser.email.toLowerCase().trim();
    const q = query(
      collection(db, 'submissions'),
      where('adviserEmail', '==', email),
      where('uploadedByAdviser', '==', true)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      list.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setPastUploads(list);
      setLoadingUploads(false);
    }, (err) => {
      console.warn('Submissions listener notice:', err);
      setLoadingUploads(false);
    });

    return () => unsub();
  }, []);

  // Handle PDF file selection and automatic AI extraction
  const processSelectedFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please select a PDF document (.pdf).',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'PDF size should not exceed 50 MB.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    setFile(selectedFile);

    // Auto-prefill title from file name if empty
    if (!title.trim()) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setTitle(cleanName);
    }

    // Step 1: Read PDF text & page count
    setIsReadingPdf(true);
    let extractedText = '';
    let pages = null;

    try {
      const result = await extractPdfText(selectedFile);
      extractedText = result.text || '';
      pages = result.pageCount || null;
      setExtractedPdfText(extractedText);
      setPageCount(pages);
    } catch (err) {
      console.warn('PDF text extraction error:', err);
    } finally {
      setIsReadingPdf(false);
    }

    // Step 2: Auto-run AI Abstract & Keyword generation if text is available
    if (extractedText && extractedText.trim().length > 40) {
      setIsGeneratingAbstract(true);
      try {
        const currentTitle = title.trim() || selectedFile.name;
        const genAbstract = await generateAbstractWithAI(extractedText, currentTitle, {});

        if (genAbstract && genAbstract.trim().length > 30) {
          setAbstract(genAbstract);

          // Extract keywords
          setIsExtractingKeywords(true);
          const genKeywords = await extractKeywordsWithAI(genAbstract, currentTitle);
          if (Array.isArray(genKeywords) && genKeywords.length > 0) {
            setKeywords(genKeywords);
          }
        }
      } catch (aiErr) {
        console.warn('Auto AI abstract error on select:', aiErr);
      } finally {
        setIsGeneratingAbstract(false);
        setIsExtractingKeywords(false);
      }
    }
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) processSelectedFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processSelectedFile(f);
  };

  // View local selected file
  const handlePreviewSelectedFile = () => {
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setViewerState({
      isOpen: true,
      url: blobUrl,
      title: `${title.trim() || file.name}.pdf`
    });
  };

  // View past uploaded file
  const handleViewPastManuscript = (item) => {
    const docUrl = item.documents?.['Final Manuscript']?.url || item.pdfUrl || item.fileUrl || item.manuscriptUrl;
    if (!docUrl) {
      Swal.fire({
        icon: 'info',
        title: 'Document URL Not Found',
        text: 'The manuscript URL could not be located.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }
    setViewerState({
      isOpen: true,
      url: docUrl,
      title: `${item.title || item.researchTitle || 'Manuscript'}.pdf`
    });
  };

  // Regenerate Abstract via AI
  const handleRegenerateAbstract = async () => {
    if (!extractedPdfText && !file) {
      Swal.fire({
        icon: 'info',
        title: 'Upload PDF First',
        text: 'Please upload a manuscript PDF first so AI can read its contents.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    setIsGeneratingAbstract(true);
    try {
      const generated = await generateAbstractWithAI(
        extractedPdfText || '', 
        title.trim() || 'Research Manuscript', 
        {}
      );
      if (generated && generated.trim().length > 20) {
        setAbstract(generated);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Abstract Generated!',
          showConfirmButton: false,
          timer: 2500
        });
      } else {
        throw new Error('AI could not extract an abstract. Please write or paste it manually.');
      }
    } catch (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Abstract Notice',
        text: err.message || 'Failed to generate abstract with AI.',
        confirmButtonColor: '#7B1F35'
      });
    } finally {
      setIsGeneratingAbstract(false);
    }
  };

  // Extract Keywords via AI
  const handleExtractKeywords = async () => {
    const textToUse = abstract.trim() || extractedPdfText || title;
    if (!textToUse || textToUse.length < 15) {
      Swal.fire({
        icon: 'info',
        title: 'Abstract Needed',
        text: 'Please enter or generate an abstract first so AI can extract relevant keywords.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    setIsExtractingKeywords(true);
    try {
      const extracted = await extractKeywordsWithAI(textToUse, title.trim());
      if (Array.isArray(extracted) && extracted.length > 0) {
        setKeywords(extracted);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Extracted ${extracted.length} Keywords!`,
          showConfirmButton: false,
          timer: 2500
        });
      }
    } catch (err) {
      console.warn('Keyword extraction notice:', err);
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  // Add a single keyword manually
  const handleAddKeyword = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = keywordInput.replace(/,/g, '').trim();
      if (clean && !keywords.includes(clean)) {
        setKeywords([...keywords, clean]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  // Reset form & clear draft
  const handleResetForm = () => {
    Swal.fire({
      title: 'Clear Form?',
      text: 'This will reset your current manuscript inputs and draft.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Clear',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#7B1F35',
      cancelButtonColor: '#6B7280'
    }).then((res) => {
      if (res.isConfirmed) {
        clearDraftStorage();
        setFile(null);
        setExtractedPdfText('');
        setPageCount(null);
        setTitle('');
        setAuthors('');
        setAbstract('');
        setKeywords([]);
        setKeywordInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  // Publish Directly to Public Archive
  const handlePublishToArchive = async () => {
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'File Missing', text: 'Please select a manuscript PDF file.', confirmButtonColor: '#7B1F35' });
      return;
    }
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Title Required', text: 'Please enter the research title.', confirmButtonColor: '#7B1F35' });
      return;
    }
    if (!authors.trim()) {
      Swal.fire({ icon: 'warning', title: 'Authors Required', text: 'Please enter the authors or student researchers.', confirmButtonColor: '#7B1F35' });
      return;
    }
    if (!abstract.trim() || abstract.length < 25) {
      Swal.fire({ icon: 'warning', title: 'Abstract Required', text: 'Please provide an abstract (or click Generate Abstract).', confirmButtonColor: '#7B1F35' });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Publish to Public Archive?',
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
          <p style="margin-bottom: 8px;">You are about to publish:</p>
          <p style="font-weight: bold; color: #7B1F35; margin-bottom: 8px;">"${title.trim()}"</p>
          <p style="margin: 0; font-size: 12.5px; color: #718096;">
            This manuscript will immediately appear on the <strong>ARCHIVIO Public Archive</strong>, viewable and searchable by all users.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Publish Live',
      cancelButtonText: 'Review Form',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6B7280'
    });

    if (!confirm.isConfirmed) return;

    // Trigger full-screen BookLoader
    setIsPublishing(true);
    setPublishProgress(0);
    setPublishStatusText('Preparing manuscript upload...');

    try {
      const currentUser = auth.currentUser;
      const userUid = currentUser?.uid || 'adviser';
      const userEmail = currentUser?.email?.toLowerCase().trim() || '';
      const adviserDisplayName = adviserData?.name || currentUser?.displayName || 'Research Adviser';

      // 1. Upload PDF to Firebase Storage with live progress
      const fileExt = file.name.split('.').pop() || 'pdf';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `legacy_manuscripts/${userUid}/${Date.now()}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      setPublishStatusText('Uploading PDF to Cloud Storage (0%)...');
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setPublishProgress(progress);
              setPublishStatusText(`Uploading PDF to Cloud Storage (${progress}%)...`);
            }
          },
          (error) => {
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });

      setPublishStatusText('Indexing metadata and publishing to ARCHIVIO Public Archive...');
      const downloadUrl = await getDownloadURL(storageRef);

      const sizeStr = file.size > 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(1) + ' KB';

      // 2. Save directly to Firestore 'submissions' with 'published' status
      const cleanYear = academicYear.trim().split('-')[0] || new Date().getFullYear().toString();
      const submissionDoc = {
        title: title.trim(),
        researchTitle: title.trim(),
        abstract: abstract.trim(),
        keywords: keywords.length > 0 ? keywords : ['Research', 'Capstone'],
        studentName: authors.trim(),
        authorDisplay: authors.trim(),
        groupName: authors.trim(),
        authors: authors.trim(),
        department: department.trim() || 'General Academics',
        program: department.trim() || 'General Academics',
        category: category || 'General',
        academicYear: academicYear.trim(),
        year: cleanYear,
        pageCount: pageCount || 1,
        documents: {
          'Final Manuscript': {
            name: file.name,
            url: downloadUrl,
            size: sizeStr,
            type: 'file',
            uploadedAt: new Date().toISOString()
          }
        },
        uploadedDocs: ['Final Manuscript'],
        pdfUrl: downloadUrl,
        fileUrl: downloadUrl,
        manuscriptUrl: downloadUrl,
        reviewStatus: 'published',
        publishedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adviserUid: userEmail,
        adviserName: adviserDisplayName,
        adviserEmail: userEmail,
        uploadedByAdviser: true,
        uploadedBy: {
          uid: userUid,
          name: adviserDisplayName,
          email: userEmail,
          role: 'Adviser'
        }
      };

      const docRef = await addDoc(collection(db, 'submissions'), submissionDoc);

      // 3. Log System Activity
      await logActivity({
        user: adviserDisplayName,
        role: 'Adviser',
        action: 'Published Legacy Manuscript to Public Archive',
        details: `Published "${title.trim()}" (${authors.trim()})`,
        status: 'Success'
      });

      // Clear draft storage
      clearDraftStorage();
      setFile(null);
      setExtractedPdfText('');
      setPageCount(null);
      setTitle('');
      setAuthors('');
      setAbstract('');
      setKeywords([]);
      setKeywordInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Stop loader before showing success dialog
      setIsPublishing(false);

      // 4. Success Alert
      Swal.fire({
        icon: 'success',
        title: 'Published to Public Archive!',
        html: `
          <div style="text-align: left; font-size: 14px; color: #4a5568; line-height: 1.6;">
            <p style="margin-bottom: 8px;"><strong>"${title.trim()}"</strong> is now live on the public site.</p>
            <p style="font-size: 12.5px; color: #718096; margin: 0;">Visitors and students can now read, cite, and search this research.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'View in Public Archive',
        cancelButtonText: 'Done',
        confirmButtonColor: '#7B1F35',
        cancelButtonColor: '#6B7280'
      }).then((res) => {
        if (res.isConfirmed) {
          window.open(`https://archivio-research-system.web.app/paper/${docRef.id}`, '_blank');
        }
      });

    } catch (err) {
      console.error('Publish error:', err);
      setIsPublishing(false);
      Swal.fire({
        icon: 'error',
        title: 'Publish Failed',
        text: err.message || 'An error occurred while uploading. Please try again.',
        confirmButtonColor: '#7B1F35'
      });
    }
  };

  // Delete / Unpublish a manuscript
  const handleDeleteUpload = async (item) => {
    const confirm = await Swal.fire({
      title: 'Remove from Archive?',
      html: `
        <div style="text-align: left; font-size: 13.5px; color: #4a5568;">
          <p style="margin-bottom: 6px;">Are you sure you want to remove this paper?</p>
          <p style="font-weight: bold; color: #c53030; margin-bottom: 6px;">"${item.title || item.researchTitle}"</p>
          <p style="font-size: 12px; color: #718096; margin: 0;">It will be removed from the public repository immediately.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#c53030',
      cancelButtonColor: '#6B7280'
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'submissions', item.id));

      await logActivity({
        user: adviserData?.name || auth.currentUser?.displayName || 'Research Adviser',
        role: 'Adviser',
        action: 'Removed Legacy Manuscript from Public Archive',
        details: `Deleted "${item.title || item.researchTitle}"`,
        status: 'Success'
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Paper Removed from Archive',
        showConfirmButton: false,
        timer: 2500
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Failed to remove document.' });
    }
  };

  // Filter past uploads by search query
  const filteredUploads = pastUploads.filter(p => {
    if (!searchTableQuery.trim()) return true;
    const q = searchTableQuery.toLowerCase();
    const t = (p.title || p.researchTitle || '').toLowerCase();
    const a = (p.authors || p.studentName || '').toLowerCase();
    const d = (p.department || '').toLowerCase();
    const c = (p.category || '').toLowerCase();
    return t.includes(q) || a.includes(q) || d.includes(q) || c.includes(q);
  });

  const hasDraftContent = !!(file || title || authors || abstract || keywords.length > 0);

  return (
    <Layout
      title="Upload Manuscript"
      breadcrumb="Home / Upload Manuscript"
      showSearch={false}
    >
      {/* FULL-SCREEN THEMATIC BOOK LOADER DURING UPLOAD */}
      {isPublishing && (
        <BookLoader
          fullScreen={true}
          size="lg"
          text={publishProgress < 100 ? `UPLOADING MANUSCRIPT (${publishProgress}%)...` : "PUBLISHING TO ARCHIVE..."}
          subtext={publishStatusText}
        />
      )}

      {/* FULL-SCREEN DOCUMENT VIEWER MODAL */}
      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ isOpen: false, url: '', title: '' })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
        role="adviser"
      />

      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Title Header with Draft Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <SectionTitle
            sub="Upload, inspect, and publish past capstones or departmental research manuscripts directly to the ARCHIVIO Public Archive."
          >
            Archive Research Manuscript
          </SectionTitle>

          {hasDraftContent && (
            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-rose-300 dark:hover:border-rose-800 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              title="Reset form fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Form</span>
            </button>
          )}
        </div>

        {/* TOP SECTION: TWO COLUMNS (Upload & Metadata) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: PDF Upload & Basic Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* File Dropzone Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#7B1F35]" />
                  1. Manuscript Document (PDF)
                </h3>
                {file && (
                  <button
                    type="button"
                    onClick={handlePreviewSelectedFile}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7B1F35] dark:text-[#f8d070] hover:underline cursor-pointer"
                    title="View PDF before publishing"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>
                )}
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[220px] ${
                  isDragging
                    ? 'border-[#7B1F35] bg-[#7B1F35]/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-stone-300 dark:border-stone-700 hover:border-[#7B1F35] dark:hover:border-[#7B1F35] bg-stone-50/50 dark:bg-stone-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="application/pdf,.pdf"
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100 line-clamp-1 max-w-[260px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {pageCount ? `${pageCount} pages` : 'PDF'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewSelectedFile();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview File
                      </button>
                      <span className="text-[11px] font-semibold text-[#7B1F35] dark:text-[#f8d070] underline">
                        Change File
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 text-[#7B1F35] dark:text-[#f8d070] flex items-center justify-center shadow-sm">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                      Drop Manuscript PDF here
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 max-w-[220px]">
                      Select or drag & drop a PDF up to 50 MB
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B1F35] text-white text-[11px] font-bold rounded-full mt-2 shadow-sm">
                      Browse Computer
                    </span>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              {(isReadingPdf || isGeneratingAbstract || isExtractingKeywords) && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-3 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    {isReadingPdf
                      ? 'AI is reading the manuscript PDF...'
                      : isGeneratingAbstract
                      ? 'AI is analyzing text and generating the abstract...'
                      : 'AI is generating search keywords...'}
                  </p>
                </div>
              )}
            </Card>

            {/* Classification & Metadata Card */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7B1F35]" />
                2. Academic Classification
              </h3>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Department / Program
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Information Technology"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Research Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Academic Year Completed
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </Card>

          </div>

          {/* RIGHT COLUMN: Manuscript Details & AI Abstract/Keywords (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <Card className="p-6 space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#7B1F35]" />
                3. Research Manuscript Details
              </h3>

              {/* Research Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Research Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Archivio: A Web-Based Research Archiving and Integrity Verification System"
                  className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                />
              </div>

              {/* Authors / Student Group */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Authors / Researchers <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="e.g. Prince Japhet Vender, John Doe, Jane Smith"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                />
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                  Separate multiple student or faculty researchers with commas.
                </p>
              </div>

              {/* Abstract Area with AI Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Abstract <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateAbstract}
                    disabled={isGeneratingAbstract || (!extractedPdfText && !file)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#7B1F35] dark:text-[#f8d070] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAbstract ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAbstract ? 'Generating...' : 'Regenerate Abstract with AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Paste or let AI extract the research abstract..."
                  className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35] leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                  <span>{abstract.trim() ? `${abstract.trim().split(/\s+/).length} words` : '0 words'}</span>
                  <span>Minimum 25 characters</span>
                </div>
              </div>

              {/* Keywords with AI Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Keywords
                  </label>
                  <button
                    type="button"
                    onClick={handleExtractKeywords}
                    disabled={isExtractingKeywords || (!abstract && !file)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#7B1F35] dark:text-[#f8d070] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <Tag className={`w-3.5 h-3.5 ${isExtractingKeywords ? 'animate-spin' : ''}`} />
                    <span>{isExtractingKeywords ? 'Extracting...' : 'Extract Keywords with AI'}</span>
                  </button>
                </div>

                {/* Keyword Badges */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 text-[#7B1F35] dark:text-[#f8d070] border border-[#7B1F35]/20"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-stone-400 hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Keyword input */}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  placeholder="Type a keyword and press Enter or comma..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
                />
              </div>

              {/* Publish Action Button */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Will be published live with status: <strong>Published</strong></span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {file && (
                    <button
                      type="button"
                      onClick={handlePreviewSelectedFile}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePublishToArchive}
                    disabled={isPublishing || !file || !title.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Publish to Public Archive</span>
                  </button>
                </div>
              </div>

            </Card>

          </div>

        </div>

        {/* BOTTOM SECTION: TABLE OF PREVIOUSLY ARCHIVED PAPERS BY THIS ADVISER */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-stone-100">
                Manuscripts Uploaded & Published by You
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Legacy and departmental manuscripts you have released to the public archive. Click the eye icon to view any manuscript.
              </p>
            </div>

            {/* Table Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                placeholder="Search your uploads..."
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#7B1F35]"
              />
            </div>
          </div>

          {loadingUploads ? (
            <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
              Loading your uploaded manuscripts...
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center space-y-2">
              <BookOpen className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                No past manuscripts uploaded yet
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 max-w-sm mx-auto">
                Use the form above to upload and publish past capstone projects or research papers to the public archive.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Title & Category</th>
                    <th className="py-3 px-3">Authors</th>
                    <th className="py-3 px-3">Academic Year</th>
                    <th className="py-3 px-3">Date Published</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {filteredUploads.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-3 max-w-[280px]">
                        <p className="font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                          {item.title || item.researchTitle || 'Untitled Paper'}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-[#7B1F35] dark:text-[#f8d070] bg-[#7B1F35]/10 dark:bg-[#7B1F35]/20 px-2 py-0.5 rounded">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300 max-w-[180px] truncate">
                        {item.authors || item.studentName || 'Unknown'}
                      </td>
                      <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                        {item.academicYear || item.year || 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-stone-500 dark:text-stone-400">
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Published'}
                      </td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status="published" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* In-app Document Viewer Button */}
                          <button
                            type="button"
                            onClick={() => handleViewPastManuscript(item)}
                            className="p-1.5 text-stone-600 hover:text-[#7B1F35] hover:bg-[#7B1F35]/10 dark:text-stone-300 dark:hover:text-[#f8d070] dark:hover:bg-[#f8d070]/10 rounded-lg transition-colors cursor-pointer"
                            title="Read / View Manuscript in Portal"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Public Archive External Link */}
                          <a
                            href={`https://archivio-research-system.web.app/paper/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="Open in Public Archive Website"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Delete / Remove Action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUpload(item)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Remove from Archive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </Layout>
  );
}
