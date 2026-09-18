import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DepartmentsProgramsTab from './DepartmentsPrograms';
import { db, auth } from '../firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  getDocs, 
  collection, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Building2, 
  Settings2, 
  Trash2, 
  Lock, 
  KeyRound, 
  Download, 
  RotateCcw, 
  ShieldAlert, 
  HardDrive, 
  Flame, 
  FolderArchive, 
  Sliders, 
  Database,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Card, SectionTitle } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { logActivity } from '../../firebase/logActivity';
import { getBackendUrl } from '../../utils/backendUrl';
import { authFetch } from '../../utils/authFetch';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('system');
  
  // System Settings State
  const [toggles, setToggles] = useState({
    maintenance: false,
    emailAlerts: true,
    publicVisibility: true,
    emailVerification: true,
  });

  // Institution State
  const [instInfo, setInstInfo] = useState({
    name: 'Southwestern University PHINMA',
    shortName: 'SWU PHINMA',
    emailDomain: '@phinmaed.com',
    location: 'Cebu City, Philippines'
  });
  const [savingInst, setSavingInst] = useState(false);

  // Storage Management State
  const [submissionsList, setSubmissionsList] = useState([]);
  const [firestoreDepartments, setFirestoreDepartments] = useState([]);
  const [firestoreRequirements, setFirestoreRequirements] = useState([]);
  const [selectedSY, setSelectedSY] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [storageQuotaGB, setStorageQuotaGB] = useState(25);
  const [isArchiving, setIsArchiving] = useState(false);

  // Storage Checkboxes (Persistent via Cloud Firestore & localStorage fallback)
  const [storageFiles, setStorageFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('archivio_admin_archive_checked_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      'Dataset Files': true,
      'Video Pitch': true,
      'User Manual': false,
      'Approval Sheet': false,
      'Signature Page': false,
      'Upload URL': false
    };
  });

  // Listeners for System Settings & Institution Info
  useEffect(() => {
    const unsubSystem = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists()) {
        setToggles(prev => ({ ...prev, ...snap.data() }));
      }
    });
    
    const unsubInst = onSnapshot(doc(db, 'settings', 'institution_info'), (snap) => {
      if (snap.exists()) {
        setInstInfo(prev => ({ ...prev, ...snap.data() }));
      }
    });

    const unsubQuota = onSnapshot(doc(db, 'settings', 'storage_quota'), (snap) => {
      if (snap.exists() && snap.data()?.quotaGB) {
        setStorageQuotaGB(Number(snap.data().quotaGB));
      }
    });

    const unsubStoragePref = onSnapshot(doc(db, 'settings', 'storage_archive_preferences'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data === 'object') {
          setStorageFiles(prev => ({ ...prev, ...data }));
          try {
            localStorage.setItem('archivio_admin_archive_checked_v1', JSON.stringify({ ...storageFiles, ...data }));
          } catch (_) {}
        }
      }
    });

    return () => {
      unsubSystem();
      unsubInst();
      unsubQuota();
      unsubStoragePref();
    };
  }, []);

  // Listeners for Submissions, Departments & Requirements for Storage Governance
  useEffect(() => {
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissionsList(subs);
    });

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      const depts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreDepartments(depts);
    });

    const unsubReqs = onSnapshot(collection(db, 'requirements'), (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreRequirements(reqs);
    });

    return () => {
      unsubSubs();
      unsubDepts();
      unsubReqs();
    };
  }, []);

  const handleToggle = async (key) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await setDoc(doc(db, 'settings', 'system_preferences'), {
        [key]: newValue
      }, { merge: true });
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  const handleSaveInst = async () => {
    setSavingInst(true);
    try {
      await setDoc(doc(db, 'settings', 'institution_info'), instInfo, { merge: true });
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Institution information updated successfully.',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#801e38'
      });
    } catch (error) {
      console.error("Failed to save institution info", error);
      Swal.fire('Error', 'Failed to save institution info.', 'error');
    } finally {
      setSavingInst(false);
    }
  };

  // Helper: Fetch Current 6-digit Master PIN from Firestore (Default fallback: '123456')
  const getMasterPin = async () => {
    try {
      const pinSnap = await getDoc(doc(db, 'settings', 'security_pin'));
      if (pinSnap.exists() && pinSnap.data()?.pin) {
        return String(pinSnap.data().pin).trim();
      }
    } catch (err) {
      console.warn("Could not read security_pin doc, using default fallback:", err);
    }
    return '123456';
  };

  // 1. CHANGE 6-DIGIT MASTER SECURITY PIN
  const handleChangePin = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-stone-900 font-bold">Change 6-Digit Master PIN</span>',
      html: `
        <p class="text-xs text-stone-500 mb-4 text-left">
          The 6-digit Security PIN is required for sensitive administrative operations such as factory resets and mass data purges.
        </p>
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-xs font-semibold text-stone-600 mb-1">Current 6-Digit PIN</label>
            <input id="swal-current-pin" type="password" maxlength="6" inputmode="numeric" placeholder="Enter current 6-digit PIN" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 tracking-widest font-mono text-center outline-none focus:border-[#801e38]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-600 mb-1">New 6-Digit PIN</label>
            <input id="swal-new-pin" type="password" maxlength="6" inputmode="numeric" placeholder="6 numeric digits" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 tracking-widest font-mono text-center outline-none focus:border-[#801e38]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-600 mb-1">Confirm New PIN</label>
            <input id="swal-confirm-pin" type="password" maxlength="6" inputmode="numeric" placeholder="Re-enter new 6-digit PIN" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 tracking-widest font-mono text-center outline-none focus:border-[#801e38]" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update Security PIN',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#801e38',
      focusConfirm: false,
      preConfirm: () => {
        const currentPin = document.getElementById('swal-current-pin').value.trim();
        const newPin = document.getElementById('swal-new-pin').value.trim();
        const confirmPin = document.getElementById('swal-confirm-pin').value.trim();

        if (!currentPin) {
          Swal.showValidationMessage('Please enter your current PIN.');
          return false;
        }
        if (!/^\d{6}$/.test(newPin)) {
          Swal.showValidationMessage('New PIN must be exactly 6 numeric digits (0-9).');
          return false;
        }
        if (newPin !== confirmPin) {
          Swal.showValidationMessage('New PIN and Confirm PIN do not match.');
          return false;
        }
        return { currentPin, newPin };
      }
    });

    if (!formValues) return;

    try {
      const activePin = await getMasterPin();
      if (formValues.currentPin !== activePin) {
        Swal.fire({
          icon: 'error',
          title: 'Incorrect Current PIN',
          text: 'The current PIN you entered does not match our records.',
          confirmButtonColor: '#801e38'
        });
        return;
      }

      await setDoc(doc(db, 'settings', 'security_pin'), {
        pin: formValues.newPin,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Super Admin'
      }, { merge: true });

      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Update Security PIN',
        status: 'Success',
        details: 'Updated system 6-digit Master PIN.'
      });

      Swal.fire({
        icon: 'success',
        title: 'PIN Updated Successfully!',
        text: 'Your new 6-digit master security PIN has been saved.',
        confirmButtonColor: '#801e38',
        timer: 2000
      });
    } catch (err) {
      console.error("Failed to update PIN:", err);
      Swal.fire('Error', 'Failed to update PIN. Please check database permissions.', 'error');
    }
  };

  // 2. BACK UP SYSTEM DATA (Download Full JSON)
  const handleBackupData = async () => {
    Swal.fire({
      title: 'Generating Full Backup...',
      html: '<p class="text-xs text-stone-500">Querying all collections from Firestore database...</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const collectionsToBackup = [
        'users',
        'super_admins',
        'deans',
        'advisers',
        'students',
        'groups',
        'submissions',
        'requirements',
        'published_papers',
        'activity_logs',
        'settings',
        'notifications',
        'invitations',
        'studentInvitations',
        'user_bookmarks'
      ];

      const backupData = {
        exportedAt: new Date().toISOString(),
        exportedBy: auth.currentUser?.email || 'Admin',
        institution: instInfo.name,
        systemVersion: 'ARCHIVIO-2026.1',
        counts: {},
        collections: {}
      };

      let totalRecords = 0;

      for (const colName of collectionsToBackup) {
        try {
          const snap = await getDocs(collection(db, colName));
          const docsData = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
          backupData.collections[colName] = docsData;
          backupData.counts[colName] = docsData.length;
          totalRecords += docsData.length;
        } catch (colErr) {
          console.warn(`Backup skipping ${colName}:`, colErr.message);
          backupData.collections[colName] = [];
          backupData.counts[colName] = 0;
        }
      }

      // Download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `archivio_full_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Backup System Data',
        status: 'Success',
        details: `Exported full database backup (${totalRecords} records).`
      });

      Swal.fire({
        icon: 'success',
        title: 'Backup Downloaded!',
        html: `
          <div class="text-xs text-stone-600 text-left space-y-1 mt-2">
            <p>✅ <b>Total Records Backed Up:</b> ${totalRecords}</p>
            <p>📁 <b>Collections Included:</b> ${collectionsToBackup.length}</p>
            <p>🔒 <b>File Format:</b> Formatted JSON</p>
          </div>
        `,
        confirmButtonColor: '#801e38'
      });
    } catch (error) {
      console.error("Backup failed:", error);
      Swal.fire('Backup Failed', 'Could not complete system data backup. Please try again.', 'error');
    }
  };

  // 3. RESET DATA (Selective Clean Reset of Submissions & Groups)
  const handleResetData = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-[#801e38] font-bold">↻ Reset Academic Data</span>',
      html: `
        <div class="text-left text-xs text-stone-600 space-y-3">
          <p class="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-3 rounded-r text-xs">
            <b>Important:</b> This will purge all research submissions, uploaded files, and student group assignments for the selected academic cycle.
            <br/><br/>
            ✅ <b>User accounts (Admins, Deans, Advisers, Students) and system settings will NOT be affected.</b>
          </p>
          <div>
            <label class="block font-bold text-stone-700 mb-1">Target School Year / Scope:</label>
            <select id="swal-reset-sy" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold outline-none focus:border-[#801e38]">
              <option value="ALL">All Academic Years (Complete Academic Cycle Wipe)</option>
              <option value="2026-2027">SY 2026-2027</option>
              <option value="2025-2026">SY 2025-2026</option>
              <option value="2024-2025">SY 2024-2025</option>
              <option value="2023-2024">SY 2023-2024</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-stone-700 mb-1">Type <span class="text-red-600 font-mono">RESET DATA</span> to confirm:</label>
            <input id="swal-reset-confirm" type="text" placeholder="RESET DATA" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono text-center outline-none focus:border-[#801e38]" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Proceed with Reset',
      confirmButtonColor: '#801e38',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const sy = document.getElementById('swal-reset-sy').value;
        const confirmText = document.getElementById('swal-reset-confirm').value.trim();
        if (confirmText !== 'RESET DATA') {
          Swal.showValidationMessage('Please type "RESET DATA" exactly in all caps to proceed.');
          return false;
        }
        return { sy };
      }
    });

    if (!formValues) return;

    Swal.fire({
      title: 'Resetting Data...',
      html: '<p class="text-xs text-stone-500">Creating safety backup and purging academic submissions...</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const backupCollections = ['groups', 'submissions', 'requirements'];
      const preBackup = { timestamp: new Date().toISOString(), scope: formValues.sy, data: {} };
      for (const col of backupCollections) {
        const snap = await getDocs(collection(db, col));
        preBackup.data[col] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      }
      const blob = new Blob([JSON.stringify(preBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivio_pre_reset_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      let subDeleted = 0;
      let groupsDeleted = 0;

      const subSnap = await getDocs(collection(db, 'submissions'));
      for (const sDoc of subSnap.docs) {
        const sData = sDoc.data();
        if (formValues.sy === 'ALL' || sData.schoolYear === formValues.sy || sData.academicYear === formValues.sy) {
          await deleteDoc(doc(db, 'submissions', sDoc.id));
          subDeleted++;
        }
      }

      const grpSnap = await getDocs(collection(db, 'groups'));
      for (const gDoc of grpSnap.docs) {
        const gData = gDoc.data();
        if (formValues.sy === 'ALL' || gData.schoolYear === formValues.sy || gData.academicYear === formValues.sy) {
          await deleteDoc(doc(db, 'groups', gDoc.id));
          groupsDeleted++;
        }
      }

      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Reset Academic Data',
        status: 'Success',
        details: `Reset academic data (${formValues.sy}). Purged ${subDeleted} submissions, ${groupsDeleted} groups. All user accounts preserved.`
      });

      Swal.fire({
        icon: 'success',
        title: 'Academic Data Reset Complete!',
        html: `
          <div class="text-xs text-stone-600 text-left space-y-1.5 mt-2">
            <p>✅ <b>Scope:</b> ${formValues.sy === 'ALL' ? 'All Academic Years' : formValues.sy}</p>
            <p>🗑️ <b>Submissions Purged:</b> ${subDeleted}</p>
            <p>👥 <b>Groups Reset:</b> ${groupsDeleted}</p>
            <p>🛡️ <b>User Accounts & Settings:</b> 100% Preserved</p>
            <p>💾 <i>Safety backup was downloaded to your computer.</i></p>
          </div>
        `,
        confirmButtonColor: '#801e38'
      });
    } catch (err) {
      console.error("Reset data error:", err);
      Swal.fire('Reset Failed', 'An error occurred while resetting academic data.', 'error');
    }
  };

  // 4. DELETE ALL DATA (Factory Wipeout with 6-Digit PIN Verification)
  const handleDeleteAllData = async () => {
    const { value: enteredPin } = await Swal.fire({
      title: '<span class="text-red-600 font-bold flex items-center justify-center gap-2">🔑 Enter 6-Digit Security PIN</span>',
      html: `
        <p class="text-xs text-stone-500 mb-4 text-center">
          This is a high-risk destructive action. Please enter the 6-digit Master PIN to authorize factory wipeout.
        </p>
        <div class="max-w-xs mx-auto">
          <input id="swal-wipe-pin" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" class="w-full px-4 py-3 border-2 border-red-300 rounded-xl text-2xl font-mono text-center tracking-[0.5em] text-red-700 outline-none focus:border-red-600" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Verify PIN',
      confirmButtonColor: '#b91c1c',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const pin = document.getElementById('swal-wipe-pin').value.trim();
        if (!/^\d{6}$/.test(pin)) {
          Swal.showValidationMessage('Please enter a valid 6-digit PIN.');
          return false;
        }
        return pin;
      }
    });

    if (!enteredPin) return;

    const activePin = await getMasterPin();
    if (enteredPin !== activePin) {
      Swal.fire({
        icon: 'error',
        title: 'Incorrect PIN',
        text: 'The 6-digit security PIN you entered is invalid. Action aborted.',
        confirmButtonColor: '#801e38'
      });
      return;
    }

    const { value: confirmText } = await Swal.fire({
      title: '<span class="text-red-600 font-bold">⚠️ FINAL CONFIRMATION: Factory Reset</span>',
      html: `
        <div class="text-left text-xs text-stone-700 space-y-3">
          <div class="bg-red-50 border-2 border-red-300 p-3 rounded-lg text-red-800">
            <p class="font-bold mb-1">🚨 DESTRUCTIVE OPERATION WARNING:</p>
            <ul class="list-disc list-inside space-y-1 text-[11px]">
              <li>All students, advisers, and dean accounts will be permanently wiped.</li>
              <li>All submissions, requirements, research groups, and published records will be cleared.</li>
              <li>Your current Super Admin account (<b>${auth.currentUser?.email || 'Super Admin'}</b>) will remain active so you are not locked out.</li>
              <li>An automatic emergency backup will be downloaded before wiping.</li>
            </ul>
          </div>
          <div>
            <label class="block font-bold text-stone-800 mb-1">Type <span class="text-red-600 font-mono">DELETE ALL DATA</span> to confirm wipeout:</label>
            <input id="swal-wipe-confirm-text" type="text" placeholder="DELETE ALL DATA" class="w-full px-3 py-2 border-2 border-red-300 rounded-lg text-xs font-mono text-center text-red-700 outline-none focus:border-red-600" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'PERMANENTLY WIPE EVERYTHING',
      confirmButtonColor: '#b91c1c',
      cancelButtonText: 'Cancel & Abort',
      focusConfirm: false,
      preConfirm: () => {
        const text = document.getElementById('swal-wipe-confirm-text').value.trim();
        if (text !== 'DELETE ALL DATA') {
          Swal.showValidationMessage('Please type "DELETE ALL DATA" exactly in uppercase.');
          return false;
        }
        return true;
      }
    });

    if (!confirmText) return;

    Swal.fire({
      title: 'Wiping System Data...',
      html: `
        <div class="text-xs text-stone-500 space-y-2">
          <p>1. Saving emergency backup...</p>
          <p>2. Purging Firestore collections...</p>
          <p>3. Removing authentication records...</p>
        </div>
      `,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const currentAdminUid = auth.currentUser?.uid;
      const currentAdminEmail = auth.currentUser?.email?.toLowerCase().trim();

      const collectionsToBackup = [
        'users',
        'super_admins',
        'deans',
        'advisers',
        'students',
        'groups',
        'submissions',
        'requirements',
        'published_papers',
        'activity_logs',
        'settings',
        'notifications',
        'invitations',
        'studentInvitations',
        'user_bookmarks'
      ];

      const emergencyBackup = {
        wipeTimestamp: new Date().toISOString(),
        initiatedBy: currentAdminEmail,
        collections: {}
      };

      for (const col of collectionsToBackup) {
        try {
          const snap = await getDocs(collection(db, col));
          emergencyBackup.collections[col] = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        } catch (_) {}
      }

      const blob = new Blob([JSON.stringify(emergencyBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivio_EMERGENCY_WIPE_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const authUsersToPurge = [];
      const userCollections = ['students', 'advisers', 'deans', 'users'];
      for (const colName of userCollections) {
        try {
          const snap = await getDocs(collection(db, colName));
          for (const d of snap.docs) {
            const data = d.data();
            const uEmail = data.email?.toLowerCase().trim();
            const uUid = data.uid || d.id;
            const uRole = data.role?.toLowerCase();

            if (uUid === currentAdminUid || (currentAdminEmail && uEmail === currentAdminEmail) || uRole === 'super-admin' || uRole === 'admin') {
              continue;
            }

            if (uUid || uEmail) {
              authUsersToPurge.push({ uid: uUid, email: uEmail });
            }
          }
        } catch (_) {}
      }

      const backendUrl = getBackendUrl();
      for (const u of authUsersToPurge) {
        try {
          await authFetch(`${backendUrl}/api/hard-delete-auth-user`, { uid: u.uid, email: u.email }).catch(() => {});
        } catch (_) {}
      }

      const fullWipeCollections = [
        'groups',
        'submissions',
        'requirements',
        'published_papers',
        'students',
        'advisers',
        'deans',
        'invitations',
        'studentInvitations',
        'notifications',
        'user_bookmarks'
      ];

      for (const col of fullWipeCollections) {
        try {
          const snap = await getDocs(collection(db, col));
          await Promise.allSettled(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
        } catch (_) {}
      }

      try {
        const userSnap = await getDocs(collection(db, 'users'));
        for (const uDoc of userSnap.docs) {
          const uData = uDoc.data();
          const uEmail = uData.email?.toLowerCase().trim();
          const uUid = uDoc.id;
          const uRole = uData.role?.toLowerCase();

          if (uUid === currentAdminUid || (currentAdminEmail && uEmail === currentAdminEmail) || uRole === 'super-admin' || uRole === 'admin') {
            continue;
          }
          await deleteDoc(doc(db, 'users', uDoc.id)).catch(() => {});
        }
      } catch (_) {}

      await logActivity({
        user: currentAdminEmail || 'Super Admin',
        role: 'Admin',
        action: 'Factory System Wipeout',
        status: 'Success',
        details: `Performed system wipeout with 6-digit PIN verification. Purged ${authUsersToPurge.length} accounts. Preserved Super Admin.`
      });

      Swal.fire({
        icon: 'success',
        title: 'Factory Wipeout Complete',
        html: `
          <div class="text-xs text-stone-700 text-left space-y-1.5 mt-2">
            <p>✅ <b>Database Wiped:</b> All academic records, groups, and student/adviser/dean accounts have been cleared.</p>
            <p>🛡️ <b>Super Admin Preserved:</b> <b>${currentAdminEmail || 'Active Administrator'}</b></p>
            <p>💾 <b>Emergency Backup:</b> Downloaded automatically before wipe.</p>
          </div>
        `,
        confirmButtonColor: '#801e38'
      });
    } catch (err) {
      console.error("Delete all data error:", err);
      Swal.fire('Wipeout Error', 'An error occurred while wiping data. Some records may require manual cleanup.', 'error');
    }
  };

  // =========================================================================
  // DYNAMIC STORAGE CALCULATION ENGINE
  // =========================================================================
  
  // Available school years derived strictly from system submissions & active academic records
  const availableSchoolYears = useMemo(() => {
    const setYears = new Set();
    
    // Scan actual submissions
    submissionsList.forEach(s => {
      if (s.schoolYear) setYears.add(String(s.schoolYear).replace(/^SY\s*/i, '').trim());
      if (s.academicYear) setYears.add(String(s.academicYear).replace(/^SY\s*/i, '').trim());
      if (s.createdAt || s.publishedAt) {
        const y = new Date(s.publishedAt || s.createdAt).getFullYear();
        if (y && !isNaN(y)) setYears.add(`${y}-${y + 1}`);
      }
    });

    // If no submissions yet, default to current academic year
    if (setYears.size === 0) {
      const currentYear = new Date().getFullYear();
      setYears.add(`${currentYear}-${currentYear + 1}`);
    }

    return Array.from(setYears).filter(Boolean).sort().reverse();
  }, [submissionsList]);

  // Combined department list derived STRICTLY from the system's "departments" collection
  const combinedDepartments = useMemo(() => {
    const deptSet = new Set();

    // 1. Primary Source: Exact active departments created in "Departments & Programs" (Firestore 'departments' collection)
    firestoreDepartments.forEach(d => {
      const name = (d.name || d.departmentName || d.title || '').trim();
      if (name) deptSet.add(name);
    });

    // 2. Secondary check: If any submission explicitly specifies a department that exists
    submissionsList.forEach(s => {
      if (s.department && s.department.trim()) deptSet.add(s.department.trim());
    });

    return Array.from(deptSet).sort();
  }, [firestoreDepartments, submissionsList]);

  // Filtered submissions based on selected SY and Department (Strict System Match)
  const filteredSubmissions = useMemo(() => {
    return submissionsList.filter(s => {
      let sYear = String(s.schoolYear || s.academicYear || '').replace(/^SY\s*/i, '').trim();
      if (!sYear && (s.createdAt || s.publishedAt)) {
        const y = new Date(s.publishedAt || s.createdAt).getFullYear();
        if (y && !isNaN(y)) sYear = `${y}-${y + 1}`;
      }

      const sDept = String(s.department || s.school || s.departmentName || s.program || '').toLowerCase().trim();
      const selDeptLower = selectedDept.toLowerCase().trim();

      const syMatch = selectedSY === 'ALL' || sYear === selectedSY || sYear.includes(selectedSY);
      const deptMatch = selectedDept === 'ALL' || 
        sDept === selDeptLower || 
        sDept.includes(selDeptLower) || 
        selDeptLower.includes(sDept) ||
        (selDeptLower.includes('information technology') && (sDept.includes('information technology') || sDept.includes('bsit')));

      return syMatch && deptMatch;
    });
  }, [submissionsList, selectedSY, selectedDept]);

  // Helper to parse file size to MB
  const parseSizeToMB = (sizeVal) => {
    if (!sizeVal) return 0;
    if (typeof sizeVal === 'number') return sizeVal / (1024 * 1024);
    const str = String(sizeVal).toLowerCase().trim();
    if (str.includes('gb')) return parseFloat(str) * 1024;
    if (str.includes('mb')) return parseFloat(str);
    if (str.includes('kb')) return parseFloat(str) / 1024;
    if (str.includes('bytes') || /^\d+$/.test(str)) return parseFloat(str) / (1024 * 1024);
    return 0;
  };

  // Active Approved Requirements List (System Global + Departmental)
  const systemRequirements = useMemo(() => {
    const approved = firestoreRequirements.filter(r => r.status === 'approved');
    if (approved.length > 0) {
      return approved;
    }

    // Default institutional requirements fallback
    return [
      { id: 'approval_sheet', title: 'Approval Sheet', icon: '📝', desc: 'Signed by adviser, dean, and panel' },
      { id: 'dataset_files', title: 'Dataset Files', icon: '💾', desc: 'Raw datasets used in study (ZIP/CSV)' },
      { id: 'video_pitch', title: 'Video Pitch', icon: '🎥', desc: 'Brief 3-5 min video presentation' },
      { id: 'user_manual', title: 'User Manual', icon: '📖', desc: 'Manual for the developed system' },
      { id: 'upload_url', title: 'Upload URL', icon: '🔗', desc: 'Source code or publication repository' },
      { id: 'signature_page', title: 'Signature Page', icon: '✍️', desc: 'Original signed page from approval committee' },
    ];
  }, [firestoreRequirements]);

  // Calculate dynamic counts and sizes per requirement category
  const storageMetrics = useMemo(() => {
    const metricsMap = {};
    let manuscriptCount = 0, manuscriptBytes = 0;

    // Initialize metrics map for each non-manuscript system requirement
    systemRequirements.forEach(req => {
      const isManuscript = (req.title || '').toLowerCase().includes('manuscript');
      if (!isManuscript) {
        const isSuspended = req.storageEnabled === false || req.storageStatus === 'suspended';
        metricsMap[req.title] = {
          id: req.id || req.title,
          docId: req.id,
          title: req.title,
          icon: req.icon || '📄',
          storageEnabled: !isSuspended,
          storageStatus: isSuspended ? 'suspended' : 'active',
          count: 0,
          mb: 0
        };
      }
    });

    filteredSubmissions.forEach(sub => {
      const meta = sub.documents || sub.documentsMeta || {};
      const subFiles = Object.entries(meta);

      if (subFiles.length > 0) {
        subFiles.forEach(([key, docItem]) => {
          if (!docItem || docItem.archived) return;
          const keyLower = String(key || '').toLowerCase().trim();
          const name = String(docItem.name || '').toLowerCase().trim();
          const sizeMB = parseSizeToMB(docItem.size);

          if (keyLower.includes('manuscript') || name.includes('manuscript') || key === 'finalManuscript') {
            manuscriptCount++;
            manuscriptBytes += sizeMB > 0 ? sizeMB : 0.4;
          } else {
            // Find matching system requirement
            let matchedReqTitle = null;

            for (const req of systemRequirements) {
              const rTitle = req.title;
              const rTitleLower = rTitle.toLowerCase();
              const rIdLower = String(req.id || '').toLowerCase();

              if (
                key === rTitle ||
                keyLower === rTitleLower ||
                key === req.id ||
                keyLower === rIdLower ||
                keyLower.includes(rTitleLower) ||
                rTitleLower.includes(keyLower)
              ) {
                matchedReqTitle = rTitle;
                break;
              }
            }

            if (!matchedReqTitle) {
              if (keyLower.includes('dataset') || name.includes('dataset') || name.endsWith('.zip') || name.endsWith('.csv')) matchedReqTitle = 'Dataset Files';
              else if (keyLower.includes('video') || keyLower.includes('pitch') || name.includes('video') || name.endsWith('.mp4')) matchedReqTitle = 'Video Pitch';
              else if (keyLower.includes('manual') || name.includes('manual')) matchedReqTitle = 'User Manual';
              else if (keyLower.includes('approval')) matchedReqTitle = 'Approval Sheet';
              else if (keyLower.includes('signature')) matchedReqTitle = 'Signature Page';
              else if (keyLower.includes('url') || keyLower.includes('link') || docItem.type === 'url') matchedReqTitle = 'Upload URL';
            }

            if (matchedReqTitle) {
              if (!metricsMap[matchedReqTitle]) {
                metricsMap[matchedReqTitle] = {
                  id: matchedReqTitle,
                  title: matchedReqTitle,
                  icon: '📄',
                  count: 0,
                  mb: 0
                };
              }
              metricsMap[matchedReqTitle].count += 1;
              metricsMap[matchedReqTitle].mb += sizeMB > 0 ? sizeMB : 1.2;
            }
          }
        });
      } else {
        if (sub.fileUrl || sub.manuscriptUrl || sub.pdfUrl || sub.researchTitle || sub.title) {
          manuscriptCount++;
          manuscriptBytes += 0.4;
        }
      }
    });

    const items = Object.values(metricsMap);
    let totalRequirementsCount = 0;
    let totalRequirementsMB = 0;

    items.forEach(item => {
      totalRequirementsCount += item.count;
      totalRequirementsMB += item.mb;
    });

    const totalFilesCount = totalRequirementsCount + manuscriptCount;
    const baseUsedMB = totalRequirementsMB + manuscriptBytes;
    const totalUsedGB = Number((baseUsedMB / 1024).toFixed(3));
    const quotaGB = storageQuotaGB || 25;
    const percentUsed = Math.min(100, Math.max(totalFilesCount > 0 ? 1 : 0, Math.round((totalUsedGB / quotaGB) * 100)));

    return {
      items,
      manuscript: { count: manuscriptCount, mb: manuscriptBytes },
      totalFilesCount,
      totalUsedGB,
      quotaGB,
      percentUsed,
      freeGB: Math.max(0, Number((quotaGB - totalUsedGB).toFixed(2)))
    };
  }, [systemRequirements, filteredSubmissions, storageQuotaGB]);

  // Space to free calculation based on checked items
  const spaceToFreeDisplay = useMemo(() => {
    let mb = 0;
    (storageMetrics.items || []).forEach(item => {
      if (storageFiles[item.title]) {
        mb += item.mb;
      }
    });

    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${(mb).toFixed(1)} MB`;
  }, [storageFiles, storageMetrics]);

  // Toggle individual requirement checkbox & persist to Firestore + localStorage
  const handleStorageCheck = async (title) => {
    if (!title) return;
    const currentVal = Boolean(storageFiles[title]);
    const updated = { ...storageFiles, [title]: !currentVal };
    setStorageFiles(updated);

    try {
      localStorage.setItem('archivio_admin_archive_checked_v1', JSON.stringify(updated));
      await setDoc(doc(db, 'settings', 'storage_archive_preferences'), {
        [title]: !currentVal,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Admin'
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save storage archive preference:", err);
    }
  };

  // Select all requirement categories
  const handleSelectAllStorage = async () => {
    const updated = { ...storageFiles };
    (storageMetrics.items || []).forEach(item => {
      updated[item.title] = true;
    });
    setStorageFiles(updated);

    try {
      localStorage.setItem('archivio_admin_archive_checked_v1', JSON.stringify(updated));
      await setDoc(doc(db, 'settings', 'storage_archive_preferences'), {
        ...updated,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Admin'
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save select all storage preferences:", err);
    }
  };

  // Deselect all requirement categories
  const handleDeselectAllStorage = async () => {
    const updated = { ...storageFiles };
    (storageMetrics.items || []).forEach(item => {
      updated[item.title] = false;
    });
    setStorageFiles(updated);

    try {
      localStorage.setItem('archivio_admin_archive_checked_v1', JSON.stringify(updated));
      await setDoc(doc(db, 'settings', 'storage_archive_preferences'), {
        ...updated,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Admin'
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save deselect all storage preferences:", err);
    }
  };

  // Handle Edit Storage Quota Target
  const handleEditQuota = async () => {
    const { value: newQuota } = await Swal.fire({
      title: '<span class="text-stone-900 font-bold">Configure Storage Limit</span>',
      html: `
        <p class="text-xs text-stone-500 mb-3 text-left">
          Set your Firebase Storage Target Capacity (GB) to calibrate the visual usage meter.
        </p>
        <div class="text-left">
          <label class="block text-xs font-semibold text-stone-600 mb-1">Target Storage Quota (GB)</label>
          <input id="swal-quota-input" type="number" min="5" max="500" value="${storageQuotaGB}" class="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38]" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Quota',
      confirmButtonColor: '#801e38',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const val = Number(document.getElementById('swal-quota-input').value);
        if (!val || val < 1) {
          Swal.showValidationMessage('Please enter a valid storage limit (e.g. 25).');
          return false;
        }
        return val;
      }
    });

    if (newQuota) {
      try {
        await setDoc(doc(db, 'settings', 'storage_quota'), { quotaGB: newQuota, updatedAt: new Date().toISOString() }, { merge: true });
        setStorageQuotaGB(newQuota);
        Swal.fire({ icon: 'success', title: 'Storage Limit Saved!', text: `Capacity set to ${newQuota} GB.`, timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error("Quota save error:", err);
      }
    }
  };

  // Requirement Approvals Governance (from Deans & Advisers)
  const pendingAdminRequirements = useMemo(() => {
    return firestoreRequirements.filter(r => r.status === 'pending_admin' || (r.status === 'pending' && r.scope === 'global'));
  }, [firestoreRequirements]);

  const handleApproveRequirement = async (req) => {
    try {
      await updateDoc(doc(db, 'requirements', req.id), {
        status: 'approved',
        adminApprovedAt: new Date().toISOString(),
        adminApprovedBy: auth.currentUser?.email || 'Super Admin'
      });
      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Approve Submission Requirement',
        status: 'Success',
        details: `Approved requirement "${req.title}" for storage allocation.`
      });
      Swal.fire({ icon: 'success', title: 'Requirement Approved!', text: `"${req.title}" is now active in the system.`, timer: 2000, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to approve requirement.', 'error');
    }
  };

  const handleDeclineRequirement = async (req) => {
    const { value: reason } = await Swal.fire({
      title: `Decline "${req.title}"?`,
      input: 'text',
      inputLabel: 'Reason for Rejection / Feedback',
      inputPlaceholder: 'e.g. Exceeds recommended storage budget',
      showCancelButton: true,
      confirmButtonText: 'Decline Requirement',
      confirmButtonColor: '#b91c1c'
    });
    if (reason !== undefined) {
      try {
        await updateDoc(doc(db, 'requirements', req.id), {
          status: 'rejected',
          rejectionReason: reason || 'Not approved by system administrator',
          rejectedAt: new Date().toISOString()
        });
        Swal.fire({ icon: 'info', title: 'Requirement Declined', text: 'The requirement has been marked as rejected.', timer: 1500, showConfirmButton: false });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Toggle Storage Availability / Suspension for Requirement
  const handleToggleRequirementStorage = async (item, e) => {
    if (e) e.stopPropagation();
    const isCurrentlyActive = item.storageEnabled !== false && item.storageStatus !== 'suspended';
    const targetStatus = isCurrentlyActive ? 'suspended' : 'active';
    const targetEnabled = !isCurrentlyActive;

    const actionText = isCurrentlyActive ? 'Suspend / Pause' : 'Activate / Enable';
    const confirmColor = isCurrentlyActive ? '#d97706' : '#059669';

    const { isConfirmed } = await Swal.fire({
      title: `<span class="text-stone-900 font-bold">${actionText} "${item.title}" Storage?</span>`,
      html: `
        <div class="text-left text-xs text-stone-600 space-y-2 mt-2">
          <p>
            ${isCurrentlyActive 
              ? `⚠️ <b>Suspending storage will mark "${item.title}" as "Unavailable / Storage Suspended by Admin"</b> in both Dean and Adviser portals. Student uploads for this requirement will be paused.` 
              : `✅ <b>Activating storage will restore "${item.title}"</b> as active in Dean, Adviser, and Student submission portals.`}
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`,
      confirmButtonColor: confirmColor,
      cancelButtonText: 'Cancel'
    });

    if (!isConfirmed) return;

    try {
      if (item.docId) {
        await updateDoc(doc(db, 'requirements', item.docId), {
          storageEnabled: targetEnabled,
          storageStatus: targetStatus,
          storageUpdatedBy: auth.currentUser?.email || 'Super Admin',
          storageUpdatedAt: new Date().toISOString()
        });
      } else {
        const matchingDoc = firestoreRequirements.find(r => r.title === item.title || r.id === item.id);
        if (matchingDoc) {
          await updateDoc(doc(db, 'requirements', matchingDoc.id), {
            storageEnabled: targetEnabled,
            storageStatus: targetStatus,
            storageUpdatedBy: auth.currentUser?.email || 'Super Admin',
            storageUpdatedAt: new Date().toISOString()
          });
        }
      }

      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Toggle Requirement Storage',
        status: 'Success',
        details: `${isCurrentlyActive ? 'Suspended' : 'Activated'} cloud storage allocation for requirement "${item.title}".`
      });

      Swal.fire({
        icon: 'success',
        title: isCurrentlyActive ? 'Storage Suspended' : 'Storage Activated',
        text: `"${item.title}" is now ${isCurrentlyActive ? 'marked as Unavailable in Dean & Adviser portals' : 'active for submissions'}.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Storage toggle error:", err);
      Swal.fire('Error', 'Failed to update requirement storage status.', 'error');
    }
  };

  // 5. ARCHIVE SELECTED FILES ENGINE
  const handleArchiveSelectedFiles = async () => {
    const selectedRequirementTitles = Object.keys(storageFiles).filter(k => storageFiles[k]);
    if (selectedRequirementTitles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Categories Selected',
        text: 'Please check at least one requirement category to archive.',
        confirmButtonColor: '#801e38'
      });
      return;
    }

    const chosenNames = selectedRequirementTitles.join(', ');
    const syDisplay = selectedSY === 'ALL' ? 'All Academic Years' : `SY ${selectedSY}`;
    const deptDisplay = selectedDept === 'ALL' ? 'All Departments' : selectedDept;

    if (filteredSubmissions.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Files to Archive',
        text: `There are currently no uploaded submission files matching "${syDisplay}" and "${deptDisplay}".`,
        confirmButtonColor: '#801e38'
      });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: '<span class="text-[#801e38] font-bold">📦 Archive & Offload Files</span>',
      html: `
        <div class="text-left text-xs text-stone-700 space-y-3">
          <div class="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-3 rounded-r text-xs">
            <p class="font-bold mb-1">Archive Summary & Safety Notice:</p>
            <ul class="list-disc list-inside space-y-0.5 text-[11px]">
              <li><b>Scope:</b> ${syDisplay} • ${deptDisplay}</li>
              <li><b>Categories:</b> ${chosenNames}</li>
              <li><b>Estimated Space to Free:</b> ${spaceToFreeDisplay}</li>
              <li><b>Final Manuscripts:</b> 100% Protected & Preserved</li>
            </ul>
          </div>
          <p class="text-stone-500 text-[11px]">
            A complete Archive Manifest JSON with all original file metadata and download links will be downloaded to your computer before offloading.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Proceed to Archive',
      confirmButtonColor: '#801e38',
      cancelButtonText: 'Cancel'
    });

    if (!isConfirmed) return;

    setIsArchiving(true);
    Swal.fire({
      title: 'Archiving Selected Requirements...',
      html: '<p class="text-xs text-stone-500">Generating manifest bundle and updating records...</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Step A: Build Archive Manifest
      const archiveManifest = {
        archivedAt: new Date().toISOString(),
        archivedBy: auth.currentUser?.email || 'Super Admin',
        schoolYearScope: selectedSY,
        departmentScope: selectedDept,
        categories: selectedRequirementTitles,
        freedEstimate: spaceToFreeDisplay,
        records: []
      };

      let countArchived = 0;

      for (const sub of filteredSubmissions) {
        const meta = sub.documents || sub.documentsMeta;
        if (!meta) continue;
        const updatedMeta = { ...meta };
        let docModified = false;

        Object.entries(meta).forEach(([key, item]) => {
          if (!item || item.archived) return;
          const keyLower = String(key || '').toLowerCase().trim();
          const name = String(item.name || '').toLowerCase().trim();
          const isManuscript = name.includes('manuscript') || keyLower.includes('manuscript') || key === 'finalManuscript';
          if (isManuscript) return; // NEVER ARCHIVE MANUSCRIPTS

          let match = false;
          selectedRequirementTitles.forEach(selTitle => {
            const selLower = selTitle.toLowerCase();
            if (
              key === selTitle ||
              keyLower === selLower ||
              keyLower.includes(selLower) ||
              selLower.includes(keyLower) ||
              (selLower.includes('dataset') && (name.includes('dataset') || name.endsWith('.zip') || name.endsWith('.csv'))) ||
              (selLower.includes('video') && (name.includes('video') || name.endsWith('.mp4'))) ||
              (selLower.includes('manual') && (name.includes('manual') || name.endsWith('.docx') || name.endsWith('.doc'))) ||
              (selLower.includes('approval') && name.includes('approval')) ||
              (selLower.includes('signature') && name.includes('signature')) ||
              (selLower.includes('url') && (item.type === 'url' || item.size === 'Link'))
            ) {
              match = true;
            }
          });

          if (match) {
            archiveManifest.records.push({
              submissionId: sub.id,
              researchTitle: sub.title || sub.researchTitle || 'Untitled',
              department: sub.department || sub.program || 'N/A',
              schoolYear: sub.schoolYear || sub.academicYear || 'N/A',
              requirementKey: key,
              fileName: item.name || 'File',
              originalUrl: item.url || '',
              size: item.size || 'N/A',
              archivedDate: new Date().toISOString()
            });

            updatedMeta[key] = {
              ...item,
              archived: true,
              archivedAt: new Date().toISOString()
            };
            docModified = true;
            countArchived++;
          }
        });

        if (docModified) {
          try {
            const payload = {};
            if (sub.documents) payload.documents = updatedMeta;
            if (sub.documentsMeta) payload.documentsMeta = updatedMeta;
            await updateDoc(doc(db, 'submissions', sub.id), payload);
          } catch (_) {}
        }
      }

      // Step B: Download Archive Manifest Bundle
      const blob = new Blob([JSON.stringify(archiveManifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivio_storage_archive_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Step C: Activity Logging
      await logActivity({
        user: auth.currentUser?.email || 'Super Admin',
        role: 'Admin',
        action: 'Archive Storage Files',
        status: 'Success',
        details: `Archived requirement files (${chosenNames}) for ${syDisplay} • ${deptDisplay}. Freed ~${spaceToFreeDisplay}.`
      });

      Swal.fire({
        icon: 'success',
        title: 'Files Archived Successfully!',
        html: `
          <div class="text-xs text-stone-600 text-left space-y-1.5 mt-2">
            <p>✅ <b>Requirements Processed:</b> ${chosenNames}</p>
            <p>📁 <b>Estimated Space Freed:</b> ${spaceToFreeDisplay}</p>
            <p>🛡️ <b>Final Manuscripts:</b> Protected & Intact</p>
            <p>💾 <i>Archive manifest JSON was downloaded to your device.</i></p>
          </div>
        `,
        confirmButtonColor: '#801e38'
      });
    } catch (err) {
      console.error("Archiving error:", err);
      Swal.fire('Archive Failed', 'An error occurred during file archiving.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  // =========================================================================
  // CONTENT RENDERERS
  // =========================================================================

  const renderSystemSettings = () => (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* INSTITUTION INFORMATION */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#252525]">
          <h4 className="font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#801e38]" /> Institution Information
          </h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Institution Name</label>
              <input type="text" value={instInfo.name} onChange={e => setInstInfo({...instInfo, name: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Short Name</label>
              <input type="text" value={instInfo.shortName} onChange={e => setInstInfo({...instInfo, shortName: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Email Domain</label>
              <input type="text" value={instInfo.emailDomain} onChange={e => setInstInfo({...instInfo, emailDomain: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Location</label>
              <input type="text" value={instInfo.location} onChange={e => setInstInfo({...instInfo, location: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-100 outline-none focus:border-[#801e38]" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveInst} disabled={savingInst} className="px-6 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50">
              {savingInst ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Card>

      {/* SYSTEM PREFERENCES */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#252525]">
          <h4 className="font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#801e38]" /> System Preferences
          </h4>
        </div>
        <div className="divide-y divide-stone-100">
          {Object.entries({
            maintenance: { title: 'Maintenance Mode', desc: 'Temporarily disable access to all portals for system updates' },
            emailAlerts: { title: 'Email Notifications', desc: 'Send email alerts when new accounts are activated' },
            publicVisibility: { title: 'Public Archive Visibility', desc: 'Allow the public website to display approved research papers' },
            emailVerification: { title: 'Require Email Verification', desc: 'Dean must verify email before accessing the portal' }
          }).map(([key, info]) => (
            <div key={key} className="p-5 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-stone-900 dark:text-stone-50">{info.title}</h5>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{info.desc}</p>
              </div>
              <button onClick={() => handleToggle(key)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${toggles[key] ? 'bg-[#801e38]' : 'bg-stone-300'}`}>
                <div className={`bg-white dark:bg-[#1e1e1e] w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${toggles[key] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* DATA MANAGEMENT */}
      <Card className="flex flex-col overflow-hidden border border-red-200 dark:border-red-900/40 shadow-sm">
        <div className="p-5 bg-gradient-to-r from-red-50/70 to-transparent dark:from-red-950/20 border-b border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Data Management & Disaster Recovery
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Sensitive operations that affect system-wide data. Protected by Master 6-Digit PIN.</p>
          </div>
          <button 
            onClick={handleChangePin}
            className="flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-bold transition-all border border-stone-300 dark:border-stone-700 shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#801e38]" /> Change Security PIN
          </button>
        </div>

        <div className="p-5">
          <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 p-3.5 rounded-r-lg flex items-center justify-between gap-3 text-xs font-medium mb-6">
            <div className="flex items-center gap-2">
              <span>⚠️ Only authorized System Administrators can perform these operations. All actions are logged.</span>
            </div>
            <span className="hidden sm:inline-block bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded text-[11px] font-mono text-amber-800 dark:text-amber-300">
              PIN: 6 Digits
            </span>
          </div>

          <div className="space-y-6">
            {/* 1. Back Up */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-700">
              <div>
                <h5 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#801e38]" /> Back Up System Data
                </h5>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                  Downloads a complete structured JSON backup of all users, submissions, configurations, and logs across all collections. Safe to perform anytime.
                </p>
              </div>
              <button 
                onClick={handleBackupData} 
                className="flex items-center gap-2 px-4 py-2.5 bg-[#801e38] text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:bg-[#601328] shrink-0"
              >
                <Download className="w-4 h-4" /> Download Full Backup
              </button>
            </div>

            {/* 2. Reset Data */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-700">
              <div>
                <h5 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600" /> Reset Data
                </h5>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                  Clears submission records, uploaded files, and research groups for a specific academic cycle.<br/>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">User accounts (Admins, Deans, Advisers, Students) and system settings will NOT be affected.</span>
                </p>
              </div>
              <button 
                onClick={handleResetData}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border-2 border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <RotateCcw className="w-4 h-4" /> Reset Academic Data
              </button>
            </div>

            {/* 3. Delete All Data */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600" /> Delete All Data (Factory Wipeout)
                  </h5>
                  <span className="inline-block bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                    🔑 6-Digit PIN Required
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                  Permanently removes ALL academic data, groups, submissions, and non-super-admin user accounts.<br/>
                  <span className="text-stone-600 dark:text-stone-300 font-medium">Auto-downloads an emergency backup. Requires PIN verification and cannot be undone.</span>
                </p>
              </div>
              <button 
                onClick={handleDeleteAllData}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Trash2 className="w-4 h-4" /> Delete All Data
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderStorageManagement = () => {
    const isCritical = storageMetrics.percentUsed > 85;
    const isModerate = storageMetrics.percentUsed > 60;
    const barColor = isCritical ? 'bg-red-600' : isModerate ? 'bg-amber-500' : 'bg-[#801e38]';
    const textColor = isCritical ? 'text-red-600' : isModerate ? 'text-amber-600' : 'text-[#801e38]';

    return (
      <Card className="max-w-[1000px] border-t-4 border-t-[#801e38] shadow-sm animate-fade-in">
        <div className="p-6">
          
          {/* Header & Plan Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#801e38]" /> Storage Management & Archival
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Archive old requirement files to optimize storage usage. Final Manuscript files are protected and permanently retained.
              </p>
            </div>
            
            {/* Firebase Blaze Badge */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-800/80 border border-amber-200 dark:border-amber-800/60 px-3.5 py-1.5 rounded-xl shadow-xs self-start sm:self-center">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400 leading-tight">Firebase Blaze Plan</p>
                <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 leading-tight">Auto-Expanding Storage Active</p>
              </div>
            </div>
          </div>

          {/* Current Storage Usage Meter */}
          <div className="mb-8 bg-stone-50/70 dark:bg-[#252525]/60 p-4 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-widest uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#801e38]" /> Current Cloud Storage Usage
              </p>
              <button 
                onClick={handleEditQuota}
                className="text-[11px] font-semibold text-[#801e38] dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" /> Adjust Limit ({storageQuotaGB} GB)
              </button>
            </div>

            <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
              <div 
                className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${storageMetrics.percentUsed}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className={`font-bold ${textColor}`}>
                {storageMetrics.percentUsed}% Used — {storageMetrics.totalUsedGB} GB of {storageMetrics.quotaGB} GB
              </span>
              <span className="text-stone-500 dark:text-stone-400 font-medium text-[11px]">
                {storageMetrics.freeGB} GB Remaining (Scalable via Blaze Plan)
              </span>
            </div>

            <div className="mt-3 bg-white dark:bg-stone-800 border-l-2 border-[#801e38] text-stone-600 dark:text-stone-300 text-xs px-3.5 py-2.5 rounded-r-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                💡 <b>Archiving Tip:</b> Archiving completed thesis cycles frees cloud bandwidth and generates clean offline backups.
              </span>
              <span className="text-[11px] font-semibold text-[#801e38] dark:text-rose-400 shrink-0">
                Active Filter Matches: {filteredSubmissions.length} Submissions ({storageMetrics.totalFilesCount} Files)
              </span>
            </div>
          </div>

          {/* Dynamic Archive Filters */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-widest uppercase flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#801e38]" /> Filter Archive Scope
              </p>
              {(selectedSY !== 'ALL' || selectedDept !== 'ALL') && (
                <button 
                  onClick={() => { setSelectedSY('ALL'); setSelectedDept('ALL'); }}
                  className="text-[10px] font-bold text-[#801e38] hover:underline"
                >
                  Reset Filter to All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">Academic Year</label>
                <select 
                  value={selectedSY}
                  onChange={e => setSelectedSY(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none cursor-pointer focus:border-[#801e38] shadow-xs"
                >
                  <option value="ALL">All Academic Years</option>
                  {availableSchoolYears.map(sy => (
                    <option key={sy} value={sy}>SY {sy}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">Department / College</label>
                <select 
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none cursor-pointer focus:border-[#801e38] shadow-xs"
                >
                  <option value="ALL">All Departments</option>
                  {combinedDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pending Storage Governance Proposals */}
          {pendingAdminRequirements.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Pending Requirement Approvals ({pendingAdminRequirements.length})
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400">
                      Review requirements proposed by Deans & Advisers before allocating system storage.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {pendingAdminRequirements.map(req => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-stone-800 rounded-lg border border-amber-200 dark:border-amber-900/50 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{req.icon || '📄'}</span>
                      <div>
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{req.title}</span>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400">{req.desc || 'Custom submission requirement'} • Proposer: {req.adviserUid || req.requestedBy || 'Dean'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button 
                        onClick={() => handleApproveRequirement(req)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition-all"
                      >
                        Approve for Storage
                      </button>
                      <button 
                        onClick={() => handleDeclineRequirement(req)}
                        className="px-3 py-1 bg-stone-100 dark:bg-stone-700 hover:bg-red-50 text-stone-600 dark:text-stone-300 hover:text-red-600 rounded text-[11px] font-semibold transition-all border border-stone-200 dark:border-stone-600"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Requirements Checklist from System Database */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-widest uppercase">
                  Select Requirement Categories To Archive
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud-Synced
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  onClick={handleSelectAllStorage}
                  className="text-[11px] font-semibold text-[#801e38] dark:text-rose-400 hover:text-[#601328] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-2.5 py-1 rounded-md transition-colors"
                >
                  ✓ Select All
                </button>
                <button
                  onClick={handleDeselectAllStorage}
                  className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-2.5 py-1 rounded-md transition-colors"
                >
                  ✕ Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {(storageMetrics.items || []).map((item) => (
                <div 
                  key={item.title}
                  onClick={() => handleStorageCheck(item.title)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all gap-3 ${
                    item.storageStatus === 'suspended'
                      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-[#252525]/60 hover:bg-stone-100/80 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${storageFiles[item.title] ? 'bg-[#801e38] border-[#801e38]' : 'bg-white dark:bg-[#1e1e1e] border-2 border-stone-300'}`}>
                      {storageFiles[item.title] && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{item.title}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center">
                    {/* Storage Governance Badge & Action */}
                    <div className="flex items-center gap-2">
                      {item.storageStatus === 'suspended' ? (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                          PAUSED / UNAVAILABLE
                        </span>
                      ) : (
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                          STORAGE ACTIVE
                        </span>
                      )}
                      <button
                        onClick={(e) => handleToggleRequirementStorage(item, e)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-xs ${
                          item.storageStatus === 'suspended'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 hover:bg-amber-100 hover:text-amber-800 text-stone-700 dark:text-stone-300'
                        }`}
                        title={item.storageStatus === 'suspended' ? 'Activate storage allocation' : 'Suspend storage allocation'}
                      >
                        {item.storageStatus === 'suspended' ? '✓ Re-enable' : '⏸ Pause'}
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 block">
                        {item.mb >= 1024 ? `${(item.mb / 1024).toFixed(1)} GB` : `${(item.mb).toFixed(1)} MB`}
                      </span>
                      <span className="text-[11px] text-stone-400 block">{item.count} files</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Protected Item: Final Manuscript */}
              <div className="flex items-center justify-between p-3.5 border border-amber-200 dark:border-amber-900/60 bg-[#fdfaf3] dark:bg-amber-950/20 rounded-xl mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100 block leading-tight">
                      Final Manuscript (PDF)
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                      Core Institutional Archive • Permanently Protected
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    {storageMetrics.manuscript.mb >= 1024 ? `${(storageMetrics.manuscript.mb / 1024).toFixed(1)} GB` : `${(storageMetrics.manuscript.mb).toFixed(1)} MB`}
                  </span>
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block">
                    {storageMetrics.manuscript.count} manuscripts preserved
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex gap-2 items-center border border-emerald-200 dark:border-emerald-800/50">
              <span className="font-normal text-stone-500 dark:text-stone-400">Estimated space to free:</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-sm font-extrabold font-mono">{spaceToFreeDisplay}</span>
            </div>
            
            <button 
              onClick={handleArchiveSelectedFiles}
              disabled={isArchiving}
              className="px-6 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4" /> 
              {isArchiving ? 'Archiving Files...' : 'Archive Selected Files'}
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Component */}
        <Header title="System Settings" breadcrumbs={['Settings']} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          <SectionTitle sub="Manage institution details, system preferences, and storage settings.">
            System Settings
          </SectionTitle>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-stone-200 dark:border-stone-700 mb-6 pb-2">
            <button 
              onClick={() => setActiveTab('system')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'system' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-200'}`}
            >
              System Settings
            </button>
            <button 
              onClick={() => setActiveTab('storage')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'storage' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-200'}`}
            >
              Storage Management
            </button>
            <button 
              onClick={() => setActiveTab('departments')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'departments' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-200'}`}
            >
              Departments & Programs
            </button>
          </div>

          {/* Conditional Rendering of Content */}
          <div className="pb-12">
            {activeTab === 'system' && renderSystemSettings()}
            {activeTab === 'storage' && renderStorageManagement()}
            {activeTab === 'departments' && <DepartmentsProgramsTab />}
          </div>
          
        </div>
      </main>
    </div>
  );
}
