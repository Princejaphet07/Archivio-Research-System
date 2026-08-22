import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot } from 'firebase/firestore';
import { useAdviser } from '../context/AdviserContext';
import Swal from 'sweetalert2';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import HorizontalCardSkeleton from '../components/skeletons/HorizontalCardSkeleton';

function GroupRegistrations() {
  const { adviserData, user } = useAdviser();
  const [pendingGroups, setPendingGroups] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filterGroup = (group) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return group.groupName?.toLowerCase().includes(q) ||
      group.researchTitle?.toLowerCase().includes(q) ||
      group.leaderName?.toLowerCase().includes(q) ||
      group.program?.toLowerCase().includes(q);
  };

  useEffect(() => {
    const email = user?.email || adviserData?.email;
    if (!email) return;

    console.log("Listening to groups for adviser:", email);
    const q = query(collection(db, 'groups'), where('adviserUid', '==', email));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const pending = [];
      const history = [];
      
      snap.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === 'pending') {
          pending.push(data);
        } else {
          history.push(data);
        }
      });
      
      setPendingGroups(pending);
      setHistoryGroups(history.sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching groups:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.email, adviserData?.email]);

  const handleDecision = async (group, decision) => {
    const actionText = decision === 'approve' ? 'approve' : 'decline';
    const confirmColor = decision === 'approve' ? '#10b981' : '#d33';

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionText} ${group.groupName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText}`
    });

    if (!result.isConfirmed) return;

    try {
      // 1. Update groups collection
      await updateDoc(doc(db, 'groups', group.id), {
        status: decision === 'approve' ? 'approved' : 'declined',
        updatedAt: new Date().toISOString()
      });

      // 2. Update students collection (the leader's profile)
      if (group.leaderUid) {
        const updateData = {
          groupStatus: decision === 'approve' ? 'approved' : 'declined'
        };
        if (decision === 'approve') {
          updateData.hasSeenApprovalNotification = false;
        }
        await updateDoc(doc(db, 'students', group.leaderUid), updateData);
      }

      // 2b. Update students collection (the members' profiles)
      if (group.members && group.members.length > 0) {
        const memberEmails = group.members.map(m => typeof m === 'object' ? m.email : m).filter(Boolean);
        
        if (memberEmails.length > 0) {
          // Firebase 'in' queries support max 10 items. But a group max size is 5, so this is safe.
          const membersQ = query(collection(db, 'students'), where('email', 'in', memberEmails));
          const membersSnap = await getDocs(membersQ);
          
          const memberUpdates = membersSnap.docs.map(memberDoc => {
            const updateData = {
              groupStatus: decision === 'approve' ? 'approved' : 'declined'
            };
            if (decision === 'approve') {
              updateData.hasSeenApprovalNotification = false;
            }
            return updateDoc(doc(db, 'students', memberDoc.id), updateData);
          });
          
          await Promise.all(memberUpdates);
        }
      }

      // 3. Log Activity for Admin
      await addDoc(collection(db, 'systemLogs'), {
        user: auth.currentUser?.email || 'Adviser',
        role: 'Research Adviser',
        action: `Group Registration ${decision === 'approve' ? 'Approved' : 'Declined'}`,
        details: `Group: ${group.groupName} | Leader: ${group.leaderName}`,
        status: 'Success',
        timestamp: new Date().toISOString()
      });

      // Refresh list (handled by onSnapshot)

      Swal.fire({
        title: 'Success!',
        text: `${group.groupName} has been ${decision}d.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setSelectedGroup(null);
    } catch (err) {
      console.error(`Error ${decision} group:`, err);
      Swal.fire('Error', `Failed to ${decision}. Please try again.`, 'error');
    }
  };

  // Pagination calculations
  const filteredHistory = historyGroups.filter(filterGroup);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <Layout title="Group Registrations" breadcrumb="ARCHIVIO › Group Registrations" showSearch={false}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-1">Group Registrations</h1>
            <p className="text-sm text-gray-500 dark:text-stone-400">Approve or decline student group registration requests</p>
          </div>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:ring-[#7a1f3d] dark:focus:ring-[#f8d070] focus:border-[#7a1f3d] dark:focus:border-[#f8d070] w-full text-sm"
            />
          </div>
        </div>


        {/* Pending Requests */}
        <div className="space-y-4">
          {loading ? (
            <HorizontalCardSkeleton count={3} />
          ) : pendingGroups.filter(filterGroup).length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-dashed border-gray-300 dark:border-stone-700 rounded-xl p-8 text-center text-gray-500 dark:text-stone-400">
              No pending group registrations found.
            </div>
          ) : (
            pendingGroups.filter(filterGroup).map((req) => (
              <div key={req.id} className="bg-white dark:bg-stone-900 border border-[#fed7aa] dark:border-stone-800 rounded-xl p-5 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#fff7ed] dark:bg-stone-800 rounded-lg border border-[#fed7aa] dark:border-stone-700 flex items-center justify-center text-xl">📋</div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg flex items-center gap-2">
                      {req.groupName} <span className="bg-[#fff7ed] dark:bg-orange-900/30 text-[#c2410c] dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full border border-[#fed7aa] dark:border-orange-800/50 uppercase tracking-wider font-bold">• Pending Approval</span>
                    </h3>
                    <p className="text-sm text-gray-800 dark:text-stone-300 mt-1">Research Title: <strong>{req.researchTitle}</strong></p>
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 w-full lg:w-32">
                  <button
                    onClick={() => setSelectedGroup(req)}
                    className="flex-1 lg:flex-none bg-[#7a1f3d] dark:bg-[#f8d070] text-white dark:text-stone-900 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-[#5a162d] dark:hover:bg-[#ffe090] flex justify-center items-center gap-2 shadow-sm transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-200 dark:border-stone-800 mt-8">
          <div className="p-5 border-b border-gray-200 dark:border-stone-800">
            <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg">Registration History</h3>
            <p className="text-xs text-gray-500 dark:text-stone-400">Previously processed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf5f6] dark:bg-stone-950 text-[#7a2e46] dark:text-stone-400 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-5">Group</th>
                  <th className="py-3 px-5">Leader</th>
                  <th className="py-3 px-5">Research Title</th>
                  <th className="py-3 px-5">Program</th>
                  <th className="py-3 px-5">Decision</th>
                  <th className="py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500 dark:text-stone-400">No registration history yet.</td>
                  </tr>
                ) : (
                  paginatedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50">
                      <td className="py-3 px-5 font-bold text-gray-900 dark:text-stone-100">{item.groupName}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.leaderName}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.researchTitle}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.program}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${item.status === 'approved' ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                          }`}>
                          • {item.status === 'approved' ? 'Approved' : 'Declined'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-500 dark:text-stone-400">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-stone-800 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-stone-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredHistory.length)} of {filteredHistory.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-[#7a1f3d] dark:bg-[#f8d070] text-white dark:text-stone-900'
                        : 'border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-stone-950 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all animate-scale-in">
            <div className="bg-[#7a1f3d] dark:bg-stone-900 dark:border-b dark:border-stone-800 px-6 py-4 flex justify-between items-center text-white dark:text-stone-100">
              <h2 className="font-bold text-xl font-serif">Group Registration Details</h2>
              <button onClick={() => setSelectedGroup(null)} className="text-white dark:text-stone-100 hover:text-gray-200 dark:hover:text-stone-300 text-3xl font-light leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Group Name</h3>
                <p className="font-bold text-2xl text-gray-900 dark:text-stone-100">{selectedGroup.groupName}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Research Title</h3>
                <p className="text-gray-800 dark:text-stone-300 text-lg font-medium">{selectedGroup.researchTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-stone-900 p-3 rounded-lg border border-gray-100 dark:border-stone-800">
                  <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Program</h3>
                  <p className="text-gray-800 dark:text-stone-300 font-medium">{selectedGroup.program}</p>
                </div>
                <div className="bg-gray-50 dark:bg-stone-900 p-3 rounded-lg border border-gray-100 dark:border-stone-800">
                  <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Applied Date</h3>
                  <p className="text-gray-800 dark:text-stone-300 font-medium">{new Date(selectedGroup.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Members ({1 + (selectedGroup.members?.length || 0)} total)</h3>
                <ul className="space-y-2 mt-2">
                  <li className="flex items-center gap-3 bg-white dark:bg-stone-900 p-3 rounded-lg border border-gray-200 dark:border-stone-800 shadow-sm">
                    <span className="w-9 h-9 rounded-full bg-[#7a1f3d] dark:bg-[#f8d070] text-white dark:text-stone-900 flex items-center justify-center text-sm font-bold shadow-sm">
                      {selectedGroup.leaderName?.substring(0, 2).toUpperCase() || 'L'}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                        {selectedGroup.leaderName}
                        <span className="text-[9px] bg-[#fff7ed] dark:bg-orange-900/30 text-[#c2410c] dark:text-orange-400 px-2 py-0.5 rounded-full uppercase border border-[#fed7aa] dark:border-orange-800/50 shadow-sm">Leader</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">{selectedGroup.leaderEmail}</p>
                    </div>
                  </li>
                  {selectedGroup.members?.map((m, idx) => {
                    const memberName = typeof m === 'object' ? (m.name || m.email.split('@')[0]) : m.split('@')[0];
                    const memberEmail = typeof m === 'object' ? m.email : m;
                    return (
                      <li key={idx} className="flex items-center gap-3 bg-white dark:bg-stone-900 p-3 rounded-lg border border-gray-200 dark:border-stone-800 shadow-sm">
                        <span className="w-9 h-9 rounded-full bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center text-sm font-bold border border-gray-300 dark:border-stone-700">
                          {memberName.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-stone-200">{memberName}</p>
                          <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">{memberEmail}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-stone-900 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-stone-800">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-5 py-2.5 rounded-lg font-semibold text-gray-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 hover:bg-gray-100 dark:hover:bg-stone-800 transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision(selectedGroup, 'decline')}
                className="px-5 py-2.5 rounded-lg font-semibold text-white bg-red-700 hover:bg-red-800 transition shadow-sm flex items-center gap-2"
              >
                ✕ Decline
              </button>
              <button
                onClick={() => handleDecision(selectedGroup, 'approve')}
                className="px-5 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition shadow-sm flex items-center gap-2"
              >
                ✓ Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default GroupRegistrations;
