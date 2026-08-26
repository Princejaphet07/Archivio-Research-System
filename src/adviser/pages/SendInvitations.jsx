import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAdviser } from '../context/AdviserContext';
import Layout from '../components/Layout';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';

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

    if (!studentEmail.toLowerCase().endsWith('@phinmaed.com')) {
      setError('Email must use @phinmaed.com domain');
      return;
    }

    if (!adviserData?.email.toLowerCase().endsWith('@phinmaed.com')) {
      setError('❌ Only advisers with @phinmaed.com email can send invitations');
      return;
    }

    setLoading(true);

    try {
      // Generate invitation token (kept for Firestore tracking)
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      // Clean link to the Sign Up page — no token in the URL
      const studentPortalUrl = window.location.origin;
      const invitationLink = `${studentPortalUrl}/student/signup`;

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

      // Call email service to send invitation
      try {
        await addDoc(collection(db, 'mail'), {
          to: studentEmail,
          message: {
            subject: "Invitation to Join ARCHIVIO",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                  <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0;">Hi Student,</h2>
                  <p style="color: #4a5568; line-height: 1.6;">You have been invited to join the ARCHIVIO Research Management System as a student researcher.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${invitationLink}" style="background-color: #541b2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set up your account</a>
                  </div>
                  
                  <p style="color: #718096; font-size: 14px; margin-bottom: 0;">
                    Best regards,<br>
                    <strong>${adviserData.displayName || 'Research Adviser'}</strong><br>
                    ${adviserData.department || 'SWU Phinma'}
                  </p>
                </div>
              </div>
            `
          }
        });
      } catch (emailError) {
        console.warn('Email service error (invitation still saved):', emailError);
      }

      // Refresh invitations list
      await fetchInvitations();

      setSuccess(`✅ Invitation sent to ${studentEmail}!`);
      setStudentEmail('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
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

      // Resend email
      try {
        const studentPortalUrl = window.location.origin;
        const link = invitation.invitationLink || `${studentPortalUrl}/signup`;
        
        await addDoc(collection(db, 'mail'), {
          to: studentEmail,
          message: {
            subject: "Reminder: Invitation to Join ARCHIVIO",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                  <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0;">Hi Student,</h2>
                  <p style="color: #4a5568; line-height: 1.6;">This is a reminder that you have been invited to join the ARCHIVIO Research Management System as a student researcher.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #541b2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set up your account</a>
                  </div>
                  
                  <p style="color: #718096; font-size: 14px; margin-bottom: 0;">
                    Best regards,<br>
                    <strong>${adviserData.displayName || 'Research Adviser'}</strong><br>
                    ${adviserData.department || 'SWU Phinma'}
                  </p>
                </div>
              </div>
            `
          }
        });
      } catch (emailError) {
        console.warn('Email service error:', emailError);
      }

      await fetchInvitations();
      setSuccess(`✅ Invitation resent to ${studentEmail}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to resend invitation');
    } finally {
      setLoading(false);
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

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4 flex items-start gap-3">
            <span className="text-green-500 text-lg">✅</span>
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
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
        <Card glass={true} className="border-2 border-dashed border-stone-200 dark:border-stone-800 p-10 flex flex-col items-center justify-center text-center">
          <div className="text-4xl text-[#7a2e46] dark:text-[#f8d070] mb-3">✉️</div>
          <h2 className="text-2xl font-serif font-bold text-[#7a2e46] dark:text-[#f8d070] mb-2">Send Student Registration Link</h2>
          <p className="text-gray-500 dark:text-stone-400 text-sm max-w-lg mb-6">
            Type the student's email address below and click Send. The student will receive a registration link to create their account in ARCHIVIO.
          </p>
          <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a2e46] dark:text-[#f8d070]">📧</span>
              <input 
                type="email" 
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value.trim())}
                placeholder="e.g. student@phinmaed.com" 
                className="w-full bg-white dark:bg-stone-950 border border-gray-300 dark:border-stone-700 text-gray-900 dark:text-stone-100 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <PremiumButton 
              type="submit"
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Sending...' : 'Send Link'}
            </PremiumButton>
          </form>
          <p className="text-xs text-gray-400 dark:text-stone-500 mt-4">💡 Only @phinmaed.com emails can receive invitations.</p>
        </Card>

        {/* History Table */}
        <Card glass={true}>
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
                          <PremiumButton 
                            onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                            disabled={loading}
                            variant="ghost"
                            size="sm"
                          >
                            🔄 Resend
                          </PremiumButton>
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
