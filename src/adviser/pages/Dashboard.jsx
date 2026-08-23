import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import { useAdviser } from '../context/AdviserContext';
import Swal from 'sweetalert2';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import HorizontalCardSkeleton from '../components/skeletons/HorizontalCardSkeleton';

function Dashboard() {
  const navigate = useNavigate();
  const { adviserData } = useAdviser();
  const [pendingGroupsCount, setPendingGroupsCount] = useState(0);
  
  // Real dynamic state
  const [activeGroups, setActiveGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination for My Submissions Dashboard
  const [currentSubPage, setCurrentSubPage] = useState(1);
  const subsPerPage = 5;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const prevPendingCountRef = React.useRef(0);

  useEffect(() => {
    const email = adviserData?.email;
    if (!email) {
      setLoading(false);
      return;
    }

    // 1. Listen to pending groups for the toast alert and count
    const pendingQuery = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      const count = snapshot.size;
      // Show alert if count increased
      if (count > prevPendingCountRef.current) {
        Swal.fire({
          title: 'Pending Registrations',
          text: `You have ${count} student group registration(s) waiting for your approval!`,
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });
      }
      prevPendingCountRef.current = count;
      setPendingGroupsCount(count);
    });

    // 2. Listen to approved groups
    const activeQuery = query(collection(db, 'groups'), where('adviserUid', '==', email), where('status', '==', 'approved'));
    const unsubActive = onSnapshot(activeQuery, (snapshot) => {
      const groupList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveGroups(groupList);
    });

    // 3. Listen to all submissions
    const submissionsQuery = query(collection(db, 'submissions'));
    const unsubSubs = onSnapshot(submissionsQuery, (snapshot) => {
      const allSubs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(allSubs);
    });

    // 4. Listen to requirements
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
      unsubPending();
      unsubActive();
      unsubSubs();
      unsubReqs();
    };
  }, [adviserData?.email]);

  // --- Derive stats ---
  const activeGroupCount = activeGroups.length;

  const enrichedSubmissions = activeGroups.map(group => {
    const sub = submissions.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || (s.researchTitle || s.title) === group.researchTitle)) || {};
    
    const uploadedCount = sub.uploadedDocs?.length || 0;
    const requiredCount = requirements.length > 0 ? requirements.length : 6;
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;
    
    // figure out missing docs
    const missingDocs = requirements.filter(req => !(sub.uploadedDocs || []).includes(req.title));

    return {
      ...sub,
      groupName: group.groupName || sub.groupName || 'Unknown Group',
      researchTitle: group.researchTitle || sub.title || 'Untitled',
      leaderName: group.leaderName,
      members: group.members || [],
      completionPercent,
      uploadedCount,
      requiredCount,
      missingDocs,
      reviewStatus: sub.reviewStatus || (completionPercent === 100 ? 'pending' : 'in_progress'),
    };
  }).sort((a, b) => {
    // Priority 1: Incomplete submissions first (ascending order)
    if (a.completionPercent !== b.completionPercent) {
      return a.completionPercent - b.completionPercent;
    }
    // Priority 2: Newest updates first
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  const pendingReviewSubs = enrichedSubmissions.filter(s => s.reviewStatus === 'pending' || s.reviewStatus === 'in_progress');
  const pendingReviewCount = pendingReviewSubs.length;
  const approvedSubs = enrichedSubmissions.filter(s => s.reviewStatus === 'approved' || s.reviewStatus === 'published');
  const approvedPapersCount = approvedSubs.length;

  const totalCompletion = enrichedSubmissions.reduce((sum, sub) => sum + sub.completionPercent, 0);
  const avgCompletion = enrichedSubmissions.length > 0 ? Math.round(totalCompletion / enrichedSubmissions.length) : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#5a1831] to-[#802a46] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 w-64 h-full bg-white/5 rounded-l-full blur-3xl transform translate-x-20"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold tracking-widest text-gray-300 uppercase mb-2">Research Adviser Portal</p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{getGreeting()}, {adviserData?.displayName || 'Research Adviser'} <span className="animate-wave origin-bottom-right inline-block">👋</span></h1>
            <p className="text-sm text-gray-200">{activeGroupCount} active groups under your advisory · {pendingReviewCount} submissions pending your review</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <CardSkeleton borderTopColor="#d1d5db" />
              <CardSkeleton borderTopColor="#facc15" />
              <CardSkeleton borderTopColor="#3b82f6" />
              <CardSkeleton borderTopColor="#e5e7eb" />
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-stone-900 rounded-xl p-5 border border-gray-100 dark:border-stone-800 shadow-sm border-t-4 border-t-gray-300 dark:border-t-stone-700">
                <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider mb-2 flex justify-between">My Groups <span>🎓</span></p>
                <h3 className="text-3xl font-serif font-bold text-gray-800 dark:text-stone-200">{activeGroupCount}</h3>
                <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Active this semester</p>
              </div>
              
              <div className="bg-white dark:bg-stone-900 rounded-xl p-5 border border-gray-100 dark:border-stone-800 shadow-sm border-t-4 border-t-yellow-400 dark:border-t-yellow-500">
                <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider mb-2 flex justify-between">Pending Review <span>⏳</span></p>
                <h3 className="text-3xl font-serif font-bold text-gray-800 dark:text-stone-200">{pendingReviewCount}</h3>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-900/30 inline-block px-2 py-0.5 rounded mt-1">Needs attention</p>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-xl p-5 border border-gray-100 dark:border-stone-800 shadow-sm border-t-4 border-t-blue-500 dark:border-t-blue-600">
                <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider mb-2 flex justify-between">Approved Papers <span>📄</span></p>
                <h3 className="text-3xl font-serif font-bold text-gray-800 dark:text-stone-200">{approvedPapersCount}</h3>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 inline-block px-2 py-0.5 rounded mt-1">Total completed</p>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-xl p-5 border border-gray-100 dark:border-stone-800 shadow-sm border-t-4 border-t-gray-200 dark:border-t-stone-700">
                <p className="text-[10px] font-bold text-gray-400 dark:text-stone-500 uppercase tracking-wider mb-2 flex justify-between">Avg Completion <span>📈</span></p>
                <h3 className="text-3xl font-serif font-bold text-gray-800 dark:text-stone-200">{avgCompletion}%</h3>
                <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">Across all groups</p>
              </div>
            </>
          )}
        </div>

        {/* Bottom Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: My Submissions */}
          <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-100 dark:border-stone-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-stone-100">My Submissions Dashboard</h3>
                <p className="text-xs text-gray-500 dark:text-stone-400">Recent activity from your groups</p>
              </div>
              <button 
                onClick={() => navigate('/adviser/review-submissions')}
                className="text-xs font-semibold text-gray-600 dark:text-stone-300 border border-gray-200 dark:border-stone-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-stone-800 transition"
              >
                Review All →
              </button>
            </div>

            <div className="space-y-6">
              {loading ? (
                <HorizontalCardSkeleton count={2} />
              ) : (
                (() => {
                  const totalSubPages = Math.ceil(enrichedSubmissions.length / subsPerPage);
                  const paginatedSubs = enrichedSubmissions.slice((currentSubPage - 1) * subsPerPage, currentSubPage * subsPerPage);
                  
                  return (
                    <>
                      {paginatedSubs.map((sub, idx) => {
                        const isApproved = sub.reviewStatus === 'approved' || sub.reviewStatus === 'published';
                        const isPending = sub.reviewStatus === 'pending' || sub.reviewStatus === 'in_progress';
                        const pct = sub.completionPercent;
                        
                        // Color scheme based on status and completion
                        let borderColor = 'border-yellow-400';
                        let textColor = 'text-yellow-700';
                        let bgColor = 'bg-yellow-100';
                        let barColor = 'bg-yellow-400';
                        let badgeText = '• Pending Review';
                        
                        if (isApproved) {
                          borderColor = 'border-[#5a1831]';
                          textColor = 'text-[#5a1831]';
                          bgColor = 'bg-green-100';
                          barColor = 'bg-[#5a1831]';
                          badgeText = '• Complete ✓';
                          textColor = 'text-green-700';
                        } else if (sub.missingDocs.length > 0) {
                          borderColor = 'border-blue-400';
                          textColor = 'text-red-700';
                          bgColor = 'bg-red-100';
                          barColor = 'bg-blue-500';
                          badgeText = `• ${sub.missingDocs.length} Missing`;
                        }

                        return (
                          <div key={sub.id || idx} className="flex items-center gap-4 border-b border-gray-100 dark:border-stone-800 pb-5">
                            <div className={`w-14 h-14 rounded-full border-4 ${borderColor} flex items-center justify-center font-bold text-gray-700 dark:text-stone-200 text-sm`}>
                              {pct}%
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-stone-100 flex items-center gap-2">
                                    {sub.groupName} <span className={`${bgColor} ${textColor} text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold`}>{badgeText}</span>
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">{sub.researchTitle} · {sub.members?.length || 1} members</p>
                                </div>
                                <button 
                                  onClick={() => navigate('/adviser/review-submissions', { state: { filterGroup: sub.groupName, activeTab: isApproved ? 'approved' : 'pending' } })}
                                  className="border border-gray-200 dark:border-stone-700 text-xs font-semibold text-gray-600 dark:text-stone-300 px-3 py-1 rounded hover:bg-gray-50 dark:hover:bg-stone-800 transition"
                                >
                                  Details
                                </button>
                              </div>
                              <div className="mt-2 text-[11px] text-gray-500 dark:text-stone-400 mb-1 flex justify-between">
                                <span>
                                  {isApproved ? '✓ All requirements complete' : (sub.missingDocs.length > 0 ? `Missing: ${sub.missingDocs.map(d => d.title).join(', ')}` : 'Ready for review')}
                                </span>
                                <span className={`font-bold ${isApproved ? 'text-[#5a1831] dark:text-[#f8d070]' : (sub.missingDocs.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400')}`}>
                                  {isApproved ? (sub.reviewStatus === 'published' ? 'Published' : 'Approved') : `${sub.uploadedCount} of ${sub.requiredCount}`}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-stone-800 h-1.5 rounded-full">
                                <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Pagination Controls */}
                      {totalSubPages > 1 && (
                        <div className="pt-2 flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-stone-400 text-xs">
                            Showing {((currentSubPage - 1) * subsPerPage) + 1}–{Math.min(currentSubPage * subsPerPage, enrichedSubmissions.length)} of {enrichedSubmissions.length} groups
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentSubPage(p => Math.max(1, p - 1))}
                              disabled={currentSubPage === 1}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              &lt;
                            </button>
                            {Array.from({ length: totalSubPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentSubPage(page)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                                  currentSubPage === page
                                    ? 'bg-[#7a1f3d] dark:bg-[#f8d070] text-white dark:text-stone-900'
                                    : 'border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentSubPage(p => Math.min(totalSubPages, p + 1))}
                              disabled={currentSubPage === totalSubPages}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Pending Actions */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-100 dark:border-stone-800 p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-sm text-gray-900 dark:text-stone-100">Pending Actions</h3>
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">• {pendingReviewCount} reviews</span>
              </div>
              
              <div className="space-y-3">
                {pendingReviewSubs.slice(0, 3).map((sub, idx) => (
                  <div key={sub.id || idx} className="flex justify-between items-center border-b border-gray-50 dark:border-stone-800 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-stone-200">{sub.researchTitle}</h4>
                      <p className="text-[10px] text-gray-500 dark:text-stone-400">{sub.groupName} · {sub.submittedDate ? new Date(sub.submittedDate).toLocaleDateString() : 'Recent'}</p>
                    </div>
                    <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold border border-yellow-200 dark:border-yellow-700/50 px-2 py-1 rounded">• Review</span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-stone-200">{pendingGroupsCount} group registrations</h4>
                    <p className="text-[10px] text-gray-500 dark:text-stone-400">Waiting for approval</p>
                  </div>
                  <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[9px] font-bold border border-purple-200 dark:border-purple-700/50 px-2 py-1 rounded">• Pending</span>
                </div>
              </div>
              
              <button 
                onClick={() => navigate('/adviser/review-submissions')}
                className="w-full mt-4 bg-[#6b253e] hover:bg-[#541b2f] text-white text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer"
              >
                View All Pending →
              </button>
            </div>

            {/* Group Progress Chart */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-100 dark:border-stone-800 p-6">
              <h3 className="font-bold text-sm text-gray-900 dark:text-stone-100 mb-4">Group Progress</h3>
              <div className="h-48">
                {enrichedSubmissions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrichedSubmissions} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <XAxis dataKey="groupName" hide />
                      <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f5f5f4'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                      />
                      <Bar dataKey="completionPercent" radius={[4, 4, 0, 0]}>
                        {enrichedSubmissions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.completionPercent === 100 ? '#059669' : '#ca8a04'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-stone-500 text-center py-10">No progress data yet.</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-transparent">
              <h3 className="font-bold text-sm text-gray-900 dark:text-stone-100 mb-3 ml-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => navigate('/adviser/group-registrations')}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md dark:hover:bg-stone-800 transition text-center gap-1.5 cursor-pointer"
                >
                  <span className="text-green-500 text-lg">✅</span>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-stone-400">Approve Registrations</span>
                </button>
                <button 
                  onClick={() => navigate('/adviser/send-invitations')}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md dark:hover:bg-stone-800 transition text-center gap-1.5 cursor-pointer"
                >
                  <span className="text-blue-500 text-lg">📩</span>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-stone-400">Send Invite Link</span>
                </button>
                <button 
                  onClick={() => navigate('/adviser/research-categories')}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md dark:hover:bg-stone-800 transition text-center gap-1.5 cursor-pointer"
                >
                  <span className="text-yellow-500 text-lg">📁</span>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-stone-400">Manage Categories</span>
                </button>
                <button 
                  onClick={() => navigate('/adviser/submission-requirements')}
                  className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md dark:hover:bg-stone-800 transition text-center gap-1.5 cursor-pointer"
                >
                  <span className="text-purple-500 text-lg">⚙️</span>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-stone-400">My Requirements</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
