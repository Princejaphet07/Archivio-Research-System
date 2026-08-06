import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import NotificationBell from '../Components/NotificationBell';
import PortalHeader from '../Components/PortalHeader';
import Swal from 'sweetalert2';

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
        '  <label class="text-xs font-semibold text-gray-700 mt-2">Email Address</label>' +
        '  <input id="swal-input-email" type="email" class="swal2-input !m-0 !w-full" placeholder="member@phinmaed.com" style="width: 100%; box-sizing: border-box; margin: 0;">' +
        '</div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#7B1F35',
      confirmButtonText: 'Add Member',
      preConfirm: () => {
        const name = document.getElementById('swal-input-name').value.trim();
        const email = document.getElementById('swal-input-email').value.trim().toLowerCase();
        if (!name || !email) {
          Swal.showValidationMessage('Please provide both name and email');
          return false;
        }
        if (!email.endsWith('@phinmaed.com')) {
          Swal.showValidationMessage('Email must use @phinmaed.com domain');
          return false;
        }
        return { name, email };
      }
    });

    if (!formValues) return;
    
    const { name: newName, email: newEmail } = formValues;
    
    // Check if already in group
    const currentMembers = studentData.groupMembers || [];
    const isAlreadyMember = currentMembers.some(m => (typeof m === 'object' ? m.email : m) === newEmail);
    if (isAlreadyMember) {
      Swal.fire('Error', 'This student is already in the group.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Update the leader's student document
      const newGroupMembers = [...currentMembers, { email: newEmail, name: newName }];
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
          members: [...existingGroupMembers, { email: newEmail, name: newName }],
          updatedAt: new Date().toISOString()
        });
      }

      // Generate a studentInvitation for the new member
      const existingInvitesSnap = await getDocs(
        query(collection(db, 'studentInvitations'), where('studentEmail', '==', newEmail))
      );
      
      if (existingInvitesSnap.empty) {
        await addDoc(collection(db, 'studentInvitations'), {
          studentEmail: newEmail,
          sentBy: studentData.invitedBy || '',
          sentByName: studentData.invitedByName || 'Research Adviser',
          department: studentData.department || 'Not specified',
          status: 'pending',
          invitationSentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          invitedByLeader: studentData.email // Track who added them
        });
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

  // ── Derived values ──────────────────────────────────────────────────────────
  const displayName   = studentData?.displayName || studentName || 'Student';
  const groupTitle    = studentData?.groupName    || propGroupName  || 'Your Group';
  const researchTitle = studentData?.researchTitle || '—';
  const adviserName   = studentData?.invitedByName || propAdviserName || 'Your Adviser';
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
    cardBg:   'bg-stone-50',
    cardBorder: 'border-stone-200/80',
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
      cardBg:    'bg-white',
      cardBorder: 'border-stone-200/80 hover:border-stone-300',
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
    studentId: '—',
    isYou:     false,
    initials:  getInitials(m.name || m.email.split('@')[0]),
    color:     'bg-stone-400',
    cardBg:    'bg-stone-50',
    cardBorder: 'border-stone-200',
    pending:   true,
  }));

  const allMembers = [leaderCard, ...registeredMemberCards, ...pendingCards];
  const totalCount = allMembers.length;

  // Adviser initials
  const adviserInitials = getInitials(adviserName);

  // Skeleton card
  const SkeletonCard = () => (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 flex items-start gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-full bg-stone-200 shrink-0" />
      <div className="flex-1 space-y-2 mt-1">
        <div className="h-4 bg-stone-200 rounded w-40" />
        <div className="h-3 bg-stone-100 rounded w-24" />
        <div className="h-3 bg-stone-100 rounded w-36 mt-3" />
      </div>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-[#faf9f6] font-sans overflow-hidden">

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
        <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

            <div>
              <h2 className="text-[28px] font-bold text-[#1A1A1A] font-serif tracking-tight mb-1">My Research Group</h2>
              <p className="text-[14px] text-gray-500 font-medium">Your team members and group information</p>
            </div>

            {/* ── GROUP BANNER ────────────────────────────────────────── */}
            {loading ? (
              <div className="w-full bg-[#7B1F35]/20 rounded-[24px] h-[180px] animate-pulse" />
            ) : (
              <div className="w-full bg-gradient-to-br from-[#7B1F35] to-[#5a1831] rounded-[24px] p-8 lg:p-10 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md border border-[#7B1F35]/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-[40%] bg-white/5 rounded-l-[100px] pointer-events-none" />

                <div className="relative z-10 text-white flex flex-col gap-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Group Name</span>
                    <h2 className="text-[28px] lg:text-[32px] font-serif font-bold mt-1">{groupTitle}</h2>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-white/60 uppercase">Research Title</span>
                    <p className="text-[17px] font-semibold mt-1">{researchTitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
                      👥 {totalCount} {totalCount === 1 ? 'member' : 'members'}
                    </span>
                    {course && (
                      <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
                        🎓 {course}
                      </span>
                    )}
                    {department && (
                      <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
                        🏢 {department}
                      </span>
                    )}
                    <span className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
                      📅 S.Y. 2026–2027
                    </span>
                  </div>
                </div>

                {/* Adviser Box */}
                <div className="relative z-10 mt-6 md:mt-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 min-w-[240px]">
                  <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase block mb-3">Your Adviser</span>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white text-[#7B1F35] flex items-center justify-center font-bold text-lg shadow-sm">
                      {adviserInitials}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-[15px]">{adviserName}</h4>
                      <p className="text-white/70 text-[12px] mt-0.5">Research Adviser</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM MEMBERS SECTION ────────────────────────────────── */}
            <div className="mt-2 bg-white p-8 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[22px] font-serif font-bold text-[#1A1A1A] mb-1">Team Members</h3>
                  <p className="text-[14px] text-gray-500">
                    {loading ? 'Loading members…' : `${totalCount} ${totalCount === 1 ? 'member' : 'members'} in this research group`}
                  </p>
                </div>
                
                {leaderCard.isYou && (
                  <button 
                    onClick={handleAddMember}
                    className="px-4 py-2 bg-[#7B1F35] text-white rounded-lg text-sm font-semibold hover:bg-[#5E1627] transition flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Member
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loading ? (
                  <>
                    <SkeletonCard /><SkeletonCard />
                    <SkeletonCard /><SkeletonCard />
                  </>
                ) : (
                  allMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className={`${member.cardBg} border ${member.cardBorder} rounded-2xl p-6 flex items-start gap-4 transition-all hover:shadow-sm hover:-translate-y-0.5 duration-200`}
                    >
                      {/* Avatar */}
                      <div className={`w-14 h-14 rounded-full ${member.color} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm`}>
                        {member.initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-[16px] font-bold text-[#1A1A1A] truncate">{member.name}</h4>
                          {member.isYou && (
                            <span className="bg-[#7B1F35] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">YOU</span>
                          )}
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              member.isYou
                                ? 'bg-[#7B1F35]/10 text-[#7B1F35]'
                                : member.pending
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-stone-100 text-gray-600'
                            }`}>
                            {member.role}
                          </span>
                        </div>

                        <div className="text-[13px] text-gray-500 flex flex-col gap-1.5 mt-3 font-medium">
                          {member.studentId && member.studentId !== '—' && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5" />
                              </svg>
                              <span>{member.studentId}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.pending && (
                            <p className="text-[11px] text-amber-600 font-semibold mt-1">⏳ Hasn't created their account yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
