import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { logActivity } from '../firebase/logActivity';
import swuLogoSeal from '../assets/new icon.png';
import parchmentBg from '../assets/parchment.jpg';
import Swal from 'sweetalert2';

export default function StudentSignup({ onSwitchPage }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

  // Step 1 — Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    studentNumber: '',
    schoolEmail: '',
    course: '',
    yearLevel: ''
  });

  // Step 2 — Group Info
  const [groupInfo, setGroupInfo] = useState({
    groupName: '',
    researchTitle: '',
    members: []
  });
  const [memberInput, setMemberInput] = useState('');

  // Step 3 — Account Security
  const [securityInfo, setSecurityInfo] = useState({
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  // Password strength
  const pw = securityInfo.password;
  const hasEight = pw.length >= 8;
  const hasNum = /\d/.test(pw);
  const hasUp = /[A-Z]/.test(pw);
  const hasSp = /[^A-Za-z0-9]/.test(pw);
  const strength = [hasEight, hasNum, hasUp, hasSp].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][strength];

  const handlePersonalChange = (e) => {
    setPersonalInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddMember = () => {
    const email = memberInput.trim().toLowerCase();
    if (!email) return;
    if (!email.endsWith('@phinmaed.com')) {
      setError('Member email must be @phinmaed.com');
      return;
    }
    if (groupInfo.members.find(m => m.email === email)) {
      setError('This member is already added');
      return;
    }
    setError('');
    setGroupInfo(prev => ({
      ...prev,
      members: [...prev.members, { email, name: email.split('@')[0] }]
    }));
    setMemberInput('');
  };

  const handleRemoveMember = (email) => {
    setGroupInfo(prev => ({
      ...prev,
      members: prev.members.filter(m => m.email !== email)
    }));
  };

  const handleVerificationInput = (value, idx) => {
    const newCode = [...verificationCode];
    newCode[idx] = value.slice(-1);
    setVerificationCode(newCode);
    if (value && idx < 5) {
      document.getElementById(`code-${idx + 1}`)?.focus();
    }
  };

  const validateStep1 = () => {
    const { firstName, lastName, studentNumber, schoolEmail, course, yearLevel } = personalInfo;
    if (!firstName || !lastName || !studentNumber || !schoolEmail || !course || !yearLevel) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (!schoolEmail.toLowerCase().endsWith('@phinmaed.com')) {
      setError('School email must be a @phinmaed.com address.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!groupInfo.groupName || !groupInfo.researchTitle) {
      setError('Please provide your Group Name and Research Title.');
      return false;
    }
    setError('');
    return true;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');

    if (securityInfo.password !== securityInfo.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (strength < 3) {
      setError('Please use a stronger password (uppercase, number, and special character required).');
      return;
    }
    if (!securityInfo.agreeTerms) {
      setError('You must agree to the Terms and Conditions.');
      return;
    }

    setLoading(true);

    try {
      const email = personalInfo.schoolEmail.trim().toLowerCase();

      // Check that the student was actually invited
      const invitationsRef = collection(db, 'studentInvitations');
      const q = query(invitationsRef, where('studentEmail', '==', email), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('❌ No invitation found for this email. Please make sure you are using the email address that was invited by your Research Adviser.');
        setLoading(false);
        return;
      }

      // A student might have multiple pending invitations if they were invited multiple times.
      // Sort in memory to get the most recent invitation.
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const dateA = new Date(a.data().createdAt || 0);
        const dateB = new Date(b.data().createdAt || 0);
        return dateB - dateA;
      });

      const invitationDoc = sortedDocs[0];
      const invitationData = invitationDoc.data();

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, securityInfo.password);
      const uid = userCredential.user.uid;

      // CLEANUP: Wipe orphaned data tied to this email to ensure a 100% fresh start
      // 1. Delete old student profile(s) with this email
      const oldStudentQuery = query(collection(db, 'students'), where('email', '==', email));
      const oldStudentSnap = await getDocs(oldStudentQuery);
      const deleteStudentPromises = oldStudentSnap.docs.map(d => deleteDoc(doc(db, 'students', d.id)));
      await Promise.all(deleteStudentPromises);
      
      // 2. Delete old groups where they were the leader
      const oldGroupQuery = query(collection(db, 'groups'), where('leaderEmail', '==', email));
      const oldGroupSnap = await getDocs(oldGroupQuery);
      const deleteGroupPromises = oldGroupSnap.docs.map(d => deleteDoc(doc(db, 'groups', d.id)));
      await Promise.all(deleteGroupPromises);

      // Save student profile to Firestore
      await setDoc(doc(db, 'students', uid), {
        uid,
        firstName: personalInfo.firstName.trim(),
        middleName: personalInfo.middleName.trim(),
        lastName: personalInfo.lastName.trim(),
        displayName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
        studentNumber: personalInfo.studentNumber.trim(),
        email,
        course: personalInfo.course,
        yearLevel: personalInfo.yearLevel,
        groupName: groupInfo.groupName.trim(),
        researchTitle: groupInfo.researchTitle.trim(),
        groupMembers: groupInfo.members,
        invitedBy: invitationData.sentBy,
        invitedByName: invitationData.sentByName,
        department: invitationData.department,
        role: 'student',
        status: 'active',
        groupStatus: 'pending', // Track approval status
        createdAt: new Date().toISOString()
      });

      // Create Group Registration Document
      await addDoc(collection(db, 'groups'), {
        groupName: groupInfo.groupName.trim(),
        researchTitle: groupInfo.researchTitle.trim(),
        leaderUid: uid,
        leaderName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
        leaderEmail: email,
        program: personalInfo.course,
        department: invitationData.department || 'Not specified',
        members: groupInfo.members,
        adviserUid: invitationData.sentBy,
        adviserName: invitationData.sentByName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Automatically generate system invitations for the other group members
      for (const member of groupInfo.members) {
        const memberEmail = typeof member === 'object' ? member.email : member;
        
        // Check if an invitation already exists for this email
        const existingInvitesSnap = await getDocs(
          query(collection(db, 'studentInvitations'), where('studentEmail', '==', memberEmail))
        );
        
        if (existingInvitesSnap.empty) {
          await addDoc(collection(db, 'studentInvitations'), {
            studentEmail: memberEmail,
            sentBy: invitationData.sentBy,
            sentByName: invitationData.sentByName,
            department: invitationData.department || 'Not specified',
            status: 'pending',
            invitationSentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            invitedByLeader: email // Track who actually added them
          });
        }
      }

      // Update invitation status to active
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'studentInvitations', invitationDoc.id), {
        status: 'active',
        userId: uid,
        activatedAt: new Date().toISOString()
      });

      setSuccess('✅ Account created successfully! Redirecting to login...');

      // ✅ Log student registration
      await logActivity({
        user:    email,
        role:    'Student',
        action:  'Registered student account',
        status:  'Success',
        details: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()} — ${personalInfo.course} | Group: ${groupInfo.groupName.trim()}`,
      });

      // Show SweetAlert2 Success Popup
      Swal.fire({
        title: 'Registration Successful!',
        text: 'Your account and group have been registered. Please wait for your research adviser to approve your group.',
        icon: 'success',
        confirmButtonColor: '#6B0F1A',
        confirmButtonText: 'Go to Login'
      }).then(() => {
        onSwitchPage('login', { email: email });
      });

    } catch (err) {
      console.error('Sign up error:', err);
      let errMsg = `❌ Sign up failed: ${err.message}`;
      if (err.code === 'auth/email-already-in-use') {
        errMsg = '❌ This email is already registered. Please go to the Login page instead.';
      }
      setError(errMsg);

      // ❌ Log failed signup
      await logActivity({
        user:    personalInfo.schoolEmail?.trim().toLowerCase() || 'unknown',
        role:    'Student',
        action:  'Failed student account registration',
        status:  'Failed',
        details: err.code || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Stepper UI ──────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              style={{
                backgroundColor: step > s ? '#6B0F1A' : step === s ? '#6B0F1A' : '#d1d5db',
                color: 'white'
              }}
            >
              {step > s ? '✓' : s}
            </div>
            <span className="text-[10px] mt-1 font-medium" style={{ color: step >= s ? '#6B0F1A' : '#9ca3af' }}>
              {['Personal Info', 'Group Info', 'Account Security'][i]}
            </span>
          </div>
          {i < 2 && (
            <div
              className="w-20 h-0.5 mb-4 mx-1 transition-all duration-300"
              style={{ backgroundColor: step > s ? '#6B0F1A' : '#d1d5db' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center font-serif flex flex-col items-center justify-center py-10 px-4 relative"
      style={{ backgroundImage: `url(${parchmentBg})` }}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full border-2 border-[#6B0F1A] p-0.5 bg-white shadow-sm flex items-center justify-center">
          <img src={swuLogoSeal} alt="SWU Logo" className="w-9 h-9 object-contain" />
        </div>
        <span className="text-[#2A1115] text-lg font-bold tracking-wide">Research Archive Management System</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-[#fdfaf4] rounded-2xl shadow-xl p-8 border border-[#ddd5c8]">

        <StepIndicator />

        {/* Error / Success */}
        {error && (
          <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        {/* ── STEP 1: Personal Info ──────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[#2A1115] text-center mb-1">Personal Information</h2>
            <p className="text-xs text-gray-500 text-center mb-1">Please provide your details to continue</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">* First Name</label>
                <input name="firstName" value={personalInfo.firstName} onChange={handlePersonalChange}
                  type="text" placeholder="Juan"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">Middle Name</label>
                <input name="middleName" value={personalInfo.middleName} onChange={handlePersonalChange}
                  type="text" placeholder="Carlos"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Last Name</label>
                <input name="lastName" value={personalInfo.lastName} onChange={handlePersonalChange}
                  type="text" placeholder="Reyes"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Student Number</label>
                <input name="studentNumber" value={personalInfo.studentNumber} onChange={handlePersonalChange}
                  type="text" placeholder="20-2222-001"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-[#2A1115] mb-1">* School Email</label>
              <input name="schoolEmail" value={personalInfo.schoolEmail} onChange={handlePersonalChange}
                type="email" placeholder="jcreyes.swu@phinmaed.com"
                className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
              <p className="text-[10px] text-gray-400 mt-1 pl-2">Pre-filled from your invitation link</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Course</label>
                <select name="course" value={personalInfo.course} onChange={handlePersonalChange}
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs text-gray-500 focus:outline-none focus:border-[#6B0F1A] appearance-none">
                  <option value="">Select your course</option>
                  <option>BS Information Technology</option>
                  <option>BS Computer Science</option>
                  <option>BS Computer Engineering</option>
                  <option>BS Nursing</option>
                  <option>BS Accountancy</option>
                  <option>BS Business Administration</option>
                  <option>BS Civil Engineering</option>
                  <option>BS Architecture</option>
                  <option>Doctor of Medicine</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Year Level</label>
                <select name="yearLevel" value={personalInfo.yearLevel} onChange={handlePersonalChange}
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2 text-xs text-gray-500 focus:outline-none focus:border-[#6B0F1A] appearance-none">
                  <option value="">Select year</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>5th Year</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button" onClick={() => onSwitchPage('login')}
                className="flex-1 py-2.5 border border-[#6B0F1A] text-[#6B0F1A] rounded-full text-sm font-semibold hover:bg-[#6B0F1A]/5 transition">
                ‹ Back
              </button>
              <button
                type="button" onClick={() => { if (validateStep1()) setStep(2); }}
                className="flex-1 py-2.5 bg-[#6B0F1A] text-white rounded-full text-sm font-semibold hover:bg-[#540c14] transition">
                Continue ›
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Group Info ─────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[#2A1115] text-center mb-1">Group Information</h2>
            <p className="text-xs text-gray-500 text-center mb-1">Tell us about your research group and team members</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Group Name</label>
              <div className="relative">
                <input value={groupInfo.groupName} onChange={e => setGroupInfo(p => ({ ...p, groupName: e.target.value }))}
                  type="text" placeholder="e.g., Group HealthAI"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#6B0F1A]" />
                <span className="absolute right-3 top-2.5 text-gray-300 text-sm">👥</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Research Title</label>
              <div className="relative">
                <input value={groupInfo.researchTitle} onChange={e => setGroupInfo(p => ({ ...p, researchTitle: e.target.value }))}
                  type="text" placeholder="e.g., ML-Based Health Monitor"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#6B0F1A]" />
                <span className="absolute right-3 top-2.5 text-gray-300 text-sm">📄</span>
              </div>
            </div>

            {/* Team Members */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#2A1115] mb-1 uppercase tracking-wide">Team Members</label>
              <p className="text-[10px] text-gray-400 mb-2">Add your group members (you are the Leader)</p>

              {/* Leader (self) */}
              <div className="flex items-center gap-2 p-3 bg-[#6B0F1A] text-white rounded-xl mb-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {personalInfo.firstName.charAt(0)}{personalInfo.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{personalInfo.firstName} {personalInfo.lastName} (You)</p>
                  <p className="text-[10px] opacity-70 truncate">{personalInfo.studentNumber} · {personalInfo.schoolEmail}</p>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">LEADER</span>
              </div>

              {/* Added members */}
              {groupInfo.members.map((m, i) => (
                <div key={m.email} className="flex items-center gap-2 p-3 bg-[#faf6f0] border border-[#d5c9bb] rounded-xl mb-2">
                  <div className="w-7 h-7 rounded-full bg-[#6B0F1A]/10 flex items-center justify-center text-xs font-bold text-[#6B0F1A] flex-shrink-0">
                    {i + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.email}</p>
                  </div>
                  <button onClick={() => handleRemoveMember(m.email)} className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0">✕</button>
                </div>
              ))}

              {/* Add member input */}
              <div className="flex gap-2 mt-2">
                <input
                  value={memberInput} onChange={e => setMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                  type="email" placeholder="member@phinmaed.com"
                  className="flex-1 bg-[#faf6f0] border border-[#d5c9bb] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#6B0F1A]" />
                <button type="button" onClick={handleAddMember}
                  className="px-4 py-2 bg-[#6B0F1A] text-white rounded-lg text-xs font-semibold hover:bg-[#540c14] transition">
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-2.5 bg-[#6B0F1A] text-white rounded-full text-sm font-semibold hover:bg-[#540c14] transition">
                ‹ Back
              </button>
              <button type="button" onClick={() => { if (validateStep2()) setStep(3); }}
                className="flex-1 py-2.5 bg-[#6B0F1A] text-white rounded-full text-sm font-semibold hover:bg-[#540c14] transition">
                Continue ›
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Account Security ───────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleCreateAccount}>
            <h2 className="text-2xl font-bold text-[#2A1115] text-center mb-1">Account Security</h2>
            <p className="text-xs text-gray-500 text-center mb-1">Set your password and verify your email</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Password</label>
              <div className="relative">
                <input
                  value={securityInfo.password}
                  onChange={e => setSecurityInfo(p => ({ ...p, password: e.target.value }))}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter a strong password"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#6B0F1A] pr-10"
                  required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-gray-400 hover:text-[#6B0F1A] text-base">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {pw && (
                <div className="mt-1.5">
                  <div className="flex gap-1 mb-0.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ backgroundColor: i <= strength ? strengthColor : '#e5e7eb' }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: strengthColor }}>{strengthLabel} password</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#2A1115] mb-1">* Confirm Password</label>
              <div className="relative">
                <input
                  value={securityInfo.confirmPassword}
                  onChange={e => setSecurityInfo(p => ({ ...p, confirmPassword: e.target.value }))}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-[#6B0F1A] pr-10"
                  required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2 text-gray-400 hover:text-[#6B0F1A] text-base">
                  {showConfirmPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 mb-5">
              <input type="checkbox" id="agreeTerms"
                checked={securityInfo.agreeTerms}
                onChange={e => setSecurityInfo(p => ({ ...p, agreeTerms: e.target.checked }))}
                className="w-3.5 h-3.5 mt-0.5 text-[#6B0F1A] border-gray-300 rounded" />
              <label htmlFor="agreeTerms" className="text-[11px] text-gray-600">
                I agree to the <span className="text-[#6B0F1A] font-semibold cursor-pointer hover:underline">Terms and Conditions and Privacy Policy</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-2.5 bg-[#6B0F1A] text-white rounded-full text-sm font-semibold hover:bg-[#540c14] transition">
                ‹ Back
              </button>
              <button
                type="submit"
                disabled={loading || !securityInfo.agreeTerms}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: securityInfo.agreeTerms && !loading ? '#6B0F1A' : '#9ca3af',
                  color: 'white'
                }}>
                {loading ? 'Creating...' : 'Create Account ✓'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-5 text-xs text-gray-500">
        Already have an account?{' '}
        <button onClick={() => onSwitchPage('login')} className="text-[#6B0F1A] font-semibold hover:underline">
          Sign In
        </button>
      </p>
    </div>
  );
}
