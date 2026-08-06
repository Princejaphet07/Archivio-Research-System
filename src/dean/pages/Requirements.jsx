import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function Requirements({ activePage, onNavigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    // 1. Listen to all groups
    const groupsQuery = query(collection(db, 'groups'), where('status', '==', 'approved'));
    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Listen to all submissions
    const submissionsQuery = query(collection(db, 'submissions'));
    const unsubSubs = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Listen to active requirements
    const reqQuery = query(collection(db, 'requirements'));
    const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeReqs = allReqs.filter(r => r.status === 'approved');
      setRequirements(activeReqs);
      setLoading(false);
    });

    return () => {
      unsubGroups();
      unsubSubs();
      unsubReqs();
    };
  }, []);

  // Compute enriched rows
  const enrichedRows = groups.map((group, index) => {
    const sub = submissions.find(s => s.studentUid === group.leaderUid) || {};
    
    // Find requirements applicable to this group (global + their adviser's)
    const applicableReqs = requirements.filter(r => 
      r.scope === 'global' || 
      (r.scope === 'adviser' && r.adviserUid === group.adviserUid)
    );
    
    const requiredCount = applicableReqs.length;
    const uploadedCount = sub.uploadedDocs?.length || 0;
    const missingCount = requiredCount > 0 ? requiredCount - uploadedCount : 0;
    const progress = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;
    
    return {
      no: String(index + 1).padStart(2, '0'),
      name: group.groupName || 'Unknown Group',
      title: group.researchTitle || 'Untitled',
      adviser: group.adviserName || group.adviserUid || 'Unknown',
      subText: `${uploadedCount} submitted`,
      missText: missingCount === 0 ? 'None' : `${missingCount} Missing`,
      progress: `${progress}%`,
      progressValue: progress,
      missingValue: missingCount,
      sub,
      group,
      applicableReqs
    };
  });

  // Compute Stats
  const totalGroups = groups.length;
  const completeCount = enrichedRows.filter(r => r.progressValue === 100).length;
  const inProgressCount = enrichedRows.filter(r => r.progressValue > 0 && r.progressValue < 100).length;
  const missingCountTotal = enrichedRows.filter(r => r.missingValue > 0).length;

  const stats = [
    { title: 'TOTAL GROUPS', value: totalGroups.toString(), sub: 'Across all advisers', bg: 'bg-white border-l-4 border-stone-300' },
    { title: '100% COMPLETE', value: completeCount.toString(), sub: 'Ready / Published', bg: 'bg-white border-l-4 border-emerald-600' },
    { title: 'IN PROGRESS', value: inProgressCount.toString(), sub: 'Partial completion', bg: 'bg-white border-l-4 border-amber-500' },
    { title: 'HAS MISSING', value: missingCountTotal.toString(), sub: 'Action needed', bg: 'bg-white border-l-4 border-red-500' },
  ];

  const handleView = (row) => {
    // Only open if there is a submission doc
    if (row.sub && row.sub.id) {
      setSelectedSubmission({
        ...row.sub,
        groupName: row.name,
        researchTitle: row.title,
        leaderName: row.group.leaderName,
        members: row.group.members,
        uploadedCount: row.sub.uploadedDocs?.length || 0,
        requiredCount: row.applicableReqs.length,
        completionPercent: row.progressValue,
        applicableReqs: row.applicableReqs
      });
      setShowReviewModal(true);
    } else {
      Swal.fire('No Submission', 'This group has not started their submission yet.', 'info');
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        <Header activePage={activePage} onMenuClick={() => {}} />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Requirements Tracking</h1>
            <p className="text-xs text-stone-500 mt-0.5">Monitor completion status across all research groups under your supervision</p>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((card, idx) => (
              <div key={idx} className={`p-4 rounded-xl shadow-sm border border-stone-200/60 ${card.bg}`}>
                <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">{card.title}</p>
                <p className="text-2xl font-bold text-stone-800 my-1">{card.value}</p>
                <p className="text-xs text-stone-500">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#4a1024] text-white font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">No.</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Research Title</th>
                    <th className="py-3.5 px-4">Adviser</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Missing</th>
                    <th className="py-3.5 px-4 text-center">Completion</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                          <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Tracking Data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : enrichedRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-stone-500">No approved groups found.</td>
                    </tr>
                  ) : (
                    enrichedRows.map((row) => (
                      <tr key={row.no} className={`hover:bg-stone-50/80 transition-colors ${row.missingValue > 0 ? 'bg-amber-50/30' : row.progressValue === 100 ? 'bg-emerald-50/10' : ''}`}>
                        <td className="py-4 px-4 text-center text-stone-400 font-normal">{row.no}</td>
                        <td className="py-4 px-4 font-bold text-stone-800">{row.name}</td>
                        <td className="py-4 px-4 text-stone-600 max-w-xs truncate">{row.title}</td>
                        <td className="py-4 px-4 text-stone-700">{row.adviser}</td>
                        <td className="py-4 px-4">
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 text-[10px] font-bold">
                            {row.subText}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${row.missingValue === 0 ? 'bg-stone-50 text-stone-500 border-stone-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {row.missText}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-stone-800">{row.progress}</td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => handleView(row)}
                            className="px-4 py-1.5 text-[#4a1024] border border-[#4a1024] rounded-lg text-xs font-bold hover:bg-[#4a1024] hover:text-white transition-all shadow-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>Showing 1–{enrichedRows.length} of {enrichedRows.length} groups</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-400">‹</button>
                <button className="px-2.5 py-1 bg-[#4a1024] text-white rounded font-bold">1</button>
                <button className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50">›</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#4a1024] text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition text-lg"
              >
                ✕
              </button>
              <p className="text-white/70 text-xs tracking-widest uppercase font-bold mb-1">Dean Inspection</p>
              <h2 className="text-2xl font-serif font-bold">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 text-sm mt-1">
                Group: {selectedSubmission.groupName} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#f8ebef] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-stone-500 mt-1">Documents</p>
                </div>
                <div className="bg-[#f8ebef] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-stone-500 mt-1">Complete</p>
                </div>
                <div className="bg-[#f8ebef] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-stone-500 mt-1">Pages</p>
                </div>
              </div>

              {selectedSubmission.abstract && (
                <div>
                  <h4 className="font-bold text-stone-900 text-sm mb-2">Abstract</h4>
                  <p className="text-stone-600 text-sm leading-relaxed bg-stone-50 rounded-lg p-4 border border-stone-100">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-stone-900 text-sm mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {selectedSubmission.applicableReqs.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-red-50/50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{req.icon}</span>
                          <div>
                            <p className={`text-sm font-bold ${isUploaded ? 'text-stone-800' : 'text-stone-500'}`}>{req.title}</p>
                            {isUploaded && docMeta ? (
                              <p className="text-xs text-stone-500">{docMeta.name} · {docMeta.size}</p>
                            ) : (
                              <p className="text-xs text-red-500 font-medium">Missing Document</p>
                            )}
                          </div>
                        </div>
                        {isUploaded && docMeta?.url && docMeta.url !== '#' && (
                          <a
                            href={docMeta.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#4a1024] bg-white border border-[#4a1024]/20 px-3 py-1.5 rounded-lg hover:bg-[#4a1024] hover:text-white transition"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
