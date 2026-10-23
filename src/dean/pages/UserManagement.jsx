import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, query, onSnapshot, updateDoc, doc, where, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import { PremiumButton } from '../../components/ui/Card';
import { authFetch } from '../../utils/authFetch';
import { getBackendUrl } from '../../utils/backendUrl';
import { Mail, Users, GraduationCap, Eye, Building, BookOpen, Shield, CheckCircle2, Search, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function UserManagement() {
  const navigate = useNavigate();
  const { deanData } = useUser();
  const [activeTab, setActiveTab] = useState('advisers');
  const [advisers, setAdvisers] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [adviserGroupFilter, setAdviserGroupFilter] = useState('All');
  const [adviserStatusFilter, setAdviserStatusFilter] = useState('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState('All');
  const [studentStatusFilter, setStudentStatusFilter] = useState('All');

  // Table Pagination: Maximum 5 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  // Available groups for adviser filter
  const availableGroupCounts = useMemo(() => {
    const counts = Array.from(new Set(enrichedAdvisers.map(a => a.groupsCount))).sort((a, b) => a - b);
    return counts.map(c => ({
      value: String(c),
      label: c === 1 ? '1 Group' : `${c} Groups`
    }));
  }, [enrichedAdvisers]);

  // Available sections for student filter
  const availableSections = useMemo(() => {
    const secs = Array.from(new Set(enrichedStudents.map(s => s.section).filter(Boolean))).sort();
    return secs;
  }, [enrichedStudents]);

  // Filter Advisers
  const filteredAdvisers = useMemo(() => {
    return enrichedAdvisers.filter(adviser => {
      // 1. Search term match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const name = (adviser.displayName || '').toLowerCase();
        const email = (adviser.email || '').toLowerCase();
        const status = (adviser.status || 'active').toLowerCase();
        const dept = (adviser.department || '').toLowerCase();
        const tags = (adviser.tags || []).join(' ').toLowerCase();
        const matchSearch = name.includes(term) || email.includes(term) || status.includes(term) || dept.includes(term) || tags.includes(term);
        if (!matchSearch) return false;
      }

      // 2. Group count filter
      if (adviserGroupFilter !== 'All') {
        if (String(adviser.groupsCount) !== adviserGroupFilter) return false;
      }

      // 3. Status filter
      if (adviserStatusFilter !== 'All') {
        const currentStatus = (adviser.status || 'active').toLowerCase();
        if (currentStatus !== adviserStatusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [enrichedAdvisers, searchTerm, adviserGroupFilter, adviserStatusFilter]);

  const totalAdviserPages = Math.max(1, Math.ceil(filteredAdvisers.length / itemsPerPage));
  const paginatedAdvisers = filteredAdvisers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Filter Students
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter(student => {
      // 1. Search term match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const name = (student.displayName || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const prog = (student.program || '').toLowerCase();
        const sec = (student.section || '').toLowerCase();
        const grp = (student.groupName || '').toLowerCase();
        const adv = (student.adviserName || '').toLowerCase();
        const status = (student.status || 'active').toLowerCase();
        const matchSearch = name.includes(term) || email.includes(term) || prog.includes(term) || sec.includes(term) || grp.includes(term) || adv.includes(term) || status.includes(term);
        if (!matchSearch) return false;
      }

      // 2. Section filter
      if (studentSectionFilter !== 'All') {
        if ((student.section || '').toLowerCase().trim() !== studentSectionFilter.toLowerCase().trim()) return false;
      }

      // 3. Status filter
      if (studentStatusFilter !== 'All') {
        const currentStatus = (student.status || 'active').toLowerCase();
        if (currentStatus !== studentStatusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [enrichedStudents, searchTerm, studentSectionFilter, studentStatusFilter]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const currentList = activeTab === 'advisers' ? filteredAdvisers : filteredStudents;
  const currentPaginated = activeTab === 'advisers' ? paginatedAdvisers : paginatedStudents;
  const totalPages = activeTab === 'advisers' ? totalAdviserPages : totalStudentPages;

  // Stats
  const activeAdvisersCount = enrichedAdvisers.filter(a => a.status === 'active' || !a.status).length;
  const totalGroupsSupervised = enrichedAdvisers.reduce((sum, a) => sum + a.groupsCount, 0);

  const stats = activeTab === 'advisers' ? [
    { 
      label: 'Total Advisers', 
      value: enrichedAdvisers.length.toString(), 
      icon: <Users className="w-5 h-5 text-stone-700 dark:text-stone-300" />,
      iconBg: 'bg-stone-100 dark:bg-stone-800'
    },
    { 
      label: 'Active Accounts', 
      value: activeAdvisersCount.toString(), 
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    { 
      label: 'Groups Supervised', 
      value: totalGroupsSupervised.toString(), 
      icon: <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40'
    },
  ] : [
    { 
      label: 'Total Students', 
      value: enrichedStudents.length.toString(), 
      icon: <GraduationCap className="w-5 h-5 text-stone-700 dark:text-stone-300" />,
      iconBg: 'bg-stone-100 dark:bg-stone-800'
    },
    { 
      label: 'Active Accounts', 
      value: enrichedStudents.filter(s => s.status === 'active' || !s.status).length.toString(), 
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    { 
      label: 'Assigned Groups', 
      value: enrichedStudents.filter(s => s.groupName && s.groupName !== 'No Group').length.toString(), 
      icon: <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40'
    },
  ];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setAdviserGroupFilter('All');
    setAdviserStatusFilter('All');
    setStudentSectionFilter('All');
    setStudentStatusFilter('All');
    setCurrentPage(1);
  };

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

          {/* Compact Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {stats.map((card, i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl shadow-2xs px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider truncate">
                    {card.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 font-mono mt-0.5 tracking-tight">
                    {card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-stone-100 dark:border-stone-700/60 ${card.iconBg}`}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Table Container Card */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700/60 overflow-hidden">
            {/* View Switching Tabs */}
            <div className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700 px-4 flex gap-6 text-xs font-bold text-stone-400">
              <button 
                onClick={() => handleTabChange('advisers')}
                className={`py-3 flex items-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'advisers' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'border-b-2 border-transparent hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                <Users className="w-4 h-4" />
                <span>Research Advisers</span>
                <span className={`${activeTab === 'advisers' ? 'bg-[#590000]/10 dark:bg-[#f8d070]/20 text-[#590000] dark:text-[#f8d070]' : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedAdvisers.length}</span>
              </button>
              <button 
                onClick={() => handleTabChange('students')}
                className={`py-3 flex items-center gap-1.5 transition-colors cursor-pointer ${activeTab === 'students' ? 'border-b-2 border-[#590000] dark:border-[#f8d070] text-[#590000] dark:text-[#f8d070]' : 'border-b-2 border-transparent hover:text-stone-600 dark:hover:text-stone-300'}`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Students</span>
                <span className={`${activeTab === 'students' ? 'bg-[#590000]/10 dark:bg-[#f8d070]/20 text-[#590000] dark:text-[#f8d070]' : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'} text-[10px] px-1.5 py-0.5 rounded-full`}>{enrichedStudents.length}</span>
              </button>
            </div>

            {/* Filter Bar Controls Above Table */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-850/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  All {activeTab === 'advisers' ? 'Research Advisers' : 'Students'}
                </h3>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium mt-0.5">
                  {activeTab === 'advisers' 
                    ? `Showing ${filteredAdvisers.length} of ${enrichedAdvisers.length} adviser accounts under ${deanData?.department || 'your department'}`
                    : `Showing ${filteredStudents.length} of ${enrichedStudents.length} student accounts under ${deanData?.department || 'your department'}`
                  }
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-64 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={activeTab === 'advisers' ? "Search adviser, email..." : "Search student, email, section..."}
                    className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] transition shadow-2xs"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {activeTab === 'advisers' ? (
                  <>
                    {/* Filter by Groups */}
                    <div className="relative">
                      <select
                        value={adviserGroupFilter}
                        onChange={(e) => {
                          setAdviserGroupFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#770000] shadow-2xs cursor-pointer"
                      >
                        <option value="All">All Groups</option>
                        {availableGroupCounts.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Status */}
                    <div className="relative">
                      <select
                        value={adviserStatusFilter}
                        onChange={(e) => {
                          setAdviserStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#770000] shadow-2xs cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Filter by Section */}
                    <div className="relative">
                      <select
                        value={studentSectionFilter}
                        onChange={(e) => {
                          setStudentSectionFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#770000] shadow-2xs cursor-pointer"
                      >
                        <option value="All">All Sections</option>
                        {availableSections.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter by Status */}
                    <div className="relative">
                      <select
                        value={studentStatusFilter}
                        onChange={(e) => {
                          setStudentStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#770000] shadow-2xs cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="graduated">Graduated</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Reset Filters button if any filter active */}
                {(searchTerm || adviserGroupFilter !== 'All' || adviserStatusFilter !== 'All' || studentSectionFilter !== 'All' || studentStatusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setAdviserGroupFilter('All');
                      setAdviserStatusFilter('All');
                      setStudentSectionFilter('All');
                      setStudentStatusFilter('All');
                      setCurrentPage(1);
                    }}
                    className="text-[11px] font-bold text-[#770000] dark:text-[#f8d070] hover:underline px-1 py-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table Area with fixed display - no horizontal scroll */}
            <div className="p-4">
              <div className="w-full overflow-hidden">
                {loading ? (
                  <div className="mt-2">
                    <TableSkeleton rows={5} />
                  </div>
                ) : (
                <table className="w-full table-fixed text-left text-xs border-collapse font-medium">
                  <thead className="bg-stone-50/70 dark:bg-stone-850/50">
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200/80 dark:border-stone-700">
                      {activeTab === 'advisers' ? (
                        <>
                          <th style={{ width: '24%' }} className="py-3 px-3.5 text-left">Adviser</th>
                          <th style={{ width: '24%' }} className="py-3 px-3 text-left">Email</th>
                          <th style={{ width: '10%' }} className="py-3 px-2 text-center">Groups</th>
                          <th style={{ width: '10%' }} className="py-3 px-2 text-center">Published</th>
                          <th style={{ width: '12%' }} className="py-3 px-2 text-center">Status</th>
                          <th style={{ width: '20%' }} className="py-3 px-3 text-center">Actions</th>
                        </>
                      ) : (
                        <>
                          <th style={{ width: '24%' }} className="py-3 px-3.5 text-left">Student Name & Email</th>
                          <th style={{ width: '13%' }} className="py-3 px-3 text-left">Program</th>
                          <th style={{ width: '10%' }} className="py-3 px-2 text-center">Section</th>
                          <th style={{ width: '21%' }} className="py-3 px-3 text-left">Group Code / Assigned Adviser</th>
                          <th style={{ width: '12%' }} className="py-3 px-2 text-center">Status</th>
                          <th style={{ width: '20%' }} className="py-3 px-3 text-center">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-750 text-stone-700 dark:text-stone-300">
                    {activeTab === 'advisers' ? (
                      paginatedAdvisers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-stone-500 dark:text-stone-400">
                            {searchTerm || adviserGroupFilter !== 'All' || adviserStatusFilter !== 'All' ? (
                              <div>
                                <Search className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                                <p className="font-semibold text-xs text-stone-700 dark:text-stone-300">No advisers match your filters</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm('');
                                    setAdviserGroupFilter('All');
                                    setAdviserStatusFilter('All');
                                    setCurrentPage(1);
                                  }}
                                  className="mt-2 text-[11px] font-bold text-[#770000] dark:text-[#f8d070] hover:underline cursor-pointer"
                                >
                                  Clear filters
                                </button>
                              </div>
                            ) : (
                              'No advisers found.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedAdvisers.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            {/* Adviser */}
                            <td style={{ width: '24%' }} className="py-3.5 px-3.5 align-middle">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 ${getAvatarColor((currentPage - 1) * itemsPerPage + idx)} rounded-full flex items-center justify-center font-bold text-xs border shadow-2xs shrink-0`}>
                                  {(row.displayName || 'U').split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('').substring(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`font-bold text-xs truncate ${row.status === 'inactive' ? 'text-stone-500 dark:text-stone-400 line-through' : 'text-stone-900 dark:text-stone-100'}`}>
                                    {row.displayName || 'Unnamed User'}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {row.tags.map((tag) => (
                                      <span key={tag} className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wide ${tag === 'YOU' ? 'bg-amber-500 text-white' : tag === 'DEAN' ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'}`}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td style={{ width: '24%' }} className="py-3.5 px-3 text-stone-600 dark:text-stone-300 font-mono text-[11px] truncate align-middle">
                              <span title={row.email} className="truncate block">
                                {row.email}
                              </span>
                            </td>

                            {/* Groups (center-aligned) */}
                            <td style={{ width: '10%' }} className="py-3.5 px-2 text-center font-bold text-stone-800 dark:text-stone-200 text-xs align-middle">
                              <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-mono">
                                {row.groupsCount}
                              </span>
                            </td>

                            {/* Published (center-aligned) */}
                            <td style={{ width: '10%' }} className="py-3.5 px-2 text-center align-middle">
                              <span className="inline-flex items-center justify-center min-w-[22px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 font-bold px-1.5 py-0.5 rounded-md text-[10px] font-mono">
                                {row.publishedCount}
                              </span>
                            </td>

                            {/* Status (center-aligned) */}
                            <td style={{ width: '12%' }} className="py-3.5 px-2 text-center align-middle">
                              {row.status === 'inactive' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <span>Inactive</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Active</span>
                                </span>
                              )}
                            </td>

                            {/* Actions (center-aligned) */}
                            <td style={{ width: '20%' }} className="py-3.5 px-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <PremiumButton 
                                  onClick={() => handleView(row, 'adviser')}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs shrink-0"
                                >
                                  <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
                                </PremiumButton>
                                {!row.isYou && (
                                  <PremiumButton 
                                    onClick={() => handleDeactivate(row, 'adviser')}
                                    variant={row.status === 'inactive' ? 'primary' : 'danger'}
                                    size="sm"
                                    className="h-7 px-2.5 text-xs shrink-0"
                                  >
                                    {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                  </PremiumButton>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      paginatedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-stone-500 dark:text-stone-400">
                            {searchTerm || studentSectionFilter !== 'All' || studentStatusFilter !== 'All' ? (
                              <div>
                                <Search className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                                <p className="font-semibold text-xs text-stone-700 dark:text-stone-300">No students match your filters</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm('');
                                    setStudentSectionFilter('All');
                                    setStudentStatusFilter('All');
                                    setCurrentPage(1);
                                  }}
                                  className="mt-2 text-[11px] font-bold text-[#770000] dark:text-[#f8d070] hover:underline cursor-pointer"
                                >
                                  Clear filters
                                </button>
                              </div>
                            ) : (
                              'No students found.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedStudents.map((row, idx) => (
                          <tr key={row.id} className={`hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${row.status === 'inactive' ? 'opacity-70' : ''}`}>
                            {/* Student Name & Email */}
                            <td style={{ width: '24%' }} className="py-3.5 px-3.5 align-middle">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 ${getAvatarColor((currentPage - 1) * itemsPerPage + idx + 3)} rounded-full flex items-center justify-center font-bold text-xs border shadow-2xs shrink-0`}>
                                  {(row.displayName || 'S').split(' ').map(n=>n[0]).join('').substring(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`font-bold text-xs truncate ${row.status === 'inactive' ? 'text-stone-500 dark:text-stone-400 line-through' : 'text-stone-900 dark:text-stone-100'}`}>
                                      {row.displayName || 'Unnamed Student'}
                                    </p>
                                    {row.isLeader && (
                                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                        LEADER
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-stone-500 dark:text-stone-400 font-mono text-[11px] truncate mt-0.5" title={row.email}>
                                    {row.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Program */}
                            <td style={{ width: '13%' }} className="py-3.5 px-3 text-stone-800 dark:text-stone-200 font-semibold text-xs align-middle">
                              <span className="truncate block" title={row.program}>
                                {row.program}
                              </span>
                            </td>

                            {/* Section (New separate column - center-aligned) */}
                            <td style={{ width: '10%' }} className="py-3.5 px-2 text-center align-middle">
                              {row.section ? (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700">
                                  {row.section}
                                </span>
                              ) : (
                                <span className="text-stone-400 text-xs font-mono">—</span>
                              )}
                            </td>

                            {/* Group Code / Assigned Adviser */}
                            <td style={{ width: '21%' }} className="py-3.5 px-3 align-middle min-w-0">
                              <div className="min-w-0">
                                <span 
                                  className="inline-block bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold px-1.5 py-0.5 rounded text-[10px] border border-stone-200/70 dark:border-stone-700 font-mono truncate max-w-full"
                                  title={row.groupName}
                                >
                                  {row.groupName}
                                </span>
                                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5" title={row.adviserName}>
                                  Adv: <strong className="font-semibold text-stone-700 dark:text-stone-300">{row.adviserName}</strong>
                                </p>
                              </div>
                            </td>

                            {/* Status (center-aligned) */}
                            <td style={{ width: '12%' }} className="py-3.5 px-2 text-center align-middle">
                              {row.status === 'inactive' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <span>Inactive</span>
                                </span>
                              ) : row.status === 'graduated' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                  <span>Graduated</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Active</span>
                                </span>
                              )}
                            </td>

                            {/* Actions (center-aligned) */}
                            <td style={{ width: '20%' }} className="py-3.5 px-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <PremiumButton 
                                  onClick={() => handleView(row, 'student')}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs shrink-0"
                                >
                                  <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View</span>
                                </PremiumButton>
                                <PremiumButton 
                                  onClick={() => handleDeactivate(row, 'student')}
                                  variant={row.status === 'inactive' ? 'primary' : 'danger'}
                                  size="sm"
                                  className="h-7 px-2.5 text-xs shrink-0"
                                >
                                  {row.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                </PremiumButton>
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
                )}
              </div>

              {/* Bottom-right Aligned Pagination Navigation Bar */}
              {!loading && currentList.length > 0 && (
                <div className="pt-4 mt-2 border-t border-stone-200/80 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Left count indicator */}
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                    Showing <strong className="text-stone-800 dark:text-stone-200 font-bold">{(currentPage - 1) * itemsPerPage + 1}</strong>–<strong className="text-stone-800 dark:text-stone-200 font-bold">{Math.min(currentPage * itemsPerPage, currentList.length)}</strong> of <strong className="text-stone-800 dark:text-stone-200 font-bold">{currentList.length}</strong> {activeTab === 'advisers' ? 'adviser' : 'student'}{currentList.length !== 1 ? 's' : ''}
                    {(searchTerm || adviserGroupFilter !== 'All' || adviserStatusFilter !== 'All' || studentSectionFilter !== 'All' || studentStatusFilter !== 'All') && (
                      <span className="text-stone-400 ml-1">
                        (filtered from {activeTab === 'advisers' ? enrichedAdvisers.length : enrichedStudents.length})
                      </span>
                    )}
                  </div>

                  {/* Right-aligned navigation controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {/* Previous Button */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      {/* Page numbers [1] 2 3 */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-[#770000] text-white dark:bg-[#f8d070] dark:text-[#590000] shadow-2xs'
                                : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Next page"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
