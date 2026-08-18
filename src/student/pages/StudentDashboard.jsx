import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';
import StudentDashboardSkeleton from '../components/skeletons/StudentDashboardSkeleton';

// ── Progress step config ─────────────────────────────────────────────────────
const STEPS = ['Account', 'Manuscript', 'Documents', 'Review', 'Published'];

export default function StudentDashboard({ onLogout, studentName, initials, groupName, adviserName, onUploadClick, activeTab, setActiveTab, profilePhotoUrl, role, leaderUid }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real backend state
  const [studentData,   setStudentData]   = useState(null);
  const [submission,    setSubmission]     = useState(null);
  const [docsUploaded,  setDocsUploaded]   = useState([]);
  const [docsRequired,  setDocsRequired]   = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loadingData,   setLoadingData]    = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Navigate to Requirements page
  const goToRequirements = () => {
    if (setActiveTab) setActiveTab('Requirements');
  };

  // ── Fetch real data from Firestore ─────────────────────────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const lookupUid = (role === 'member' && leaderUid) ? leaderUid : uid;
    if (!uid) { setLoadingData(false); return; }

    setLoadingData(true);

    // 1. Real-time listener for student doc
    const studentQuery = query(collection(db, 'students'), where('uid', '==', uid));
    const unsubscribeStudent = onSnapshot(studentQuery, (snapshot) => {
      if (!snapshot.empty) {
        setStudentData(snapshot.docs[0].data());
      }
      setLoadingData(false);
    }, (err) => {
      console.error('Student real-time fetch error:', err);
      setLoadingData(false);
    });

    if (!lookupUid) return;

    // 2. Real-time listener for submission doc
    const submissionQuery = query(collection(db, 'submissions'), where('studentUid', '==', lookupUid));
    const unsubscribeSubmission = onSnapshot(submissionQuery, (snapshot) => {
      if (!snapshot.empty) {
        const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        subs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        const sub = subs[0];
        
        setAllSubmissions(subs);
        setSubmission(sub);
        setDocsUploaded(sub.uploadedDocs || []);
        setDocsRequired(sub.requiredDocs || [
          'Final Manuscript', 'Approval Sheet', 'Dataset Files',
          'Upload URL', 'Signature Page', 'Video Pitch'
        ]);
      } else {
        // No submission yet — fresh student
        setDocsRequired([
          'Final Manuscript', 'Approval Sheet', 'Dataset Files',
          'Upload URL', 'Signature Page', 'Video Pitch'
        ]);
        setDocsUploaded([]);
      }
    }, (err) => {
      console.error('Submission real-time fetch error:', err);
    });

    // 3. Real-time listener for groups
    const groupQuery = query(collection(db, 'groups'), where('leaderUid', '==', lookupUid));
    const unsubscribeGroups = onSnapshot(groupQuery, (snapshot) => {
      if (!snapshot.empty) {
        setMyGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setMyGroups([]);
      }
    });

    return () => {
      unsubscribeStudent();
      unsubscribeSubmission();
      unsubscribeGroups();
    };
  }, [role, leaderUid]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const displayName       = studentData?.displayName || studentName || 'Student';
  const displayGroupName  = studentData?.groupName   || groupName   || 'Your Group';
  const displayAdviser    = studentData?.invitedByName || adviserName || 'Your Adviser';
  const researchTitle     = studentData?.researchTitle || submission?.title || '—';

  const hasManuscript     = !!submission?.manuscriptUrl || docsUploaded.includes('Final Manuscript');
  const uploadedCount     = docsUploaded.length;
  const totalRequired     = docsRequired.length || 6;
  const missingDocs       = docsRequired.filter(d => !docsUploaded.includes(d));
  const missingCount      = missingDocs.length;
  const docsPercent       = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;

  // Determine current step
  // 0=none, 1=account created, 2=manuscript, 3=documents, 4=review, 5=published
  const hasAccount    = true; // always true if logged in
  const allDocsSubmitted = missingCount === 0 && uploadedCount > 0;
  
  // Real logic based on the actual Firestore fields used by Adviser & Dean systems
  const isReviewed    = submission?.reviewStatus === 'approved' || submission?.reviewStatus === 'published';
  const isPublished   = submission?.reviewStatus === 'published';

  let currentStep = 1; // Account always done
  if (hasManuscript) currentStep = 2;
  if (allDocsSubmitted) currentStep = 3;
  if (isReviewed)    currentStep = 4;
  if (isPublished)   currentStep = 5;

  const progressPercent = Math.round((Math.min(currentStep, STEPS.length - 1) / (STEPS.length - 1)) * 100);

  // What's next text
  const whatsNextTitle = currentStep === 1
    ? 'Upload your manuscript'
    : currentStep === 2
      ? `Upload your missing documents`
      : currentStep === 3
        ? 'Waiting for adviser review'
        : currentStep === 4
          ? 'Your research is under review'
          : 'Congratulations — research published!';

  const whatsNextDesc = currentStep === 1
    ? 'Start by uploading your research manuscript to proceed.'
    : currentStep === 2
      ? missingCount > 0
        ? `You're missing ${missingCount} document${missingCount > 1 ? 's' : ''} — ${missingDocs.slice(0, 2).join(' and ')}${missingCount > 2 ? ` and ${missingCount - 2} more` : ''}.`
        : 'All documents submitted! Awaiting review.'
    : currentStep === 3
      ? 'Your adviser will review your submission soon.'
      : currentStep === 4
        ? 'Your research has been approved and is being processed.'
        : 'Your research is now publicly available in the archive.';

  const showUploadButton = currentStep <= 2;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-white/20 rounded ${className}`} />
  );

  return (
    <div className="flex w-full min-h-screen bg-[#f5f0e6] dark:bg-stone-950 font-sans overflow-hidden transition-colors">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={activeTab || 'Dashboard'}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        studentName={displayName}
        initials={initials}
        profilePhotoUrl={profilePhotoUrl} role={role}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <PortalHeader 
          title="Dashboard" 
          initials={initials} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl} role={role}
        />

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6 pt-2">

            {/* ── WELCOME BANNER ────────────────────────────────── */}
            <div className="w-full bg-gradient-to-br from-[#7B1F35] to-[#5a1831] rounded-2xl flex flex-col relative overflow-hidden shadow-md border border-[#7B1F35]/20">
              <div className="absolute top-0 right-0 h-full w-[40%] bg-white/5 rounded-l-[100px] pointer-events-none" />
              <div className="absolute -top-10 right-20 h-[150%] w-[20%] bg-white/5 rounded-full pointer-events-none transform rotate-12" />

              <div className="p-8 flex justify-between items-start relative z-10">
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
                    {getGreeting()}, {(displayName && displayName !== 'STUDENT') ? displayName.split(' ')[0] : 'Student'} <span className="text-6xl animate-wave origin-bottom-right inline-block">👋</span>
                  </h1>
                  <p className="text-white/80 text-[15px]">Welcome back to your research portal</p>
                </div>

                <div className="text-right">
                  <p className="text-white/60 text-[10px] tracking-[0.2em] font-bold uppercase mb-1">Your Group</p>
                  {loadingData ? (
                    <div className="h-6 w-40 bg-white/20 rounded animate-pulse ml-auto mb-1" />
                  ) : (
                    <h3 className="text-white font-serif text-[22px] font-bold leading-tight">{displayGroupName}</h3>
                  )}
                  {loadingData ? (
                    <div className="h-4 w-32 bg-white/20 rounded animate-pulse ml-auto mt-1" />
                  ) : (
                    <>
                      <p className="text-white/80 text-[13px] mt-1">Adviser: {displayAdviser}</p>
                      {studentData?.adviserUid && (
                        <p className="text-white/60 text-[11px] mt-0.5 truncate max-w-[200px] ml-auto" title="Contact via Email">
                          ✉️ {studentData.adviserUid}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="w-full border-t border-white/10 px-8 py-4 relative z-10">
                {loadingData ? (
                  <div className="h-4 w-64 bg-white/20 rounded animate-pulse" />
                ) : (
                  <p className="text-white/80 text-[14px]">
                    Your submission is <span className="text-white font-bold">
                      {isPublished ? 'Published ✓'
                        : isReviewed ? 'Under Review · Step 4 of 5'
                        : allDocsSubmitted ? 'Documents Complete · Step 3 of 5'
                        : hasManuscript ? 'In Progress · Step 2 of 5'
                        : 'Getting Started · Step 1 of 5'}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* ── CONTENT AREA ─────────────────────────── */}
            {loadingData ? (
              <StudentDashboardSkeleton />
            ) : studentData?.groupStatus === 'pending' ? (
              <div className="bg-[#fff7ed] dark:bg-orange-950/30 border border-[#fed7aa] dark:border-orange-900/50 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm mt-4 transition-colors">
                <div className="w-20 h-20 bg-[#ffedd5] dark:bg-orange-900/50 text-[#c2410c] dark:text-orange-400 rounded-full flex items-center justify-center mb-5">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-serif text-[28px] font-bold text-[#9a3412] dark:text-orange-400 mb-2">Group Pending Approval</h3>
                <p className="text-[#9a3412]/80 dark:text-orange-400/80 text-[16px] max-w-md">
                  Your research adviser (<strong>{displayAdviser}</strong>) has not yet approved your group registration. 
                  You will be able to start your research and upload documents once approved.
                </p>
              </div>
            ) : (
              <>
                {/* ── WHAT'S NEXT CARD ──────────────────────────────── */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl flex items-center p-6 relative overflow-hidden shadow-sm mt-6 hover:shadow-md transition-shadow">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#C73D4C] to-[#7B1F35]" />

                  <div className="flex items-center gap-6 w-full">
                    <div className="w-[60px] h-[60px] bg-[#f8eef1] dark:bg-[#7B1F35]/20 rounded-xl flex items-center justify-center shrink-0 border border-[#f0dee5] dark:border-[#7B1F35]/40 transition-colors">
                      <svg className="w-8 h-8 text-[#7B1F35] dark:text-[#D05353]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>

                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-[#D05353] dark:text-[#D05353] tracking-widest uppercase mb-1">What's Next</p>
                      <h3 className="font-serif text-[22px] font-bold text-[#1A1A1A] dark:text-stone-100">{whatsNextTitle}</h3>
                      <p className="text-gray-600 dark:text-stone-400 text-[14px] mt-0.5">{whatsNextDesc}</p>
                    </div>

                    {showUploadButton && (
                      <button
                        onClick={goToRequirements}
                        className="bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white px-6 py-3 rounded-full text-[14px] font-bold flex items-center gap-2 hover:bg-[#63182a] dark:hover:bg-[#5a1831] transition-colors shrink-0 shadow-sm"
                      >
                        Upload Documents
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── YOUR PROGRESS CARD ────────────────────────────── */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl p-8 shadow-sm mt-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-end mb-8">
                    <h3 className="font-serif text-[22px] font-bold text-[#1A1A1A] dark:text-stone-100">Your Progress</h3>
                    <span className="text-[#7B1F35] dark:text-[#D05353] font-bold text-[14px]">{progressPercent}% complete</span>
                  </div>

                  <div className="relative pt-2 pb-6 px-4">
                    <div className="absolute top-5 left-0 w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full" />
                    <div
                      className="absolute top-5 left-0 h-3 bg-[#7B1F35] dark:bg-[#7B1F35] rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(2, (Math.min(currentStep, STEPS.length - 1) / (STEPS.length - 1)) * 100)}%` }}
                    />
                    <div className="relative flex justify-between z-10 text-[12px] font-bold">
                      {STEPS.map((step, idx) => {
                        const isDone    = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        const isPending = idx > currentStep;
                        return (
                          <div
                            key={step}
                            className={`flex flex-col items-center gap-3 w-20 ${idx === 0 ? '-ml-4' : ''} ${idx === STEPS.length - 1 ? '-mr-4' : ''}`}
                          >
                            <div className={`w-[34px] h-[34px] rounded-full ring-[6px] ring-white dark:ring-stone-900 flex items-center justify-center transition-all duration-500 ${
                              isDone
                                ? 'bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white shadow-md'
                                : isCurrent
                                  ? 'bg-white dark:bg-stone-900 border-[5px] border-[#7B1F35] dark:border-[#7B1F35] shadow-md'
                                  : 'bg-white dark:bg-stone-900 border-[5px] border-stone-200 dark:border-stone-700'
                            }`}>
                              {isDone && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={isPending ? 'text-gray-400 dark:text-stone-500 font-medium' : 'text-[#1A1A1A] dark:text-stone-300'}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── BOTTOM GRID CARDS ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Manuscript Card */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-stone-50 to-white dark:from-stone-800 dark:to-stone-900 px-6 py-4 rounded-t-xl flex justify-between items-center border-b border-stone-100 dark:border-stone-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-gray-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h4 className="font-serif text-[18px] font-bold text-[#1A1A1A] dark:text-stone-100">Manuscript</h4>
                  </div>
                  {isPublished ? (
                    <span className="bg-[#1E8E3E] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">✓ Published</span>
                  ) : hasManuscript ? (
                    <span className="bg-[#7B1F35] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">✓ Uploaded</span>
                  ) : (
                    <span className="bg-[#CF3645] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">Not Uploaded</span>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  {hasManuscript ? (
                    <>
                      <h5 className="text-[#1A1A1A] dark:text-stone-100 font-bold text-[16px] mb-1">{researchTitle}</h5>
                      <p className="text-gray-500 dark:text-stone-400 text-[13px] mb-8">
                        {submission?.manuscriptVersion ? `Version ${submission.manuscriptVersion}` : 'Uploaded'} ·{' '}
                        {submission?.manuscriptUploadedAt
                          ? new Date(submission.manuscriptUploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Recently'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h5 className="text-[#1A1A1A] dark:text-stone-100 font-bold text-[16px] mb-1">No manuscript uploaded yet</h5>
                      <p className="text-gray-500 dark:text-stone-400 text-[13px] mb-8">Upload your final research manuscript to get started.</p>
                    </>
                  )}

                  <div className="mt-auto flex items-center gap-3">
                    {hasManuscript ? (
                      <>
                        <button
                          onClick={goToRequirements}
                          className="border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 text-[#1A1A1A] dark:text-stone-300 text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={goToRequirements}
                          className="bg-[#7B1F35] dark:bg-stone-800 hover:bg-[#63182a] dark:hover:bg-stone-700 text-white dark:text-stone-200 text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm"
                        >
                          View Manuscript
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={goToRequirements}
                        className="bg-[#7B1F35] dark:bg-[#7B1F35] hover:bg-[#63182a] dark:hover:bg-[#5a1831] text-white dark:text-white text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm"
                      >
                        Upload Manuscript
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents Card */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-stone-50 to-white dark:from-stone-800 dark:to-stone-900 px-6 py-4 rounded-t-xl flex justify-between items-center border-b border-stone-100 dark:border-stone-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-gray-500 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h4 className="font-serif text-[18px] font-bold text-[#1A1A1A] dark:text-stone-100">Documents</h4>
                  </div>
                  {loadingData ? (
                    <div className="h-7 w-24 bg-stone-200 dark:bg-stone-800 rounded-full animate-pulse" />
                  ) : missingCount > 0 ? (
                    <span className="bg-[#CF3645] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                      {missingCount} Missing
                    </span>
                  ) : uploadedCount === 0 ? (
                    <span className="bg-stone-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                      None Uploaded
                    </span>
                  ) : (
                    <span className="bg-[#1E8E3E] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                      ✓ Complete
                    </span>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  {loadingData ? (
                    <div className="h-8 w-40 bg-stone-200 dark:bg-stone-800 rounded animate-pulse mb-4" />
                  ) : (
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="font-serif text-[28px] font-bold text-[#7B1F35] dark:text-[#D05353]">{uploadedCount}</span>
                      <span className="font-serif text-[20px] text-gray-400 dark:text-stone-500">/ {totalRequired}</span>
                      <span className="text-[13px] text-gray-600 dark:text-stone-400 ml-1">documents submitted</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-6">
                    {loadingData ? (
                      <>
                        <div className="h-7 w-28 bg-stone-200 dark:bg-stone-800 rounded-full animate-pulse" />
                        <div className="h-7 w-24 bg-stone-200 dark:bg-stone-800 rounded-full animate-pulse" />
                      </>
                    ) : missingCount === 0 && uploadedCount === 0 ? (
                      <p className="text-[13px] text-gray-500 dark:text-stone-400">No documents uploaded yet. Go to Requirements to upload.</p>
                    ) : missingCount > 0 ? (
                      missingDocs.map((doc) => (
                        <span key={doc} className="bg-[#F4DEE5] dark:bg-red-900/30 border border-[#F4DEE5] dark:border-red-900/50 text-[#CF3645] dark:text-red-400 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {doc}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] text-[#1E8E3E] dark:text-green-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-[#1E8E3E] dark:bg-green-400 rounded-full" />
                        All documents submitted!
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <button
                      onClick={goToRequirements}
                      className="border border-[#D6CBB8] dark:border-stone-600 hover:bg-black/5 dark:hover:bg-white/5 text-[#1A1A1A] dark:text-stone-300 text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors"
                    >
                      View All
                    </button>
                    {missingCount > 0 && (
                      <button
                        onClick={goToRequirements}
                        className="bg-[#CF3645] dark:bg-red-500 hover:bg-[#A92A36] dark:hover:bg-red-600 text-white dark:text-white text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm"
                      >
                        Upload Missing
                      </button>
                    )}
                    {uploadedCount === 0 && !loadingData && (
                      <button
                        onClick={goToRequirements}
                        className="bg-[#7B1F35] dark:bg-[#7B1F35] hover:bg-[#63182a] dark:hover:bg-[#5a1831] text-white dark:text-white text-[13px] font-bold px-6 py-2.5 rounded-full transition-colors shadow-sm"
                      >
                        Start Uploading
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── PAST PUBLICATIONS ──────────────────────────────────────── */}
              {allSubmissions.filter(s => s.reviewStatus === 'published').length > 0 && (
                <div className="lg:col-span-3 mt-6">
                  <h3 className="font-serif text-[22px] font-bold text-[#1A1A1A] dark:text-stone-100 mb-4">Past Publications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allSubmissions
                      .filter(s => s.reviewStatus === 'published')
                      .map(pub => {
                        const group = myGroups.find(g => g.groupName === pub.groupName || g.researchTitle === (pub.researchTitle || pub.title));
                        const displayTitle = group?.researchTitle || pub.researchTitle || pub.title || 'Research Title';
                        const displayGroup = group?.groupName || pub.groupName || 'Group Name';
                        
                        return (
                        <div key={pub.id} className="bg-white dark:bg-stone-900 border border-[#E8DFCB] dark:border-stone-800 rounded-xl p-5 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-[#1E8E3E]/10 dark:bg-green-900/30 text-[#1E8E3E] dark:text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#1E8E3E]/20 dark:border-green-900/50">
                              PUBLISHED
                            </span>
                            {pub.publishedAt && (
                              <span className="text-[12px] text-gray-500 dark:text-stone-400 font-medium">
                                {new Date(pub.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif font-bold text-[#1A1A1A] dark:text-stone-100 text-[16px] leading-snug mb-1">
                            {displayTitle}
                          </h4>
                          <p className="text-[13px] text-gray-600 dark:text-stone-400 mb-4">{displayGroup}</p>
                          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-stone-800 flex gap-2">
                            {pub.manuscriptUrl && (
                              <a
                                href={pub.manuscriptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#7B1F35] dark:text-[#D05353] text-[12px] font-bold hover:underline flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View Manuscript
                              </a>
                            )}
                          </div>
                        </div>
                      )})}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
