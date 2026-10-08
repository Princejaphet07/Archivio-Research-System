import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAdviser } from '../context/AdviserContext';
import Swal from 'sweetalert2';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import HorizontalCardSkeleton from '../components/skeletons/HorizontalCardSkeleton';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { ClipboardList, GraduationCap, Tag, Calendar, Lightbulb, X, Check } from 'lucide-react';

function GroupRegistrations() {
  const { adviserData, user } = useAdviser();
  const [pendingGroups, setPendingGroups] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignedCategory, setAssignedCategory] = useState('');
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
      group.program?.toLowerCase().includes(q) ||
      group.category?.toLowerCase().includes(q);
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

  // Listen to research categories created by or assigned to this adviser, or global categories
  useEffect(() => {
    const email = (user?.email || adviserData?.email || auth.currentUser?.email || '').toLowerCase().trim();
    const userUid = auth.currentUser?.uid || '';
    if (!email && !userUid) return;

    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const fetched = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(c => {
          if (!c.name) return false;
          const catCreatedBy = (c.createdBy || '').toLowerCase().trim();
          return (
            !catCreatedBy ||
            catCreatedBy === email ||
            (userUid && c.adviserUid === userUid) ||
            catCreatedBy === 'admin' ||
            catCreatedBy === 'system'
          );
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setCategories(fetched);
    }, (err) => {
      console.error('Error fetching categories in GroupRegistrations:', err);
    });

    return () => unsub();
  }, [user?.email, adviserData?.email]);

  const handleOpenGroupModal = (group) => {
    setSelectedGroup(group);
    setAssignedCategory(group.category || '');
  };

  const handleCloseModal = () => {
    setSelectedGroup(null);
    setAssignedCategory('');
  };

  const handleQuickAddCategory = async () => {
    const { value: categoryName } = await Swal.fire({
      title: 'Add Research Category',
      input: 'text',
      inputLabel: 'Category Name',
      inputPlaceholder: 'e.g. Artificial Intelligence, IoT, Security...',
      showCancelButton: true,
      confirmButtonText: 'Add Category',
      confirmButtonColor: '#7a1f3d',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Please enter a category name';
        }
      }
    });

    if (!categoryName || !categoryName.trim()) return;
    const trimmedName = categoryName.trim();

    // Check if category already exists in current list
    const existing = categories.find(c => c.name?.toLowerCase().trim() === trimmedName.toLowerCase());
    if (existing) {
      setAssignedCategory(existing.name);
      Swal.fire({
        icon: 'info',
        title: 'Category Already Exists',
        text: `"${existing.name}" is already available and has been selected.`,
        timer: 1800,
        showConfirmButton: false
      });
      return;
    }

    try {
      const userEmail = (user?.email || adviserData?.email || auth.currentUser?.email || 'Adviser').toLowerCase().trim();
      const userUid = auth.currentUser?.uid || '';

      await addDoc(collection(db, 'categories'), {
        name: trimmedName,
        icon: '🔗',
        bgColor: '#7a2e46',
        description: '',
        createdBy: userEmail,
        adviserUid: userUid,
        createdAt: serverTimestamp()
      });

      try {
        await addDoc(collection(db, 'systemLogs'), {
          user: auth.currentUser?.email || userEmail,
          role: 'Research Adviser',
          action: 'Created new category',
          details: `Category: ${trimmedName}`,
          status: 'Success',
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn('Logging skipped:', logErr);
      }

      setAssignedCategory(trimmedName);

      Swal.fire({
        icon: 'success',
        title: 'Category Added!',
        text: `"${trimmedName}" has been added and assigned.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error adding category:', err);
      Swal.fire('Error', 'Failed to add category. Please try again.', 'error');
    }
  };

  const handleDecision = async (group, decision) => {
    if (decision === 'approve' && !assignedCategory) {
      Swal.fire({
        icon: 'warning',
        title: 'Category Required',
        text: 'Please assign a research category to this group before approving.',
        confirmButtonColor: '#7a1f3d'
      });
      return;
    }

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
      const groupUpdate = {
        status: decision === 'approve' ? 'approved' : 'declined',
        updatedAt: new Date().toISOString()
      };
      if (decision === 'approve' && assignedCategory) {
        groupUpdate.category = assignedCategory;
      }
      await updateDoc(doc(db, 'groups', group.id), groupUpdate);

      // 2. Update students collection (the leader's profile)
      if (group.leaderUid) {
        const updateData = {
          groupStatus: decision === 'approve' ? 'approved' : 'declined'
        };
        if (decision === 'approve') {
          updateData.hasSeenApprovalNotification = false;
          if (assignedCategory) {
            updateData.category = assignedCategory;
          }
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
              if (assignedCategory) {
                updateData.category = assignedCategory;
              }
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
        details: `Group: ${group.groupName} | Leader: ${group.leaderName}${decision === 'approve' && assignedCategory ? ` | Category: ${assignedCategory}` : ''}`,
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
      handleCloseModal();
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
        <SectionTitle 
          sub="Approve or decline student group registration requests"
          action={
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-stone-400 dark:text-stone-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-[#7B1F35] focus:border-[#7B1F35] dark:focus:border-[#f8d070] w-full text-sm text-gray-900 dark:text-stone-100 placeholder-gray-400 dark:placeholder-stone-400 outline-none transition-all shadow-sm"
              />
            </div>
          }
        >
          Group Registrations
        </SectionTitle>


        {/* Pending Requests */}
        <div className="space-y-4">
          {loading ? (
            <HorizontalCardSkeleton count={3} />
          ) : pendingGroups.filter(filterGroup).length === 0 ? (
            <Card glass={true} className="p-8 text-center text-gray-500 dark:text-stone-400">
              No pending group registrations found.
            </Card>
          ) : (
            pendingGroups.filter(filterGroup).map((req) => (
              <Card key={req.id} glass={true} hover={true} className="p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-orange-200 dark:border-orange-800/50">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-stone-800 rounded-lg border border-orange-200 dark:border-stone-700 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg flex items-center gap-2">
                      {req.groupName} <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800/50 uppercase tracking-wider font-bold">• Pending Approval</span>
                    </h3>
                    <p className="text-sm text-gray-800 dark:text-stone-300 mt-1">Research Title: <strong>{req.researchTitle}</strong></p>
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 w-full lg:w-32">
                  <PremiumButton
                    onClick={() => handleOpenGroupModal(req)}
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    }
                  >
                    View
                  </PremiumButton>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* History: Mobile Cards for Phones */}
        <div className="md:hidden space-y-3 mt-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900 dark:text-stone-100 text-base">Registration History</h3>
            <span className="text-xs text-gray-500 dark:text-stone-400">{filteredHistory.length} records</span>
          </div>

          {paginatedHistory.length === 0 ? (
            <Card glass={true} className="p-6 text-center text-gray-500 dark:text-stone-400 text-sm">
              No registration history yet.
            </Card>
          ) : (
            paginatedHistory.map((item) => (
              <Card key={item.id} glass={true} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-stone-100 truncate">
                      {item.groupName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-stone-400">Leader: {item.leaderName}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0 ${
                    item.status === 'approved' 
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                      : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    • {item.status === 'approved' ? 'Approved' : 'Declined'}
                  </span>
                </div>

                <p className="text-xs text-gray-700 dark:text-stone-300 line-clamp-2">
                  <span className="font-semibold text-gray-500 dark:text-stone-400">Title: </span>
                  {item.researchTitle}
                </p>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 dark:text-stone-400 pt-1.5 border-t border-gray-100 dark:border-stone-800 gap-1">
                  <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {item.department || item.program || 'N/A'}</span>
                  {item.category && <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-[10px] font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1"><Tag className="w-3 h-3" /> {item.category}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* History Table (Desktop Only) */}
        <Card glass={true} className="hidden md:block mt-8">
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
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Program</th>
                  <th className="py-3 px-5">Decision</th>
                  <th className="py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-500 dark:text-stone-400">No registration history yet.</td>
                  </tr>
                ) : (
                  paginatedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50">
                      <td className="py-3 px-5 font-bold text-gray-900 dark:text-stone-100">{item.groupName}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.leaderName}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.researchTitle}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">
                        {item.category ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {item.category}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-5 text-gray-600 dark:text-stone-400">{item.department || item.program}</td>
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
        </Card>
      </div>

      {/* View Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-stone-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto transform transition-all animate-scale-in">
            <div className="bg-[#7a1f3d] dark:bg-stone-900 dark:border-b dark:border-stone-800 px-5 sm:px-6 py-4 flex justify-between items-center text-white dark:text-stone-100 pr-12 relative">
              <h2 className="font-bold text-lg sm:text-xl font-serif">Group Registration Details</h2>
              <button onClick={handleCloseModal} className="absolute top-4 right-4 text-white dark:text-stone-100 hover:text-gray-200 dark:hover:text-stone-300 text-2xl font-light leading-none cursor-pointer">&times;</button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Group Name</h3>
                <p className="font-bold text-xl sm:text-2xl text-gray-900 dark:text-stone-100">{selectedGroup.groupName}</p>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Research Title</h3>
                <p className="text-gray-800 dark:text-stone-300 text-base sm:text-lg font-medium">{selectedGroup.researchTitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 dark:bg-stone-900 p-3 rounded-xl border border-gray-100 dark:border-stone-800">
                  <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Program</h3>
                  <p className="text-gray-800 dark:text-stone-300 font-medium text-sm">{selectedGroup.program || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-stone-900 p-3 rounded-xl border border-gray-100 dark:border-stone-800">
                  <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1">Applied Date</h3>
                  <p className="text-gray-800 dark:text-stone-300 font-medium text-sm">{new Date(selectedGroup.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2">Members ({1 + (selectedGroup.members?.length || 0)} total)</h3>
                <ul className="space-y-2 mt-2">
                  <li className="flex items-center gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-gray-200 dark:border-stone-800 shadow-sm">
                    <span className="w-9 h-9 rounded-full bg-[#7a1f3d] dark:bg-[#f8d070] text-white dark:text-stone-900 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                      {selectedGroup.leaderName?.substring(0, 2).toUpperCase() || 'L'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2">
                        <span className="truncate">{selectedGroup.leaderName}</span>
                        <span className="text-[9px] bg-[#fff7ed] dark:bg-orange-900/30 text-[#c2410c] dark:text-orange-400 px-2 py-0.5 rounded-full uppercase border border-[#fed7aa] dark:border-orange-800/50 shadow-sm shrink-0">Leader</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5 truncate">{selectedGroup.leaderEmail}</p>
                    </div>
                  </li>
                  {selectedGroup.members?.map((m, idx) => {
                    const memberName = typeof m === 'object' 
                      ? (m.name || (m.email?.includes('@') ? m.email.split('@')[0] : `Member ${idx + 2}`)) 
                      : (typeof m === 'string' && m.includes('@') ? m.split('@')[0] : (m || `Member ${idx + 2}`));
                    const memberEmail = typeof m === 'object' ? (m.email || '') : (typeof m === 'string' && m.includes('@') ? m : '');
                    const initials = memberName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || `${idx + 2}`;

                    return (
                      <li key={idx} className="flex items-center gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-gray-200 dark:border-stone-800 shadow-sm">
                        <span className="w-9 h-9 rounded-full bg-gray-200 dark:bg-stone-800 text-gray-700 dark:text-stone-300 flex items-center justify-center text-xs font-bold border border-gray-300 dark:border-stone-700 shrink-0">
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-stone-200 truncate flex items-center gap-2">
                            <span className="truncate">{memberName}</span>
                            <span className="text-[9px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-full uppercase border border-stone-200 dark:border-stone-700 shrink-0">Member</span>
                          </p>
                          {memberEmail ? (
                            <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5 truncate">{memberEmail}</p>
                          ) : (
                            <p className="text-[11px] text-gray-400 dark:text-stone-500 mt-0.5">Team Member</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Assign Research Category */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">
                  Assign Research Category <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={assignedCategory}
                      onChange={(e) => setAssignedCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 rounded-xl text-sm text-gray-900 dark:text-stone-100 focus:ring-2 focus:ring-[#7a1f3d] dark:focus:ring-[#f8d070] focus:border-transparent outline-none transition appearance-none cursor-pointer pr-10 shadow-sm"
                    >
                      <option value="">
                        {categories.length === 0 ? '-- No categories yet --' : 'Select a Category...'}
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-stone-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    title="Add Research Category"
                    className="h-[42px] px-3.5 bg-[#7a1f3d] hover:bg-[#601830] dark:bg-[#f8d070] dark:hover:bg-[#e6be5e] text-white dark:text-stone-900 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-bold">Add</span>
                  </button>
                </div>
                {categories.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" /> No categories added yet. Click <strong>+ Add</strong> to create one for this group.
                  </p>
                ) : (
                  !assignedCategory && (
                    <p className="text-xs text-gray-400 dark:text-stone-500 mt-1">
                      Please select a category or add a new one before approving.
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-stone-900 px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-gray-200 dark:border-stone-800">
              <button
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-gray-300 dark:border-stone-700 hover:bg-gray-100 dark:hover:bg-stone-800 transition text-sm text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision(selectedGroup, 'decline')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-white bg-red-700 hover:bg-red-800 transition shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <X className="w-4 h-4" /> Decline
              </button>
              <button
                onClick={() => handleDecision(selectedGroup, 'approve')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default GroupRegistrations;
