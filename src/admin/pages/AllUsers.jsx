import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, deleteDoc, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useUser } from '../context/UserContext';
import Swal from 'sweetalert2';
import { Trash2, Download, ShieldOff, Unlock } from 'lucide-react';
import { Card, PremiumButton, SectionTitle } from '../../components/ui/Card';

const roleColors = {
  Adviser: 'bg-amber-100 text-amber-700',
  Student: 'bg-blue-100 text-blue-700',
  Dean: 'bg-pink-100 text-pink-700',
};

export default function AllUsers() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  useEffect(() => {
    let unsubDeans = null;
    let unsubAdvisers = null;
    let unsubStudents = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (unsubDeans) unsubDeans();
        if (unsubAdvisers) unsubAdvisers();
        if (unsubStudents) unsubStudents();
        return;
      }

      let deansData = [];
      let advisersData = [];
      let studentsData = [];

    const formatDate = (dateVal) => {
      if (!dateVal) return 'N/A';
      if (dateVal.toDate) return dateVal.toDate().toLocaleDateString();
      return new Date(dateVal).toLocaleDateString();
    };

    const updateCombinedUsers = () => {
      const combined = [...deansData, ...advisersData, ...studentsData];
      combined.sort((a, b) => a.name.localeCompare(b.name));
      setAllUsers(combined);
      setLoading(false);
    };

    unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
      deansData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || (data.firstName ? data.firstName + ' ' + data.lastName : 'No Name'),
          email: data.email,
          role: 'Dean',
          dept: data.department || 'N/A',
          status: data.status || 'Active',
          lastLogin: formatDate(data.lastLogin || data.createdAt),
          createdAt: data.createdAt
        };
      });
      updateCombinedUsers();
    }, (error) => {
      console.error("Error fetching deans:", error);
    });

    unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snap) => {
      advisersData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || (data.firstName ? data.firstName + ' ' + data.lastName : 'No Name'),
          email: data.email,
          role: 'Adviser',
          dept: data.department || 'N/A',
          status: data.status || 'Active',
          lastLogin: formatDate(data.lastLogin || data.createdAt),
          createdAt: data.createdAt
        };
      });
      updateCombinedUsers();
    }, (error) => {
      console.error("Error fetching advisers:", error);
    });

    unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      studentsData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || (data.firstName ? data.firstName + ' ' + data.lastName : 'No Name'),
          email: data.email,
          role: 'Student',
          dept: data.department || 'N/A',
          status: data.status || 'Active',
          lastLogin: formatDate(data.lastLogin || data.createdAt),
          createdAt: data.createdAt
        };
      });
      updateCombinedUsers();
    }, (error) => {
      console.error("Error fetching students:", error);
    });

    });

    return () => {
      unsubAuth();
      if (unsubDeans) unsubDeans();
      if (unsubAdvisers) unsubAdvisers();
      if (unsubStudents) unsubStudents();
    };
  }, []);

  const yearFilteredUsers = React.useMemo(() => {
    return filterByAcademicYear(allUsers, 'createdAt');
  }, [allUsers, selectedYear, filterByAcademicYear]);

  const tabs = [
    `All Users (${yearFilteredUsers.length})`, 
    `Deans (${yearFilteredUsers.filter(u => u.role === 'Dean').length})`, 
    `Advisers (${yearFilteredUsers.filter(u => u.role === 'Adviser').length})`, 
    `Students (${yearFilteredUsers.filter(u => u.role === 'Student').length})`
  ];

  const filtered = React.useMemo(() => {
    let users = yearFilteredUsers;

    // 2. Filter by Active Tab
    if (activeTab === 1) users = users.filter(u => u.role === 'Dean');
    if (activeTab === 2) users = users.filter(u => u.role === 'Adviser');
    if (activeTab === 3) users = users.filter(u => u.role === 'Student');

    // 3. Search Filter
    if (search) {
      const term = search.toLowerCase();
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.dept || '').toLowerCase().includes(term)
      );
    }
    
    return users;
  }, [yearFilteredUsers, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedUsers = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDeactivateUser = async (user) => {
    const isInactive = user.status === 'inactive';
    const actionText = isInactive ? 'Activate' : 'Deactivate';

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionText.toLowerCase()} ${user.name}? ${isInactive ? 'This will allow them to log in again.' : 'This will prevent them from logging in, but keep their data.'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isInactive ? '#10b981' : '#801e38',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.toLowerCase()}!`
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const newStatus = isInactive ? 'active' : 'inactive';

        // 1. Deactivate in specific role collection
        let colName = 'students';
        if (user.role === 'Dean') colName = 'deans';
        if (user.role === 'Advisor' || user.role === 'Adviser') colName = 'advisers';
        
        await updateDoc(doc(db, colName, user.id), { status: newStatus });

        // 2. Deactivate in users collection and get UID
        let uid = null;
        const qUsers = query(collection(db, 'users'), where('email', '==', user.email));
        const snapUsers = await getDocs(qUsers);
        if (!snapUsers.empty) {
          uid = snapUsers.docs[0].id;
          await updateDoc(doc(db, 'users', uid), { status: newStatus });
        }

        // 3. Call backend to disable Auth
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const endpoint = isInactive ? 'enable-auth-user' : 'disable-auth-user';
        await fetch(`${backendUrl}/api/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        });

        Swal.fire(`${actionText}d!`, `User has been ${actionText.toLowerCase()}d.`, 'success');
      } catch (error) {
        console.error(`Error ${actionText.toLowerCase()}ing user:`, error);
        Swal.fire('Error', `Failed to ${actionText.toLowerCase()} user.`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHardDeleteUser = async (user) => {
    const result = await Swal.fire({
      title: 'Permanently Delete?',
      text: `Do you want to permanently delete ${user.name}? This will wipe ALL their data (groups, submissions, requirements) from the system.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#801e38',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, wipe data!'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        let colName = 'students';
        if (user.role === 'Dean') colName = 'deans';
        if (user.role === 'Adviser') colName = 'advisers';
        
        await deleteDoc(doc(db, colName, user.id));

        let uid = null;
        const qUsers = query(collection(db, 'users'), where('email', '==', user.email));
        const snapUsers = await getDocs(qUsers);
        if (!snapUsers.empty) {
          uid = snapUsers.docs[0].id;
          await deleteDoc(doc(db, 'users', uid));
        }

        try {
          if (user.role === 'Student') {
            const qGroup = query(collection(db, 'groups'), where('leaderEmail', '==', user.email));
            const snapGroup = await getDocs(qGroup);
            await Promise.all(snapGroup.docs.map(d => deleteDoc(doc(db, 'groups', d.id))));

            if (uid) {
              const qSub = query(collection(db, 'submissions'), where('studentUid', '==', uid));
              const snapSub = await getDocs(qSub);
              await Promise.all(snapSub.docs.map(d => deleteDoc(doc(db, 'submissions', d.id))));
            }
          } else if (user.role === 'Adviser' || user.role === 'Dean') {
            const qGroup = query(collection(db, 'groups'), where('adviserUid', '==', user.email));
            const snapGroup = await getDocs(qGroup);
            await Promise.all(snapGroup.docs.map(d => deleteDoc(doc(db, 'groups', d.id))));

            const qReq = query(collection(db, 'requirements'), where('adviserUid', '==', user.email));
            const snapReq = await getDocs(qReq);
            await Promise.all(snapReq.docs.map(d => deleteDoc(doc(db, 'requirements', d.id))));
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up related data:", cleanupErr);
        }

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        await fetch(`${backendUrl}/api/hard-delete-auth-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        });

        Swal.fire('Deleted!', 'User and all related data have been permanently deleted.', 'success');
      } catch (error) {
        console.error("Error deleting user:", error);
        Swal.fire('Error', 'Failed to delete user.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header Component */}
        <Header 
          title="All Users Overview" 
          breadcrumbs={['Users']} 
          searchQuery={search}
          onSearchChange={setSearch}
        />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <SectionTitle sub="Read-only view across all roles in ARCHIVIO.">
            All Users Overview
          </SectionTitle>

          {/* TABS */}
          <div className="flex gap-6 border-b border-stone-200 dark:border-stone-700 mb-6">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === i ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-400 hover:text-stone-600 dark:text-stone-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TABLE CARD */}
          <Card className="flex flex-col overflow-hidden mb-6">

            {/* Search + Export */}
            <div className="p-4 flex items-center justify-end gap-4 border-b border-stone-100 dark:border-stone-800/50 bg-stone-50 dark:bg-[#252525]/50">
              <PremiumButton variant="ghost" icon={<Download className="w-4 h-4" />}>
                Export CSV
              </PremiumButton>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 dark:bg-[#252525] text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600 dark:text-stone-300">NAME ↑</th>
                    <th className="px-3 py-3">EMAIL</th>
                    <th className="px-3 py-3">ROLE</th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600 dark:text-stone-300">DEPARTMENT ↑</th>
                    <th className="px-3 py-3">STATUS</th>
                    <th className="px-3 py-3">LAST LOGIN</th>
                    <th className="px-3 py-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-stone-500 dark:text-stone-400 font-medium">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-stone-200 dark:border-stone-700 border-t-[#801e38] rounded-full animate-spin mb-3"></div>
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-stone-500 dark:text-stone-400 font-medium">No users found.</td>
                    </tr>
                  ) : (
                    paginatedUsers.map(user => (
                      <tr key={user.id} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525]/50 transition-colors">
                        <td className="px-3 py-3 font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">{user.name}</td>
                        <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{user.email}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[user.role]}`}>{user.role}</span>
                        </td>
                        <td className="px-3 py-3 text-stone-700 dark:text-stone-200 font-medium whitespace-nowrap">{user.dept}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                        </td>
                        <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{user.lastLogin}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDeactivateUser(user)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors inline-flex items-center justify-center ${
                                  user.status === 'inactive'
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                                }`}
                                title={user.status === 'inactive' ? 'Activate User' : 'Deactivate User'}
                              >
                                {user.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => handleHardDeleteUser(user)}
                                className="px-2 py-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-3 py-3 border-t border-stone-100 dark:border-stone-800/50 bg-stone-50 dark:bg-[#252525]/30">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Showing {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      currentPage === page 
                        ? 'bg-[#801e38] text-white shadow-sm' 
                        : 'border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:bg-stone-800'
                    }`}
                  >{page}</button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >›</button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
