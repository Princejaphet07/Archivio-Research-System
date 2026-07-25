import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
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
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch departments
      const deptsQuery = query(collection(db, 'departments'), orderBy('createdAt', 'desc'));
      const deptsSnapshot = await getDocs(deptsQuery);
      const deptsData = deptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch programs
      const progsQuery = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
      const progsSnapshot = await getDocs(progsQuery);
      const progsData = progsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch deans
      const deansQuery = query(collection(db, 'deans'), orderBy('createdAt', 'desc'));
      const deansSnapshot = await getDocs(deansQuery);
      const deansData = deansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('🔍 DEBUG - Departments:', deptsData);
      console.log('🔍 DEBUG - Programs:', progsData);
      console.log('🔍 DEBUG - Deans:', deansData);

      // Process departments with programs and deans
      const processedDepts = deptsData.map(dept => {
        const deptPrograms = progsData.filter(prog => prog.school === dept.name);
        const deptDeans = deansData.filter(dean => dean.department === dept.name);
        
        console.log(`📍 Processing ${dept.name}: Found ${deptPrograms.length} programs, ${deptDeans.length} deans`);
        
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
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="p-5 pt-3 border-t border-stone-100 group-hover:bg-stone-50 transition-colors">
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
                      <span key={idx} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {tag}
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
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
              <button 
                onClick={() => {
                  setActiveModal(null);
                  setSelectedDepartment(null);
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 transition"
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
                  onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
                  className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] text-stone-900"
                >
                  <option value="">Select School / College...</option>
                  <option value="College of IT & Engineering">College of IT & Engineering</option>
                  <option value="College of Dentistry">College of Dentistry</option>
                  <option value="Business School (B-School)">Business School (B-School)</option>
                  <option value="School of Health & Allied Health Sciences">School of Health & Allied Health Sciences</option>
                  <option value="College of Pre-Medicine">College of Pre-Medicine</option>
                  <option value="School of Design + Communication">School of Design + Communication</option>
                  <option value="College of Veterinary Medicine">College of Veterinary Medicine</option>
                  <option value="College of Rehabilitative Sciences">College of Rehabilitative Sciences</option>
                </select>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Initial Status
                </label>
                <select 
                  value={departmentForm.status}
                  onChange={(e) => setDepartmentForm({...departmentForm, status: e.target.value})}
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
                  onChange={(e) => setProgramForm({...programForm, school: e.target.value})}
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
