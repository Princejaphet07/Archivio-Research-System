import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

function MyGroups() {
  const [groups, setGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) { setLoading(false); return; }

    // Listen to all groups for this adviser (approved ones)
    const groupsQuery = query(
      collection(db, 'groups'),
      where('adviserUid', '==', email),
      where('status', '==', 'approved')
    );

    const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setGroups(list);
      setLoading(false);
    });

    // Listen to all submissions to get document status
    const subsQuery = query(collection(db, 'submissions'));
    const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to requirements to calculate exact document completion percentages
    const reqQuery = query(collection(db, 'requirements'));
    const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeReqs = allReqs.filter(r => 
        (r.scope === 'global' && r.status === 'approved') || 
        (r.scope === 'adviser' && r.adviserUid === email && r.status === 'approved')
      );
      setRequirements(activeReqs);
    });

    return () => {
      unsubGroups();
      unsubSubs();
      unsubReqs();
    };
  }, []);

  // Get submission status for a group
  const getGroupStatus = (group) => {
    const sub = submissions.find(s => s.studentUid === group.leaderUid);
    if (!sub) return { label: 'Pending Requirements', color: 'bg-orange-500', textColor: 'text-orange-700' };

    const uploaded = sub.uploadedDocs?.length || 0;
    const required = requirements.length;
    const percent = required > 0 ? Math.round((uploaded / required) * 100) : 0;

    if (sub.reviewStatus === 'published') return { label: 'Published', color: 'bg-emerald-500', textColor: 'text-emerald-700' };
    if (sub.reviewStatus === 'approved') return { label: 'Approved to Publish', color: 'bg-purple-500', textColor: 'text-purple-700' };
    if (sub.reviewStatus === 'reviewed') return { label: 'Under Moderation', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (percent === 100) return { label: 'Completed Requirements', color: 'bg-green-500', textColor: 'text-green-700' };
    if (uploaded > 0) return { label: `In Progress (${percent}%)`, color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { label: 'Pending Requirements', color: 'bg-orange-500', textColor: 'text-orange-700' };
  };

  // Get submission data for a group
  const getGroupSubmission = (group) => {
    return submissions.find(s => s.studentUid === group.leaderUid) || null;
  };

  // Filter by search
  const filteredGroups = groups.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.groupName?.toLowerCase().includes(q) ||
      g.researchTitle?.toLowerCase().includes(q) ||
      g.leaderName?.toLowerCase().includes(q) ||
      g.program?.toLowerCase().includes(q)
    );
  });

  // Handle View click
  const handleView = (group) => {
    setSelectedGroup(group);
    setShowModal(true);
  };

  // (Removed static REQUIREMENT_ITEMS in favor of dynamic requirements state)

  return (
    <Layout title="My Groups" breadcrumb="ARCHIVIO › My Groups" showSearch={false}>
      <div className="max-w-6xl mx-auto">
        
        {/* Page Header Area */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">My Groups</h1>
            <p className="text-sm text-gray-500">Research groups assigned under your advisory this semester</p>
          </div>
          
          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search groups, students, research titles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#7a2e46] shadow-sm" 
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#7a2e46] text-white text-[10px] uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold w-16">No.</th>
                  <th className="py-4 px-6 font-semibold">Group Name</th>
                  <th className="py-4 px-6 font-semibold">Members</th>
                  <th className="py-4 px-6 font-semibold">Date Registered ▾</th>
                  <th className="py-4 px-6 font-semibold">Status ▾</th>
                  <th className="py-4 px-6 font-semibold text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {loading ? (
                  // Loading skeleton rows
                  [1, 2, 3, 4].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-4 px-6"><div className="h-4 w-6 bg-gray-200 rounded animate-pulse"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div></td>
                      <td className="py-4 px-6"><div className="h-7 w-14 bg-gray-200 rounded animate-pulse mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📋</span>
                        <p className="text-gray-500 font-medium">
                          {searchQuery ? 'No groups match your search' : 'No approved groups yet'}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {searchQuery ? 'Try a different search term' : 'Approve student group registrations to see them here'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group, index) => {
                    const status = getGroupStatus(group);
                    const memberCount = 1 + (group.members?.length || 0);
                    const registeredDate = group.createdAt
                      ? new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                      : '—';

                    return (
                      <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-4 px-6 text-gray-400 font-medium">{String(index + 1).padStart(2, '0')}</td>
                        <td className="py-4 px-6 font-bold text-gray-900">{group.groupName}</td>
                        <td className="py-4 px-6 text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</td>
                        <td className="py-4 px-6 text-gray-500">{registeredDate}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 font-medium">
                            <span className={`w-2.5 h-2.5 rounded-full ${status.color}`}></span>
                            <span className={status.textColor}>{status.label}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleView(group)}
                            className="border border-[#7a2e46] text-[#7a2e46] font-semibold text-xs px-4 py-1.5 rounded hover:bg-[#7a2e46] hover:text-white transition"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <p className="text-xs text-gray-500 font-medium">
            Showing {filteredGroups.length} of {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        </div>

      </div>

      {/* ─── VIEW GROUP MODAL ───────────────────────────────────── */}
      {showModal && selectedGroup && (() => {
        const sub = getGroupSubmission(selectedGroup);
        const status = getGroupStatus(selectedGroup);
        const uploadedCount = sub?.uploadedDocs?.length || 0;
        const requiredCount = requirements.length;
        const percent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="bg-[#7a2e46] text-white p-6 rounded-t-2xl relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition text-lg"
                >
                  ✕
                </button>
                <p className="text-white/70 text-xs tracking-widest uppercase font-bold mb-1">Group Details</p>
                <h2 className="text-2xl font-serif font-bold">{selectedGroup.groupName}</h2>
                <p className="text-white/80 text-sm mt-1">{selectedGroup.researchTitle}</p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-[#7a2e46]">{1 + (selectedGroup.members?.length || 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">Members</p>
                  </div>
                  <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-[#7a2e46]">{uploadedCount}/{requiredCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Documents</p>
                  </div>
                  <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-[#7a2e46]">{percent}%</p>
                    <p className="text-xs text-gray-500 mt-1">Complete</p>
                  </div>
                  <div className="bg-[#f8eff2] rounded-xl p-4 text-center">
                    <p className="text-xl font-bold text-[#7a2e46]">{sub?.pageCount || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">Pages</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <span className={`w-3 h-3 rounded-full ${status.color}`}></span>
                  <span className={`font-bold text-sm ${status.textColor}`}>{status.label}</span>
                  <span className="text-gray-400 text-xs ml-auto">
                    Registered {selectedGroup.createdAt ? new Date(selectedGroup.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                </div>

                {/* Group Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Leader</p>
                    <p className="text-sm font-bold text-gray-900">{selectedGroup.leaderName}</p>
                    <p className="text-xs text-gray-500">{selectedGroup.leaderEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Program</p>
                    <p className="text-sm font-bold text-gray-900">{selectedGroup.program || '—'}</p>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Group Members</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-[#7a2e46] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      👤 {selectedGroup.leaderName} (Leader)
                    </span>
                    {selectedGroup.members?.map((m, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        {m.name || m.email}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Abstract */}
                {sub?.abstract && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Abstract</p>
                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                      {sub.abstract}
                    </p>
                  </div>
                )}

                {/* Document Status */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">Document Status</p>
                  <div className="space-y-2">
                    {requirements.map((req) => {
                      const docMeta = sub?.documents?.[req.id];
                      const isUploaded = sub?.uploadedDocs?.includes(req.id);

                      return (
                        <div
                          key={req.id}
                          className={`flex items-center justify-between rounded-lg p-3 border transition ${
                            isUploaded ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-lg shrink-0">{req.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-bold ${isUploaded ? 'text-green-800' : 'text-red-700'}`}>{req.id}</p>
                              {isUploaded && docMeta && (
                                <p className="text-xs text-gray-500 truncate">{docMeta.name} · {docMeta.size} · {docMeta.date}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isUploaded ? (
                              <>
                                <span className="text-green-700 font-bold text-xs">✓</span>
                                {docMeta?.url && docMeta.url !== '#' && (
                                  <a
                                    href={docMeta.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-[#7a2e46] text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-[#5f2135] transition"
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
                {sub?.keywords?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {sub.keywords.map((kw, i) => (
                        <span key={i} className="border border-[#DDA3B6] text-[#7a2e46] bg-[#F9EBF0] px-3 py-1 rounded-full text-xs font-bold">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-4 flex justify-end bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}

export default MyGroups;