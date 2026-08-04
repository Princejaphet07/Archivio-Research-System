import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Invitations() {
  const { deanData, deanSettings } = useUser();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });

  // Default invitation message
  const defaultMessage = deanSettings?.emailTemplates?.adviserInvitation?.body || `Dear [Adviser Name],

You have been invited to join ARCHIVIO — the Web-Based Digital Research Archive Management System of Southwestern University PHINMA.

As a Research Adviser, you will be able to:
• Manage your assigned student research groups
• Review and evaluate submitted manuscripts
• Track submission requirements and completion status
• Approve and forward papers to the Dean for publication

Please click the button below to activate your account and set up your credentials.`;

  const defaultSubject = deanSettings?.emailTemplates?.adviserInvitation?.subject || "You're Invited to Join ARCHIVIO — SWU PHINMA Research Management System";

  // Pre-fill form when settings load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      message: defaultMessage
    }));
  }, [defaultMessage]);

  // Fetch advisers on mount and when deanData changes using onSnapshot
  useEffect(() => {
    if (!deanData?.email) return;

    const advisersQuery = query(
      collection(db, 'advisers'),
      where('invitedBy', '==', deanData.email)
    );

    const unsubscribe = onSnapshot(advisersQuery, (snapshot) => {
      const advisersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by createdAt descending in JavaScript
      advisersData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setAdvisers(advisersData);
      setError('');
    }, (error) => {
      console.error('Error fetching advisers:', error);
      setError('Error loading invitations');
    });

    return () => unsubscribe();
  }, [deanData?.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@phinmaed.com')) {
      setError('Email must use @phinmaed.com domain');
      return;
    }

    setLoading(true);

    try {
      // Generate a simple invitation token to track this specific invitation
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const targetEmail = formData.email.toLowerCase().trim();

      // CLEANUP: If this email was manually deleted from Firebase Auth and is being recreated,
      // wipe orphaned profile data tied to this email to ensure a fresh start.
      const collectionsToClean = ['users', 'advisers', 'deans'];
      for (const colName of collectionsToClean) {
        const qClean = query(collection(db, colName), where('email', '==', targetEmail));
        const snapClean = await getDocs(qClean);
        const deletes = snapClean.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletes);
      }

      // Clean up orphaned groups tied to this adviser email
      const qGroupsClean = query(collection(db, 'groups'), where('adviserUid', '==', targetEmail));
      const snapGroupsClean = await getDocs(qGroupsClean);
      const deleteGroupsClean = snapGroupsClean.docs.map(d => deleteDoc(doc(db, 'groups', d.id)));
      await Promise.all(deleteGroupsClean);

      // Clean up orphaned adviser requirements
      const qReqsClean = query(collection(db, 'requirements'), where('adviserUid', '==', targetEmail));
      const snapReqsClean = await getDocs(qReqsClean);
      const deleteReqsClean = snapReqsClean.docs.map(d => deleteDoc(doc(db, 'requirements', d.id)));
      await Promise.all(deleteReqsClean);

      // Clean link to the Sign Up page — no token exposed in the URL, only the email
      const adviserPortalUrl = 'http://localhost:5176';
      const cleanEmail = encodeURIComponent(formData.email.toLowerCase().trim());
      const invitationLink = `${adviserPortalUrl}/signup?email=${cleanEmail}`;

      // Create adviser invitation in Firestore
      const adviserData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.toLowerCase().trim(),
        invitedBy: deanData?.email,
        invitedByName: deanData?.displayName,
        department: deanData?.department,
        status: 'pending',
        invitationToken: invitationToken,
        invitationLink: invitationLink,
        message: formData.message || defaultMessage,
        invitationSentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'advisers'), adviserData);

      // Call Node.js backend to send email
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const emailResponse = await fetch(`${backendUrl}/api/send-invitation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formData.email,
            adviserName: formData.firstName,
            subject: defaultSubject,
            message: formData.message || defaultMessage,
            invitationLink: invitationLink,
            senderName: deanData?.displayName,
            senderDepartment: deanData?.department
          })
        });

        if (!emailResponse.ok) {
          console.warn('Email send failed, but invitation saved to database');
        }
      } catch (emailError) {
        console.warn('Email service error (invitation still saved):', emailError);
      }

      // Refresh advisers list (handled by onSnapshot)

      setSuccess(`✅ Invitation sent to ${formData.email}!`);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        message: ''
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (adviserId, adviserEmail) => {
    setLoading(true);
    try {
      // Update invitation sent time
      await updateDoc(doc(db, 'advisers', adviserId), {
        invitationSentAt: new Date().toISOString()
      });

      // Get adviser data
      const adviser = advisers.find(a => a.id === adviserId);

      // Resend email
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        await fetch(`${backendUrl}/api/send-invitation-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: adviserEmail,
            adviserName: adviser.firstName,
            subject: defaultSubject,
            message: adviser.message,
            invitationLink: adviser.invitationLink,
            senderName: deanData?.displayName,
            senderDepartment: deanData?.department
          })
        });
      } catch (emailError) {
        console.warn('Email service error:', emailError);
      }


      setSuccess(`✅ Invitation resent to ${adviserEmail}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage="invitations" />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage="invitations" />

        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Send Invitations</h1>
            <p className="text-xs text-stone-500 mt-0.5">Send invitation links to Research Advisers for account creation</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Form Panel */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
              <div className="bg-[#4a1024] p-5 text-white relative">
                <span className="text-xl">✉️</span>
                <h3 className="font-serif text-base font-bold mt-2">Invite a Research Adviser</h3>
                <p className="text-[11px] text-stone-300">They'll receive a secure link to create their account</p>
              </div>

              <div className="p-5 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-green-500 text-sm">✅</span>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                <form onSubmit={handleSendInvitation} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wide">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g. Maria"
                      className="w-full text-xs p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-[#4a1024] disabled:opacity-50"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wide">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="e.g. Reyes"
                      className="w-full text-xs p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-[#4a1024] disabled:opacity-50"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wide">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="adviser@phinmaed.com"
                      className="w-full text-xs p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-[#4a1024] disabled:opacity-50"
                      disabled={loading}
                    />
                    <p className="text-[9px] text-stone-400 mt-1">Must use @phinmaed.com domain</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 flex justify-between tracking-wide">
                      <span>Invitation Message</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, message: '' }))}
                        className="text-blue-600 lowercase font-normal cursor-pointer hover:underline text-[9px]"
                      >
                        💡 Reset to default
                      </button>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder={defaultMessage}
                      rows={5}
                      className="w-full text-xs p-2.5 border border-stone-200 rounded-xl bg-stone-50/50 text-stone-600 leading-relaxed outline-none focus:ring-1 focus:ring-[#4a1024] resize-none disabled:opacity-50"
                      disabled={loading}
                    />
                    <p className="text-[10px] text-stone-400 mt-1">You can customize this message before sending.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4a1024] hover:bg-[#6b1834] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    <span>✉️</span> {loading ? 'Sending...' : 'Send Invitation Link'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Tracker Log Panel */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">Sent Invitations</h3>
                  <p className="text-[11px] text-stone-400">Track invitation status and resend if needed</p>
                </div>
              </div>

              {advisers.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <p className="text-sm">No invitations sent yet. Use the form to invite your first adviser!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                        <th className="pb-3 w-1/3">Recipient</th>
                        <th className="pb-3 w-1/4">Email</th>
                        <th className="pb-3">Sent</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 font-medium text-stone-700">
                      {advisers.map((adviser) => (
                        <tr key={adviser.id} className="hover:bg-stone-50/50">
                          <td className="py-3.5 flex items-center gap-3">
                            <div className="w-7 h-7 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold border border-purple-100">
                              {adviser.firstName[0]}{adviser.lastName[0]}
                            </div>
                            <span className="font-bold text-stone-800">{adviser.displayName}</span>
                          </td>
                          <td className="py-3.5 text-stone-500 font-normal">{adviser.email}</td>
                          <td className="py-3.5 text-stone-500 font-normal">
                            {adviser.invitationSentAt ? new Date(adviser.invitationSentAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${adviser.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                              {adviser.status === 'active' ? 'Accepted' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            {adviser.status === 'pending' && (
                              <button
                                onClick={() => handleResendInvitation(adviser.id, adviser.email)}
                                disabled={loading}
                                className="px-2.5 py-1 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50 flex items-center gap-1 mx-auto shadow-sm"
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
        </main>
      </div>
    </div>
  );
}