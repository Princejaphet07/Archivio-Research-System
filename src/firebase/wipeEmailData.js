import { db } from './config';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

/**
 * Completely wipe all data associated with an email or UID across all ARCHIVIO collections and Firebase Auth.
 * This prevents the bug where deleted users or invitations leave orphaned records that cause "already invited" errors.
 * 
 * @param {string} emailInput - The user email to wipe
 * @param {string} [uidInput] - Optional Firebase Auth UID
 */
export async function wipeEmailData(emailInput, uidInput = null) {
  if (!emailInput && !uidInput) return;
  const email = emailInput ? emailInput.toLowerCase().trim() : null;
  const uid = uidInput || null;

  try {
    // 1. Hard delete from Firebase Auth via backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
    try {
      await fetch(`${backendUrl}/api/hard-delete-auth-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email })
      });
    } catch (authErr) {
      console.warn('Backend Auth wipe warning (email service might be offline):', authErr);
    }

    // 2. Wipe from studentInvitations (by studentEmail)
    if (email) {
      const qInv = query(collection(db, 'studentInvitations'), where('studentEmail', '==', email));
      const snapInv = await getDocs(qInv);
      await Promise.all(snapInv.docs.map(d => deleteDoc(doc(db, 'studentInvitations', d.id))));
    }

    // 3. Wipe from advisers collection (by email)
    if (email) {
      const qAdv = query(collection(db, 'advisers'), where('email', '==', email));
      const snapAdv = await getDocs(qAdv);
      await Promise.all(snapAdv.docs.map(d => deleteDoc(doc(db, 'advisers', d.id))));
    }

    // 4. Wipe from students collection (by email and/or uid)
    if (email) {
      const qStd = query(collection(db, 'students'), where('email', '==', email));
      const snapStd = await getDocs(qStd);
      await Promise.all(snapStd.docs.map(d => deleteDoc(doc(db, 'students', d.id))));
    }
    if (uid) {
      const qStdUid = query(collection(db, 'students'), where('uid', '==', uid));
      const snapStdUid = await getDocs(qStdUid);
      await Promise.all(snapStdUid.docs.map(d => deleteDoc(doc(db, 'students', d.id))));
    }

    // 5. Wipe from deans collection (by email)
    if (email) {
      const qDean = query(collection(db, 'deans'), where('email', '==', email));
      const snapDean = await getDocs(qDean);
      await Promise.all(snapDean.docs.map(d => deleteDoc(doc(db, 'deans', d.id))));
    }

    // 6. Wipe from users collection (by email and/or uid)
    if (email) {
      const qUsr = query(collection(db, 'users'), where('email', '==', email));
      const snapUsr = await getDocs(qUsr);
      await Promise.all(snapUsr.docs.map(d => deleteDoc(doc(db, 'users', d.id))));
    }
    if (uid) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (_) {}
    }

    // 7. Wipe or clean from groups collection
    if (email) {
      // If student was leader: delete the group and its submissions
      const qLeadGroup = query(collection(db, 'groups'), where('leaderEmail', '==', email));
      const snapLeadGroup = await getDocs(qLeadGroup);
      for (const gDoc of snapLeadGroup.docs) {
        const gData = gDoc.data();
        if (gData.leaderUid) {
          const qSub = query(collection(db, 'submissions'), where('studentUid', '==', gData.leaderUid));
          const snapSub = await getDocs(qSub);
          await Promise.all(snapSub.docs.map(s => deleteDoc(doc(db, 'submissions', s.id))));
        }
        await deleteDoc(doc(db, 'groups', gDoc.id));
      }

      // If adviser: delete supervised groups and requirements
      const qAdvGroup = query(collection(db, 'groups'), where('adviserUid', '==', email));
      const snapAdvGroup = await getDocs(qAdvGroup);
      await Promise.all(snapAdvGroup.docs.map(g => deleteDoc(doc(db, 'groups', g.id))));

      const qAdvReq = query(collection(db, 'requirements'), where('adviserUid', '==', email));
      const snapAdvReq = await getDocs(qAdvReq);
      await Promise.all(snapAdvReq.docs.map(r => deleteDoc(doc(db, 'requirements', r.id))));

      // If group member: remove email from members array in any group
      try {
        const allGroupsSnap = await getDocs(collection(db, 'groups'));
        for (const gDoc of allGroupsSnap.docs) {
          const gData = gDoc.data();
          if (Array.isArray(gData.members)) {
            const hasMember = gData.members.some(m => (typeof m === 'object' ? m.email?.toLowerCase() === email : m?.toLowerCase() === email));
            if (hasMember) {
              const updatedMembers = gData.members.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== email : m?.toLowerCase() !== email));
              await updateDoc(doc(db, 'groups', gDoc.id), { members: updatedMembers });
            }
          }
        }
      } catch (gErr) {
        console.warn('Member cleanup in groups warning:', gErr);
      }

      // If group member: remove email from students.groupMembers array
      try {
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        for (const sDoc of allStudentsSnap.docs) {
          const sData = sDoc.data();
          if (Array.isArray(sData.groupMembers)) {
            const hasMember = sData.groupMembers.some(m => (typeof m === 'object' ? m.email?.toLowerCase() === email : m?.toLowerCase() === email));
            if (hasMember) {
              const updatedGroupMembers = sData.groupMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== email : m?.toLowerCase() !== email));
              await updateDoc(doc(db, 'students', sDoc.id), { groupMembers: updatedGroupMembers });
            }
          }
        }
      } catch (sErr) {
        console.warn('Member cleanup in students warning:', sErr);
      }
    }

    // 8. Wipe notifications tied to this email or UID
    const notifTargets = [email, uid].filter(Boolean);
    for (const target of notifTargets) {
      try {
        const qNotif = query(collection(db, 'notifications'), where('userId', '==', target));
        const snapNotif = await getDocs(qNotif);
        await Promise.all(snapNotif.docs.map(n => deleteDoc(doc(db, 'notifications', n.id))));
      } catch (_) {}
    }

    console.log(`✅ Fully wiped all data and invitations for: ${email || uid}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to wipe data for ${email || uid}:`, err);
    throw err;
  }
}
