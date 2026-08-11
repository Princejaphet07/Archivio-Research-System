import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DepartmentsProgramsTab from './DepartmentsPrograms';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { Building2, Settings2, Trash2, Lock } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('system');
  
  // System Settings State
  const [toggles, setToggles] = useState({
    maintenance: false,
    emailAlerts: true,
    publicVisibility: true,
    emailVerification: true,
  });

  // Institution State
  const [instInfo, setInstInfo] = useState({
    name: 'Southwestern University PHINMA',
    shortName: 'SWU PHINMA',
    emailDomain: '@phinmaed.com',
    location: 'Cebu City, Philippines'
  });
  const [savingInst, setSavingInst] = useState(false);

  // Storage Management State
  const [storageFiles, setStorageFiles] = useState({
    dataset: true,
    ppt: true,
    video: true,
    manual: false,
    url: false,
  });

  useEffect(() => {
    const unsubSystem = onSnapshot(doc(db, 'settings', 'system_preferences'), (snap) => {
      if (snap.exists()) {
        setToggles(prev => ({ ...prev, ...snap.data() }));
      }
    });
    
    const unsubInst = onSnapshot(doc(db, 'settings', 'institution_info'), (snap) => {
      if (snap.exists()) {
        setInstInfo(prev => ({ ...prev, ...snap.data() }));
      }
    });

    return () => {
      unsubSystem();
      unsubInst();
    };
  }, []);

  const handleToggle = async (key) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'settings', 'system_preferences'), {
        [key]: newValue
      }, { merge: true });
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  const handleSaveInst = async () => {
    setSavingInst(true);
    try {
      await setDoc(doc(db, 'settings', 'institution_info'), instInfo, { merge: true });
      import('sweetalert2').then(({ default: Swal }) => {
        Swal.fire({
          icon: 'success',
          title: 'Saved!',
          text: 'Institution information updated successfully.',
          timer: 1500,
          showConfirmButton: false
        });
      });
    } catch (error) {
      console.error("Failed to save institution info", error);
    } finally {
      setSavingInst(false);
    }
  };

  const handleStorageCheck = (key) => {
    setStorageFiles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBackupData = async () => {
    try {
      const collectionsToBackup = ['deans', 'advisers', 'students', 'groups', 'submissions', 'activity_logs', 'settings'];
      const backupData = {};
      
      for (const colName of collectionsToBackup) {
        const snap = await getDocs(collection(db, colName));
        backupData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivio_system_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Backup failed:", error);
      alert("Failed to backup system data.");
    }
  };

  // Content Renderers
  const renderSystemSettings = () => (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* INSTITUTION INFORMATION */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-200 bg-stone-50">
          <h4 className="font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#801e38]" /> Institution Information
          </h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Institution Name</label>
              <input type="text" value={instInfo.name} onChange={e => setInstInfo({...instInfo, name: e.target.value})} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Short Name</label>
              <input type="text" value={instInfo.shortName} onChange={e => setInstInfo({...instInfo, shortName: e.target.value})} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email Domain</label>
              <input type="text" value={instInfo.emailDomain} onChange={e => setInstInfo({...instInfo, emailDomain: e.target.value})} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Location</label>
              <input type="text" value={instInfo.location} onChange={e => setInstInfo({...instInfo, location: e.target.value})} className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-[#801e38]" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveInst} disabled={savingInst} className="px-6 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50">
              {savingInst ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* SYSTEM PREFERENCES */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-stone-200 bg-stone-50">
          <h4 className="font-bold text-stone-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#801e38]" /> System Preferences
          </h4>
        </div>
        <div className="divide-y divide-stone-100">
          {Object.entries({
            maintenance: { title: 'Maintenance Mode', desc: 'Temporarily disable access to all portals for system updates' },
            emailAlerts: { title: 'Email Notifications', desc: 'Send email alerts when new accounts are activated' },
            publicVisibility: { title: 'Public Archive Visibility', desc: 'Allow the public website to display approved research papers' },
            emailVerification: { title: 'Require Email Verification', desc: 'Dean must verify email before accessing the portal' }
          }).map(([key, info]) => (
            <div key={key} className="p-5 flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-stone-900">{info.title}</h5>
                <p className="text-xs text-stone-500 mt-0.5">{info.desc}</p>
              </div>
              <button onClick={() => handleToggle(key)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${toggles[key] ? 'bg-[#801e38]' : 'bg-stone-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${toggles[key] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DATA MANAGEMENT */}
      <div className="bg-white border-2 border-red-600 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5">
          <h4 className="font-bold text-stone-900 mb-1">Data Management</h4>
          <p className="text-xs text-stone-500 mb-4">Sensitive operations that affect system-wide data. These actions cannot be undone.</p>
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold mb-6">
            ⚠️ Only the System Administrator can perform these operations. All actions are logged.
          </div>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Back Up System Data</h5>
                <p className="text-xs text-stone-500 mt-1 max-w-md">Downloads a complete JSON backup of all users, submissions, and configurations. Safe to perform anytime.</p>
              </div>
              <button onClick={handleBackupData} className="flex items-center gap-2 px-4 py-2 bg-[#801e38] text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:bg-[#601328] shrink-0">
                💾 Download Full Backup
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Reset Data</h5>
                <p className="text-xs text-stone-500 mt-1 max-w-md">Clears all submission records, uploaded files, and research data for the current school year. <br/>User accounts and system configurations will NOT be affected.</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#801e38] text-[#801e38] rounded-lg text-sm font-bold transition-all shadow-sm hover:bg-stone-50 shrink-0">
                ↻ Reset Data
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="text-sm font-bold text-stone-900">Delete All Data</h5>
                <p className="text-xs text-stone-500 mt-1 max-w-md mb-2">Permanently removes ALL data from ARCHIVIO including users, submissions, and published papers.<br/>This action requires PIN confirmation and cannot be undone.</p>
                <span className="inline-block bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-1 rounded-full">🔑 PIN Required</span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-lg text-sm font-bold transition-all shadow-sm shrink-0">
                <Trash2 className="w-4 h-4" /> Delete All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorageManagement = () => (
    <div className="max-w-[1000px] bg-white rounded-xl shadow-sm border border-stone-200 border-t-4 border-t-blue-500 overflow-hidden animate-fade-in">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-serif font-bold text-stone-900">Storage Management</h3>
          <p className="text-xs text-stone-500 mt-0.5">Archive old requirement files to free up storage space. Final Manuscript files are protected and cannot be archived.</p>
        </div>

        {/* Current Storage Usage */}
        <div className="mb-8">
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-2">Current Storage Usage</p>
          <div className="w-full bg-stone-100 rounded-full h-3.5 mb-2 overflow-hidden">
            <div className="bg-[#801e38] h-full rounded-full" style={{ width: '68%' }}></div>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-[#801e38]">68% Used - 14.4 GB of 21 GB</span>
            <span className="text-stone-500 font-medium">32% Free (6.7 GB remaining)</span>
          </div>
          <div className="mt-3 bg-red-50/50 border-l-2 border-red-400 text-stone-600 text-xs px-3 py-2 rounded-r-md">
            Storage above 60% — archiving old requirement files will help free space.
          </div>
        </div>

        {/* Archive Filters */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-2">Archive Requirements By School Year</p>
          <div className="flex gap-3">
            <select className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700 outline-none w-40 cursor-pointer">
              <option>SY 2023-2024</option>
            </select>
            <select className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700 outline-none w-48 cursor-pointer">
              <option>All Departments</option>
            </select>
          </div>
        </div>

        {/* Requirements List */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-2">Select Requirements To Archive</p>
          <div className="space-y-2">
            {[
              { id: 'dataset', name: 'Dataset Files', size: '156 MB - 38 files' },
              { id: 'ppt', name: 'PPT Slides', size: '92 MB - 42 files' },
              { id: 'video', name: 'Video Pitch', size: '890 MB - 38 files' },
              { id: 'manual', name: 'User Manual', size: '44 MB - 40 files' },
              { id: 'url', name: 'URL / Repository Link', size: '< 1 MB - 42 files' },
            ].map((item) => (
              <div 
                key={item.id}
                onClick={() => handleStorageCheck(item.id)}
                className="flex items-center justify-between p-3 border border-stone-100 bg-stone-50/50 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${storageFiles[item.id] ? 'bg-[#801e38] border-[#801e38]' : 'bg-white border-2 border-stone-300'}`}>
                    {storageFiles[item.id] && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm font-semibold text-stone-800">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-stone-400">{item.size}</span>
              </div>
            ))}

            {/* Locked Item */}
            <div className="flex items-center justify-between p-3 border border-amber-100 bg-[#fdfaf3] rounded-lg mt-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-600">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-stone-800 block leading-tight">Final Manuscript</span>
                  <span className="text-[10px] text-amber-600 font-medium">Cannot be archived</span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-stone-400">Always preserved • Core archive file</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <div className="bg-[#eaf5ed] text-[#1c783c] px-4 py-2.5 rounded-lg text-sm font-bold flex gap-2 items-center">
            <span className="font-medium text-stone-500">Estimated space to free:</span> 1.14 GB
          </div>
          <button className="px-5 py-2.5 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm">
            Archive Selected Files
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminManagement = () => (
    <div className="max-w-[1000px] space-y-6 animate-fade-in">
      
      {/* Default System Administrator Account */}
      <div className="bg-white border-l-4 border-l-[#801e38] border border-stone-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-stone-900">Default System Administrator Account</h3>
            <p className="text-xs text-stone-500 mt-0.5">This account is hardcoded in the system and cannot be deleted or restricted.</p>
            
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-[#801e38] text-white flex items-center justify-center font-bold text-sm">
                SA
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900 leading-tight">admin@swu.phinma.edu.ph</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Full Access — All Modules</p>
              </div>
            </div>
          </div>
          <div className="bg-[#fdf8e7] text-[#a3791a] border border-[#f3e5b5] px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
            🔒 Default Account
          </div>
        </div>
      </div>

      {/* Super Admin Accounts */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-900 border-l-4 border-[#801e38] pl-2 -ml-5">Super Admin Accounts</h3>
            <p className="text-xs text-stone-500 mt-0.5">Additional admin accounts with restricted module access</p>
          </div>
          <button className="px-4 py-2 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
            + Add Super Admin
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#801e38] text-white text-[10px] uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Modules Access</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              <tr className="hover:bg-stone-50 transition-colors">
                <td className="px-5 py-4 font-semibold text-stone-800">Dr. Ramon Cruz</td>
                <td className="px-5 py-4 text-stone-500 text-xs">r.cruz@swu.phinma.edu.ph</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-0.5 rounded-full">Dashboard</span>
                    <span className="bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-0.5 rounded-full">Reports</span>
                    <span className="bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-0.5 rounded-full">All Users</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-[11px] font-bold text-[#801e38] border border-[#801e38]/30 hover:bg-stone-100 px-3 py-1 rounded">Edit</button>
                    <button className="text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-200 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-stone-50 transition-colors">
                <td className="px-5 py-4 font-semibold text-stone-800">Ma. Luz Villanueva</td>
                <td className="px-5 py-4 text-stone-500 text-xs">m.villanueva@swu.phinma.edu.ph</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-0.5 rounded-full">Dashboard</span>
                    <span className="bg-[#f3e6ea] text-[#801e38] text-[10px] font-bold px-2 py-0.5 rounded-full">Departments & Programs</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-[11px] font-bold text-[#801e38] border border-[#801e38]/30 hover:bg-stone-100 px-3 py-1 rounded">Edit</button>
                    <button className="text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-200 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500 font-medium">+ Click "Add Super Admin" to create a new restricted admin account with custom module access.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Component */}
        <Header title="System Settings" breadcrumbs={['Settings']} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-stone-200 mb-6 pb-2">
            <button 
              onClick={() => setActiveTab('system')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'system' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 hover:text-stone-700'}`}
            >
              System Settings
            </button>
            <button 
              onClick={() => setActiveTab('storage')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'storage' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Storage Management
            </button>
            <button 
              onClick={() => setActiveTab('departments')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'departments' ? 'text-[#801e38] border-b-2 border-[#801e38]' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Departments & Programs
            </button>
          </div>

          {/* Conditional Rendering of Content */}
          <div className="pb-12">
            {activeTab === 'system' && renderSystemSettings()}
            {activeTab === 'storage' && renderStorageManagement()}
            {activeTab === 'departments' && <DepartmentsProgramsTab />}
          </div>
          
        </div>
      </main>
    </div>
  );
}
