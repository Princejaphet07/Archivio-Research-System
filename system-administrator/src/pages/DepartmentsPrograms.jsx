import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { db } from '../firebase/config';

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
  const [programForm, setProgramForm] = useState({ codes: [], school: '' });
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
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
          statusColor: dept.status === 'Active' ? 'bg-emerald-600' : dept.status === 'Pending' ? 'bg-[#801e38]' : 'bg-stone-200 text-stone-600',
          borderColor: dept.status === 'Active' ? 'border-emerald-500' : dept.status === 'Pending' ? 'border-[#801e38]' : 'border-stone-200'
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

    if (!departmentForm.name) {
      setError('Please select a school/college');
      return;
    }

    try {
      // Check if department already exists
      const existing = departments.find(d => d.name === departmentForm.name);
      if (existing) {
        setError('This department already exists');
        return;
      }

      // Save to Firestore
      await addDoc(collection(db, 'departments'), {
        name: departmentForm.name,
        status: departmentForm.status,
        createdAt: new Date().toISOString()
      });

      setSuccess('✅ Department added successfully!');
      setDepartmentForm({ name: '', status: 'Active' });
      setActiveModal(null);

      // Refresh data
      setTimeout(() => fetchAllData(), 500);
    } catch (error) {
      console.error('Error adding department:', error);
      setError('Failed to add department');
    }
  };

  const handleAddProgram = async () => {
    setError('');
    setSuccess('');

    if (!programForm.school || programForm.codes.length === 0) {
      setError('Please select college and program codes');
      return;
    }

    try {
      // Save each selected program code to Firestore
      for (const code of programForm.codes) {
        const programData = programCodeOptions.find(p => p.code === code);

        // Check if program already exists in this college
        const existing = programs.find(p => p.code === code && p.school === programForm.school);
        if (!existing) {
          await addDoc(collection(db, 'programs'), {
            code: code,
            name: programData.name,
            school: programForm.school,
            createdAt: new Date().toISOString()
          });
        }
      }

      setSuccess('✅ Programs added successfully!');
      setProgramForm({ codes: [], school: '' });
      setShowCodeDropdown(false);
      setActiveModal(null);

      // Refresh data
      setTimeout(() => fetchAllData(), 500);
    } catch (error) {
      console.error('Error adding programs:', error);
      setError('Failed to add programs');
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

      // Refresh all data in the background
      fetchAllData();
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

      // Refresh all data
      await fetchAllData();

      Swal.fire('Deleted!', `${dept.name} and all its programs have been permanently removed.`, 'success');
    } catch (error) {
      console.error('Error deleting department:', error);
      Swal.fire('Error', 'Failed to delete department. Please try again.', 'error');
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

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Department Button */}
          <button
            onClick={() => setActiveModal('department')}
            className="bg-[#801e38] hover:bg-[#601328] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Department
          </button>

          {/* Programs Button */}
          <button
            onClick={() => setActiveModal('program')}
            className="bg-[#801e38] hover:bg-[#601328] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Programs
          </button>
        </div>
      </div>

      {/* GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className={`bg-white rounded-2xl border-2 ${dept.borderColor} overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
            {/* Card Header with Status Badge */}
            <div className="p-5 pb-4 border-b border-stone-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-stone-900 group-hover:text-[#801e38] transition-colors line-clamp-2">{dept.name}</h3>
                <span className={`text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${dept.statusColor}`}>
                  {dept.status}
                </span>
              </div>
              <p className="text-xs text-stone-500">{dept.programsCount} program{dept.programsCount !== 1 ? 's' : ''} · {dept.deansCount} Dean{dept.deansCount !== 1 ? 's' : ''}</p>
            </div>

            {/* Programs Tags */}
            <div className="p-5 pb-4">
              {dept.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {dept.tags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">No programs added yet</p>
              )}
            </div>

            {/* Click to View Details Link */}
            <div className="p-5 pt-3 border-t border-stone-100 group-hover:bg-stone-50 transition-colors flex items-center justify-between">
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
          </div>
        ))}
      </div>

      {/* DEPARTMENT DETAILS MODAL */}
      {activeModal === 'details' && selectedDepartment && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">
                  {selectedDepartment.name}
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Status: <span className={`font-bold ${selectedDepartment.status === 'Active' ? 'text-emerald-600' : selectedDepartment.status === 'Pending' ? 'text-[#801e38]' : 'text-stone-500'}`}>{selectedDepartment.status}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedDepartment(null);
                }}
                className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Programs Section */}
              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-3">Programs ({selectedDepartment.programsCount})</h3>
                {selectedDepartment.tags && selectedDepartment.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDepartment.tags.map((tag, idx) => (
                      <span key={idx} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1.5 group">
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
                  <p className="text-sm text-stone-500">No programs assigned yet</p>
                )}
              </div>

              {/* Assigned Deans Section */}
              <div className="border-t border-stone-200 pt-6">
                <h3 className="text-lg font-bold text-stone-900 mb-3">Assigned Deans ({selectedDepartment.deansCount})</h3>
                {selectedDepartment.assignedDeans && selectedDepartment.assignedDeans.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDepartment.assignedDeans.map((dean, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                        <div className="w-10 h-10 rounded-full bg-[#801e38] text-white flex items-center justify-center font-bold text-sm">
                          {dean.displayName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-stone-900">{dean.displayName}</p>
                          <p className="text-xs text-stone-500">{dean.email}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${dean.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f3e6ea] text-[#801e38]'}`}>
                          {dean.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">No deans assigned to this department yet</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-stone-200 bg-stone-50">
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
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition cursor-pointer"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <span className="text-green-600">+</span> Add School / College
                </h2>
                <p className="text-xs text-stone-500 mt-1">Enter a new school or college in the system.</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
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
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  School / College Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                >
                  <option value="">Select School / College...</option>
                  <option value="College of Information Technology">College of Information Technology</option>
                  <option value="College of Engineering">College of Engineering</option>
                  <option value="College of Dentistry">College of Dentistry</option>
                  <option value="Business School (B-School)">Business School (B-School)</option>
                  <option value="School of Health & Allied Health Sciences">School of Health & Allied Health Sciences</option>
                  <option value="College of Pre-Medicine">College of Pre-Medicine</option>
                  <option value="School of Design + Communication">School of Design + Communication</option>
                  <option value="College of Veterinary Medicine">College of Veterinary Medicine</option>
                  <option value="College of Rehabilitative Sciences">College of Rehabilitative Sciences</option>
                  <option value="College of Nursing">College of Nursing</option>
                  <option value="College of Education">College of Education</option>
                </select>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Initial Status
                </label>
                <select
                  value={departmentForm.status}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
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
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <span className="text-green-600">+</span> Add New Program
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Add a program under {programForm.school || 'selected college'}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
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
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Select College <span className="text-red-500">*</span>
                </label>
                <select
                  value={programForm.school}
                  onChange={(e) => setProgramForm({ ...programForm, school: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                >
                  <option value="">Select College / School...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Program Code Dropdown with Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Program Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCodeDropdown(!showCodeDropdown)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-left text-stone-900 flex items-center justify-between focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38]"
                  >
                    <span>{programForm.codes.length > 0 ? `${programForm.codes.length} selected` : 'Select program codes...'}</span>
                    <svg className={`w-4 h-4 transition-transform ${showCodeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showCodeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {programCodeOptions.map((program) => (
                        <div key={program.code} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-b-0 cursor-pointer" onClick={() => toggleProgramCode(program.code)}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${programForm.codes.includes(program.code) ? 'bg-[#801e38] border-[#801e38]' : 'bg-white border-2 border-stone-300'}`}>
                            {programForm.codes.includes(program.code) && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-stone-900">{program.code}</p>
                            <p className="text-xs text-stone-500">{program.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">Select one or more program codes to add.</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-blue-600 text-sm font-bold">ℹ️</span>
                <p className="text-xs text-blue-800">
                  Selected programs will be immediately visible in Departments & Programs CMS.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProgram}
                disabled={programForm.codes.length === 0 || !programForm.school}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#801e38] hover:bg-[#601328] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>✓</span> Add Programs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
