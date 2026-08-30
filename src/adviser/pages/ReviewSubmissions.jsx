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
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'pending');
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
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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

  // Enrich submissions with group data (Map over groups instead of submissions so all approved groups appear)
  const enrichedSubmissions = groups.map(group => {
    const sub = submissions.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || s.title === group.researchTitle || s.researchTitle === group.researchTitle)) || {};
    const uploadedCount = sub.uploadedDocs?.length || 0;
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
      reviewStatus: sub.reviewStatus || (completionPercent === 100 ? 'pending' : 'in_progress'),
    };
  });

  // Filter by tab
  const filteredByTab = enrichedSubmissions.filter(sub => {
    if (activeTab === 'pending') return sub.reviewStatus === 'pending' || sub.reviewStatus === 'in_progress';
    if (activeTab === 'reviewed') return sub.reviewStatus === 'reviewed' || sub.reviewStatus === 'revision';
    if (activeTab === 'approved') return sub.reviewStatus === 'approved' || sub.reviewStatus === 'published';
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

  // Tab counts
  const pendingCount = enrichedSubmissions.filter(s => s.reviewStatus === 'pending' || s.reviewStatus === 'in_progress').length;
  const reviewedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'reviewed' || s.reviewStatus === 'revision').length;
  const approvedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'published').length;

  // Available group names for filter
  const uniqueGroups = [...new Set(enrichedSubmissions.map(s => s.groupName))];
  const uniqueYears = [...new Set(enrichedSubmissions.map(s => {
    const d = new Date(s.submittedDate);
    return isNaN(d.getTime()) ? '' : d.getFullYear().toString();
  }).filter(Boolean))];

  // Handle AI Summarize
  const handleGenerateAISummary = async (submission) => {
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

  // Handle Approve action
  const handleApprove = async (sub) => {
    const res = await Swal.fire({
      title: 'Approve Submission?',
      text: "This will approve the research and forward it to the Dean's Publish Queue.",
      input: 'textarea',
      inputLabel: 'Optional Comments for the Student',
      inputPlaceholder: 'Great job! Or any final thoughts...',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });

    if (res.isConfirmed) {
      const comments = res.value || '';

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
          action: 'Approved submission',
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
                title: "📄 Manuscript Ready for Publishing",
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
                      <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                        <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                      </div>
                      <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #2d3748; margin-top: 0;">Hi ${sub.leaderName},</h2>
                        <p style="color: #4a5568; line-height: 1.6;">The status of your submission <strong>"${sub.researchTitle}"</strong> has been updated to: <span style="background-color: #C6F6D5; color: #22543D; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 12px;">approved</span></p>
                        
                        ${comments ? `
                        <div style="background-color: #f7fafc; border-left: 4px solid #541b2f; padding: 15px; margin: 20px 0;">
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
          title: 'Approved!',
          text: `${sub.groupName}'s submission has been approved and sent to the Dean.`,
          confirmButtonColor: '#059669',
        });
      } catch (err) {
        console.error('Error approving:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update. Please try again.', confirmButtonColor: '#7a2e46' });
      }
    }
  };

  // Handle Reject/Revision action
  const handleReject = async (sub) => {
    const res = await Swal.fire({
      title: 'Request Revision?',
      text: "The student will be notified to revise their submission.",
      input: 'textarea',
      inputLabel: 'Revision Comments & Feedback',
      inputPlaceholder: 'Please fix chapter 2 and update the bibliography...',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write a comment for the revision request!'
        }
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ca8a04',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Request Revision'
    });

    if (res.isConfirmed) {
      const comments = res.value;
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
                      <div style="background-color: #541b2f; padding: 20px; text-align: center;">
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

        Swal.fire({
          icon: 'success',
          title: 'Revision Requested!',
          text: `The students have been notified of your feedback.`,
          confirmButtonColor: '#ca8a04',
        });
      } catch (err) {
        console.error('Error rejecting:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update. Please try again.', confirmButtonColor: '#7a2e46' });
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
      const res = await fetch(`${BACKEND_URL}/api/send-adviser-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adviserName: auth.currentUser?.displayName || 'Research Adviser',
          adviserEmail: auth.currentUser?.email || '',
          studentName: selectedSubmission.leaderName,
          studentEmail: studentEmail,
          subject: msgSubject,
          message: msgBody
        })
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
        confirmButtonColor: '#7a2e46'
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
      case 'in_progress':
        return <span className="bg-blue-50 text-blue-700 text-[11px] px-2.5 py-1 rounded-full font-bold">In Progress</span>;
      case 'pending':
        return <span className="bg-yellow-50 text-yellow-700 text-[11px] px-2.5 py-1 rounded-full font-bold">Pending Review</span>;
      case 'reviewed':
        return <span className="bg-purple-50 text-purple-700 text-[11px] px-2.5 py-1 rounded-full font-bold">Reviewed</span>;
      case 'approved':
        return <span className="bg-green-50 text-green-700 text-[11px] px-2.5 py-1 rounded-full font-bold">Approved</span>;
      case 'published':
        return <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-1 rounded-full font-bold">Published</span>;
      default:
        return <span className="bg-gray-50 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold">{status}</span>;
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

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-stone-800 flex gap-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'border-b-2 border-[#7a2e46] dark:border-[#f8d070] text-[#7a2e46] dark:text-[#f8d070]' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            ⏳ Pending Review <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{pendingCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'reviewed' ? 'border-b-2 border-[#7a2e46] dark:border-[#f8d070] text-[#7a2e46] dark:text-[#f8d070]' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            ✅ Reviewed <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'reviewed' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{reviewedCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'approved' ? 'border-b-2 border-[#7a2e46] dark:border-[#f8d070] text-[#7a2e46] dark:text-[#f8d070]' : 'text-gray-500 dark:text-stone-400 hover:text-gray-700 dark:hover:text-stone-200'}`}
          >
            🎓 Approved <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'}`}>{approvedCount}</span>
          </button>
        </div>

        {/* Submissions Table */}
        <Card glass={true} className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#7a2e46] dark:bg-stone-950 text-white dark:text-stone-300 dark:border-b dark:border-stone-800 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 text-center w-12">No.</th>
                  <th className="py-3.5 px-4">Research Title</th>
                  <th className="py-3.5 px-4">Group</th>
                  {activeTab === 'approved' ? (
                    <>
                      <th className="py-3.5 px-4">Approved On</th>
                      <th className="py-3.5 px-4">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">Submitted</th>
                      <th className="py-3.5 px-4 text-center">Completion</th>
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
                    <td colSpan="8" className="py-8 text-center text-gray-500 dark:text-stone-400">
                      No matching {activeTab} submissions found.
                    </td>
                  </tr>
                ) : (
                  finalFiltered.map((item, index) => (
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
                      ) : activeTab === 'reviewed' ? (
                        <>
                          <td className="py-4 px-4 text-gray-600 dark:text-stone-300">
                            {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {item.reviewStatus === 'reviewed' ? (
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100">
                                Ready to Approve
                              </span>
                            ) : Object.keys(item.documentResubmissions || {}).length > 0 ? (
                              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-100">
                                🔄 Resubmitted
                              </span>
                            ) : (
                              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-100">
                                Revision Requested
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
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              item.completionPercent === 100 
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.completionPercent >= 50
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.completionPercent}%
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <PremiumButton 
                            onClick={() => handleFullReview(item)}
                            variant="ghost"
                            size="sm"
                          >
                            View
                          </PremiumButton>
                          {(activeTab === 'pending' || activeTab === 'reviewed') && item.completionPercent === 100 && item.reviewStatus !== 'approved' && item.reviewStatus !== 'published' && (
                            <>
                              <PremiumButton 
                                onClick={() => handleApprove(item)}
                                variant="primary"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                Approve
                              </PremiumButton>
                              <PremiumButton 
                                onClick={() => handleReject(item)}
                                variant="secondary"
                                size="sm"
                                className="bg-yellow-500 text-white hover:bg-yellow-600 border-none"
                              >
                                Revise
                              </PremiumButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-stone-800 flex items-center justify-between text-xs text-gray-500 dark:text-stone-400">
            <span>Showing 1–{finalFiltered.length} of {finalFiltered.length} {activeTab}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 border border-gray-200 dark:border-stone-700 rounded hover:bg-gray-50 dark:hover:bg-stone-800">‹</button>
              <button className="px-2.5 py-1 bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 rounded font-bold">1</button>
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
            <div className="bg-[#7a2e46] dark:bg-stone-900 dark:border-b dark:border-stone-800 text-white dark:text-stone-100 p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 dark:bg-stone-800 rounded-full flex items-center justify-center hover:bg-white/30 dark:hover:bg-stone-700 transition text-lg"
              >
                ✕
              </button>
              <p className="text-white/70 dark:text-stone-400 text-xs tracking-widest uppercase font-bold mb-1">Full Review</p>
              <h2 className="text-2xl font-serif font-bold">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 dark:text-stone-300 text-sm mt-1">
                Group: {selectedSubmission.groupName} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46] dark:text-[#f8d070]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Documents</p>
                </div>
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46] dark:text-[#f8d070]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Complete</p>
                </div>
                <div className="bg-[#f8eff2] dark:bg-stone-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46] dark:text-[#f8d070]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Pages</p>
                </div>
              </div>

              {/* Abstract */}
              {selectedSubmission.abstract && (
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm mb-2">Abstract</h4>
                  <p className="text-gray-600 dark:text-stone-300 text-sm leading-relaxed bg-gray-50 dark:bg-stone-900 rounded-lg p-4 border border-gray-100 dark:border-stone-800">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              {/* Adviser AI Auto-Summarizer */}
              <div className="bg-gradient-to-br from-[#7a2e46]/5 to-[#f8d070]/10 dark:from-stone-900 dark:to-stone-800 rounded-xl p-5 border border-[#7a2e46]/10 dark:border-stone-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2 text-sm">
                    <span className="text-lg">✨</span> Adviser AI Auto-Summarizer
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
                  <span className="bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full">
                    👤 {selectedSubmission.leaderName} (Leader)
                  </span>
                  {selectedSubmission.members?.map((m, i) => (
                    <span key={i} className="bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-stone-200 text-xs font-bold px-3 py-1.5 rounded-full">
                      {m.name || m.email}
                    </span>
                  ))}
                </div>
              </div>

              {/* Documents Checklist */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-stone-100 text-sm mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xl shrink-0">{req.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${isUploaded ? 'text-green-800 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {req.id}
                            </p>
                            {isUploaded && docMeta && (
                              <p className="text-xs text-gray-500 dark:text-stone-400 truncate">
                                {docMeta.name} · {docMeta.size} · {docMeta.date}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUploaded ? (
                            <>
                              <div className="flex flex-col items-end mr-2">
                                <span className="text-green-700 dark:text-green-500 font-bold text-xs mb-1">✓ Submitted</span>
                                {selectedSubmission?.documentApprovals?.[req.id] ? (
                                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Checked</span>
                                ) : selectedSubmission?.documentResubmissions?.[req.id] ? (
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔄 Resubmitted</span>
                                ) : selectedSubmission?.documentRevisions?.[req.id] ? (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠️ Revision</span>
                                ) : null}
                              </div>
                              {docMeta?.url && docMeta.url !== '#' && (
                                <button
                                  onClick={() => setViewerState({
                                    isOpen: true,
                                    url: docMeta.url,
                                    title: `${selectedSubmission.groupName} - ${req.id}`,
                                    reqId: req.id
                                  })}
                                  className="bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5f2135] dark:hover:bg-[#ffe090] transition"
                                >
                                  View
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-red-600 dark:text-red-500 font-bold text-xs">✕ Missing</span>
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
                      <span key={i} className="border border-[#DDA3B6] dark:border-stone-700 text-[#7a2e46] dark:text-[#f8d070] bg-[#F9EBF0] dark:bg-stone-800 px-3 py-1 rounded-full text-xs font-bold">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-stone-800 p-4 flex justify-between items-center bg-gray-50 dark:bg-stone-900 rounded-b-2xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="border border-gray-300 dark:border-stone-700 text-gray-700 dark:text-stone-300 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-stone-800 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowMsgModal(true)}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Message Student
                </button>
              </div>
              <div className="flex gap-3">
                {(selectedSubmission.reviewStatus === 'pending' || selectedSubmission.reviewStatus === 'in_progress') && (
                  <>
                    <button
                      onClick={async () => {
                        setShowReviewModal(false);
                        try {
                          await updateDoc(doc(db, 'submissions', selectedSubmission.id), {
                            reviewStatus: 'reviewed',
                            reviewedAt: new Date().toISOString(),
                            reviewedBy: auth.currentUser?.email
                          });
                          Swal.fire({ toast: true, position: 'bottom-end', icon: 'success', title: 'Marked as Reviewed', showConfirmButton: false, timer: 3000 });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="bg-[#ca8a04] hover:bg-[#a16207] text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
                      title="Move this submission to the Reviewed tab without requesting revisions"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => {
                        if (selectedSubmission.completionPercent < 100) {
                          Swal.fire('Incomplete', 'Student must upload all requirements before approval.', 'warning');
                          return;
                        }
                        setShowReviewModal(false);
                        handleApprove(selectedSubmission);
                      }}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${selectedSubmission.completionPercent === 100 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 dark:bg-stone-800 text-gray-500 dark:text-stone-500 cursor-not-allowed'}`}
                      title={selectedSubmission.completionPercent < 100 ? 'Student must submit all documents first' : ''}
                    >
                      Approve
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    handleDeleteSubmission(selectedSubmission);
                  }}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition border border-red-200 dark:border-red-800/50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ ...viewerState, isOpen: false, reqId: null })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
        role="adviser"
        initialNote={selectedSubmission?.documentRevisions?.[viewerState.reqId] || ''}
        initialAnnotations={selectedSubmission?.documentAnnotations?.[viewerState.reqId] || {}}
        onSaveAnnotations={async (annotations) => {
          if (!selectedSubmission || !viewerState.reqId) return;
          try {
            const currentAnnotations = selectedSubmission.documentAnnotations || {};
            await updateDoc(doc(db, 'submissions', selectedSubmission.id), {
              documentAnnotations: {
                ...currentAnnotations,
                [viewerState.reqId]: annotations
              }
            });
            Swal.fire({ toast: true, position: 'bottom-end', icon: 'success', title: 'Annotations Saved', showConfirmButton: false, timer: 2000 });
          } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to save annotations.', 'error');
          }
        }}
        onSaveNote={async (note, actionType) => {
          if (!selectedSubmission || !viewerState.reqId) return;
          try {
            const currentRevisions = selectedSubmission.documentRevisions || {};
            const newRevisions = { ...currentRevisions };

            if (actionType === 'revision') {
              newRevisions[viewerState.reqId] = note;
            } else {
              delete newRevisions[viewerState.reqId];
            }

            const currentApprovals = selectedSubmission.documentApprovals || {};
            const newApprovals = { ...currentApprovals };

            if (actionType === 'approved') {
              newApprovals[viewerState.reqId] = true;
            } else {
              delete newApprovals[viewerState.reqId];
            }
            
            const currentResubmissions = selectedSubmission.documentResubmissions || {};
            const newResubmissions = { ...currentResubmissions };
            delete newResubmissions[viewerState.reqId];
            
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

            await updateDoc(doc(db, 'submissions', selectedSubmission.id), {
              documentRevisions: newRevisions,
              documentApprovals: newApprovals,
              documentResubmissions: newResubmissions,
              reviewStatus: newStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: auth.currentUser?.email
            });
            
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
                          <div style="background-color: #541b2f; padding: 20px; text-align: center;">
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
            selectedSubmission.documentApprovals = newApprovals;
            selectedSubmission.reviewStatus = newStatus;
            
            Swal.fire({
              toast: true,
              position: 'bottom-end',
              icon: 'success',
              title: actionType === 'revision' ? 'Revision note saved & notified' : 'Document marked as checked.' + statusChangedMsg,
              showConfirmButton: false,
              timer: 4000
            });
          } catch (error) {
            console.error("Error saving document review state:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save review action.' });
          }
        }}
      />

      {/* ── MESSAGE STUDENT MODAL ─────────────────────────────────────────────── */}
      {showMsgModal && selectedSubmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#7a2e46] dark:bg-[#f8d070] px-6 py-5 flex items-center justify-between">
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
                  className="w-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a2e46]/30 focus:border-[#7a2e46] transition"
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
                  className="w-full border border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-950 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a2e46]/30 focus:border-[#7a2e46] transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
                  className="w-full bg-[#7a2e46] dark:bg-[#f8d070] hover:bg-[#5f2135] disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-stone-900 font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
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

    </Layout>
  );
}

export default ReviewSubmissions;
