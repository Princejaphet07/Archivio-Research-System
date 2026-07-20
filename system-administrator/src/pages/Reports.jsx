import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import

const reportTypes = [
  {
    id: 'published',
    icon: '📄',
    title: 'Published Papers',
    desc: 'Papers published to the archive by year, department, and type. Track research output trends.',
  },
  {
    id: 'users',
    icon: '👥',
    title: 'User Accounts',
    desc: 'All users breakdown by role, department, and status. Active vs pending analysis.',
  },
  {
    id: 'dept',
    icon: '🏛️',
    title: 'Department Performance',
    desc: 'Number of papers published, endorsed, and pending approval per department.',
  },
];

// --- MOCK DATA ---
const publishedData = [
  { id: '01', title: 'AI-Driven Health Monitoring System', dept: 'IT & Engineering', cat: 'AI & Machine Learning', sy: '2025-26', date: 'May 2026' },
  { id: '02', title: 'Blockchain-Based Credential System', dept: 'IT & Engineering', cat: 'Cybersecurity', sy: '2025-26', date: 'Apr 2026' },
  { id: '03', title: 'Patient Oral Health Records Application', dept: 'Dentistry', cat: 'Healthcare', sy: '2025-26', date: 'Mar 2026' },
  { id: '04', title: 'Predictive Student Dropout Model', dept: 'Business School', cat: 'Data Science & Analytics', sy: '2025-26', date: 'Mar 2026' },
  { id: '05', title: 'Smart Irrigation System Using IoT', dept: 'IT & Engineering', cat: 'Computer Science & IT', sy: '2024-25', date: 'Feb 2026' },
];

const usersData = [
  { id: '01', name: 'Prof. Ana Aquino', role: 'Advisor', dept: 'IT & Engineering', prog: 'BSIT', date: 'Aug 12, 2025', login: '1 hr ago', status: 'Active' },
  { id: '02', name: 'Ana L. Dela Cruz', role: 'Student', dept: 'IT & Engineering', prog: 'BSIT', date: 'Sep 3, 2025', login: '3 hrs ago', status: 'Active' },
  { id: '03', name: 'Dr. Ben Cruz', role: 'Advisor', dept: 'Dentistry', prog: 'DDM', date: 'Aug 10, 2025', login: '5 hrs ago', status: 'Active' },
  { id: '04', name: 'Prof. Celia Dela Cruz', role: 'Advisor', dept: 'Business School', prog: 'BSBA', date: 'Aug 10, 2025', login: '2 days ago', status: 'Active' },
  { id: '05', name: 'Dr. Elena Reyes', role: 'Dean', dept: 'Dentistry', prog: '—', date: 'Aug 5, 2025', login: '3 hrs ago', status: 'Active' },
];

const deptData = [
  { dept: 'College of IT & Engineering', sub: 38, pub: 35, end: 36, pend: 2, rate: '92.1%', status: 'On Track' },
  { dept: 'College of Dentistry', sub: 48, pub: 45, end: 46, pend: 1, rate: '93.8%', status: 'On Track' },
  { dept: 'Business School (B-School)', sub: 30, pub: 28, end: 29, pend: 2, rate: '93.3%', status: 'On Track' },
  { dept: 'School of Health & Allied', sub: 0, pub: 0, end: 0, pend: 0, rate: '—', status: 'Pending Setup' },
];

