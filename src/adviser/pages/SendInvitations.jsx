import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAdviser } from '../context/AdviserContext';
import Layout from '../components/Layout';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { verifySchoolEmailOnline, validateStudentSchoolEmail } from '../../utils/schoolEmailValidator';
import { authFetch } from '../../utils/authFetch';

function SendInvitations() {
  const { adviserData } = useAdviser();
  const [studentEmail, setStudentEmail] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch invitations on mount
  useEffect(() => {
    if (adviserData?.email) {
      fetchInvitations();
    }
  }, [adviserData?.email]);

  const fetchInvitations = async () => {
    if (!adviserData?.email) return;

    try {
      const invitationsQuery = query(
        collection(db, 'studentInvitations'),
        where('adviserId', '==', adviserData.userId)
      );
      const snapshot = await getDocs(invitationsQuery);
      const invitationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by createdAt descending
      invitationsData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!studentEmail) {
      setError('Please enter student email');
      return;
    }

    if (!adviserData?.email?.toLowerCase().endsWith('@phinmaed.com')) {
      setError('❌ Only advisers with @phinmaed.com email can send invitations');
      return;
    }

    setLoading(true);

    try {
      // 1. Strictly verify official SWU PHINMA student email (.swu@phinmaed.com) & MX records
      const verification = await verifySchoolEmailOnline(studentEmail, 'student');
      if (!verification.isValid) {
        setError(`❌ ${verification.error}`);
        setLoading(false);
        return;
      }
      const emailToInvite = verification.normalizedEmail;

      // 1. Check if email is already registered in users
      const qUser = query(
        collection(db, 'users'),
        where('email', '==', emailToInvite)
      );
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        setError('This email is already registered to an active account.');
        setLoading(false);
        return;
      }

      // 2. Check if email already has a pending invitation
      const qInvite = query(
        collection(db, 'studentInvitations'),
        where('studentEmail', '==', emailToInvite),
        where('status', '==', 'pending')
      );
      const snapInvite = await getDocs(qInvite);
      if (!snapInvite.empty) {
        setError('This email already has a pending invitation. You can resend or remove it in the table below.');
        setLoading(false);
        return;
      }

      // 3. Auto-cleanup any stale or orphaned data for this email to guarantee a 100% clean invitation
      await wipeEmailData(emailToInvite);

      // Generate invitation token (kept for Firestore tracking)
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      // Clean link to the Sign Up page
      const studentPortalUrl = window.location.origin;
      const invitationLink = `${studentPortalUrl}/student/signup?email=${encodeURIComponent(studentEmail.toLowerCase().trim())}`;

      // Create student invitation in Firestore
      const invitationData = {
        studentEmail: studentEmail.toLowerCase().trim(),
        adviserId: adviserData.userId,
        sentBy: adviserData.email,
        sentByName: adviserData.displayName,
        department: adviserData.department || 'Not specified',
        status: 'pending',
        invitationToken: invitationToken,
        invitationLink: invitationLink,
        invitationSentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'studentInvitations'), invitationData);

      // 1. Direct Backend Dispatch (over HTTPS / zero cloud port blocking)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://archivio-email-service.onrender.com';
      authFetch(`${backendUrl}/api/send-student-invitation-email`, {
        to: studentEmail.toLowerCase().trim(),
        invitationLink: invitationLink,
        senderName: adviserData.displayName || 'Research Adviser',
        senderDepartment: adviserData.department || 'SWU Phinma'
      }).then(res => {
        console.log('✅ Direct student invitation dispatch response:', res);
      }).catch(err => {
        console.warn('⚠️ Direct student invitation notice:', err.message);
      });

      // 2. Redundant Log in Firestore 'mail' collection (for mail-listener)
      try {
        await addDoc(collection(db, 'mail'), {
          to: studentEmail,
          message: {
            subject: "Invitation to Join ARCHIVIO",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
                  <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
                  <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
                </div>
                
                <div style="padding: 40px 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Welcome, Student!</h2>
                  <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Student Researcher</strong>.</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
                    <strong style="color: #2b6cb0; font-size: 14px; display: block; margin-bottom: 10px;">📋 How to Access Your Account:</strong>
                    <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Click the <strong>"Create Your Account"</strong> button below</li>
                      <li>Register using your <strong>@phinmaed.com</strong> email address</li>
                      <li>After signing up, you can join your research group</li>
                    </ol>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0 10px 0;">
                    <a href="${invitationLink}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Create Your Account</a>
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
            `
          }
        });
      } catch (mailErr) {
        console.warn('Firestore mail logging notice:', mailErr.message);
      }

      // Refresh invitations list
      await fetchInvitations();

      // Show comprehensive success modal with immediate copy link
      await Swal.fire({
        title: 'Invitation Dispatched!',
        html: `
          <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
            <p style="margin-bottom: 12px; color: #4a5568;">
              An invitation email has been sent to <strong>${studentEmail}</strong>.
            </p>
            <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
              <label style="display: block; font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; margin-bottom: 6px;">Direct Student Sign Up Link:</label>
              <input type="text" id="swalStudLink" readonly value="${invitationLink}" style="width: 100%; font-size: 12px; padding: 8px; border: 1px solid #cbd5e0; border-radius: 6px; background-color: #ffffff; color: #2d3748; box-sizing: border-box;" />
            </div>
            <button id="copySwalStudBtn" type="button" style="width: 100%; background: #541b2f; color: #fff; padding: 10px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              📋 Copy Student Sign Up Link
            </button>
            <p style="font-size: 11px; color: #a0aec0; margin-top: 10px; margin-bottom: 0;">
              💡 The student can use this link directly in their browser anytime to create their account.
            </p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#801e38',
        confirmButtonText: 'Done',
        didOpen: () => {
          const btn = document.getElementById('copySwalStudBtn');
          const input = document.getElementById('swalStudLink');
          if (btn && input) {
            btn.addEventListener('click', () => {
              navigator.clipboard.writeText(input.value);
              btn.innerText = '✅ Copied to Clipboard!';
              btn.style.background = '#2e7d32';
              setTimeout(() => {
                btn.innerText = '📋 Copy Student Sign Up Link';
                btn.style.background = '#541b2f';
              }, 2500);
            });
          }
        }
      });
      setStudentEmail('');

    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
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
    try {
      // Update invitation sent time
      await updateDoc(doc(db, 'studentInvitations', invitationId), {
        invitationSentAt: new Date().toISOString()
      });

      // Get invitation data
      const invitation = invitations.find(i => i.id === invitationId);
      const studentPortalUrl = window.location.origin;
      const link = invitation?.invitationLink || `${studentPortalUrl}/student/signup?email=${encodeURIComponent(studentEmail)}`;

      // 1. Direct Backend Resend
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://archivio-email-service.onrender.com';
        await authFetch(`${backendUrl}/api/send-student-invitation-email`, {
          to: studentEmail.toLowerCase().trim(),
          invitationLink: link,
          senderName: adviserData.displayName || 'Research Adviser',
          senderDepartment: adviserData.department || 'SWU Phinma'
        });
      } catch (emailError) {
        console.warn('Backend resend notice:', emailError);
      }

      // 2. Redundant queue in Firestore 'mail'
      try {
        await addDoc(collection(db, 'mail'), {
          to: studentEmail,
          message: {
            subject: "Reminder: Invitation to Join ARCHIVIO",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                <div style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); padding: 40px 20px; text-align: center;">
                  <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
                  <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
                  <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
                </div>
                
                <div style="padding: 40px 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Reminder: Action Required</h2>
                  <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">This is a reminder that you have been invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Student Researcher</strong>.</p>
                  
                  <div style="background-color: #fffaf0; border: 1px solid #feebc8; color: #c05621; padding: 15px; border-radius: 6px; font-size: 13px; margin: 20px 0; display: flex; align-items: flex-start; gap: 10px;">
                    <span style="font-size: 16px;">⏰</span>
                    <p style="margin: 0;"><strong>Important:</strong> Please activate your account to begin managing your research projects with your adviser.</p>
                  </div>
                  
                  <div style="text-align: center; margin: 40px 0 10px 0;">
                    <a href="${link}" style="background: linear-gradient(135deg, #541b2f 0%, #7a2744 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(84, 27, 47, 0.25);">Create Your Account</a>
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
            `
          }
        });
      } catch (emailError) {
        console.warn('Email service error:', emailError);
      }

      await fetchInvitations();
      Swal.fire({
        title: 'Sent!',
        text: `Invitation resent to ${studentEmail}`,
        icon: 'success',
        confirmButtonColor: '#801e38'
      });
    } catch (error) {
      setError('Failed to resend invitation');
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
        await fetchInvitations();
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

  return (
    <Layout title="Send Invitations" breadcrumb="ARCHIVIO › Send Invitations" showSearch={true}>
      <div className="max-w-5xl mx-auto space-y-6">
        <SectionTitle sub="Invite students to your research group — type their email and send">
          Send Student Invitations
        </SectionTitle>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Adviser Email Check */}
        {adviserData?.email && !adviserData.email.toLowerCase().endsWith('@phinmaed.com') && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4 flex items-start gap-3">
            <span className="text-yellow-600 text-lg">⚠️</span>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">Your email ({adviserData.email}) is not a @phinmaed.com email. You cannot send invitations.</p>
          </div>
        )}

        {/* Action Card */}
        <Card glass={true} className="border-2 border-dashed border-stone-200 dark:border-stone-800 p-5 sm:p-8 md:p-10 flex flex-col items-center justify-center text-center">
          <div className="text-3xl sm:text-4xl text-[#7a2e46] dark:text-[#f8d070] mb-2 sm:mb-3">✉️</div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#7a2e46] dark:text-[#f8d070] mb-2">Send Student Registration Link</h2>
          <p className="text-gray-500 dark:text-stone-400 text-xs sm:text-sm max-w-lg mb-5 sm:mb-6">
            Type the student's institutional email address below and click Send. The student will receive a registration link to create their account in ARCHIVIO.
          </p>
          <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a2e46] dark:text-[#f8d070]">📧</span>
              <input 
                type="email" 
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value.trim())}
                placeholder="e.g. jcreyes.swu@phinmaed.com" 
                className="w-full bg-white dark:bg-stone-950 border border-gray-300 dark:border-stone-700 text-gray-900 dark:text-stone-100 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <PremiumButton 
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full sm:w-auto justify-center"
            >
              {loading ? 'Sending...' : 'Send Link'}
            </PremiumButton>
          </form>
          <p className="text-[11px] text-gray-400 dark:text-stone-500 mt-3 sm:mt-4">💡 Requires authentic SWU PHINMA student email ending in <strong>.swu@phinmaed.com</strong>.</p>
        </Card>

        {/* History: Mobile Cards for Phones */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-stone-100 text-base">Sent Invitations</h3>
            <span className="text-xs text-gray-500 dark:text-stone-400">{invitations.length} total</span>
          </div>

          {invitations.length === 0 ? (
            <Card glass={true} className="p-6 text-center text-gray-400 dark:text-stone-500 text-sm">
              No invitations sent yet. Send your first one above!
            </Card>
          ) : (
            invitations.map((invitation) => (
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
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    invitation.status === 'active' 
                      ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                      : 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}>
                    • {invitation.status === 'active' ? 'Registered' : 'Pending'}
                  </span>
                </div>

                {invitation.status === 'pending' && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-100 dark:border-stone-800">
                    <PremiumButton 
                      onClick={() => handleCopyInvitationLink(invitation.invitationLink || `${window.location.origin}/student/signup?email=${encodeURIComponent(invitation.studentEmail)}`)}
                      variant="ghost"
                      size="sm"
                      className="justify-center text-[11px] px-1"
                      title="Copy signup link"
                    >
                      📋 Copy
                    </PremiumButton>
                    <PremiumButton 
                      onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="justify-center text-[11px] px-1"
                    >
                      🔄 Resend
                    </PremiumButton>
                    <PremiumButton 
                      onClick={() => handleRemoveInvitation(invitation.id, invitation.studentEmail)}
                      disabled={loading}
                      variant="ghost"
                      size="sm"
                      className="justify-center text-[11px] px-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ❌ Remove
                    </PremiumButton>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* History Table (Desktop Only) */}
        <Card glass={true} className="hidden md:block">
          <div className="p-5 border-b border-gray-200 dark:border-stone-800">
            <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg">Sent Invitations</h3>
            <p className="text-xs text-gray-500 dark:text-stone-400">Track invitations you've sent to students</p>
          </div>
          
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-stone-500">
              <p className="text-sm">No invitations sent yet. Send your first one above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#faf5f6] dark:bg-stone-950 text-[#7a2e46] dark:text-stone-400 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-6">Student Email</th>
                    <th className="py-3 px-6">Sent</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50">
                      <td className="py-4 px-6 text-gray-700 dark:text-stone-300 font-medium">{invitation.studentEmail}</td>
                      <td className="py-4 px-6 text-gray-500 dark:text-stone-400">
                        {invitation.invitationSentAt ? new Date(invitation.invitationSentAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                          invitation.status === 'active' 
                            ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                            : 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        }`}>
                          • {invitation.status === 'active' ? 'Registered' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {invitation.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <PremiumButton 
                              onClick={() => handleCopyInvitationLink(invitation.invitationLink || `${window.location.origin}/student/signup?email=${encodeURIComponent(invitation.studentEmail)}`)}
                              variant="ghost"
                              size="sm"
                              title="Copy direct registration link"
                            >
                              📋 Copy Link
                            </PremiumButton>
                            <PremiumButton 
                              onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                              disabled={loading}
                              variant="ghost"
                              size="sm"
                            >
                              🔄 Resend
                            </PremiumButton>
                            <PremiumButton 
                              onClick={() => handleRemoveInvitation(invitation.id, invitation.studentEmail)}
                              disabled={loading}
                              variant="ghost"
                              size="sm"
                            >
                              ❌ Remove
                            </PremiumButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default SendInvitations;
