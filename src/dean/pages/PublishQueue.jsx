import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import { useUser } from '../context/UserContext';

export default function PublishQueue({ activePage, onNavigate }) {
  const { deanData } = useUser();
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [adviserFilter, setAdviserFilter] = useState('All Advisers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for deanData to load so we know the Dean's department
    if (!deanData?.department) return;
    const deanDept = deanData.department;

    // 1. Fetch Submissions
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(all);
    });

    // 2. Fetch Groups — filter by department
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(all.filter(g => g.department === deanDept));
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

  // Items awaiting publication
  const awaitingPublication = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'reviewed');
  
  // Eligible / Blocked (Though approved items should be 100%, we compute it strictly)
  const eligibleItems = awaitingPublication.filter(s => s.completionPercent === 100);
  const blockedItems = awaitingPublication.filter(s => s.completionPercent < 100);

  const eligibleCount = eligibleItems.length;
  const blockedCount = blockedItems.length;

  // Unique advisers for dropdown
  const uniqueAdvisers = ['All Advisers', ...new Set(awaitingPublication.map(s => s.adviserName).filter(Boolean))];

  const filteredQueue = eligibleItems.filter(item => 
    adviserFilter === 'All Advisers' || item.adviserName === adviserFilter
  );

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
              await fetch('http://localhost:3001/api/send-status-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: item.leaderEmail,
                  studentName: item.leaderName || 'Student',
                  title: item.researchTitle,
                  status: 'published'
                })
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
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#4a1024] dark:text-[#9e2752] tracking-tight">Publish Queue</h1>
              <p className="text-xs text-stone-400 mt-1 font-medium">
                Approved manuscripts ready for publication. 100% requirements completion required.
              </p>
            </div>
            <button
              onClick={handlePublishAll}
              disabled={eligibleCount === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors whitespace-nowrap ${eligibleCount > 0 ? 'bg-[#c9a227] hover:bg-[#b8911f] text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
            >
              🌐 Publish All Eligible ({eligibleCount})
            </button>
          </div>

          {/* ===== TWO-COLUMN LAYOUT ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ===== LEFT: AWAITING PUBLICATION LIST ===== */}
            <div className="col-span-2 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700/80 shadow-sm overflow-hidden flex flex-col">

              {/* Card Header */}
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white dark:bg-stone-800 z-10 sticky top-0">
                <div>
                  <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">Awaiting Publication</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">Approved → Ready to Publish</p>
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
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-bold text-[#7a1f3d] dark:text-[#f8d070] tracking-widest uppercase">Loading Submissions...</p>
                  </div>
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
                      <div className="flex items-center gap-2 shrink-0 mt-3 sm:mt-0">
                        <button 
                          onClick={() => handlePreview(item)}
                          className="px-4 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handlePublish(item)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] rounded-lg hover:bg-[#5a162d] dark:hover:bg-[#b09230] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          🌐 Publish
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="flex flex-col gap-5">

              {/* Status Flow Card */}
              <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700/80 shadow-sm p-6">
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
              </div>

              {/* Publish Summary Card */}
              <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700/80 shadow-sm p-6">
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

                <button
                  onClick={handlePublishAll}
                  disabled={eligibleCount === 0}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors ${eligibleCount > 0 ? 'bg-[#c9a227] hover:bg-[#b8911f] text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                >
                  🌐 Publish {eligibleCount} Eligible Papers
                </button>
              </div>

            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
