import { db } from './config';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getBackendUrl } from '../utils/backendUrl';
import { authFetch } from '../utils/authFetch';

/**
 * Completely wipe all data associated with an email or UID across all ARCHIVIO collections and Firebase Auth.
 * This prevents orphaned records, ensures clean deletions, and avoids "already invited" or "email in use" errors.
 * 
 * @param {string} emailInput - The user email to wipe
 * @param {string} [uidInput] - Optional Firebase Auth UID or Firestore Document ID
 */
export async function wipeEmailData(emailInput, uidInput = null) {
  if (!emailInput && !uidInput) return true;
  const email = emailInput ? emailInput.toLowerCase().trim() : null;
  const uid = uidInput ? String(uidInput).trim() : null;

  console.log(`🧹 Starting full wipe for user: email=${email}, uid=${uid}`);

  // 1. Hard delete from Firebase Auth via backend API
  try {
    const backendUrl = getBackendUrl();
    await authFetch(`${backendUrl}/api/hard-delete-auth-user`, { uid, email })
      .catch(err => console.warn('Backend Auth wipe network warning:', err.message));
  } catch (authErr) {
    console.warn('Backend Auth wipe call warning:', authErr);
  }

  // 2. Direct document deletions by ID/UID across all potential role collections
  if (uid) {
    const directCollections = ['super_admins', 'deans', 'advisers', 'students', 'users', 'dean_settings', 'user_bookmarks'];
    await Promise.allSettled(
      directCollections.map(col => deleteDoc(doc(db, col, uid)).catch(() => {}))
    );
  }

  // 3. Delete from role collections by Email
  if (email) {
    const emailCollections = [
      { col: 'super_admins', field: 'email' },
      { col: 'deans', field: 'email' },
      { col: 'advisers', field: 'email' },
      { col: 'students', field: 'email' },
      { col: 'users', field: 'email' },
      { col: 'studentInvitations', field: 'studentEmail' },
      { col: 'invitations', field: 'email' },
    ];

    for (const item of emailCollections) {
      try {
        const q = query(collection(db, item.col), where(item.field, '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await Promise.allSettled(snap.docs.map(d => deleteDoc(doc(db, item.col, d.id))));
        }
      } catch (colErr) {
        console.warn(`Wipe from ${item.col} notice:`, colErr.message);
      }
    }
  }

  // 4. Wipe student records by UID field
  if (uid) {
    try {
      const qStdUid = query(collection(db, 'students'), where('uid', '==', uid));
      const snapStdUid = await getDocs(qStdUid);
      if (!snapStdUid.empty) {
        await Promise.allSettled(snapStdUid.docs.map(d => deleteDoc(doc(db, 'students', d.id))));
      }
    } catch (_) {}

    try {
      const qUsrUid = query(collection(db, 'users'), where('uid', '==', uid));
      const snapUsrUid = await getDocs(qUsrUid);
      if (!snapUsrUid.empty) {
        await Promise.allSettled(snapUsrUid.docs.map(d => deleteDoc(doc(db, 'users', d.id))));
      }
    } catch (_) {}
  }

  // 5. Clean up groups & requirements tied to this user
  if (email || uid) {
    // If student was leader: delete the group and its submissions
    if (email) {
      try {
        const qLeadGroup = query(collection(db, 'groups'), where('leaderEmail', '==', email));
        const snapLeadGroup = await getDocs(qLeadGroup);
        for (const gDoc of snapLeadGroup.docs) {
          const gData = gDoc.data();
          if (gData.leaderUid) {
            try {
              const qSub = query(collection(db, 'submissions'), where('studentUid', '==', gData.leaderUid));
              const snapSub = await getDocs(qSub);
              await Promise.allSettled(snapSub.docs.map(s => deleteDoc(doc(db, 'submissions', s.id))));
            } catch (_) {}
          }
          await deleteDoc(doc(db, 'groups', gDoc.id)).catch(() => {});
        }
      } catch (leadErr) {
        console.warn('Group leader wipe notice:', leadErr.message);
      }

      // If adviser: delete supervised groups and requirements
      try {
        const qAdvGroup = query(collection(db, 'groups'), where('adviserUid', '==', email));
        const snapAdvGroup = await getDocs(qAdvGroup);
        await Promise.allSettled(snapAdvGroup.docs.map(g => deleteDoc(doc(db, 'groups', g.id))));
      } catch (_) {}

      try {
        const qAdvReq = query(collection(db, 'requirements'), where('adviserUid', '==', email));
        const snapAdvReq = await getDocs(qAdvReq);
        await Promise.allSettled(snapAdvReq.docs.map(r => deleteDoc(doc(db, 'requirements', r.id))));
      } catch (_) {}

      // Clean up email from members array in groups
      try {
        const allGroupsSnap = await getDocs(collection(db, 'groups'));
        for (const gDoc of allGroupsSnap.docs) {
          const gData = gDoc.data();
          if (Array.isArray(gData.members)) {
            const hasMember = gData.members.some(m => (typeof m === 'object' ? m.email?.toLowerCase() === email : m?.toLowerCase() === email));
            if (hasMember) {
              const updatedMembers = gData.members.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== email : m?.toLowerCase() !== email));
              await updateDoc(doc(db, 'groups', gDoc.id), { members: updatedMembers }).catch(() => {});
            }
          }
        }
      } catch (gErr) {
        console.warn('Member cleanup in groups notice:', gErr.message);
      }

      // Clean up email from students.groupMembers array
      try {
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        for (const sDoc of allStudentsSnap.docs) {
          const sData = sDoc.data();
          if (Array.isArray(sData.groupMembers)) {
            const hasMember = sData.groupMembers.some(m => (typeof m === 'object' ? m.email?.toLowerCase() === email : m?.toLowerCase() === email));
            if (hasMember) {
              const updatedGroupMembers = sData.groupMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== email : m?.toLowerCase() !== email));
              await updateDoc(doc(db, 'students', sDoc.id), { groupMembers: updatedGroupMembers }).catch(() => {});
            }
          }
        }
      } catch (sErr) {
        console.warn('Member cleanup in students notice:', sErr.message);
      }
    }
  }

  // 6. Wipe notifications tied to this email or UID
  const notifTargets = [email, uid].filter(Boolean);
  for (const target of notifTargets) {
    try {
      const qNotif = query(collection(db, 'notifications'), where('userId', '==', target));
      const snapNotif = await getDocs(qNotif);
      await Promise.allSettled(snapNotif.docs.map(n => deleteDoc(doc(db, 'notifications', n.id))));
    } catch (_) {}
  }

  console.log(`✅ Completed wipe for: ${email || uid}`);
  return true;
}
