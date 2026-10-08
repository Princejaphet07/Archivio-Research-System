import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import { useUser } from '../context/UserContext';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import CertificateModal from '../../components/CertificateModal';
import { getBackendUrl } from '../../utils/backendUrl';

// New High-Grade UI/UX Components
import UndoPublishBanner from '../components/UndoPublishBanner';
import PublishConfirmationModal from '../components/PublishConfirmationModal';
import RevisionDirectiveModal from '../components/RevisionDirectiveModal';
import ExecutivePaperRow from '../components/ExecutivePaperRow';

import { 
  Globe, 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Eye, 
  Award, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function PublishQueue({ activePage, onNavigate }) {
  const { deanData } = useUser();
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [queueTab, setQueueTab] = useState('ready'); // 'ready' | 'returned' | 'published'

  // Modals & Banner state
  const [publishModalItem, setPublishModalItem] = useState(null);
  const [revisionModalItem, setRevisionModalItem] = useState(null);
  const [certModalItem, setCertModalItem] = useState(null);
  const [pendingUndoItem, setPendingUndoItem] = useState(null);

  // Undo publication timer ref
  const undoTimeoutRef = useRef(null);

  const [viewerState, setViewerState] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  useEffect(() => {
    if (!deanData) return;
    const deanDept = deanData.department || '';

    // 1. Fetch Submissions
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(all);
    }, (err) => {
      console.warn('PublishQueue submissions listener notice:', err.message);
    });

    // 2. Fetch Groups — filter by department (robust partial match)
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const deptLower = deanDept.toLowerCase();
      setGroups(all.filter(g => {
        const gDept = (g.department || '').toLowerCase();
        const gProg = (g.program || '').toLowerCase();
        return gDept.includes(deptLower) || deptLower.includes(gDept) ||
               gProg.includes(deptLower) || deptLower.includes(gProg);
      }));
    }, (err) => {
      console.warn('PublishQueue groups listener notice:', err.message);
    });

    // 3. Fetch Requirements
    const unsubReqs = onSnapshot(collection(db, 'requirements'), (snapshot) => {
      setRequirements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('PublishQueue requirements listener notice:', err.message);
      setLoading(false);
    });

    return () => {
      unsubSubs();
      unsubGroups();
      unsubReqs();
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, [deanData]);

  // Compute Enriched Data
  const enrichedSubmissions = submissions
    .map(sub => {
      const group = groups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
      if (!group) return null;

      const activeReqs = requirements.filter(r => 
        (r.scope === 'global' && r.status === 'approved') || 
        (r.scope === 'adviser' && r.adviserUid === group?.adviserUid && r.status === 'approved')
      );
      const uploadedCount = sub.uploadedDocs?.length || 0;
      const requiredCount = activeReqs.length;
      const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

      return {
        ...sub,
        group,
        groupName: group?.groupName || sub.groupName || 'Unknown Group',
        researchTitle: group?.researchTitle || sub.title || 'Untitled',
        adviserName: group?.adviserName || 'Unknown Adviser',
        adviserUid: group?.adviserUid || '',
        program: group?.program || sub.program || '',
        leaderEmail: group?.leaderEmail || sub.leaderEmail || '',
        leaderName: group?.leaderName || sub.studentName || '',
        authorDisplay: group
          ? `${group.leaderName}${group.members && group.members.length > 0 ? ` & ${group.members.length} other(s)` : ''}`
          : sub.studentName || 'Unknown Author',
        completionPercent,
        reviewStatus: sub.reviewStatus || 'in_progress',
        isSelf: group?.adviserUid === auth.currentUser?.email
      };
    })
    .filter(Boolean);

  // Status Counts
  const pendingCount = enrichedSubmissions.filter(s => s.reviewStatus === 'pending' || s.reviewStatus === 'in_progress').length;
  const approvedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'reviewed').length;
  const publishedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'published').length;
  const returnedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'dean_revision').length;

  const awaitingPublication = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'reviewed');
  const returnedItems = enrichedSubmissions.filter(s => s.reviewStatus === 'dean_revision');
  const publishedItems = enrichedSubmissions.filter(s => s.reviewStatus === 'published');

  const eligibleItems = awaitingPublication.filter(s => s.completionPercent === 100);
  const eligibleCount = eligibleItems.length;

  // Unique Advisers List
  const allQueueItems = [...awaitingPublication, ...returnedItems, ...publishedItems];
  const uniqueAdvisers = ['All Advisers', ...new Set(allQueueItems.map(s => s.adviserName).filter(Boolean))];

  // Filtering function
  const filterBySearchAndAdviser = (list) => {
    return list.filter(item => {
      const matchesAdv = adviserFilter === 'All Advisers' || item.adviserName === adviserFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.researchTitle || '').toLowerCase().includes(q) ||
        (item.groupName || '').toLowerCase().includes(q) ||
        (item.authorDisplay || '').toLowerCase().includes(q) ||
        (item.adviserName || '').toLowerCase().includes(q);
      return matchesAdv && matchesSearch;
    });
  };

  const filteredQueue = filterBySearchAndAdviser(eligibleItems);
  const filteredReturned = filterBySearchAndAdviser(returnedItems);
  const filteredPublished = filterBySearchAndAdviser(publishedItems);

  // Similarity Check Handler
  const handleSimilarityCheck = async (submission) => {
    if (!submission?.abstract || submission.abstract.includes('No abstract')) {
      Swal.fire({ 
        icon: 'error', 
        title: 'No Abstract Found', 
        text: 'This submission does not contain text abstract metadata to scan.', 
        confirmButtonColor: '#7B1F35' 
      });
      return;
    }

    Swal.fire({
      title: 'Scanning Originality...',
      html: 'Evaluating manuscript abstract against archived repository...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/ai/similarity-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          submissionId: submission.id,
          title: submission.researchTitle || submission.title || 'Untitled', 
          abstract: submission.abstract 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan');

      let icon = 'success';
      let color = '#1E8E3E';
      let title = 'Safe Originality';
      
      if (data.score >= 40 && data.score < 75) {
        icon = 'warning';
        color = '#D97706';
        title = 'Moderate Similarity';
      } else if (data.score >= 75) {
        icon = 'error';
        color = '#DC2626';
        title = 'High Duplication Risk';
      }

      Swal.fire({
        icon,
        title,
        html: `
          <div style="font-size: 44px; font-weight: bold; color: ${color};">${data.score}%</div>
          <div style="font-size: 13px; font-weight: bold; margin-top: 8px; color: #1A1A1A;">Top Match:</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 12px; font-style: italic;">"${data.matchTitle}"</div>
          <div style="font-size: 12px; color: #444; background: #f8f9fa; padding: 12px; border-radius: 8px; line-height: 1.5; text-align: left;">${data.analysis}</div>
        `,
        confirmButtonColor: '#7B1F35'
      });

    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Check Failed', text: 'Could not connect to AI originality service.', confirmButtonColor: '#7B1F35' });
    }
  };

  // Notification Dispatcher
  const notifyStudentsPublished = async (item) => {
    try {
      const recipientUids = new Set();
      if (item.studentUid) recipientUids.add(item.studentUid);
      if (item.leaderUid) recipientUids.add(item.leaderUid);

      const group = groups.find(g => 
        (item.studentUid && g.leaderUid === item.studentUid) ||
        (item.leaderEmail && g.leaderEmail === item.leaderEmail) ||
        (item.groupName && g.groupName === item.groupName)
      );

      if (group) {
        if (group.leaderUid) recipientUids.add(group.leaderUid);
        if (Array.isArray(group.members)) {
          for (const member of group.members) {
            if (typeof member === 'object' && member !== null) {
              if (member.uid) recipientUids.add(member.uid);
              else if (member.id) recipientUids.add(member.id);
            }
          }
        }
      }

      const paperTitle = item.researchTitle || item.title || 'Research Paper';

      for (const uid of recipientUids) {
        await addDoc(collection(db, 'notifications'), {
          userId: uid,
          title: 'Research Paper Published! 🎉',
          message: `Congratulations! Your manuscript "${paperTitle}" is now live in the ARCHIVIO public archive.`,
          type: 'publication',
          link: 'manuscript',
          submissionId: item.id,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      if (item.leaderEmail) {
        try {
          await addDoc(collection(db, 'mail'), {
            to: item.leaderEmail,
            message: {
              subject: `Congratulations! Your manuscript is now Published: ${paperTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                    <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                  </div>
                  <div style="padding: 30px; background-color: #ffffff;">
                    <h2 style="color: #2d3748; margin-top: 0;">Hi ${item.leaderName || 'Student'},</h2>
                    <p style="color: #4a5568; line-height: 1.6;">Great news! Your research paper <strong>"${paperTitle}"</strong> has been approved by the Dean and is now officially published in the ARCHIVIO live public archive.</p>
                    <p style="color: #718096; font-size: 14px; margin-top: 30px; margin-bottom: 0;">Best regards,<br><strong>ARCHIVIO Dean's Office</strong></p>
                  </div>
                </div>
              `
            }
          });
        } catch (mailErr) {
          console.error('Failed to dispatch publication email:', mailErr);
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify students of publication:', notifErr);
    }
  };

  // High-Stakes Publish Workflow with Grace Period (#5 Feedback & #6 Error Prevention)
  const handleConfirmPublish = async (item) => {
    try {
      const nowIso = new Date().toISOString();

      await updateDoc(doc(db, 'submissions', item.id), {
        reviewStatus: 'published',
        publishedAt: nowIso,
        researchTitle: item.researchTitle,
        groupName: item.groupName,
        adviserName: item.adviserName,
        adviserUid: item.adviserUid,
        program: item.program,
        authorDisplay: item.authorDisplay
      });

      await logActivity({
        user: auth.currentUser?.email || 'Dean',
        role: 'Dean',
        action: 'Published research to public archive',
        details: `Title: ${item.researchTitle}`,
        status: 'Success'
      });

      // Activate 15-second Undo Grace Period Banner
      setPendingUndoItem(item);

      // Schedule final student notification dispatch after 15 seconds
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(async () => {
        await notifyStudentsPublished(item);
        setPendingUndoItem(null);
      }, 15000);

    } catch (err) {
      console.error('Error publishing research:', err);
      Swal.fire({ icon: 'error', title: 'Publication Error', text: 'Could not complete publication.', confirmButtonColor: '#7B1F35' });
    }
  };

  // Undo Publish Action
  const handleUndoPublish = async (item) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    try {
      await updateDoc(doc(db, 'submissions', item.id), {
        reviewStatus: 'approved',
        publishedAt: null
      });

      await logActivity({
        user: auth.currentUser?.email || 'Dean',
        role: 'Dean',
        action: 'Reverted publication (Undo)',
        details: `Title: ${item.researchTitle}`,
        status: 'Success'
      });

      setPendingUndoItem(null);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Publication Undone',
        text: 'The paper has been returned to the publish queue.',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err) {
      console.error('Failed to undo publish:', err);
      Swal.fire({ icon: 'error', title: 'Rollback Failed', text: 'Could not revert publication status.', confirmButtonColor: '#7B1F35' });
    }
  };

  // Submit Revision Directive
  const handleSubmitRevision = async ({ item, category, comments, urgency }) => {
    const nowIso = new Date().toISOString();
    const deanName = deanData?.name || auth.currentUser?.displayName || 'Dean';
    const deanEmail = auth.currentUser?.email || 'Dean';

    const feedbackData = {
      comments,
      category,
      urgency,
      timestamp: nowIso,
      deanName,
      deanEmail
    };

    await updateDoc(doc(db, 'submissions', item.id), {
      reviewStatus: 'dean_revision',
      deanFeedback: feedbackData,
      deanComments: comments,
      returnedAt: nowIso,
      returnedBy: deanEmail
    });

    // Notify Adviser
    if (item.adviserUid) {
      try {
        const targetIds = new Set([item.adviserUid]);
        try {
          const advUserSnap = await getDocs(query(collection(db, 'users'), where('email', '==', item.adviserUid)));
          advUserSnap.forEach(uDoc => targetIds.add(uDoc.id));
        } catch (uErr) { /* ignore */ }

        for (const targetId of targetIds) {
          await addDoc(collection(db, 'notifications'), {
            userId: targetId,
            title: urgency === 'urgent' ? '🚨 URGENT: Dean Returned Manuscript' : '🏛️ Dean Returned Manuscript for Revision',
            message: `Dean ${deanName} requested revisions for "${item.researchTitle}". Category: ${category}.`,
            isRead: false,
            createdAt: serverTimestamp(),
            type: 'dean_revision',
            submissionId: item.id
          });
        }
      } catch (notifErr) {
        console.error('Failed to notify adviser of revision:', notifErr);
      }
    }

    await logActivity({
      user: deanEmail,
      role: 'Dean',
      action: 'Returned manuscript for revision',
      details: `Title: ${item.researchTitle} | Category: ${category}`,
      status: 'Success'
    });

    Swal.fire({
      icon: 'success',
      title: 'Revision Directive Dispatched',
      text: `Adviser ${item.adviserName} has been notified with your instructions.`,
      confirmButtonColor: '#7B1F35'
    });
  };

  // View Manuscript PDF Helper
  const handleViewManuscript = (sub) => {
    const manuscriptDoc = sub.documents?.['Final Manuscript'];
    if (manuscriptDoc && manuscriptDoc.url && manuscriptDoc.url !== '#') {
      setViewerState({
        isOpen: true,
        url: manuscriptDoc.url,
        title: `Manuscript - ${sub.researchTitle || sub.title}`
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Document Unavailable',
        text: 'The student manuscript PDF file could not be located in this record.',
        confirmButtonColor: '#7B1F35'
      });
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#fbfbfa] dark:bg-stone-950 transition-colors overflow-hidden font-sans antialiased text-stone-900 dark:text-stone-100">
      <Sidebar activePage="publish-queue" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="publish-queue" />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

          {/* ===== SECTION HEADER (#1 User-Centric Design) ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <SectionTitle sub="Evaluate adviser-endorsed capstone manuscripts and release qualified research to the Public Archive.">
                Publish Queue & Evaluation
              </SectionTitle>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {eligibleCount} Ready for Release
              </span>
            </div>
          </div>

          {/* ===== SEARCH & FILTER BAR (#3 Simplicity & #4 Accessibility) ===== */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search manuscripts by title, author, group, or adviser..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-[#7B1F35]/40 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Adviser Filter Facet */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={adviserFilter}
                onChange={(e) => setAdviserFilter(e.target.value)}
                className="text-xs py-2 pl-3 pr-8 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-[#7B1F35]/40 cursor-pointer"
              >
                {uniqueAdvisers.map(adv => (
                  <option key={adv} value={adv}>{adv}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== TAB SEGMENTED NAVIGATION (#2 Consistency) ===== */}
          <div className="flex items-center gap-2 border-b border-stone-200/70 dark:border-stone-800 pb-1">
            <button
              onClick={() => setQueueTab('ready')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                queueTab === 'ready'
                  ? 'bg-[#7B1F35] text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <span>Ready to Publish</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${queueTab === 'ready' ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                {eligibleCount}
              </span>
            </button>

            <button
              onClick={() => setQueueTab('returned')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                queueTab === 'returned'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <span>Returned for Revision</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${queueTab === 'returned' ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                {returnedCount}
              </span>
            </button>

            <button
              onClick={() => setQueueTab('published')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                queueTab === 'published'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <span>Published Archive</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${queueTab === 'published' ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'}`}>
                {publishedCount}
              </span>
            </button>
          </div>

          {/* ===== LIST VIEW & PROGRESSIVE DISCLOSURE ===== */}
          <div>
            {loading ? (
              <ListSkeleton items={4} />
            ) : queueTab === 'ready' ? (
              filteredQueue.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                    Queue is Clear
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    There are currently no endorsed papers awaiting publication matching your active filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueue.map((item) => (
                    <ExecutivePaperRow
                      key={item.id}
                      item={item}
                      onPublish={(paper) => setPublishModalItem(paper)}
                      onRequestRevision={(paper) => setRevisionModalItem(paper)}
                      onViewPdf={handleViewManuscript}
                      onCheckSimilarity={handleSimilarityCheck}
                    />
                  ))}
                </div>
              )
            ) : queueTab === 'returned' ? (
              filteredReturned.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                    No Manuscripts Under Revision
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    All papers are either approved or in active review with advisers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReturned.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-white dark:bg-stone-900 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              ⚠️ Under Revision with Adviser
                            </span>
                            {item.deanFeedback?.category && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                {item.deanFeedback.category}
                              </span>
                            )}
                            {item.deanFeedback?.urgency === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                🚨 Urgent
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                            {item.researchTitle}
                          </h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Group: <strong className="text-stone-700 dark:text-stone-300">{item.groupName}</strong> · Adviser: <strong className="text-stone-700 dark:text-stone-300">{item.adviserName}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewManuscript(item)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                          >
                            View Doc
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevisionModalItem(item)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300/80 dark:border-amber-700 transition"
                          >
                            Update Directives
                          </button>
                        </div>
                      </div>

                      {item.deanComments && (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-800/30 text-xs">
                          <span className="font-bold text-[10px] uppercase text-amber-800 dark:text-amber-300 block mb-0.5">
                            Dean's Revision Directives:
                          </span>
                          <p className="text-stone-700 dark:text-stone-300 italic">
                            "{item.deanComments}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredPublished.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                    No Published Research
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    Approved manuscripts that have been published to the repository will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPublished.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-white dark:bg-stone-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            ✓ Live in Public Archive
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            ARCH-SWU-{item.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                          {item.researchTitle}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {item.authorDisplay || item.leaderName} · Advised by {item.adviserName} · Published {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Active'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCertModalItem(item)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c9a227] hover:bg-[#b08d1e] text-stone-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Certificate</span>
                        </button>
                        <a
                          href={`/verify/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

        </main>
      </div>

      {/* ===== 15-SECOND UNDO PUBLISH BANNER (#5 Feedback & #6 Error Prevention) ===== */}
      <UndoPublishBanner
        publishedItem={pendingUndoItem}
        onUndo={handleUndoPublish}
        onDismiss={() => {
          if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
          if (pendingUndoItem) notifyStudentsPublished(pendingUndoItem);
          setPendingUndoItem(null);
        }}
        duration={15}
      />

      {/* ===== PRE-FLIGHT PUBLISH CONFIRMATION MODAL (#6 Error Prevention) ===== */}
      <PublishConfirmationModal
        isOpen={!!publishModalItem}
        item={publishModalItem}
        onClose={() => setPublishModalItem(null)}
        onConfirmPublish={handleConfirmPublish}
      />

      {/* ===== REVISION DIRECTIVE MODAL (#6 Error Prevention & #7 Affordance) ===== */}
      <RevisionDirectiveModal
        isOpen={!!revisionModalItem}
        item={revisionModalItem}
        onClose={() => setRevisionModalItem(null)}
        onSubmitRevision={handleSubmitRevision}
      />

      {/* ===== INLINE DOCUMENT VIEWER MODAL ===== */}
      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ isOpen: false, url: '', title: '' })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
      />

      {/* ===== CERTIFICATE MODAL ===== */}
      <CertificateModal
        isOpen={!!certModalItem}
        onClose={() => setCertModalItem(null)}
        submission={certModalItem}
      />
    </div>
  );
}
