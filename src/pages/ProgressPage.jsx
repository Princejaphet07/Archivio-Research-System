import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, getDocs, query, where, arrayUnion } from 'firebase/firestore';
import { logActivity } from '../firebase/logActivity';
import Swal from 'sweetalert2';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function ProgressPage({ onLogout, activeTab, setActiveTab, studentName, initials, profilePhotoUrl }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Message modal state ────────────────────────────────────────────────────
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgSubject,   setMsgSubject]   = useState('');
  const [msgBody,      setMsgBody]      = useState('');
  const [msgSending,   setMsgSending]   = useState(false);
  const [msgStatus,    setMsgStatus]    = useState(null); // 'success' | 'error' | null

  // ── New Research modal state ───────────────────────────────────────────────
  const [showNewResearchModal, setShowNewResearchModal] = useState(false);
  const [newResearchTitle, setNewResearchTitle] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const PREDEFINED_CATEGORIES = ['Computer Science', 'Information Technology', 'Information Systems', 'Engineering', 'Business', 'Education'];
  const [isSubmittingNewResearch, setIsSubmittingNewResearch] = useState(false);

  // ── Real data state ────────────────────────────────────────────────────────
  const [studentData,  setStudentData]  = useState(null);
  const [submission,   setSubmission]   = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [adviserData,  setAdviserData]  = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    // 1. Student doc
    const studentQ = query(collection(db, 'students'), where('uid', '==', uid));
    const unsubStudent = onSnapshot(studentQ, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setStudentData(data);

        // Fetch adviser email using invitedBy (which stores the adviser's email as UID)
        if (data.invitedBy) {
          // invitedBy stores the adviser's sentBy value which is their email
          // Try looking up in advisers collection by email field
          const adviserQ = query(collection(db, 'advisers'), where('email', '==', data.invitedBy));
          import('firebase/firestore').then(({ getDocs }) => {
            getDocs(adviserQ).then(aSnap => {
              if (!aSnap.empty) setAdviserData(aSnap.docs[0].data());
              else {
                // Fallback: invitedBy might directly be the email
                setAdviserData({ email: data.invitedBy });
              }
            });
          });
        }
      }
    });

    // 2. Submission doc
    const subQ = query(collection(db, 'submissions'), where('studentUid', '==', uid));
    const unsubSub = onSnapshot(subQ, (snap) => {
      if (!snap.empty) {
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by createdAt desc (latest first)
        subs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setSubmission(subs[0]);
      } else {
        setSubmission(null);
      }
      setLoading(false);
    }, () => setLoading(false));

    // 3. Requirements
    const reqQ = query(collection(db, 'requirements'));
    const unsubReq = onSnapshot(reqQ, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = all.filter(r => r.scope === 'global' && r.status === 'approved');
      setRequirements(active);
    });

    return () => { unsubStudent(); unsubSub(); unsubReq(); };
  }, []);

  // Show approval notification if newly approved
  useEffect(() => {
    if (studentData?.groupStatus === 'approved' && studentData?.hasSeenApprovalNotification === false) {
      Swal.fire({
        title: 'Group Approved!',
        text: 'Your research group has been approved by your adviser. You can now start uploading your requirements and manuscript.',
        icon: 'success',
        confirmButtonColor: '#7B1F35'
      });
      // Mark it as seen so it doesn't pop up again
      updateDoc(doc(db, 'students', studentData.uid), {
        hasSeenApprovalNotification: true
      }).catch(err => console.error("Error updating notification status", err));
    }
  }, [studentData]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const adviserName    = studentData?.invitedByName || adviserData?.displayName || 'Your Adviser';
  // invitedBy stores the adviser's email (used as their UID in the advisers collection)
  const adviserEmail   = adviserData?.email || studentData?.invitedBy || '';
  const adviserInitials = adviserName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const researchTitle  = studentData?.researchTitle || submission?.title || 'Your Research';
  const groupName      = studentData?.groupName || 'Your Group';

  const uploadedDocs   = submission?.uploadedDocs || [];
  const requiredCount  = requirements.length || 6;
  const uploadedCount  = uploadedDocs.length;
  const missingDocs    = requirements.filter(r => !uploadedDocs.includes(r.title)).map(r => r.title);

  const hasManuscript     = !!submission?.manuscriptUrl;
  const allDocsSubmitted  = uploadedCount >= requiredCount && uploadedCount > 0;
  const reviewStatus      = submission?.reviewStatus || '';
  const isApproved        = reviewStatus === 'approved' || reviewStatus === 'published';
  const isPublished       = reviewStatus === 'published';

  // Step: 1=account, 2=manuscript, 3=docs, 4=adviser approved, 5=published
  let currentStep = 1;
  if (hasManuscript) currentStep = 2;
  if (allDocsSubmitted) currentStep = 3;
  if (isApproved) currentStep = 4;
  if (isPublished) currentStep = 5;

  const progressPercent = Math.min(100, Math.round((currentStep / 5) * 100));

  const bannerTitle =
    currentStep === 1 ? 'Getting Started — Step 1 of 5' :
    currentStep === 2 ? 'In Progress — Step 2 of 5' :
    currentStep === 3 ? 'Documents Complete — Step 3 of 5' :
    currentStep === 4 ? 'Adviser Approved — Step 4 of 5' :
    'Published — Step 5 of 5 ✓';

  const bannerSub =
    currentStep === 1 ? 'Upload your manuscript to begin the process.' :
    currentStep === 2 ? `Submit your required documents. ${missingDocs.length} still missing.` :
    currentStep === 3 ? 'All documents submitted. Waiting for adviser review.' :
    currentStep === 4 ? 'Your adviser approved your work. Waiting for Dean to publish.' :
    'Your research is now live in the public archive!';

  // Stroke calculation for circular progress (circumference of r=42 is ~264)
  const circumference = 264;
  const strokeOffset  = circumference - (progressPercent / 100) * circumference;

  // ── Timeline step config ────────────────────────────────────────────────────
  const manuscriptDate = submission?.createdAt
    ? new Date(submission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const publishedDate = submission?.publishedAt
    ? new Date(submission.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // ── Send Message handler ─────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-chat'));
  };

  // ── Start New Research handler ───────────────────────────────────────────────
  const handleStartNewResearch = async (e) => {
    e.preventDefault();
    if (!newResearchTitle.trim() || !newGroupName.trim()) return;
    setIsSubmittingNewResearch(true);

    try {
      const user = auth.currentUser;
      const studentUid = user.uid;
      
      // 1. Create a new group document
      const groupData = {
        groupName: newGroupName.trim(),
        researchTitle: newResearchTitle.trim(),
        leaderUid: studentUid,
        leaderName: studentData.displayName,
        leaderEmail: studentData.email,
        program: studentData.course,
        members: studentData.groupMembers || [], // Could let them edit this later
        adviserUid: studentData.invitedBy, // keep same adviser email reference
        adviserName: studentData.invitedByName,
        category: newCategory,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'groups'), groupData);
      
      // 2. Update student profile
      await updateDoc(doc(db, 'students', studentUid), {
        researchTitle: newResearchTitle.trim(),
        groupName: newGroupName.trim(),
        groupStatus: 'pending'
      });
      
      // 3. Create a blank submission document for the new research
      const blankSubmission = {
        studentUid: studentUid,
        title: newResearchTitle.trim(),
        groupName: newGroupName.trim(),
        adviserName: studentData.invitedByName || '',
        adviserUid: studentData.invitedBy || '',
        category: newCategory,
        reviewStatus: 'pending',
        uploadedDocs: [],
        documents: {},
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'submissions'), blankSubmission);
      
      setShowNewResearchModal(false);
      setNewResearchTitle('');
      setNewGroupName('');
      setNewCategory('');
      
    } catch (error) {
      console.error('Error starting new research:', error);
      Swal.fire('Error', 'Failed to start new research. Please try again.', 'error');
    } finally {
      setIsSubmittingNewResearch(false);
    }
  };

  // ── Helper components ───────────────────────────────────────────────────────
  const DoneTag = () => (
    <span className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E8E3E] px-3 py-1 rounded-full text-[12px] font-bold border border-[#C6E5D0] shrink-0">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Done
    </span>
  );
  const PendingTag = () => (
    <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[12px] font-bold border border-gray-200 shrink-0">
      Pending
    </span>
  );
  const ActiveTag = () => (
    <span className="flex items-center gap-1.5 bg-[#7B1F35]/10 text-[#7B1F35] px-3 py-1 rounded-full text-[12px] font-bold border border-[#7B1F35]/20 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7B1F35]" /> In Progress
    </span>
  );

  const DoneNode = () => (
    <div className="w-8 h-8 rounded-full bg-[#7B1F35] text-white flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
  const ActiveNode = () => (
    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#7B1F35] flex items-center justify-center shrink-0 ring-[6px] ring-[#F3EADB] mt-4 z-10">
      <div className="w-2.5 h-2.5 rounded-full bg-[#7B1F35]" />
    </div>
  );
  const PendingNode = ({ num }) => (
    <div className="w-8 h-8 rounded-full bg-[#E8DFCB] text-gray-400 flex items-center justify-center shrink-0 border-[6px] border-[#F3EADB] mt-4 z-10">
      <span className="text-[10px] font-bold">{num}</span>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-[#FDF9ED] font-sans overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={activeTab || 'Progress'}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        studentName={studentName}
        initials={initials}
        profilePhotoUrl={profilePhotoUrl}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <PortalHeader 
          title="Progress" 
          initials={initials || getInitials(studentName)} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl}
        />

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pt-2">

            {/* PAGE TITLE */}
            <div>
              <h2 className="font-serif font-bold text-[28px] text-[#1A1A1A] mb-1">Submission Progress</h2>
              <p className="text-gray-500 text-[14px]">Track your research from upload to publication</p>
            </div>

            {/* STATUS BANNER */}
            {loading ? (
              <div className="w-full bg-[#7B1F35]/20 rounded-[20px] h-[120px] animate-pulse" />
            ) : (
              <div className="w-full bg-[#7B1F35] rounded-[20px] p-8 flex items-center justify-between shadow-md relative overflow-hidden text-white">
                <div className="relative z-10">
                  <p className="text-[11px] font-bold tracking-widest text-white/70 uppercase mb-2">Overall Status</p>
                  <h3 className="text-[28px] font-serif font-bold mb-1">{bannerTitle}</h3>
                  <p className="text-white/80 text-[14px]">{bannerSub}</p>
                </div>

                <div className="relative z-10 flex items-center justify-center shrink-0">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/20" />
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="4" fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="text-white drop-shadow-md transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-[20px] font-serif font-bold">{progressPercent}%</span>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/10 to-transparent" />
              </div>
            )}

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* LEFT COLUMN: TIMELINE */}
              <div className="lg:col-span-2 bg-[#F3EADB] rounded-2xl p-8 shadow-sm">
                <p className="text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-1">Full Timeline</p>
                <h3 className="font-serif font-bold text-[22px] text-[#1A1A1A] mb-8">Your Research Journey</h3>

                {submission?.adviserComments && (
                  <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg shadow-sm">
                    <h4 className="text-sm font-bold text-yellow-800 mb-1 flex items-center gap-2">
                      <span>💬</span> Adviser Feedback
                    </h4>
                    <p className="text-sm text-yellow-700 italic whitespace-pre-wrap">"{submission.adviserComments}"</p>
                  </div>
                )}

                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-[#E8DFCB] rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="relative pl-2">
                    {/* Vertical line */}
                    <div className="absolute left-[23px] top-6 bottom-12 w-[2px] bg-[#D8CEB9]" />

                    {/* Step 1: Account */}
                    <div className="relative flex gap-5 mb-5 z-10">
                      <DoneNode />
                      <div className="flex-1 bg-[#FCF9F2] border border-[#E8DFCB] rounded-xl p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-all">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">Account Approved</h4>
                          <p className="text-[12px] text-gray-500 mt-1 mb-2">{adviserName} (Adviser)</p>
                          <p className="text-[13px] text-gray-600 italic">Welcome to ARCHIVIO! You can now upload your research.</p>
                        </div>
                        <DoneTag />
                      </div>
                    </div>

                    {/* Step 2: Manuscript */}
                    <div className="relative flex gap-5 mb-5 z-10">
                      {currentStep >= 2 ? <DoneNode /> : <ActiveNode />}
                      <div className={`flex-1 rounded-xl p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-all ${
                        currentStep >= 2
                          ? 'bg-[#FCF9F2] border border-[#E8DFCB]'
                          : 'bg-[#FDF5F6] border border-[#E5B5BC] relative overflow-hidden'
                      }`}>
                        {currentStep < 2 && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#7B1F35]" />}
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">Manuscript Uploaded</h4>
                          <p className="text-[12px] text-gray-500 mt-1 mb-2">
                            {hasManuscript && manuscriptDate ? `Uploaded · ${manuscriptDate}` : 'Not yet uploaded'}
                          </p>
                          <p className="text-[13px] text-gray-600 italic">
                            {hasManuscript ? `"${researchTitle}" uploaded successfully.` : 'Upload your manuscript PDF to proceed.'}
                          </p>
                        </div>
                        {currentStep >= 2 ? <DoneTag /> : <ActiveTag />}
                      </div>
                    </div>

                    {/* Step 3: Supporting Documents */}
                    <div className="relative flex gap-5 mb-5 z-10">
                      {currentStep >= 3 ? <DoneNode /> : currentStep === 2 ? <ActiveNode /> : <PendingNode num={3} />}
                      <div className={`flex-1 rounded-xl p-5 flex items-start justify-between shadow-sm transition-all ${
                        currentStep >= 3
                          ? 'bg-[#FCF9F2] border border-[#E8DFCB] hover:shadow-md'
                          : currentStep === 2
                            ? 'bg-[#FDF5F6] border border-[#E5B5BC] relative overflow-hidden'
                            : 'bg-[#FCF9F2]/60 border border-[#E8DFCB] opacity-70'
                      }`}>
                        {currentStep === 2 && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#7B1F35]" />}
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">Supporting Documents</h4>
                          <p className="text-[12px] text-gray-500 mt-1 mb-2">
                            {uploadedCount} of {requiredCount} submitted
                          </p>
                          <p className={`text-[13px] italic font-medium ${currentStep >= 3 ? 'text-gray-600' : 'text-[#7B1F35]'}`}>
                            {currentStep >= 3
                              ? '✓ All requirements submitted.'
                              : missingDocs.length > 0
                                ? `Missing: ${missingDocs.slice(0, 3).join(', ')}${missingDocs.length > 3 ? ` +${missingDocs.length - 3} more` : ''}.`
                                : 'Awaiting requirements list.'}
                          </p>
                        </div>
                        {currentStep >= 3 ? <DoneTag /> : currentStep === 2 ? <ActiveTag /> : <PendingTag />}
                      </div>
                    </div>

                    {/* Step 4: Adviser Review */}
                    <div className={`relative flex gap-5 mb-5 z-10 ${currentStep < 3 ? 'opacity-60' : ''}`}>
                      {currentStep >= 4 ? <DoneNode /> : currentStep === 3 ? <ActiveNode /> : <PendingNode num={4} />}
                      <div className={`flex-1 rounded-xl p-5 flex items-start justify-between shadow-sm transition-all ${
                        currentStep >= 4
                          ? 'bg-[#FCF9F2] border border-[#E8DFCB] hover:shadow-md'
                          : currentStep === 3
                            ? 'bg-[#FDF5F6] border border-[#E5B5BC] relative overflow-hidden'
                            : 'bg-[#FCF9F2]/60 border border-[#E8DFCB]'
                      }`}>
                        {currentStep === 3 && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#7B1F35]" />}
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">Adviser Review</h4>
                          <p className="text-[12px] text-gray-500 mt-1 mb-2">
                            {adviserName} · {currentStep >= 4 ? 'Approved' : 'Awaiting documents'}
                          </p>
                          <p className="text-[13px] text-gray-600 italic">
                            {currentStep >= 4
                              ? 'Your adviser has approved your submission!'
                              : 'Your adviser will review once all documents are submitted.'}
                          </p>
                        </div>
                        {currentStep >= 4 ? <DoneTag /> : currentStep === 3 ? <ActiveTag /> : <PendingTag />}
                      </div>
                    </div>

                    {/* Step 5: Published */}
                    <div className={`relative flex gap-5 z-10 ${currentStep < 4 ? 'opacity-50' : ''}`}>
                      {isPublished ? <DoneNode /> : currentStep === 4 ? <ActiveNode /> : <PendingNode num={5} />}
                      <div className={`flex-1 rounded-xl p-5 flex items-start justify-between shadow-sm transition-all ${
                        isPublished
                          ? 'bg-[#FCF9F2] border border-[#E8DFCB] hover:shadow-md'
                          : currentStep === 4
                            ? 'bg-[#FDF5F6] border border-[#E5B5BC] relative overflow-hidden'
                            : 'bg-[#FCF9F2]/60 border border-[#E8DFCB]'
                      }`}>
                        {currentStep === 4 && !isPublished && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#7B1F35]" />}
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-[15px]">Published in Archive</h4>
                          <p className="text-[12px] text-gray-500 mt-1 mb-2">
                            {isPublished && publishedDate ? `Published · ${publishedDate}` : 'Public Access · Pending Dean approval'}
                          </p>
                          <p className="text-[13px] text-gray-600 italic">
                            {isPublished
                              ? '🎉 Your research is now searchable by the public!'
                              : 'After adviser approval, the Dean reviews for final publication.'}
                          </p>
                        </div>
                        {isPublished ? <DoneTag /> : currentStep === 4 ? <ActiveTag /> : <PendingTag />}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-1 flex flex-col gap-6">

                {/* Action Card — only show if not published */}
                {!isPublished && !loading && (
                  <div className="bg-[#FCF9F2] rounded-2xl p-6 shadow-sm border-t-4 border-[#CF3645] border-l border-r border-b border-[#E8DFCB]">
                    <p className="text-[10px] font-bold text-[#CF3645] tracking-widest uppercase mb-1">Action Needed</p>
                    {currentStep <= 2 ? (
                      <>
                        <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-2">
                          {hasManuscript ? 'Complete your documents' : 'Upload your manuscript'}
                        </h3>
                        <p className="text-[13px] text-gray-600 mb-6">
                          {hasManuscript && missingDocs.length > 0
                            ? `Upload ${missingDocs.slice(0, 2).join(' and ')} to move to adviser review.`
                            : hasManuscript
                              ? 'All documents submitted! Awaiting adviser review.'
                              : 'Start by uploading your research manuscript.'}
                        </p>
                        <button
                          onClick={() => setActiveTab && setActiveTab('Requirements')}
                          className="w-full bg-[#CF3645] hover:bg-[#B02A38] text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          Upload Now
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-2">Awaiting Review</h3>
                        <p className="text-[13px] text-gray-600">Your submission is complete. You will be notified when your adviser or dean takes action.</p>
                      </>
                    )}
                  </div>
                )}

                {/* Congrats card if published */}
                {isPublished && !loading && (
                  <>
                    <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border-t-4 border-[#7B1F35] border border-[#E8DFCB]">
                      <p className="text-4xl mb-3 text-center">🎉</p>
                      <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-2 text-center">Research Published!</h3>
                      <p className="text-[13px] text-gray-600 text-center">Your research is now live in the public archive and searchable by anyone.</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8DFCB]">
                      <p className="text-[10px] font-bold text-[#7B1F35] tracking-widest uppercase mb-2">Next Steps</p>
                      <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-2">Start Another Project</h3>
                      <p className="text-[13px] text-gray-600 mb-5">You can now begin uploading documents for a new research project under the same adviser.</p>
                      <button
                        onClick={() => setShowNewResearchModal(true)}
                        className="w-full bg-[#7B1F35] hover:bg-[#5D1627] text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Start New Research
                      </button>
                    </div>
                  </>
                )}

                {/* Adviser Card */}
                <div className="bg-[#F3EADB] rounded-2xl p-6 shadow-sm border border-[#E8DFCB]/50">
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-4">Your Adviser</p>
                  {loading ? (
                    <div className="animate-pulse flex gap-4 mb-5">
                      <div className="w-14 h-14 bg-[#E8DFCB] rounded-full" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-[#E8DFCB] rounded w-3/4" />
                        <div className="h-3 bg-[#E8DFCB] rounded w-1/2" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-[#7B1F35] rounded-full text-white font-bold text-xl flex items-center justify-center shrink-0">
                        {adviserInitials}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-[15px]">{adviserName}</h4>
                        <p className="text-[12px] text-gray-500 mb-0.5">Research Adviser</p>
                        {adviserEmail && (
                          <p className="text-[12px] text-gray-500 hover:text-[#7B1F35] cursor-pointer transition-colors truncate">{adviserEmail}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleSendMessage}
                    className="w-full bg-[#7B1F35] hover:bg-[#5D1627] text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Message
                  </button>
                </div>

                {/* Helpful Tips */}
                <div className="bg-[#FCF9F2] rounded-2xl p-6 shadow-sm border border-[#E8DFCB]/50">
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Helpful Tips</p>
                  <h3 className="font-serif font-bold text-[18px] text-[#1A1A1A] mb-5">Did you know?</h3>
                  <ul className="flex flex-col gap-4">
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">⏱️</span>
                      <p className="text-[13px] text-gray-600 leading-snug">Average review takes 5–7 days after all docs are submitted.</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">📝</span>
                      <p className="text-[13px] text-gray-600 leading-snug">You can update your manuscript anytime before adviser review starts.</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-[14px] mt-0.5">💬</span>
                      <p className="text-[13px] text-gray-600 leading-snug">Adviser feedback will appear in your dashboard notifications.</p>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── NEW RESEARCH MODAL ─────────────────────────────────────────────── */}
      {showNewResearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#4a1024] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-[11px] font-bold tracking-widest uppercase mb-0.5">New Project</p>
                <h3 className="text-white font-serif font-bold text-[18px]">Start New Research</h3>
              </div>
              <button
                onClick={() => setShowNewResearchModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleStartNewResearch} className="px-6 py-5 space-y-4">
              <p className="text-[13px] text-gray-600 mb-2">
                This will reset your dashboard to Step 1 so you can upload a new manuscript. 
                Your published research will remain safely in the archive and your Dashboard's Past Publications.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Research Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newResearchTitle}
                  onChange={e => setNewResearchTitle(e.target.value)}
                  required
                  placeholder="e.g. AI in Education..."
                  className="w-full border border-[#E8DFCB] bg-[#FDFAF5] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/30 focus:border-[#7a1f3d] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Group Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  required
                  placeholder="e.g. Group 4 - IT4A"
                  className="w-full border border-[#E8DFCB] bg-[#FDFAF5] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/30 focus:border-[#7a1f3d] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Research Category <span className="text-red-500">*</span></label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  required
                  className="w-full border border-[#E8DFCB] bg-[#FDFAF5] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/30 focus:border-[#7a1f3d] transition appearance-none"
                >
                  <option value="" disabled>Select a Category...</option>
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingNewResearch || !newResearchTitle.trim() || !newGroupName.trim() || !newCategory}
                  className="w-full bg-[#7a1f3d] hover:bg-[#4a1024] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingNewResearch ? 'Initializing...' : 'Confirm & Start New Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}