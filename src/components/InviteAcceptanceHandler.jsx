import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import Swal from 'sweetalert2';
import { getBackendUrl } from '../utils/backendUrl';

export default function InviteAcceptanceHandler() {
  const location = useLocation();
  const processedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldAccept = params.get('acceptInvite') === 'true';
    const emailToAccept = params.get('email');
    const groupParam = params.get('group');
    const leaderParam = params.get('leader');

    if (shouldAccept && emailToAccept && !processedRef.current) {
      processedRef.current = true;
      const cleanEmail = emailToAccept.trim().toLowerCase();

      const runAcceptance = async () => {
        // 1. Call Backend Admin API for secure full-system sync
        try {
          const backendUrl = getBackendUrl();
          await fetch(`${backendUrl}/api/accept-student-invitation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
        } catch (backendErr) {
          console.warn('Backend accept notice:', backendErr);
        }

        // 2. Client-side direct Firestore update (studentInvitations)
        try {
          const invQ = query(collection(db, 'studentInvitations'), where('studentEmail', '==', cleanEmail));
          const invSnap = await getDocs(invQ);
          for (const invDoc of invSnap.docs) {
            await updateDoc(doc(db, 'studentInvitations', invDoc.id), {
              status: 'accepted',
              accepted: true,
              acceptedAt: new Date().toISOString()
            }).catch(() => {});
          }
        } catch (fsErr) {
          console.warn('Client Firestore invitation update notice:', fsErr);
        }

        // 3. Client-side direct Firestore update (if user is authenticated)
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            // Update students collection
            const stdRef = doc(db, 'students', currentUser.uid);
            const stdDoc = await getDocs(query(collection(db, 'students'), where('uid', '==', currentUser.uid)));
            if (!stdDoc.empty) {
              const sData = stdDoc.docs[0].data();
              if (Array.isArray(sData.groupMembers)) {
                const updatedMembers = sData.groupMembers.map(m => {
                  const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase();
                  if (mEmail === cleanEmail) {
                    return typeof m === 'object'
                      ? { ...m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() }
                      : { email: m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() };
                  }
                  return m;
                });
                await updateDoc(stdDoc.docs[0].ref, { groupMembers: updatedMembers });
              }
            }
          } catch (e) {
            console.warn('Student doc groupMembers client sync notice:', e);
          }
        }

        // 4. Show friendly confirmation modal
        Swal.fire({
          icon: 'success',
          title: '🎉 Invitation Accepted!',
          html: `
            <div style="text-align: left; font-size: 13.5px; color: #4a5568; line-height: 1.6; font-family: inherit;">
              <p style="margin-bottom: 12px;">
                Welcome to <strong>${groupParam || 'your research group'}</strong>! You have successfully accepted the invitation.
              </p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <span style="color: #166534; font-weight: 600;">✅ Status: Active & Accepted</span>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <strong style="color: #1e293b; display: block; margin-bottom: 4px;">ℹ️ How to Sign In:</strong>
                <span style="font-size: 13px;">Please log in using your group leader's credentials${leaderParam ? ` (<strong>${leaderParam}</strong>)` : ''} to collaborate on manuscripts and view defense requirements.</span>
              </div>
            </div>
          `,
          confirmButtonColor: '#7B1F35',
          confirmButtonText: 'Proceed'
        });
      };

      runAcceptance();
    }
  }, [location.search]);

  return null;
}
