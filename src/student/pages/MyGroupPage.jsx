import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db, auth, firebaseConfig } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import NotificationBell from '../components/NotificationBell';
import PortalHeader from '../components/PortalHeader';
import { Card, CardBody, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { validateStudentSchoolEmail, verifySchoolEmailOnline } from '../../utils/schoolEmailValidator';
import { authFetch } from '../../utils/authFetch';
import { getBackendUrl } from '../../utils/backendUrl';
import { sendEmailWithFallback } from '../../utils/emailDispatcher';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';

// Helper to generate a compliant, strong temporary password
const generateTemporaryPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  let pwd = 'Arc';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  const all = upper + lower + digits + symbols;
  for (let i = 0; i < 4; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
};

// Helper to build modern, institutional student member account credentials HTML
const buildMemberAccountEmailHTML = ({
  newName,
  leaderTitle,
  leaderEmail,
  groupTitle,
  researchTitle,
  adviserTitle,
  newStudentId,
  newEmail,
  temporaryPassword,
  loginLink
}) => {
  const finalTemporaryPassword = temporaryPassword || generateTemporaryPassword();
  const targetLoginLink = loginLink || `${typeof window !== 'undefined' ? window.location.origin : 'https://archivio-research-system.web.app'}/?loginEmail=${encodeURIComponent(newEmail)}`;

  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #eaeaea;">
    <div style="background: linear-gradient(135deg, #4a1024 0%, #6b1834 100%); padding: 36px 20px; text-align: center;">
      <img src="https://storage.googleapis.com/archivio-research-system.firebasestorage.app/public/swu-logo.png" alt="SWU PHINMA Logo" style="max-height: 70px; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />
      <h1 style="color: #ffffff; margin: 0; font-family: 'Georgia', serif; font-size: 26px; font-weight: 600; letter-spacing: 1px;">ARCHIVIO</h1>
      <p style="color: #f7d2db; margin: 6px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 500;">Student Research Portal</p>
    </div>
    
    <div style="padding: 36px 30px; background-color: #ffffff;">
      <h2 style="color: #4a1024; margin-top: 0; font-size: 22px; font-weight: 700;">Welcome, ${newName}!</h2>
      <p style="color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 20px;">
        Your group leader, <strong>${leaderTitle}</strong>, has created your official member account in the <strong>ARCHIVIO Student Research Portal</strong> for <strong>${groupTitle}</strong>.
      </p>

      <div style="background-color: #faf6f2; border-left: 4px solid #4a1024; border-radius: 4px 8px 8px 4px; padding: 18px 20px; margin: 24px 0;">
        <p style="margin: 0 0 10px 0; color: #4a1024; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">RESEARCH INFORMATION</p>
        <table style="width: 100%; font-size: 14px; color: #4a5568; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; width: 140px; font-weight: 600; color: #718096;">Group:</td>
            <td style="padding: 5px 0; font-weight: 600; color: #2d3748;">${groupTitle}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: 600; color: #718096;">Research Title:</td>
            <td style="padding: 5px 0; color: #2d3748; font-weight: 600;">${researchTitle || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: 600; color: #718096;">Group Leader:</td>
            <td style="padding: 5px 0; color: #2d3748;">${leaderTitle}</td>
          </tr>
          ${adviserTitle ? `<tr><td style="padding: 5px 0; font-weight: 600; color: #718096;">Adviser:</td><td style="padding: 5px 0; color: #2d3748;">${adviserTitle}</td></tr>` : ''}
          ${newStudentId ? `<tr><td style="padding: 5px 0; font-weight: 600; color: #718096;">Student ID:</td><td style="padding: 5px 0; color: #2d3748;">${newStudentId}</td></tr>` : ''}
          <tr>
            <td style="padding: 5px 0; font-weight: 600; color: #718096;">Official Email:</td>
            <td style="padding: 5px 0; color: #2d3748;">${newEmail}</td>
          </tr>
        </table>
      </div>

      <!-- Official Portal Login Credentials Box (Always Included) -->
      <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 22px 24px; margin: 26px 0; box-shadow: 0 4px 12px rgba(22, 101, 52, 0.08);">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 22px; margin-right: 10px; line-height: 1;">🔐</span>
          <strong style="color: #166534; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">Your Portal Login Credentials:</strong>
        </div>
        <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Your account has been created by your group leader. Use your credentials below to log in:
        </p>
        <div style="background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px 18px; margin: 12px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; width: 150px; font-weight: 600; color: #64748b; font-size: 13px;">Login Email:</td>
              <td style="padding: 6px 0;">
                <span style="color: #4a1024; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 700; word-break: break-all;">${newEmail}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0 6px 0; font-weight: 600; color: #64748b; font-size: 13px; border-top: 1px dashed #e2e8f0;">Temporary Password:</td>
              <td style="padding: 10px 0 6px 0; border-top: 1px dashed #e2e8f0;">
                <span style="background-color: #fdf2f4; color: #7a1f3d; padding: 6px 14px; border-radius: 6px; font-weight: 800; border: 1.5px solid #fbcfe8; font-family: 'Courier New', Courier, monospace; font-size: 16px; letter-spacing: 1px; display: inline-block;">${finalTemporaryPassword}</span>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #ecfdf5; border-radius: 6px; padding: 10px 14px; margin-top: 14px; border-left: 3px solid #10b981;">
          <p style="margin: 0; font-size: 12.5px; color: #065f46; line-height: 1.5;">
            💡 <strong>First Login Tip:</strong> Click the button below to log in right away. For your security, you can change your temporary password anytime in <strong>Settings &rarr; Password</strong> after signing in.
          </p>
        </div>
      </div>

      <div style="background-color: #fdfbf7; border: 1px solid #ebdccb; border-radius: 10px; padding: 22px 20px; margin: 24px 0;">
        <p style="margin: 0 0 14px 0; color: #4a1024; font-size: 15px; font-weight: 700;">
          🚀 What You Can Do in Your Student Portal:
        </p>
        
        <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
          <div style="font-size: 16px; margin-right: 10px; line-height: 1.4;">📄</div>
          <div style="font-size: 13.5px; color: #4a5568; line-height: 1.5;">
            <strong style="color: #2d3748;">Submit & Update Manuscripts:</strong> Upload thesis drafts, revisions, and final manuscripts in PDF format anytime.
          </div>
        </div>

        <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
          <div style="font-size: 16px; margin-right: 10px; line-height: 1.4;">📊</div>
          <div style="font-size: 13.5px; color: #4a5568; line-height: 1.5;">
            <strong style="color: #2d3748;">Track Live Research Progress:</strong> See your group's progress from Title Approval, Adviser Review, Similarity Plagiarism Check, Oral Defense, to Dean Publication.
          </div>
        </div>

        <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
          <div style="font-size: 16px; margin-right: 10px; line-height: 1.4;">📋</div>
          <div style="font-size: 13.5px; color: #4a5568; line-height: 1.5;">
            <strong style="color: #2d3748;">Fulfill Requirements:</strong> Upload required documentation including final manuscript and other requirements to help your group complete all steps.
          </div>
        </div>

        <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
          <div style="font-size: 16px; margin-right: 10px; line-height: 1.4;">💬</div>
          <div style="font-size: 13.5px; color: #4a5568; line-height: 1.5;">
            <strong style="color: #2d3748;">Review Adviser Feedback:</strong> View comments, recommendations, and revision notes directly from your assigned research adviser.
          </div>
        </div>

        <div style="display: flex; align-items: flex-start;">
          <div style="font-size: 16px; margin-right: 10px; line-height: 1.4;">👥</div>
          <div style="font-size: 13.5px; color: #4a5568; line-height: 1.5;">
            <strong style="color: #2d3748;">Synchronize with Your Team:</strong> Collaborate with your group leader and fellow researchers under a single unified dashboard.
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 34px 0 26px 0;">
        <a href="${targetLoginLink}" target="_blank" style="background-color: #7a1f3d !important; background: linear-gradient(135deg, #7a1f3d 0%, #9e2752 100%); color: #ffffff !important; padding: 15px 44px; text-decoration: none !important; border-radius: 50px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(122, 31, 61, 0.3); letter-spacing: 0.5px;">
          <span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Login to Student Portal &rarr;</span>
        </a>
      </div>

      <p style="color: #718096; font-size: 13px; margin-top: 30px; margin-bottom: 0; line-height: 1.6; border-top: 1px solid #eaeaea; padding-top: 20px;">
        Best regards,<br>
        <strong>${leaderTitle}</strong> (Group Leader)<br>
        <span style="color: #a0aec0;">ARCHIVIO Research Management System</span>
      </p>
    </div>

    <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
      <p style="margin: 0 0 4px 0;">SWU PHINMA — College of Information Technology</p>
      <p style="margin: 0;">This email was sent to ${newEmail} in compliance with the Data Privacy Act of 2012 (RA 10173).</p>
    </div>
  </div>
`;
};
const buildMemberInviteEmailHTML = buildMemberAccountEmailHTML;

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.06] to-transparent" />
);

// Generate initials from a name string
const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Consistent avatar colors based on name
const AVATAR_COLORS = [
  'bg-[#7B1F35]', 'bg-[#155EEF]', 'bg-[#039855]',
  'bg-[#DC6803]', 'bg-[#7C3AED]', 'bg-[#0891B2]',
];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function MyGroupPage({ onLogout, studentName, initials, groupName: propGroupName, adviserName: propAdviserName, studentUid, activeTab, setActiveTab, profilePhotoUrl, role, leaderUid: propLeaderUid }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [leaderData, setLeaderData] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [invitationsMap, setInvitationsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);

  // Identity and role resolution
  const currentUid = studentUid || auth.currentUser?.uid || studentData?.uid;
  const currentUserEmail = (studentData?.email || auth.currentUser?.email || '').toLowerCase().trim();

  // A student is a member if role prop is 'member', studentData has role === 'member',
  // or if they have a leaderUid distinct from their own UID.
  const isMember = (
    role === 'member' ||
    studentData?.role === 'member' ||
    studentData?.studentRole === 'member' ||
    (studentData?.leaderUid && studentData?.leaderUid !== currentUid) ||
    (propLeaderUid && propLeaderUid !== currentUid)
  );

  const isLeader = !isMember;

  // Real-time listener for current student document
  useEffect(() => {
    const uid = studentUid || auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('uid', '==', uid));
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) { setLoading(false); return; }
      const data = snap.docs[0].data();
      setStudentData({ ...data, docId: snap.docs[0].id });

      const targetLeaderUid = data.leaderUid || propLeaderUid || data.uid;
      const isCurrentAUserMember = (
        role === 'member' ||
        data.role === 'member' ||
        data.studentRole === 'member' ||
        (data.leaderUid && data.leaderUid !== uid) ||
        (propLeaderUid && propLeaderUid !== uid)
      );

      // If user is a member, fetch the leader's student document to get groupMembers & leader info
      let effectiveGroupMembers = data.groupMembers || [];
      if (isCurrentAUserMember && targetLeaderUid && targetLeaderUid !== uid) {
        try {
          const leaderStudentQ = query(studentsRef, where('uid', '==', targetLeaderUid));
          const leaderStudentSnap = await getDocs(leaderStudentQ);
          if (!leaderStudentSnap.empty) {
            const lData = leaderStudentSnap.docs[0].data();
            setLeaderData(lData);
            if (Array.isArray(lData.groupMembers) && lData.groupMembers.length > 0) {
              effectiveGroupMembers = lData.groupMembers;
            }
          } else {
            const directLeaderDoc = await getDoc(doc(db, 'students', targetLeaderUid));
            if (directLeaderDoc.exists()) {
              const lData = directLeaderDoc.data();
              setLeaderData(lData);
              if (Array.isArray(lData.groupMembers) && lData.groupMembers.length > 0) {
                effectiveGroupMembers = lData.groupMembers;
              }
            }
          }
        } catch (e) {
          console.warn('Leader document fetch notice:', e);
        }
      }

      // Fetch Group Document
      if (targetLeaderUid) {
        try {
          const groupQ = query(collection(db, 'groups'), where('leaderUid', '==', targetLeaderUid));
          const groupSnap = await getDocs(groupQ);
          if (!groupSnap.empty) {
            const gData = groupSnap.docs[0].data();
            setGroupData(gData);
            if (effectiveGroupMembers.length === 0 && Array.isArray(gData.members) && gData.members.length > 0) {
              effectiveGroupMembers = gData.members;
            }
          }
        } catch (e) {
          console.warn('Group fetch notice:', e);
        }
      }

      // Fetch profiles of all group member emails
      const rawMemberList = (isCurrentAUserMember && effectiveGroupMembers.length > 0)
        ? effectiveGroupMembers
        : (data.groupMembers || []);
      const memberEmails = rawMemberList.map(m => typeof m === 'object' ? m.email : m).filter(Boolean);
      if (memberEmails.length > 0) {
        try {
          const memberSnap = await getDocs(
            query(studentsRef, where('email', 'in', memberEmails.slice(0, 30)))
          );
          setMemberProfiles(memberSnap.docs.map(d => d.data()));
        } catch (e) {
          console.warn('Member profiles fetch notice:', e);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Student data snapshot error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentUid, role, propLeaderUid]);

  // Real-time listener for leader document when current user is a member
  useEffect(() => {
    const leaderUidToWatch = studentData?.leaderUid || propLeaderUid;
    const currentUid = studentUid || auth.currentUser?.uid || studentData?.uid;
    if (!leaderUidToWatch || leaderUidToWatch === currentUid) return;

    const leaderQ = query(collection(db, 'students'), where('uid', '==', leaderUidToWatch));
    const unsubscribe = onSnapshot(leaderQ, (snap) => {
      if (!snap.empty) {
        const lData = snap.docs[0].data();
        setLeaderData(lData);
        const memberEmails = (lData.groupMembers || []).map(m => typeof m === 'object' ? m.email : m).filter(Boolean);
        if (memberEmails.length > 0) {
          getDocs(query(collection(db, 'students'), where('email', 'in', memberEmails.slice(0, 30))))
            .then(memSnap => setMemberProfiles(memSnap.docs.map(d => d.data())))
            .catch(() => {});
        }
      }
    }, (err) => {
      console.warn('Leader real-time listener notice:', err);
    });

    return () => unsubscribe();
  }, [studentData?.leaderUid, propLeaderUid, studentUid, studentData?.uid]);

  // Real-time listener for studentInvitations to immediately reflect acceptances
  useEffect(() => {
    const leaderUid = studentData?.leaderUid || studentData?.uid || studentUid || auth.currentUser?.uid;
    const leaderEmail = (studentData?.email || auth.currentUser?.email || '').toLowerCase().trim();
    if (!leaderUid && !leaderEmail) return;

    const q = query(collection(db, 'studentInvitations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {};
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const matchesLeader = (leaderUid && (d.leaderUid === leaderUid || d.sentBy === leaderUid)) ||
                              (leaderEmail && (d.invitedByLeader?.toLowerCase() === leaderEmail || d.sentBy === leaderEmail));
        if (d.studentEmail) {
          map[d.studentEmail.toLowerCase()] = { id: docSnap.id, ...d };
        }
      });
      setInvitationsMap(map);
    }, (err) => {
      console.warn('Invitations snapshot notice (targeted fallback):', err);
      if (leaderUid) {
        onSnapshot(query(collection(db, 'studentInvitations'), where('leaderUid', '==', leaderUid)), (snap) => {
          const map = {};
          snap.forEach(docSnap => {
            const d = docSnap.data();
            if (d.studentEmail) map[d.studentEmail.toLowerCase()] = { id: docSnap.id, ...d };
          });
          setInvitationsMap(map);
        });
      }
    });

    return () => unsubscribe();
  }, [studentData?.uid, studentData?.leaderUid, studentData?.email, studentUid]);

  const handleAddMember = async () => {
    if (!isLeader) {
      Swal.fire({
        icon: 'warning',
        title: 'Leader Only',
        text: 'Only the research group leader can create member accounts.',
        confirmButtonColor: '#7B1F35'
      });
      return;
    }
    if (!studentData) return;
    
    const { value: formValues } = await Swal.fire({
      title: 'Create Member Account',
      html: `
        <div class="flex flex-col gap-2.5 text-left text-sm" style="font-family: inherit;">
          <p class="text-xs text-gray-500 mb-1 leading-relaxed">
            Create an official account for your group member so they can share the portal, submit requirements, and track research progress.
          </p>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              First name <span class="text-red-500 font-bold">*</span>
            </label>
            <input id="swal-input-fname" class="swal2-input !m-0 !w-full" placeholder="e.g. Juan" style="width: 100%; box-sizing: border-box; margin: 0; padding: 10px 14px; font-size: 14px; height: 40px; border-radius: 8px; border: 1px solid #d1d5db;">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Middle name <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input id="swal-input-mname" class="swal2-input !m-0 !w-full" placeholder="e.g. Santos" style="width: 100%; box-sizing: border-box; margin: 0; padding: 10px 14px; font-size: 14px; height: 40px; border-radius: 8px; border: 1px solid #d1d5db;">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Last name <span class="text-red-500 font-bold">*</span>
            </label>
            <input id="swal-input-lname" class="swal2-input !m-0 !w-full" placeholder="e.g. Dela Cruz" style="width: 100%; box-sizing: border-box; margin: 0; padding: 10px 14px; font-size: 14px; height: 40px; border-radius: 8px; border: 1px solid #d1d5db;">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Student ID number <span class="text-red-500 font-bold">*</span>
            </label>
            <input id="swal-input-id" class="swal2-input !m-0 !w-full" placeholder="e.g. 03-1234-56789" style="width: 100%; box-sizing: border-box; margin: 0; padding: 10px 14px; font-size: 14px; height: 40px; border-radius: 8px; border: 1px solid #d1d5db;">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Phinmaed email <span class="text-red-500 font-bold">*</span>
            </label>
            <input id="swal-input-email" type="email" class="swal2-input !m-0 !w-full" placeholder="member.swu@phinmaed.com" style="width: 100%; box-sizing: border-box; margin: 0; padding: 10px 14px; font-size: 14px; height: 40px; border-radius: 8px; border: 1px solid #d1d5db;">
          </div>
          <div class="mt-2 pt-2.5 border-t border-gray-200">
            <div class="flex items-start gap-2.5">
              <input id="swal-privacy-checkbox" type="checkbox" style="margin-top: 3px; cursor: pointer; width: 16px; height: 16px; accent-color: #7B1F35; flex-shrink: 0;">
              <label for="swal-privacy-checkbox" class="text-xs text-gray-600 leading-snug cursor-pointer select-none">
                I agree to the <a href="javascript:void(0)" id="swal-privacy-toggle" style="color: #7B1F35; font-weight: 600; text-decoration: underline;">Privacy Policy</a> and authorize creating an account and sending login credentials. <span class="text-red-500 font-bold">*</span>
              </label>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Create account',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6B7280',
      didOpen: () => {
        const toggleBtn = document.getElementById('swal-privacy-toggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            setShowPrivacyPolicyModal(true);
          });
        }
      },
      preConfirm: () => {
        const firstName = document.getElementById('swal-input-fname')?.value.trim();
        const middleName = document.getElementById('swal-input-mname')?.value.trim() || '';
        const lastName = document.getElementById('swal-input-lname')?.value.trim();
        const studentId = document.getElementById('swal-input-id')?.value.trim();
        const email = document.getElementById('swal-input-email')?.value.trim().toLowerCase();
        const privacyChecked = document.getElementById('swal-privacy-checkbox')?.checked;

        if (!firstName) {
          Swal.showValidationMessage('Please enter First name*');
          return false;
        }
        if (!lastName) {
          Swal.showValidationMessage('Please enter Last name*');
          return false;
        }
        if (!studentId) {
          Swal.showValidationMessage('Please enter Student ID number*');
          return false;
        }
        if (!email) {
          Swal.showValidationMessage('Please enter Phinmaed email*');
          return false;
        }
        if (!privacyChecked) {
          Swal.showValidationMessage('Please check and agree to the Privacy Policy to proceed');
          return false;
        }

        const validation = validateStudentSchoolEmail(email);
        if (!validation.isValid) {
          Swal.showValidationMessage(validation.error);
          return false;
        }

        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
        return {
          firstName,
          middleName,
          lastName,
          name: fullName,
          studentId,
          email: validation.normalizedEmail
        };
      }
    });

    if (!formValues) return;
    
    const {
      firstName: newFirstName,
      middleName: newMiddleName,
      lastName: newLastName,
      name: newName,
      studentId: newStudentId,
      email: newEmail
    } = formValues;
    
    // Check if already in group
    const currentMembers = studentData.groupMembers || [];
    const isAlreadyMember = currentMembers.some(m => (typeof m === 'object' ? m.email?.toLowerCase() : m?.toLowerCase()) === newEmail);
    if (isAlreadyMember) {
      Swal.fire('Error', 'This student is already registered in your group.', 'error');
      return;
    }

    try {
      setLoading(true);

      // Verify domain MX records via backend
      const onlineVerification = await verifySchoolEmailOnline(newEmail, 'student');
      if (!onlineVerification.isValid) {
        Swal.fire('Verification Error', onlineVerification.error, 'error');
        setLoading(false);
        return;
      }

      // Generate a strong temporary password for the member
      let temporaryPassword = generateTemporaryPassword();
      let memberUid = null;
      let isExistingAuthUser = false;
      let newGroupMembers = [];

      const leaderUid = auth.currentUser?.uid || studentData.uid;
      const leaderDocId = studentData.docId || leaderUid;
      const groupTitle = propGroupName || groupData?.groupName || groupData?.title || studentData.groupName || 'Research Group';
      const researchTitle = groupData?.researchTitle || studentData.researchTitle || 'Research Archiving System';
      const adviserTitle = propAdviserName || studentData.invitedByName || studentData.adviserName || 'Research Adviser';
      const leaderTitle = (studentData.firstName && studentData.lastName)
        ? `${studentData.firstName} ${studentData.lastName}`
        : (studentData.displayName || studentData.fullName || 'Group Leader');
      const leaderEmail = studentData.email || auth.currentUser?.email || '';
      const baseUrl = window.location.origin || 'https://archivio-research-system.web.app';
      const loginLink = `${baseUrl}/?loginEmail=${encodeURIComponent(newEmail)}`;

      // ── Step 1: Try Admin Provisioning via Backend Endpoint ───────────────
      let backendSuccess = false;
      try {
        const backendUrl = getBackendUrl();
        const apiRes = await fetch(`${backendUrl}/api/create-group-member-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaderUid,
            leaderEmail,
            leaderName: leaderTitle,
            email: newEmail,
            firstName: newFirstName,
            middleName: newMiddleName,
            lastName: newLastName,
            name: newName,
            studentId: newStudentId,
            groupName: groupTitle,
            researchTitle,
            adviserUid: studentData.adviserUid || studentData.invitedBy || '',
            adviserName: adviserTitle,
            department: studentData.department || 'College of Information Technology',
            program: studentData.program || studentData.programs || '',
            temporaryPassword
          })
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.success) {
            backendSuccess = true;
            memberUid = apiData.memberUid;
            if (apiData.temporaryPassword) temporaryPassword = apiData.temporaryPassword;
            if (apiData.isExistingAuthUser !== undefined) isExistingAuthUser = apiData.isExistingAuthUser;
            if (Array.isArray(apiData.groupMembers) && apiData.groupMembers.length > 0) {
              newGroupMembers = apiData.groupMembers;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend provisioning attempt notice, falling back to direct client:', backendErr);
      }

      // ── Step 2: Client Fallback (If Backend is not reachable) ──────────────
      if (!backendSuccess) {
        // Create Firebase Auth user using isolated secondary app instance
        try {
          const appName = 'MemberRegister_' + Date.now().toString();
          const secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = getAuth(secondaryApp);

          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, temporaryPassword);
          memberUid = userCredential.user.uid;

          await secondaryAuth.signOut();
          await deleteApp(secondaryApp);
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            isExistingAuthUser = true;
            // Look up existing UID
            const existingStdSnap = await getDocs(query(collection(db, 'students'), where('email', '==', newEmail)));
            if (!existingStdSnap.empty) {
              memberUid = existingStdSnap.docs[0].id || existingStdSnap.docs[0].data().uid;
            } else {
              const existingUserSnap = await getDocs(query(collection(db, 'users'), where('email', '==', newEmail)));
              if (!existingUserSnap.empty) {
                memberUid = existingUserSnap.docs[0].id || existingUserSnap.docs[0].data().uid;
              }
            }
          } else {
            throw authErr;
          }
        }

        const targetMemberDocId = memberUid || ('member_' + Date.now());

        // 1. Create member student document in Firestore
        const memberDocData = {
          uid: targetMemberDocId,
          email: newEmail,
          firstName: newFirstName,
          middleName: newMiddleName,
          lastName: newLastName,
          displayName: newName,
          studentId: newStudentId,
          studentNumber: newStudentId,
          role: 'member',
          leaderUid: leaderUid,
          leaderEmail: leaderEmail,
          leaderName: leaderTitle,
          groupName: groupTitle,
          researchTitle: researchTitle,
          adviserUid: studentData.adviserUid || studentData.invitedBy || '',
          invitedBy: studentData.invitedBy || '',
          invitedByName: adviserTitle,
          adviserName: adviserTitle,
          department: studentData.department || 'College of Information Technology',
          program: studentData.program || studentData.programs || '',
          temporaryPassword: temporaryPassword,
          mustChangePassword: true,
          groupStatus: 'approved',
          accountStatus: 'active',
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: leaderUid
        };
        await setDoc(doc(db, 'students', targetMemberDocId), memberDocData, { merge: true });

        // 2. Create/update users document for presence & chat
        try {
          await setDoc(doc(db, 'users', targetMemberDocId), {
            uid: targetMemberDocId,
            email: newEmail,
            displayName: newName,
            role: 'student',
            studentRole: 'member',
            leaderUid: leaderUid,
            groupName: groupTitle,
            department: studentData.department || 'College of Information Technology',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (usersErr) {
          console.warn('Notice saving member users presence doc:', usersErr);
        }

        // 3. Update the leader's student document with member details
        const newMemberObj = {
          uid: targetMemberDocId,
          email: newEmail,
          name: newName,
          firstName: newFirstName,
          middleName: newMiddleName,
          lastName: newLastName,
          studentId: newStudentId,
          role: 'member',
          status: 'active',
          temporaryPassword: temporaryPassword,
          accountCreated: true
        };

        newGroupMembers = [
          ...currentMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() : m?.toLowerCase()) !== newEmail),
          newMemberObj
        ];
        await updateDoc(doc(db, 'students', leaderDocId), {
          groupMembers: newGroupMembers
        });

        // 4. Update the group's document
        try {
          const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', leaderUid)));
          if (!groupSnap.empty) {
            const groupId = groupSnap.docs[0].id;
            const groupDataSnap = groupSnap.docs[0].data();
            const existingGroupMembers = groupDataSnap.members || [];
            const updatedGroupMembers = [
              ...existingGroupMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() : m?.toLowerCase()) !== newEmail),
              {
                uid: targetMemberDocId,
                email: newEmail,
                name: newName,
                studentId: newStudentId,
                role: 'member',
                status: 'active'
              }
            ];
            await updateDoc(doc(db, 'groups', groupId), {
              members: updatedGroupMembers,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (groupDocErr) {
          console.warn('Notice updating groups document:', groupDocErr);
        }

        // 5. Clean up stale invitations and record active account creation
        try {
          const invQ = query(collection(db, 'studentInvitations'), where('studentEmail', '==', newEmail));
          const invSnap = await getDocs(invQ);
          for (const invDoc of invSnap.docs) {
            await deleteDoc(doc(db, 'studentInvitations', invDoc.id)).catch(() => {});
          }
          await addDoc(collection(db, 'studentInvitations'), {
            studentEmail: newEmail,
            firstName: newFirstName,
            middleName: newMiddleName,
            lastName: newLastName,
            name: newName,
            sentBy: leaderUid,
            leaderUid: leaderUid,
            invitedByLeader: studentData.email || auth.currentUser?.email || '',
            adviserEmail: studentData.invitedBy || '',
            adviserName: adviserTitle,
            department: studentData.department || 'College of Information Technology',
            status: 'accepted',
            accepted: true,
            accountCreated: true,
            temporaryPassword: temporaryPassword,
            createdAt: new Date().toISOString(),
            studentNumber: newStudentId
          });
        } catch (invErr) {
          console.warn('Notice updating studentInvitations record:', invErr);
        }
      }

      if (newGroupMembers.length === 0) {
        newGroupMembers = [
          ...currentMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() : m?.toLowerCase()) !== newEmail),
          {
            uid: memberUid,
            email: newEmail,
            name: newName,
            studentId: newStudentId,
            role: 'member',
            status: 'active',
            temporaryPassword: temporaryPassword,
            accountCreated: true
          }
        ];
      }

      // 6. Send credentials email with temporary password and portal link
      const emailHTML = buildMemberAccountEmailHTML({
        newName,
        leaderTitle,
        leaderEmail,
        groupTitle,
        researchTitle,
        adviserTitle,
        newStudentId,
        newEmail,
        temporaryPassword: temporaryPassword,
        loginLink
      });

      await sendEmailWithFallback({
        to: newEmail,
        subject: `Your ARCHIVIO Student Research Portal Credentials (${groupTitle})`,
        html: emailHTML,
        backendEndpoint: '/api/send-group-member-added-email',
        backendPayload: {
          to: newEmail,
          memberName: newName,
          firstName: newFirstName,
          middleName: newMiddleName,
          lastName: newLastName,
          studentId: newStudentId,
          leaderName: leaderTitle,
          leaderEmail: leaderEmail,
          groupName: groupTitle,
          researchTitle: researchTitle,
          adviserName: adviserTitle,
          department: studentData.department || 'College of Information Technology',
          temporaryPassword: temporaryPassword,
          loginLink
        }
      });

      // Refresh the page data locally
      const memberSnap = await getDocs(
        query(collection(db, 'students'), where('email', 'in', newGroupMembers.map(m => typeof m === 'object' ? m.email : m)))
      );
      setMemberProfiles(memberSnap.docs.map(d => d.data()));
      setStudentData(prev => ({ ...prev, groupMembers: newGroupMembers }));
      
      Swal.fire({
        icon: 'success',
        title: 'Member Account Created!',
        html: `
          <div style="font-family: inherit; text-align: left; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
            <p style="margin-bottom: 10px;">
              An official member account has been created for <strong>${newName}</strong> (<code>${newEmail}</code>).
            </p>
            <p style="font-size: 12.5px; color: #64748b; margin: 0;">
              Login credentials and portal instructions have been sent directly to their official email. They can sign in immediately and update their password in <strong>Settings &rarr; Password</strong>.
            </p>
          </div>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Great, thanks!'
      });
    } catch (err) {
      console.error('Error creating member account:', err);
      Swal.fire('Error', err.message || 'Failed to create member account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!isLeader) return;
    const memberEmail = (member.email || '').toLowerCase().trim();
    const memberName = (member.name || '').trim();
    if (!memberEmail && !memberName) return;

    const result = await Swal.fire({
      title: 'Remove Member?',
      text: `Are you sure you want to remove ${member.name || memberEmail} from your group?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const isTarget = (m) => {
          if (memberEmail) {
            const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase()?.trim();
            if (mEmail && mEmail === memberEmail) return true;
          }
          if (memberName) {
            const mName = (typeof m === 'object' ? m.name : m)?.trim();
            if (mName && mName.toLowerCase() === memberName.toLowerCase()) return true;
          }
          return false;
        };

        // 1. Update leader's student document groupMembers
        const currentGroupMembers = studentData.groupMembers || [];
        const updatedGroupMembers = currentGroupMembers.filter(m => !isTarget(m));
        await updateDoc(doc(db, 'students', studentData.uid), {
          groupMembers: updatedGroupMembers
        });

        // 2. Update group document members
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', studentData.uid)));
        if (!groupSnap.empty) {
          const groupId = groupSnap.docs[0].id;
          const groupData = groupSnap.docs[0].data();
          const existingMembers = groupData.members || [];
          const updatedMembers = existingMembers.filter(m => !isTarget(m));
          await updateDoc(doc(db, 'groups', groupId), {
            members: updatedMembers,
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Wipe orphaned data for this member if email is present
        if (memberEmail) {
          await wipeEmailData(memberEmail);
        }

        setStudentData(prev => ({ ...prev, groupMembers: updatedGroupMembers }));
        Swal.fire('Removed!', `${member.name || memberEmail} has been removed from the group.`, 'success');
      } catch (err) {
        console.error('Error removing member:', err);
        Swal.fire('Error', 'Failed to remove member. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Manually Mark Member as Accepted ────────────────────────────────────────
  const handleMarkAccepted = async (member) => {
    if (!isLeader) return;
    const memEmail = (member.email || '').toLowerCase().trim();
    if (!memEmail) return;

    const result = await Swal.fire({
      title: 'Mark as Accepted?',
      text: `Confirm that ${member.name || memEmail} has accepted the invitation to join your research group?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Mark Accepted'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        // 1. Backend call
        try {
          const backendUrl = getBackendUrl();
          await fetch(`${backendUrl}/api/accept-student-invitation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: memEmail })
          });
        } catch (e) {
          console.warn('Backend call notice:', e);
        }

        // 2. Direct Firestore update for studentInvitations
        const invQ = query(collection(db, 'studentInvitations'), where('studentEmail', '==', memEmail));
        const invSnap = await getDocs(invQ);
        for (const docSnap of invSnap.docs) {
          await updateDoc(doc(db, 'studentInvitations', docSnap.id), {
            status: 'accepted',
            accepted: true,
            acceptedAt: new Date().toISOString()
          }).catch(() => {});
        }

        // 3. Update leader's groupMembers in students collection
        const currentGroupMembers = studentData?.groupMembers || [];
        const updatedGroupMembers = currentGroupMembers.map(m => {
          const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase().trim();
          if (mEmail === memEmail) {
            return typeof m === 'object'
              ? { ...m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() }
              : { email: m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() };
          }
          return m;
        });

        if (studentData?.uid) {
          await updateDoc(doc(db, 'students', studentData.uid), {
            groupMembers: updatedGroupMembers
          }).catch(() => {});
        }

        // 4. Update groups collection
        const groupQ = query(collection(db, 'groups'), where('leaderUid', '==', studentData?.uid));
        const groupSnap = await getDocs(groupQ);
        if (!groupSnap.empty) {
          const groupId = groupSnap.docs[0].id;
          const existingMembers = groupSnap.docs[0].data().members || [];
          const updatedMembers = existingMembers.map(m => {
            const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase().trim();
            if (mEmail === memEmail) {
              return typeof m === 'object'
                ? { ...m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() }
                : { email: m, status: 'accepted', accepted: true, isAccepted: true, acceptedAt: new Date().toISOString() };
            }
            return m;
          });
          await updateDoc(doc(db, 'groups', groupId), {
            members: updatedMembers,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }

        // 5. Update local state
        setStudentData(prev => ({ ...prev, groupMembers: updatedGroupMembers }));
        setInvitationsMap(prev => ({
          ...prev,
          [memEmail]: { ...(prev[memEmail] || {}), status: 'accepted', accepted: true }
        }));

        Swal.fire({
          icon: 'success',
          title: 'Member Accepted!',
          text: `${member.name || memEmail} is now marked as an active accepted member.`,
          confirmButtonColor: '#059669'
        });
      } catch (err) {
        console.error('Error marking member as accepted:', err);
        Swal.fire('Error', err.message || 'Failed to update member status.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Resend Member Login Credentials Email ──────────────────────────────────
  const handleResendCredentials = async (member) => {
    if (!isLeader) return;
    if (!member || !member.email) return;

    try {
      Swal.fire({
        title: 'Sending Credentials...',
        text: `Sending portal credentials to ${member.email}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const memberName = member.name || member.email.split('@')[0];
      const leaderTitle = (studentData?.firstName && studentData?.lastName)
        ? `${studentData.firstName} ${studentData.lastName}`
        : (studentData?.displayName || studentData?.fullName || 'Group Leader');
      const leaderEmail = studentData?.email || auth.currentUser?.email || '';
      const groupTitle = propGroupName || groupData?.groupName || groupData?.title || studentData?.groupName || 'SWU 001';
      const researchTitle = groupData?.researchTitle || studentData?.researchTitle || 'Research Archiving System';
      const adviserTitle = propAdviserName || studentData?.invitedByName || studentData?.adviserName || 'Jerika Zamoras';
      const baseUrl = window.location.origin || 'https://archivio-research-system.web.app';
      const loginLink = `${baseUrl}/?loginEmail=${encodeURIComponent(member.email)}`;

      // Locate temporary password if available, or generate and sync fresh credentials
      let tempPass = member.temporaryPassword;
      if (!tempPass) {
        const gm = (studentData?.groupMembers || []).find(m => 
          (typeof m === 'object' ? m.email : m)?.toLowerCase() === member.email.toLowerCase()
        );
        if (gm && typeof gm === 'object' && gm.temporaryPassword) {
          tempPass = gm.temporaryPassword;
        }
      }
      if (!tempPass && member.uid) {
        const studentDocSnap = await getDoc(doc(db, 'students', member.uid)).catch(() => null);
        if (studentDocSnap?.exists()) {
          tempPass = studentDocSnap.data()?.temporaryPassword;
        }
      }
      if (!tempPass) {
        tempPass = generateTemporaryPassword();
        try {
          const backendUrl = getBackendUrl();
          await fetch(`${backendUrl}/api/create-group-member-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leaderUid: auth.currentUser?.uid || studentData.uid,
              leaderEmail,
              leaderName: leaderTitle,
              email: member.email,
              name: memberName,
              studentId: member.studentId || '',
              groupName: groupTitle,
              researchTitle,
              adviserName: adviserTitle,
              department: studentData?.department || 'College of Information Technology',
              temporaryPassword: tempPass
            })
          });
        } catch (syncErr) {
          console.warn('Notice syncing resend password with backend:', syncErr);
        }
      }

      const emailHTML = buildMemberAccountEmailHTML({
        newName: memberName,
        leaderTitle,
        leaderEmail,
        groupTitle,
        researchTitle,
        adviserTitle,
        newStudentId: member.studentId || '',
        newEmail: member.email,
        temporaryPassword: tempPass,
        loginLink
      });

      const res = await sendEmailWithFallback({
        to: member.email,
        subject: `Your ARCHIVIO Student Research Portal Credentials (${groupTitle})`,
        html: emailHTML,
        backendEndpoint: '/api/send-group-member-added-email',
        backendPayload: {
          to: member.email,
          memberName: memberName,
          studentId: member.studentId || '',
          leaderName: leaderTitle,
          leaderEmail: leaderEmail,
          groupName: groupTitle,
          researchTitle: researchTitle,
          adviserName: adviserTitle,
          department: studentData?.department || 'College of Information Technology',
          temporaryPassword: tempPass,
          loginLink
        }
      });

      Swal.close();

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Credentials Sent!',
          html: `
            <div style="font-family: inherit; text-align: left; font-size: 13.5px; color: #4a5568; line-height: 1.6;">
              <p style="margin: 0;">Portal access details and secure login instructions have been emailed directly to <strong>${member.email}</strong>.</p>
            </div>
          `,
          confirmButtonColor: '#10b981'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send',
          text: 'Could not deliver the credentials email. Please verify internet connection and try again.',
          confirmButtonColor: '#7B1F35'
        });
      }
    } catch (err) {
      console.error('Error resending credentials:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send credentials email: ' + err.message,
        confirmButtonColor: '#7B1F35'
      });
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const effectiveLeaderName = isLeader
    ? ((studentData?.firstName && studentData?.lastName)
        ? `${studentData.firstName} ${studentData.lastName}`
        : (studentData?.displayName || studentName || 'Andrea Perote'))
    : ((leaderData?.firstName && leaderData?.lastName)
        ? `${leaderData.firstName} ${leaderData.lastName}`
        : (leaderData?.displayName || studentData?.leaderName || groupData?.leaderName || 'Group Leader'));

  const effectiveLeaderEmail = isLeader
    ? (studentData?.email || auth.currentUser?.email || '')
    : (leaderData?.email || studentData?.leaderEmail || groupData?.leaderEmail || '');

  const effectiveLeaderStudentId = isLeader
    ? (studentData?.studentNumber || studentData?.studentId || '—')
    : (leaderData?.studentNumber || leaderData?.studentId || '—');

  const displayName   = isLeader
    ? effectiveLeaderName
    : (studentData?.displayName ||
       (studentData?.firstName ? `${studentData.firstName} ${studentData.lastName || ''}`.trim() : null) ||
       studentName ||
       'Student');

  const groupTitle    = groupData?.groupName || groupData?.title || leaderData?.groupName || studentData?.groupName || propGroupName || 'SWU 001';
  const researchTitle = groupData?.researchTitle || leaderData?.researchTitle || studentData?.researchTitle || 'Research Archiving System';
  const adviserName   = groupData?.adviserName || leaderData?.invitedByName || studentData?.invitedByName || propAdviserName || 'Jerika Zamoras';
  const course        = (isLeader ? studentData?.course : (leaderData?.course || studentData?.course)) || '';
  const department    = (isLeader ? studentData?.department : (leaderData?.department || studentData?.department)) || '';

  // Build the full team list: leader first, then registered members
  const leaderCard = {
    name:     effectiveLeaderName,
    role:     'Group Leader',
    email:    effectiveLeaderEmail,
    studentId: effectiveLeaderStudentId,
    isYou:    isLeader,
    initials: getInitials(effectiveLeaderName),
    color:    'bg-[#7B1F35]',
    cardBg:   'bg-stone-50 dark:bg-stone-800/50',
    cardBorder: 'border-stone-200/80 dark:border-stone-700',
  };

  // Helper to check if a member has accepted their invitation
  const checkIsAccepted = (email, mObj) => {
    const lowerEmail = (email || '').toLowerCase().trim();
    if (!lowerEmail) return false;
    if (mObj && (mObj.status === 'accepted' || mObj.accepted === true || mObj.isAccepted === true)) return true;
    const inv = invitationsMap[lowerEmail];
    if (inv && (inv.status === 'accepted' || inv.accepted === true)) return true;
    return false;
  };

  const effectiveGroupMembersList = isLeader
    ? (studentData?.groupMembers || [])
    : (leaderData?.groupMembers || studentData?.groupMembers || groupData?.members || []);

  // Map emails to the names provided by the leader during group creation
  const groupMemberNames = {};
  effectiveGroupMembersList.forEach(m => {
    if (typeof m === 'object' && m) {
      groupMemberNames[(m.email || '').toLowerCase()] = m.name || [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ') || m.email?.split('@')[0];
    } else if (typeof m === 'string') {
      groupMemberNames[m.toLowerCase()] = m.split('@')[0];
    }
  });

  // Members from Firestore (registered students)
  const registeredEmails = new Set(memberProfiles.map(m => m.email?.toLowerCase()).filter(Boolean));
  if (!isLeader && currentUserEmail) {
    registeredEmails.add(currentUserEmail);
  }

  const registeredMemberCards = memberProfiles
    .filter(m => (m.email?.toLowerCase() !== effectiveLeaderEmail.toLowerCase())) // Avoid duplicating leader in members list
    .map((m, idx) => {
      const mEmail = (m.email || '').toLowerCase();
      const assignedName = groupMemberNames[mEmail] || m.displayName || [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ') || m.email?.split('@')[0];
      const tempPass = m.temporaryPassword || effectiveGroupMembersList.find(gm => (typeof gm === 'object' ? gm.email : gm)?.toLowerCase() === mEmail)?.temporaryPassword;
      const isThisCardYou = !isLeader && (
        (m.uid && m.uid === currentUid) ||
        (mEmail && mEmail === currentUserEmail)
      );

      return {
        name:      assignedName,
        role:      'Member',
        email:     m.email,
        studentId: m.studentNumber || m.studentId || '—',
        isYou:     isThisCardYou,
        initials:  getInitials(assignedName),
        color:     AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length],
        cardBg:    'bg-white dark:bg-stone-900',
        cardBorder: 'border-stone-200/80 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600',
        isAccepted: true,
        pending:   false,
        temporaryPassword: tempPass || null,
        mustChangePassword: m.mustChangePassword || false,
        uid:       m.uid || m.id
      };
    });

  // Members added by the leader who don't have a separate student record yet in memberProfiles
  const otherMembers = effectiveGroupMembersList
    .map(m => (typeof m === 'object' ? m : { email: m.includes('@') ? m : '', name: m.includes('@') ? m.split('@')[0] : m }))
    .filter(m => {
      const mEmail = (m.email || '').toLowerCase();
      if (!mEmail) return true;
      if (mEmail === effectiveLeaderEmail.toLowerCase()) return false;
      return !registeredEmails.has(mEmail);
    });
    
  const otherMemberCards = otherMembers.map((m, idx) => {
    const memEmail = m.email?.toLowerCase() || '';
    const isAccepted = memEmail ? checkIsAccepted(memEmail, m) : true;
    const memName = m.name || [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ') || (m.email?.includes('@') ? m.email.split('@')[0] : m.email) || `Member ${idx + 2}`;
    const tempPass = m.temporaryPassword || null;
    const isThisCardYou = !isLeader && (
      (m.uid && m.uid === currentUid) ||
      (memEmail && memEmail === currentUserEmail)
    );

    return {
      name:       memName,
      role:       'Member',
      email:      m.email || '',
      studentId:  m.studentId || m.studentNumber || '—',
      isYou:      isThisCardYou,
      initials:   getInitials(memName),
      color:      isAccepted ? AVATAR_COLORS[(idx + 2) % AVATAR_COLORS.length] : 'bg-stone-400',
      cardBg:     isAccepted ? 'bg-white dark:bg-stone-900' : 'bg-stone-50 dark:bg-stone-800/50',
      cardBorder: isAccepted ? 'border-stone-200/80 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600' : 'border-stone-200 dark:border-stone-700',
      pending:    !isAccepted,
      isAccepted: isAccepted,
      temporaryPassword: tempPass,
      mustChangePassword: m.mustChangePassword || false,
      uid:        m.uid || null
    };
  });

  // Fallback card for current member if not yet returned in member queries
  const hasMemberCardForCurrent = registeredMemberCards.some(c => c.isYou) || otherMemberCards.some(c => c.isYou);
  const fallbackCurrentMemberCard = (!isLeader && !hasMemberCardForCurrent && studentData) ? [{
    name: (studentData.firstName && studentData.lastName)
      ? `${studentData.firstName} ${studentData.lastName}`
      : (studentData.displayName || studentName || 'Member'),
    role: 'Member',
    email: studentData.email || auth.currentUser?.email || '',
    studentId: studentData.studentNumber || studentData.studentId || '—',
    isYou: true,
    initials: getInitials(studentData.displayName || studentName || 'Member'),
    color: AVATAR_COLORS[1],
    cardBg: 'bg-white dark:bg-stone-900',
    cardBorder: 'border-stone-200/80 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600',
    isAccepted: true,
    pending: false,
    temporaryPassword: studentData.temporaryPassword || null,
    mustChangePassword: studentData.mustChangePassword || false,
    uid: currentUid
  }] : [];

  const allMembers = [leaderCard, ...registeredMemberCards, ...otherMemberCards, ...fallbackCurrentMemberCard];
  const totalCount = allMembers.length;

  // Adviser initials
  const adviserInitials = getInitials(adviserName);

  // Skeleton card
  const SkeletonCard = () => (
    <div className="relative overflow-hidden bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-6 flex items-start gap-4">
      <Shimmer />
      <div className="w-14 h-14 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0 relative z-10" />
      <div className="flex-1 space-y-2 mt-1 relative z-10">
        <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-40" />
        <div className="h-3 bg-stone-100 dark:bg-stone-800/50 rounded w-24" />
        <div className="h-3 bg-stone-100 dark:bg-stone-800/50 rounded w-36 mt-3" />
      </div>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-[#f5f0e6] dark:bg-stone-950 font-sans overflow-hidden transition-colors">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={activeTab || 'My Group'}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        studentName={displayName}
        initials={initials || getInitials(displayName)}
        profilePhotoUrl={profilePhotoUrl} role={role}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <PortalHeader 
          title="My Group" 
          initials={initials || getInitials(displayName)} 
          setSidebarOpen={setSidebarOpen} 
          setActiveTab={setActiveTab}
          profilePhotoUrl={profilePhotoUrl} 
          role={role}
          studentName={displayName || studentName}
          onLogout={onLogout}
        />

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

            <div>
              <h2 className="text-[24px] sm:text-[28px] font-bold text-[#1A1A1A] dark:text-stone-100 font-serif tracking-tight mb-1">My Research Group</h2>
              <p className="text-[13px] sm:text-[14px] text-gray-500 dark:text-stone-400 font-medium">Your team members and group information</p>
            </div>

            {/* ── GROUP BANNER ────────────────────────────────────────── */}
            {loading ? (
              <div className="w-full bg-[#7B1F35]/10 dark:bg-stone-800 rounded-[24px] h-[180px] relative overflow-hidden">
                <Shimmer />
              </div>
            ) : (
              <div className="w-full bg-gradient-to-br from-[#7B1F35] to-[#5a1831] rounded-[24px] p-5 sm:p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-[#7B1F35]/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-[40%] bg-white/5 rounded-l-[100px] pointer-events-none" />

                <div className="relative z-10 text-white flex flex-col gap-3 sm:gap-4 max-w-full">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Group Name</span>
                    <h2 className="text-[22px] sm:text-[28px] lg:text-[32px] font-serif font-bold mt-1 break-words">{groupTitle}</h2>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Research Title</span>
                    <p className="text-[15px] sm:text-[17px] font-semibold mt-1 break-words">{researchTitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                    <span className="bg-white/10 border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium">
                      👥 {totalCount} {totalCount === 1 ? 'member' : 'members'}
                    </span>
                    {course && (
                      <span className="bg-white/10 border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium">
                        🎓 {course}
                      </span>
                    )}
                    {department && (
                      <span className="bg-white/10 border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium">
                        🏢 {department}
                      </span>
                    )}
                    <span className="bg-white/10 border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium">
                      📅 S.Y. 2026–2027
                    </span>
                  </div>
                </div>

                {/* Adviser Box */}
                <div className="relative z-10 w-full md:w-auto min-w-0 md:min-w-[240px] mt-2 md:mt-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5">
                  <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase block mb-2 sm:mb-3">Your Adviser</span>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-stone-900 text-[#7B1F35] dark:text-[#D05353] flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-sm">
                      {adviserInitials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-[14px] sm:text-[15px] truncate">{adviserName}</h4>
                      <p className="text-white/70 text-[12px] mt-0.5">Research Adviser</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM MEMBERS SECTION ────────────────────────────────── */}
            <Card hover className="mt-2">
              <CardBody className="p-5 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-[20px] sm:text-[22px] font-serif font-bold text-[#1A1A1A] dark:text-stone-100 mb-1">Team Members</h3>
                    <p className="text-[13px] sm:text-[14px] text-gray-500 dark:text-stone-400">
                      {loading ? 'Loading members…' : `${totalCount} ${totalCount === 1 ? 'member' : 'members'} in this research group`}
                    </p>
                  </div>
                  
                  {isLeader && (
                    <PremiumButton variant="success" onClick={handleAddMember} className="w-full sm:w-auto min-h-[44px] touch-manipulation justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Create Member Account
                    </PremiumButton>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {loading ? (
                  <>
                    <SkeletonCard /><SkeletonCard />
                    <SkeletonCard /><SkeletonCard />
                  </>
                ) : (
                  allMembers.map((member, idx) => (
                    <Card
                      hover
                      key={idx}
                      className="flex items-start gap-3.5 sm:gap-4 p-4 sm:p-6"
                      glass={!member.isYou && member.pending}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${member.color} text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-sm`}>
                        {member.initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h4 className="text-[15px] sm:text-[16px] font-bold text-[#1A1A1A] dark:text-stone-100 truncate">{member.name}</h4>
                            {member.isYou && (
                              <span className="bg-[#7B1F35] dark:bg-[#7B1F35] text-white dark:text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0">YOU</span>
                            )}
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                              member.isYou
                                ? 'bg-[#7B1F35]/10 text-[#7B1F35] dark:text-[#D05353]'
                                : member.temporaryPassword
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                            }`}>
                              {member.isYou ? member.role : member.temporaryPassword ? 'Member (Temp Pass)' : (member.role || 'Member')}
                            </span>
                          </div>

                          {isLeader && member.role !== 'Group Leader' && (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className="min-h-[36px] px-2.5 py-1 bg-stone-100 hover:bg-red-50 dark:bg-stone-800 dark:hover:bg-red-950/40 text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 text-xs rounded-lg transition-colors flex items-center gap-1.5 touch-manipulation cursor-pointer shrink-0"
                              title="Remove member and revoke portal access"
                            >
                              <span>🗑️</span>
                              <span className="text-[11px] font-semibold">Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="text-[12px] sm:text-[13px] text-gray-500 dark:text-stone-400 flex flex-col gap-1.5 mt-2.5 sm:mt-3 font-medium">
                          {member.studentId && member.studentId !== '—' && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 dark:text-stone-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5" />
                              </svg>
                              <span className="truncate">{member.studentId}</span>
                            </div>
                          )}
                          {member.email ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 text-gray-400 dark:text-stone-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{member.email}</span>
                            </div>
                          ) : null}

                          {member.role !== 'Group Leader' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-800">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {member.temporaryPassword ? (
                                  <>
                                    <span className="text-[12px] shrink-0">🔐</span>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold truncate" title="Temporary password active. Member can sign in and change password anytime.">
                                      Temporary Password Active
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[12px] shrink-0">✅</span>
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                                      Active Portal Access
                                    </p>
                                  </>
                                )}
                              </div>
                              {isLeader && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {member.pending && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAccepted(member)}
                                      className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 touch-manipulation cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                                      title="Manually verify and mark this member as accepted"
                                    >
                                      ✓ Verify
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleResendCredentials(member)}
                                    className="text-[11px] font-bold text-[#7B1F35] dark:text-[#D05353] hover:underline flex items-center gap-1.5 touch-manipulation cursor-pointer bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded border border-stone-200 dark:border-stone-700 hover:bg-[#7B1F35]/5"
                                    title="Resend portal login credentials to this member's inbox"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Resend Credentials
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          </div>
        </div>
      </div>

      {/* Official Standalone Data Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        mode="privacy"
        onClose={() => setShowPrivacyPolicyModal(false)}
        onAccept={() => {
          setShowPrivacyPolicyModal(false);
          const cb = document.getElementById('swal-privacy-checkbox');
          if (cb) cb.checked = true;
        }}
      />
    </div>
  );
}
