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
import { Search, ChevronDown, Eye, X, Check, Paperclip } from 'lucide-react';

const formatStatus = (status) => {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'in progress':
    case 'pending':
      return 'In Progress';
    case 'dean_revision':
    case 'revision':
      return 'Revision';
    case 'reviewed':
    case 'approved':
      return 'Approved';
    case 'published':
      return 'Published';
    default:
      return 'In Progress';
  }
};

export default function Requirements({ activePage, onNavigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [filterAdviser, setFilterAdviser] = useState('All Advisers');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  
  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [viewerState, setViewerState] = useState({ isOpen: false, url: '', title: '' });

  useEffect(() => {
    // 1. Listen to all groups
    const groupsQuery = query(collection(db, 'groups'), where('status', '==', 'approved'));
    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('Requirements groups listener notice:', err.message);
    });

    // 2. Listen to all submissions
    const submissionsQuery = query(collection(db, 'submissions'));
    const unsubSubs = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('Requirements submissions listener notice:', err.message);
    });

    // 3. Listen to active requirements
    const reqQuery = query(collection(db, 'requirements'));
    const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeReqs = allReqs.filter(r => r.status === 'approved');
      setRequirements(activeReqs);
      setLoading(false);
    }, (err) => {
      console.warn('Requirements active listener notice:', err.message);
      setLoading(false);
    });

    // 4. Listen to students
    const studentsQuery = query(collection(db, 'students'));
    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('Requirements students listener notice:', err.message);
    });

    return () => {
      unsubGroups();
      unsubSubs();
      unsubReqs();
      unsubStudents();
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
    const status = sub.reviewStatus || (sub.status) || (progress === 100 ? 'published' : 'in_progress');
    
    const leaderStudent = students.find(s => 
      (group.leaderUid && s.uid === group.leaderUid) || 
      (group.leaderEmail && s.email?.toLowerCase() === group.leaderEmail?.toLowerCase())
    );
    const leaderName = group.leaderName || 
      (leaderStudent ? (leaderStudent.displayName || `${leaderStudent.firstName || ''} ${leaderStudent.lastName || ''}`.trim()) : '') ||
      sub.studentName || sub.submittedByName || 'Not Assigned';

    return {
      no: String(index + 1).padStart(2, '0'),
      name: group.groupName || 'Unknown Group',
      title: group.researchTitle || 'Untitled',
      adviser: group.adviserName || group.adviserUid || 'Unknown',
      leaderName,
      subText: `${uploadedCount} submitted`,
      missText: missingCount === 0 ? 'None' : `${missingCount} Missing`,
      progress: `${progress}%`,
      progressValue: progress,
      missingValue: missingCount,
      status,
      sub,
      group,
      applicableReqs
    };
  });

  const allAdvisers = [
    'All Advisers',
    ...Array.from(new Set(groups.map(g => g.adviserName).filter(Boolean))).sort()
  ];

  // Strictly 4 statuses: In Progress, Revision, Approved, Published
  // Only display what is currently available in the data
  const ALLOWED_STATUSES = ['In Progress', 'Revision', 'Approved', 'Published'];
  const availableStatuses = ALLOWED_STATUSES.filter(st =>
    enrichedRows.some(row => formatStatus(row.status) === st)
  );

  const allStatuses = [
    'All Statuses',
    ...availableStatuses
  ];

  useEffect(() => {
    if (filterStatus !== 'All Statuses' && !allStatuses.includes(filterStatus)) {
      setFilterStatus('All Statuses');
    }
  }, [allStatuses, filterStatus]);

  const filteredRows = enrichedRows.filter((row) => {
    const matchSearch =
      search.trim() === '' ||
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.title.toLowerCase().includes(search.toLowerCase()) ||
      row.adviser.toLowerCase().includes(search.toLowerCase());

    const matchAdviser =
      filterAdviser === 'All Advisers' ||
      row.adviser === filterAdviser;

    const matchStatus =
      filterStatus === 'All Statuses' ||
      formatStatus(row.status) === filterStatus;

    return matchSearch && matchAdviser && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const getInitials = (name) => {
    if (!name) return 'GP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getDocMeta = (submission, reqId) => {
    if (!submission?.documents) return null;
    if (Array.isArray(submission.documents)) {
      return submission.documents.find(d => d.reqId === reqId || d.id === reqId);
    }
    return submission.documents[reqId] || null;
  };

  const formatSubmittedDate = (docMeta, submission) => {
    if (docMeta?.date) {
      const cleaned = String(docMeta.date).replace(/,?\s*\d{4}$/, '');
      return `Submitted ${cleaned}`;
    }
    const rawDate = docMeta?.submittedAt || docMeta?.createdAt || submission?.submittedDate || submission?.createdAt || submission?.updatedAt;
    if (rawDate) {
      const d = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return `Submitted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
    }
    return 'Submitted Feb 5';
  };

  const getModalStatusBadge = (status) => {
    const norm = (status || '').toLowerCase();
    if (norm === 'published') {
      return {
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
        label: 'Published'
      };
    }
    if (norm === 'approved') {
      return {
        dot: 'bg-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
        label: 'Approved'
      };
    }
    if (norm === 'dean_revision' || norm === 'revision') {
      return {
        dot: 'bg-red-500',
        bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60',
        label: 'Revision Required'
      };
    }
    if (norm === 'in_progress') {
      return {
        dot: 'bg-amber-500',
        bg: 'bg-[#fffbeb] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 border-[#fde68a] dark:border-amber-900/60',
        label: 'In Progress'
      };
    }
    return {
      dot: 'bg-amber-500',
      bg: 'bg-[#fffbeb] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 border-[#fde68a] dark:border-amber-900/60',
      label: 'Pending Review'
    };
  };

  const handleView = (row) => {
    const sub = row.sub || {};
    const group = row.group || {};

    const leaderStudent = students.find(s => 
      (group.leaderUid && s.uid === group.leaderUid) || 
      (group.leaderEmail && s.email?.toLowerCase() === group.leaderEmail?.toLowerCase())
    );
    const leaderName = row.leaderName || group.leaderName || 
      (leaderStudent ? (leaderStudent.displayName || `${leaderStudent.firstName || ''} ${leaderStudent.lastName || ''}`.trim()) : '') ||
      sub.studentName || sub.submittedByName || 'Not Assigned';

    // Member count accurate to student leader portal:
    // In student leader portal (MyGroupPage.jsx):
    // totalCount = [leaderCard, ...registeredMemberCards, ...pendingCards].length
    // leader = 1
    // members = group.members (or leaderStudent.groupMembers)
    const rawMembers = Array.isArray(group.members) && group.members.length > 0
      ? group.members
      : (Array.isArray(leaderStudent?.groupMembers) && leaderStudent.groupMembers.length > 0
          ? leaderStudent.groupMembers
          : (Array.isArray(group.groupMembers) ? group.groupMembers : []));

    const leaderEmail = (group.leaderEmail || leaderStudent?.email || '').toLowerCase().trim();
    const leaderUid = group.leaderUid || leaderStudent?.uid;
    const leaderNameNorm = leaderName !== 'Not Assigned' ? leaderName.toLowerCase().trim() : '';

    // Filter out if leader is in members list to avoid double counting
    const nonLeaderMembers = rawMembers.filter(m => {
      if (!m) return false;
      const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase()?.trim();
      const mUid = typeof m === 'object' ? (m.uid || m.studentUid) : null;
      const mName = (typeof m === 'object' ? (m.name || m.displayName) : '')?.toLowerCase()?.trim();
      const mRole = (typeof m === 'object' ? m.role : '')?.toLowerCase()?.trim();

      if (mRole === 'leader' || mRole === 'group leader') return false;
      if (leaderEmail && mEmail === leaderEmail) return false;
      if (leaderUid && mUid === leaderUid) return false;
      if (leaderNameNorm && mName && mName === leaderNameNorm) return false;
      return true;
    });

    const hasLeader = leaderName !== 'Not Assigned' || !!leaderUid || !!leaderEmail;
    const calculatedCount = (hasLeader ? 1 : 0) + nonLeaderMembers.length;
    const memberCount = calculatedCount > 0 ? calculatedCount : (group.memberCount || 1);

    const groupReqs = (row.applicableReqs && row.applicableReqs.length > 0)
      ? row.applicableReqs
      : (requirements.length > 0
        ? requirements
        : [
            { id: 'manuscript', title: 'Final Manuscript (PDF)' },
            { id: 'approval_sheet', title: 'Approval Sheet' },
            { id: 'datasets', title: 'Dataset Files (ZIP)' },
            { id: 'repo', title: 'Upload URL / Repository' },
            { id: 'signatures', title: 'Signature Page' },
            { id: 'video_pitch', title: 'Video Pitch (3–5 min)' },
          ]);

    const uploadedCount = sub.uploadedDocs?.length || 0;
    const requiredCount = groupReqs.length;
    const missingCount = requiredCount > 0 ? Math.max(0, requiredCount - uploadedCount) : 0;
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

    setSelectedSubmission({
      ...sub,
      groupName: row.name,
      researchTitle: row.title,
      leaderName: leaderName,
      members: nonLeaderMembers,
      memberCount: memberCount,
      department: row.group?.department || row.group?.program || row.group?.course || 'BSIT',
      uploadedCount,
      requiredCount,
      completionPercent,
      missingCount,
      applicableReqs: groupReqs,
      adviserName: row.adviser,
      reviewStatus: row.status,
      group: row.group
    });
    setShowReviewModal(true);
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
            {/* Filter / Search Bar */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-700/80 bg-stone-50 dark:bg-stone-800/50">
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search group, title, adviser..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-400 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] focus:border-[#770000] dark:focus:border-[#f8d070]"
                  />
                </div>

                {/* Adviser Filter */}
                <div className="relative">
                  <select
                    value={filterAdviser}
                    onChange={(e) => { setFilterAdviser(e.target.value); setCurrentPage(1); }}
                    className="appearance-none bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] focus:border-[#770000] dark:focus:border-[#f8d070] cursor-pointer"
                  >
                    {allAdvisers.map(adv => (
                      <option key={adv} value={adv}>{adv}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="appearance-none bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] focus:border-[#770000] dark:focus:border-[#f8d070] cursor-pointer"
                  >
                    {allStatuses.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4">
                  <TableSkeleton rows={6} />
                </div>
              ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#590000] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">No.</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Research Title</th>
                    <th className="py-3.5 px-4">Adviser</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Missing</th>
                    <th className="py-3.5 px-4 text-center">Completion</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700/60 font-medium">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-stone-500 dark:text-stone-400">No matching groups found.</td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => (
                      <tr key={row.group.id || index} className={`hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${row.missingValue > 0 ? 'bg-amber-50/30 dark:bg-amber-900/10' : row.progressValue === 100 ? 'bg-emerald-50/10 dark:bg-emerald-900/10' : ''}`}>
                        <td className="py-4 px-4 text-center text-stone-400 font-normal">
                          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                        </td>
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
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            row.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' :
                            (row.status === 'approved' || row.status === 'reviewed') ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' :
                            (row.status === 'dean_revision' || row.status === 'revision') ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400' :
                            'bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-800/40 dark:border-stone-700/50 dark:text-stone-300'
                          }`}>
                            {row.status === 'published' ? '✓' : (row.status === 'approved' || row.status === 'reviewed') ? '✦' : '•'} {formatStatus(row.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PremiumButton 
                            onClick={() => handleView(row)}
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />}
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
                  Showing {paginatedRows.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500 dark:text-stone-400">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#770000]"
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
                  className="px-2 py-1 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 rounded font-bold ${currentPage === page ? 'bg-[#770000] text-white' : 'border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300'}`}
                  >
                    {page}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* ─── GROUP REQUIREMENTS MODAL ───────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 space-y-6 text-left relative" onClick={e => e.stopPropagation()}>
            
            {/* Top Row: Status Badge & Close Icon */}
            <div className="border-b border-stone-100 dark:border-stone-800 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  {(() => {
                    const badge = getModalStatusBadge(selectedSubmission.reviewStatus || selectedSubmission.status);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    );
                  })()}
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-2.5">
                    Group Requirements
                  </h2>
                </div>

                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1.5 rounded-lg -mt-1 -mr-1 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Group Header Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#581026] text-white flex items-center justify-center font-bold text-lg tracking-wider flex-shrink-0 shadow-sm">
                {getInitials(selectedSubmission.groupName)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
                  {selectedSubmission.groupName}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                  {selectedSubmission.researchTitle ? `${selectedSubmission.researchTitle} · ` : ''}{selectedSubmission.memberCount} {selectedSubmission.memberCount === 1 ? 'member' : 'members'}
                </p>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Adviser: <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedSubmission.adviserName || 'Not Assigned'}</span>
                </p>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                  Student Leader: <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedSubmission.leaderName || 'Not Assigned'}</span>
                </p>

                {/* Group Members List */}
                <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-wider uppercase mb-1.5">Group Members</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-[#581026] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs">
                      👤 {selectedSubmission.leaderName || 'Leader'} (Leader)
                    </span>
                    {selectedSubmission.members?.map((m, i) => {
                      const name = typeof m === 'object'
                        ? (m.name || (m.email?.includes('@') ? m.email.split('@')[0] : m.email) || `Member ${i + 2}`)
                        : (typeof m === 'string' && m.includes('@') ? m.split('@')[0] : (m || `Member ${i + 2}`));
                      return (
                        <span key={i} className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700">
                          👤 {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Completion Card */}
            <div className="rounded-2xl border border-stone-200/90 dark:border-stone-700/80 bg-[#faf8f5]/60 dark:bg-stone-800/40 p-4 sm:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-stone-400 dark:text-stone-400 uppercase">
                  OVERALL COMPLETION
                </span>
                <span className="font-serif text-3xl font-bold text-[#b45309] dark:text-[#f8d070]">
                  {selectedSubmission.completionPercent}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden my-2.5">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-[#b45309] dark:bg-[#f8d070]"
                  style={{ width: `${selectedSubmission.completionPercent}%` }}
                />
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400">
                {selectedSubmission.uploadedCount} of {selectedSubmission.requiredCount} items submitted · {selectedSubmission.missingCount} missing
              </p>
            </div>

            {/* Requirements Checklist */}
            <div>
              <p className="text-[11px] font-bold tracking-wider text-[#590000] dark:text-[#f8d070] uppercase mb-3">
                REQUIREMENTS CHECKLIST
              </p>

              <div className="space-y-2.5">
                {selectedSubmission.applicableReqs?.map((req) => {
                  const docMeta = getDocMeta(selectedSubmission, req.id);
                  const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id) || Boolean(docMeta);
                  const submittedDateText = formatSubmittedDate(docMeta, selectedSubmission);

                  if (isUploaded) {
                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-850 p-4 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-stone-300 dark:hover:border-stone-600 transition"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
                          <div className="w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                              {req.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-400 mt-0.5 truncate">
                              <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
                              <span className="truncate">
                                {docMeta?.name || docMeta?.fileName || `${req.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-stone-400 dark:text-stone-400">
                            {submittedDateText}
                          </span>
                          <button
                            onClick={() => {
                              if (docMeta?.url && docMeta.url !== '#') {
                                setViewerState({
                                  isOpen: true,
                                  url: docMeta.url,
                                  title: `${selectedSubmission.researchTitle} - ${req.title}`
                                });
                              } else {
                                Swal.fire({
                                  icon: 'info',
                                  title: req.title,
                                  text: 'No preview document available for this requirement.',
                                  confirmButtonColor: '#770000'
                                });
                              }
                            }}
                            className="px-4 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition shadow-xs cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-[#fff5f5] dark:bg-red-950/20 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center flex-shrink-0 shadow-sm font-bold text-sm font-serif">
                          !
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                            {req.title}
                          </h4>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                            Not yet submitted
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Close Button */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-start">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-6 py-2 border border-stone-300 dark:border-stone-700 rounded-xl text-sm font-bold text-[#5c102a] dark:text-[#f8d070] bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition shadow-xs cursor-pointer"
              >
                Close
              </button>
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
