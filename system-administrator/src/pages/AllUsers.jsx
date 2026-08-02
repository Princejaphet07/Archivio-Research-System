import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAcademicYear } from '../context/AcademicYearContext';

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

  React.useEffect(() => {
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

    const unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
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

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snap) => {
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

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      studentsData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || (data.firstName ? data.firstName + ' ' + data.lastName : 'No Name'),
          email: data.email,
          role: 'Student',
          dept: data.course || 'N/A',
          status: data.status || 'Active',
          lastLogin: formatDate(data.lastLogin || data.createdAt),
          createdAt: data.createdAt
        };
      });
      updateCombinedUsers();
    }, (error) => {
      console.error("Error fetching students:", error);
    });

    return () => {
      unsubDeans();
      unsubAdvisers();
      unsubStudents();
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

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
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
        <div className="flex-1 overflow-auto p-8">
          <div className="mb-6">
            <h3 className="text-3xl font-serif font-bold text-stone-900 mb-1">All Users Overview</h3>
            <p className="text-sm text-stone-500">Read-only view across all roles in ARCHIVIO.</p>
          </div>

          {/* TABS */}
          <div className="flex gap-6 border-b border-stone-200 mb-6">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === i ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-400 hover:text-stone-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TABLE CARD */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

            {/* Search + Export */}
            <div className="p-4 flex items-center justify-end gap-4 border-b border-stone-100">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all shadow-sm cursor-pointer">
                <span>📤</span> Export CSV
              </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">NAME ↑</th>
                    <th className="px-6 py-4">EMAIL</th>
                    <th className="px-6 py-4">ROLE</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">DEPARTMENT ↑</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">LAST LOGIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-stone-500 font-medium">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-stone-200 border-t-[#801e38] rounded-full animate-spin mb-3"></div>
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-stone-500 font-medium">No users found.</td>
                    </tr>
                  ) : (
                    paginatedUsers.map(user => (
                      <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-800 whitespace-nowrap">{user.name}</td>
                        <td className="px-6 py-4 text-stone-400 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[user.role]}`}>{user.role}</span>
                        </td>
                        <td className="px-6 py-4 text-stone-700 font-medium whitespace-nowrap">{user.dept}</td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">{user.status}</span>
                        </td>
                        <td className="px-6 py-4 text-stone-400 whitespace-nowrap">{user.lastLogin}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50/30">
              <span className="text-[11px] text-stone-500 font-medium">
                Showing {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 text-xs font-bold hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      currentPage === page 
                        ? 'bg-[#801e38] text-white shadow-sm' 
                        : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >{page}</button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 text-xs font-bold hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >›</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}