import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { authFetch } from '../../utils/authFetch';
import { getBackendUrl } from '../../utils/backendUrl';
import CertificateModal from '../../components/CertificateModal';
import { validateSubmissionReadiness } from '../utils/approvalGating';
import RequirementIcon from '../components/RequirementIcon';
import { 
  Clock, 
  AlertCircle, 
  Award, 
  Landmark, 
  FolderKanban, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  User, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  X,
  Check
} from 'lucide-react';

function ReviewSubmissions() {
  const location = useLocation();
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Document Viewer State
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  const getInitialTab = () => {
    const raw = location.state?.activeTab;
    if (raw === 'approved' || raw === 'published') return 'approved';
    if (raw === 'dean_revision' || raw === 'revision' || raw === 'revisions') return 'revisions';
    return 'needs_review';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [revisionFilter, setRevisionFilter] = useState('all'); // 'all' | 'dean' | 'adviser'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState(location.state?.filterGroup || 'All Groups');
  const [filterYear, setFilterYear] = useState('All Year');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgStatus, setMsgStatus] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [certModalItem, setCertModalItem] = useState(null);
  const BACKEND_URL = getBackendUrl();

  // Fetch real data from Firebase
  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) { setLoading(false); return; }

    // 1. Listen to approved groups for this adviser
    const groupsQuery = query(
      collection(db, 'groups'),
      where('adviserUid', '==', email),
      where('status', '==', 'approved')
    );

    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      const groupList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupList);
    });

    // 2. Listen to all submissions
    const submissionsQuery = query(collection(db, 'submissions'));
    const unsubSubs = onSnapshot(submissionsQuery, (snapshot) => {
      const allSubs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(allSubs);
    });

    // 3. Listen to requirements
    const reqQuery = query(collection(db, 'requirements'));
    const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeReqs = allReqs.filter(r => 
        (r.scope === 'global' && r.status === 'approved') || 
        (r.scope === 'adviser' && r.adviserUid === email && r.status === 'approved')
      );
      setRequirements(activeReqs);
      setLoading(false);
    });

    return () => {
      unsubGroups();
      unsubSubs();
      unsubReqs();
    };
  }, []);

  useEffect(() => {
    if (location.state?.filterGroup) {
      setFilterGroup(location.state.filterGroup);
    }
    if (location.state?.activeTab) {
      const raw = location.state.activeTab;
      if (raw === 'approved' || raw === 'published') setActiveTab('approved');
      else if (raw === 'dean_revision' || raw === 'revision' || raw === 'revisions') setActiveTab('revisions');
      else setActiveTab('needs_review');
    }
  }, [location.state]);

  // Enrich submissions with group data (only include groups that have actually uploaded files or requirements)
  // When students upload requirements, they will appear here and route directly to needs_review tab
  const enrichedSubmissions = groups.map(group => {
    const sub = submissions.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || s.title === group.researchTitle || s.researchTitle === group.researchTitle)) || {};
    const uploadedDocs = Array.isArray(sub.uploadedDocs) ? sub.uploadedDocs : [];
    const docKeys = sub.documents && typeof sub.documents === 'object' ? Object.keys(sub.documents) : [];
    const uploadedCount = Math.max(uploadedDocs.length, docKeys.length, (sub.manuscriptUrl || sub.fileUrl ? 1 : 0));
    const requiredCount = requirements.length;
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

    return {
      ...sub,
      id: sub.id || group.id,
      groupName: group.groupName || 'Unknown Group',
      researchTitle: group.researchTitle || 'Untitled',
      leaderName: group.leaderName || 'Unknown',
      leaderEmail: group.leaderEmail || '',
      program: group.program || '',
      members: group.members || [],
      studentUid: group.leaderUid, // Ensure this exists for messages
      submittedDate: sub.createdAt || sub.updatedAt || group.createdAt || group.approvedAt || '',
      completionPercent,
      uploadedCount,
      requiredCount,
      reviewStatus: sub.reviewStatus || 'pending',
    };
  }).filter(sub => sub.uploadedCount > 0);

  // Tab counts based on academic lifecycle
  const needsReviewCount = enrichedSubmissions.filter(s => 
    s.reviewStatus !== 'approved' && 
    s.reviewStatus !== 'published' && 
    s.reviewStatus !== 'revision' && 
    s.reviewStatus !== 'dean_revision'
  ).length;
  const revisionsCount = enrichedSubmissions.filter(s => s.reviewStatus === 'revision' || s.reviewStatus === 'dean_revision').length;
  const deanRevisionCount = enrichedSubmissions.filter(s => s.reviewStatus === 'dean_revision').length;
  const adviserRevisionCount = enrichedSubmissions.filter(s => s.reviewStatus === 'revision').length;
  const approvedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'published').length;

  // Filter by tab
  const filteredByTab = enrichedSubmissions.filter(sub => {
    if (activeTab === 'needs_review') {
      return (
        sub.reviewStatus !== 'approved' && 
        sub.reviewStatus !== 'published' && 
        sub.reviewStatus !== 'revision' && 
        sub.reviewStatus !== 'dean_revision'
      );
    }
    if (activeTab === 'revisions') {
      if (revisionFilter === 'dean') return sub.reviewStatus === 'dean_revision';
      if (revisionFilter === 'adviser') return sub.reviewStatus === 'revision';
      return sub.reviewStatus === 'revision' || sub.reviewStatus === 'dean_revision';
    }
    if (activeTab === 'approved') {
      return sub.reviewStatus === 'approved' || sub.reviewStatus === 'published';
    }
    return true;
  });

  // Filter by search
  const filteredBySearch = filteredByTab.filter(sub => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      sub.researchTitle?.toLowerCase().includes(q) ||
      sub.groupName?.toLowerCase().includes(q) ||
      sub.leaderName?.toLowerCase().includes(q)
    );
  });

  // Filter by group dropdown
  const filteredByGroup = filteredBySearch.filter(sub => {
    if (filterGroup === 'All Groups') return true;
    return sub.groupName === filterGroup;
  });

  // Filter by year
  const finalFiltered = filteredByGroup.filter(sub => {
    if (filterYear === 'All Year') return true;
    const dateStr = sub.submittedDate || sub.createdAt || '';
    const dateObj = new Date(dateStr);
    const year = isNaN(dateObj.getTime()) ? '' : dateObj.getFullYear().toString();
    return year === filterYear;
  });

  // Available group names for filter
  const uniqueGroups = [...new Set(enrichedSubmissions.map(s => s.groupName))];
  const uniqueYears = [...new Set(enrichedSubmissions.map(s => {
    const d = new Date(s.submittedDate);
    return isNaN(d.getTime()) ? '' : d.getFullYear().toString();
  }).filter(Boolean))];

  // Handle AI Summarize
  const handleSimilarityCheck = async (submission) => {
    if (!submission?.abstract || submission.abstract.includes('No abstract')) {
      Swal.fire({ icon: 'error', title: 'No Abstract', text: 'This submission does not have a valid abstract to check.', confirmButtonColor: '#770000' });
      return;
    }

    Swal.fire({
      title: 'Checking Similarity...',
      html: 'Scanning archive for potential duplicates...',
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
        confirmButtonColor: '#770000'
      });

    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Check Failed', text: 'Could not reach the AI service.', confirmButtonColor: '#770000' });
    }
  };

  const handleGenerateAISummary = async (submission) => {
    // Smart Cache: if AI summary is already generated and saved in Firestore, show it instantly!
    if (submission?.aiSummary) {
      setSelectedSubmission({ ...submission });
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Loaded Cached Summary', showConfirmButton: false, timer: 1500 });
      return;
    }

    let pdfUrl = '';
    if (submission.documents) {
       for (const key of Object.keys(submission.documents)) {
         const d = submission.documents[key];
         if (d && d.url && d.url !== '#' && typeof d.name === 'string' && d.name.toLowerCase().endsWith('.pdf')) {
           pdfUrl = d.url;
           break; // Find the first PDF
         }
       }
    }

    if (!pdfUrl) {
      Swal.fire('No PDF found', 'The student has not uploaded a valid PDF manuscript to summarize.', 'warning');
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/summarize-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate summary');

      await updateDoc(doc(db, 'submissions', submission.id), {
        aiSummary: data
      });

      setSelectedSubmission({ ...submission, aiSummary: data });
      setSubmissions(submissions.map(sub => sub.id === submission.id ? { ...sub, aiSummary: data } : sub));
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Summary Generated!', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle Approve / Endorsement action with Strict Linear Gating
  const handleApprove = async (sub) => {
    // 1. Strict Linear Gating Check
    const readiness = validateSubmissionReadiness(sub, requirements);
    if (!readiness.isReady) {
      const unapprovedListHtml = readiness.unapprovedDocs.length > 0
        ? `<div style="text-align: left; background: #fff5f5; border: 1px solid #fed7d7; padding: 12px; border-radius: 8px; margin: 10px 0;">
             <p style="font-weight: bold; color: #9b2c2c; margin: 0 0 6px 0; font-size: 13px;">Unverified Documents (${readiness.unapprovedDocs.length}):</p>
             <ul style="margin: 0; padding-left: 20px; color: #742a2a; font-size: 12px; line-height: 1.5;">
               ${readiness.unapprovedDocs.map(d => `<li>${d} <span style="color: #c53030; font-weight: 600;">(Needs check in Document Viewer)</span></li>`).join('')}
             </ul>
           </div>`
        : '';

      const missingListHtml = readiness.missingDocs.length > 0
        ? `<div style="text-align: left; background: #fffaf0; border: 1px solid #feebc8; padding: 12px; border-radius: 8px; margin: 10px 0;">
             <p style="font-weight: bold; color: #9c4221; margin: 0 0 6px 0; font-size: 13px;">Missing Requirements (${readiness.missingDocs.length}):</p>
             <ul style="margin: 0; padding-left: 20px; color: #7b341e; font-size: 12px; line-height: 1.5;">
               ${readiness.missingDocs.map(d => `<li>${d}</li>`).join('')}
             </ul>
           </div>`
        : '';

      const revisionsHtml = readiness.hasRevisionsPending
        ? `<div style="text-align: left; background: #faf5ff; border: 1px solid #e9d8fd; padding: 12px; border-radius: 8px; margin: 10px 0;">
             <p style="font-weight: bold; color: #553c9a; margin: 0; font-size: 12px;">Active revision requests exist on this submission that must be resolved first.</p>
           </div>`
        : '';

      const similarityHtml = readiness.similarityWarning
        ? `<div style="text-align: left; background: #fff5f5; border: 1px solid #feb2b2; padding: 12px; border-radius: 8px; margin: 10px 0;">
             <p style="font-weight: bold; color: #c53030; margin: 0; font-size: 12px;">${readiness.similarityWarning}</p>
           </div>`
        : '';

      await Swal.fire({
        title: 'Academic Verification Incomplete',
        html: `
          <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px; text-align: left;">
            ARCHIVIO linear gating requires all manuscript files to be individually examined and marked approved before endorsing for publication.
          </div>
          ${unapprovedListHtml}
          ${missingListHtml}
          ${revisionsHtml}
          ${similarityHtml}
          <div style="font-size: 12px; color: #718096; margin-top: 10px; text-align: left;">
            Please click <strong>Open Full Review</strong> to inspect each document and mark it checked.
          </div>
        `,
        icon: 'warning',
        confirmButtonText: 'Open Full Review',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#770000',
        cancelButtonColor: '#718096'
      }).then((result) => {
        if (result.isConfirmed) {
          handleFullReview(sub);
        }
      });
      return;
    }

    const isDeanRev = sub.reviewStatus === 'dean_revision';
    const res = await Swal.fire({
      title: isDeanRev ? 'Endorse Revised Manuscript to Dean?' : 'Endorse for Dean Publication?',
      text: isDeanRev 
        ? "All documents and revisions verified. This will forward the manuscript back to the Dean's Publish Queue."
        : "All required documents have been verified. This will endorse the research and forward it to the Dean's Publish Queue.",
      input: 'textarea',
      inputLabel: 'Adviser Endorsement Remarks / Directives (Optional)',
      inputPlaceholder: isDeanRev ? 'E.g. Verified revisions requested by the Dean...' : 'E.g. Ready for final archival publishing...',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isDeanRev ? 'Yes, Endorse to Dean' : 'Yes, Endorse for Publication'
    });

    if (res.isConfirmed) {
      const comments = res.value || '';

      Swal.fire({
        title: isDeanRev ? 'Endorsing to Dean...' : 'Endorsing for Publication...',
        text: 'Updating submission records and notifying stakeholders...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await updateDoc(doc(db, 'submissions', sub.id), {
          reviewStatus: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: auth.currentUser?.email,
          adviserComments: comments
        });

        await logActivity({
          user: auth.currentUser?.email || 'Adviser',
          role: 'Research Adviser',
          action: 'Endorsed submission for Dean publication',
          details: `Group: ${sub.groupName} | Title: ${sub.researchTitle}`,
          status: 'Success'
        });

        if (sub.studentUid) {
          await addDoc(collection(db, 'notifications'), {
            userId: sub.studentUid,
            title: "Research Approved!",
            message: "Congratulations! Your Research Adviser has approved your manuscript. It is now awaiting the Dean's final review.",
            isRead: false,
            createdAt: serverTimestamp()
          });
          
          // Notify the Dean(s)
          try {
            const deansQuery = query(collection(db, 'users'), where('role', '==', 'dean'));
            const deansSnap = await getDocs(deansQuery);
            const batchPromises = deansSnap.docs.map(deanDoc => 
              addDoc(collection(db, 'notifications'), {
                userId: deanDoc.id, // Usually the UID is the doc ID for users collection
                title: "Manuscript Ready for Publishing",
                message: `Adviser ${auth.currentUser?.email} has approved "${sub.researchTitle}". It is now in your Publish Queue.`,
                isRead: false,
                createdAt: serverTimestamp()
              })
            );
            await Promise.all(batchPromises);
          } catch (notifyErr) {
            console.error("Failed to notify Dean:", notifyErr);
          }
          
          if (sub.leaderEmail) {
            try {
              await addDoc(collection(db, 'mail'), {
                to: sub.leaderEmail,
                message: {
                  subject: `Update on your submission: ${sub.researchTitle}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                      <div style="background-color: #590000; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                        <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                      </div>
                      <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #2d3748; margin-top: 0;">Hi ${sub.leaderName},</h2>
                        <p style="color: #4a5568; line-height: 1.6;">The status of your submission <strong>"${sub.researchTitle}"</strong> has been updated to: <span style="background-color: #C6F6D5; color: #22543D; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">approved</span></p>
                        
                        ${comments ? `
                        <div style="background-color: #f7fafc; border-left: 4px solid #590000; padding: 15px; margin: 20px 0;">
                          <p style="margin: 0 0 10px 0; color: #4a5568;"><strong>Adviser Comments:</strong></p>
                          <p style="margin: 0; color: #2d3748; white-space: pre-wrap;">${comments}</p>
                        </div>
                        ` : ''}
                        
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
              console.error('Failed to send status email', e);
            }
          }
        }

        Swal.fire({
          icon: 'success',
          title: 'Endorsed for Publication!',
          text: `${sub.groupName}'s manuscript has been verified and forwarded to the Dean.`,
          confirmButtonColor: '#059669',
        });
      } catch (err) {
        console.error('Error approving:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update. Please try again.', confirmButtonColor: '#770000' });
      }
    }
  };

  // Handle Reject/Revision action
  const handleReject = async (sub) => {
    const isDeanRev = sub.reviewStatus === 'dean_revision' || !!sub.deanComments;
    const defaultInput = sub.deanComments 
      ? `Dean's Directive (${sub.deanFeedback?.category || 'Revision'}):\n"${sub.deanComments}"\n\nAdviser Instructions:`
      : '';

    const res = await Swal.fire({
      title: isDeanRev ? 'Forward Dean Revision to Students?' : 'Request Revision?',
      text: isDeanRev 
        ? `Forward Dean's revision directive to ${sub.groupName}:` 
        : "The student research group will be notified to revise their manuscript.",
      input: 'textarea',
      inputValue: defaultInput,
      inputLabel: 'Revision Directives & Instructions',
      inputPlaceholder: 'Detail specific revision directives and feedback for the students...',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide clear revision instructions for the student researchers!'
        }
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ca8a04',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isDeanRev ? 'Forward to Students' : 'Request Revision'
    });

    if (res.isConfirmed) {
      const comments = res.value;

      Swal.fire({
        title: 'Sending Revision Request...',
        text: 'Notifying students and logging revision instructions...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await updateDoc(doc(db, 'submissions', sub.id), {
          reviewStatus: 'revision',
          reviewedAt: new Date().toISOString(),
          reviewedBy: auth.currentUser?.email,
          adviserComments: comments
        });

        await logActivity({
          user: auth.currentUser?.email || 'Adviser',
          role: 'Research Adviser',
          action: 'Requested revision',
          details: `Group: ${sub.groupName} | Title: ${sub.researchTitle}`,
          status: 'Success'
        });

        if (sub.studentUid) {
          await addDoc(collection(db, 'notifications'), {
            userId: sub.studentUid,
            title: "Revision Required",
            message: "Your Research Adviser has requested revisions on your manuscript. Please check the feedback.",
            isRead: false,
            createdAt: serverTimestamp()
          });
          
          if (sub.leaderEmail) {
            try {
              await addDoc(collection(db, 'mail'), {
                to: sub.leaderEmail,
                message: {
                  subject: `Revision required for your submission: ${sub.researchTitle}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                      <div style="background-color: #590000; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                        <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                      </div>
                      <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #2d3748; margin-top: 0;">Hi ${sub.leaderName},</h2>
                        <p style="color: #4a5568; line-height: 1.6;">The status of your submission <strong>"${sub.researchTitle}"</strong> has been updated to: <span style="background-color: #FEEBC8; color: #975A16; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">revision required</span></p>
                        
                        ${comments ? `
                        <div style="background-color: #f7fafc; border-left: 4px solid #D69E2E; padding: 15px; margin: 20px 0;">
                          <p style="margin: 0 0 10px 0; color: #4a5568;"><strong>Adviser Comments:</strong></p>
                          <p style="margin: 0; color: #2d3748; white-space: pre-wrap;">${comments}</p>
                        </div>
                        ` : ''}
                        
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
              console.error('Failed to send status email', e);
            }
          }
        }

        await Swal.fire({
          icon: 'success',
          title: 'Revision Request Sent!',
          html: `
            <div style="font-size: 14px; color: #4b5563; line-height: 1.5; text-align: left;">
              <p style="margin-bottom: 8px;">Your revision directives have been successfully recorded and sent to <strong>${sub.groupName}</strong>.</p>
              <p style="margin: 0; font-size: 13px; color: #6b7280;">The manuscript status is updated to <em>Revision Required</em> and the student research team has been notified via email and in their portal.</p>
            </div>
          `,
          confirmButtonText: 'Done',
          confirmButtonColor: '#10b981'
        });
      } catch (err) {
        console.error('Error rejecting:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update. Please try again.', confirmButtonColor: '#770000' });
      }
    }
  };

  // Handle Delete action
  const handleDeleteSubmission = async (sub) => {
    const res = await Swal.fire({
      title: 'Delete this research?',
      text: 'This will permanently delete this research group and its submission data. The student will have to start over.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete it'
    });

    if (res.isConfirmed) {
      try {
        // Delete submission
        await deleteDoc(doc(db, 'submissions', sub.id));
        // Delete group
        const group = groups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.researchTitle || sub.title)));
        if (group) {
          await deleteDoc(doc(db, 'groups', group.id));
        }

        // Reset the student's groupStatus so they can start a new research
        if (sub.studentUid) {
          await updateDoc(doc(db, 'students', sub.studentUid), {
            groupStatus: 'none',
            groupName: '',
            researchTitle: ''
          });
        }
        
        await logActivity({
          user: auth.currentUser?.email || 'Adviser',
          role: 'Research Adviser',
          action: 'Deleted a research submission',
          details: `Deleted "${sub.researchTitle}"`,
          status: 'Success'
        });

        Swal.fire('Deleted!', 'The research has been permanently deleted.', 'success');
      } catch (err) {
        console.error('Error deleting submission:', err);
        Swal.fire('Error', 'Failed to delete research.', 'error');
      }
    }
  };

  // Handle Send Message to Student
  const handleSendMessageToStudent = async (e) => {
    e.preventDefault();
    if (!selectedSubmission || !msgSubject.trim() || !msgBody.trim()) return;

    const studentEmail = selectedSubmission.leaderEmail;
    if (!studentEmail) {
      Swal.fire('Error', 'Student email not found in group data.', 'error');
      return;
    }

    setMsgSending(true);
    setMsgStatus(null);
    try {
      // 1. Send Email via Backend
      const res = await authFetch(`${BACKEND_URL}/api/send-adviser-message`, {
          adviserName: auth.currentUser?.displayName || 'Research Adviser',
          adviserEmail: auth.currentUser?.email || '',
          studentName: selectedSubmission.leaderName,
          studentEmail: studentEmail,
          subject: msgSubject,
          message: msgBody
        });

      if (!res.ok) throw new Error('Failed to send email');

      // 2. Create In-App Notification for the Student
      await addDoc(collection(db, 'notifications'), {
        userId: selectedSubmission.studentUid, // Leader UID
        title: `Message from Adviser: ${msgSubject.substring(0, 30)}${msgSubject.length > 30 ? '...' : ''}`,
        message: msgBody,
        isRead: false,
        createdAt: serverTimestamp()
      });

      setMsgStatus('success');
      
      Swal.fire({
        title: 'Message Sent!',
        text: 'Your email and in-app notification have been successfully sent to the student.',
        icon: 'success',
        confirmButtonColor: '#770000'
      });

      setShowMsgModal(false);
      setMsgSubject('');
      setMsgBody('');
      setMsgStatus(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setMsgStatus('error');
    } finally {
      setMsgSending(false);
    }
  };

  // Handle "Full Review"
  const handleFullReview = (sub) => {
    setSelectedSubmission(sub);
    setShowReviewModal(true);
  };

  // Get border color based on completion
  const getBorderColor = (percent) => {
    if (percent === 100) return 'border-l-green-600';
    if (percent >= 50) return 'border-l-yellow-500';
    return 'border-l-red-500';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'dean_revision':
        return <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] px-2.5 py-1 rounded-full font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1"><Landmark className="w-3 h-3 text-amber-700 dark:text-amber-300" /> Returned by Dean</span>;
      case 'in_progress':
        return <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 text-[11px] px-2.5 py-1 rounded-full font-bold">In Progress</span>;
      case 'pending':
        return <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-800/50 text-[11px] px-2.5 py-1 rounded-full font-bold">Pending Review</span>;
      case 'reviewed':
        return <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-[11px] px-2.5 py-1 rounded-full font-bold">Reviewed</span>;
      case 'approved':
        return <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200/60 dark:border-green-800/50 text-[11px] px-2.5 py-1 rounded-full font-bold">Approved</span>;
      case 'published':
        return <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] px-2.5 py-1 rounded-full font-bold">Published</span>;
      default:
        return <span className="bg-gray-50 dark:bg-stone-800 text-gray-600 dark:text-stone-300 border border-gray-200/60 dark:border-stone-700 text-[11px] px-2.5 py-1 rounded-full font-bold">{status}</span>;
    }
  };

  // (Removed static REQUIREMENT_ITEMS in favor of dynamic requirements state)

  return (
    <Layout title="Review Submissions & Tracking" breadcrumb="ARCHIVIO › Review Submissions & Tracking" showSearch={true} searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionTitle sub="Review, approve, or decline your student groups' research submissions">
          Review Submissions & Tracking
        </SectionTitle>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Local Search Removed */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600 dark:text-stone-300"
          >
            <option>All Year</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600 dark:text-stone-300"
          >
            <option>All Groups</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Tabs: Horizontally scrollable on mobile */}
        <div className="border-b border-gray-200 dark:border-stone-800 flex gap-2 sm:gap-6 overflow-x-auto no-scrollbar flex-nowrap pb-1" role="tablist" aria-label="Manuscript Review Queues">
          <button
            role="tab"
            aria-selected={activeTab === 'needs_review'}
            onClick={() => setActiveTab('needs_review')}
            className={`pb-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${activeTab === 'needs_review' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Needs Review</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'needs_review' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{needsReviewCount}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'revisions'}
            onClick={() => setActiveTab('revisions')}
            className={`pb-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${activeTab === 'revisions' ? 'border-b-2 border-orange-600 text-orange-700 dark:text-orange-400' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <span>Revisions Requested</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'revisions' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 font-bold' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{revisionsCount}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
            className={`pb-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors shrink-0 whitespace-nowrap cursor-pointer ${activeTab === 'approved' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Endorsed & Published</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{approvedCount}</span>
          </button>
        </div>

        {/* Sub-filters for Revisions */}
        {activeTab === 'revisions' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-gray-500 dark:text-stone-400 font-medium">Filter by source:</span>
            <button
              onClick={() => setRevisionFilter('all')}
              className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer ${revisionFilter === 'all' ? 'bg-[#770000] text-white dark:bg-[#f8d070] dark:text-stone-900' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 hover:bg-gray-200'}`}
            >
              All ({revisionsCount})
            </button>
            <button
              onClick={() => setRevisionFilter('dean')}
              className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${revisionFilter === 'dean' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}
            >
              <Landmark className="w-3.5 h-3.5" /> Dean Directives ({deanRevisionCount})
            </button>
            <button
              onClick={() => setRevisionFilter('adviser')}
              className={`px-3 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${revisionFilter === 'adviser' ? 'bg-orange-600 text-white' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'}`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> Adviser Directives ({adviserRevisionCount})
            </button>
          </div>
        )}

        {/* Mobile View: Cards list for phones */}
        <div className="md:hidden space-y-3 mt-4">
          {loading ? (
            <TableSkeleton columns={2} rows={3} />
          ) : finalFiltered.length === 0 ? (
            <Card glass={true} className="p-8 text-center">
              <FolderKanban className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-gray-700 dark:text-stone-200 font-bold text-sm">
                {activeTab === 'needs_review' && 'No submissions currently waiting for review.'}
                {activeTab === 'revisions' && 'No active revision requests found.'}
                {activeTab === 'approved' && 'No endorsed or published research records found.'}
              </p>
              <p className="text-gray-500 dark:text-stone-400 text-xs mt-1">
                {activeTab === 'needs_review' && 'When student groups upload requirements, they will appear here.'}
                {activeTab === 'revisions' && 'Manuscripts with revision requests will be tracked here.'}
                {activeTab === 'approved' && 'Manuscripts endorsed for the Dean or published appear in this archive.'}
              </p>
            </Card>
          ) : (
            finalFiltered.map((item, index) => {
              const verifiedDocsCount = Object.keys(item.documentApprovals || {}).filter(k => item.documentApprovals[k] === true).length;
              const isAllVerified = verifiedDocsCount >= item.requiredCount && item.requiredCount > 0;

              return (
                <Card key={item.id} glass={true} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider block">
                        #{String(index + 1).padStart(2, '0')} · {item.groupName}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-stone-100 line-clamp-2 mt-0.5">
                        {item.researchTitle}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      item.completionPercent === 100 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : item.completionPercent >= 50
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {item.completionPercent}% files
                    </span>
                  </div>

                  {activeTab === 'needs_review' && (
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                      isAllVerified
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}>
                      <span className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verification Status:
                      </span>
                      <span className="font-bold flex items-center gap-1">
                        {isAllVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            All Documents Checked
                          </>
                        ) : (
                          `${verifiedDocsCount}/${item.requiredCount} Checked`
                        )}
                      </span>
                    </div>
                  )}

                  {activeTab === 'revisions' && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs">
                      <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                        {item.reviewStatus === 'dean_revision' ? (
                          <Landmark className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{item.reviewStatus === 'dean_revision' ? "Dean's Directive:" : "Adviser Revision Directive:"}</span> {item.deanFeedback?.category || 'Revisions Required'}
                      </p>
                      {(item.deanComments || item.adviserComments) && (
                        <p className="text-amber-900/80 dark:text-amber-200/80 text-[11px] mt-1 line-clamp-2">
                          "{item.deanComments || item.adviserComments}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-stone-400 pt-1 border-t border-gray-100 dark:border-stone-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.submittedDate ? new Date(item.submittedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—'}
                    </span>
                    <span>{getStatusBadge(item.reviewStatus)}</span>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <PremiumButton 
                      onClick={() => handleFullReview(item)}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-xs py-2"
                    >
                      View Details →
                    </PremiumButton>

                    {activeTab === 'needs_review' && (
                      <PremiumButton 
                        onClick={() => handleApprove(item)}
                        variant="primary"
                        size="sm"
                        className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-xs py-2 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Endorse for Dean
                      </PremiumButton>
                    )}

                    {activeTab === 'revisions' && item.reviewStatus === 'dean_revision' && (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <PremiumButton 
                          onClick={() => handleReject(item)}
                          variant="outline"
                          size="sm"
                          className="justify-center text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs"
                        >
                          Forward
                        </PremiumButton>
                        <PremiumButton 
                          onClick={() => handleApprove(item)}
                          variant="primary"
                          size="sm"
                          className="justify-center bg-emerald-600 hover:bg-emerald-700 text-xs"
                        >
                          Re-Approve
                        </PremiumButton>
                      </div>
                    )}

                    {activeTab === 'approved' && (
                      <PremiumButton 
                        onClick={() => setCertModalItem(item)}
                        variant="primary"
                        size="sm"
                        className="w-full justify-center bg-[#c9a227] hover:bg-[#b08d1e] text-[#1A1A1A] font-bold text-xs py-2 flex items-center gap-1.5"
                      >
                        <Award className="w-4 h-4" />
                        <span>View Certificate</span>
                      </PremiumButton>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Submissions Table (Desktop Only) */}
        <Card glass={true} className="hidden md:block mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#590000] dark:bg-stone-950 text-white dark:text-stone-300 dark:border-b dark:border-stone-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 text-center w-12">No.</th>
                  <th className="py-3.5 px-4">Research Title</th>
                  <th className="py-3.5 px-4">Group</th>
                  {activeTab === 'approved' ? (
                    <>
                      <th className="py-3.5 px-4">Approved On</th>
                      <th className="py-3.5 px-4">Status</th>
                    </>
                  ) : activeTab === 'revisions' ? (
                    <>
                      <th className="py-3.5 px-4">Directive Date</th>
                      <th className="py-3.5 px-4 text-center">Revision Source</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">Submitted Date</th>
                      <th className="py-3.5 px-4 text-center">Linear Gating Check</th>
                    </>
                  )}
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800 font-medium">
                {loading ? (
                  <TableSkeleton columns={5} rows={5} />
                ) : finalFiltered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-gray-500 dark:text-stone-400">
                      <FolderKanban className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                      <p className="font-bold text-sm text-gray-700 dark:text-stone-300">
                        {activeTab === 'needs_review' && 'No submissions currently waiting for review.'}
                        {activeTab === 'revisions' && 'No active revision requests found.'}
                        {activeTab === 'approved' && 'No endorsed or published research records found.'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-stone-500 mt-0.5">
                        {activeTab === 'needs_review' && 'When student groups upload requirements, they will appear here.'}
                        {activeTab === 'revisions' && 'Items requiring manuscript revisions will appear here.'}
                        {activeTab === 'approved' && 'Endorsed and published archival records will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  finalFiltered.map((item, index) => {
                    const verifiedDocsCount = Object.keys(item.documentApprovals || {}).filter(k => item.documentApprovals[k] === true).length;
                    const isAllVerified = verifiedDocsCount >= item.requiredCount && item.requiredCount > 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="py-4 px-4 text-center text-gray-400 dark:text-stone-500 font-normal">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-800 dark:text-stone-100 max-w-xs truncate">
                          {item.researchTitle}
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-stone-300">
                          {item.groupName}
                        </td>

                        {activeTab === 'approved' ? (
                          <>
                            <td className="py-4 px-4 text-gray-600 dark:text-stone-300">
                              {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-4 px-4">
                              {item.reviewStatus === 'published' ? (
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center w-max gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Published
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-100 flex items-center w-max gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Waiting for Dean Approval
                                </span>
                              )}
                            </td>
                          </>
                        ) : activeTab === 'revisions' ? (
                          <>
                            <td className="py-4 px-4 text-gray-600 dark:text-stone-300 text-xs">
                              {item.returnedAt || item.reviewedAt ? new Date(item.returnedAt || item.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {item.reviewStatus === 'dean_revision' ? (
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                                  <Landmark className="w-3 h-3" /> Dean Directive
                                </span>
                              ) : (
                                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 px-3 py-1 rounded-full text-[10px] font-bold border border-orange-300 dark:border-orange-700 inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Adviser Revision
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-4 text-gray-600 dark:text-stone-300">
                              {item.submittedDate ? new Date(item.submittedDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {isAllVerified ? (
                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1 w-max mx-auto">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified & Ready
                                </span>
                              ) : (
                                <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1 w-max mx-auto">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> {verifiedDocsCount}/${item.requiredCount} Verified
                                </span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <PremiumButton 
                              onClick={() => handleFullReview(item)}
                              variant="ghost"
                              size="sm"
                            >
                              Review
                            </PremiumButton>
                            {activeTab === 'needs_review' && (
                              <PremiumButton 
                                onClick={() => handleApprove(item)}
                                variant="primary"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                                title="Endorse this verified submission for Dean publishing"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Endorse for Dean
                              </PremiumButton>
                            )}
                            {activeTab === 'revisions' && item.reviewStatus === 'dean_revision' && (
                              <>
                                <PremiumButton 
                                  onClick={() => handleReject(item)}
                                  variant="outline"
                                  size="sm"
                                  className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs"
                                  title="Forward Dean feedback to student group to revise"
                                >
                                  Forward to Student
                                </PremiumButton>
                                <PremiumButton 
                                  onClick={() => handleApprove(item)}
                                  variant="primary"
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                                  title="Re-approve manuscript and return to Dean for publishing"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Re-Approve to Dean
                                </PremiumButton>
                              </>
                            )}
                            {activeTab === 'approved' && (
                              <PremiumButton 
                                onClick={() => setCertModalItem(item)}
                                variant="primary"
                                size="sm"
                                className="bg-[#c9a227] hover:bg-[#b08d1e] text-[#1A1A1A] font-bold flex items-center gap-1.5"
                              >
                                <Award className="w-4 h-4" />
                                <span>Certificate</span>
                              </PremiumButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between text-xs text-gray-500 dark:text-stone-400">
            <span>Showing 1–{finalFiltered.length} of {finalFiltered.length} {activeTab}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 border border-gray-200 dark:border-stone-700 rounded hover:bg-gray-50 dark:hover:bg-stone-800">‹</button>
              <button className="px-2.5 py-1 bg-[#770000] dark:bg-[#f8d070] text-white dark:text-stone-900 rounded font-bold">1</button>
              <button className="px-2 py-1 border border-gray-200 dark:border-stone-700 rounded hover:bg-gray-50 dark:hover:bg-stone-800">›</button>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-950 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-[#590000] dark:bg-stone-900 dark:border-b dark:border-stone-800 text-white dark:text-stone-100 p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 dark:bg-stone-800 rounded-full flex items-center justify-center hover:bg-white/30 dark:hover:bg-stone-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-white/70 dark:text-stone-400 text-xs tracking-widest uppercase font-bold mb-1">Full Review</p>
              <h2 className="text-2xl font-serif font-bold">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 dark:text-stone-300 text-sm mt-1">
                Group: {selectedSubmission.groupName} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* DEAN REVISION DIRECTIVE ALERT BANNER */}
              {(selectedSubmission.reviewStatus === 'dean_revision' || selectedSubmission.deanComments) && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span className="flex items-center gap-1.5"><Landmark className="w-4 h-4 text-amber-700" /> Dean's Revision Directive — {selectedSubmission.deanFeedback?.category || 'Feedback'}</span>
                    </div>
                    {selectedSubmission.deanFeedback?.urgency === 'urgent' && (
                      <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                        Urgent Attention
                      </span>
                    )}
                  </div>
                  <p className="text-stone-800 dark:text-stone-100 text-sm font-serif italic whitespace-pre-wrap leading-relaxed bg-white/70 dark:bg-stone-900/60 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    "{selectedSubmission.deanComments || selectedSubmission.deanFeedback?.comments}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-2.5">
                    <span>From: <strong>{selectedSubmission.deanFeedback?.deanName || 'Dean'}</strong> ({selectedSubmission.deanFeedback?.deanEmail || 'Dean\'s Office'})</span>
                    <span>{selectedSubmission.returnedAt ? new Date(selectedSubmission.returnedAt).toLocaleString() : ''}</span>
                  </div>
                </div>
              )}

              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Documents</p>
                </div>
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Complete</p>
                </div>
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Pages</p>
                </div>
              </div>

              {/* Abstract */}
              {selectedSubmission.abstract && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm">Abstract</h4>
                    <button onClick={() => handleSimilarityCheck(selectedSubmission)} className="text-[#1A1A1A] dark:text-stone-200 hover:text-[#770000] dark:hover:text-[#f8d070] hover:bg-stone-200 dark:hover:bg-stone-700 text-[10px] font-bold tracking-widest uppercase bg-stone-100 dark:bg-stone-800 px-2 py-1.5 rounded shadow-sm border border-stone-200 dark:border-stone-700 transition-colors flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Check Similarity
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-stone-300 text-sm leading-relaxed bg-gray-50 dark:bg-stone-900 rounded-lg p-4 border border-gray-100 dark:border-stone-800">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              {/* Adviser AI Auto-Summarizer */}
              <div className="bg-gradient-to-br from-[#590000]/5 to-[#f8d070]/10 dark:from-stone-900 dark:to-stone-800 rounded-xl p-5 border border-[#590000]/10 dark:border-stone-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500 inline mr-1" /> Adviser AI Auto-Summarizer
                  </h4>
                  {!selectedSubmission.aiSummary && (
                    <PremiumButton 
                      onClick={() => handleGenerateAISummary(selectedSubmission)}
                      variant="primary"
                      size="sm"
                      disabled={isSummarizing}
                      className={isSummarizing ? "opacity-70 cursor-not-allowed" : ""}
                    >
                      {isSummarizing ? 'Generating...' : 'Generate Executive Summary'}
                    </PremiumButton>
                  )}
                </div>
                
                {selectedSubmission.aiSummary ? (
                  <div className="space-y-3">
                    <div className="bg-white/60 dark:bg-stone-950/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100 dark:border-stone-800">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Core Problem
                      </h5>
                      <p className="text-[13px] leading-relaxed text-gray-700 dark:text-stone-300">{selectedSubmission.aiSummary.problem}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-stone-950/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100 dark:border-stone-800">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Methodology
                      </h5>
                      <p className="text-[13px] leading-relaxed text-gray-700 dark:text-stone-300">{selectedSubmission.aiSummary.methodology}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-stone-950/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100 dark:border-stone-800">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Conclusion & Findings
                      </h5>
                      <p className="text-[13px] leading-relaxed text-gray-700 dark:text-stone-300">{selectedSubmission.aiSummary.conclusion}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-stone-400 italic bg-white/40 dark:bg-stone-950/30 p-3 rounded-lg">
                    Click the button above to instantly extract and generate a 1-page executive summary of this manuscript (Core Problem, Methodology, Conclusion). This AI assistant saves you hours of reading time.
                  </p>
                )}
              </div>

              {/* Group Members */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm mb-2">Group Members</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#590000] dark:bg-[#f8d070] text-white dark:text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
                    <User className="w-3 h-3" /> {selectedSubmission.leaderName} (Leader)
                  </span>
                  {selectedSubmission.members?.map((m, i) => {
                    const memberName = typeof m === 'object'
                      ? (m.name || (m.email?.includes('@') ? m.email.split('@')[0] : m.email) || `Member ${i + 2}`)
                      : (typeof m === 'string' && m.includes('@') ? m.split('@')[0] : (m || `Member ${i + 2}`));
                    return (
                      <span key={i} className="bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-200 text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 dark:border-stone-700 inline-flex items-center gap-1">
                        <User className="w-3 h-3" /> {memberName}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Documents Checklist with Linear Approval Gating Banner */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm">Submitted Documents</h4>
                  <span className="text-xs text-gray-500 dark:text-stone-400">
                    {selectedSubmission.uploadedCount} of {selectedSubmission.requiredCount} Files Submitted
                  </span>
                </div>

                {/* Linear Verification Checklist Summary Banner */}
                {(() => {
                  const readiness = validateSubmissionReadiness(selectedSubmission, requirements);
                  return (
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      readiness.isReady
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          {readiness.isReady ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />}
                          <h5 className={`font-bold text-xs uppercase tracking-wider ${readiness.isReady ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                            Linear Approval Gating: {readiness.approvedCount} of {readiness.totalRequired} Verified
                          </h5>
                        </div>
                        <p className={`text-xs mt-1 ${readiness.isReady ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {readiness.isReady 
                            ? 'All required documents inspected and approved. Ready to endorse for Dean publication.' 
                            : 'Each required document must be opened, inspected, and approved in the viewer before publication endorsement.'}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {readiness.isReady ? (
                          <span className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Endorse
                          </span>
                        ) : (
                          <span className="bg-amber-600/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[11px] px-3 py-1 rounded-full">
                            Verification Incomplete
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  {requirements.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id] || selectedSubmission.documents?.[req.title];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id) || selectedSubmission.uploadedDocs?.includes(req.title) || !!docMeta;
                    const isApproved = selectedSubmission?.documentApprovals?.[req.id] || selectedSubmission?.documentApprovals?.[req.title];
                    const isResubmitted = selectedSubmission?.documentResubmissions?.[req.id] || selectedSubmission?.documentResubmissions?.[req.title];
                    const hasRevision = selectedSubmission?.documentRevisions?.[req.id] || selectedSubmission?.documentRevisions?.[req.title];

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? isApproved 
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                            : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 border border-stone-200/50 dark:border-stone-700/50">
                            <RequirementIcon icon={req.icon} type={req.type} title={req.title} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${isUploaded ? 'text-gray-900 dark:text-stone-100' : 'text-red-700 dark:text-red-400'}`}>
                              {req.title || req.id}
                            </p>
                            {isUploaded && docMeta ? (
                              <p className="text-xs text-gray-500 dark:text-stone-400 truncate">
                                {docMeta.name} · {docMeta.size} · {docMeta.date}
                              </p>
                            ) : !isUploaded && (
                              <p className="text-xs text-red-500 dark:text-red-400 italic">
                                Required file has not been submitted yet
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUploaded ? (
                            <>
                              <div className="flex flex-col items-end mr-2">
                                {isApproved ? (
                                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified & Checked
                                  </span>
                                ) : isResubmitted ? (
                                  <span className="text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-700">
                                    <RefreshCw className="w-3 h-3" /> Resubmitted
                                  </span>
                                ) : hasRevision ? (
                                  <span className="text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-700">
                                    <AlertCircle className="w-3 h-3" /> Revision Requested
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                                    <Clock className="w-3 h-3" /> Needs Check
                                  </span>
                                )}
                              </div>
                              {docMeta?.url && docMeta.url !== '#' && (
                                <button
                                  onClick={() => setViewerState({
                                    isOpen: true,
                                    url: docMeta.url,
                                    title: `${selectedSubmission.groupName} - ${req.title || req.id}`,
                                    reqId: req.id
                                  })}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                                >
                                  Review Submission
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
                              <X className="w-3 h-3" /> Missing
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keywords */}
              {selectedSubmission.keywords?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.keywords.map((kw, i) => (
                      <span key={i} className="border border-[#770000]/30 dark:border-stone-700 text-[#590000] dark:text-[#f8d070] bg-[#F9EBF0] dark:bg-stone-800 px-3 py-1 rounded-full text-xs font-bold">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-stone-800 p-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-gray-50 dark:bg-stone-900 rounded-b-2xl">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 sm:flex-initial border border-gray-300 dark:border-stone-700 text-gray-700 dark:text-stone-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-stone-800 transition text-center cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                {selectedSubmission.reviewStatus !== 'approved' && selectedSubmission.reviewStatus !== 'published' && (
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      handleApprove(selectedSubmission);
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-sm font-semibold transition text-center bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Endorse for Dean Publication</span>
                  </button>
                )}
                {(selectedSubmission.reviewStatus === 'approved' || selectedSubmission.reviewStatus === 'published') && (
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setCertModalItem(selectedSubmission);
                    }}
                    className="bg-[#c9a227] hover:bg-[#b08d1e] text-[#1A1A1A] px-4 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Archival Certificate</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Viewer Modal */}
      {(() => {
        const getSubmissionDocKey = (submission, reqId, title) => {
          if (!submission) return reqId;
          const cleanTitle = title?.split(' - ')[1]?.trim() || title?.trim();
          const candidates = [reqId, cleanTitle, title?.trim()].filter(Boolean);
          for (const c of candidates) {
            if (submission.documentResubmissions && submission.documentResubmissions[c] !== undefined) return c;
            if (submission.documentRevisions && submission.documentRevisions[c] !== undefined) return c;
            if (submission.documentAnnotations && submission.documentAnnotations[c] !== undefined) return c;
            if (submission.documents && submission.documents[c] !== undefined) return c;
          }
          if (cleanTitle?.toLowerCase().includes('manuscript') || reqId?.toLowerCase().includes('manuscript')) {
            const msKey = Object.keys(submission.documentResubmissions || {}).find(k => k.toLowerCase().includes('manuscript')) ||
                          Object.keys(submission.documentRevisions || {}).find(k => k.toLowerCase().includes('manuscript')) ||
                          Object.keys(submission.documents || {}).find(k => k.toLowerCase().includes('manuscript'));
            if (msKey) return msKey;
          }
          return reqId || candidates[0];
        };

        const activeReqKey = getSubmissionDocKey(selectedSubmission, viewerState.reqId, viewerState.title);
        const isDocumentResubmitted = Boolean(
          activeReqKey && (
            selectedSubmission?.documentResubmissions?.[activeReqKey] ||
            selectedSubmission?.documentResubmissions?.[viewerState.reqId] ||
            selectedSubmission?.documentResubmissions?.[viewerState.title] ||
            (viewerState.title?.toLowerCase().includes('manuscript') && selectedSubmission?.documentResubmissions?.['Final Manuscript'])
          )
        );

        let docPreviousNote = '';
        let docPreviousAnnotations = {};
        let currentActiveNote = '';
        let currentActiveAnnotations = {};

        if (isDocumentResubmitted) {
          if (selectedSubmission?.previousRevisions?.[activeReqKey]) {
            docPreviousNote = selectedSubmission.previousRevisions[activeReqKey];
            currentActiveNote = selectedSubmission?.documentRevisions?.[activeReqKey] || '';
          } else {
            docPreviousNote = selectedSubmission?.documentRevisions?.[activeReqKey] || selectedSubmission?.documentRevisions?.[viewerState.reqId] || '';
            currentActiveNote = '';
          }

          if (selectedSubmission?.previousAnnotations?.[activeReqKey]) {
            docPreviousAnnotations = selectedSubmission.previousAnnotations[activeReqKey];
            currentActiveAnnotations = selectedSubmission?.documentAnnotations?.[activeReqKey] || {};
          } else {
            docPreviousAnnotations = selectedSubmission?.documentAnnotations?.[activeReqKey] || selectedSubmission?.documentAnnotations?.[viewerState.reqId] || {};
            currentActiveAnnotations = {};
          }
        } else {
          currentActiveNote = selectedSubmission?.documentRevisions?.[activeReqKey] || selectedSubmission?.documentRevisions?.[viewerState.reqId] || '';
          currentActiveAnnotations = selectedSubmission?.documentAnnotations?.[activeReqKey] || selectedSubmission?.documentAnnotations?.[viewerState.reqId] || {};
        }

        const docStudentReply = selectedSubmission?.documentRevisionReplies?.[activeReqKey] || 
                                selectedSubmission?.documentRevisionReplies?.[viewerState.reqId] || 
                                selectedSubmission?.documentRevisionReplies?.[viewerState.title] || '';

        return (
          <DocumentViewerModal
            isOpen={viewerState.isOpen}
            onClose={() => setViewerState({ ...viewerState, isOpen: false, reqId: null })}
            documentUrl={viewerState.url}
            documentTitle={viewerState.title}
            role="adviser"
            isResubmitted={isDocumentResubmitted}
            previousNote={docPreviousNote}
            previousAnnotations={docPreviousAnnotations}
            initialNote={currentActiveNote}
            initialAnnotations={currentActiveAnnotations}
            studentReply={docStudentReply}
            onSaveAnnotations={async (annotations) => {
              if (!selectedSubmission || !viewerState.reqId) return;
              try {
                const reqKey = activeReqKey || viewerState.reqId;
                const updatePayload = {
                  [`documentAnnotations.${reqKey}`]: annotations
                };
                if (isDocumentResubmitted && docPreviousAnnotations && Object.keys(docPreviousAnnotations).length > 0) {
                  updatePayload[`previousAnnotations.${reqKey}`] = docPreviousAnnotations;
                }
                await updateDoc(doc(db, 'submissions', selectedSubmission.id), updatePayload);
                Swal.fire({ toast: true, position: 'bottom-end', icon: 'success', title: 'Annotations Saved', showConfirmButton: false, timer: 2000 });
              } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Failed to save annotations.', 'error');
              }
            }}
            onSaveNote={async (note, actionType) => {
              if (!selectedSubmission || !viewerState.reqId) return;
              try {
                const reqKey = activeReqKey || viewerState.reqId;
                const currentRevisions = selectedSubmission.documentRevisions || {};
                const newRevisions = { ...currentRevisions };

                const currentPrevRevisions = selectedSubmission.previousRevisions || {};
                const newPrevRevisions = { ...currentPrevRevisions };
                if (isDocumentResubmitted && (docPreviousNote || currentRevisions[reqKey])) {
                  newPrevRevisions[reqKey] = docPreviousNote || currentRevisions[reqKey];
                }

                if (actionType === 'revision') {
                  newRevisions[reqKey] = note;
                } else {
                  delete newRevisions[reqKey];
                }

                const currentApprovals = selectedSubmission.documentApprovals || {};
                const newApprovals = { ...currentApprovals };

                if (actionType === 'approved') {
                  newApprovals[reqKey] = true;
                } else {
                  delete newApprovals[reqKey];
                }
                
                const currentResubmissions = selectedSubmission.documentResubmissions || {};
                const newResubmissions = { ...currentResubmissions };
                delete newResubmissions[reqKey];
                
                const uploadedCount = selectedSubmission.uploadedDocs?.length || 0;
                const approvedCount = Object.keys(newApprovals).length;
                const isAllApproved = uploadedCount > 0 && approvedCount >= uploadedCount;

                let newStatus = selectedSubmission.reviewStatus;
                let statusChangedMsg = '';
                
                if (actionType === 'revision') {
                  newStatus = 'revision';
                } else if (isAllApproved && newStatus !== 'revision') {
                  newStatus = 'reviewed';
                  statusChangedMsg = ' All documents checked, submission moved to Reviewed tab.';
                }

                const submissionUpdate = {
                  documentRevisions: newRevisions,
                  previousRevisions: newPrevRevisions,
                  documentApprovals: newApprovals,
                  documentResubmissions: newResubmissions,
                  reviewStatus: newStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: auth.currentUser?.email
                };

                if (isDocumentResubmitted && docPreviousAnnotations && Object.keys(docPreviousAnnotations).length > 0) {
                  submissionUpdate[`previousAnnotations.${reqKey}`] = docPreviousAnnotations;
                  submissionUpdate[`documentAnnotations.${reqKey}`] = {};
                }

                await updateDoc(doc(db, 'submissions', selectedSubmission.id), submissionUpdate);
                
                // Add notification if it is a revision
                if (actionType === 'revision' && selectedSubmission.studentUid) {
                  await addDoc(collection(db, 'notifications'), {
                    userId: selectedSubmission.studentUid,
                    title: "Revision Required",
                    message: `Your Research Adviser has requested revisions on the document: ${viewerState.title.split(' - ')[1] || 'a document'}. Please check the feedback.`,
                    isRead: false,
                    link: '/student/requirements',
                    createdAt: serverTimestamp()
                  });
                  
                  if (selectedSubmission.leaderEmail) {
                    try {
                      const commentsMsg = `Revision notes added for document: ${viewerState.title.split(' - ')[1] || 'a document'}.\n\nNote: ${note}`;
                      await addDoc(collection(db, 'mail'), {
                        to: selectedSubmission.leaderEmail,
                        message: {
                          subject: `Revision required for your submission: ${selectedSubmission.researchTitle}`,
                          html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                              <div style="background-color: #590000; padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                                <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                              </div>
                              <div style="padding: 30px; background-color: #ffffff;">
                                <h2 style="color: #2d3748; margin-top: 0;">Hi ${selectedSubmission.leaderName},</h2>
                                <p style="color: #4a5568; line-height: 1.6;">The status of your submission <strong>"${selectedSubmission.researchTitle}"</strong> has been updated to: <span style="background-color: #FEEBC8; color: #975A16; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">revision required</span></p>
                                
                                <div style="background-color: #f7fafc; border-left: 4px solid #D69E2E; padding: 15px; margin: 20px 0;">
                                  <p style="margin: 0 0 10px 0; color: #4a5568;"><strong>Adviser Comments:</strong></p>
                                  <p style="margin: 0; color: #2d3748; white-space: pre-wrap;">${commentsMsg}</p>
                                </div>
                                
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
                      console.error('Failed to send status email', e);
                    }
                  }
                }

                // Update local state to reflect change immediately
                selectedSubmission.documentRevisions = newRevisions;
                selectedSubmission.previousRevisions = newPrevRevisions;
                selectedSubmission.documentApprovals = newApprovals;
                selectedSubmission.documentResubmissions = newResubmissions;
                selectedSubmission.reviewStatus = newStatus;
                
                if (actionType === 'revision') {
                  const reqDocTitle = viewerState.title?.split(' - ')[1] || 'the selected document';
                  await Swal.fire({
                    icon: 'success',
                    title: 'Revision Request Sent!',
                    html: `
                      <div style="font-size: 14px; color: #4b5563; line-height: 1.5; text-align: left;">
                        <p style="margin-bottom: 8px;">Your revision directives have been successfully recorded for <strong>${reqDocTitle}</strong>.</p>
                        <p style="margin: 0; font-size: 13px; color: #6b7280;">The submission is now marked as <em>Revision Required</em> and the students have been notified via email and in-portal alert.</p>
                      </div>
                    `,
                    confirmButtonText: 'Done',
                    confirmButtonColor: '#10b981'
                  });
                } else {
                  Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    icon: 'success',
                    title: 'Document marked as checked.' + statusChangedMsg,
                    showConfirmButton: false,
                    timer: 4000
                  });
                }
              } catch (error) {
                console.error("Error saving document review state:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save review action.' });
              }
            }}
          />
        );
      })()}

      {/* ── MESSAGE STUDENT MODAL ─────────────────────────────────────────────── */}
      {showMsgModal && selectedSubmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#590000] dark:bg-[#f8d070] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/70 dark:text-stone-800/70 text-[11px] font-bold tracking-widest uppercase mb-0.5">Direct Message</p>
                <h3 className="text-white dark:text-stone-900 font-serif font-bold text-[18px]">Message Student</h3>
              </div>
              <button
                onClick={() => setShowMsgModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 flex items-center justify-center transition-colors text-white dark:text-stone-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendMessageToStudent} className="px-6 py-5 space-y-4">
              {msgStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800">
                  Failed to send message. Please try again.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">To</label>
                <div className="w-full border border-gray-200 dark:border-stone-700 bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-gray-500 dark:text-stone-400">
                  {selectedSubmission.leaderName} ({selectedSubmission.leaderEmail || 'No email found'})
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  required
                  placeholder="What is this about?"
                  className="w-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#770000]/30 focus:border-[#770000] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Message <span className="text-red-500">*</span></label>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  required
                  rows="4"
                  placeholder="Type your message to the student here..."
                  className="w-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#770000]/30 focus:border-[#770000] transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
                  className="w-full bg-[#770000] dark:bg-[#f8d070] hover:bg-[#590000] disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-stone-900 font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {msgSending ? 'Sending...' : 'Send Message via Email'}
                  {!msgSending && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      <CertificateModal
        isOpen={!!certModalItem}
        onClose={() => setCertModalItem(null)}
        submission={certModalItem}
      />

    </Layout>
  );
}

export default ReviewSubmissions;
