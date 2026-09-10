import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import NotificationBell from '../components/NotificationBell';
import PortalHeader from '../components/PortalHeader';
import { Card, CardBody, PremiumButton } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { wipeEmailData } from '../../firebase/wipeEmailData';
import { validateStudentSchoolEmail, verifySchoolEmailOnline } from '../../utils/schoolEmailValidator';

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

export default function MyGroupPage({ onLogout, studentName, initials, groupName: propGroupName, adviserName: propAdviserName, studentUid, activeTab, setActiveTab, profilePhotoUrl, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupData = async () => {
      setLoading(true);
      try {
        // Get the current student's Firestore document
        const uid = studentUid || auth.currentUser?.uid;
        if (!uid) { setLoading(false); return; }

        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('uid', '==', uid));
        const snap = await getDocs(q);

        if (snap.empty) { setLoading(false); return; }

        const data = snap.docs[0].data();
        setStudentData(data);

        // Fetch Group Document
        const targetLeaderUid = data.leaderUid || data.uid;
        if (targetLeaderUid) {
          const groupQ = query(collection(db, 'groups'), where('leaderUid', '==', targetLeaderUid));
          const groupSnap = await getDocs(groupQ);
          if (!groupSnap.empty) {
            setGroupData(groupSnap.docs[0].data());
          }
        }

        // Fetch profiles of all group member emails listed during signup
        const memberEmails = (data.groupMembers || []).map(m => typeof m === 'object' ? m.email : m);
        if (memberEmails.length > 0) {
          const memberSnap = await getDocs(
            query(studentsRef, where('email', 'in', memberEmails))
          );
          setMemberProfiles(memberSnap.docs.map(d => d.data()));
        }
      } catch (err) {
        console.error('Error fetching group data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [studentUid]);

  const handleAddMember = async () => {
    if (!studentData) return;
    
    const { value: formValues } = await Swal.fire({
      title: 'Add Team Member',
      html:
        '<div class="flex flex-col gap-3 text-left">' +
        '  <label class="text-xs font-semibold text-gray-700">Full Name</label>' +
        '  <input id="swal-input-name" class="swal2-input !m-0 !w-full" placeholder="e.g. Juan Dela Cruz" style="width: 100%; box-sizing: border-box; margin: 0;">' +
        '  <label class="text-xs font-semibold text-gray-700 mt-2">Student ID Number</label>' +
        '  <input id="swal-input-id" class="swal2-input !m-0 !w-full" placeholder="e.g. 03-1234-56789" style="width: 100%; box-sizing: border-box; margin: 0;">' +
        '  <label class="text-xs font-semibold text-gray-700 mt-2">Official Student Email (.swu@phinmaed.com)</label>' +
        '  <input id="swal-input-email" type="email" class="swal2-input !m-0 !w-full" placeholder="member.swu@phinmaed.com" style="width: 100%; box-sizing: border-box; margin: 0;">' +
        '</div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      confirmButtonText: 'Add Member',
      preConfirm: () => {
        const name = document.getElementById('swal-input-name').value.trim();
        const studentId = document.getElementById('swal-input-id').value.trim();
        const email = document.getElementById('swal-input-email').value.trim().toLowerCase();
        if (!name || !email || !studentId) {
          Swal.showValidationMessage('Please provide name, ID number, and email');
          return false;
        }
        const validation = validateStudentSchoolEmail(email);
        if (!validation.isValid) {
          Swal.showValidationMessage(validation.error);
          return false;
        }
        return { name, studentId, email: validation.normalizedEmail };
      }
    });

    if (!formValues) return;
    
    const { name: newName, studentId: newStudentId, email: newEmail } = formValues;
    
    // Check if already in group
    const currentMembers = studentData.groupMembers || [];
    const isAlreadyMember = currentMembers.some(m => (typeof m === 'object' ? m.email : m) === newEmail);
    if (isAlreadyMember) {
      Swal.fire('Error', 'This student is already in the group.', 'error');
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
      
      // Update the leader's student document
      const newGroupMembers = [...currentMembers, { email: newEmail, name: newName, studentId: newStudentId }];
      await updateDoc(doc(db, 'students', studentData.uid), {
        groupMembers: newGroupMembers
      });

      // Update the group's document
      const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', studentData.uid)));
      if (!groupSnap.empty) {
        const groupId = groupSnap.docs[0].id;
        const groupData = groupSnap.docs[0].data();
        const existingGroupMembers = groupData.members || [];
        await updateDoc(doc(db, 'groups', groupId), {
          members: [...existingGroupMembers, { email: newEmail, name: newName, studentId: newStudentId }],
          updatedAt: new Date().toISOString()
        });
      }

      // Clean up any stale or orphaned invitations for this email to prevent "already invited" conflicts
      await wipeEmailData(newEmail);

      // Generate a fresh studentInvitation for the new member
      await addDoc(collection(db, 'studentInvitations'), {
        studentEmail: newEmail,
        sentBy: studentData.invitedBy || '',
        sentByName: studentData.invitedByName || 'Research Adviser',
        department: studentData.department || 'Not specified',
        status: 'pending',
        invitationSentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        invitedByLeader: studentData.email, // Track who added them
        studentNumber: newStudentId // Pass the ID number so they can see it when they sign up
      });

      // Send email to the new member
      try {
        const link = window.location.origin + '/student/login';
        await addDoc(collection(db, 'mail'), {
          to: newEmail,
          message: {
            subject: "Invitation to Research Group - ARCHIVIO",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #541b2f; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-family: Georgia, serif;">ARCHIVIO</h1>
                  <p style="color: #e2e8f0; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Research Archive</p>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                  <h2 style="color: #2d3748; margin-top: 0;">Hi,</h2>
                  <p style="color: #4a5568; line-height: 1.6;">I have added you to our research group in ARCHIVIO. Please sign up using this exact email to access our group portal.</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #541b2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set up your account</a>
                  </div>
                  
                  <p style="color: #718096; font-size: 14px; margin-bottom: 0;">
                    Best regards,<br>
                    <strong>${studentData.displayName || studentData.email}</strong><br>
                    ${studentData.department || 'Your Department'}
                  </p>
                </div>
              </div>
            `
          }
        });
      } catch (emailErr) {
        console.error('Error sending invitation email to member:', emailErr);
      }

      // Refresh the page data locally
      const memberSnap = await getDocs(
        query(collection(db, 'students'), where('email', 'in', newGroupMembers.map(m => typeof m === 'object' ? m.email : m)))
      );
      setMemberProfiles(memberSnap.docs.map(d => d.data()));
      setStudentData(prev => ({ ...prev, groupMembers: newGroupMembers }));
      
      Swal.fire('Added!', `${newEmail} has been added to the group and can now sign up.`, 'success');
    } catch (err) {
      console.error('Error adding member:', err);
      Swal.fire('Error', 'Failed to add member. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const memberEmail = (member.email || '').toLowerCase().trim();
    if (!memberEmail) return;

    const result = await Swal.fire({
      title: 'Remove Member?',
      text: `Are you sure you want to remove ${member.name || memberEmail} from your group? All associated invitation and pending records will be permanently wiped.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        // 1. Update leader's student document groupMembers
        const currentGroupMembers = studentData.groupMembers || [];
        const updatedGroupMembers = currentGroupMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== memberEmail : m?.toLowerCase() !== memberEmail));
        await updateDoc(doc(db, 'students', studentData.uid), {
          groupMembers: updatedGroupMembers
        });

        // 2. Update group document members
        const groupSnap = await getDocs(query(collection(db, 'groups'), where('leaderUid', '==', studentData.uid)));
        if (!groupSnap.empty) {
          const groupId = groupSnap.docs[0].id;
          const groupData = groupSnap.docs[0].data();
          const existingMembers = groupData.members || [];
          const updatedMembers = existingMembers.filter(m => (typeof m === 'object' ? m.email?.toLowerCase() !== memberEmail : m?.toLowerCase() !== memberEmail));
          await updateDoc(doc(db, 'groups', groupId), {
            members: updatedMembers,
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Wipe orphaned data for this member
        await wipeEmailData(memberEmail);

        setStudentData(prev => ({ ...prev, groupMembers: updatedGroupMembers }));
        Swal.fire('Removed!', `${member.name || memberEmail} has been removed from the group and invitation data cleared.`, 'success');
      } catch (err) {
        console.error('Error removing member:', err);
        Swal.fire('Error', 'Failed to remove member. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const displayName   = studentData?.displayName || studentName || 'Student';
  const groupTitle    = groupData?.groupName || studentData?.groupName || propGroupName || 'Your Group';
  const researchTitle = groupData?.researchTitle || studentData?.researchTitle || '—';
  const adviserName   = groupData?.adviserName || studentData?.invitedByName || propAdviserName || 'Your Adviser';
  const course        = studentData?.course || '';
  const department    = studentData?.department || '';

  // Build the full team list: leader first, then registered members
  const leaderCard = {
    name:     displayName,
    role:     'Group Leader',
    email:    studentData?.email || auth.currentUser?.email || '',
    studentId: studentData?.studentNumber || '—',
    isYou:    true,
    initials: getInitials(displayName),
    color:    'bg-[#7B1F35]',
    cardBg:   'bg-stone-50 dark:bg-stone-800/50',
    cardBorder: 'border-stone-200/80 dark:border-stone-700',
  };

  // Map emails to the names provided by the leader during group creation
  const groupMemberNames = {};
  (studentData?.groupMembers || []).forEach(m => {
    if (typeof m === 'object') groupMemberNames[m.email] = m.name;
    else groupMemberNames[m] = m.split('@')[0];
  });

  // Members from Firestore (registered students)
  const registeredMemberCards = memberProfiles.map((m, idx) => {
    const assignedName = groupMemberNames[m.email] || m.displayName || `${m.firstName} ${m.lastName}`;
    return {
      name:      assignedName,
      role:      'Member',
      email:     m.email,
      studentId: m.studentNumber || '—',
      isYou:     false,
      initials:  getInitials(assignedName),
      color:     AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length],
      cardBg:    'bg-white dark:bg-stone-900',
      cardBorder: 'border-stone-200/80 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600',
    };
  });

  // Members added during signup who haven't registered yet (show as pending)
  const registeredEmails = new Set(memberProfiles.map(m => m.email));
  const pendingMembers = (studentData?.groupMembers || [])
    .map(m => (typeof m === 'object' ? m : { email: m, name: m.split('@')[0] }))
    .filter(m => !registeredEmails.has(m.email));
    
  const pendingCards = pendingMembers.map((m, idx) => ({
    name:      m.name || m.email.split('@')[0],
    role:      'Member (Pending)',
    email:     m.email,
    studentId: m.studentId || '—',
    isYou:     false,
    initials:  getInitials(m.name || m.email.split('@')[0]),
    color:     'bg-stone-400',
    cardBg:    'bg-stone-50 dark:bg-stone-800/50',
    cardBorder: 'border-stone-200 dark:border-stone-700',
    pending:   true,
  }));

  const allMembers = [leaderCard, ...registeredMemberCards, ...pendingCards];
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
          profilePhotoUrl={profilePhotoUrl} role={role}
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
                  
                  {leaderCard.isYou && (
                    <PremiumButton onClick={handleAddMember} className="w-full sm:w-auto min-h-[44px] touch-manipulation justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Member
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
                                : member.pending
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-stone-100 dark:bg-stone-800 text-gray-600 dark:text-stone-400'
                            }`}>
                              {member.role}
                            </span>
                          </div>

                          {leaderCard.isYou && !member.isYou && (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className="min-h-[36px] px-2.5 py-1 bg-stone-100 hover:bg-red-50 dark:bg-stone-800 dark:hover:bg-red-950/40 text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 text-xs rounded-lg transition-colors flex items-center gap-1.5 touch-manipulation cursor-pointer shrink-0"
                              title="Remove member and clear invitation data"
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
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="w-4 h-4 text-gray-400 dark:text-stone-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.pending && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-semibold mt-1">⏳ Hasn't created their account yet</p>
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
    </div>
  );
}