export default function Reports() {
  const [selected, setSelected] = useState(null);

  // Reusable Pill Components
  const DeptPill = ({ text }) => (
    <span className="px-3 py-1 bg-[#f3e6ea] text-[#801e38] rounded-full text-[11px] font-bold whitespace-nowrap">{text}</span>
  );
  
  const RolePill = ({ role }) => {
    const colors = {
      Advisor: 'bg-amber-50 text-amber-600',
      Student: 'bg-blue-50 text-blue-600',
      Dean: 'bg-red-50 text-red-600',
    };
    return <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${colors[role] || 'bg-stone-100 text-stone-600'}`}>{role}</span>;
  };

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Component */}
        <Header title="Reports" breadcrumbs={['Reports']} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          <div className="mb-6">
            <h3 className="text-3xl font-serif font-bold text-stone-900 mb-1">Reports</h3>
            <p className="text-sm text-stone-500">Generate, view, and export reports across the ARCHIVIO system.</p>
          </div>

          {/* REPORT TYPE SELECTOR */}
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-4">SELECT REPORT TYPE</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {reportTypes.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  selected === r.id
                    ? 'border-[#801e38] bg-white shadow-md'
                    : 'border-transparent bg-white shadow-sm hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected === r.id ? 'border-[#801e38]' : 'border-stone-300'}`}>
                    {selected === r.id && <div className="w-2 h-2 rounded-full bg-[#801e38]"></div>}
                  </div>
                </div>
                <h4 className="font-bold text-stone-900 mb-1">{r.title}</h4>
                <p className="text-xs text-stone-500 leading-relaxed">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* DYNAMIC REPORT CONTENT */}
          {selected && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-stone-900 mb-1">
                    {selected === 'published' && 'Published Papers Report'}
                    {selected === 'users' && 'System Users per School Year'}
                    {selected === 'dept' && 'Department Performance Report'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {selected === 'published' && 'All research papers published to the ARCHIVIO archive'}
                    {selected === 'users' && 'Registered participants by role, department, and program - sorted alphabetically'}
                    {selected === 'dept' && 'SY 2025-2026 • All Departments • Showing: Published, Endorsed, and Pending Approval'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all shadow-sm">
                    🖨️ Print Report
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#801e38] hover:bg-[#601328] text-white rounded-lg text-sm font-bold transition-all shadow-sm">
                    📤 Export PDF
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#3b1220] hover:bg-[#2b0d16] text-white rounded-lg text-sm font-bold transition-all shadow-sm">
                    📥 Export CSV ▾
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {selected === 'published' && (
                  <>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All SY ▾</option></select>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All Departments ▾</option></select>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All Categories ▾</option></select>
                  </>
                )}
                {selected === 'users' && (
                  <>
                    <select className="px-4 py-2 bg-white border border-[#801e38] rounded-lg text-sm text-[#801e38] font-bold outline-none"><option>SY 2025-2026</option></select>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All Roles</option></select>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All Status</option></select>
                  </>
                )}
                {selected === 'dept' && (
                  <>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All SY ▾</option></select>
                    <select className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 outline-none"><option>All Departments ▾</option></select>
                  </>
                )}
                <button className="px-4 py-2 text-sm font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50">
                  Reset Filters
                </button>
              </div>

              {/* Stats Cards */}
              <div className={`grid gap-4 mb-8 ${selected === 'published' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {selected === 'published' && (
                  <>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-[#801e38] p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-[#801e38]">108</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Total Published</p>
                      <p className="text-[11px] text-stone-400">All time • all departments</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-blue-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-blue-600">9</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Published This SY</p>
                      <p className="text-[11px] text-stone-400">SY 2025-2026 in progress</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-amber-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-amber-600">10</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Research Categories</p>
                      <p className="text-[11px] text-stone-400">Across all published papers</p>
                    </div>
                  </>
                )}
                {selected === 'users' && (
                  <>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-[#801e38] p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-[#801e38]">238</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Total Users This SY</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-stone-300 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-stone-700">3</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Deans</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-amber-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-amber-600">25</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Research Advisers</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-blue-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-blue-600">210</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Students</p>
                    </div>
                  </>
                )}
                {selected === 'dept' && (
                  <>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-[#801e38] p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-[#801e38]">116</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Total Submissions</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-emerald-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-emerald-600">108</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Published</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-blue-500 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-blue-600">111</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Endorsed to Dean</p>
                    </div>
                    <div className="bg-white border border-stone-200 border-t-4 border-t-red-900 p-5 rounded-xl shadow-sm">
                      <p className="text-4xl font-serif font-bold text-[#3b1220]">5</p>
                      <p className="text-xs font-bold text-stone-900 mt-1">Pending Approval</p>
                    </div>
                  </>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm mb-6">
                
                {/* Custom Card Headers based on report */}
                {selected === 'published' && (
                  <div className="p-5 border-b border-stone-200 bg-white">
                    <h4 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Published Papers
                    </h4>
                    <p className="text-xs text-stone-500 ml-3">All published research • sorted by most recently published</p>
                  </div>
                )}
                {selected === 'users' && (
                  <div className="p-5 border-b border-stone-200 bg-white">
                    <h4 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Registered Users • SY 2025–2026
                    </h4>
                    <p className="text-xs text-stone-500 ml-3">Sorted alphabetically by first name • all roles included</p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#801e38] text-white text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        {selected === 'published' && (
                          <>
                            <th className="py-3 px-5">#</th>
                            <th className="py-3 px-5">Research Title</th>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Category</th>
                            <th className="py-3 px-5">School Year</th>
                            <th className="py-3 px-5">Date Published</th>
                          </>
                        )}
                        {selected === 'users' && (
                          <>
                            <th className="py-3 px-5">#</th>
                            <th className="py-3 px-5">Name ↑</th>
                            <th className="py-3 px-5">Role</th>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Program</th>
                            <th className="py-3 px-5">Date Registered</th>
                            <th className="py-3 px-5">Last Login</th>
                            <th className="py-3 px-5">Status</th>
                          </>
                        )}
                        {selected === 'dept' && (
                          <>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Total Submissions</th>
                            <th className="py-3 px-5">Published</th>
                            <th className="py-3 px-5">Endorsed to Dean</th>
                            <th className="py-3 px-5">Pending Approval</th>
                            <th className="py-3 px-5">Publication Rate</th>
                            <th className="py-3 px-5">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-sm text-stone-700 divide-y divide-stone-100">
                      {/* Render rows based on selected */}
                      {selected === 'published' && publishedData.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-4 px-5 text-stone-400">{row.id}</td>
                          <td className="py-4 px-5 font-semibold text-stone-900">{row.title}</td>
                          <td className="py-4 px-5"><DeptPill text={row.dept} /></td>
                          <td className="py-4 px-5">{row.cat}</td>
                          <td className="py-4 px-5">{row.sy}</td>
                          <td className="py-4 px-5 font-bold text-[#801e38] text-xs">{row.date}</td>
                        </tr>
                      ))}

                      {selected === 'users' && usersData.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-4 px-5 text-stone-400">{row.id}</td>
                          <td className="py-4 px-5 font-semibold text-stone-900">{row.name}</td>
                          <td className="py-4 px-5"><RolePill role={row.role} /></td>
                          <td className="py-4 px-5 text-xs">{row.dept}</td>
                          <td className="py-4 px-5 text-xs text-stone-500">{row.prog}</td>
                          <td className="py-4 px-5 text-xs">{row.date}</td>
                          <td className="py-4 px-5 text-xs">{row.login}</td>
                          <td className="py-4 px-5 text-emerald-600 font-semibold text-xs">{row.status}</td>
                        </tr>
                      ))}

                      {selected === 'dept' && deptData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 transition-colors">
                          <td className="py-4 px-5 font-semibold text-stone-900">{row.dept}</td>
                          <td className="py-4 px-5">{row.sub}</td>
                          <td className="py-4 px-5 font-bold text-emerald-600">{row.pub}</td>
                          <td className="py-4 px-5 font-bold text-blue-600">{row.end}</td>
                          <td className="py-4 px-5">
                            {row.pend > 0 ? (
                              <span className="bg-red-50 text-[#801e38] px-3 py-1 rounded-full text-[11px] font-bold">{row.pend}</span>
                            ) : 0}
                          </td>
                          <td className="py-4 px-5">
                            {row.rate !== '—' ? (
                              <span className="border border-emerald-200 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold">{row.rate}</span>
                            ) : '—'}
                          </td>
                          <td className="py-4 px-5">
                            {row.status === 'On Track' ? (
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold">On Track</span>
                            ) : (
                              <span className="text-stone-400 text-xs italic">Pending Setup</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination / Footer */}
                {(selected === 'published' || selected === 'users') && (
                  <div className="flex items-center justify-between p-4 bg-white border-t border-stone-100">
                    <p className="text-xs text-stone-500">
                      Showing 1–{selected === 'published' ? '10 of 108 published papers' : '10 of 238 registered users this SY'}
                    </p>
                    <div className="flex gap-1">
                      <button className="px-3 py-1 text-sm border border-stone-200 rounded text-stone-400 hover:bg-stone-50">‹</button>
                      <button className="px-3 py-1 text-sm bg-[#801e38] text-white rounded font-bold">1</button>
                      <button className="px-3 py-1 text-sm border border-stone-200 rounded text-stone-600 hover:bg-stone-50">2</button>
                      <button className="px-3 py-1 text-sm border border-stone-200 rounded text-stone-600 hover:bg-stone-50">3</button>
                      <span className="px-2 py-1 text-stone-400">...</span>
                      <button className="px-3 py-1 text-sm border border-stone-200 rounded text-stone-600 hover:bg-stone-50">
                        {selected === 'published' ? '11' : '24'}
                      </button>
                      <button className="px-3 py-1 text-sm border border-stone-200 rounded text-stone-600 hover:bg-stone-50">›</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Department Performance - Bar Chart Section */}
              {selected === 'dept' && (
                <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm mb-6">
                   <div className="mb-6">
                    <h4 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Published, Endorsed & Pending — Department Breakdown
                    </h4>
                    <p className="text-xs text-stone-500 ml-3">Clustered bars per department • each bar represents one metric • SY 2025–2026</p>
                  </div>

                  <div className="relative pl-32 py-4 border-l border-b border-stone-200">
                    {/* Grid lines */}
                    <div className="absolute inset-0 left-32 flex justify-between pointer-events-none">
                      {[0,10,20,30,40,50].map((v, i) => (
                         <div key={i} className="h-full border-r border-stone-100 flex-1 relative">
                            <span className="absolute -top-6 -right-2 text-[10px] text-stone-400">{v === 0 ? '0' : v}</span>
                         </div>
                      ))}
                    </div>

                    {/* Chart Rows */}
                    <div className="space-y-6 relative z-10 pt-2">
                      {/* Row 1 */}
                      <div className="relative">
                        <span className="absolute -left-32 top-3 text-xs font-bold text-stone-700 w-28 text-right">IT & Engineering</span>
                        <div className="space-y-1">
                          <div className="h-3 bg-[#16a34a] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '70%' }}>35</div>
                          <div className="h-3 bg-[#2563eb] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '72%' }}>36</div>
                          <div className="h-3 bg-[#801e38] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '4%' }}>2</div>
                        </div>
                      </div>
                      
                      {/* Row 2 */}
                      <div className="relative">
                        <span className="absolute -left-32 top-3 text-xs font-bold text-stone-700 w-28 text-right">Dentistry</span>
                        <div className="space-y-1">
                          <div className="h-3 bg-[#16a34a] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '90%' }}>45</div>
                          <div className="h-3 bg-[#2563eb] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '92%' }}>46</div>
                          <div className="h-3 bg-[#801e38] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '2%' }}>1</div>
                        </div>
                      </div>

                      {/* Row 3 */}
                      <div className="relative">
                        <span className="absolute -left-32 top-3 text-xs font-bold text-stone-700 w-28 text-right">Business School</span>
                        <div className="space-y-1">
                          <div className="h-3 bg-[#16a34a] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '56%' }}>28</div>
                          <div className="h-3 bg-[#2563eb] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '58%' }}>29</div>
                          <div className="h-3 bg-[#801e38] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold" style={{ width: '4%' }}>2</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex gap-6 mt-6">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#16a34a] rounded-sm"></span><span className="text-xs text-stone-600">Published</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#2563eb] rounded-sm"></span><span className="text-xs text-stone-600">Endorsed to Dean</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#801e38] rounded-sm"></span><span className="text-xs text-stone-600">Pending Approval</span></div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* EMPTY STATE */}
          {!selected && (
            <div className="bg-stone-100/60 border border-stone-200 rounded-2xl min-h-[340px] flex flex-col items-center justify-center p-10 mt-6 relative">
              <div className="text-center">
                <div className="flex items-end justify-center gap-2 mb-6 h-20">
                  <div className="w-6 bg-[#d6a0b0] rounded-t-md" style={{ height: '40%' }}></div>
                  <div className="w-6 bg-[#801e38] rounded-t-md" style={{ height: '80%' }}></div>
                  <div className="w-6 bg-[#d6a0b0] rounded-t-md" style={{ height: '55%' }}></div>
                </div>
                <h4 className="text-xl font-serif font-bold text-stone-800 mb-2">No Report Selected</h4>
                <p className="text-sm text-stone-400">Select a report type above to generate and view data.</p>
              </div>
              <p className="absolute bottom-10 text-[11px] text-stone-400 italic">
                Tip: Use the filters above to narrow down results by school year, department, or role once a report is selected.
              </p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}