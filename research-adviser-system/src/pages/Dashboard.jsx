import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../firebase/config';
import Layout from '../components/Layout';
import { useAdviser } from '../context/AdviserContext';
import Swal from 'sweetalert2';

function Dashboard() {
  const { adviserData } = useAdviser();
  const [pendingGroupsCount, setPendingGroupsCount] = useState(0);
  
  // Real dynamic state
  const [activeGroups, setActiveGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      // Only show alert if count increased from 0, or on initial load if > 0 (handled by avoiding repeated toasts)
      if (count > 0 && pendingGroupsCount === 0) {
        Swal.fire({
          title: 'Pending Registrations',
          text: `You have ${count} new student group registration(s) waiting for your approval!`,
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });
      }
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
  }, [adviserData?.email, pendingGroupsCount]);

  // --- Derive stats ---
  const activeGroupCount = activeGroups.length;
  
  const adviserStudentUids = activeGroups.map(g => g.leaderUid);
  const mySubmissions = submissions.filter(s => adviserStudentUids.includes(s.studentUid));

  const enrichedSubmissions = mySubmissions.map(sub => {
    const group = activeGroups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.researchTitle || sub.title)));
    const uploadedCount = sub.uploadedDocs?.length || 0;
    const requiredCount = requirements.length || 6; // default to 6 if requirements empty
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;
    
    // figure out missing docs
    const missingDocs = requirements.filter(req => !(sub.uploadedDocs || []).includes(req.title));

    return {
      ...sub,
      groupName: group?.groupName || sub.groupName || 'Unknown Group',
      researchTitle: group?.researchTitle || sub.title || 'Untitled',
      completionPercent,
      uploadedCount,
      requiredCount,
      missingDocs,
      reviewStatus: sub.reviewStatus || (completionPercent === 100 ? 'pending' : 'in_progress'),
    };
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

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
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{getGreeting()}, {adviserData?.displayName || 'Research Adviser'} 👋</h1>
            <p className="text-sm text-gray-200">{activeGroupCount} active groups under your advisory · {pendingReviewCount} submissions pending your review</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-gray-300">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">My Groups <span>🎓</span></p>
            {loading ? <div className="h-9 w-12 bg-gray-200 animate-pulse rounded mb-1"></div> : <h3 className="text-3xl font-serif font-bold text-gray-800">{activeGroupCount}</h3>}
            <p className="text-xs text-gray-500 mt-1">Active this semester</p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-yellow-400">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Pending Review <span>⏳</span></p>
            {loading ? <div className="h-9 w-12 bg-gray-200 animate-pulse rounded mb-1"></div> : <h3 className="text-3xl font-serif font-bold text-gray-800">{pendingReviewCount}</h3>}
            <p className="text-xs text-yellow-600 font-medium bg-yellow-50 inline-block px-2 py-0.5 rounded mt-1">Needs attention</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-blue-500">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Approved Papers <span>📄</span></p>
            {loading ? <div className="h-9 w-12 bg-gray-200 animate-pulse rounded mb-1"></div> : <h3 className="text-3xl font-serif font-bold text-gray-800">{approvedPapersCount}</h3>}
            <p className="text-xs text-green-600 font-medium bg-green-50 inline-block px-2 py-0.5 rounded mt-1">Total completed</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Avg Completion <span>📈</span></p>
            {loading ? <div className="h-9 w-12 bg-gray-200 animate-pulse rounded mb-1"></div> : <h3 className="text-3xl font-serif font-bold text-gray-800">{avgCompletion}%</h3>}
            <p className="text-xs text-gray-500 mt-1">Across all groups</p>
          </div>
        </div>

        {/* Bottom Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: My Submissions */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">My Submissions Dashboard</h3>
                <p className="text-xs text-gray-500">Recent activity from your groups</p>
              </div>
              <button className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                Review All →
              </button>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-gray-100 rounded-xl"></div>
                  <div className="h-20 bg-gray-100 rounded-xl"></div>
                </div>
              ) : enrichedSubmissions.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No submissions yet.</p>
              ) : (
                enrichedSubmissions.slice(0, 5).map((sub, idx) => {
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
                    <div key={sub.id || idx} className="flex items-center gap-4 border-b border-gray-100 pb-5">
                      <div className={`w-14 h-14 rounded-full border-4 ${borderColor} flex items-center justify-center font-bold text-gray-700 text-sm`}>
                        {pct}%
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                              {sub.groupName} <span className={`${bgColor} ${textColor} text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold`}>{badgeText}</span>
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">{sub.researchTitle} · {sub.members?.length || 1} members</p>
                          </div>
                          <button className="border border-gray-200 text-xs font-semibold text-gray-600 px-3 py-1 rounded hover:bg-gray-50">Details</button>
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500 mb-1 flex justify-between">
                          <span>
                            {isApproved ? '✓ All requirements complete' : (sub.missingDocs.length > 0 ? `Missing: ${sub.missingDocs.map(d => d.title).join(', ')}` : 'Ready for review')}
                          </span>
                          <span className={`font-bold ${isApproved ? 'text-[#5a1831]' : (sub.missingDocs.length > 0 ? 'text-blue-600' : 'text-yellow-600')}`}>
                            {isApproved ? (sub.reviewStatus === 'published' ? 'Published' : 'Approved') : `${sub.uploadedCount} of ${sub.requiredCount}`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full">
                          <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Pending Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-sm text-gray-900">Pending Actions</h3>
                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">• {pendingReviewCount} reviews</span>
              </div>
              
              <div className="space-y-3">
                {pendingReviewSubs.slice(0, 3).map((sub, idx) => (
                  <div key={sub.id || idx} className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{sub.researchTitle}</h4>
                      <p className="text-[10px] text-gray-500">{sub.groupName} · {sub.submittedDate ? new Date(sub.submittedDate).toLocaleDateString() : 'Recent'}</p>
                    </div>
                    <span className="bg-yellow-50 text-yellow-600 text-[9px] font-bold border border-yellow-200 px-2 py-1 rounded">• Review</span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{pendingGroupsCount} group registrations</h4>
                    <p className="text-[10px] text-gray-500">Waiting for approval</p>
                  </div>
                  <span className="bg-purple-50 text-purple-600 text-[9px] font-bold border border-purple-200 px-2 py-1 rounded">• Pending</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-[#6b253e] hover:bg-[#541b2f] text-white text-xs font-semibold py-2.5 rounded-lg transition">
                View All Pending →
              </button>
            </div>

            {/* Group Progress Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Group Progress</h3>
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
                  <p className="text-xs text-gray-400 text-center py-10">No progress data yet.</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-transparent">
              <h3 className="font-bold text-sm text-gray-900 mb-3 ml-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-green-500 text-lg">✅</span>
                  <span className="text-[10px] font-bold text-gray-600">Approve Registrations</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-blue-500 text-lg">📩</span>
                  <span className="text-[10px] font-bold text-gray-600">Send Invite Link</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-yellow-500 text-lg">📁</span>
                  <span className="text-[10px] font-bold text-gray-600">Manage Categories</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-purple-500 text-lg">⚙️</span>
                  <span className="text-[10px] font-bold text-gray-600">My Requirements</span>
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