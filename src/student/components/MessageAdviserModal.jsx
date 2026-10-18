import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { authFetch } from '../../utils/authFetch';
import { getBackendUrl } from '../../utils/backendUrl';
import { logActivity } from '../../firebase/logActivity';

export default function MessageAdviserModal({ isOpen, onClose }) {
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgStatus, setMsgStatus] = useState(null);
  
  const [adviserInfo, setAdviserInfo] = useState({
    name: 'Your Adviser',
    email: '',
    studentName: 'Student',
    studentEmail: '',
    groupName: 'Your Group'
  });
  const [loadingAdviser, setLoadingAdviser] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAdviserDetails = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        setLoadingAdviser(true);
        let studentName = user.displayName || 'Student';
        let studentEmail = user.email || '';
        let groupName = 'Your Group';
        let adviserName = 'Your Adviser';
        let adviserEmail = '';
        let leaderUid = user.uid;

        // 1. Fetch student document
        const studentQ = query(collection(db, 'students'), where('uid', '==', user.uid));
        const studentSnap = await getDocs(studentQ);

        if (!studentSnap.empty) {
          const sData = studentSnap.docs[0].data();
          studentName = sData.displayName || studentName;
          studentEmail = sData.email || studentEmail;
          groupName = sData.groupName || groupName;
          if (sData.invitedByName) adviserName = sData.invitedByName;
          if (sData.invitedBy) adviserEmail = sData.invitedBy;
          if (sData.leaderUid) leaderUid = sData.leaderUid;
        }

        // 2. Fetch group document for verified adviser information
        const groupQ = query(collection(db, 'groups'), where('leaderUid', '==', leaderUid));
        const groupSnap = await getDocs(groupQ);
        if (!groupSnap.empty) {
          const gData = groupSnap.docs[0].data();
          if (gData.groupName) groupName = gData.groupName;
          if (gData.adviserName) adviserName = gData.adviserName;
          if (gData.adviserUid) adviserEmail = gData.adviserUid;
        }

        // 3. Fallback: Lookup in advisers collection if email not found
        if (!adviserEmail && adviserName && adviserName !== 'Your Adviser') {
          const advQ = query(collection(db, 'advisers'), where('name', '==', adviserName));
          const advSnap = await getDocs(advQ);
          if (!advSnap.empty) {
            adviserEmail = advSnap.docs[0].data().email || '';
          }
        }

        setAdviserInfo({
          name: adviserName,
          email: adviserEmail,
          studentName,
          studentEmail,
          groupName
        });
      } catch (err) {
        console.warn('[MessageAdviserModal] Error loading adviser data:', err);
      } finally {
        setLoadingAdviser(false);
      }
    };

    fetchAdviserDetails();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgBody.trim()) return;

    if (!adviserInfo.email) {
      Swal.fire({
        icon: 'warning',
        title: 'Adviser Email Not Found',
        text: 'Your research adviser does not have a contact email recorded yet. Please ensure your group registration is approved.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }

    setMsgSending(true);
    setMsgStatus(null);

    try {
      const backendUrl = getBackendUrl();
      const res = await authFetch(`${backendUrl}/api/send-student-message`, {
        adviserEmail: adviserInfo.email,
        adviserName: adviserInfo.name,
        studentName: adviserInfo.studentName,
        studentEmail: adviserInfo.studentEmail,
        groupName: adviserInfo.groupName,
        subject: msgSubject,
        message: msgBody
      });

      if (!res.ok) throw new Error('Failed to send message');

      // Log activity
      await logActivity({
        user: adviserInfo.studentName,
        role: 'Student',
        action: 'Sent Message to Adviser',
        status: 'Success',
        details: `To: ${adviserInfo.name} | Subject: ${msgSubject}`
      });

      // Notify adviser in-app
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: adviserInfo.email,
          title: `Message from ${adviserInfo.studentName} (${adviserInfo.groupName})`,
          message: `${msgSubject}: ${msgBody.substring(0, 100)}...`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.warn('Notification notice:', notifErr);
      }

      setMsgStatus('success');
      Swal.fire({
        title: 'Message Sent!',
        text: `Your email has been successfully sent to ${adviserInfo.name}.`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });

      setMsgSubject('');
      setMsgBody('');
      onClose();
    } catch (err) {
      console.error('Error sending message:', err);
      setMsgStatus('error');
    } finally {
      setMsgSending(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in border border-stone-200 dark:border-stone-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#4a1024] dark:bg-[#7B1F35] px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-white/70 dark:text-white/70 text-[11px] font-bold tracking-widest uppercase mb-0.5">
              Direct Message
            </p>
            <h3 className="text-white dark:text-white font-serif font-bold text-[18px]">
              Message Your Adviser
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 flex items-center justify-center transition-colors text-white dark:text-white touch-manipulation cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
          {msgStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800">
              Failed to send message. Please try again.
            </div>
          )}

          {/* Subject Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={msgSubject}
              onChange={e => setMsgSubject(e.target.value)}
              required
              placeholder="What is this about?"
              className="w-full min-h-[44px] border border-[#E8DFCB] dark:border-stone-700 bg-[#FDFAF5] dark:bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/30 focus:border-[#7a1f3d] transition"
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              required
              rows={4}
              placeholder="Type your message to your adviser here..."
              className="w-full border border-[#E8DFCB] dark:border-stone-700 bg-[#FDFAF5] dark:bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] dark:text-stone-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7a1f3d]/30 focus:border-[#7a1f3d] transition resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
              className="w-full min-h-[44px] touch-manipulation bg-[#5bb89d] hover:bg-[#4ea88f] active:bg-[#42957e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[14px] py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {msgSending ? 'Sending...' : 'Send Message via Email'}
              {!msgSending && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
