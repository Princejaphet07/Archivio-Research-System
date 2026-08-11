import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

function SubmissionRequirements() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', desc: '', type: 'file', icon: '📄' });

  useEffect(() => {
    const email = auth.currentUser?.email;
    if (!email) { setLoading(false); return; }

    const reqQuery = query(collection(db, 'requirements'));
    const unsub = onSnapshot(reqQuery, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter for global + adviser's own requirements
      const filtered = allReqs.filter(r => 
        r.scope === 'global' || 
        (r.scope === 'adviser' && r.adviserUid === email)
      );
      
      // Sort: global first by priority, then adviser specific
      filtered.sort((a, b) => {
        if (a.scope === 'global' && b.scope === 'global') return (a.priority || 0) - (b.priority || 0);
        if (a.scope === 'global') return -1;
        if (b.scope === 'global') return 1;
        return (a.createdAt || 0) > (b.createdAt || 0) ? -1 : 1;
      });

      setRequirements(filtered);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    try {
      const email = auth.currentUser?.email;
      await addDoc(collection(db, 'requirements'), {
        title: newReq.title,
        desc: newReq.desc,
        type: newReq.type,
        icon: newReq.icon,
        scope: 'adviser',
        adviserUid: email,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewReq({ title: '', desc: '', type: 'file', icon: '📄' });
      Swal.fire({ icon: 'success', title: 'Added', text: 'Requirement proposed to Dean for approval', confirmButtonColor: '#7a2e46' });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not add requirement' });
    }
  };

  const handleDelete = async (reqId, scope) => {
    if (scope === 'global') {
      Swal.fire({ icon: 'error', title: 'Action Denied', text: 'You cannot delete department-wide requirements.' });
      return;
    }
    const res = await Swal.fire({
      title: 'Delete this requirement?',
      text: "This will remove it from all your groups.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it'
    });
    if (res.isConfirmed) {
      await deleteDoc(doc(db, 'requirements', reqId));
    }
  };

  return (
    <Layout title="Submission Requirements" breadcrumb="ARCHIVIO › Submission Requirements" showSearch={true}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-stone-100 mb-1">Submission Requirements</h1>
          <p className="text-sm text-gray-500 dark:text-stone-400">Set what items your student groups must submit for their research to be considered complete</p>
        </div>

        {/* Info Banner */}
        <div className="bg-[#eff6ff] dark:bg-blue-900/20 border border-[#bfdbfe] dark:border-blue-800/50 p-4 rounded-lg flex gap-3 text-sm text-[#1e40af] dark:text-blue-400">
          <span className="text-xl">ℹ️</span>
          <p>Global department-wide requirements are set by the Dean. You may propose additional requirements for your groups, which must be approved by the Dean before students can see them.</p>
        </div>

        {/* Checklist Card */}
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-200 dark:border-stone-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-stone-100 text-lg">Requirement Checklist</h3>
              <p className="text-xs text-gray-500 dark:text-stone-400">Items students must submit for completion</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5f2135] dark:hover:bg-[#ffe090] transition"
            >
              + Add Requirement
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-stone-800 rounded-lg"></div>)}
              </div>
            ) : requirements.length === 0 ? (
              <p className="text-gray-500 dark:text-stone-400 text-sm py-4 text-center">No requirements found.</p>
            ) : (
              requirements.map((req) => (
                <div key={req.id} className="flex items-center justify-between border border-gray-200 dark:border-stone-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-stone-800/50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{req.icon}</span>
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-stone-100">{req.title}</span>
                      <p className="text-xs text-gray-500 dark:text-stone-400">{req.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {req.scope === 'global' ? (
                      <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-blue-200 dark:border-blue-800/50">Global</span>
                    ) : req.status === 'approved' ? (
                      <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-green-200 dark:border-green-800/50">Approved</span>
                    ) : req.status === 'declined' ? (
                      <span className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-red-200 dark:border-red-800/50">Declined</span>
                    ) : (
                      <span className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-yellow-200 dark:border-yellow-800/50">Pending</span>
                    )}

                    <button 
                      onClick={() => handleDelete(req.id, req.scope)}
                      className={`border rounded px-2.5 py-1.5 text-xs transition flex items-center justify-center ${
                        req.scope === 'global' 
                          ? 'border-gray-100 dark:border-stone-800 text-gray-300 dark:text-stone-600 cursor-not-allowed' 
                          : 'border-gray-200 dark:border-stone-700 text-gray-400 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800'
                      }`}
                      disabled={req.scope === 'global'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Requirement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-950 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#7a2e46] dark:bg-stone-900 dark:border-b dark:border-stone-800 p-4 text-white dark:text-stone-100">
              <h2 className="font-bold text-lg">Propose New Requirement</h2>
            </div>
            <form onSubmit={handleAddRequirement} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-stone-400 mb-1">Requirement Title</label>
                <input 
                  required
                  type="text" 
                  value={newReq.title}
                  onChange={e => setNewReq({...newReq, title: e.target.value})}
                  className="w-full bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 border border-gray-300 dark:border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]" 
                  placeholder="e.g. Source Code Repository"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-stone-400 mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  value={newReq.desc}
                  onChange={e => setNewReq({...newReq, desc: e.target.value})}
                  className="w-full bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 border border-gray-300 dark:border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]" 
                  placeholder="e.g. Link to your public GitHub repo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-stone-400 mb-1">Input Type</label>
                  <select 
                    value={newReq.type}
                    onChange={e => setNewReq({...newReq, type: e.target.value, icon: e.target.value === 'url' ? '🔗' : '📄'})}
                    className="w-full bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 border border-gray-300 dark:border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]"
                  >
                    <option value="file">File Upload</option>
                    <option value="url">URL / Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-stone-400 mb-1">Icon</label>
                  <input 
                    type="text" 
                    value={newReq.icon}
                    onChange={e => setNewReq({...newReq, icon: e.target.value})}
                    className="w-full bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100 border border-gray-300 dark:border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a2e46] dark:focus:border-[#f8d070]" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-stone-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 dark:border-stone-700 text-gray-600 dark:text-stone-300 rounded-lg py-2 text-sm font-bold hover:bg-gray-50 dark:hover:bg-stone-800">Cancel</button>
                <button type="submit" className="flex-1 bg-[#7a2e46] dark:bg-[#f8d070] text-white dark:text-stone-900 rounded-lg py-2 text-sm font-bold hover:bg-[#5f2135] dark:hover:bg-[#ffe090]">Propose Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SubmissionRequirements;
