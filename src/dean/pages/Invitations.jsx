import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { validateAdviserSchoolEmail } from '../../utils/schoolEmailValidator';
import { sendEmailWithFallback } from '../../utils/emailDispatcher';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { getBackendUrl } from '../../utils/backendUrl';
import { authFetch } from '../../utils/authFetch';
import { 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check, 
  Send, 
  Users, 
  UserPlus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  ShieldCheck
} from 'lucide-react';

export default function Invitations() {
  const { deanData, deanSettings } = useUser();
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'expired'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form state for Single Mode
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

  const defaultSubject = deanSettings?.emailTemplates?.adviserInvitation?.subject || "Invitation: Join ARCHIVIO as a Research Adviser";

  // Pre-fill form when settings load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      message: defaultMessage
    }));
  }, [defaultMessage]);

  // Fetch advisers on mount and when deanData changes
  useEffect(() => {
    if (!deanData?.email) return;

    const advisersQuery = query(
      collection(db, 'advisers'),
      where('invitedBy', '==', deanData.email)
    );

    const unsubscribe = onSnapshot(advisersQuery, (snapshot) => {
      const advisersData = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawSentDate = data.invitationSentAt || data.createdAt;
        const sentDate = rawSentDate?.toDate ? rawSentDate.toDate() : new Date(rawSentDate || 0);
        const daysSinceSent = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
        const isExpired = data.status === 'pending' && !isNaN(sentDate.getTime()) && sentDate.getTime() > 0 && daysSinceSent > 7;

        return {
          id: doc.id,
          ...data,
          isExpired,
          computedStatus: data.status === 'active' ? 'active' : isExpired ? 'expired' : 'pending'
        };
      });

      advisersData.sort((a, b) => {
        const dateA = new Date(a.invitationSentAt || a.createdAt || 0);
        const dateB = new Date(b.invitationSentAt || b.createdAt || 0);
        return dateB - dateA;
      });

      setAdvisers(advisersData);
    }, (error) => {
      console.error('Error fetching advisers:', error);
    });

    return () => unsubscribe();
  }, [deanData?.email]);

  // Helper to copy invitation link to clipboard (#5 Feedback & #7 Affordance)
  const handleCopyLink = (adviser) => {
    const link = adviser.invitationLink || `${window.location.origin}/adviser/signup?email=${encodeURIComponent(adviser.email)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(adviser.id);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Link Copied!',
      text: `Activation link for ${adviser.email} copied to clipboard.`,
      showConfirmButton: false,
      timer: 2500
    });

    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Single Invitation Dispatcher (#6 Error Prevention)
  const handleSendSingleInvitation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!formData.email.toLowerCase().endsWith('@phinmaed.com')) {
      errors.email = 'Must use an @phinmaed.com institutional email';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    Swal.fire({
      title: 'Sending Invitation...',
      text: `Preparing institutional invitation for ${formData.email.toLowerCase().trim()}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const emailCheck = validateAdviserSchoolEmail(formData.email);
      if (!emailCheck.isValid) {
        Swal.close();
        setError(`❌ ${emailCheck.error}`);
        setLoading(false);
        return;
      }
      const targetEmail = emailCheck.normalizedEmail;

      // Duplicate check in active users (with automatic ghost/orphan account detection)
      const qUser = query(collection(db, 'users'), where('email', '==', targetEmail), limit(1));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        let isActuallyActiveInAuth = true;
        try {
          const backendUrl = getBackendUrl();
          const resp = await authFetch(`${backendUrl}/api/check-auth-user`, { email: targetEmail });
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
          // Ghost or orphaned record: auto-clean it completely so Dean is never blocked
          console.log(`🧹 Auto-purging orphaned account for ${targetEmail}`);
          await wipeEmailData(targetEmail, snapUser.docs[0].id);
        } else {
          Swal.close();
          setError('This email is already registered to an active ARCHIVIO account.');
          setLoading(false);
          return;
        }
      }

      // Check existing pending invitation
      const qAdvPending = query(
        collection(db, 'advisers'),
        where('email', '==', targetEmail),
        where('status', '==', 'pending')
      );
      const snapAdvPending = await getDocs(qAdvPending);
      if (!snapAdvPending.empty) {
        const hasActivePending = snapAdvPending.docs.some(d => {
          const pData = d.data();
          const pDate = pData.invitationSentAt?.toDate ? pData.invitationSentAt.toDate() : new Date(pData.invitationSentAt || pData.createdAt || 0);
          const days = (Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24);
          return isNaN(pDate.getTime()) || pDate.getTime() <= 0 || days <= 7;
        });

        if (hasActivePending) {
          Swal.close();
          setError('This email already has a pending invitation in the Sent Invitations table.');
          setLoading(false);
          return;
        } else {
          // Expired pending invitation(s): remove old expired record(s) so fresh invite proceeds cleanly
          for (const expDoc of snapAdvPending.docs) {
            await deleteDoc(expDoc.ref).catch(() => {});
          }
        }
      }

      // Check existing adviser record if any exists but is orphaned (not in Auth)
      const qAdvExisting = query(
        collection(db, 'advisers'),
        where('email', '==', targetEmail),
        limit(1)
      );
      const snapAdvExisting = await getDocs(qAdvExisting);
      if (!snapAdvExisting.empty) {
        try {
          const backendUrl = getBackendUrl();
          const resp = await authFetch(`${backendUrl}/api/check-auth-user`, { email: targetEmail });
          const checkRes = resp && resp.ok ? await resp.json() : null;
          if (checkRes && checkRes.inAuth === false) {
            console.log(`🧹 Auto-purging orphaned adviser record for ${targetEmail}`);
            await wipeEmailData(targetEmail, snapAdvExisting.docs[0].id);
          }
        } catch (_) {}
      }

      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const adviserPortalUrl = window.location.origin;
      const cleanEmail = encodeURIComponent(targetEmail);
      const invitationLink = `${adviserPortalUrl}/adviser/signup?email=${cleanEmail}`;

      const resolvedSenderEmail = deanData?.email || '';
      const resolvedSenderName = deanData?.displayName || deanData?.name || 'Dean';
      const resolvedDepartment = deanData?.department || 'SWU Phinma';

      const nowMs = Date.now();
      const expiresAtIso = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();

      const adviserData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: targetEmail,
        invitedBy: resolvedSenderEmail,
        invitedByName: resolvedSenderName,
        department: resolvedDepartment,
        status: 'pending',
        invitationToken,
        invitationLink,
        message: formData.message || defaultMessage || '',
        invitationSentAt: new Date(nowMs).toISOString(),
        expiresAt: expiresAtIso,
        createdAt: new Date(nowMs).toISOString()
      };

      await addDoc(collection(db, 'advisers'), adviserData);

      // Email HTML (Unified with official ARCHIVIO template)
      const adviserFullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const emailMessage = (formData.message || defaultMessage || '')
        .replace('[Adviser Name]', adviserFullName)
        .replace('[ACTIVATION_LINK]', invitationLink)
        .replace('[Sender Name]', resolvedSenderName)
        .replace('[Department]', resolvedDepartment);

      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
    
    <div style="background: linear-gradient(135deg, #590000 0%, #770000 100%); padding: 40px 20px; text-align: center;">
      <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 80px; margin-bottom: 15px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
      <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
      <p style="color: #f7d2db; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">Research Management System</p>
    </div>
    
    <div style="padding: 40px 30px; background-color: #ffffff;">
      <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Welcome, ${adviserFullName}!</h2>
      <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 25px;">You have been exclusively invited to join the <strong>ARCHIVIO</strong> platform as a <strong>Research Adviser</strong>.</p>
      
      <div style="background-color: #faf6f0; border-left: 4px solid #590000; border-radius: 4px 8px 8px 4px; padding: 20px; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Message from your Dean</p>
        <p style="color: #4a5568; line-height: 1.6; font-size: 14px; margin: 0;">${(emailMessage || '').replace(/\n/g, '<br/>')}</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <strong style="color: #2b6cb0; font-size: 14px; display: block; margin-bottom: 10px;">📋 How to Access Your Account:</strong>
        <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Click the <strong>"Create Your Account"</strong> button below</li>
          <li>You will be taken to the <strong>Research Adviser Sign Up page</strong></li>
          <li>Register using your <strong>@phinmaed.com</strong> email address</li>
          <li>After signing up, log in to access your <strong>Research Adviser Dashboard</strong></li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 40px 0 30px 0;">
        <a href="${invitationLink}" style="background: linear-gradient(135deg, #590000 0%, #770000 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(89, 0, 0, 0.25);">Create Your Account</a>
      </div>
      
      <div style="background-color: #fffaf0; border: 1px solid #feebc8; color: #c05621; padding: 15px; border-radius: 6px; font-size: 13px; margin: 30px 0; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 16px;">⏰</span>
        <p style="margin: 0;"><strong>Important:</strong> This invitation link will expire in 7 days. Please activate your account as soon as possible.</p>
      </div>

      <p style="color: #718096; font-size: 14px; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px;">
        Best regards,<br>
        <strong>${resolvedSenderName}</strong><br>
        ${resolvedDepartment}<br>
      </p>
    </div>
    
    <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Southwestern University PHINMA.<br>All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      await sendEmailWithFallback({
        to: targetEmail,
        subject: defaultSubject,
        html: emailHTML,
        backendEndpoint: '/api/send-invitation-email',
        backendPayload: {
          to: targetEmail,
          adviserName: adviserFullName,
          subject: defaultSubject,
          message: formData.message || defaultMessage || '',
          invitationLink,
          senderName: resolvedSenderName,
          senderDepartment: resolvedDepartment
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Invitation Dispatched!',
        text: `Official invite sent to ${targetEmail}`,
        confirmButtonColor: '#10b981'
      });

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        message: defaultMessage
      });
      setFormErrors({});
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Dispatch Error', text: 'Failed to send invitation.', confirmButtonColor: '#770000' });
    } finally {
      setLoading(false);
    }
  };

  // Resend / Renew Invitation
  const handleResendInvitation = async (adviserId, adviserEmail) => {
    setLoading(true);
    Swal.fire({
      title: 'Resending Invitation...',
      text: `Dispatching renewed link to ${adviserEmail}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const expiresAtIso = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, 'advisers', adviserId), {
        invitationSentAt: nowIso,
        expiresAt: expiresAtIso,
        status: 'pending'
      });

      const adviser = advisers.find(a => a.id === adviserId);
      const link = adviser?.invitationLink || `${window.location.origin}/adviser/signup?email=${encodeURIComponent(adviserEmail)}`;

      await sendEmailWithFallback({
        to: adviserEmail,
        subject: defaultSubject || 'Reminder: Invitation to Join ARCHIVIO',
        html: `<p>Hello ${adviser?.firstName || 'Faculty'}, please activate your account at: <a href="${link}">${link}</a></p>`,
        backendEndpoint: '/api/send-invitation-email',
        backendPayload: {
          to: adviserEmail,
          adviserName: adviser?.displayName || 'Adviser',
          subject: defaultSubject,
          message: adviser?.message || defaultMessage,
          invitationLink: link,
          senderName: deanData?.displayName || 'Dean',
          senderDepartment: deanData?.department || 'SWU Phinma'
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Invitation Renewed & Sent',
        text: `A fresh invitation link was sent to ${adviserEmail}`,
        confirmButtonColor: '#770000'
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Resend Failed', text: 'Could not deliver renewed invitation.', confirmButtonColor: '#770000' });
    } finally {
      setLoading(false);
    }
  };

  // Remove Invitation with correct deleteDoc call (#6 Error Prevention)
  const handleRemoveInvitation = async (adviserId, adviserEmail) => {
    const result = await Swal.fire({
      title: 'Revoke Invitation?',
      text: `Are you sure you want to revoke the invitation for ${adviserEmail}? The activation link will immediately become invalid.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Revoke Access'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await wipeEmailData(adviserEmail, adviserId);
        Swal.fire({
          icon: 'success',
          title: 'Invitation Revoked',
          text: `Invitation record for ${adviserEmail} has been removed.`,
          confirmButtonColor: '#770000'
        });
      } catch (error) {
        console.error('Error removing invitation:', error);
        Swal.fire({
          icon: 'error',
          title: 'Removal Error',
          text: 'Failed to remove invitation record.',
          confirmButtonColor: '#770000'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtered Advisers
  const filteredAdvisers = advisers.filter(adv => {
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && adv.status === 'active') ||
      (statusFilter === 'pending' && adv.computedStatus === 'pending') ||
      (statusFilter === 'expired' && adv.computedStatus === 'expired');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      adv.displayName.toLowerCase().includes(q) ||
      adv.email.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAdvisers.length / itemsPerPage));
  const paginatedAdvisers = filteredAdvisers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingCount = advisers.filter(a => a.computedStatus === 'pending').length;
  const activeCount = advisers.filter(a => a.status === 'active').length;
  const expiredCount = advisers.filter(a => a.computedStatus === 'expired').length;

  return (
    <div className="flex h-screen w-full bg-[#fbfbfa] dark:bg-stone-950 transition-colors overflow-hidden font-sans antialiased text-stone-900 dark:text-stone-100">
      <Sidebar activePage="invitations" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="invitations" />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <SectionTitle sub="Manage research faculty invitations, link activations, and institutional access.">
                Adviser Directory & Invitations
              </SectionTitle>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {activeCount} Active Advisers
              </span>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {pendingCount} Pending Activation
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Form Panel */}
            <Card glass={true} className="lg:col-span-5 overflow-hidden">
              <div className="bg-gradient-to-r from-[#590000] to-[#770000] p-5 text-white">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5 text-amber-300" />
                  <h3 className="font-serif text-base font-bold">Invite Research Faculty</h3>
                </div>
                <p className="text-xs text-white/80 mt-1">
                  Invite an individual faculty member by institutional email
                </p>
              </div>

              <div className="p-5 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSendSingleInvitation} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="e.g. Roberto"
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-[#770000]/40"
                        disabled={loading}
                      />
                      {formErrors.firstName && <p className="text-[11px] text-rose-500 mt-1">{formErrors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="e.g. Gomez"
                        className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-[#770000]/40"
                        disabled={loading}
                      />
                      {formErrors.lastName && <p className="text-[11px] text-rose-500 mt-1">{formErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                      Institutional Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="adviser@phinmaed.com"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-[#770000]/40"
                      disabled={loading}
                    />
                    {formErrors.email ? (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
                    ) : (
                      <p className="text-[10px] text-stone-400 mt-1">Restricted to @phinmaed.com institutional accounts</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Invitation Memo
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, message: defaultMessage }))}
                        className="text-[10px] text-[#590000] dark:text-amber-400 hover:underline cursor-pointer font-semibold"
                      >
                        Reset Default
                      </button>
                    </div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/50 text-stone-800 dark:text-stone-200 outline-none focus:ring-2 focus:ring-[#770000]/40 resize-none font-sans"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? 'Sending Invitation...' : 'Send Official Invitation'}</span>
                  </button>
                </form>
              </div>
            </Card>

            {/* Right Column: Tracker & Management Console (#1 & #7) */}
            <Card glass={true} className="lg:col-span-7 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                    Faculty Invitation Status
                  </h3>
                  <p className="text-xs text-stone-400">
                    {filteredAdvisers.length} records matching current criteria
                  </p>
                </div>

                {/* Filter Pills (#2 Consistency) */}
                <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    All ({advisers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      statusFilter === 'pending' ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-400 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      statusFilter === 'active' ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('expired')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      statusFilter === 'expired' ? 'bg-white dark:bg-stone-700 text-rose-700 dark:text-rose-400 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Expired ({expiredCount})
                  </button>
                </div>
              </div>

              {/* Search in table */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter advisers by name or email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/40 text-stone-800 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#770000]"
                />
              </div>

              {/* Table List */}
              {paginatedAdvisers.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No adviser invitations found matching this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
                        <th className="pb-2.5">Adviser Name</th>
                        <th className="pb-2.5">Email</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70 font-medium">
                      {paginatedAdvisers.map((adv) => (
                        <tr key={adv.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#590000]/10 text-[#590000] dark:text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {adv.firstName?.[0] || 'A'}{adv.lastName?.[0] || ''}
                              </div>
                              <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                                {adv.displayName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                            {adv.email}
                          </td>

                          <td className="py-3">
                            {adv.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : adv.computedStatus === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <Clock className="w-3 h-3" /> Link Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>

                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Copy Link (#7 Affordance) */}
                              <button
                                type="button"
                                onClick={() => handleCopyLink(adv)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                                title="Copy direct sign-up link"
                              >
                                {copiedId === adv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {adv.status !== 'active' && (
                                <>
                                  {/* Resend Link */}
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvitation(adv.id, adv.email)}
                                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                                    title="Resend invitation email"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Revoke Link */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInvitation(adv.id, adv.email)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                    title="Revoke and wipe invitation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-400">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </Card>

          </div>

        </main>
      </div>
    </div>
  );
}
