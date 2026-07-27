import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { useAdviser } from '../context/AdviserContext';
import Swal from 'sweetalert2';

function GroupRegistrations() {
  const { adviserData, user } = useAdviser();
  const [pendingGroups, setPendingGroups] = useState([]);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Use user.email as the ultimate source of truth for the adviser's email
      const email = user?.email || adviserData?.email;
      console.log("Fetching groups for adviser:", email);
      if (!email) return;

      const q = query(collection(db, 'groups'), where('adviserUid', '==', email));
      const snap = await getDocs(q);
      console.log("Groups found in DB for this adviser:", snap.size);
      
      const pending = [];
      const history = [];
      
      snap.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === 'pending') {
          pending.push(data);
        } else {
          history.push(data);
        }
      });
      
      setPendingGroups(pending);
      // Sort history by updated date if exists
      setHistoryGroups(history.sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email || adviserData?.email) {
      fetchGroups();
    }
  }, [user?.email, adviserData?.email]);

  const handleDecision = async (group, decision) => {
    const actionText = decision === 'approve' ? 'approve' : 'decline';
    const confirmColor = decision === 'approve' ? '#10b981' : '#d33';
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${actionText} ${group.groupName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText}`
    });

    if (!result.isConfirmed) return;

    try {
      // 1. Update groups collection
      await updateDoc(doc(db, 'groups', group.id), {
        status: decision === 'approve' ? 'approved' : 'declined',
        updatedAt: new Date().toISOString()
      });

      // 2. Update students collection (the leader's profile)
      if (group.leaderUid) {
        await updateDoc(doc(db, 'students', group.leaderUid), {
          groupStatus: decision === 'approve' ? 'approved' : 'declined'
        });
      }

      // 3. Log Activity for Admin
      await addDoc(collection(db, 'systemLogs'), {
        user: auth.currentUser?.email || 'Adviser',
        role: 'Research Adviser',
        action: `Group Registration ${decision === 'approve' ? 'Approved' : 'Declined'}`,
        details: `Group: ${group.groupName} | Leader: ${group.leaderName}`,
        status: 'Success',
        timestamp: new Date().toISOString()
      });

      // Refresh list
      fetchGroups();

      Swal.fire({
        title: 'Success!',
        text: `${group.groupName} has been ${decision}d.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(`Error ${decision} group:`, err);
      Swal.fire('Error', `Failed to ${decision}. Please try again.`, 'error');
    }
  };

  return (
    <Layout title="Group Registrations" breadcrumb="ARCHIVIO › Group Registrations" showSearch={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Group Registrations</h1>
          <p className="text-sm text-gray-500">Approve or decline student group registration requests</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#fff7ed] border border-[#fed7aa] p-4 rounded-lg flex gap-3 text-sm text-[#9a3412]">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p><strong>Important:</strong> Approve only the Group Leader's registration. Once approved, the system automatically sends a link to the leader's email so they can complete group setup and invite their members.</p>
        </div>

        {/* Pending Requests */}
        <div className="space-y-4">
          {loading ? (
             <div className="text-center p-8 text-gray-500">Loading pending requests...</div>
          ) : pendingGroups.length === 0 ? (
             <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
               No pending group registrations found.
             </div>
          ) : (
            pendingGroups.map((req) => (
              <div key={req.id} className="bg-white border border-[#fed7aa] rounded-xl p-5 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-[#fff7ed] rounded-lg border border-[#fed7aa] flex items-center justify-center text-xl">📋</div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {req.groupName} <span className="bg-[#fff7ed] text-[#c2410c] text-[10px] px-2 py-0.5 rounded-full border border-[#fed7aa] uppercase tracking-wider font-bold">• Pending Approval</span>
                    </h3>
                    <p className="text-sm text-gray-800 mt-1">Research Title: <strong>{req.researchTitle}</strong></p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted by: {req.leaderName} (Group Leader) · Applied {new Date(req.createdAt).toLocaleDateString()} · {req.program}
                    </p>
                    <div className="mt-3 bg-gray-50 text-xs text-gray-600 p-2 rounded-md border border-gray-100 flex items-center gap-2">
                      👥 Members: {req.leaderName} (Leader){req.members?.length > 0 ? `, ${req.members.map(m=>m.name || m.email).join(', ')}` : ''} ({1 + (req.members?.length || 0)} total)
                    </div>
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 w-full lg:w-32">
                  <button 
                    onClick={() => handleDecision(req, 'approve')}
                    className="flex-1 lg:flex-none bg-green-600 text-white font-semibold text-sm py-2 px-4 rounded-lg hover:bg-green-700 flex justify-center items-center gap-1"
                  >
                    ✓ Approve
                  </button>
                  <button 
                    onClick={() => handleDecision(req, 'decline')}
                    className="flex-1 lg:flex-none bg-red-700 text-white font-semibold text-sm py-2 px-4 rounded-lg hover:bg-red-800 flex justify-center items-center gap-1"
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">Registration History</h3>
            <p className="text-xs text-gray-500">Previously processed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf5f6] text-[#7a2e46] text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-5">Group</th>
                  <th className="py-3 px-5">Leader</th>
                  <th className="py-3 px-5">Research Title</th>
                  <th className="py-3 px-5">Program</th>
                  <th className="py-3 px-5">Decision</th>
                  <th className="py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyGroups.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500">No registration history yet.</td>
                  </tr>
                ) : (
                  historyGroups.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-5 font-bold text-gray-900">{item.groupName}</td>
                      <td className="py-3 px-5 text-gray-600">{item.leaderName}</td>
                      <td className="py-3 px-5 text-gray-600">{item.researchTitle}</td>
                      <td className="py-3 px-5 text-gray-600">{item.program}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                          item.status === 'approved' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                        }`}>
                          • {item.status === 'approved' ? 'Approved' : 'Declined'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-500">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default GroupRegistrations;