import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const CATEGORY_COLORS = {
  ML: 'bg-purple-100 text-purple-700',
  IoT: 'bg-teal-100 text-teal-700',
  Security: 'bg-amber-100 text-amber-700',
  Mobile: 'bg-blue-100 text-blue-700',
  Web: 'bg-emerald-100 text-emerald-700',
  Data: 'bg-orange-100 text-orange-700',
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const ACTION_STYLES = {
  View: 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700',
  Publish: 'bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] text-white hover:bg-[#5a162d] dark:hover:bg-[#b09230]',
  Review: 'bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] text-white hover:bg-[#5a162d] dark:hover:bg-[#b09230]',
};

const RECORDS_PER_PAGE = 10;

export default function ResearchRecords() {
  const navigate = useNavigate();
  const { deanData } = useUser();
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterAdviser, setFilterAdviser] = useState('All Advisers');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [records, setRecords] = useState([]);
  const [requirements, setRequirements] = useState([]);

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Unique filter options based on dynamic data
  const [allYears, setAllYears] = useState(['All Years']);
  const [allAdvisers, setAllAdvisers] = useState(['All Advisers']);
  const [allStatuses, setAllStatuses] = useState(['All Statuses']);
  const [allCategories, setAllCategories] = useState(['All Categories']);

  useEffect(() => {
    if (!deanData) return;
    const deanDept = deanData.department || '';

    // Listen to groups — filter by department
    const groupsQuery = query(collection(db, 'groups'), where('status', '==', 'approved'));
    const unsubGroups = onSnapshot(groupsQuery, (groupsSnapshot) => {
      const allGroupsData = groupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // DEPARTMENT FILTER
      const groupsData = allGroupsData.filter(g => g.department === deanDept);
      
      // Listen to submissions
      const unsubSubs = onSnapshot(collection(db, 'submissions'), (subsSnapshot) => {
        const subsData = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Listen to requirements
        const unsubReqs = onSnapshot(collection(db, 'requirements'), (reqsSnapshot) => {
          const allReqs = reqsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const activeReqs = allReqs.filter(r => r.status === 'approved');
          setRequirements(activeReqs);

          // Merge them
          const mergedRecords = groupsData.map((g, index) => {
            const sub = subsData.find(s => s.studentUid === g.leaderUid && (s.groupName === g.groupName || (s.title || s.researchTitle) === g.researchTitle)) || {};
            const status = sub.reviewStatus || 'pending';
            const submittedDate = sub.submittedDate || sub.createdAt || g.createdAt || '';
            const year = submittedDate ? new Date(submittedDate).getFullYear().toString() : new Date().getFullYear().toString();
            const category = g.category || sub.category || 'Uncategorized';
            const action = status === 'reviewed' ? 'Publish' : 'View';

            // Find requirements applicable to this group (global + their adviser's)
            const applicableReqs = activeReqs.filter(r => 
              r.scope === 'global' || 
              (r.scope === 'adviser' && r.adviserUid === g.adviserUid)
            );

            return {
              id: String(index + 1).padStart(3, '0'),
              rawId: sub.id || g.id,
              title: g.researchTitle || sub.title || 'Untitled',
              group: g.groupName || 'Unknown Group',
              adviser: g.adviserName || g.adviserUid || 'Unknown',
              category,
              year,
              status,
              action,
              originalSub: sub,
              originalGroup: g,
              applicableReqs
            };
          });

          setRecords(mergedRecords);
          
          // Update filter options
          const years = [...new Set(mergedRecords.map(r => r.year))].filter(Boolean).sort().reverse();
          setAllYears(['All Years', ...years]);
          
          const advisers = [...new Set(mergedRecords.map(r => r.adviser))].filter(Boolean).sort();
          setAllAdvisers(['All Advisers', ...advisers]);
          
          const statuses = [...new Set(mergedRecords.map(r => r.status))].filter(Boolean).sort();
          setAllStatuses(['All Statuses', ...statuses]);

          const categories = [...new Set(mergedRecords.map(r => r.category))].filter(Boolean).sort();
          setAllCategories(['All Categories', ...categories]);

          setLoading(false);
        });
        
        return () => unsubReqs();
      });

      return () => unsubSubs();
    });

    return () => unsubGroups();
  }, [deanData]);

  // ---- Filter logic ----
  const filtered = records.filter((r) => {
    const matchSearch =
      search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.group.toLowerCase().includes(search.toLowerCase()) ||
      r.adviser.toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 'All Years' || r.year === filterYear;
    const matchAdviser = filterAdviser === 'All Advisers' || r.adviser === filterAdviser;
    const matchStatus = filterStatus === 'All Statuses' || r.status === filterStatus;
    const matchCategory = filterCategory === 'All Categories' || r.category === filterCategory;
    return matchSearch && matchYear && matchAdviser && matchStatus && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'reviewed': return 'Reviewed';
      case 'approved': return 'Approved';
      case 'published': return 'Published';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleView = (record) => {
    if (record.originalSub && record.originalSub.id) {
      const requiredCount = record.applicableReqs.length;
      const uploadedCount = record.originalSub.uploadedDocs?.length || 0;
      const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

      setSelectedSubmission({
        ...record.originalSub,
        groupName: record.group,
        researchTitle: record.title,
        leaderName: record.originalGroup.leaderName,
        members: record.originalGroup.members,
        uploadedCount,
        requiredCount,
        completionPercent,
        applicableReqs: record.applicableReqs
      });
      setShowReviewModal(true);
    } else {
      Swal.fire('No Submission', 'This group has not started their submission yet.', 'info');
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar activePage="research-records" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header activePage="research-records" onMenuClick={() => {}} />

        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f0e6] dark:bg-stone-900 transition-colors">

          {/* ===== PAGE TITLE ===== */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#4a1024] dark:text-[#9e2752] tracking-tight">Research Records</h1>
              <p className="text-xs text-stone-400 mt-1 font-medium">
                All uploaded research within the College of IT &nbsp;·&nbsp; {records.length} total records
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
              <span>📤</span> Export CSV
            </button>
          </div>

          {/* ===== TABLE CARD ===== */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700/80 shadow-sm overflow-hidden">

            {/* ---- Filter Bar ---- */}
            <div className="p-4 border-b border-stone-100 bg-stone-50 dark:bg-stone-800/50">
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center text-stone-400 text-xs pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search title, group, adviser..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 outline-none focus:ring-1 focus:ring-[#7a1f3d] dark:focus:ring-[#f8d070] focus:border-[#7a1f3d] dark:focus:border-[#f8d070]"
                  />
                </div>

                {/* Filters */}
                {[
                  { value: filterCategory, setter: setFilterCategory, options: allCategories },
                  { value: filterYear, setter: setFilterYear, options: allYears },
                  { value: filterAdviser, setter: setFilterAdviser, options: allAdvisers },
                  { value: filterStatus, setter: setFilterStatus, options: allStatuses },
                ].map(({ value, setter, options }, idx) => (
                  <div key={idx} className="relative">
                    <select
                      value={value}
                      onChange={handleFilterChange(setter)}
                      className="appearance-none bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#7a1f3d] dark:focus:ring-[#f8d070] focus:border-[#7a1f3d] dark:focus:border-[#f8d070] cursor-pointer"
                    >
                      {options.map((o) => <option key={o} value={o}>{formatStatus(o)}</option>)}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] pointer-events-none">▼</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Table ---- */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="mt-2">
                  <TableSkeleton rows={5} />
                </div>
              ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Adviser</th>
                    <th className="py-3 px-4 text-center">Category</th>
                    <th className="py-3 px-4 text-center">Year</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-stone-400 text-sm font-medium">
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((record) => (
                      <tr
                        key={record.id}
                        className={`transition-colors hover:bg-stone-50 dark:hover:bg-stone-700 ${record.adviserSelf ? 'border-l-2 border-l-[#f8d070]' : ''}`}
                      >
                        {/* # */}
                        <td className="py-3.5 px-4 text-stone-400 font-bold">{record.id}</td>

                        {/* Title */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-[13px]">{record.title}</span>
                        </td>

                        {/* Group */}
                        <td className="py-3.5 px-4 text-stone-500 dark:text-stone-400 font-medium">{record.group}</td>

                        {/* Adviser */}
                        <td className="py-3.5 px-4">
                          <span className={record.adviserSelf ? 'font-bold text-[#7a1f3d] dark:text-[#f8d070]' : 'text-stone-600 dark:text-stone-400 font-medium'}>
                            {record.adviser}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${CATEGORY_COLORS[record.category] || 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400'}`}>
                            {record.category}
                          </span>
                        </td>

                        {/* Year */}
                        <td className="py-3.5 px-4 text-center text-stone-500 dark:text-stone-400 font-medium">{record.year}</td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[record.status] || 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400'}`}>
                            {formatStatus(record.status)}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-sm ${ACTION_STYLES[record.action] || ACTION_STYLES.View}`}
                            onClick={() => {
                              if (record.action === 'Publish') {
                                navigate('/dean/publish-queue');
                              } else {
                                handleView(record);
                              }
                            }}
                          >
                            {record.action}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* ---- Pagination Footer ---- */}
            <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50 dark:bg-stone-800/30">
              <p className="text-[11px] text-stone-400 font-medium">
                Showing {paginated.length} of {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors
                      ${currentPage === page
                        ? 'bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] text-white shadow-sm'
                        : 'border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#4a1024] dark:bg-stone-950 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white dark:bg-stone-800/20 rounded-full flex items-center justify-center hover:bg-white dark:bg-stone-800/30 transition text-lg"
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
                  <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 border border-stone-100">
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
                          <a
                            href={docMeta.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#4a1024] dark:text-[#f8d070] bg-white dark:bg-stone-800 border border-[#4a1024]/20 dark:border-[#f8d070]/30 px-3 py-1.5 rounded-lg hover:bg-[#4a1024] dark:hover:bg-[#f8d070] hover:text-white dark:hover:text-stone-900 transition"
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
