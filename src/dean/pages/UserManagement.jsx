import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import { PremiumButton } from '../../components/ui/Card';
import { authFetch } from '../../utils/authFetch';
import { Mail, Users, GraduationCap, Eye, Building, BookOpen, Shield, CheckCircle2 } from 'lucide-react';

export default function UserManagement() {
  const navigate = useNavigate();
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
    if (!deanData) return;
    const deanDept = deanData.department || '';

    const deptLower = (deanDept || '').toLowerCase().trim();
    const flexMatch = (val) => {
      if (!val || typeof val !== 'string' || !val.trim() || !deptLower) return false;
      const v = val.toLowerCase().trim();
      return v.includes(deptLower) || deptLower.includes(v);
    };

    // Fetch Advisers — filter by this Dean's department (flexible match)
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdvisers(all.filter(a => (a.email || a.displayName) && flexMatch(a.department)));
    }, (err) => {
      console.warn('Advisers listener notice:', err.message);
    });

    // Fetch Students — filter by this Dean's department (flexible match)
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(all.filter(s => (s.email || s.displayName) && flexMatch(s.department)));
    }, (err) => {
      console.warn('Students listener notice:', err.message);
    });

    // Fetch Groups — filter by this Dean's department (flexible match)
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(all.filter(g => flexMatch(g.department) || flexMatch(g.program)));
    }, (err) => {
      console.warn('Groups listener notice:', err.message);
    });

    // Fetch Submissions — filter by this Dean's department
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(all);
      setLoading(false);
    }, (err) => {
      console.warn('Submissions listener notice:', err.message);
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
    const supervisedGroups = groups.filter(g => 
      g.adviserUid === adviser.email || 
      g.adviserUid === adviser.uid || 
      g.adviserUid === adviser.userId ||
      g.adviserName === adviser.displayName ||
      g.adviserEmail === adviser.email
    );
    
    // Find submissions for those groups to check published count
    const publishedCount = supervisedGroups.reduce((count, g) => {
      const sub = submissions.find(s => s.studentUid === g.leaderUid && (s.groupName === g.groupName || (s.title || s.researchTitle) === g.researchTitle));
      if (sub && sub.reviewStatus === 'published') return count + 1;
      return count;
    }, 0);

    const isYou = adviser.email?.toLowerCase().trim() === auth.currentUser?.email?.toLowerCase().trim();
    const tags = [];
    if (adviser.role?.includes('dean')) tags.push('DEAN');
    if (!adviser.role || adviser.role.includes('adviser')) tags.push('ADVISER');
    if (isYou) tags.push('YOU');

    const displayName = adviser.displayName || adviser.name || (adviser.firstName ? `${adviser.firstName} ${adviser.lastName || ''}`.trim() : '') || 'Research Adviser';

    return {
      ...adviser,
      displayName,
      groupsCount: supervisedGroups.length,
      supervisedGroupsList: supervisedGroups,
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
    // Match by UID first (normal case), then fallback to email (when account was recreated)
    const group = groups.find(g => 
      g.leaderUid === student.uid ||
      g.leaderEmail === student.email ||
      g.members?.some(m => {
        const mEmail = typeof m === 'object' ? m.email : m;
        const mName = typeof m === 'object' ? m.name : '';
        if (mEmail && student.email && mEmail.toLowerCase() === student.email.toLowerCase()) return true;
        if (mName && student.displayName && mName.toLowerCase().trim() === student.displayName.toLowerCase().trim()) return true;
        return false;
      })
    );
    const isLeader = group ? (group.leaderUid === student.uid || group.leaderEmail === student.email) : false;
    const displayName = student.displayName || student.name || (student.firstName ? `${student.firstName} ${student.lastName || ''}`.trim() : '') || 'Student';

    return {
      ...student,
      displayName,
      groupName: group?.groupName || student.groupName || 'No Group',
      researchTitle: group?.researchTitle || student.researchTitle || 'No Title Set',
      adviserName: group?.adviserName || student.adviserName || student.researchAdviser || 'Not Assigned',
      section: student.section || group?.section || '',
      program: student.department || student.program || student.course || 'Unknown',
      isLeader,
      roleInGroup: isLeader ? 'Group Leader' : (group ? 'Group Member' : 'Individual')
    };
  });

  // Stats
  const activeAdvisersCount = enrichedAdvisers.filter(a => a.status === 'active' || !a.status).length;
  const totalGroupsSupervised = enrichedAdvisers.reduce((sum, a) => sum + a.groupsCount, 0);

  const stats = [
    { label: 'Total Advisers (incl. you)', value: enrichedAdvisers.length.toString(), color: 'border-stone-200 dark:border-stone-700' },
    { label: 'Active Accounts', value: activeAdvisersCount.toString(), color: 'border-emerald-500' },
    { label: 'Groups Supervised', value: totalGroupsSupervised.toString(), color: 'border-amber-500' },
  ];

  const handleDeactivate = async (user, targetType) => {
    const isInactive = (user.status || '').toLowerCase() === 'inactive';
    const newStatus = isInactive ? 'active' : 'inactive';
    const actionWord = isInactive ? 'activate' : 'deactivate';
    const userName = user.displayName || user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') || user.email || 'this user';
    
    const res = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionWord} ${userName}'s account? ${isInactive ? 'This will allow them to sign in again.' : 'This will prevent them from signing in, but keep their data.'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isInactive ? '#10b981' : '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionWord}`
    });

    if (res.isConfirmed) {
      try {
        const type = targetType || user.type || (activeTab === 'students' ? 'student' : 'adviser');
        const collectionName = type === 'student' ? 'students' : 'advisers';
        
        // 1. Update specific role collection document
        await updateDoc(doc(db, collectionName, user.id), { status: newStatus });

        // 2. Also update in deans collection if user has dual role dean+adviser
        if (type === 'adviser' && (user.role === 'dean+adviser' || user.role?.includes('dean'))) {
          try {
            const dSnap = await getDocs(query(collection(db, 'deans'), where('email', '==', user.email)));
            dSnap.forEach(d => {
              updateDoc(doc(db, 'deans', d.id), { status: newStatus }).catch(() => {});
            });
          } catch (e) {
            console.warn('Deans doc sync notice:', e);
          }
        }

        // 3. Update global users collection if uid exists
        const userUid = user.uid || user.userId;
        if (userUid) {
          try {
            await updateDoc(doc(db, 'users', userUid), { status: newStatus });
          } catch (err) {
            console.warn('Direct users collection update notice:', err.message);
          }
        }

        // 4. Toggle Firebase Auth & users collection via backend
        if (userUid || user.email) {
          try {
            const backendUrl = getBackendUrl();
            const endpoint = newStatus === 'inactive' ? 'disable-auth-user' : 'enable-auth-user';
            await authFetch(`${backendUrl}/api/${endpoint}`, { uid: userUid, email: user.email });
          } catch (err) {
            console.warn('Could not toggle Firebase Auth:', err);
          }
        }

        // Update selectedUser state if view modal is open
        if (selectedUser && (selectedUser.id === user.id || selectedUser.email === user.email)) {
          setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
        }

        Swal.fire({
          title: 'Success!',
          text: `Account has been ${newStatus === 'inactive' ? 'deactivated' : 'activated'}.`,
          icon: 'success',
          confirmButtonColor: '#770000'
        });
      } catch (err) {
        console.error('Error toggling account status:', err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to update account status: ' + (err.message || 'Unknown error'),
          icon: 'error',
          confirmButtonColor: '#770000'
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
    <div className="flex h-screen bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      <Sidebar activePage="user-management" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="user-management" />
        
        <main className="flex-1 overflow-y-auto p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#590000] dark:text-[#f8d070]">Users / Advisers</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Manage research adviser and student accounts under your supervision</p>
            </div>
            <button onClick={() => navigate('/dean/invitations')} className="bg-[#770000] dark:bg-stone-950 hover:bg-[#590000] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
              <Mail className="w-4 h-4" />
              <span>Invite New Adviser</span>
            </button>
          </div>

          {/* Cards metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((card, i) => (
              <div key={i} className={`bg-white dark:bg-stone-800 border-t-2 ${card.color} rounded-xl shadow-sm p-4`}>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">{card.value}</p>
                <p className="text-[11px] font-medium text-stone-400 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Table Container Card */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700/60 dark:border-stone-700 overflow-hidden">
            {/* View Switching Tabs */}
            <div className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700 px-4 flex gap-6 text-xs font-bold text-stone-400">
              <button 
                onClick={() => setActiveTab('advisers')}
                className={`py-3 flex items-center gap-1.5 transition-colors ${activeTab === 'advisers' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'border-b-2 border-transparent hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                <Users className="w-4 h-4" />
                <span>Research Advisers</span>
                <span className={`${activeTab === 'advisers' ? 'bg-[#590000]/10 dark:bg-[#f8d070]/20 text-[#590000] dark:text-[#f8d070]' : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedAdvisers.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={`py-3 flex items-center gap-1.5 transition-colors ${activeTab === 'students' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'border-b-2 border-transparent hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Students</span>
                <span className={`${activeTab === 'students' ? 'bg-[#590000]/10 dark:bg-[#f8d070]/20 text-[#590000] dark:text-[#f8d070]' : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedStudents.length}</span>
              </button>
            </div>

            <div className="p-4">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-3">
                All {activeTab === 'advisers' ? 'Research Advisers' : 'Students'}
              </p>
              
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="mt-2">
                    <TableSkeleton rows={5} />
                  </div>
                ) : (
                <table className="w-full text-left text-xs border-collapse font-medium">
                  <thead>
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-700">
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
                  <tbody className="divide-y divide-stone-50 dark:divide-stone-700/60 text-stone-700 dark:text-stone-300">
                    {activeTab === 'advisers' ? (
                      enrichedAdvisers.length === 0 ? (
                         <tr><td colSpan="6" className="py-8 text-center text-stone-500 dark:text-stone-400">No advisers found.</td></tr>
                      ) : (
                        enrichedAdvisers.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50 dark:hover:bg-stone-700 ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            <td className="py-4 flex items-center gap-3">
                              <div className={`w-9 h-9 ${getAvatarColor(idx)} rounded-full flex items-center justify-center font-bold text-xs border shadow-inner`}>
                                {(row.displayName || 'U').split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('').substring(0, 2)}
                              </div>
                              <div>
                                <p className={`font-bold ${row.status === 'inactive' ? 'text-stone-500 dark:text-stone-400 line-through' : 'text-stone-800 dark:text-stone-200'}`}>{row.displayName || 'Unnamed User'}</p>
                                <div className="flex gap-1 mt-1">
                                  {row.tags.map((tag) => (
                                    <span key={tag} className={`text-[8px] font-bold px-1 py-0.5 rounded tracking-wide uppercase ${tag === 'YOU' ? 'bg-amber-500 text-white' : tag === 'DEAN' ? 'bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-stone-500 dark:text-stone-400 font-normal">{row.email}</td>
                            <td className="py-4 text-center font-bold text-stone-800 dark:text-stone-200">{row.groupsCount}</td>
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
                              <PremiumButton 
                                onClick={() => handleView(row, 'adviser')}
                                variant="outline"
                                size="sm"
                              >
                                <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
                              </PremiumButton>
                              {!row.isYou && (
                                <PremiumButton 
                                  onClick={() => handleDeactivate(row, 'adviser')}
                                  variant={row.status === 'inactive' ? 'primary' : 'danger'}
                                  size="sm"
                                >
                                  {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                </PremiumButton>
                              )}
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      enrichedStudents.length === 0 ? (
                         <tr><td colSpan="6" className="py-8 text-center text-stone-500 dark:text-stone-400">No students found.</td></tr>
                      ) : (
                        enrichedStudents.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50 dark:hover:bg-stone-700 ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            <td className="py-4 flex items-center gap-3">
                              <div className={`w-9 h-9 ${getAvatarColor(idx + 3)} rounded-full flex items-center justify-center font-bold text-xs border shadow-inner`}>
                                {(row.displayName || 'S').split(' ').map(n=>n[0]).join('').substring(0, 2)}
                              </div>
                              <p className={`font-bold ${row.status === 'inactive' ? 'text-stone-500 dark:text-stone-400 line-through' : 'text-stone-800 dark:text-stone-200'}`}>{row.displayName || 'Unnamed Student'}</p>
                            </td>
                            <td className="py-4 text-stone-500 dark:text-stone-400 font-normal">{row.email}</td>
                            <td className="py-4 font-bold text-stone-600 dark:text-stone-400">
                              <div>{row.program}</div>
                              {row.section && (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-[#590000] dark:text-[#f8d070] bg-[#590000]/10 dark:bg-[#f8d070]/10 px-1.5 py-0.5 rounded">
                                  Sec: {row.section}
                                </span>
                              )}
                            </td>
                            <td className="py-4">
                              <span className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-bold px-2 py-0.5 rounded text-[10px]">
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
                              <PremiumButton 
                                onClick={() => handleView(row, 'student')}
                                variant="outline"
                                size="sm"
                                className="mr-2"
                              >
                                <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
                              </PremiumButton>
                              <PremiumButton 
                                onClick={() => handleDeactivate(row, 'student')}
                                variant={row.status === 'inactive' ? 'primary' : 'danger'}
                                size="sm"
                              >
                                {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </PremiumButton>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ─── USER VIEW MODAL ─────────────────────────────────────────── */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={() => setShowUserModal(false)}>
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#590000] to-[#770000] dark:from-stone-950 dark:to-stone-900 text-white p-6 relative flex items-center gap-4 shrink-0 shadow-md">
              <button
                onClick={() => setShowUserModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition text-sm cursor-pointer"
                title="Close"
              >
                ✕
              </button>
              <div className={`w-14 h-14 ${selectedUser.type === 'adviser' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-stone-100 text-stone-800 border-stone-300'} rounded-full flex items-center justify-center font-bold text-xl border-2 shadow-inner shrink-0`}>
                {(selectedUser.displayName || selectedUser.name || 'U').split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('').substring(0, 2) || 'U'}
              </div>
              <div className="min-w-0 pr-8">
                <h2 className="text-lg font-serif font-bold leading-tight truncate text-white">
                  {selectedUser.displayName || selectedUser.name || selectedUser.email || 'User Details'}
                </h2>
                <p className="text-white/80 text-xs mt-0.5 truncate">{selectedUser.email || 'No email provided'}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedUser.status === 'inactive' ? 'bg-red-500/30 text-red-200 border border-red-500/40' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'} uppercase tracking-wider flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.status === 'inactive' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                    {selectedUser.status === 'inactive' ? 'Inactive' : 'Active'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20 uppercase tracking-wider">
                    {selectedUser.type === 'adviser' ? 'Research Adviser' : 'Student'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {selectedUser.type === 'adviser' ? (
                <>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-[#590000] dark:text-[#f8d070] shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Department</span>
                      <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">
                        {selectedUser.department || deanData?.department || 'General Academics'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200 dark:border-stone-700">
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-1">Groups Supervised</p>
                      <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">{selectedUser.groupsCount || 0}</p>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3.5 border border-stone-200 dark:border-stone-700">
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-1">Published</p>
                      <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedUser.publishedCount || 0}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-2">Roles & Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.tags?.map((tag) => (
                        <span key={tag} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 tracking-wide uppercase border border-stone-200 dark:border-stone-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-2">Supervised Research Groups</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedUser.supervisedGroupsList && selectedUser.supervisedGroupsList.length > 0 ? (
                        selectedUser.supervisedGroupsList.map(g => (
                          <div key={g.id} className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-stone-800 dark:text-stone-200 truncate">{g.groupName}</p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 italic">{g.researchTitle || 'No Title Set'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#590000]/10 text-[#590000] dark:bg-[#f8d070]/10 dark:text-[#f8d070] shrink-0">
                              {g.section ? `Sec: ${g.section}` : 'Active'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-400 dark:text-stone-500 italic p-3 bg-stone-50 dark:bg-stone-800/30 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                          No research groups assigned yet.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Program</span>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{selectedUser.program || 'N/A'}</span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Section</span>
                      <span className="font-bold text-[#590000] dark:text-[#f8d070]">{selectedUser.section || 'N/A'}</span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Student ID / Number</span>
                      <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200">{selectedUser.studentNumber || selectedUser.studentId || 'N/A'}</span>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Role in Group</span>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{selectedUser.roleInGroup || (selectedUser.role === 'member' ? 'Group Member' : 'Group Leader')}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Research Group</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 text-sm block">{selectedUser.groupName || 'No Group'}</span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Research Title</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200 italic block">{selectedUser.researchTitle || 'No Title Set'}</span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Assigned Adviser</span>
                    <span className="font-bold text-[#590000] dark:text-[#f8d070] block">{selectedUser.adviserName || 'Not Assigned'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Close
              </button>
              {!selectedUser.isYou && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(selectedUser, selectedUser.type)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm text-white cursor-pointer ${
                    selectedUser.status === 'inactive'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {selectedUser.status === 'inactive' ? 'Activate Account' : 'Deactivate Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
