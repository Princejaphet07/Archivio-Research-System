import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { deleteUser, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { logActivity } from '../firebase/logActivity';
import Swal from 'sweetalert2';

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    programs: '',
    role: 'dean+adviser',
    moduleAccess: {
      dashboard: false,
      reports: false,
      allUsers: false,
      activityLogs: false
    }
  });

  // Fetch deans from Firestore on mount
  useEffect(() => {
    fetchDeans();
  }, []);

  const fetchDeans = async () => {
    try {
      // Fetch deans
      const deansQuery = query(collection(db, 'deans'), orderBy('createdAt', 'desc'));
      const deansSnap = await getDocs(deansQuery);
      const deansData = deansSnap.docs.map(d => ({ id: d.id, _collection: 'deans', ...d.data() }));

      // Fetch super admins
      const saQuery = query(collection(db, 'super_admins'), orderBy('createdAt', 'desc'));
      const saSnap = await getDocs(saQuery);
      const saData = saSnap.docs.map(d => ({ id: d.id, _collection: 'super_admins', ...d.data() }));

      // Merge and sort by createdAt descending
      const merged = [...saData, ...deansData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setAllUsers(merged);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const validateEmail = (email) => {
    // Must be @phinmaed.com domain
    return email.toLowerCase().endsWith('@phinmaed.com');
  };

  const generateRandomPassword = () => {
    // Generate a strong random password
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Add random characters to reach 12 chars
    const all = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const toggleSelectDean = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleDeleteSelectedDeans = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select users to delete');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!'
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const userDoc = allUsers.find(u => u.id === userId);
        if (!userDoc) continue;

        // Delete from the correct Firestore collection
        await deleteDoc(doc(db, userDoc._collection, userId));

        // Delete from users collection
        if (userDoc.uid) {
          try {
            await deleteDoc(doc(db, 'users', userDoc.uid));
          } catch (userError) {
            console.warn(`Could not delete user profile:`, userError);
          }
        }

        // Delete Firebase Auth account via backend
        if (userDoc.uid) {
          try {
            await fetch('http://localhost:3001/api/delete-auth-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: userDoc.uid, email: userDoc.email })
            });
          } catch (deleteAuthError) {
            console.warn(`Could not delete Firebase Auth account:`, deleteAuthError);
          }
        }
      }

      setSuccess(`✅ ${selectedUsers.size} user(s) deleted successfully!`);
      setSelectedUsers(new Set());

      // 📅 Log deletion
      await logActivity({
        user:   auth.currentUser?.email || 'System Admin',
        role:   'System Admin',
        action: `Deleted ${selectedUsers.size} user account(s)`,
        status: 'Success',
        details: `UIDs removed from system`,
      });

      await fetchDeans();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting users:', error);
      setError('Failed to delete user(s). Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDean = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.department) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Email must use @phinmaed.com domain (e.g., prdo.vender.swu@phinmaed.com)');
      return;
    }

    setLoading(true);

    try {
      // CLEANUP: If the admin is reusing an email (e.g., testing after manual Firebase Auth deletion),
      // wipe orphaned data tied to this email to ensure a completely fresh start.
      const targetEmail = formData.email.toLowerCase().trim();
      
      const collectionsToClean = ['users', 'deans', 'super_admins', 'advisers'];
      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        const deletes = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletes);
      }
      
      // Clean up orphaned groups tied to this adviser/dean email
      const qGroups = query(collection(db, 'groups'), where('adviserUid', '==', targetEmail));
      const snapGroups = await getDocs(qGroups);
      const deleteGroups = snapGroups.docs.map(d => deleteDoc(doc(db, 'groups', d.id)));
      await Promise.all(deleteGroups);

      // Generate invitation token and temporary password
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const temporaryPassword = generateRandomPassword();
      
      // === SUPER ADMIN FLOW ===
      if (formData.role === 'super-admin') {
        const saPortalLink = `http://localhost:5173`;
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email.toLowerCase().trim(), temporaryPassword);
          const firebaseUser = userCredential.user;

          const superAdminData = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            email: formData.email.toLowerCase().trim(),
            department: formData.department,
            role: 'super-admin',
            moduleAccess: formData.moduleAccess,
            status: 'active',
            uid: firebaseUser.uid,
            temporaryPassword: temporaryPassword,
            invitationToken: invitationToken,
            invitationLink: saPortalLink,
            invitationSent: true,
            invitationDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
          };

          await addDoc(collection(db, 'super_admins'), superAdminData);

          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: formData.email.toLowerCase().trim(),
            displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            role: 'super-admin',
            moduleAccess: formData.moduleAccess,
            status: 'active',
            createdAt: new Date().toISOString()
          });

          // Send invitation email to SA portal
          try {
            await fetch('http://localhost:3001/api/send-super-admin-invitation-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: formData.email.toLowerCase().trim(),
                name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
                invitationLink: saPortalLink,
                temporaryPassword: temporaryPassword,
                moduleAccess: formData.moduleAccess,
              })
            });
          } catch (emailError) {
            console.warn('Email service error (super admin still created):', emailError);
          }

          // 📅 Log Super Admin creation
          await logActivity({
            user:   auth.currentUser?.email || 'System Admin',
            role:   'System Admin',
            action: `Created Super Admin account`,
            status: 'Success',
            details: `${formData.firstName.trim()} ${formData.lastName.trim()} (${formData.email.toLowerCase().trim()}) — ${formData.department || 'No dept'}`,
          });

          await fetchDeans();
          setSuccess(`✅ Super Admin invitation sent to ${formData.email}!`);
          setFormData({ firstName: '', lastName: '', email: '', department: '', programs: '', role: 'dean+adviser', moduleAccess: { dashboard: false, reports: false, allUsers: false, activityLogs: false } });
          setTimeout(() => { setIsModalOpen(false); setSuccess(''); }, 2000);
          return;
          
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            setError('This email is already registered. Please use a different email.');
          } else {
            setError('Failed to create Super Admin account.');
          }
          setLoading(false);
          return;
        }
      }
      // === END SUPER ADMIN FLOW ===

      const invitationLink = `http://localhost:5174/login`;
      
      // Create Firebase Auth account with temporary password FIRST
      try {
        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email.toLowerCase().trim(), temporaryPassword);
        const firebaseUser = userCredential.user;
        
        console.log('✅ Firebase Auth account created for:', firebaseUser.email, 'UID:', firebaseUser.uid);

        // Create dean invitation in Firestore
        const deanData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          email: formData.email.toLowerCase().trim(),
          department: formData.department,
          programs: formData.programs ? formData.programs.split(',').map(p => p.trim()) : [],
          role: formData.role,
          status: 'active', // Auth account is created; activation pending password change
          accountStatus: 'pending_activation', // Flag: first-time login must change password
          uid: firebaseUser.uid,
          temporaryPassword: temporaryPassword, // Store temp password for reference
          invitationToken: invitationToken,
          invitationLink: invitationLink,
          invitationSent: true,
          invitationDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        };

        await addDoc(collection(db, 'deans'), deanData);

        // Create user profile
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: formData.email.toLowerCase().trim(),
          displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          role: formData.role,
          department: formData.department,
          status: 'active',
          createdAt: new Date().toISOString()
        });

      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please use a different email.');
          setLoading(false);
          return;
        }
        throw authError;
      }

      // ===== AUTO-SAVE DEPARTMENT =====
      try {
        // Check if department already exists
        const deptsQuery = query(
          collection(db, 'departments'),
          where('name', '==', formData.department)
        );
        const deptsSnapshot = await getDocs(deptsQuery);

        if (deptsSnapshot.empty) {
          // Department doesn't exist, create it
          await addDoc(collection(db, 'departments'), {
            name: formData.department,
            status: 'Active',
            createdAt: new Date().toISOString()
          });
        }
      } catch (deptError) {
        console.warn('Error saving department:', deptError);
      }

      // ===== AUTO-SAVE PROGRAMS =====
      if (formData.programs) {
        const programCodes = formData.programs.split(',').map(p => p.trim());
        
        // Map of program codes to full names
        const programNameMap = {
          'BSIT': 'Bachelor of Science in Information Technology',
          'BSCS': 'Bachelor of Science in Computer Science',
          'BSMA': 'Bachelor of Science in Mathematics',
          'BSBA': 'Bachelor of Science in Business Administration',
          'BSA': 'Bachelor of Science in Accountancy',
          'BSHRM': 'Bachelor of Science in Hotel & Restaurant Management',
          'DDM': 'Doctor of Dental Medicine',
          'BSN': 'Bachelor of Science in Nursing',
          'BSPE': 'Bachelor of Science in Physical Education',
          'BSPS': 'Bachelor of Science in Psychology'
        };

        for (const code of programCodes) {
          try {
            // Check if program already exists in this college
            const progsQuery = query(
              collection(db, 'programs'),
              where('code', '==', code),
              where('school', '==', formData.department)
            );
            const progsSnapshot = await getDocs(progsQuery);

            if (progsSnapshot.empty) {
              // Program doesn't exist, create it
              await addDoc(collection(db, 'programs'), {
                code: code,
                name: programNameMap[code] || `Program ${code}`,
                school: formData.department,
                createdAt: new Date().toISOString()
              });
            }
          } catch (progError) {
            console.warn(`Error saving program ${code}:`, progError);
          }
        }
      }

      // Call email service to send dean invitation
      try {
        const emailResponse = await fetch('http://localhost:3001/api/send-dean-invitation-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formData.email.toLowerCase().trim(),
            deanName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            invitationLink: invitationLink,
            temporaryPassword: temporaryPassword,
            message: `You have been invited to join ARCHIVIO Research Management System as a Dean. 

Your temporary credentials are:
Email: ${formData.email.toLowerCase().trim()}
Temporary Password: ${temporaryPassword}

Please login with these credentials at the link below, and you'll be prompted to create a new password.`
          })
        });

        if (!emailResponse.ok) {
          console.warn('Email send failed, but dean account saved to database');
        }
      } catch (emailError) {
        console.warn('Email service error (dean account still created):', emailError);
      }

      // Refresh the list
      await fetchDeans();

      // 📅 Log Dean creation
      await logActivity({
        user:   auth.currentUser?.email || 'System Admin',
        role:   'System Admin',
        action: `Created ${formData.role === 'dean+adviser' ? 'Dean + Adviser' : 'Dean'} account`,
        status: 'Success',
        details: `${formData.firstName.trim()} ${formData.lastName.trim()} — ${formData.department}`,
      });

      setSuccess(`✅ Dean invitation sent to ${formData.email}!`);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        programs: '',
        role: 'dean+adviser',
        moduleAccess: {
          dashboard: false,
          reports: false,
          allUsers: false,
          activityLogs: false
        }
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Error creating dean:', error);
      setError('Failed to create dean account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (deanId, deanEmail, deanName) => {
    try {
      const deanRef = doc(db, 'deans', deanId);
      
      // Get the invitation link from the dean document
      const deanSnap = await getDocs(query(collection(db, 'deans'), where('email', '==', deanEmail)));
      const deanData = deanSnap.docs[0]?.data();
      const invitationLink = deanData?.invitationLink || `http://localhost:5173/dean-activate?token=${Math.random().toString(36).substring(2, 15)}`;
      
      await updateDoc(deanRef, {
        invitationDate: new Date().toISOString(),
        invitationSent: true
      });

      // Call email service to resend email
      try {
        await fetch('http://localhost:3001/api/send-dean-invitation-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: deanEmail,
            deanName: deanName,
            invitationLink: invitationLink,
            temporaryPassword: deanData?.temporaryPassword || 'N/A', // Include stored temp password
            message: `This is a resend of your invitation to join ARCHIVIO Research Management System as a Dean.

Your temporary credentials are:
Email: ${deanEmail}
Temporary Password: ${deanData?.temporaryPassword || '[Password stored in database]'}

Please login with these credentials and set up your account.`
          })
        });
      } catch (emailError) {
        console.warn('Email service error:', emailError);
      }
      
      Swal.fire({
        title: 'Success!',
        text: `Invitation resent to ${deanEmail}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      fetchDeans();
    } catch (error) {
      console.error('Error resending invitation:', error);
      Swal.fire('Error', 'Failed to resend invitation', 'error');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
      
      <Sidebar />

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Component */}
        <Header 
          title="User Management" 
          breadcrumbs={['Accounts', 'Users']} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-3xl font-serif font-bold text-stone-900 mb-1">User Management</h3>
              <p className="text-sm text-stone-500">Create and manage user accounts. Assign roles and permissions for the system.</p>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Table Header Controls */}
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-end gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 sm:flex-none bg-[#801e38] hover:bg-[#601328] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>+</span> Add User
                </button>
                {selectedUsers.size > 0 && (
                  <button 
                    onClick={handleDeleteSelectedDeans}
                    disabled={loading}
                    className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    <span>🗑️</span> Delete ({selectedUsers.size})
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-4 py-4 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedUsers.size === allUsers.filter(d => 
                          d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.department?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length && allUsers.filter(d => 
                          d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.department?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length > 0}
                        onChange={(e) => {
                          const filtered = allUsers.filter(d => 
                            d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.department?.toLowerCase().includes(searchQuery.toLowerCase())
                          );
                          if (e.target.checked) {
                            setSelectedUsers(new Set(filtered.map(d => d.id)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                        className="w-4 h-4 text-[#801e38] rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">NAME ↕</th>
                    <th className="px-6 py-4">EMAIL</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">DEPARTMENT ↕</th>
                    <th className="px-6 py-4">ROLE</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">STATUS ↕</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">CREATED ↕</th>
                    <th className="px-6 py-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {allUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-stone-500">
                        No user accounts yet. Click "+ Add User" to get started.
                      </td>
                    </tr>
                  ) : (
                    allUsers
                      .filter(user => 
                        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.department?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-stone-50/50 transition-colors group">
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => toggleSelectDean(user.id)}
                              className="w-4 h-4 text-[#801e38] rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 font-bold text-stone-800 whitespace-nowrap">{user.displayName}</td>
                          <td className="px-6 py-4 text-stone-500 whitespace-nowrap">{user.email}</td>
                          <td className="px-6 py-4 text-stone-700 font-medium whitespace-nowrap">{user.department || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5 flex-wrap">
                              {user.role === 'super-admin' && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                                  Super Admin
                                </span>
                              )}
                              {user.role === 'dean' && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                                  Dean
                                </span>
                              )}
                              {user.role === 'dean+adviser' && (
                                <>
                                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                                    Dean
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                                    Adviser
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full text-white ${
                              user.status === 'active' ? 'bg-emerald-600' : 'bg-[#801e38]'
                            }`}>
                              {user.status === 'active' ? 'Active' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-stone-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                          <td className="px-6 py-4">
                            {user.status === 'pending' ? (
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => resendInvitation(user.id, user.email, user.displayName)}
                                  className="bg-[#801e38] hover:bg-[#601328] text-white text-[11px] font-bold px-4 py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Resend
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button className="w-8 h-8 rounded border border-stone-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                                  👁️
                                </button>
                                <button className="w-8 h-8 rounded border border-stone-200 text-amber-500 hover:bg-amber-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                                  ✏️
                                </button>
                                <button className="w-8 h-8 rounded border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                                  ⛔
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-6 px-1">
            <span className="text-sm text-stone-500 font-medium">
              Showing {allUsers.length} {allUsers.length === 1 ? 'User' : 'Users'}
            </span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50">‹</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#801e38] text-white font-bold shadow-sm cursor-pointer">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer">›</button>
            </div>
          </div>

        </div>

        {/* Create Dean Account Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-stone-200">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-green-600">+</span> Add User
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">Fill in user's info — activation link will be sent to their email</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-green-500 text-sm">✅</span>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Maria"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Santos"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    placeholder="e.g., prdo.vender.swu@phinmaed.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                  />
                  <p className="text-xs text-stone-500 mt-1">Must use @phinmaed.com domain</p>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                  >
                    <option value="">Select department...</option>
                    <option value="College of IT">College of Information Technology</option>
                    <option value="College of Nursing">College of Nursing</option>
                    <option value="College of Business">College of Business Administration</option>
                    <option value="College of Dentistry">College of Dentistry</option>
                    <option value="College of Medicine">College of Pre-Medicine</option>
                    <option value="College of Engineering">College of Engineering</option>
                  </select>
                </div>

                {/* Programs */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Programs (comma-separated)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. BSIT, BSCS, BSIS — auto-adds to CMS"
                    value={formData.programs}
                    onChange={(e) => setFormData({...formData, programs: e.target.value})}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                  />
                </div>

                {/* Role Assignment */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Role Assignment <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                  >
                    <option value="">Select role...</option>
                    <option value="super-admin">Super Admin</option>
                    <option value="dean">Dean Only - Access Dean Dashboard only</option>
                    <option value="dean+adviser">Dean + Research Adviser - Dual role access both dashboards</option>
                  </select>
                </div>

                {/* Module Access - Show only for Super Admin */}
                {formData.role === 'super-admin' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-3">
                      Module Access
                    </label>
                    <p className="text-xs text-stone-500 mb-3">Select modules this Super Admin can access:</p>
                    
                    <div className="space-y-2.5">
                      {/* Dashboard */}
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="dashboard"
                          checked={formData.moduleAccess.dashboard}
                          onChange={(e) => setFormData({
                            ...formData, 
                            moduleAccess: {...formData.moduleAccess, dashboard: e.target.checked}
                          })}
                          className="w-4 h-4 text-[#801e38] bg-gray-100 border-gray-300 rounded focus:ring-[#801e38]"
                        />
                        <label htmlFor="dashboard" className="text-sm text-stone-700 font-medium cursor-pointer">
                          Dashboard
                        </label>
                      </div>

                      {/* Reports */}
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="reports"
                          checked={formData.moduleAccess.reports}
                          onChange={(e) => setFormData({
                            ...formData, 
                            moduleAccess: {...formData.moduleAccess, reports: e.target.checked}
                          })}
                          className="w-4 h-4 text-[#801e38] bg-gray-100 border-gray-300 rounded focus:ring-[#801e38]"
                        />
                        <label htmlFor="reports" className="text-sm text-stone-700 font-medium cursor-pointer">
                          Reports
                        </label>
                      </div>

                      {/* All Users */}
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="allUsers"
                          checked={formData.moduleAccess.allUsers}
                          onChange={(e) => setFormData({
                            ...formData, 
                            moduleAccess: {...formData.moduleAccess, allUsers: e.target.checked}
                          })}
                          className="w-4 h-4 text-[#801e38] bg-gray-100 border-gray-300 rounded focus:ring-[#801e38]"
                        />
                        <label htmlFor="allUsers" className="text-sm text-stone-700 font-medium cursor-pointer">
                          All Users
                        </label>
                      </div>

                      {/* Activity Logs */}
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="activityLogs"
                          checked={formData.moduleAccess.activityLogs}
                          onChange={(e) => setFormData({
                            ...formData, 
                            moduleAccess: {...formData.moduleAccess, activityLogs: e.target.checked}
                          })}
                          className="w-4 h-4 text-[#801e38] bg-gray-100 border-gray-300 rounded focus:ring-[#801e38]"
                        />
                        <label htmlFor="activityLogs" className="text-sm text-stone-700 font-medium cursor-pointer">
                          Activity Logs
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateDean}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Send Invite & Add User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}