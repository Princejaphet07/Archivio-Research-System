import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { db } from '../firebase/config';
import { Card, PremiumButton } from '../../components/ui/Card';
import CardSkeleton from '../components/skeletons/CardSkeleton';

// Program code options for the dropdown
const programCodeOptions = [
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
  { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
  { code: 'BSMA', name: 'Bachelor of Science in Mathematics' },
  { code: 'BSBA', name: 'Bachelor of Science in Business Administration' },
  { code: 'BSA', name: 'Bachelor of Science in Accountancy' },
  { code: 'BSHRM', name: 'Bachelor of Science in Hotel & Restaurant Management' },
  { code: 'DDM', name: 'Doctor of Dental Medicine' },
  { code: 'BSN', name: 'Bachelor of Science in Nursing' },
  { code: 'BSPE', name: 'Bachelor of Science in Physical Education' },
  { code: 'BSPS', name: 'Bachelor of Science in Psychology' },
];

export default function DepartmentsProgramsTab() {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', status: 'Active' });
  const [programForm, setProgramForm] = useState({ school: '', code: '', name: '' });
  const [deans, setDeans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all data from Firestore on mount
  useEffect(() => {
    let deptsData = [];
    let progsData = [];
    let deansData = [];

    const processData = () => {
      const processedDepts = deptsData.map(dept => {
        const deptPrograms = progsData.filter(prog => prog.school === dept.name);
        const deptDeans = deansData.filter(dean => dean.department === dept.name);
        
        return {
          ...dept,
          programsCount: deptPrograms.length,
          deansCount: deptDeans.length,
          tags: deptPrograms.map(p => p.code),
          assignedDeans: deptDeans,
          statusColor: dept.status === 'Active' ? 'bg-emerald-600' : dept.status === 'Pending' ? 'bg-[#801e38]' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
          borderColor: dept.status === 'Active' ? 'border-emerald-500' : dept.status === 'Pending' ? 'border-[#801e38]' : 'border-stone-200 dark:border-stone-700'
        };
      });

      setDepartments(processedDepts);
      setPrograms(progsData);
      setDeans(deansData);
      setLoading(false);
    };

    setLoading(true);

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      deptsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                     .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      processData();
    }, (err) => { console.error('Error fetching departments:', err); setError('Failed to load data'); });

    const unsubProgs = onSnapshot(collection(db, 'programs'), (snap) => {
      progsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                     .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      processData();
    }, (err) => { console.error('Error fetching programs:', err); setError('Failed to load data'); });

    const unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
      deansData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                     .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      processData();
    }, (err) => { console.error('Error fetching deans:', err); setError('Failed to load data'); });

    return () => {
      unsubDepts();
      unsubProgs();
      unsubDeans();
    };
  }, []);

  const handleAddDepartment = async () => {
    setError('');
    setSuccess('');

    if (!departmentForm.name || !departmentForm.name.trim()) {
      setError('Please enter a school or college name');
      return;
    }

    const trimmedName = departmentForm.name.trim();

    try {
      // Check if department already exists
      const existing = departments.find(d => d.name.toLowerCase() === trimmedName.toLowerCase());
      if (existing) {
        setError('This department already exists');
        return;
      }

      // Save to Firestore
      await addDoc(collection(db, 'departments'), {
        name: trimmedName,
        status: departmentForm.status || 'Active',
        createdAt: new Date().toISOString()
      });

      setSuccess('✅ Department added successfully!');
      setDepartmentForm({ name: '', status: 'Active' });
      setActiveModal(null);
    } catch (error) {
      console.error('Error adding department:', error);
      setError('Failed to add department');
    }
  };

  const handleAddProgram = async () => {
    setError('');
    setSuccess('');

    const schoolName = (programForm.school || '').trim();
    const progCode = (programForm.code || '').trim().toUpperCase();
    const progName = (programForm.name || '').trim();

    if (!schoolName) {
      setError('Please select or enter a college/school');
      return;
    }

    if (!progCode) {
      setError('Please enter a program code (e.g. BSIT)');
      return;
    }

    try {
      // Support comma-separated codes if admin entered multiple, e.g. "BSIT, BSCS"
      const codes = progCode.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      
      let addedCount = 0;
      for (const code of codes) {
        // Check if program already exists in this college
        const existing = programs.find(p => p.code === code && (p.school || '').toLowerCase() === schoolName.toLowerCase());
        if (!existing) {
          const finalName = (codes.length === 1 && progName)
            ? progName
            : (programCodeOptions.find(p => p.code === code)?.name || (progName || code));

          await addDoc(collection(db, 'programs'), {
            code: code,
            name: finalName,
            school: schoolName,
            department: schoolName,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }

      // Ensure the department exists in departments collection so cards display it
      const deptExists = departments.some(d => d.name.toLowerCase() === schoolName.toLowerCase());
      if (!deptExists) {
        await addDoc(collection(db, 'departments'), {
          name: schoolName,
          status: 'Active',
          createdAt: new Date().toISOString()
        });
      }

      if (addedCount === 0) {
        setError('The program code already exists under this college');
        return;
      }

      setSuccess('✅ Program added successfully!');
      setProgramForm({ school: '', code: '', name: '' });
      setActiveModal(null);
    } catch (error) {
      console.error('Error adding programs:', error);
      setError('Failed to add program');
    }
  };

  const handleDeleteProgram = async (programCode, departmentName) => {
    const result = await Swal.fire({
      title: 'Delete Program?',
      html: `Are you sure you want to permanently delete <b>${programCode}</b> from <b>${departmentName}</b>?<br/><br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      // Find the program document by code + school
      const q = query(
        collection(db, 'programs'),
        where('code', '==', programCode),
        where('school', '==', departmentName)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Swal.fire('Not Found', 'Program not found in database.', 'error');
        return;
      }

      // Delete all matching documents (should be 1)
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'programs', docSnap.id));
      }

      Swal.fire('Deleted!', `${programCode} has been permanently removed.`, 'success');

      // Update the selected department tags in real-time (so UI updates instantly)
      setSelectedDepartment(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== programCode),
        programsCount: prev.programsCount - 1
      }));
    } catch (error) {
      console.error('Error deleting program:', error);
      Swal.fire('Error', 'Failed to delete program. Please try again.', 'error');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    const result = await Swal.fire({
      title: 'Delete Entire Department?',
      html: `<div style="text-align:left;font-size:14px;">
        <p style="margin-bottom:12px;">You are about to permanently delete <b>${dept.name}</b> and everything connected to it:</p>
        <ul style="list-style:disc;padding-left:20px;color:#991b1b;">
          <li><b>${dept.programsCount || 0}</b> program(s) will be deleted</li>
          <li><b>${dept.deansCount || 0}</b> dean assignment(s) will be affected</li>
        </ul>
        <p style="margin-top:12px;color:#991b1b;font-weight:bold;">⚠️ This action cannot be undone!</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete everything!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    // Double confirmation for safety
    const confirm2 = await Swal.fire({
      title: 'Final Confirmation',
      text: `Type the department name to confirm: ${dept.name}`,
      input: 'text',
      inputPlaceholder: dept.name,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete Permanently',
      inputValidator: (value) => {
        if (value !== dept.name) {
          return 'Department name does not match!';
        }
      }
    });

    if (!confirm2.isConfirmed) return;

    try {
      Swal.fire({ title: 'Deleting...', text: 'Removing department and all connected data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      // 1. Delete all programs belonging to this department
      const progsQuery = query(
        collection(db, 'programs'),
        where('school', '==', dept.name)
      );
      const progsSnap = await getDocs(progsQuery);
      for (const progDoc of progsSnap.docs) {
        await deleteDoc(doc(db, 'programs', progDoc.id));
      }

      // 2. Delete the department document itself
      await deleteDoc(doc(db, 'departments', dept.id));

      // Close modal if it was open for this department
      setActiveModal(null);
      setSelectedDepartment(null);

      Swal.fire('Deleted!', `${dept.name} and all its programs have been permanently removed.`, 'success');
    } catch (error) {
      console.error('Error deleting department:', error);
      Swal.fire('Error', 'Failed to delete department. ' + (error.message || 'Please try again.'), 'error');
    }
  };

  const toggleProgramCode = (code) => {
    setProgramForm(prev => ({
      ...prev,
      codes: prev.codes.includes(code)
        ? prev.codes.filter(c => c !== code)
        : [...prev.codes, code]
    }));
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-32 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Department Button */}
          <PremiumButton onClick={() => setActiveModal('department')} variant="primary" icon={<span>+</span>}>
            Department
          </PremiumButton>

          {/* Programs Button */}
          <PremiumButton onClick={() => setActiveModal('program')} variant="primary" icon={<span>+</span>}>
            Programs
          </PremiumButton>
        </div>
      </div>

      {/* GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className={`border-2 ${dept.borderColor} overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col`}>
            {/* Card Header with Status Badge */}
            <div className="p-5 pb-4 border-b border-stone-100 dark:border-stone-800/50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-stone-900 dark:text-stone-50 group-hover:text-[#801e38] transition-colors line-clamp-2">{dept.name}</h3>
                <span className={`text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${dept.statusColor}`}>
                  {dept.status}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">{dept.programsCount} program{dept.programsCount !== 1 ? 's' : ''} · {dept.deansCount} Dean{dept.deansCount !== 1 ? 's' : ''}</p>
            </div>

            {/* Programs Tags */}
            <div className="p-5 pb-4">
              {dept.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dept.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">No programs added yet</p>
              )}
            </div>

            {/* Click to View Details Link */}
            <div className="p-5 pt-3 border-t border-stone-100 dark:border-stone-800/50 group-hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors flex items-center justify-between mt-auto">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedDepartment(dept);
                  setActiveModal('details');
                }}
                className="text-sm font-bold text-[#801e38] hover:text-[#601328] flex items-center gap-1.5 group/link"
              >
                Click to view details
                <svg className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDepartment(dept);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                title={`Delete ${dept.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* DEPARTMENT DETAILS MODAL */}
      {activeModal === 'details' && selectedDepartment && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-700">
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
                  {selectedDepartment.name}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Status: <span className={`font-bold ${selectedDepartment.status === 'Active' ? 'text-emerald-600' : selectedDepartment.status === 'Pending' ? 'text-[#801e38]' : 'text-stone-500 dark:text-stone-400'}`}>{selectedDepartment.status}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedDepartment(null);
                }}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Programs Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">Programs ({selectedDepartment.programsCount})</h3>
                  <button
                    onClick={() => {
                      setProgramForm({ school: selectedDepartment.name, code: '', name: '' });
                      setError('');
                      setSuccess('');
                      setActiveModal('program');
                    }}
                    className="text-xs font-bold text-[#801e38] hover:text-[#601328] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Add Program
                  </button>
                </div>
                {selectedDepartment.tags && selectedDepartment.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDepartment.tags.map((tag, idx) => (
                      <span key={idx} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 flex items-center gap-1.5 group">
                        {tag}
                        <button
                          onClick={() => handleDeleteProgram(tag, selectedDepartment.name)}
                          className="w-4 h-4 rounded-full bg-stone-300 hover:bg-red-500 text-white flex items-center justify-center text-[10px] leading-none transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
                          title={`Delete ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 dark:text-stone-400">No programs assigned yet</p>
                )}
              </div>

              {/* Assigned Deans Section */}
              <div className="border-t border-stone-200 dark:border-stone-700 pt-6">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50 mb-3">Assigned Deans ({selectedDepartment.deansCount})</h3>
                {selectedDepartment.assignedDeans && selectedDepartment.assignedDeans.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDepartment.assignedDeans.map((dean, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-[#252525] rounded-lg border border-stone-100 dark:border-stone-800/50">
                        <div className="w-10 h-10 rounded-full bg-[#801e38] text-white flex items-center justify-center font-bold text-sm">
                          {dean.displayName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{dean.displayName}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{dean.email}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${dean.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f3e6ea] text-[#801e38]'}`}>
                          {dean.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 dark:text-stone-400">No deans assigned to this department yet</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#252525]">
              <button
                onClick={() => handleDeleteDepartment(selectedDepartment)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Department
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedDepartment(null);
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-[#1e1e1e] border border-stone-300 hover:bg-stone-100 dark:bg-stone-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {activeModal === 'department' && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-700">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <span className="text-green-600">+</span> Add School / College
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Enter a new school or college in the system.</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-green-500 text-sm">✅</span>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* School / College Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  School / College Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. College of Information Technology"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 dark:text-stone-50 placeholder-stone-400"
                  autoFocus
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Type the name of the school or college manually.
                </p>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  Initial Status
                </label>
                <select
                  value={departmentForm.status}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value })}
                  className="w-full bg-white dark:bg-[#1e1e1e] border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 dark:text-stone-50"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>ℹ️ Note:</strong> A Dean account can be assigned to this school/college after creation.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#252525]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-[#1e1e1e] border border-stone-300 hover:bg-stone-100 dark:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition"
              >
                Save School / College
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRAM MODAL */}
      {activeModal === 'program' && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-700">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <span className="text-green-600">+</span> Add New Program
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Add a program under {programForm.school || 'selected college'}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-green-500 text-sm">✅</span>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Select School First */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  Select College <span className="text-red-500">*</span>
                </label>
                <select
                  value={programForm.school}
                  onChange={(e) => setProgramForm({ ...programForm, school: e.target.value })}
                  className="w-full bg-white dark:bg-[#1e1e1e] border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 dark:text-stone-50"
                >
                  <option value="">Select College / School...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Program Code Manual Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  Program Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BSIT"
                  value={programForm.code}
                  onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                  className="w-full bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 dark:text-stone-50 placeholder-stone-400 uppercase font-mono font-semibold"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Type the program code manually (e.g. BSIT, BSCS, BSN).
                </p>
              </div>

              {/* Program Name Manual Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  Program Name / Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900 dark:text-stone-50 placeholder-stone-400"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Full name of the degree program.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">ℹ️</span>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  New programs will be immediately visible under the assigned department and across the system.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#252525]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-[#1e1e1e] border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProgram}
                disabled={!programForm.code?.trim() || !programForm.school?.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>✓</span> Save Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
