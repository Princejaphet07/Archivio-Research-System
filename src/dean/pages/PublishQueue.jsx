import React, { useState, useEffect } from 'react';
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

export default function PublishQueue({ activePage, onNavigate }) {
  const { deanData } = useUser();
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [loading, setLoading] = useState(true);
  const [queueTab, setQueueTab] = useState('ready'); // 'ready' | 'returned'
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [selectedItemForRevision, setSelectedItemForRevision] = useState(null);
  const [revisionCategory, setRevisionCategory] = useState('Formatting & Citations');
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionUrgency, setRevisionUrgency] = useState('normal');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

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
    });

    // 3. Fetch Requirements
    const unsubReqs = onSnapshot(collection(db, 'requirements'), (snapshot) => {
      setRequirements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubSubs();
      unsubGroups();
      unsubReqs();
    };
  }, [deanData]);

  // Compute Enriched Data
  const enrichedSubmissions = submissions
    .map(sub => {
      const group = groups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
      
      if (!group) return null; // Exclude submissions that don't belong to a group in this Dean's department

      // Calculate requirements completion
      const activeReqs = requirements.filter(r => 
        (r.scope === 'global' && r.status === 'approved') || 
        (r.scope === 'adviser' && r.adviserUid === group?.adviserUid && r.status === 'approved')
      );
      const uploadedCount = sub.uploadedDocs?.length || 0;
      const requiredCount = activeReqs.length;
      const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

      return {
        ...sub,
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

  // Extract counts for Status Flow
  const pendingCount = enrichedSubmissions.filter(s => s.reviewStatus === 'pending' || s.reviewStatus === 'in_progress').length;
  const approvedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'reviewed').length;
  const publishedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'published').length;
  const returnedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'dean_revision').length;

  // Items awaiting publication & returned for revision
  const awaitingPublication = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'reviewed');
  const returnedItems = enrichedSubmissions.filter(s => s.reviewStatus === 'dean_revision');
  
  // Eligible / Blocked (Though approved items should be 100%, we compute it strictly)
  const eligibleItems = awaitingPublication.filter(s => s.completionPercent === 100);
  const blockedItems = awaitingPublication.filter(s => s.completionPercent < 100);

  const eligibleCount = eligibleItems.length;
  const blockedCount = blockedItems.length;

  // Unique advisers for dropdown across awaiting and returned
  const allQueueItems = [...awaitingPublication, ...returnedItems];
  const uniqueAdvisers = ['All Advisers', ...new Set(allQueueItems.map(s => s.adviserName).filter(Boolean))];

  const filteredQueue = eligibleItems.filter(item => 
    adviserFilter === 'All Advisers' || item.adviserName === adviserFilter
  );

  const filteredReturned = returnedItems.filter(item =>
    adviserFilter === 'All Advisers' || item.adviserName === adviserFilter
  );

  const handleSimilarityCheck = async (submission) => {
    if (!submission?.abstract || submission.abstract.includes('No abstract')) {
      Swal.fire({ icon: 'error', title: 'No Abstract', text: 'This submission does not have a valid abstract to check.', confirmButtonColor: '#7B1F35' });
      return;
    }

    Swal.fire({
      title: 'Checking Similarity...',
      html: 'Scanning archive for potential duplicates...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
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
      let title = 'Safe';
      
      if (data.score >= 40 && data.score < 75) {
        icon = 'warning';
        color = '#D97706';
        title = 'Moderate Similarity';
      } else if (data.score >= 75) {
        icon = 'error';
        color = '#DC2626';
        title = 'High Risk of Duplication';
      }

      Swal.fire({
        icon,
        title,
        html: `
          <div style="font-size: 48px; font-weight: bold; color: ${color};">${data.score}%</div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 10px; color: #1A1A1A;">Most Similar Paper:</div>
          <div style="font-size: 13px; color: #666; margin-bottom: 15px; font-style: italic;">"${data.matchTitle}"</div>
          <div style="font-size: 13px; color: #444; background: #f9f9f9; padding: 10px; border-radius: 5px;">${data.analysis}</div>
        `,
        confirmButtonColor: '#7B1F35'
      });

    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Check Failed', text: 'Could not reach the AI service.', confirmButtonColor: '#7B1F35' });
    }
  };

  const handlePublish = async (item) => {
    const res = await Swal.fire({
      title: 'Publish Research?',
      text: `Are you sure you want to publish "${item.researchTitle}" to the live archive?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#c9a227',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Publish'
    });

    if (res.isConfirmed) {
      try {
        await updateDoc(doc(db, 'submissions', item.id), {
          reviewStatus: 'published',
          publishedAt: new Date().toISOString(),
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

        Swal.fire({ icon: 'success', title: 'Published!', text: 'The research is now live.', confirmButtonColor: '#c9a227' });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to publish.', confirmButtonColor: '#c9a227' });
      }
    }
  };

  const handlePreview = (item) => {
    const abstractHtml = item.abstract 
      ? `<p style="font-size: 13px; text-align: justify; color: #555; margin-top: 10px;">${item.abstract}</p>`
      : `<p style="font-size: 13px; font-style: italic; color: #999; margin-top: 10px;">No abstract provided.</p>`;
      
    Swal.fire({
      title: `<span style="font-size: 20px; font-weight: bold; color: #1a1a1a;">${item.researchTitle}</span>`,
      html: `
        <div style="text-align: left;">
          <p style="font-size: 12px; color: #7a1f3d; font-weight: bold; margin-bottom: 5px;">
            ${item.authorDisplay} • Advised by ${item.adviserName}
          </p>
          <hr style="margin: 10px 0; border-color: #eee;" />
          <div style="font-weight: bold; font-size: 13px; color: #333;">Abstract</div>
          ${abstractHtml}
        </div>
      `,
      width: 600,
      showCloseButton: true,
      confirmButtonText: 'Close',
      confirmButtonColor: '#7a1f3d',
      customClass: {
        popup: 'rounded-2xl',
      }
    });
  };

  const handleViewManuscript = (sub) => {
    const manuscriptDoc = sub.documents?.['Final Manuscript'];
    
    if (manuscriptDoc && manuscriptDoc.url && manuscriptDoc.url !== '#') {
      setViewerState({
        isOpen: true,
        url: manuscriptDoc.url,
        title: `Manuscript - ${sub.researchTitle}`
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Not Found',
        text: 'The student hasn\'t uploaded a manuscript yet.',
        confirmButtonColor: '#7a1f3d'
      });
    }
  };

  const handleOpenRevisionModal = (item) => {
    setSelectedItemForRevision(item);
    setRevisionCategory('Formatting & Citations');
    setRevisionComments(item.deanComments || '');
    setRevisionUrgency('normal');
    setRevisionModalOpen(true);
  };

  const handleSubmitRevision = async () => {
    if (!selectedItemForRevision) return;
    if (!revisionComments.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Feedback Required',
        text: 'Please specify revision feedback or instructions for the adviser.',
        confirmButtonColor: '#7a1f3d'
      });
      return;
    }

    setIsSubmittingRevision(true);
    try {
      const nowIso = new Date().toISOString();
      const deanName = deanData?.name || auth.currentUser?.displayName || 'Dean';
      const deanEmail = auth.currentUser?.email || 'Dean';

      const feedbackData = {
        comments: revisionComments.trim(),
        category: revisionCategory,
        urgency: revisionUrgency,
        timestamp: nowIso,
        deanName,
        deanEmail
      };

      await updateDoc(doc(db, 'submissions', selectedItemForRevision.id), {
        reviewStatus: 'dean_revision',
        deanFeedback: feedbackData,
        deanComments: revisionComments.trim(),
        returnedAt: nowIso,
        returnedBy: deanEmail
      });

      // Notify the Adviser in-app
      if (selectedItemForRevision.adviserUid) {
        try {
          const targetIds = new Set([selectedItemForRevision.adviserUid]);
          try {
            const advUserSnap = await getDocs(query(collection(db, 'users'), where('email', '==', selectedItemForRevision.adviserUid)));
            advUserSnap.forEach(uDoc => targetIds.add(uDoc.id));
          } catch (uErr) { /* ignore */ }

          for (const targetId of targetIds) {
            await addDoc(collection(db, 'notifications'), {
              userId: targetId,
              title: revisionUrgency === 'urgent' ? '🚨 URGENT: Dean Returned Manuscript' : '🏛️ Dean Returned Manuscript for Revision',
              message: `Dean ${deanName} returned "${selectedItemForRevision.researchTitle}" for revision. Category: ${revisionCategory}. Feedback: "${revisionComments.trim().substring(0, 90)}..."`,
              isRead: false,
              createdAt: serverTimestamp(),
              type: 'dean_revision',
              submissionId: selectedItemForRevision.id
            });
          }
        } catch (notifErr) {
          console.error('Failed to notify adviser:', notifErr);
        }

        // Send Email notification to Adviser
        try {
          await addDoc(collection(db, 'mail'), {
            to: selectedItemForRevision.adviserUid,
            message: {
              subject: `[ARCHIVIO] Dean Revision Required: ${selectedItemForRevision.researchTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                    <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Dean Review Directive</p>
                  </div>
                  <div style="padding: 30px; background-color: #ffffff;">
                    <h2 style="color: #2d3748; margin-top: 0;">Dear Adviser ${selectedItemForRevision.adviserName},</h2>
                    <p style="color: #4a5568; line-height: 1.6;">Dean <strong>${deanName}</strong> has reviewed the submitted manuscript <strong>"${selectedItemForRevision.researchTitle}"</strong> from <strong>${selectedItemForRevision.groupName}</strong> and requested revisions before public archiving.</p>
                    
                    <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0 0 6px 0; color: #7b341e; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                        Category: ${revisionCategory} ${revisionUrgency === 'urgent' ? '(Urgent)' : ''}
                      </p>
                      <p style="margin: 0; color: #2d3748; white-space: pre-wrap; font-style: italic;">"${revisionComments.trim()}"</p>
                    </div>

                    <p style="color: #4a5568; line-height: 1.6;">Please coordinate with the student group to address these items. Once revised, you can re-approve the manuscript to return it to the Dean's Publish Queue.</p>
                    
                    <p style="color: #718096; font-size: 14px; margin-top: 30px; margin-bottom: 0;">
                      Best regards,<br>
                      <strong>${deanName}</strong><br>
                      Dean's Office
                    </p>
                  </div>
                </div>
              `
            }
          });
        } catch (mailErr) {
          console.error('Failed to send mail to adviser:', mailErr);
        }
      }

      await logActivity({
        user: deanEmail,
        role: 'Dean',
        action: 'Returned research manuscript to adviser for revision',
        details: `Title: ${selectedItemForRevision.researchTitle} | Adviser: ${selectedItemForRevision.adviserName} | Category: ${revisionCategory}`,
        status: 'Success'
      });

      setRevisionModalOpen(false);
      setSelectedItemForRevision(null);

      Swal.fire({
        icon: 'success',
        title: 'Feedback Sent to Adviser',
        text: `The manuscript has been returned to ${selectedItemForRevision.adviserName} for revision.`,
        confirmButtonColor: '#7a1f3d'
      });
    } catch (err) {
      console.error('Failed to submit revision:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send revision feedback. Please try again.',
        confirmButtonColor: '#7a1f3d'
      });
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handlePublishAll = async () => {
    if (eligibleCount === 0) return;
    
    const res = await Swal.fire({
      title: `Publish All Eligible?`,
      text: `This will publish all ${eligibleCount} approved researches to the live archive.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c9a227',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Publish All'
    });

    if (res.isConfirmed) {
      try {
        const publishPromises = eligibleItems.map(item => 
          updateDoc(doc(db, 'submissions', item.id), {
            reviewStatus: 'published',
            publishedAt: new Date().toISOString(),
            researchTitle: item.researchTitle,
            groupName: item.groupName,
            adviserName: item.adviserName,
            adviserUid: item.adviserUid,
            program: item.program,
            authorDisplay: item.authorDisplay
          })
        );
        await Promise.all(publishPromises);
        
        await logActivity({
          user: auth.currentUser?.email || 'Dean',
          role: 'Dean',
          action: 'Bulk published research to public archive',
          details: `Published ${eligibleCount} researches`,
          status: 'Success'
        });

        // Notify Dean themselves for the UI Toast and Record
        await addDoc(collection(db, 'notifications'), {
          userId: auth.currentUser?.uid,
          title: "✅ Publishing Success",
          message: `Successfully published ${eligibleCount} research manuscript(s) to the Public Archive.`,
          isRead: false,
          createdAt: serverTimestamp()
        });

        // Send automated publication emails
        for (const item of eligibleItems) {
          if (item.leaderEmail) {
            try {
              await addDoc(collection(db, 'mail'), {
                to: item.leaderEmail,
                message: {
                  subject: `Congratulations! Your manuscript is now Published: ${item.researchTitle}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                      <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                        <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                      </div>
                      <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #2d3748; margin-top: 0;">Hi ${item.leaderName || 'Student'},</h2>
                        <p style="color: #4a5568; line-height: 1.6;">Great news! The status of your submission <strong>"${item.researchTitle}"</strong> has been updated to: <span style="background-color: #C6F6D5; color: #22543D; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">published</span></p>
                        <p style="color: #4a5568; line-height: 1.6;">Your research is now available in the ARCHIVIO public archive.</p>
                        
                        <p style="color: #718096; font-size: 14px; margin-top: 30px; margin-bottom: 0;">
                          Best regards,<br>
                          <strong>ARCHIVIO System</strong>
                        </p>
                      </div>
                    </div>
                  `
                }
              });
            } catch (e) {
              console.error('Failed to send publish email', e);
            }
          }
        }

        Swal.fire({ icon: 'success', title: 'Published!', text: `Successfully published ${eligibleCount} researches.`, confirmButtonColor: '#c9a227' });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to publish all items.', confirmButtonColor: '#c9a227' });
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      <Sidebar activePage="publish-queue" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="publish-queue" />

        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f0e6] dark:bg-stone-900 transition-colors">

          {/* ===== PAGE HEADER ===== */}
          <div className="flex justify-between items-start mb-6">
            <SectionTitle sub="Approved manuscripts ready for publication. 100% requirements completion required.">
              Publish Queue
            </SectionTitle>
            <PremiumButton
              onClick={handlePublishAll}
              disabled={eligibleCount === 0}
              variant="primary"
            >
              🌐 Publish All Eligible ({eligibleCount})
            </PremiumButton>
          </div>

          {/* ===== TWO-COLUMN LAYOUT ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ===== LEFT: AWAITING PUBLICATION LIST ===== */}
            <Card glass={true} className="col-span-2 overflow-hidden flex flex-col">

              {/* Card Header with Tabs */}
              <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-800 z-10 sticky top-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQueueTab('ready')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      queueTab === 'ready'
                        ? 'bg-[#7a1f3d] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    Ready to Publish ({eligibleCount})
                  </button>
                  <button
                    onClick={() => setQueueTab('returned')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      queueTab === 'returned'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>Returned for Revision</span>
                    {returnedCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        queueTab === 'returned' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      }`}>
                        {returnedCount}
                      </span>
                    )}
                  </button>
                </div>
                {/* Adviser Filter */}
                <div className="relative">
                  <select
                    value={adviserFilter}
                    onChange={(e) => setAdviserFilter(e.target.value)}
                    className="appearance-none bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 outline-none focus:ring-1 focus:ring-[#7a1f3d] focus:border-[#7a1f3d] cursor-pointer"
                  >
                    {uniqueAdvisers.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] pointer-events-none">▼</span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-stone-100 overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-4">
                    <ListSkeleton items={4} />
                  </div>
                ) : queueTab === 'returned' ? (
                  filteredReturned.length === 0 ? (
                    <div className="p-12 text-center text-stone-400 text-sm">
                      <span className="text-3xl block mb-2">📋</span>
                      No manuscripts currently returned for revision.
                    </div>
                  ) : (
                    filteredReturned.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700 border-l-4 border-l-amber-500 bg-amber-50/15"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                ⚠️ In Revision with Adviser
                              </span>
                              {item.deanFeedback?.category && (
                                <span className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  {item.deanFeedback.category}
                                </span>
                              )}
                              {item.deanFeedback?.urgency === 'urgent' && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  🚨 Urgent
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{item.researchTitle}</h3>
                            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                              {item.groupName} · Assigned to Adviser: <strong className="text-[#7a1f3d] dark:text-[#f8d070]">{item.adviserName}</strong> · Returned: {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <PremiumButton 
                              onClick={() => handleViewManuscript(item)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Doc
                            </PremiumButton>
                            <PremiumButton 
                              onClick={() => handleOpenRevisionModal(item)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                            >
                              ✏️ Update Feedback
                            </PremiumButton>
                          </div>
                        </div>

                        {/* Feedback preview callout */}
                        {item.deanComments && (
                          <div className="bg-white/80 dark:bg-stone-800/80 rounded-lg p-3 border border-amber-200/80 dark:border-amber-800/40 text-xs">
                            <p className="font-bold text-amber-900 dark:text-amber-200 mb-0.5 text-[11px] uppercase tracking-wider">
                              Your Revision Feedback:
                            </p>
                            <p className="text-stone-700 dark:text-stone-200 italic line-clamp-2">
                              "{item.deanComments}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )
                ) : filteredQueue.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-sm">No eligible submissions awaiting publication.</div>
                ) : (
                  filteredQueue.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 transition-colors hover:bg-stone-50 dark:hover:bg-stone-700
                        ${item.isSelf ? 'border-l-4 border-l-[#f8d070] bg-amber-50/20' : ''}`}
                    >
                      {/* File Icon */}
                      <div className="hidden sm:flex w-10 h-12 bg-stone-100 dark:bg-stone-800/80 rounded-lg items-center justify-center shrink-0 border border-stone-200 dark:border-stone-700">
                        <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{item.researchTitle}</h3>
                        <p className={`text-[11px] font-medium mt-0.5 ${item.isSelf ? 'text-[#7a1f3d] dark:text-[#f8d070]' : 'text-stone-400'}`}>
                          {item.groupName} · {item.adviserName}{item.isSelf && ' (You)'} · Approved {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Approved
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {item.completionPercent}% Requirements Complete
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <PremiumButton 
                          onClick={() => handleSimilarityCheck(item)}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          AI Scan
                        </PremiumButton>
                        <PremiumButton 
                          onClick={() => handlePreview(item)}
                          variant="ghost"
                          size="sm"
                        >
                          Abstract
                        </PremiumButton>
                        <PremiumButton 
                          onClick={() => handleViewManuscript(item)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Doc
                        </PremiumButton>
                        <PremiumButton 
                          onClick={() => handleOpenRevisionModal(item)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5 border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Send feedback and return manuscript to adviser for revision"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Request Revision
                        </PremiumButton>
                        <PremiumButton
                          onClick={() => handlePublish(item)}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-1.5"
                        >
                          🌐 Publish
                        </PremiumButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="flex flex-col gap-5">

              {/* Status Flow Card */}
              <Card glass={true} className="p-6">
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Status Flow</h2>
                <p className="text-[11px] text-stone-400 mt-0.5 mb-5">Workflow stages</p>

                <div className="space-y-1">

                  {/* Pending */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Pending</p>
                      <p className="text-[10px] text-stone-400">Reviewed by Adviser</p>
                    </div>
                    <span className="text-sm font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">{pendingCount}</span>
                  </div>

                  {/* Arrow down */}
                  <div className="flex pl-3">
                    <div className="w-8 flex justify-center py-1">
                      <svg className="w-6 h-6 text-[#90737a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-5-5m5 5l5-5" />
                      </svg>
                    </div>
                  </div>

                  {/* Approved */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Approved</p>
                      <p className="text-[10px] text-stone-400">Approved by Adviser</p>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">{approvedCount}</span>
                  </div>

                  {/* Arrow down */}
                  <div className="flex pl-3">
                    <div className="w-8 flex justify-center py-1">
                      <svg className="w-6 h-6 text-[#90737a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-5-5m5 5l5-5" />
                      </svg>
                    </div>
                  </div>

                  {/* Published */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014.5 9 15.3 15.3 0 01-4.5 9 15.3 15.3 0 01-4.5-9A15.3 15.3 0 0112 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">Published <span className="font-normal text-stone-400">(Live in Archive)</span></p>
                      <p className="text-[10px] text-stone-400">Reviewed &amp; Approved by Dean</p>
                    </div>
                    <span className="text-sm font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">{publishedCount}</span>
                  </div>
                </div>

                {/* Warning note */}
                <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-amber-500 text-sm">⚠</span>
                  <p className="text-[10px] font-bold text-amber-700">100% completion required to publish</p>
                </div>
              </Card>

              {/* Publish Summary Card */}
              <Card glass={true} className="p-6">
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-4">Publish Summary</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Eligible (100% complete)</span>
                    <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">{eligibleCount}</span>
                  </div>
                  <div className="h-px bg-stone-100 dark:bg-stone-800/80"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Blocked (incomplete)</span>
                    <span className="text-sm font-extrabold text-red-600">{blockedCount}</span>
                  </div>
                </div>

                <PremiumButton
                  onClick={handlePublishAll}
                  disabled={eligibleCount === 0}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                >
                  🌐 Publish {eligibleCount} Eligible Papers
                </PremiumButton>
              </Card>

            </div>
          </div>

        </main>
      </div>

      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ isOpen: false, url: '', title: '' })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
      />

      {/* ===== DEAN REVISION & FEEDBACK MODAL ===== */}
      {revisionModalOpen && selectedItemForRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#7a1f3d] to-[#541529] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  ✍️
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-wide">Request Manuscript Revision</h3>
                  <p className="text-xs text-stone-200">Provide direct feedback to Adviser & Research Group</p>
                </div>
              </div>
              <button
                onClick={() => setRevisionModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-stone-200 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Manuscript Info Pill */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700/60">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Target Manuscript</p>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-2 mt-0.5">
                  {selectedItemForRevision.researchTitle}
                </h4>
                <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-2">
                  <span>👥 <strong>{selectedItemForRevision.groupName}</strong></span>
                  <span>•</span>
                  <span>👨‍🏫 Adviser: <strong className="text-[#7a1f3d] dark:text-[#f8d070]">{selectedItemForRevision.adviserName}</strong></span>
                </div>
              </div>

              {/* Feedback Category */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Revision Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Formatting & Citations',
                    'Plagiarism & Similarity',
                    'Methodology & Content',
                    'Incomplete Sections',
                    'Grammar & Syntax',
                    'General Dean Directive'
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRevisionCategory(cat)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                        revisionCategory === cat
                          ? 'bg-[#7a1f3d]/10 border-[#7a1f3d] text-[#7a1f3d] dark:bg-[#f8d070]/10 dark:border-[#f8d070] dark:text-[#f8d070] font-bold'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency Level */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Priority:
                </span>
                <label className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="normal"
                    checked={revisionUrgency === 'normal'}
                    onChange={() => setRevisionUrgency('normal')}
                    className="accent-[#7a1f3d]"
                  />
                  <span>Standard Revision</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="urgent"
                    checked={revisionUrgency === 'urgent'}
                    onChange={() => setRevisionUrgency('urgent')}
                    className="accent-amber-600"
                  />
                  <span>🚨 Urgent Attention</span>
                </label>
              </div>

              {/* Feedback Instructions */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                  Detailed Feedback & Required Corrections <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={revisionComments}
                  onChange={(e) => setRevisionComments(e.target.value)}
                  placeholder="Specify exact chapters, pages, or guidelines that need revision before this manuscript can be approved for public archive publication..."
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl p-3 text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d] transition-all resize-none font-sans"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  This note will be delivered immediately to {selectedItemForRevision.adviserName} and reflected in the student group timeline.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                disabled={isSubmittingRevision}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                disabled={isSubmittingRevision}
                className="px-5 py-2 text-xs font-bold bg-[#7a1f3d] hover:bg-[#5a162d] text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingRevision ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Sending Feedback...
                  </>
                ) : (
                  <>
                    <span>📤</span> Send Feedback & Return
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
