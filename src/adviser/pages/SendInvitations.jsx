import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAdviser } from '../context/AdviserContext';
import Layout from '../components/Layout';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { validateStudentSchoolEmail } from '../../utils/schoolEmailValidator';
import { sendEmailWithFallback } from '../../utils/emailDispatcher';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { getBackendUrl } from '../../utils/backendUrl';
import { authFetch } from '../../utils/authFetch';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Trash2, 
  Search, 
  AlertCircle, 
  AlertTriangle, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function SendInvitations() {
  const { adviserData } = useAdviser();
  const [studentEmail, setStudentEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Real-time synchronization of invitations and student registration status
  useEffect(() => {
    if (!adviserData?.email) return;

    const email = adviserData.email.toLowerCase().trim();
    const userId = adviserData.userId || adviserData.id;

    // Listen to all studentInvitations
    const qInvitations = query(collection(db, 'studentInvitations'));
    const unsubInv = onSnapshot(qInvitations, (snapshot) => {
      const allInvites = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter invitations sent by this adviser
      const myInvites = allInvites.filter(inv => {
        const invSentBy = (inv.sentBy || '').toLowerCase().trim();
        const invAdviserId = inv.adviserId;
        return invSentBy === email || invAdviserId === userId || invAdviserId === adviserData.userId;
      });

      // Listen to registered users to cross-reference active accounts
      const qUsers = query(collection(db, 'users'));
      const unsubUsers = onSnapshot(qUsers, (uSnap) => {
        const registeredEmailSet = new Set(
          uSnap.docs.map(u => (u.data().email || '').toLowerCase().trim()).filter(Boolean)
        );

        // Listen to groups to check leader emails
        const qGroups = query(collection(db, 'groups'));
        const unsubGroups = onSnapshot(qGroups, (gSnap) => {
          gSnap.docs.forEach(gDoc => {
            const gData = gDoc.data();
            if (gData.leaderEmail) registeredEmailSet.add(gData.leaderEmail.toLowerCase().trim());
            if (Array.isArray(gData.members)) {
              gData.members.forEach(m => {
                const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase()?.trim();
                if (mEmail) registeredEmailSet.add(mEmail);
              });
            }
          });

          // Map and enrich status
          const enriched = myInvites.map(inv => {
            const sEmail = (inv.studentEmail || '').toLowerCase().trim();
            const isRegistered = inv.status === 'active' || inv.status === 'registered' || inv.status === 'accepted' || registeredEmailSet.has(sEmail);
            const rawSentDate = inv.invitationSentAt || inv.createdAt;
            const sentDate = rawSentDate?.toDate ? rawSentDate.toDate() : new Date(rawSentDate || 0);
            const daysSinceSent = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
            const isExpired = !isRegistered && !isNaN(sentDate.getTime()) && sentDate.getTime() > 0 && daysSinceSent > 7;

            // Auto-heal Firestore record if already registered in system
            if (isRegistered && inv.status === 'pending') {
              updateDoc(doc(db, 'studentInvitations', inv.id), {
                status: 'active',
                activatedAt: inv.activatedAt || new Date().toISOString()
              }).catch(e => console.warn('Auto-heal student invitation notice:', e.message));
            }

            return {
              ...inv,
              isExpired,
              computedStatus: isRegistered ? 'active' : isExpired ? 'expired' : 'pending',
              status: isRegistered ? 'active' : 'pending'
            };
          });

          // Sort by createdAt descending
          enriched.sort((a, b) => {
            const dateA = new Date(a.invitationSentAt || a.createdAt || 0);
            const dateB = new Date(b.invitationSentAt || b.createdAt || 0);
            return dateB - dateA;
          });

          setInvitations(enriched);
        }, (err) => console.warn('Groups listener notice:', err.message));

        return () => unsubGroups();
      }, (err) => console.warn('Users listener notice:', err.message));

      return () => unsubUsers();
    }, (err) => console.warn('Invitations listener notice:', err.message));

    return () => unsubInv();
  }, [adviserData?.email, adviserData?.userId]);

  const [emailError, setEmailError] = useState('');

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');

    // Validation
    if (!studentEmail.trim()) {
      setEmailError('Student email address is required');
      const el = document.getElementById('adviser-send-invite-email');
      if (el) el.focus();
      return;
    }

    if (!adviserData?.email?.toLowerCase().endsWith('@phinmaed.com')) {
      setError('Only advisers with @phinmaed.com email can send invitations');
      return;
    }

    setLoading(true);

    // 1. Show maroon book loader INSTANTLY upon clicking Send Invitation (Zero Delay)
    Swal.fire({
      title: 'Sending Invitation...',
      text: `Preparing official invitation for ${studentEmail.trim()}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // 1. Ultra-fast local student institutional email validation (<1ms)
      const verification = validateStudentSchoolEmail(studentEmail);
      if (!verification.isValid) {
        Swal.close();
        setEmailError(verification.error);
        setLoading(false);
        const el = document.getElementById('adviser-send-invite-email');
        if (el) el.focus();
        return;
      }
      const emailToInvite = verification.normalizedEmail;

      // 2. Fast check if email is already registered in users (limit 1)
      const qUser = query(
        collection(db, 'users'),
        where('email', '==', emailToInvite),
        limit(1)
      );
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        let isActuallyActiveInAuth = true;
        try {
          const backendUrl = getBackendUrl();
          const resp = await authFetch(`${backendUrl}/api/check-auth-user`, { email: emailToInvite });
          const checkRes = resp && resp.ok ? await resp.json() : null;
          if (checkRes && checkRes.inAuth === false) {
            isActuallyActiveInAuth = false;
          }
        } catch (_) {
          const userDocData = snapUser.docs[0].data();
          if (userDocData?.status === 'inactive' || userDocData?.deleted) {
            isActuallyActiveInAuth = false;
          }
        }

        if (!isActuallyActiveInAuth) {
          console.log(`🧹 Auto-purging orphaned account for ${emailToInvite}`);
          await wipeEmailData(emailToInvite, snapUser.docs[0].id);
        } else {
          Swal.close();
          setError('This email is already registered to an active account.');
          setLoading(false);
          return;
        }
      }

      // 3. Fast check if email already has a pending invitation FROM THIS ADVISER
      const adviserId = adviserData.userId || adviserData.id;
      const adviserEmail = (adviserData.email || '').toLowerCase().trim();

      const qInvite = query(
        collection(db, 'studentInvitations'),
        where('studentEmail', '==', emailToInvite),
        where('status', '==', 'pending'),
        limit(5)
      );
      const snapInvite = await getDocs(qInvite);

      if (!snapInvite.empty) {
        const myPendingInvites = snapInvite.docs.filter(d => {
          const data = d.data();
          const invSentBy = (data.sentBy || '').toLowerCase().trim();
          return invSentBy === adviserEmail || data.adviserId === adviserId;
        });

        const activePendingInvite = myPendingInvites.find(d => {
          const pData = d.data();
          const pDate = pData.invitationSentAt?.toDate ? pData.invitationSentAt.toDate() : new Date(pData.invitationSentAt || pData.createdAt || 0);
          const days = (Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24);
          return isNaN(pDate.getTime()) || pDate.getTime() <= 0 || days <= 7;
        });

        if (activePendingInvite) {
          Swal.close();
          setError('This email already has a pending invitation from you. You can resend or remove it in the table below.');
          setLoading(false);
          return;
        } else if (myPendingInvites.length > 0) {
          // Expired pending invitation(s) from this adviser: clean up old expired doc(s) so fresh invite proceeds cleanly
          for (const expDoc of myPendingInvites) {
            await deleteDoc(expDoc.ref).catch(() => {});
          }
        }
      }

      // Generate invitation token
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const studentPortalUrl = window.location.origin;
      const invitationLink = `${studentPortalUrl}/student/signup?email=${encodeURIComponent(studentEmail.toLowerCase().trim())}`;

      // Create student invitation in Firestore
      const nowMs = Date.now();
      const expiresAtIso = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
      const invitationData = {
        studentEmail: studentEmail.toLowerCase().trim(),
        adviserId: adviserData.userId || adviserData.id || '',
        sentBy: adviserData.email || '',
        sentByName: adviserData.displayName || adviserData.name || 'Research Adviser',
        department: adviserData.department || 'Not specified',
        status: 'pending',
        invitationToken: invitationToken || '',
        invitationLink: invitationLink || '',
        invitationSentAt: new Date(nowMs).toISOString(),
        expiresAt: expiresAtIso,
        createdAt: new Date(nowMs).toISOString()
      };

      await addDoc(collection(db, 'studentInvitations'), invitationData);

      // Derive student name for email greeting
      const studentDisplayName = (() => {
        if (studentEmail && studentEmail.includes('@')) {
          const prefix = studentEmail.split('@')[0];
          const parts = prefix.split(/[\._\-]/).filter(Boolean);
          const cleanParts = parts.map(part => {
            const clean = part.replace(/\d+/g, '').trim();
            if (!clean) return '';
            return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          }).filter(Boolean);
          if (cleanParts.length > 0) return cleanParts.join(' ');
        }
        return 'Student';
      })();

      // 4. Fast Multi-tier Email Dispatch (<2.5s)
      const emailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="background: linear-gradient(135deg, #590000 0%, #770000 100%); padding: 40px 20px; text-align: center;">
            <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
            <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
            <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Hello ${studentDisplayName},</h2>
            <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Student Researcher</strong>.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <strong style="color: #2b6cb0; font-size: 14px; display: block; margin-bottom: 10px;">How to Access Your Account:</strong>
              <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Click the <strong>"Create Your Account"</strong> button below</li>
                <li>Register using your <strong>@phinmaed.com</strong> email address</li>
                <li>After signing up, you can join your research group</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 40px 0 10px 0;">
              <a href="${invitationLink}" target="_blank" style="background-color: #770000 !important; background: linear-gradient(135deg, #770000 0%, #590000 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(119, 0, 0, 0.25);"><span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Create Your Account</span></a>
            </div>

            <div style="background-color: #fffaf0; border: 1px solid #feebc8; color: #c05621; padding: 15px; border-radius: 6px; font-size: 13px; margin: 24px 0; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 16px;">⏰</span>
              <p style="margin: 0;"><strong>Important:</strong> This invitation link will expire in 7 days. Please create your account as soon as possible.</p>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px;">
              Best regards,<br>
              <strong>${adviserData.displayName || 'Research Adviser'}</strong><br>
              ${adviserData.department || 'SWU Phinma'}<br>
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
          </div>
        </div>
      `;

      await sendEmailWithFallback({
        to: studentEmail.toLowerCase().trim(),
        subject: "Invitation to Join ARCHIVIO",
        html: emailHTML,
        backendEndpoint: '/api/send-student-invitation-email',
        backendPayload: {
          to: studentEmail.toLowerCase().trim(),
          studentName: studentDisplayName,
          invitationLink: invitationLink,
          senderName: adviserData.displayName || 'Research Adviser',
          senderDepartment: adviserData.department || 'SWU Phinma'
        }
      });

      // Show clean success alert
      await Swal.fire({
        title: 'Invitation Sent!',
        text: `An invitation email has been successfully sent to ${studentEmail}.`,
        icon: 'success',
        confirmButtonColor: '#10b981',
        confirmButtonText: 'OK'
      });
      setStudentEmail('');

    } catch (error) {
      console.error('Error sending invitation:', error);
      Swal.close();
      setError('Failed to send invitation. Please try again.');
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send Invitation',
        text: error.message || 'An unexpected error occurred while sending the invitation. Please try again.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvitationLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Invitation link copied!',
      showConfirmButton: false,
      timer: 2000
    });
  };

  const handleResendInvitation = async (invitationId, studentEmail) => {
    setLoading(true);
    Swal.fire({
      title: 'Resending Invitation...',
      text: `Dispatching invitation email to ${studentEmail}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Update invitation sent time and renew 7-day expiration
      const nowMs = Date.now();
      await updateDoc(doc(db, 'studentInvitations', invitationId), {
        invitationSentAt: new Date(nowMs).toISOString(),
        expiresAt: new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      });

      // Get invitation data
      const invitation = invitations.find(i => i.id === invitationId);
      const studentPortalUrl = window.location.origin;
      const link = invitation?.invitationLink || `${studentPortalUrl}/student/signup?email=${encodeURIComponent(studentEmail)}`;

      const resendHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="background: linear-gradient(135deg, #590000 0%, #770000 100%); padding: 40px 20px; text-align: center;">
            <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
            <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
            <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Reminder: Action Required</h2>
            <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">This is a reminder that you have been invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Student Researcher</strong>.</p>
            
            <div style="background-color: #fffaf0; border: 1px solid #feebc8; color: #c05621; padding: 15px; border-radius: 6px; font-size: 13px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Important:</strong> Please activate your account to begin managing your research projects with your adviser.</p>
            </div>
            
            <div style="text-align: center; margin: 40px 0 10px 0;">
              <a href="${link}" target="_blank" style="background-color: #770000 !important; background: linear-gradient(135deg, #770000 0%, #590000 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(119, 0, 0, 0.25);"><span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Create Your Account</span></a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px;">
              Best regards,<br>
              <strong>${adviserData.displayName || 'Research Adviser'}</strong><br>
              ${adviserData.department || 'SWU Phinma'}<br>
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
          </div>
        </div>
      `;

      await sendEmailWithFallback({
        to: studentEmail.toLowerCase().trim(),
        subject: "Reminder: Invitation to Join ARCHIVIO",
        html: resendHTML,
        backendEndpoint: '/api/send-student-invitation-email',
        backendPayload: {
          to: studentEmail.toLowerCase().trim(),
          studentName: studentDisplayName,
          invitationLink: link,
          senderName: adviserData.displayName || 'Research Adviser',
          senderDepartment: adviserData.department || 'SWU Phinma'
        }
      });

      Swal.fire({
        title: 'Sent!',
        text: `Invitation resent to ${studentEmail}`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      Swal.close();
      setError('Failed to resend invitation');
      Swal.fire({
        icon: 'error',
        title: 'Failed to Resend',
        text: 'Failed to resend invitation email. Please try again.',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveInvitation = async (invitationId, studentEmail) => {
    const result = await Swal.fire({
      title: 'Remove Invitation?',
      text: `Are you sure you want to remove the invitation for ${studentEmail}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await wipeEmailData(studentEmail);
        Swal.fire({
          title: 'Removed!',
          text: 'The invitation and all associated email data have been permanently removed.',
          icon: 'success',
          confirmButtonColor: '#801e38'
        });
      } catch (error) {
        console.error('Error removing invitation:', error);
        Swal.fire({
          title: 'Error',
          text: 'Failed to remove invitation.',
          icon: 'error',
          confirmButtonColor: '#801e38'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 on search or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, invitations.length]);

  const filteredInvitations = invitations.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const email = (inv.studentEmail || '').toLowerCase();
    const status = (inv.status === 'active' ? 'registered active' : inv.computedStatus === 'expired' ? 'expired link expired' : 'pending').toLowerCase();
    const date = inv.invitationSentAt ? new Date(inv.invitationSentAt).toLocaleDateString().toLowerCase() : '';
    return email.includes(q) || status.includes(q) || date.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvitations.length / itemsPerPage));

  const paginatedInvitations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvitations.slice(start, start + itemsPerPage);
  }, [filteredInvitations, currentPage, itemsPerPage]);

  return (
    <Layout title="Send Invitations" breadcrumb="ARCHIVIO › Send Invitations" showSearch={false}>
      <div className="max-w-5xl mx-auto space-y-6">
        <SectionTitle sub="Invite students to your research group — type their email and send">
          Send Student Invitations
        </SectionTitle>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Adviser Email Check */}
        {adviserData?.email && !adviserData.email.toLowerCase().endsWith('@phinmaed.com') && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">Your email ({adviserData.email}) is not a @phinmaed.com email. You cannot send invitations.</p>
          </div>
        )}

        {/* Action Card */}
        <Card glass={true} className="p-5 sm:p-8 md:p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#590000]/10 to-[#590000]/20 dark:from-[#f8d070]/10 dark:to-[#f8d070]/20 border border-[#590000]/20 dark:border-[#f8d070]/30 flex items-center justify-center text-[#590000] dark:text-[#f8d070] mb-3 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#590000] dark:text-[#f8d070] mb-2">Send Student Registration Link</h2>
          <p className="text-gray-500 dark:text-stone-400 text-xs sm:text-sm max-w-lg mb-5 sm:mb-6">
            Type the student's institutional email address below and click Send. The student will receive a registration link to create their account in ARCHIVIO.
          </p>
          <form onSubmit={handleSendInvitation} className="flex flex-col gap-2 w-full max-w-md">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400 dark:text-stone-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  id="adviser-send-invite-email"
                  type="email" 
                  value={studentEmail}
                  onChange={(e) => {
                    setStudentEmail(e.target.value.trim());
                    if (emailError) setEmailError('');
                  }}
                  placeholder="e.g. jcreyes.swu@phinmaed.com" 
                  className={`w-full bg-white dark:bg-stone-950 border text-gray-900 dark:text-stone-100 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm outline-none transition-colors disabled:opacity-50 ${
                    emailError
                      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20 dark:bg-red-950/20'
                      : 'border-gray-300 dark:border-stone-700 focus:border-[#770000] dark:focus:border-[#f8d070]'
                  }`}
                  disabled={loading}
                />
              </div>
              <PremiumButton 
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full sm:w-auto justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Link</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </PremiumButton>
            </div>
            {emailError && (
              <p className="text-xs text-red-500 text-left flex items-center gap-1.5 font-semibold pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </form>
        </Card>

        {/* History: Mobile Cards for Phones */}
        <div className="md:hidden space-y-3">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-stone-100 text-base">Sent Invitations</h3>
              <span className="text-xs text-gray-500 dark:text-stone-400">{filteredInvitations.length} total</span>
            </div>

            {/* Mobile Search Bar inside list header */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sent invitations..."
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-[#770000] dark:focus:border-[#f8d070]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredInvitations.length === 0 ? (
            <Card glass={true} className="p-6 text-center text-gray-400 dark:text-stone-500 text-sm">
              {searchQuery ? `No invitations match "${searchQuery}"` : 'No invitations sent yet. Send your first one above!'}
            </Card>
          ) : (
            <>
              {paginatedInvitations.map((invitation) => (
                <Card key={invitation.id} glass={true} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-stone-200 truncate">
                        {invitation.studentEmail}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-stone-500 mt-0.5">
                        Sent: {invitation.invitationSentAt ? new Date(invitation.invitationSentAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      invitation.status === 'active' 
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60' 
                        : invitation.computedStatus === 'expired'
                          ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                          : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${invitation.status === 'active' ? 'bg-emerald-500' : invitation.computedStatus === 'expired' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                      {invitation.status === 'active' ? 'Registered' : invitation.computedStatus === 'expired' ? 'Link Expired' : 'Pending'}
                    </span>
                  </div>

                  {invitation.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-stone-800">
                      <button 
                        type="button"
                        onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Resend</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveInvitation(invitation.id, invitation.studentEmail)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </Card>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-gray-500 dark:text-stone-400">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* History Table (Desktop Only) */}
        <Card glass={true} className="hidden md:block overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg">Sent Invitations</h3>
              <p className="text-xs text-gray-500 dark:text-stone-400">Track invitations you've sent to students</p>
            </div>

            {/* In-Table Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sent invitations..."
                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-[#770000] dark:focus:border-[#f8d070] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {filteredInvitations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-stone-500">
              <p className="text-sm font-medium">
                {searchQuery ? `No invitations match "${searchQuery}"` : 'No invitations sent yet. Send your first one above!'}
              </p>
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-[#590000] dark:text-[#f8d070] font-semibold underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#faf5f6] dark:bg-stone-950 text-[#590000] dark:text-stone-400 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-6">Student Email</th>
                    <th className="py-3 px-6">Sent</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                  {paginatedInvitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="py-4 px-6 text-gray-700 dark:text-stone-300 font-medium">{invitation.studentEmail}</td>
                      <td className="py-4 px-6 text-gray-500 dark:text-stone-400">
                        {invitation.invitationSentAt ? new Date(invitation.invitationSentAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          invitation.status === 'active' 
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60' 
                            : invitation.computedStatus === 'expired'
                              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                              : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${invitation.status === 'active' ? 'bg-emerald-500' : invitation.computedStatus === 'expired' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                          {invitation.status === 'active' ? 'Registered' : invitation.computedStatus === 'expired' ? 'Link Expired' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {invitation.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-50 cursor-pointer"
                              title="Resend invitation email"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                              <span>Resend</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRemoveInvitation(invitation.id, invitation.studentEmail)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-50 cursor-pointer"
                              title="Remove invitation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Desktop Pagination Controls */}
          {filteredInvitations.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-stone-800 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-500 dark:text-stone-400 font-medium">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInvitations.length)}–{Math.min(currentPage * itemsPerPage, filteredInvitations.length)} of {filteredInvitations.length} invitations
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#770000] dark:bg-[#f8d070] text-white dark:text-stone-900 shadow-xs'
                          : 'border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-stone-700 text-gray-600 dark:text-stone-300 hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default SendInvitations;
