import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import DocumentViewerModal from '../../components/DocumentViewerModal';

export default function Requirements({ activePage, onNavigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [viewerState, setViewerState] = useState({ isOpen: false, url: '', title: '' });

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
    const sub = submissions.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || (s.title || s.researchTitle) === group.researchTitle)) || {};
    
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

  const totalPages = Math.max(1, Math.ceil(enrichedRows.length / itemsPerPage));
  const paginatedRows = enrichedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Compute Stats
  const totalGroups = groups.length;
  const completeCount = enrichedRows.filter(r => r.progressValue === 100).length;
  const inProgressCount = enrichedRows.filter(r => r.progressValue > 0 && r.progressValue < 100).length;
  const missingCountTotal = enrichedRows.filter(r => r.missingValue > 0).length;

  const stats = [
    { title: 'TOTAL GROUPS', value: totalGroups.toString(), sub: 'Across all advisers', bg: 'bg-white dark:bg-stone-800 border-l-4 border-stone-300 dark:border-stone-600' },
    { title: '100% COMPLETE', value: completeCount.toString(), sub: 'Ready / Published', bg: 'bg-white dark:bg-stone-800 border-l-4 border-emerald-600' },
    { title: 'IN PROGRESS', value: inProgressCount.toString(), sub: 'Partial completion', bg: 'bg-white dark:bg-stone-800 border-l-4 border-amber-500' },
    { title: 'HAS MISSING', value: missingCountTotal.toString(), sub: 'Action needed', bg: 'bg-white dark:bg-stone-800 border-l-4 border-red-500' },
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
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      <Sidebar activePage="requirements" onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="requirements" onMenuClick={() => {}} />
        
        <main className="flex-1 overflow-y-auto p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <SectionTitle sub="Monitor completion status across all research groups under your supervision">
              Requirements Tracking
            </SectionTitle>
          </div>

          {/* Stats Cards Row */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((card, idx) => (
                <Card glass={true} key={idx} className={`p-4 ${card.bg}`}>
                  <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">{card.title}</p>
                  <p className="text-2xl font-bold text-stone-800 dark:text-stone-200 my-1">{card.value}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{card.sub}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Table Area */}
          <Card glass={true} className="overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4">
                  <TableSkeleton rows={6} />
                </div>
              ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#4a1024] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px]">
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
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-stone-500 dark:text-stone-400">No approved groups found.</td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.no} className={`hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${row.missingValue > 0 ? 'bg-amber-50/30 dark:bg-amber-900/10' : row.progressValue === 100 ? 'bg-emerald-50/10 dark:bg-emerald-900/10' : ''}`}>
                        <td className="py-4 px-4 text-center text-stone-400 font-normal">{row.no}</td>
                        <td className="py-4 px-4 font-bold text-stone-800 dark:text-stone-200">{row.name}</td>
                        <td className="py-4 px-4 text-stone-600 dark:text-stone-400 max-w-xs truncate">{row.title}</td>
                        <td className="py-4 px-4 text-stone-700 dark:text-stone-300">{row.adviser}</td>
                        <td className="py-4 px-4">
                          <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 text-[10px] font-bold">
                            {row.subText}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${row.missingValue === 0 ? 'bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                            {row.missText}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-stone-800 dark:text-stone-200">{row.progress}</td>
                        <td className="py-4 px-4 text-center">
                          <PremiumButton 
                            onClick={() => handleView(row)}
                            variant="outline"
                            size="sm"
                          >
                            View
                          </PremiumButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
            
            <div className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-4 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-4">
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  Showing {paginatedRows.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, enrichedRows.length)} of {enrichedRows.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500 dark:text-stone-400">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#7a1f3d]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 rounded font-bold ${currentPage === page ? 'bg-[#4a1024] dark:bg-stone-950 text-white' : 'border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500'}`}
                  >
                    {page}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#4a1024] dark:bg-stone-950 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white text-stone-800 dark:bg-stone-800/20 dark:text-white rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800/30 transition text-lg"
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
                <div className="bg-[#f8ebef] dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024] dark:text-[#f8d070]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Documents</p>
                </div>
                <div className="bg-[#f8ebef] dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024] dark:text-[#f8d070]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Complete</p>
                </div>
                <div className="bg-[#f8ebef] dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#4a1024] dark:text-[#f8d070]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Pages</p>
                </div>
              </div>

              {selectedSubmission.abstract && (
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2">Abstract</h4>
                  <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 border border-stone-100 dark:border-stone-700/50">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {selectedSubmission.applicableReqs.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{req.icon}</span>
                          <div>
                            <p className={`text-sm font-bold ${isUploaded ? 'text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-400'}`}>{req.title}</p>
                            {isUploaded && docMeta ? (
                              <p className="text-xs text-stone-500 dark:text-stone-400">{docMeta.name} · {docMeta.size}</p>
                            ) : (
                              <p className="text-xs text-red-500 font-medium">Missing Document</p>
                            )}
                          </div>
                        </div>
                        {isUploaded && docMeta?.url && docMeta.url !== '#' && (
                          <button
                            onClick={() => setViewerState({
                              isOpen: true,
                              url: docMeta.url,
                              title: `${selectedSubmission.researchTitle} - ${req.title}`
                            })}
                            className="text-xs font-bold text-[#4a1024] dark:text-[#f8d070] bg-white dark:bg-stone-800 border border-[#4a1024]/20 dark:border-[#f8d070]/30 px-3 py-1.5 rounded-lg hover:bg-[#4a1024] dark:hover:bg-[#f8d070] hover:text-white dark:hover:text-stone-900 transition"
                          >
                            View File
                          </button>
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

      <DocumentViewerModal 
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ ...viewerState, isOpen: false })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
        role="dean"
      />
    </div>
  );
}
