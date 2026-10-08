import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { logActivity } from '../../firebase/logActivity';
import swuLogoSeal from '../../assets/new icon.png';
import parchmentBg from '../../assets/parchment.jpg';
import Swal from 'sweetalert2';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { validateStudentSchoolEmail } from '../../utils/schoolEmailValidator';
import PolicyAgreement from '../../components/PolicyAgreement';

const DEFAULT_CATEGORIES_LIST = [];
const DEFAULT_PROGRAMS_LIST = [];

export default function StudentSignup({ onSwitchPage }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationData, setInvitationData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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
    researchAdviser: '',
    members: []
  });
  const [memberNameInput, setMemberNameInput] = useState('');
  const [advisersList, setAdvisersList] = useState([]);
  const [programsList, setProgramsList] = useState([]);

  // Fetch Advisers dynamically from Firestore for auto-complete suggestions
  useEffect(() => {
    let advisersArr = [];
    let deansArr = [];

    const updateAdvisers = () => {
      const combined = [...advisersArr, ...deansArr];
      const uniqueAdvisers = [];
      const seen = new Set();
      for (const a of combined) {
        const key = (a.name || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueAdvisers.push(a);
        }
      }
      uniqueAdvisers.sort((a, b) => a.name.localeCompare(b.name));
      setAdvisersList(uniqueAdvisers);
    };

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snap) => {
      advisersArr = snap.docs.map(d => {
        const data = d.data();
        const fullName = data.displayName || (data.firstName ? `${data.firstName} ${data.lastName}` : '').trim();
        return {
          id: d.id,
          name: fullName,
          email: data.email || '',
          department: data.department || ''
        };
      }).filter(a => a.name);
      updateAdvisers();
    }, (err) => {
      console.warn("Notice: Advisers list fetch:", err);
    });

    const unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
      deansArr = snap.docs.map(d => {
        const data = d.data();
        const fullName = data.displayName || (data.firstName ? `${data.firstName} ${data.lastName}` : '').trim();
        return {
          id: d.id,
          name: fullName,
          email: data.email || '',
          department: data.department || ''
        };
      }).filter(a => a.name);
      updateAdvisers();
    }, (err) => {
      console.warn("Notice: Deans list fetch:", err);
    });

    return () => {
      unsubAdvisers();
      unsubDeans();
    };
  }, []);

  // Research Adviser is locked to the adviser who sent the invitation
  const isAdviserLocked = !!invitationData?.sentByName;

  // Pre-fill researchAdviser if invitation has sentByName
  useEffect(() => {
    if (invitationData?.sentByName) {
      setGroupInfo(prev => ({ ...prev, researchAdviser: invitationData.sentByName }));
    }
  }, [invitationData?.sentByName]);

  // Fetch Programs dynamically from Firestore (created by Admin in System Settings > Departments & Programs)
  useEffect(() => {
    const unsubProgs = onSnapshot(collection(db, 'programs'), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProgramsList(fetched);
    }, (error) => {
      console.error("Error fetching programs:", error);
      setProgramsList([]);
    });
    return () => unsubProgs();
  }, []);

  // Sanitizes course name so it NEVER includes parenthetical college/school/department suffixes
  const cleanCourseName = (name, school, department) => {
    if (!name) return '';
    let cleaned = name.replace(/\s*\((?:College|School|Department|Faculty)[^)]*\)/gi, '').trim();
    if (school) {
      const escSchool = school.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\s*\\(${escSchool}\\)`, 'gi'), '').trim();
    }
    if (department) {
      const escDept = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\s*\\(${escDept}\\)`, 'gi'), '').trim();
    }
    return cleaned;
  };

  // Generates clean option label: "CODE - Course Name" (e.g. "BSIT - Bachelor of Science in Information Technology")
  const getCourseOptionLabel = (prog) => {
    if (!prog) return '';
    const cleanName = cleanCourseName(prog.name, prog.school, prog.department);
    return prog.code ? `${prog.code} - ${cleanName}` : cleanName;
  };

  // Autofill schoolEmail if present in URL and pre-fetch invitation data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      const cleanEmail = emailParam.toLowerCase().trim();
      setPersonalInfo(prev => ({ ...prev, schoolEmail: cleanEmail }));
      setIsPrefilled(true);

      const fetchEarlyInvitation = async () => {
        try {
          const invitationsRef = collection(db, 'studentInvitations');
          const q = query(invitationsRef, where('studentEmail', '==', cleanEmail), where('status', '==', 'pending'));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const sortedDocs = snapshot.docs.sort((a, b) => {
              const dateA = new Date(a.data().createdAt || 0);
              const dateB = new Date(b.data().createdAt || 0);
              return dateB - dateA;
            });
            const invData = sortedDocs[0].data();
            invData.id = sortedDocs[0].id;
            setInvitationData(invData);
          }
        } catch (e) {
          console.warn('Early invitation pre-fetch notice:', e);
        }
      };
      fetchEarlyInvitation();
    }
  }, []);

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
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddMember = () => {
    const name = memberNameInput.trim();
    if (!name) {
      setFormErrors(prev => ({ ...prev, memberNameInput: 'Member name is required' }));
      setError('Please provide a member name');
      document.getElementById('signup-memberNameInput')?.focus();
      return;
    }
    const alreadyExists = groupInfo.members.some(m => {
      const existingName = typeof m === 'object' ? m.name : m;
      return existingName?.trim().toLowerCase() === name.toLowerCase();
    });
    if (alreadyExists) {
      setFormErrors(prev => ({ ...prev, memberNameInput: 'This member is already added' }));
      setError('This member is already added');
      return;
    }
    setError('');
    setFormErrors(prev => ({ ...prev, memberNameInput: '' }));
    setGroupInfo(prev => ({
      ...prev,
      members: [...prev.members, { name, email: '' }]
    }));
    setMemberNameInput('');
  };

  const handleRemoveMember = (indexToRemove) => {
    setGroupInfo(prev => ({
      ...prev,
      members: prev.members.filter((_, idx) => idx !== indexToRemove)
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
    const errors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!studentNumber.trim()) errors.studentNumber = 'Student number is required';
    if (!schoolEmail.trim()) {
      errors.schoolEmail = 'School email is required';
    } else {
      const studentEmailCheck = validateStudentSchoolEmail(schoolEmail);
      if (!studentEmailCheck.isValid) {
        errors.schoolEmail = studentEmailCheck.error;
      }
    }
    if (!course) errors.course = 'Course is required';
    if (!yearLevel) errors.yearLevel = 'Year level is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please fill in all required fields highlighted in red.');
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`signup-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return false;
    }
    setFormErrors({});
    setError('');
    return true;
  };

  const handleContinueFromStep1 = async () => {
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const email = personalInfo.schoolEmail.trim().toLowerCase();
      const invitationsRef = collection(db, 'studentInvitations');
      const q = query(invitationsRef, where('studentEmail', '==', email), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('❌ No invitation found for this email. Please make sure you are using the email address that was invited.');
        setFormErrors({ schoolEmail: 'No pending invitation found for this email' });
        document.getElementById('signup-schoolEmail')?.focus();
        setLoading(false);
        return;
      }
      
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const dateA = new Date(a.data().createdAt || 0);
        const dateB = new Date(b.data().createdAt || 0);
        return dateB - dateA;
      });

      const invData = sortedDocs[0].data();
      invData.id = sortedDocs[0].id; // store id for later use
      setInvitationData(invData);

      if (invData.invitedByLeader) {
        // It's a member! Skip to step 3.
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to verify invitation. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateStep2 = () => {
    const errors = {};
    if (!groupInfo.groupName.trim()) errors.groupName = 'Group name is required';
    if (!groupInfo.researchAdviser.trim()) {
      errors.researchAdviser = 'Research Adviser is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please fill in all required fields highlighted in red.');
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`signup-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return false;
    }
    setFormErrors({});
    setError('');
    return true;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    const errors = {};

    if (!securityInfo.password) {
      errors.password = 'Password is required';
    } else if (strength < 3) {
      errors.password = 'Please use a stronger password (uppercase, number, and special character required)';
    }

    if (!securityInfo.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (securityInfo.password !== securityInfo.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!securityInfo.agreeTerms || !policyAccepted) {
      errors.agreeTerms = 'You must read and agree to both the Terms and Conditions and Privacy Policy';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please resolve all highlighted errors before submitting.');
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(`signup-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }
    setFormErrors({});

    setLoading(true);

    try {
      const email = personalInfo.schoolEmail.trim().toLowerCase();
      if (!invitationData) {
        setError('Invitation data missing. Please go back to step 1.');
        setLoading(false);
        return;
      }

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

      // Resolve selected course/program and its department (created by Admin)
      const selectedProg = programsList.find(p => {
        const cleaned = cleanCourseName(p.name, p.school, p.department);
        return cleaned === personalInfo.course || p.name === personalInfo.course || p.code === personalInfo.course;
      });
      const resolvedDept = selectedProg?.school || selectedProg?.department || invitationData?.department || 'Not specified';
      const resolvedProgCode = selectedProg?.code || '';

      if (invitationData.invitedByLeader) {
        // --- MEMBER SIGNUP ---
        
        // Find the leader's student profile
        const leaderQ = query(collection(db, 'students'), where('email', '==', invitationData.invitedByLeader));
        const leaderSnap = await getDocs(leaderQ);
        
        let leaderData = {};
        if (!leaderSnap.empty) {
          leaderData = leaderSnap.docs[0].data();
        }

        const memberDept = resolvedDept !== 'Not specified' ? resolvedDept : (leaderData.department || 'Not specified');

        await setDoc(doc(db, 'students', uid), {
          uid,
          firstName: personalInfo.firstName.trim(),
          middleName: personalInfo.middleName.trim(),
          lastName: personalInfo.lastName.trim(),
          displayName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
          studentNumber: personalInfo.studentNumber.trim(),
          email,
          course: personalInfo.course,
          programCode: resolvedProgCode || leaderData.programCode || '',
          yearLevel: personalInfo.yearLevel,
          groupName: leaderData.groupName || 'Unknown Group',
          researchTitle: leaderData.researchTitle || 'Unknown Title',
          groupMembers: leaderData.groupMembers || [], // Sync from leader
          invitedBy: invitationData.sentBy || leaderData.invitedBy,
          invitedByName: invitationData.sentByName || leaderData.invitedByName,
          department: memberDept,
          leaderUid: leaderData.uid || null,
          role: 'member',
          status: 'active',
          groupStatus: leaderData.groupStatus || 'pending',
          createdAt: new Date().toISOString()
        });
        
        // Create user document for member
        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
          role: 'student',
          department: memberDept,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        
        // We do NOT create a new group.

      } else {
        // --- LEADER SIGNUP ---
        const chosenAdviserName = groupInfo.researchAdviser.trim();
        const matchedAdviser = advisersList.find(a => 
          a.name.toLowerCase() === chosenAdviserName.toLowerCase()
        );
        const resolvedAdviserEmail = matchedAdviser?.email || invitationData.sentBy || '';
        const resolvedAdviserName = chosenAdviserName || invitationData.sentByName || 'Not assigned';

        await setDoc(doc(db, 'students', uid), {
          uid,
          firstName: personalInfo.firstName.trim(),
          middleName: personalInfo.middleName.trim(),
          lastName: personalInfo.lastName.trim(),
          displayName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
          studentNumber: personalInfo.studentNumber.trim(),
          email,
          course: personalInfo.course,
          programCode: resolvedProgCode,
          yearLevel: personalInfo.yearLevel,
          groupName: groupInfo.groupName.trim(),
          researchTitle: groupInfo.researchTitle.trim(),
          researchAdviser: resolvedAdviserName,
          adviserName: resolvedAdviserName,
          groupMembers: groupInfo.members,
          invitedBy: resolvedAdviserEmail || invitationData.sentBy,
          invitedByName: resolvedAdviserName,
          department: resolvedDept,
          role: 'student',
          status: 'active',
          groupStatus: 'pending',
          createdAt: new Date().toISOString()
        });

        // Create user document for leader
        await setDoc(doc(db, 'users', uid), {
          uid,
          email,
          displayName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
          role: 'student',
          department: resolvedDept,
          status: 'active',
          createdAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'groups'), {
          groupName: groupInfo.groupName.trim(),
          researchTitle: groupInfo.researchTitle.trim(),
          researchAdviser: resolvedAdviserName,
          category: 'General',
          leaderUid: uid,
          leaderName: `${personalInfo.firstName.trim()} ${personalInfo.lastName.trim()}`,
          leaderEmail: email,
          program: personalInfo.course,
          programCode: resolvedProgCode,
          department: resolvedDept,
          members: groupInfo.members,
          adviserUid: resolvedAdviserEmail,
          adviserName: resolvedAdviserName,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        for (const member of groupInfo.members) {
          const memberEmail = (typeof member === 'object' ? member.email : member)?.toLowerCase()?.trim();
          if (!memberEmail) continue;

          // Clear any stale invitation/data for this member email so they get a fresh pending invitation
          await wipeEmailData(memberEmail);

          await addDoc(collection(db, 'studentInvitations'), {
            studentEmail: memberEmail,
            sentBy: invitationData.sentBy,
            sentByName: invitationData.sentByName,
            department: invitationData.department || 'Not specified',
            status: 'pending',
            invitationSentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            invitedByLeader: email
          });
        }
      }

      // Update invitation status to active
      // Update invitation status to active
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'studentInvitations', invitationData.id), {
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
        confirmButtonText: 'Continue to Dashboard'
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
            <span className="text-[10px] mt-1 font-medium text-center" style={{ color: step >= s ? '#6B0F1A' : '#9ca3af' }}>
              {['Personal Info', 'Group Info', 'Security'][i]}
            </span>
          </div>
          {i < 2 && (
            <div
              className="w-8 sm:w-16 h-0.5 mb-4 mx-1 transition-all duration-300"
              style={{ backgroundColor: step > s ? '#6B0F1A' : '#d1d5db' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center font-serif flex flex-col items-center justify-center py-6 sm:py-10 px-3 sm:px-4 relative"
      style={{ backgroundImage: `url(${parchmentBg})` }}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6 text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#6B0F1A] p-0.5 bg-white shadow-sm flex items-center justify-center shrink-0">
          <img src={swuLogoSeal} alt="SWU Logo" className="w-7 h-7 sm:w-9 sm:h-9 object-contain" />
        </div>
        <span className="text-[#2A1115] text-base sm:text-lg font-bold tracking-wide">Research Archive Management System</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-[#fdfaf4] rounded-2xl shadow-xl p-6 sm:p-9 border border-[#ddd5c8]">

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
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#2A1115] text-center mb-1.5">Personal Information</h2>
            <p className="text-sm text-gray-500 text-center mb-1.5">Please provide your details to continue</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  First Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input 
                  id="signup-firstName"
                  name="firstName" 
                  value={personalInfo.firstName} 
                  onChange={handlePersonalChange}
                  type="text" 
                  placeholder="Juan"
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                {formErrors.firstName && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                    <span>⚠️</span> {formErrors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  Middle Name
                </label>
                <input 
                  id="signup-middleName"
                  name="middleName" 
                  value={personalInfo.middleName} 
                  onChange={handlePersonalChange}
                  type="text" 
                  placeholder="Carlos"
                  className="w-full bg-[#faf6f0] border border-[#d5c9bb] rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-[#6B0F1A]" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  Last Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input 
                  id="signup-lastName"
                  name="lastName" 
                  value={personalInfo.lastName} 
                  onChange={handlePersonalChange}
                  type="text" 
                  placeholder="Reyes"
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                {formErrors.lastName && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                    <span>⚠️</span> {formErrors.lastName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  Student Number <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input 
                  id="signup-studentNumber"
                  name="studentNumber" 
                  value={personalInfo.studentNumber} 
                  onChange={handlePersonalChange}
                  type="text" 
                  placeholder="20-2222-001"
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors ${
                    formErrors.studentNumber ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                {formErrors.studentNumber && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                    <span>⚠️</span> {formErrors.studentNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-3.5">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                School Email <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input 
                id="signup-schoolEmail"
                name="schoolEmail" 
                value={personalInfo.schoolEmail} 
                onChange={handlePersonalChange}
                type="email" 
                placeholder="jcreyes.swu@phinmaed.com"
                readOnly={isPrefilled}
                className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors ${
                  formErrors.schoolEmail ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                } ${isPrefilled ? 'opacity-70 cursor-not-allowed bg-gray-100/50' : ''}`} 
              />
              {formErrors.schoolEmail && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.schoolEmail}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1.5 pl-2">
                {isPrefilled ? "Pre-filled from your invitation link (Cannot be edited)" : "Must be a valid @phinmaed.com email"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  Course <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select 
                  id="signup-course"
                  name="course" 
                  value={personalInfo.course} 
                  onChange={handlePersonalChange}
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm text-gray-700 focus:outline-none appearance-none transition-colors ${
                    formErrors.course ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`}
                >
                  <option value="">
                    {programsList.length === 0 ? 'No courses available (Contact Admin)' : 'Select your course'}
                  </option>
                  {programsList.map(prog => {
                    const cleanName = cleanCourseName(prog.name, prog.school, prog.department) || prog.name;
                    return (
                      <option key={prog.id || prog.code} value={cleanName}>
                        {getCourseOptionLabel(prog)}
                      </option>
                    );
                  })}
                </select>
                {formErrors.course && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                    <span>⚠️</span> {formErrors.course}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                  Year Level <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select 
                  id="signup-yearLevel"
                  name="yearLevel" 
                  value={personalInfo.yearLevel} 
                  onChange={handlePersonalChange}
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm text-gray-700 focus:outline-none appearance-none transition-colors ${
                    formErrors.yearLevel ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`}
                >
                  <option value="">Select year</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>5th Year</option>
                </select>
                {formErrors.yearLevel && (
                  <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                    <span>⚠️</span> {formErrors.yearLevel}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3.5">
              <button
                type="button" onClick={() => onSwitchPage('login')}
                className="flex-1 min-h-[46px] py-3 border border-[#6B0F1A] text-[#6B0F1A] rounded-full text-sm sm:text-base font-semibold hover:bg-[#6B0F1A]/5 transition flex items-center justify-center">
                ‹ Back
              </button>
              <button
                type="button" onClick={handleContinueFromStep1}
                disabled={loading}
                className="flex-1 min-h-[46px] touch-manipulation py-3 bg-[#6B0F1A] text-white rounded-full text-sm sm:text-base font-semibold hover:bg-[#540c14] transition disabled:opacity-50 flex items-center justify-center">
                {loading ? 'Checking...' : 'Continue ›'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Group Info ─────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#2A1115] text-center mb-1.5">Group Information</h2>
            <p className="text-sm text-gray-500 text-center mb-1.5">Tell us about your research group and team members</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="mb-3.5">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                Group Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  id="signup-groupName"
                  value={groupInfo.groupName} 
                  onChange={e => {
                    setGroupInfo(p => ({ ...p, groupName: e.target.value }));
                    if (formErrors.groupName) setFormErrors(p => ({ ...p, groupName: '' }));
                  }}
                  type="text" 
                  placeholder="e.g., Group HealthAI"
                  className={`w-full bg-[#faf6f0] border rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors pr-10 ${
                    formErrors.groupName ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                <span className="absolute right-3.5 top-3 sm:top-3.5 text-gray-400 text-sm">👥</span>
              </div>
              {formErrors.groupName && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.groupName}
                </p>
              )}
            </div>

            <div className="mb-3.5">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                Research Title <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  id="signup-researchTitle"
                  value={groupInfo.researchTitle} 
                  onChange={e => {
                    setGroupInfo(p => ({ ...p, researchTitle: e.target.value }));
                    if (formErrors.researchTitle) setFormErrors(p => ({ ...p, researchTitle: '' }));
                  }}
                  type="text" 
                  placeholder="e.g., ML-Based Health Monitor"
                  className={`w-full bg-[#faf6f0] border rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors pr-10 ${
                    formErrors.researchTitle ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                <span className="absolute right-3.5 top-3 sm:top-3.5 text-gray-400 text-sm">📄</span>
              </div>
              {formErrors.researchTitle && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.researchTitle}
                </p>
              )}
            </div>

            <div className="mb-3.5">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                Research Adviser <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  id="signup-researchAdviser"
                  list={isAdviserLocked ? undefined : 'signup-advisers-list'}
                  value={groupInfo.researchAdviser} 
                  onChange={e => {
                    if (isAdviserLocked) return;
                    setGroupInfo(p => ({ ...p, researchAdviser: e.target.value }));
                    if (formErrors.researchAdviser) setFormErrors(p => ({ ...p, researchAdviser: '' }));
                  }}
                  disabled={isAdviserLocked}
                  type="text" 
                  placeholder="e.g., Dr. Juan Dela Cruz"
                  className={`w-full bg-[#faf6f0] border rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors pr-10 ${
                    formErrors.researchAdviser ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  } ${isAdviserLocked ? 'opacity-70 cursor-not-allowed bg-gray-100/50 text-gray-700' : ''}`} 
                />
                <datalist id="signup-advisers-list">
                  {advisersList.map((adv, idx) => (
                    <option key={adv.id || idx} value={adv.name} />
                  ))}
                </datalist>
                <span className="absolute right-3.5 top-3 sm:top-3.5 text-gray-400 text-sm">👨‍🏫</span>
              </div>
              {formErrors.researchAdviser && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.researchAdviser}
                </p>
              )}
              {isAdviserLocked && (
                <p className="text-xs text-gray-500 mt-1.5 pl-2">
                  Assigned from your invitation (Cannot be edited)
                </p>
              )}
            </div>

            {/* Team Members */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-[#2A1115] mb-1 uppercase tracking-wide">Team Members</label>
              <p className="text-xs text-gray-500 mb-2.5">Add your group members (you are the Leader)</p>

              {/* Leader (self) */}
              <div className="flex items-center gap-2.5 p-3 sm:p-3.5 bg-[#6B0F1A] text-white rounded-xl mb-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {personalInfo.firstName.charAt(0)}{personalInfo.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{personalInfo.firstName} {personalInfo.lastName} (You)</p>
                  <p className="text-[11px] opacity-75 truncate">{personalInfo.studentNumber} · {personalInfo.schoolEmail}</p>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">LEADER</span>
              </div>

              {/* Added members */}
              {groupInfo.members.map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 bg-[#faf6f0] border border-[#d5c9bb] rounded-xl mb-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#6B0F1A]/10 flex items-center justify-center text-xs font-bold text-[#6B0F1A] flex-shrink-0">
                    {i + 2}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{typeof m === 'object' ? m.name : m}</p>
                    {m.email ? <p className="text-[11px] text-gray-500 truncate">{m.email}</p> : null}
                  </div>
                  <button type="button" onClick={() => handleRemoveMember(i)} className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0 p-1 cursor-pointer">✕</button>
                </div>
              ))}

              {/* Add member input */}
              <div className="flex gap-2.5 mt-2.5 items-start">
                <div className="flex-1">
                  <input
                    id="signup-memberNameInput"
                    value={memberNameInput} 
                    onChange={e => {
                      setMemberNameInput(e.target.value);
                      if (formErrors.memberNameInput) setFormErrors(p => ({ ...p, memberNameInput: '' }));
                    }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                    type="text" 
                    placeholder="Full Name (e.g. Juan Dela Cruz)"
                    className={`w-full bg-[#faf6f0] border rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none transition-colors min-h-[46px] ${
                      formErrors.memberNameInput ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                    }`} 
                  />
                  {formErrors.memberNameInput && (
                    <p className="text-[11px] text-red-500 mt-1 font-semibold pl-1">
                      <span>⚠️</span> {formErrors.memberNameInput}
                    </p>
                  )}
                </div>
                <button type="button" onClick={handleAddMember}
                  className="px-6 py-2.5 bg-[#6B0F1A] text-white rounded-xl text-sm font-semibold hover:bg-[#540c14] transition min-h-[46px] touch-manipulation flex items-center justify-center cursor-pointer shrink-0">
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3.5">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 min-h-[46px] touch-manipulation py-3 bg-[#6B0F1A] text-white rounded-full text-sm sm:text-base font-semibold hover:bg-[#540c14] transition flex items-center justify-center">
                ‹ Back
              </button>
              <button type="button" onClick={() => { if (validateStep2()) setStep(3); }}
                className="flex-1 min-h-[46px] touch-manipulation py-3 bg-[#6B0F1A] text-white rounded-full text-sm sm:text-base font-semibold hover:bg-[#540c14] transition flex items-center justify-center">
                Continue ›
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Account Security ───────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleCreateAccount}>
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#2A1115] text-center mb-1.5">Account Security</h2>
            <p className="text-sm text-gray-500 text-center mb-1.5">Set your password and verify your email</p>
            <div className="flex justify-center mb-4"><span className="text-[#6B0F1A] text-lg">✦</span></div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                Password <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input 
                  id="signup-password"
                  name="password"
                  value={securityInfo.password}
                  onChange={e => {
                    setSecurityInfo(p => ({ ...p, password: e.target.value }));
                    if (formErrors.password) setFormErrors(p => ({ ...p, password: '' }));
                  }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter a strong password"
                  data-password="true"
                  data-no-copy="true"
                  data-is-password="true"
                  onCopy={(e) => { e.preventDefault(); return false; }}
                  onCut={(e) => { e.preventDefault(); return false; }}
                  onContextMenu={(e) => { e.preventDefault(); return false; }}
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none select-none transition-colors pr-11 ${
                    formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6B0F1A] text-base">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.password}
                </p>
              )}

              {/* Password Strength indicator */}
              {securityInfo.password && (
                <div className="mt-3">
                  <div className="flex gap-1 h-1 mb-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                          strength >= level ? (
                            strength <= 1 ? 'bg-red-500' :
                            strength === 2 ? 'bg-yellow-500' :
                            strength === 3 ? 'bg-blue-500' : 'bg-green-500'
                          ) : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Password Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2.5 p-3 bg-[#faf6f0]/50 rounded-xl border border-[#d5c9bb]/50">
                    <div className="flex items-center gap-1.5">
                      {hasEight ? <span className="text-emerald-500 text-xs font-bold">✓</span> : <span className="text-gray-400 text-xs font-bold">○</span>}
                      <span className={`text-xs ${hasEight ? 'text-[#2A1115] font-medium' : 'text-gray-500'}`}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUp ? <span className="text-emerald-500 text-xs font-bold">✓</span> : <span className="text-gray-400 text-xs font-bold">○</span>}
                      <span className={`text-xs ${hasUp ? 'text-[#2A1115] font-medium' : 'text-gray-500'}`}>Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNum ? <span className="text-emerald-500 text-xs font-bold">✓</span> : <span className="text-gray-400 text-xs font-bold">○</span>}
                      <span className={`text-xs ${hasNum ? 'text-[#2A1115] font-medium' : 'text-gray-500'}`}>Number (0-9)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasSp ? <span className="text-emerald-500 text-xs font-bold">✓</span> : <span className="text-gray-400 text-xs font-bold">○</span>}
                      <span className={`text-xs ${hasSp ? 'text-[#2A1115] font-medium' : 'text-gray-500'}`}>Special char (!@#$%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#2A1115] mb-1.5">
                Confirm Password <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  id="signup-confirmPassword"
                  name="confirmPassword"
                  value={securityInfo.confirmPassword}
                  onChange={e => {
                    setSecurityInfo(p => ({ ...p, confirmPassword: e.target.value }));
                    if (formErrors.confirmPassword) setFormErrors(p => ({ ...p, confirmPassword: '' }));
                  }}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  data-password="true"
                  data-no-copy="true"
                  data-is-password="true"
                  onCopy={(e) => { e.preventDefault(); return false; }}
                  onCut={(e) => { e.preventDefault(); return false; }}
                  onContextMenu={(e) => { e.preventDefault(); return false; }}
                  className={`w-full bg-[#faf6f0] border rounded-full px-4 py-2.5 sm:py-3 text-sm focus:outline-none pr-11 select-none transition-colors ${
                    formErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/20' : 'border-[#d5c9bb] focus:border-[#6B0F1A]'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6B0F1A] text-base">
                  {showConfirmPassword ? '🙈' : '👁'}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold pl-1">
                  <span>⚠️</span> {formErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="mb-5">
              <PolicyAgreement
                id="signup-agreeTerms"
                checked={securityInfo.agreeTerms && policyAccepted}
                initiallyAccepted={policyAccepted}
                disabled={loading}
                error={formErrors.agreeTerms}
                onChange={(v) => {
                  if (v) setPolicyAccepted(true);
                  setSecurityInfo(p => ({ ...p, agreeTerms: v }));
                  if (formErrors.agreeTerms) setFormErrors(p => ({ ...p, agreeTerms: '' }));
                }}
              />
            </div>

            <div className="flex gap-3.5">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 min-h-[46px] touch-manipulation py-3 bg-[#6B0F1A] text-white rounded-full text-sm sm:text-base font-semibold hover:bg-[#540c14] transition flex items-center justify-center cursor-pointer">
                ‹ Back
              </button>
              <button
                type="submit"
                disabled={loading || !securityInfo.agreeTerms || !policyAccepted}
                className="flex-1 min-h-[46px] touch-manipulation py-3 rounded-full text-sm sm:text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed bg-[#6B0F1A] hover:bg-[#540c14] text-white flex items-center justify-center cursor-pointer">
                {loading ? 'Creating...' : 'Create Account ✓'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-5 text-sm text-gray-500 relative z-10">
        Already have an account?{' '}
        <button onClick={() => onSwitchPage('login')} className="text-[#6B0F1A] font-semibold hover:underline">
          Sign In
        </button>
      </p>

    </div>
  );
}

