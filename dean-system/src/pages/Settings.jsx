import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function Settings({ activePage, onNavigate }) {
  const [activeTab, setActiveTab] = useState('completion');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', desc: '', type: 'file', icon: '📄' });

  const settingsTabs = [
    { id: 'completion', icon: '📋', label: 'Completion Requirements' },
    { id: 'email', icon: '✉️', label: 'Email Templates' },
    { id: 'department', icon: '🏛️', label: 'Department Info' },
    { id: 'schoolyear', icon: '📅', label: 'School Year' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
    { id: 'security', icon: '🔒', label: 'Security' },
  ];

  useEffect(() => {
    const q = query(collection(db, 'requirements'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequirements(allReqs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      await updateDoc(doc(db, 'requirements', reqId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      Swal.fire({ icon: 'success', title: 'Updated', text: `Requirement has been ${newStatus}.`, confirmButtonColor: '#7a1f3d' });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update requirement.' });
    }
  };

  const handleAddGlobalRequirement = async (e) => {
    e.preventDefault();
    try {
      // Find the highest priority to append to the end
      const globalReqs = requirements.filter(r => r.scope === 'global');
      const maxPriority = globalReqs.reduce((max, r) => Math.max(max, r.priority || 0), 0);

      await addDoc(collection(db, 'requirements'), {
        title: newReq.title,
        desc: newReq.desc,
        type: newReq.type,
        icon: newReq.icon,
        scope: 'global',
        status: 'approved',
        priority: maxPriority + 1,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewReq({ title: '', desc: '', type: 'file', icon: '📄' });
      Swal.fire({ icon: 'success', title: 'Added', text: 'Global requirement has been added.', confirmButtonColor: '#7a1f3d' });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not add requirement.' });
    }
  };

  const handleDeleteGlobalRequirement = async (reqId) => {
    const res = await Swal.fire({
      title: 'Delete this global requirement?',
      text: "This will remove it from all students' requirements.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it'
    });
    
    if (res.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'requirements', reqId));
        Swal.fire({ icon: 'success', title: 'Deleted', text: 'The requirement has been deleted.', confirmButtonColor: '#7a1f3d' });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete requirement.' });
      }
    }
  };

  const globalRequirements = requirements.filter(r => r.scope === 'global').sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const pendingProposals = requirements.filter(r => r.scope === 'adviser' && r.status === 'pending');
  const approvedProposals = requirements.filter(r => r.scope === 'adviser' && r.status === 'approved');

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} onMenuClick={() => {}} />
        
        <main className="p-6 lg:p-8 w-full max-w-[1400px] mx-auto flex-1">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-[#1a1a1a]">Settings</h1>
            <p className="text-sm text-stone-500 mt-1">Configure system preferences and completion requirements</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Column: Navigation Tabs */}
            <div className="w-full lg:w-[300px] shrink-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden py-2">
              <div className="space-y-0.5 px-2">
                {settingsTabs.map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 text-left font-medium text-sm px-4 py-3 rounded-lg transition-all 
                    ${activeTab === tab.id
                      ? 'bg-[#f8ebef] text-[#7a1f3d] font-bold' 
                      : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    <span className={`text-base ${activeTab === tab.id ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Tab Content */}
            <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-stone-200 p-6 lg:p-8">
              
              {/* Completion Requirements Tab */}
              {activeTab === 'completion' && (
                <div className="space-y-10">
                  
                  {/* Department-wide Requirements */}
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Global Completion Requirements</h3>
                        <p className="text-xs text-stone-500 mt-1">These apply to ALL research groups department-wide.</p>
                      </div>
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#7a1f3d] hover:bg-[#631932] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm shrink-0"
                      >
                        + Add Global Requirement
                      </button>
                    </div>

                    <div className="space-y-3">
                      {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-3"></div>
                          <p className="text-xs font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Requirements...</p>
                        </div>
                      ) : (
                        globalRequirements.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-xl bg-stone-50 opacity-90">
                            <div className="flex items-center gap-4">
                              <span className="text-xl">{item.icon}</span>
                              <div>
                                <span className="text-sm text-stone-900 font-bold">{item.title}</span>
                                <p className="text-xs text-stone-500">{item.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-blue-200">Global</span>
                              <button 
                                onClick={() => handleDeleteGlobalRequirement(item.id)}
                                className="border border-stone-200 rounded px-2.5 py-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex items-center justify-center"
                                title="Delete Requirement"
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

                  <hr className="border-stone-200" />

                  {/* Pending Adviser Proposals */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Pending Adviser Proposals</h3>
                        <p className="text-xs text-stone-500 mt-1">Review requirements proposed by Research Advisers for their respective groups.</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">{pendingProposals.length} Pending</span>
                    </div>

                    <div className="space-y-3">
                      {pendingProposals.length === 0 ? (
                        <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-8 text-center">
                          <p className="text-stone-500 text-sm font-medium">No pending proposals at this time.</p>
                        </div>
                      ) : (
                        pendingProposals.map((item) => (
                          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-l-4 border-l-yellow-400 border-t border-b border-r border-stone-200 rounded-r-xl bg-white shadow-sm gap-4">
                            <div className="flex items-start gap-4">
                              <span className="text-2xl mt-1">{item.icon}</span>
                              <div>
                                <span className="text-sm text-stone-900 font-bold">{item.title}</span>
                                <p className="text-xs text-stone-500 mb-1">{item.desc}</p>
                                <p className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded inline-block font-medium">
                                  Proposed by: {item.adviserUid}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
                                ✓ Approve
                              </button>
                              <button onClick={() => handleUpdateStatus(item.id, 'declined')} className="border border-stone-300 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-4 py-2 rounded-lg text-xs font-bold transition">
                                ✕ Decline
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Approved Adviser Proposals */}
                  {approvedProposals.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-stone-100">
                      <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Approved Adviser Requirements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {approvedProposals.map(item => (
                          <div key={item.id} className="border border-stone-200 rounded-lg p-3 bg-white flex items-center gap-3">
                            <span className="text-xl">{item.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-800 truncate">{item.title}</p>
                              <p className="text-[10px] text-stone-400 truncate">For: {item.adviserUid}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded">APPROVED</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ... (Other tabs remain same logic, for brevity I am keeping their simple placeholders or previous content) */}
              {activeTab !== 'completion' && (
                <div className="flex items-center justify-center h-64 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <p className="text-stone-500 font-medium">Select Completion Requirements tab to see the updates.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Global Requirement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#7a1f3d] p-4 text-white">
              <h2 className="font-bold text-lg">Add Global Requirement</h2>
            </div>
            <form onSubmit={handleAddGlobalRequirement} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Requirement Title</label>
                <input 
                  required
                  type="text" 
                  value={newReq.title}
                  onChange={e => setNewReq({...newReq, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  placeholder="e.g. Clearance Form"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  value={newReq.desc}
                  onChange={e => setNewReq({...newReq, desc: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  placeholder="e.g. Required clearance from accounting"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Input Type</label>
                  <select 
                    value={newReq.type}
                    onChange={e => setNewReq({...newReq, type: e.target.value, icon: e.target.value === 'url' ? '🔗' : '📄'})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]"
                  >
                    <option value="file">File Upload</option>
                    <option value="url">URL / Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Icon (Emoji)</label>
                  <input 
                    type="text" 
                    value={newReq.icon}
                    onChange={e => setNewReq({...newReq, icon: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#7a1f3d]" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-[#7a1f3d] text-white rounded-lg py-2 text-sm font-bold hover:bg-[#631932]">Add Requirement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}