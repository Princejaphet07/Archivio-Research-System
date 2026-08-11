import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAdviser } from '../context/AdviserContext';
import Layout from '../components/Layout';

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
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const emailResponse = await fetch(`${backendUrl}/api/send-student-invitation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: studentEmail,
            invitationLink: invitationLink,
            senderName: adviserData.displayName,
            senderDepartment: adviserData.department,
            message: `You have been invited to join ARCHIVIO Research Management System as a student researcher.`
          })
        });

        if (!emailResponse.ok) {
          console.warn('Email send failed, but invitation saved to database');
        }
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
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const studentPortalUrl = window.location.origin;
        await fetch(`${backendUrl}/api/send-student-invitation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: studentEmail,
            invitationLink: invitation.invitationLink || `${studentPortalUrl}/signup`,
            senderName: adviserData.displayName,
            senderDepartment: adviserData.department,
            message: `You have been invited to join ARCHIVIO Research Management System as a student researcher.`
          })
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
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-1">Send Student Invitations</h1>
          <p className="text-sm text-gray-500 dark:text-stone-400">Invite students to your research group — type their email and send</p>
        </div>

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
        <div className="bg-white dark:bg-stone-900 border-2 border-dashed border-gray-200 dark:border-stone-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="text-4xl text-[#7a2e46] dark:text-[#f8d070] mb-3">✉️</div>
          <h2 className="text-2xl font-serif font-bold text-[#7a2e46] dark:text-[#f8d070] mb-2">Send Student Registration Link</h2>
          <p className="text-gray-500 dark:text-stone-400 text-sm max-w-lg mb-6">
            Type the student's email address below and click Send. The student will receive a registration link to create their account in ARCHIVIO.
          </p>
          <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a2e46] dark:text-[#f8d070]">M</span>
              <input 
                type="email" 
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value.trim())}
                placeholder="e.g. student@phinmaed.com" 
                className="w-full bg-white dark:bg-stone-950 border border-gray-300 dark:border-stone-700 text-gray-900 dark:text-stone-100 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070] disabled:opacity-50"
                disabled={loading}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#7a2e46] dark:bg-[#f8d070] hover:bg-[#5f2135] dark:hover:bg-[#ffe090] disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-stone-900 font-bold px-6 py-3 rounded-lg transition whitespace-nowrap"
            >
              {loading ? 'Sending...' : 'Send Link'}
            </button>
          </form>
          <p className="text-xs text-gray-400 dark:text-stone-500 mt-4">💡 Only @phinmaed.com emails can receive invitations.</p>
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-200 dark:border-stone-800">
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
                          <button 
                            onClick={() => handleResendInvitation(invitation.id, invitation.studentEmail)}
                            disabled={loading}
                            className="border border-gray-300 dark:border-stone-700 text-gray-600 dark:text-stone-300 px-3 py-1.5 rounded text-xs font-semibold hover:bg-gray-50 dark:hover:bg-stone-800 disabled:opacity-50"
                          >
                            🔄 Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default SendInvitations;
