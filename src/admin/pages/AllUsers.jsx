import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, deleteDoc, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useUser } from '../context/UserContext';
import Swal from 'sweetalert2';
import { Trash2, Download, ShieldOff, Unlock, MoreVertical, Eye, X, Mail, Building, UserCheck } from 'lucide-react';
import { Card, PremiumButton, SectionTitle } from '../../components/ui/Card';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import ConfirmModal from '../components/common/ConfirmModal';
import StatusBadge from '../components/common/StatusBadge';
import { authFetch } from '../../utils/authFetch';
import { getBackendUrl } from '../../utils/backendUrl';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { sendEmailWithFallback } from '../../utils/emailDispatcher';

const roleColors = {
  Adviser: 'bg-amber-100 text-amber-700',
  Student: 'bg-blue-100 text-blue-700',
  Dean: 'bg-pink-100 text-pink-700',
  'Dean + Adviser': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Super Admin': 'bg-red-100 text-red-700 border border-red-200',
};

export default function AllUsers() {
  const location = useLocation();
  const searchParam = new URLSearchParams(location.search).get('search') || location.state?.search || '';
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState(searchParam);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const ITEMS_PER_PAGE = 10;

  // Defensive Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmWord: '',
    confirmButtonText: 'Confirm & Delete',
    severity: 'danger',
    affectedItemsCount: 0,
    onConfirm: null,
    loading: false
  });

  
  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Update search state if navigated with new search query
  useEffect(() => {
    const queryParam = new URLSearchParams(location.search).get('search') ?? location.state?.search;
    if (queryParam !== undefined && queryParam !== null) {
      setSearch(queryParam);
    }
  }, [location.search, location.state]);

  // Reset dropdown when page or tab changes
  useEffect(() => {
    setOpenDropdownId(null);
  }, [currentPage, activeTab, search]);

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
        // Deduplicate by email: if user exists in deansData with Dean + Adviser or Dean, don't duplicate row from advisers
        const deanEmails = new Set(deansData.map(d => (d.email || '').toLowerCase().trim()));
        const filteredAdvisers = advisersData.filter(a => !deanEmails.has((a.email || '').toLowerCase().trim()));

        const combined = [...deansData, ...filteredAdvisers, ...studentsData];
        combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
            role: data.role === 'dean+adviser' ? 'Dean + Adviser' : 'Dean',
            dept: data.department || 'N/A',
            status: data.accountStatus === 'pending_activation' || (data.status || '').toLowerCase() === 'pending' ? 'Pending' : (data.status || 'Active'),
            lastLogin: formatDate(data.lastLogin || data.createdAt),
            createdAt: data.createdAt,
            _collection: 'deans',
            raw: data
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
            role: data.role === 'dean+adviser' ? 'Dean + Adviser' : 'Adviser',
            dept: data.department || 'N/A',
            status: data.accountStatus === 'pending_activation' || (data.status || '').toLowerCase() === 'pending' ? 'Pending' : (data.status || 'Active'),
            lastLogin: formatDate(data.lastLogin || data.createdAt),
            createdAt: data.createdAt,
            _collection: 'advisers',
            raw: data
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
            status: data.accountStatus === 'pending_activation' || (data.status || '').toLowerCase() === 'pending' ? 'Pending' : (data.status || 'Active'),
            lastLogin: formatDate(data.lastLogin || data.createdAt),
            createdAt: data.createdAt,
            _collection: 'students',
            raw: data
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
    `Deans (${yearFilteredUsers.filter(u => u.role === 'Dean' || u.role === 'Dean + Adviser').length})`, 
    `Advisers (${yearFilteredUsers.filter(u => u.role === 'Adviser' || u.role === 'Dean + Adviser').length})`, 
    `Students (${yearFilteredUsers.filter(u => u.role === 'Student').length})`
  ];

  const filtered = React.useMemo(() => {
    let users = yearFilteredUsers;

    // Filter by Active Tab
    if (activeTab === 1) users = users.filter(u => u.role === 'Dean' || u.role === 'Dean + Adviser');
    if (activeTab === 2) users = users.filter(u => u.role === 'Adviser' || u.role === 'Dean + Adviser');
    if (activeTab === 3) users = users.filter(u => u.role === 'Student');

    // Search Filter
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

  // Selection helpers
  const isAllSelected = filtered.length > 0 && filtered.every(u => selectedUsers.has(u.id));

  const handleToggleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered.map(u => u.id)));
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatFullDate = (val) => {
    if (!val) return 'N/A';
    try {
      const date = val.toDate ? val.toDate() : (val instanceof Date ? val : new Date(val));
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const isUserPending = (user) => {
    if (!user) return false;
    const status = (user.status || '').toLowerCase().trim();
    const accountStatus = (user.raw?.accountStatus || '').toLowerCase().trim();
    return status === 'pending' || status === 'pending_activation' || accountStatus === 'pending' || accountStatus === 'pending_activation';
  };

  const handleSendMessage = async (user) => {
    if (!user || !user.email) {
      Swal.fire({
        icon: 'warning',
        title: 'No Email Found',
        text: 'This user account does not have an email address.',
        confirmButtonColor: '#801e38'
      });
      return;
    }

    const userName = user.name || user.email;
    const recipientEmail = (user.email || '').toLowerCase().trim();

    const { value: formValues } = await Swal.fire({
      title: `<span style="font-size: 1.15rem; font-weight: 700; color: #1c1917;">Message User</span>`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #57534e;">
          <div style="margin-bottom: 12px; padding: 10px 12px; background: #f5f5f4; border-radius: 8px; border: 1px solid #e7e5e4;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; font-weight: 700; margin-bottom: 2px;">Recipient</div>
            <div style="font-size: 13px; font-weight: 600; color: #1c1917;">${userName}</div>
            <div style="font-size: 12px; color: #0284c7;">${recipientEmail}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 4px; color: #44403c;">Subject *</label>
            <input id="swal-email-subject" class="swal2-input" placeholder="e.g. Important notice regarding your ARCHIVIO account" style="width: 100%; margin: 0; font-size: 13px; box-sizing: border-box; height: 38px; border-radius: 8px;" />
          </div>
          <div>
            <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 4px; color: #44403c;">Message Body *</label>
            <textarea id="swal-email-body" class="swal2-textarea" placeholder="Type your email message to this user..." style="width: 100%; margin: 0; font-size: 13px; box-sizing: border-box; min-height: 120px; border-radius: 8px; resize: vertical;"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send Message',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#78716c',
      focusConfirm: false,
      preConfirm: () => {
        const subject = document.getElementById('swal-email-subject')?.value?.trim();
        const body = document.getElementById('swal-email-body')?.value?.trim();
        if (!subject) {
          Swal.showValidationMessage('Please enter a message subject');
          return false;
        }
        if (!body) {
          Swal.showValidationMessage('Please enter your message');
          return false;
        }
        return { subject, body };
      }
    });

    if (!formValues) return;

    Swal.fire({
      title: 'Sending Email...',
      html: `Delivering message to <strong>${recipientEmail}</strong>...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const escapedBody = formValues.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 12px; background: #ffffff;">
          <div style="background: #801e38; padding: 18px 22px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: #ffffff;">ARCHIVIO Research Management</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; color: #fecdd3;">Southwestern University PHINMA</p>
          </div>
          <p style="font-size: 14px; color: #292524; margin-bottom: 12px;">Hello <strong>${userName}</strong>,</p>
          <div style="font-size: 14px; color: #1c1917; line-height: 1.6; background: #fafaf9; padding: 16px 18px; border-radius: 8px; border: 1px solid #f5f5f4; margin-bottom: 20px;">
            ${escapedBody}
          </div>
          <div style="font-size: 12px; color: #78716c; border-top: 1px solid #e7e5e4; padding-top: 14px; margin-top: 20px;">
            <p style="margin: 0 0 4px 0;">This email was sent by the ARCHIVIO System Administrator.</p>
            <p style="margin: 0; color: #a8a29e;">Southwestern University PHINMA • Research Coordination Office</p>
          </div>
        </div>
      `;

      const result = await sendEmailWithFallback({
        to: recipientEmail,
        subject: formValues.subject,
        html: emailHtml
      });

      if (result && result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Message Sent!',
          text: `Your email message has been sent to ${recipientEmail}.`,
          confirmButtonColor: '#10b981'
        });
      } else {
        throw new Error(result?.error || 'Failed to dispatch email');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send',
        text: err.message || 'Could not send the email message. Please try again.',
        confirmButtonColor: '#801e38'
      });
    }
  };

  const handleResendInvite = async (user) => {
    const raw = user.raw || {};
    const origin = window.location.origin;
    const invitationLink = raw.invitationLink || `${origin}/`;
    const temporaryPassword = raw.temporaryPassword || '';
    const cleanEmail = (user.email || '').toLowerCase().trim();

    Swal.fire({
      title: 'Resending Invitation...',
      html: `Sending invitation email to <strong>${cleanEmail}</strong>...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 12px; background: #ffffff;">
          <div style="background: #801e38; padding: 18px 22px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: #ffffff;">ARCHIVIO Research Management</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; color: #fecdd3;">Invitation Reminder</p>
          </div>
          <p style="font-size: 14px; color: #292524; margin-bottom: 12px;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 14px; color: #57534e; line-height: 1.5;">This is a reminder that you have been invited to access the ARCHIVIO Research Management System.</p>
          ${temporaryPassword ? `<div style="margin: 16px 0; padding: 12px; background: #f5f5f4; border-radius: 8px; font-size: 13px;"><strong>Temporary Password:</strong> <code style="background: #e7e5e4; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</code></div>` : ''}
          <div style="margin: 24px 0;">
            <a href="${invitationLink}" style="background: #801e38; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Activate Account / Sign In</a>
          </div>
        </div>
      `;

      await sendEmailWithFallback({
        to: cleanEmail,
        subject: 'ARCHIVIO — Account Invitation Reminder',
        html: emailHtml
      });

      Swal.fire({
        icon: 'success',
        title: 'Invitation Sent!',
        text: `Invitation has been resent to ${cleanEmail}.`,
        confirmButtonColor: '#10b981'
      });
    } catch (err) {
      console.error('Error resending invite:', err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Resend',
        text: 'Could not send invitation email. Please try again.',
        confirmButtonColor: '#801e38'
      });
    }
  };

  const handleViewUser = (user) => {
    setOpenDropdownId(null);
    setViewUser(user);
  };

  const handleDeactivateUser = async (user) => {
    setOpenDropdownId(null);
    const isInactive = (user.status || '').toLowerCase() === 'inactive';
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
        let colName = user._collection;
        if (!colName) {
          if (user.role === 'Dean' || user.role === 'Dean + Adviser') colName = 'deans';
          else if (user.role === 'Advisor' || user.role === 'Adviser') colName = 'advisers';
          else colName = 'students';
        }
        
        await updateDoc(doc(db, colName, user.id), { status: newStatus }).catch(() => {});

        // 2. Deactivate in users collection and get UID
        let uid = null;
        const qUsers = query(collection(db, 'users'), where('email', '==', user.email));
        const snapUsers = await getDocs(qUsers);
        if (!snapUsers.empty) {
          uid = snapUsers.docs[0].id;
          await updateDoc(doc(db, 'users', uid), { status: newStatus }).catch(() => {});
        }

        // 3. Call backend to disable/enable Auth
        const backendUrl = getBackendUrl();
        const endpoint = isInactive ? 'enable-auth-user' : 'disable-auth-user';
        await authFetch(`${backendUrl}/api/${endpoint}`, { email: user.email }).catch(() => {});

        if (viewUser && viewUser.id === user.id) {
          setViewUser(prev => prev ? { ...prev, status: newStatus } : null);
        }

        Swal.fire(`${actionText}d!`, `User has been ${actionText.toLowerCase()}d.`, 'success');
      } catch (error) {
        console.error(`Error ${actionText.toLowerCase()}ing user:`, error);
        Swal.fire('Error', `Failed to ${actionText.toLowerCase()} user.`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHardDeleteUser = (user) => {
    setOpenDropdownId(null);
    const targetName = user.name || user.email || 'this user';
    setConfirmModalConfig({
      isOpen: true,
      title: `Permanently Delete ${targetName}?`,
      description: `Do you want to permanently delete ${targetName}? This will wipe ALL their data (groups, submissions, requirements, and credentials) from ARCHIVIO. This operation cannot be reversed.`,
      confirmWord: 'DELETE',
      confirmButtonText: 'Yes, Wipe User Data',
      severity: 'danger',
      affectedItemsCount: 1,
      onConfirm: async () => {
        setConfirmModalConfig(prev => ({ ...prev, loading: true }));
        try {
          // 1. Direct role collection document deletion
          let colName = user._collection;
          if (!colName) {
            if (user.role === 'Dean' || user.role === 'Dean + Adviser') colName = 'deans';
            else if (user.role === 'Advisor' || user.role === 'Adviser') colName = 'advisers';
            else colName = 'students';
          }

          if (user.id) {
            await deleteDoc(doc(db, colName, user.id)).catch(() => {});
          }

          // 2. Comprehensive deep wipe across all collections, references, and Auth
          await wipeEmailData(user.email, user.raw?.uid || user.id);

          if (viewUser && viewUser.id === user.id) {
            setViewUser(null);
          }

          // Remove from selectedUsers
          setSelectedUsers(prev => {
            const next = new Set(prev);
            next.delete(user.id);
            return next;
          });

          Swal.fire('Deleted!', 'User and all related data have been permanently deleted.', 'success');
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          console.error("Error deleting user:", error);
          Swal.fire('Error', 'Failed to delete user.', 'error');
          setConfirmModalConfig(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;
    const selectedList = allUsers.filter(u => selectedUsers.has(u.id));
    const count = selectedList.length;

    const result = await Swal.fire({
      title: 'Deactivate Selected Users?',
      text: `Do you want to deactivate ${count} selected user(s)? This will prevent them from logging in, but keep their data.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#801e38',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, deactivate all!'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const backendUrl = getBackendUrl();
        for (const user of selectedList) {
          let colName = user._collection;
          if (!colName) {
            if (user.role === 'Dean' || user.role === 'Dean + Adviser') colName = 'deans';
            else if (user.role === 'Advisor' || user.role === 'Adviser') colName = 'advisers';
            else colName = 'students';
          }

          await updateDoc(doc(db, colName, user.id), { status: 'inactive' }).catch(() => {});

          const qUsers = query(collection(db, 'users'), where('email', '==', user.email));
          const snapUsers = await getDocs(qUsers);
          if (!snapUsers.empty) {
            const uid = snapUsers.docs[0].id;
            await updateDoc(doc(db, 'users', uid), { status: 'inactive' }).catch(() => {});
          }

          await authFetch(`${backendUrl}/api/disable-auth-user`, { email: user.email }).catch(() => {});
        }

        Swal.fire({
          icon: 'success',
          title: 'Deactivated!',
          text: `Successfully deactivated ${count} user(s).`,
          confirmButtonColor: '#801e38'
        });
        setSelectedUsers(new Set());
      } catch (error) {
        console.error('Error deactivating selected users:', error);
        Swal.fire('Error', 'Failed to deactivate selected users.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) return;
    const selectedList = allUsers.filter(u => selectedUsers.has(u.id));
    const count = selectedList.length;

    setConfirmModalConfig({
      isOpen: true,
      title: `Permanently Delete ${count} Selected Users?`,
      description: `You are about to permanently delete ${count} selected user(s). This will wipe ALL their associated data (groups, submissions, and requirements) from ARCHIVIO. This operation cannot be reversed.`,
      confirmWord: 'DELETE',
      confirmButtonText: 'Permanently Wipe Users',
      severity: 'danger',
      affectedItemsCount: count,
      onConfirm: async () => {
        setConfirmModalConfig(prev => ({ ...prev, loading: true }));
        try {
          for (const user of selectedList) {
            let colName = user._collection;
            if (!colName) {
              if (user.role === 'Dean' || user.role === 'Dean + Adviser') colName = 'deans';
              else if (user.role === 'Advisor' || user.role === 'Adviser') colName = 'advisers';
              else colName = 'students';
            }

            if (user.id) {
              await deleteDoc(doc(db, colName, user.id)).catch(() => {});
            }
            await wipeEmailData(user.email, user.raw?.uid || user.id);
          }

          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `Successfully deleted ${count} user(s) and all associated data.`,
            confirmButtonColor: '#801e38'
          });
          setSelectedUsers(new Set());
          setConfirmModalConfig(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          console.error('Error deleting selected users:', error);
          Swal.fire('Error', 'Failed to delete selected users.', 'error');
          setConfirmModalConfig(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };


  const handleExportCSV = () => {
    if (filtered.length === 0) {
      Swal.fire('No Data', 'There are no users to export with the current filter.', 'info');
      return;
    }
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Last Login'];
    const rows = filtered.map(u => [
      u.name || '',
      u.email || '',
      u.role || '',
      u.dept || '',
      u.status || 'Active',
      u.lastLogin || 'N/A'
    ]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const tabName = activeTab === 1 ? 'deans' : activeTab === 2 ? 'advisers' : activeTab === 3 ? 'students' : 'all_users';
    link.setAttribute('href', url);
    link.setAttribute('download', `archivio_${tabName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Export Complete',
      text: `Successfully exported ${filtered.length} user record(s) to CSV.`,
      timer: 2000,
      showConfirmButton: false
    });
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
                onClick={() => {
                  setActiveTab(i);
                  setSelectedUsers(new Set());
                }}
                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === i ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-400 hover:text-stone-600 dark:text-stone-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TABLE CARD */}
          <Card className="flex flex-col overflow-hidden mb-6">

            {/* Top Toolbar: Select All + Bulk Actions on the left (above Name column), Export CSV on the right */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800/50 bg-stone-50 dark:bg-[#252525]/50">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Select All Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isAllSelected
                      ? 'bg-[#801e38] text-white border-[#801e38] hover:bg-[#6a182e]'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => {}} // Handled by button click
                    className="w-3.5 h-3.5 text-[#801e38] accent-[#801e38] rounded pointer-events-none"
                  />
                  <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                  {selectedUsers.size > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isAllSelected ? 'bg-white/20 text-white' : 'bg-[#801e38]/10 text-[#801e38] dark:bg-[#801e38]/30 dark:text-red-300'
                    }`}>
                      {selectedUsers.size}
                    </span>
                  )}
                </button>

                {/* [Deactivate] Button beside Select All */}
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  disabled={selectedUsers.size === 0 || loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
                    selectedUsers.size > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer active:scale-95'
                      : 'bg-stone-100 dark:bg-stone-800/40 text-stone-400 dark:text-stone-600 border-stone-200 dark:border-stone-700/60 cursor-not-allowed opacity-60'
                  }`}
                  title={selectedUsers.size === 0 ? 'Select users to deactivate' : 'Deactivate selected users'}
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Deactivate</span>
                  {selectedUsers.size > 0 && <span className="text-[11px] font-semibold">({selectedUsers.size})</span>}
                </button>

                {/* [Delete] Button beside Select All */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedUsers.size === 0 || loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
                    selectedUsers.size > 0
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer active:scale-95'
                      : 'bg-stone-100 dark:bg-stone-800/40 text-stone-400 dark:text-stone-600 border-stone-200 dark:border-stone-700/60 cursor-not-allowed opacity-60'
                  }`}
                  title={selectedUsers.size === 0 ? 'Select users to delete' : 'Permanently delete selected users'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                  {selectedUsers.size > 0 && <span className="text-[11px] font-semibold">({selectedUsers.size})</span>}
                </button>
              </div>

              {/* Export CSV on the right */}
              <PremiumButton 
                variant="ghost" 
                icon={<Download className="w-4 h-4" />}
                onClick={handleExportCSV}
                size="sm"
              >
                Export CSV
              </PremiumButton>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto min-h-[380px] pb-36">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 dark:bg-[#252525] text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 text-[#801e38] accent-[#801e38] rounded cursor-pointer"
                        title={isAllSelected ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600 dark:text-stone-300">NAME ↑</th>
                    <th className="px-3 py-3">EMAIL</th>
                    <th className="px-3 py-3">ROLE</th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600 dark:text-stone-300">DEPARTMENT ↑</th>
                    <th className="px-3 py-3">STATUS</th>
                    <th className="px-3 py-3">LAST LOGIN</th>
                    <th className="px-3 py-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 px-4">
                        <TableSkeleton rows={5} columns={8} />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-stone-500 dark:text-stone-400 font-medium">No users found.</td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, index) => (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525]/50 transition-colors ${
                          selectedUsers.has(user.id) ? 'bg-[#801e38]/5 dark:bg-[#801e38]/10' : ''
                        }`}
                      >
                        {/* Checkbox column */}
                        <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="w-4 h-4 text-[#801e38] accent-[#801e38] rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">{user.name}</td>
                        <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{user.email}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[user.role]}`}>{user.role}</span>
                        </td>
                        <td className="px-3 py-3 text-stone-700 dark:text-stone-200 font-medium whitespace-nowrap">{user.dept}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={user.status} size="sm" />
                        </td>
                        <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{user.lastLogin}</td>
                        
                        {/* 3-dots Actions Column */}
                        <td className="px-3 py-3 text-center relative">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* 3-dots Dropdown Menu (Positioned strictly below the dots) */}
                            {openDropdownId === user.id && (
                              <div 
                                className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                              >
                                {/* View */}
                                <button
                                  type="button"
                                  onClick={() => handleViewUser(user)}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                                >
                                  <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span>View</span>
                                </button>

                                {/* Resend Invite (if pending) OR Message (if active) */}
                                {isUserPending(user) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleResendInvite(user);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                                  >
                                    <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Resend Invite</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleSendMessage(user);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                                  >
                                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Message</span>
                                  </button>
                                )}

                                {/* Deactivate / Activate */}
                                <button
                                  type="button"
                                  onClick={() => handleDeactivateUser(user)}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                                >
                                  {(user.status || '').toLowerCase() === 'inactive' ? (
                                    <>
                                      <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                                      <span>Activate</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldOff className="w-4 h-4 text-amber-500 shrink-0" />
                                      <span>Deactivate</span>
                                    </>
                                  )}
                                </button>

                                <div className="h-px bg-stone-100 dark:bg-stone-800 my-1" />

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleHardDeleteUser(user)}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
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

      {/* View User Modal */}
      {viewUser && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setViewUser(null)}
        >
          <div 
            className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-lg border border-stone-200 dark:border-stone-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  User Details
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  System overview and profile details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Profile Card Summary */}
              <div className="bg-[#fcfbf9] dark:bg-[#252525] border border-stone-200/90 dark:border-stone-700/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-[#801e38] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                    {getInitials(viewUser.name)}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
                      {viewUser.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-normal mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" /> {viewUser.email}
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-300 font-normal mt-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-stone-400" /> {viewUser.dept || 'Department of Information Technology'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[viewUser.role] || 'bg-stone-100 text-stone-700'}`}>
                    {viewUser.role}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    (viewUser.status || '').toLowerCase() === 'pending'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : (viewUser.status || '').toLowerCase() === 'active' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                  }`}>
                    {viewUser.status}
                  </span>
                </div>
              </div>

              {/* Account Details Grid */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-50/50 dark:bg-stone-900/30">
                <h4 className="text-[10px] font-bold tracking-wider text-stone-400 uppercase mb-3">
                  Account Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">Role</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 block">{viewUser.role}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">Department</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 block">{viewUser.dept || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">Status</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 block">{viewUser.status}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">Last Login</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 block">{viewUser.lastLogin || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">Date Created</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 block">{formatFullDate(viewUser.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 dark:text-stone-500 block">User ID</span>
                    <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 block truncate" title={viewUser.id}>{viewUser.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-stone-50 dark:bg-[#252525] border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {isUserPending(viewUser) ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleResendInvite(viewUser);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#801e38] hover:bg-[#601328] text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Resend Invite
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSendMessage(viewUser);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Message
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const u = viewUser;
                    await handleDeactivateUser(u);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    (viewUser.status || '').toLowerCase() === 'inactive'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {(viewUser.status || '').toLowerCase() === 'inactive' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      Activate User
                    </>
                  ) : (
                    <>
                      <ShieldOff className="w-3.5 h-3.5" />
                      Deactivate User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const u = viewUser;
                    await handleHardDeleteUser(u);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Defensive Destructive Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        description={confirmModalConfig.description}
        confirmWord={confirmModalConfig.confirmWord}
        confirmButtonText={confirmModalConfig.confirmButtonText}
        severity={confirmModalConfig.severity}
        affectedItemsCount={confirmModalConfig.affectedItemsCount}
        loading={confirmModalConfig.loading}
      />
    </div>
  );
}

