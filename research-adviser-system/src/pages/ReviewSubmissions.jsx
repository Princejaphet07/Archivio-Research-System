import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

function ReviewSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All Groups');
  const [filterYear, setFilterYear] = useState('All Year');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  // Match submissions to adviser's groups
  const adviserStudentUids = groups.map(g => g.leaderUid);
  const mySubmissions = submissions.filter(s => adviserStudentUids.includes(s.studentUid));

  // Enrich submissions with group data
  const enrichedSubmissions = mySubmissions.map(sub => {
    const group = groups.find(g => g.leaderUid === sub.studentUid);
    const uploadedCount = sub.uploadedDocs?.length || 0;
    const requiredCount = requirements.length;
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

    return {
      ...sub,
      groupName: group?.groupName || sub.groupName || 'Unknown Group',
      researchTitle: group?.researchTitle || sub.title || 'Untitled',
      leaderName: group?.leaderName || sub.studentName || 'Unknown',
      leaderEmail: group?.leaderEmail || '',
      program: group?.program || '',
      members: group?.members || [],
      submittedDate: sub.createdAt || sub.updatedAt || '',
      completionPercent,
      uploadedCount,
      requiredCount,
      reviewStatus: sub.reviewStatus || (completionPercent === 100 ? 'pending' : 'in_progress'),
    };
  });

  // Filter by tab
  const filteredByTab = enrichedSubmissions.filter(sub => {
    if (activeTab === 'pending') return sub.reviewStatus === 'pending' || sub.reviewStatus === 'in_progress';
    if (activeTab === 'reviewed') return sub.reviewStatus === 'reviewed';
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
    const year = new Date(sub.submittedDate).getFullYear().toString();
    return year === filterYear;
  });

  // Tab counts
  const pendingCount = enrichedSubmissions.filter(s => s.reviewStatus === 'pending' || s.reviewStatus === 'in_progress').length;
  const reviewedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'reviewed').length;
  const approvedCount = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'published').length;

  // Available group names for filter
  const uniqueGroups = [...new Set(enrichedSubmissions.map(s => s.groupName))];
  const uniqueYears = [...new Set(enrichedSubmissions.map(s => {
    const d = new Date(s.submittedDate);
    return isNaN(d.getTime()) ? '' : d.getFullYear().toString();
  }).filter(Boolean))];

  // Handle Approve action
  const handleApprove = async (sub) => {
    const res = await Swal.fire({
      title: 'Approve Submission?',
      text: "This will approve the research and forward it to the Dean's Publish Queue.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7a2e46',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });

    if (res.isConfirmed) {
      try {
        await updateDoc(doc(db, 'submissions', sub.id), {
          reviewStatus: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: auth.currentUser?.email,
        });

        await addDoc(collection(db, 'systemLogs'), {
          user: auth.currentUser?.email || 'Adviser',
          role: 'Research Adviser',
          action: 'Approved submission',
          details: `Group: ${sub.groupName} | Title: ${sub.researchTitle}`,
          status: 'Success',
          timestamp: new Date().toISOString()
        });

        Swal.fire({
          icon: 'success',
          title: 'Approved!',
          text: `${sub.groupName}'s submission has been approved and sent to the Dean.`,
          confirmButtonColor: '#7a2e46',
        });
      } catch (err) {
        console.error('Error approving:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update. Please try again.', confirmButtonColor: '#7a2e46' });
      }
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
    <Layout title="Review Submissions & Tracking" breadcrumb="ARCHIVIO › Review Submissions & Tracking" showSearch={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Review Submissions & Tracking</h1>
          <p className="text-sm text-gray-500">Review, approve, or decline your student groups' research submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by title or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46]"
            />
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600"
          >
            <option>All Year</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600"
          >
            <option>All Groups</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'border-b-2 border-[#7a2e46] text-[#7a2e46]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ⏳ Pending Review <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{pendingCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'reviewed' ? 'border-b-2 border-[#7a2e46] text-[#7a2e46]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ✅ Reviewed <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'reviewed' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{reviewedCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'approved' ? 'border-b-2 border-[#7a2e46] text-[#7a2e46]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🎓 Approved <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{approvedCount}</span>
          </button>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#7a2e46] text-white font-bold uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-gray-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-500">Loading submissions...</td>
                  </tr>
                ) : finalFiltered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-500">
                      No matching {activeTab} submissions found.
                    </td>
                  </tr>
                ) : (
                  finalFiltered.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4 text-center text-gray-400 font-normal">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-800 max-w-xs truncate">
                        {item.researchTitle}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {item.groupName}
                      </td>

                      {activeTab === 'approved' ? (
                        <>
                          <td className="py-4 px-4 text-gray-600">
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
                      ) : (
                        <>
                          <td className="py-4 px-4 text-gray-600">
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
                          <button 
                            onClick={() => handleFullReview(item)}
                            className="px-4 py-1.5 border border-[#7a2e46] text-[#7a2e46] rounded-lg font-bold hover:bg-[#7a2e46] hover:text-white transition-colors"
                          >
                            View
                          </button>
                          {(activeTab === 'pending' || activeTab === 'reviewed') && item.completionPercent === 100 && item.reviewStatus !== 'approved' && item.reviewStatus !== 'published' && (
                            <button 
                              onClick={() => handleApprove(item)}
                              className="px-4 py-1.5 bg-[#7a2e46] text-white rounded-lg font-bold hover:bg-[#5f2135] transition-colors shadow-sm"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing 1–{finalFiltered.length} of {finalFiltered.length} {activeTab}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">‹</button>
              <button className="px-2.5 py-1 bg-[#7a2e46] text-white rounded font-bold">1</button>
              <button className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-[#7a2e46] text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition text-lg"
              >
                ✕
              </button>
              <p className="text-white/70 text-xs tracking-widest uppercase font-bold mb-1">Full Review</p>
              <h2 className="text-2xl font-serif font-bold">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 text-sm mt-1">
                Group: {selectedSubmission.groupName} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* Overview Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Documents</p>
                </div>
                <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-gray-500 mt-1">Complete</p>
                </div>
                <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#7a2e46]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">Pages</p>
                </div>
              </div>

              {/* Abstract */}
              {selectedSubmission.abstract && (
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-2">Abstract</h4>
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              {/* Group Members */}
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">Group Members</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#7a2e46] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    👤 {selectedSubmission.leaderName} (Leader)
                  </span>
                  {selectedSubmission.members?.map((m, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      {m.name || m.email}
                    </span>
                  ))}
                </div>
              </div>

              {/* Documents Checklist */}
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xl shrink-0">{req.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${isUploaded ? 'text-green-800' : 'text-red-700'}`}>
                              {req.id}
                            </p>
                            {isUploaded && docMeta && (
                              <p className="text-xs text-gray-500 truncate">
                                {docMeta.name} · {docMeta.size} · {docMeta.date}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isUploaded ? (
                            <>
                              <span className="text-green-700 font-bold text-xs">✓ Submitted</span>
                              {docMeta?.url && docMeta.url !== '#' && (
                                <a
                                  href={docMeta.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-[#7a2e46] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5f2135] transition"
                                >
                                  View
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-red-600 font-bold text-xs">✕ Missing</span>
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
                  <h4 className="font-bold text-gray-900 text-sm mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.keywords.map((kw, i) => (
                      <span key={i} className="border border-[#DDA3B6] text-[#7a2e46] bg-[#F9EBF0] px-3 py-1 rounded-full text-xs font-bold">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 flex justify-between items-center bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowReviewModal(false)}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
              >
                Close
              </button>
              <div className="flex gap-3">
                {(selectedSubmission.reviewStatus === 'pending' || selectedSubmission.reviewStatus === 'in_progress') && selectedSubmission.completionPercent === 100 && (
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      handleApprove(selectedSubmission);
                    }}
                    className="bg-[#7a2e46] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default ReviewSubmissions;