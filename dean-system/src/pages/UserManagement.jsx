import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';

export default function UserManagement({ activePage, onNavigate }) {
  const { deanData } = useUser();
  const [activeTab, setActiveTab] = useState('advisers');
  const [advisers, setAdvisers] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    // Wait for deanData to load so we know the Dean's department
    if (!deanData?.department) return;
    const deanDept = deanData.department;

    // Fetch Advisers — filter by this Dean's department
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdvisers(all.filter(a => a.department === deanDept));
    });

    // Fetch Students — filter by this Dean's department
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(all.filter(s => s.department === deanDept));
    });

    // Fetch Groups — filter by this Dean's department
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(all.filter(g => g.department === deanDept));
    });

    // Fetch Submissions — filter by this Dean's department
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(all);
      setLoading(false);
    });

    return () => {
      unsubAdvisers();
      unsubStudents();
      unsubGroups();
      unsubSubs();
    };
  }, [deanData]);

  // Process Advisers Data
  const enrichedAdvisers = advisers.map(adviser => {
    // Find all groups supervised by this adviser
    const supervisedGroups = groups.filter(g => g.adviserUid === adviser.email || g.adviserUid === adviser.uid || g.adviserName === adviser.displayName);
    
    // Find submissions for those groups to check published count
    const publishedCount = supervisedGroups.reduce((count, g) => {
      const sub = submissions.find(s => s.studentUid === g.leaderUid);
      if (sub && sub.reviewStatus === 'published') return count + 1;
      return count;
    }, 0);

    const isYou = adviser.email === auth.currentUser?.email;
    const tags = [];
    if (adviser.role?.includes('dean')) tags.push('DEAN');
    if (!adviser.role || adviser.role.includes('adviser')) tags.push('ADVISER');
    if (isYou) tags.push('YOU');

    return {
      ...adviser,
      groupsCount: supervisedGroups.length,
      publishedCount,
      isYou,
      tags
    };
  }).sort((a, b) => {
    if (a.isYou) return -1;
    if (b.isYou) return 1;
    return (b.groupsCount - a.groupsCount);
  });

  // Process Students Data
  const enrichedStudents = students.map(student => {
    const group = groups.find(g => g.leaderUid === student.uid || g.members?.some(m => m.email === student.email));
    return {
      ...student,
      groupName: group?.groupName || 'No Group',
      program: student.department || student.program || 'Unknown'
    };
  });

  // Stats
  const activeAdvisersCount = enrichedAdvisers.filter(a => a.status === 'active' || !a.status).length;
  const totalGroupsSupervised = enrichedAdvisers.reduce((sum, a) => sum + a.groupsCount, 0);

  const stats = [
    { label: 'Total Advisers (incl. you)', value: enrichedAdvisers.length.toString(), color: 'border-stone-200' },
    { label: 'Active Accounts', value: activeAdvisersCount.toString(), color: 'border-emerald-500' },
    { label: 'Groups Supervised', value: totalGroupsSupervised.toString(), color: 'border-amber-500' },
  ];

  const handleDeactivate = async (user) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const actionWord = newStatus === 'inactive' ? 'deactivate' : 'activate';
    
    const res = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionWord} ${user.displayName}'s account?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'inactive' ? '#d33' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionWord}`
    });

    if (res.isConfirmed) {
      try {
        const collectionName = user.role === 'student' ? 'students' : 'advisers';
        await updateDoc(doc(db, collectionName, user.id), { status: newStatus });
        Swal.fire({
          title: 'Success!',
          text: `Account has been ${newStatus}d.`,
          icon: 'success',
          confirmButtonColor: '#4a1024'
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to update account status.',
          icon: 'error',
          confirmButtonColor: '#4a1024'
        });
      }
    }
  };

  const handleView = (user, type) => {
    setSelectedUser({ ...user, type });
    setShowUserModal(true);
  };

  const getAvatarColor = (index) => {
    const colors = ['bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800', 'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Users / Advisers</h1>
              <p className="text-xs text-stone-500 mt-0.5">Manage research adviser and student accounts under your supervision</p>
            </div>
            <button onClick={() => onNavigate('invitations')} className="bg-[#4a1024] hover:bg-[#6b1834] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
              ✉️ Invite New Adviser
            </button>
          </div>

          {/* Cards metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((card, i) => (
              <div key={i} className={`bg-white border-t-2 ${card.color} rounded-xl shadow-sm p-4`}>
                <p className="text-2xl font-bold text-stone-800">{card.value}</p>
                <p className="text-[11px] font-medium text-stone-400 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Table Container Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
            {/* View Switching Tabs */}
            <div className="bg-stone-50/60 border-b border-stone-100 px-4 flex gap-6 text-xs font-bold text-stone-400">
              <button 
                onClick={() => setActiveTab('advisers')}
                className={`py-3 flex items-center gap-1.5 transition-colors ${activeTab === 'advisers' ? 'border-b-2 border-[#4a1024] text-[#4a1024]' : 'border-b-2 border-transparent hover:text-stone-600'}`}
              >
                🧑‍🏫 Research Advisers <span className={`${activeTab === 'advisers' ? 'bg-[#4a1024]/10 text-[#4a1024]' : 'bg-stone-200 text-stone-500'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedAdvisers.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={`py-3 flex items-center gap-1.5 transition-colors ${activeTab === 'students' ? 'border-b-2 border-[#4a1024] text-[#4a1024]' : 'border-b-2 border-transparent hover:text-stone-600'}`}
              >
                🎓 Students <span className={`${activeTab === 'students' ? 'bg-[#4a1024]/10 text-[#4a1024]' : 'bg-stone-200 text-stone-500'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedStudents.length}</span>
              </button>
            </div>

            <div className="p-4">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-3">
                All {activeTab === 'advisers' ? 'Research Advisers' : 'Students'}
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-medium">
                  <thead>
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                      {activeTab === 'advisers' ? (
                        <>
                          <th className="pb-3">Adviser</th>
                          <th className="pb-3">Email</th>
                          <th className="pb-3 text-center">Groups</th>
                          <th className="pb-3 text-center">Published</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </>
                      ) : (
                        <>
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Program</th>
                          <th className="pb-3">Group</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 text-stone-700">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                            <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Users...</p>
                          </div>
                        </td>
                      </tr>
                    ) : activeTab === 'advisers' ? (
                      enrichedAdvisers.length === 0 ? (
                         <tr><td colSpan="6" className="py-8 text-center text-stone-500">No advisers found.</td></tr>
                      ) : (
                        enrichedAdvisers.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50/50 ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            <td className="py-4 flex items-center gap-3">
                              <div className={`w-9 h-9 ${getAvatarColor(idx)} rounded-full flex items-center justify-center font-bold text-xs border shadow-inner`}>
                                {(row.displayName || 'U').split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('').substring(0, 2)}
                              </div>
                              <div>
                                <p className={`font-bold ${row.status === 'inactive' ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{row.displayName || 'Unnamed User'}</p>
                                <div className="flex gap-1 mt-1">
                                  {row.tags.map((tag) => (
                                    <span key={tag} className={`text-[8px] font-bold px-1 py-0.5 rounded tracking-wide uppercase ${tag === 'YOU' ? 'bg-amber-500 text-white' : tag === 'DEAN' ? 'bg-stone-100 text-stone-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-stone-500 font-normal">{row.email}</td>
                            <td className="py-4 text-center font-bold text-stone-800">{row.groupsCount}</td>
                            <td className="py-4 text-center">
                              <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                {row.publishedCount}
                              </span>
                            </td>
                            <td className="py-4">
                              {row.status === 'inactive' ? (
                                <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inactive
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right space-x-2">
                              <button 
                                onClick={() => handleView(row, 'adviser')}
                                className="px-3 py-1 border border-stone-200 text-stone-600 font-bold rounded-lg text-[11px] bg-white hover:bg-stone-50 shadow-sm transition-colors"
                              >
                                👁️ View
                              </button>
                              {!row.isYou && (
                                <button 
                                  onClick={() => handleDeactivate(row)}
                                  className={`px-3 py-1 font-bold rounded-lg text-[11px] shadow-sm transition-colors ${row.status === 'inactive' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                >
                                  {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      enrichedStudents.length === 0 ? (
                         <tr><td colSpan="6" className="py-8 text-center text-stone-500">No students found.</td></tr>
                      ) : (
                        enrichedStudents.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50/50 ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            <td className="py-4 flex items-center gap-3">
                              <div className={`w-9 h-9 ${getAvatarColor(idx + 3)} rounded-full flex items-center justify-center font-bold text-xs border shadow-inner`}>
                                {(row.displayName || 'S').split(' ').map(n=>n[0]).join('').substring(0, 2)}
                              </div>
                              <p className={`font-bold ${row.status === 'inactive' ? 'text-stone-500 line-through' : 'text-stone-800'}`}>{row.displayName || 'Unnamed Student'}</p>
                            </td>
                            <td className="py-4 text-stone-500 font-normal">{row.email}</td>
                            <td className="py-4 font-bold text-stone-600">{row.program}</td>
                            <td className="py-4">
                              <span className="bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                {row.groupName}
                              </span>
                            </td>
                            <td className="py-4">
                              {row.status === 'inactive' ? (
                                <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inactive
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right space-x-2">
                              <button 
                                onClick={() => handleView(row, 'student')}
                                className="px-3 py-1 border border-stone-200 text-stone-600 font-bold rounded-lg text-[11px] bg-white hover:bg-stone-50 shadow-sm transition-colors mr-2"
                              >
                                👁️ View
                              </button>
                              <button 
                                onClick={() => handleDeactivate(row)}
                                className={`px-3 py-1 font-bold rounded-lg text-[11px] shadow-sm transition-colors ${row.status === 'inactive' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                              >
                                {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── USER VIEW MODAL ─────────────────────────────────────────── */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#4a1024] text-white p-6 relative flex items-center gap-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition text-lg"
              >
                ✕
              </button>
              <div className={`w-16 h-16 ${selectedUser.type === 'adviser' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-800'} rounded-full flex items-center justify-center font-bold text-2xl border-4 border-white/20 shadow-inner shrink-0`}>
                {(selectedUser.displayName || 'U').split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold leading-tight">{selectedUser.displayName}</h2>
                <p className="text-white/80 text-sm mt-0.5">{selectedUser.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedUser.status === 'inactive' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'} uppercase tracking-wider`}>
                    {selectedUser.status || 'active'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 uppercase tracking-wider">
                    {selectedUser.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {selectedUser.type === 'adviser' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Groups Supervised</p>
                      <p className="text-2xl font-bold text-stone-800">{selectedUser.groupsCount}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Published</p>
                      <p className="text-2xl font-bold text-[#4a1024]">{selectedUser.publishedCount}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Roles / Permissions</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedUser.tags?.map((tag) => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-stone-100 text-stone-700 tracking-wide uppercase border border-stone-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Program</p>
                      <p className="text-sm font-bold text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-100">{selectedUser.program}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Research Group</p>
                      <p className="text-sm font-bold text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-100">{selectedUser.groupName}</p>
                    </div>
                    {selectedUser.studentNumber && (
                      <div>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Student Number</p>
                        <p className="text-sm font-bold text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-100">{selectedUser.studentNumber}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}