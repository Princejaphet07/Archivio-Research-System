import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, firebaseConfig } from '../firebase/config';
import { deleteUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { logActivity } from '../../firebase/logActivity';
import Swal from 'sweetalert2';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Trash2, Eye, Edit2, Ban, Plus } from 'lucide-react';
import { Card, CardBody, PremiumButton, SectionTitle, StatusBadge } from '../../components/ui/Card';

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { selectedYear, filterByAcademicYear } = useAcademicYear();
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

  // Department & Program lists from Firestore
  const [departmentsList, setDepartmentsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [showProgramsDropdown, setShowProgramsDropdown] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [programSearch, setProgramSearch] = useState('');

  // Add Program Modal State
  const [showAddProgModal, setShowAddProgModal] = useState(false);
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [addingProg, setAddingProg] = useState(false);


  // Default program list — always available even if Firestore is empty
  const defaultPrograms = [
    { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
    { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
    { code: 'BSIS', name: 'Bachelor of Science in Information Systems' },
    { code: 'BSEMC', name: 'Bachelor of Science in Entertainment & Multimedia Computing' },
    { code: 'BSN', name: 'Bachelor of Science in Nursing' },
    { code: 'BSBA', name: 'Bachelor of Science in Business Administration' },
    { code: 'BSA', name: 'Bachelor of Science in Accountancy' },
    { code: 'BSHRM', name: 'Bachelor of Science in Hotel & Restaurant Management' },
    { code: 'BSTM', name: 'Bachelor of Science in Tourism Management' },
    { code: 'BSCrim', name: 'Bachelor of Science in Criminology' },
    { code: 'BSED', name: 'Bachelor of Secondary Education' },
    { code: 'BEED', name: 'Bachelor of Elementary Education' },
    { code: 'BSPsych', name: 'Bachelor of Science in Psychology' },
    { code: 'BSPH', name: 'Bachelor of Science in Public Health' },
    { code: 'BSPharma', name: 'Bachelor of Science in Pharmacy' },
    { code: 'BSMT', name: 'Bachelor of Science in Medical Technology' },
    { code: 'BSPT', name: 'Bachelor of Science in Physical Therapy' },
    { code: 'BSRT', name: 'Bachelor of Science in Radiologic Technology' },
    { code: 'DDM', name: 'Doctor of Dental Medicine' },
    { code: 'BSCE', name: 'Bachelor of Science in Civil Engineering' },
    { code: 'BSEE', name: 'Bachelor of Science in Electrical Engineering' },
    { code: 'BSME', name: 'Bachelor of Science in Mechanical Engineering' },
    { code: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' },
    { code: 'BSArch', name: 'Bachelor of Science in Architecture' },
    { code: 'BSPE', name: 'Bachelor of Science in Physical Education' },
    { code: 'BSMA', name: 'Bachelor of Science in Mathematics' },
    { code: 'ABComm', name: 'Bachelor of Arts in Communication' },
    { code: 'ABPolSci', name: 'Bachelor of Arts in Political Science' },
  ];

  useEffect(() => {
    let deansData = [];
    let saData = [];

    const mergeUsers = () => {
      const merged = [...saData, ...deansData].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setAllUsers(merged);
    };

    const unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
      deansData = snap.docs.map(d => ({ id: d.id, _collection: 'deans', ...d.data() }));
      mergeUsers();
    }, (error) => console.error('Error fetching users:', error));

    const unsubSA = onSnapshot(collection(db, 'super_admins'), (snap) => {
      saData = snap.docs.map(d => ({ id: d.id, _collection: 'super_admins', ...d.data() }));
      mergeUsers();
    }, (error) => console.error('Error fetching users:', error));

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartmentsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Error fetching departments:', err));

    const unsubProgs = onSnapshot(collection(db, 'programs'), (snap) => {
      const firestoreProgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const seen = new Set();
      const merged = [];
      for (const prog of [...firestoreProgs, ...defaultPrograms]) {
        if (!seen.has(prog.code)) {
          seen.add(prog.code);
          merged.push(prog);
        }
      }
      merged.sort((a, b) => a.code.localeCompare(b.code));
      setProgramsList(merged);
    }, (err) => {
      console.error('Error fetching programs:', err);
      setProgramsList([...defaultPrograms].sort((a, b) => a.code.localeCompare(b.code)));
    });

    return () => {
      unsubDeans();
      unsubSA();
      unsubDepts();
      unsubProgs();
    };
  }, []);

  const handleAddNewDepartment = async () => {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    try {
      const existingSnap = await getDocs(query(collection(db, 'departments'), where('name', '==', newDeptName.trim())));
      if (!existingSnap.empty) {
        Swal.fire('Exists', 'This department already exists.', 'warning');
        setAddingDept(false);
        return;
      }
      await addDoc(collection(db, 'departments'), {
        name: newDeptName.trim(),
        status: 'Active',
        createdAt: new Date().toISOString()
      });
      setFormData(prev => ({ ...prev, department: newDeptName.trim() }));
      setNewDeptName('');
      setShowAddDeptModal(false);
      Swal.fire({ icon: 'success', title: 'Added!', text: 'Department added successfully.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error adding department:", err);
      Swal.fire('Error', 'Failed to add department.', 'error');
    } finally {
      setAddingDept(false);
    }
  };

  const handleAddNewProgram = async () => {
    if (!newProgCode.trim() || !newProgName.trim() || !formData.department) {
      Swal.fire('Error', 'Please enter both Program Code and Name, and ensure a Department is selected.', 'error');
      return;
    }
    setAddingProg(true);
    try {
      await addDoc(collection(db, 'programs'), {
        code: newProgCode.trim().toUpperCase(),
        name: newProgName.trim(),
        school: formData.department
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Program Added',
        showConfirmButton: false,
        timer: 3000
      });
      setShowAddProgModal(false);
      setNewProgCode('');
      setNewProgName('');

      // Auto-select the newly added program
      const newCode = newProgCode.trim().toUpperCase();
      if (!selectedPrograms.includes(newCode)) {
        setSelectedPrograms(prev => {
          const newList = [...prev, newCode];
          setFormData(f => ({ ...f, programs: newList.join(', ') }));
          return newList;
        });
      }
    } catch (err) {
      console.error("Error adding program:", err);
      Swal.fire('Error', 'Failed to add program.', 'error');
    } finally {
      setAddingProg(false);
    }
  };

  const toggleProgram = (code) => {
    setSelectedPrograms(prev => {
      const newList = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      setFormData(f => ({ ...f, programs: newList.join(', ') }));
      return newList;
    });
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
      text: `Are you sure you want to deactivate ${selectedUsers.size} user(s)? This will prevent them from logging in, but keep their data.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, deactivate!'
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const userDoc = allUsers.find(u => u.id === userId);
        if (!userDoc) continue;

        // Update status in the specific Firestore collection
        await updateDoc(doc(db, userDoc._collection, userId), { status: 'inactive' });

        // Update status in users collection
        if (userDoc.uid) {
          try {
            await updateDoc(doc(db, 'users', userDoc.uid), { status: 'inactive' });
          } catch (userError) {
            console.warn(`Could not update user profile:`, userError);
          }
        }

        // Disable Firebase Auth account via backend
        if (userDoc.uid) {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            await fetch(`${backendUrl}/api/disable-auth-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: userDoc.uid, email: userDoc.email })
            });
          } catch (deleteAuthError) {
            console.warn(`Could not disable Firebase Auth account:`, deleteAuthError);
          }
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Deactivated!',
        text: `${selectedUsers.size} user(s) deactivated successfully!`,
        confirmButtonColor: '#7B1F35'
      });
      setSelectedUsers(new Set());

      // 📅 Log deactivation
      await logActivity({
        user: auth.currentUser?.email || 'System Admin',
        role: 'System Admin',
        action: `Deactivated ${selectedUsers.size} user account(s)`,
        details: Array.from(selectedUsers).join(', '),
        status: 'Success'
      });
    } catch (e) {
      console.error(e);
      setError('Failed to deactivate user(s). Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHardDeleteSelectedUsers = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select users to delete');
      return;
    }

    const result = await Swal.fire({
      title: 'Permanently Delete?',
      text: `Are you sure you want to permanently delete ${selectedUsers.size} user(s)? This will wipe ALL their data from the system.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, wipe data!'
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const userDoc = allUsers.find(u => u.id === userId);
        if (!userDoc) continue;

        await deleteDoc(doc(db, userDoc._collection, userId));
        if (userDoc.uid) await deleteDoc(doc(db, 'users', userDoc.uid));

        // Cascading Delete
        try {
          if (userDoc.role === 'Student') {
            const qGroup = query(collection(db, 'groups'), where('leaderEmail', '==', userDoc.email));
            const snapGroup = await getDocs(qGroup);
            await Promise.all(snapGroup.docs.map(d => deleteDoc(doc(db, 'groups', d.id))));

            if (userDoc.uid) {
              const qSub = query(collection(db, 'submissions'), where('studentUid', '==', userDoc.uid));
              const snapSub = await getDocs(qSub);
              await Promise.all(snapSub.docs.map(d => deleteDoc(doc(db, 'submissions', d.id))));
            }
          } else if (userDoc.role === 'Adviser' || userDoc.role === 'Dean') {
            const qGroup = query(collection(db, 'groups'), where('adviserUid', '==', userDoc.email));
            const snapGroup = await getDocs(qGroup);
            await Promise.all(snapGroup.docs.map(d => deleteDoc(doc(db, 'groups', d.id))));

            const qReq = query(collection(db, 'requirements'), where('adviserUid', '==', userDoc.email));
            const snapReq = await getDocs(qReq);
            await Promise.all(snapReq.docs.map(d => deleteDoc(doc(db, 'requirements', d.id))));
          }
        } catch (cleanupErr) {
          console.error("Error cleaning up related data:", cleanupErr);
        }

        if (userDoc.uid) {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            await fetch(`${backendUrl}/api/hard-delete-auth-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: userDoc.uid, email: userDoc.email })
            });
          } catch (deleteAuthError) {
            console.warn(`Could not hard delete Firebase Auth account:`, deleteAuthError);
          }
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `${selectedUsers.size} user(s) permanently deleted successfully!`,
        confirmButtonColor: '#7B1F35'
      });

      await logActivity({
        user: auth.currentUser?.email || 'System Admin',
        role: 'System Admin',
        action: `Permanently Deleted ${selectedUsers.size} user account(s)`,
        details: Array.from(selectedUsers).join(', '),
        status: 'Success'
      });
      setSelectedUsers(new Set());
    } catch (e) {
      console.error(e);
      setError('Failed to permanently delete user(s). Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user) => {
    Swal.fire({
      title: 'User Details',
      html: `
        <div class="text-left space-y-2 text-sm mt-4">
          <p><strong>Name:</strong> ${user.displayName}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
          <p><strong>Role:</strong> <span class="capitalize">${user.role}</span></p>
          <p><strong>Status:</strong> ${user.status}</p>
          <p><strong>Created:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      `,
      icon: 'info'
    });
  };

  const handleEditUser = async (user) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Department',
      html: `<input id="swal-input1" class="swal2-input" value="${user.department || ''}" placeholder="Enter new department name">`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => document.getElementById('swal-input1').value
    });

    if (formValues !== undefined) {
      setLoading(true);
      try {
        await updateDoc(doc(db, user._collection, user.id), { department: formValues });
        if (user.uid) await updateDoc(doc(db, 'users', user.uid), { department: formValues });
        Swal.fire('Saved!', 'User department has been updated.', 'success');
      } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to update user.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSingleUser = async (user) => {
    const isInactive = user.status === 'inactive';
    const actionText = isInactive ? 'Activate' : 'Deactivate';
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `${actionText} ${user.displayName}? ${isInactive ? 'This will allow them to log in again.' : 'This will prevent them from logging in, but keep their data.'}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isInactive ? '#10b981' : '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.toLowerCase()}!`
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const newStatus = isInactive ? 'active' : 'inactive';
        await updateDoc(doc(db, user._collection, user.id), { status: newStatus });
        if (user.uid) await updateDoc(doc(db, 'users', user.uid), { status: newStatus });

        if (user.uid || user.email) {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const endpoint = isInactive ? 'enable-auth-user' : 'disable-auth-user';
            await fetch(`${backendUrl}/api/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: user.uid, email: user.email })
            });
          } catch (err) { }
        }

        Swal.fire(`${actionText}d!`, `User has been ${actionText.toLowerCase()}d.`, 'success');
      } catch (e) {
        Swal.fire('Error', `Could not ${actionText.toLowerCase()} user.`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHardDeleteSingleUser = async (user) => {
    const result = await Swal.fire({
      title: 'Permanently Delete?',
      text: `Delete ${user.displayName}? This will wipe ALL their data from the system.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, wipe data!'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, user._collection, user.id));
        if (user.uid) await deleteDoc(doc(db, 'users', user.uid));

        // Cascading Delete
        try {
          if (user.role === 'Student') {
            const qGroup = query(collection(db, 'groups'), where('leaderEmail', '==', user.email));
            const snapGroup = await getDocs(qGroup);
            await Promise.all(snapGroup.docs.map(d => deleteDoc(doc(db, 'groups', d.id))));

            if (user.uid) {
              const qSub = query(collection(db, 'submissions'), where('studentUid', '==', user.uid));
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

        if (user.uid) {
          try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            await fetch(`${backendUrl}/api/hard-delete-auth-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: user.uid, email: user.email })
            });
          } catch (err) { }
        }

        Swal.fire('Deleted!', 'User has been permanently deleted.', 'success');
      } catch (e) {
        Swal.fire('Error', 'Could not delete user.', 'error');
      } finally {
        setLoading(false);
      }
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

      // Clean up orphaned adviser requirements
      const qReqs = query(collection(db, 'requirements'), where('adviserUid', '==', targetEmail));
      const snapReqs = await getDocs(qReqs);
      const deleteReqs = snapReqs.docs.map(d => deleteDoc(doc(db, 'requirements', d.id)));
      await Promise.all(deleteReqs);

      // Generate invitation token and temporary password
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const temporaryPassword = generateRandomPassword();

      // === SUPER ADMIN FLOW ===
      if (formData.role === 'super-admin') {
        const saPortalLink = window.location.origin;

        try {
          const appName = 'SecondaryAppSA_' + Date.now().toString();
          const secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = getAuth(secondaryApp);

          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email.toLowerCase().trim(), temporaryPassword);
          const firebaseUser = userCredential.user;
          const newUid = firebaseUser.uid;

          await secondaryAuth.signOut();
          await deleteApp(secondaryApp);

          const superAdminData = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            email: formData.email.toLowerCase().trim(),
            department: formData.department,
            role: 'super-admin',
            moduleAccess: formData.moduleAccess,
            status: 'active',
            uid: newUid,
            temporaryPassword: temporaryPassword,
            invitationToken: invitationToken,
            invitationLink: saPortalLink,
            invitationSent: true,
            invitationDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            createdBy: 'admin',
          };

          await addDoc(collection(db, 'super_admins'), superAdminData);

          await setDoc(doc(db, 'users', newUid), {
            uid: newUid,
            email: formData.email.toLowerCase().trim(),
            displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            role: 'super-admin',
            moduleAccess: formData.moduleAccess,
            status: 'active',
            createdAt: new Date().toISOString()
          });

          // Send invitation email to SA portal
          try {
            await addDoc(collection(db, 'mail'), {
              to: formData.email.toLowerCase().trim(),
              message: {
                subject: "Invitation to Join ARCHIVIO as Super Admin",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                      <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                      <h2 style="color: #2d3748; margin-top: 0;">Hi ${formData.firstName.trim()},</h2>
                      <p style="color: #4a5568; line-height: 1.6;">You have been invited to join the ARCHIVIO Research Management System as a Super Admin.</p>
                      
                      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #4a5568;"><strong>Your Temporary Credentials:</strong></p>
                        <p style="margin: 0; color: #2d3748;">Email: ${formData.email.toLowerCase().trim()}</p>
                        <p style="margin: 5px 0 0 0; color: #2d3748;">Password: <strong>${temporaryPassword}</strong></p>
                        <p style="margin: 10px 0 0 0; color: #e53e3e; font-size: 12px;"><em>Please log in and change your password immediately.</em></p>
                      </div>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${saPortalLink}" style="background-color: #541b2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Admin Portal</a>
                      </div>
                    </div>
                  </div>
                `
              }
            });
          } catch (emailError) {
            console.warn('Email service error (super admin still created):', emailError);
          }

          // 📅 Log Super Admin creation
          await logActivity({
            user: auth.currentUser?.email || 'System Admin',
            role: 'System Admin',
            action: `Created Super Admin account`,
            status: 'Success',
            details: `${formData.firstName.trim()} ${formData.lastName.trim()} (${formData.email.toLowerCase().trim()}) — ${formData.department || 'No dept'}`,
          });

          await fetchDeans();
          
          Swal.fire({
            title: 'Success!',
            text: `Super Admin invitation sent to ${formData.email}!`,
            icon: 'success',
            confirmButtonColor: '#801e38'
          });
          
          setFormData({ firstName: '', lastName: '', email: '', department: '', programs: '', role: 'dean+adviser', moduleAccess: { dashboard: false, reports: false, allUsers: false, activityLogs: false } });
          setSelectedPrograms([]);
          setIsModalOpen(false);
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

      const deanPortalUrl = window.location.origin;
      const invitationLink = `${deanPortalUrl}/`;

      // Create Firebase Auth account with temporary password FIRST
      try {
        const appName = 'SecondaryAppDean_' + Date.now().toString();
        const secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email.toLowerCase().trim(), temporaryPassword);
        const firebaseUser = userCredential.user;
        const newUid = firebaseUser.uid;

        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);

        console.log('✅ Firebase Auth account created for:', formData.email, 'UID:', newUid);

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
          uid: newUid,
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
        await setDoc(doc(db, 'users', newUid), {
          uid: newUid,
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

      // Trigger Firebase Email Extension to send dean invitation
      try {
        await addDoc(collection(db, 'mail'), {
          to: formData.email.toLowerCase().trim(),
          message: {
            subject: "Invitation to Join ARCHIVIO as a Dean",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
                  <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
                  <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
                </div>
                
                <div style="padding: 40px 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Welcome, ${formData.firstName.trim()}!</h2>
                  <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Dean</strong>. Step into your portal to oversee, manage, and empower the research initiatives within your department.</p>
                  
                  <div style="background-color: #faf6f0; border-left: 4px solid #541b2f; border-radius: 4px 8px 8px 4px; padding: 20px; margin: 30px 0;">
                    <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Temporary Credentials</p>
                    
                    <div style="margin-bottom: 12px;">
                      <span style="color: #718096; font-size: 13px; display: block; margin-bottom: 4px;">Email Address</span>
                      <strong style="color: #2d3748; font-size: 15px;">${formData.email.toLowerCase().trim()}</strong>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                      <span style="color: #718096; font-size: 13px; display: block; margin-bottom: 4px;">Temporary Password</span>
                      <code style="background-color: #ffffff; padding: 8px 16px; border-radius: 6px; color: #541b2f; font-size: 16px; font-weight: bold; border: 1px solid #d5c9bb; display: inline-block;">${temporaryPassword}</code>
                    </div>
                    
                    <p style="margin: 0; color: #e53e3e; font-size: 13px; font-style: italic;">* You will be prompted to set a new, secure password upon your first login.</p>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0 10px 0;">
                    <a href="${invitationLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Access Dean Portal</a>
                  </div>
                </div>
                
                <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                  <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
                </div>
              </div>
            `
          }
        });
      } catch (emailError) {
        console.warn('Email service error (dean account still created):', emailError);
      }

      // Refresh the list (handled by onSnapshot)

      // 📅 Log Dean creation
      await logActivity({
        user: auth.currentUser?.email || 'System Admin',
        role: 'System Admin',
        action: `Created ${formData.role === 'dean+adviser' ? 'Dean + Adviser' : 'Dean'} account`,
        status: 'Success',
        details: `${formData.firstName.trim()} ${formData.lastName.trim()} — ${formData.department}`,
      });

      Swal.fire({
        title: 'Success!',
        text: `Dean invitation sent to ${formData.email}!`,
        icon: 'success',
        confirmButtonColor: '#801e38'
      });

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
      setSelectedPrograms([]);

      // Close modal
      setIsModalOpen(false);

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
      const deanPortalUrl = window.location.origin;
      const invitationLink = deanData?.invitationLink || `${deanPortalUrl}/`;

      await updateDoc(deanRef, {
        invitationDate: new Date().toISOString(),
        invitationSent: true
      });

      // Call email service to resend email
      try {
        await addDoc(collection(db, 'mail'), {
          to: deanEmail,
          message: {
            subject: "Reminder: Invitation to Join ARCHIVIO as a Dean",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
                  <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
                  <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
                </div>
                
                <div style="padding: 40px 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Hi ${deanName},</h2>
                  <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">This is a friendly reminder that you have been invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Dean</strong>. Please log in to oversee and empower the research initiatives within your department.</p>
                  
                  <div style="text-align: center; margin: 40px 0 10px 0;">
                    <a href="${invitationLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Access Dean Portal</a>
                  </div>
                </div>
                
                <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                  <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
                </div>
              </div>
            `
          }
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

  const filteredUsersList = React.useMemo(() => {
    // User accounts are permanent — do NOT filter by academic year
    return allUsers.filter(d =>
      d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsersList.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsersList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] font-sans overflow-hidden">

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
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <SectionTitle sub="Create and manage user accounts. Assign roles and permissions for the system.">
            System Users
          </SectionTitle>

          {/* TABLE CONTAINER */}
          <Card className="flex flex-col overflow-hidden mb-6">

            {/* Table Header Controls */}
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-end gap-4 bg-stone-50/50">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <PremiumButton onClick={() => setIsModalOpen(true)} variant="primary" icon={<Plus className="w-4 h-4" />}>
                  Add User
                </PremiumButton>
                {selectedUsers.size > 0 && (
                  <>
                    <PremiumButton onClick={handleDeleteSelectedDeans} disabled={loading} variant="primary" icon={<span className="font-bold text-xs">⊗</span>}>
                      Deactivate ({selectedUsers.size})
                    </PremiumButton>
                    <PremiumButton onClick={handleHardDeleteSelectedUsers} disabled={loading} variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                      Delete ({selectedUsers.size})
                    </PremiumButton>
                  </>
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
                        checked={selectedUsers.size === filteredUsersList.length && filteredUsersList.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(new Set(filteredUsersList.map(d => d.id)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                        className="w-4 h-4 text-[#801e38] rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600">NAME ↕</th>
                    <th className="px-3 py-3">EMAIL</th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600">DEPARTMENT ↕</th>
                    <th className="px-3 py-3">ROLE</th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600">STATUS ↕</th>
                    <th className="px-3 py-3 cursor-pointer hover:text-stone-600">CREATED ↕</th>
                    <th className="px-3 py-3 text-center">ACTIONS</th>
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
                    paginatedUsers.map(user => (
                      <tr key={user.id} className="hover:bg-stone-50 transition-colors group">
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleSelectDean(user.id)}
                            className="w-4 h-4 text-[#801e38] rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 font-bold text-stone-800 whitespace-nowrap">{user.displayName}</td>
                        <td className="px-3 py-3 text-stone-500 whitespace-nowrap">{user.email}</td>
                        <td className="px-3 py-3 text-stone-700 font-medium whitespace-nowrap">{user.department || '—'}</td>
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3">
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full text-white ${user.status === 'active' ? 'bg-emerald-600' : 'bg-[#801e38]'
                            }`}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-stone-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                        <td className="px-3 py-3">
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
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                                title="Edit user"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleUser(user)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                  user.status === 'inactive'
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                                }`}
                                title={user.status === 'inactive' ? 'Activate user' : 'Deactivate user'}
                              >
                                {user.status === 'inactive' ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => handleHardDeleteSingleUser(user)}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Permanently Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </Card>

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-6 px-1">
            <span className="text-sm text-stone-500 font-medium">
              Showing {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsersList.length)} of {filteredUsersList.length} users
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-bold shadow-sm transition-colors cursor-pointer ${currentPage === page
                      ? 'bg-[#801e38] text-white'
                      : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                >{page}</button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >›</button>
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
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                  />
                  <p className="text-xs text-stone-500 mt-1">Must use @phinmaed.com domain</p>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="flex-1 bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                    >
                      <option value="">Select department...</option>
                      {departmentsList.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddDeptModal(true)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#801e38] text-white hover:bg-[#6a1830] transition shadow-sm shrink-0"
                      title="Add new department"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Programs */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Programs
                  </label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowProgramsDropdown(!showProgramsDropdown)}
                        className="flex-1 bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 text-left flex items-center justify-between"
                      >
                        <span className={selectedPrograms.length === 0 ? 'text-stone-400' : 'text-stone-900'}>
                          {selectedPrograms.length === 0 ? 'Select programs...' : selectedPrograms.join(', ')}
                        </span>
                        <svg className={`w-4 h-4 text-stone-500 transition-transform ${showProgramsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.department) {
                            Swal.fire('Oops!', 'Please select a Department first before adding a Program.', 'warning');
                            return;
                          }
                          setShowAddProgModal(true);
                        }}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#801e38] text-white hover:bg-[#6a1830] transition shadow-sm shrink-0"
                        title="Add new program"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {showProgramsDropdown && (() => {
                      const filtered = programsList.filter(p =>
                        p.code.toLowerCase().includes(programSearch.toLowerCase()) || p.name.toLowerCase().includes(programSearch.toLowerCase())
                      );
                      return (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-stone-300 rounded-lg shadow-lg overflow-hidden">
                          {/* Search input */}
                          <div className="p-2 border-b border-stone-200">
                            <input
                              type="text"
                              placeholder="Search or type program code..."
                              value={programSearch}
                              onChange={(e) => setProgramSearch(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = programSearch.trim().toUpperCase();
                                  if (val && !selectedPrograms.includes(val)) {
                                    setSelectedPrograms(prev => {
                                      const newList = [...prev, val];
                                      setFormData(f => ({ ...f, programs: newList.join(', ') }));
                                      return newList;
                                    });
                                    setProgramSearch('');
                                  }
                                }
                              }}
                            />
                          </div>
                          {/* Program list */}
                          <div className="max-h-44 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-stone-500">No match found. Press <strong>Enter</strong> to add as custom.</div>
                            ) : (
                              filtered.map(prog => (
                                <label
                                  key={prog.id || prog.code}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 cursor-pointer text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPrograms.includes(prog.code)}
                                    onChange={() => toggleProgram(prog.code)}
                                    className="w-4 h-4 rounded border-stone-300 text-[#801e38] focus:ring-[#801e38]"
                                  />
                                  <span className="font-semibold text-stone-800">{prog.code}</span>
                                  <span className="text-stone-500">— {prog.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {selectedPrograms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedPrograms.map(code => (
                        <span key={code} className="inline-flex items-center gap-1 bg-[#f3e6ea] text-[#801e38] text-xs font-bold px-2.5 py-1 rounded-full">
                          {code}
                          <button type="button" onClick={() => toggleProgram(code)} className="hover:text-red-700 text-[#801e38]/60">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Role Assignment */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Role Assignment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                            moduleAccess: { ...formData.moduleAccess, dashboard: e.target.checked }
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
                            moduleAccess: { ...formData.moduleAccess, reports: e.target.checked }
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
                            moduleAccess: { ...formData.moduleAccess, allUsers: e.target.checked }
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
                            moduleAccess: { ...formData.moduleAccess, activityLogs: e.target.checked }
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
                  {loading ? 'Creating...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#801e38] px-3 py-3 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Add New Department</h3>
              <button onClick={() => { setShowAddDeptModal(false); setNewDeptName(''); }} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-stone-700 mb-2">Department Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. College of Engineering"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewDepartment()}
                className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                autoFocus
              />
            </div>
            <div className="bg-stone-50 px-3 py-3 flex justify-end gap-3 border-t border-stone-200">
              <button
                onClick={() => { setShowAddDeptModal(false); setNewDeptName(''); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewDepartment}
                disabled={addingDept || !newDeptName.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingDept ? 'Adding...' : <><Plus size={16} /> Add Department</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {showAddProgModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#801e38] px-3 py-3 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Add New Program</h3>
              <button onClick={() => { setShowAddProgModal(false); setNewProgCode(''); setNewProgName(''); }} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg mb-4">
                <strong>Adding to:</strong> {formData.department}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Program Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. BSIT"
                  value={newProgCode}
                  onChange={(e) => setNewProgCode(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 uppercase"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Full Program Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewProgram()}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                />
              </div>
            </div>
            <div className="bg-stone-50 px-3 py-3 flex justify-end gap-3 border-t border-stone-200">
              <button
                onClick={() => { setShowAddProgModal(false); setNewProgCode(''); setNewProgName(''); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewProgram}
                disabled={addingProg || !newProgCode.trim() || !newProgName.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingProg ? 'Adding...' : <><Plus size={16} /> Add Program</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
