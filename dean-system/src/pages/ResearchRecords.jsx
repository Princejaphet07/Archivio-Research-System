import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

// ================= SAMPLE DATA =================
const ALL_RECORDS = [
  { id: '001', title: 'ML-Based Health Monitor', group: 'Group HealthAI', adviser: 'Dr. Cendana (You)', adviserSelf: true, category: 'ML', year: '2026-27', status: 'Pending', action: 'View' },
  { id: '002', title: 'Smart Irrigation System Using IoT', group: 'Group Innovatech', adviser: 'Ira Pongasi', adviserSelf: false, category: 'IoT', year: '2026-27', status: 'Published', action: 'View' },
  { id: '003', title: 'Predictive Analytics for Student Dropout', group: 'Group DataMinds', adviser: 'Almie Ilustrisimo', adviserSelf: false, category: 'ML', year: '2026-27', status: 'Approved', action: 'Publish' },
  { id: '004', title: 'Blockchain-Based Credential System', group: 'Group CTRL+TAB', adviser: 'Ira Pongasi', adviserSelf: false, category: 'Security', year: '2026-27', status: 'Published', action: 'View' },
  { id: '005', title: 'AR-Enhanced Campus Navigation', group: 'Group ITGirls', adviser: 'Almie Ilustrisimo', adviserSelf: false, category: 'Mobile', year: '2026-27', status: 'Pending', action: 'Review' },
  { id: '006', title: 'Sentiment Analysis Tool for Reviews', group: 'Group LangAI', adviser: 'Almie Ilustrisimo', adviserSelf: false, category: 'ML', year: '2026-27', status: 'Published', action: 'View' },
  { id: '007', title: 'AI-Driven Crop Yield Prediction', group: 'Group CTRL+C', adviser: 'Dr. Cendana (You)', adviserSelf: true, category: 'ML', year: '2025-26', status: 'Published', action: 'View' },
  { id: '008', title: 'Smart Parking System with IoT', group: 'Group ParkSmart', adviser: 'Ira Pongasi', adviserSelf: false, category: 'IoT', year: '2026-27', status: 'Approved', action: 'View' },
  { id: '009', title: 'Online Grading System for SWU', group: 'Group EduTech', adviser: 'Almie Ilustrisimo', adviserSelf: false, category: 'Web', year: '2025-26', status: 'Published', action: 'View' },
  { id: '010', title: 'Face Recognition Attendance System', group: 'Group VisionAI', adviser: 'Dr. Cendana (You)', adviserSelf: true, category: 'ML', year: '2026-27', status: 'Pending', action: 'Review' },
  { id: '011', title: 'E-Commerce Platform for Local Vendors', group: 'Group LocalBiz', adviser: 'Ira Pongasi', adviserSelf: false, category: 'Web', year: '2025-26', status: 'Published', action: 'View' },
  { id: '012', title: 'Mental Health Chatbot using NLP', group: 'Group MindCare', adviser: 'Almie Ilustrisimo', adviserSelf: false, category: 'ML', year: '2026-27', status: 'Approved', action: 'Publish' },
  { id: '013', title: 'Waste Segregation via Computer Vision', group: 'Group GreenTech', adviser: 'Dr. Cendana (You)', adviserSelf: true, category: 'ML', year: '2026-27', status: 'Pending', action: 'Review' },
  { id: '014', title: 'Digital Barangay Management System', group: 'Group CivicTech', adviser: 'Ira Pongasi', adviserSelf: false, category: 'Web', year: '2025-26', status: 'Published', action: 'View' },
];

const CATEGORY_COLORS = {
  ML: 'bg-purple-100 text-purple-700',
  IoT: 'bg-teal-100 text-teal-700',
  Security: 'bg-amber-100 text-amber-700',
  Mobile: 'bg-blue-100 text-blue-700',
  Web: 'bg-emerald-100 text-emerald-700',
  Data: 'bg-orange-100 text-orange-700',
};

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  Review: 'bg-red-50 text-red-700 border border-red-200',
};

const ACTION_STYLES = {
  View: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50',
  Publish: 'bg-[#7a1f3d] text-white hover:bg-[#5a162d]',
  Review: 'bg-[#7a1f3d] text-white hover:bg-[#5a162d]',
};

const RECORDS_PER_PAGE = 7;

const ALL_YEARS = ['All Years', '2026-27', '2025-26', '2024-25'];
const ALL_ADVISERS = ['All Advisers', 'Dr. Cendana (You)', 'Ira Pongasi', 'Almie Ilustrisimo'];
const ALL_STATUSES = ['All Statuses', 'Pending', 'Published', 'Approved'];
const ALL_CATEGORIES = ['All Categories', 'ML', 'IoT', 'Security', 'Mobile', 'Web'];

export default function ResearchRecords({ activePage, onNavigate }) {
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterAdviser, setFilterAdviser] = useState('All Advisers');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [currentPage, setCurrentPage] = useState(1);

  // ---- Filter logic ----
  const filtered = ALL_RECORDS.filter((r) => {
    const matchSearch =
      search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.group.toLowerCase().includes(search.toLowerCase()) ||
      r.adviser.toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 'All Years' || r.year === filterYear;
    const matchAdviser = filterAdviser === 'All Advisers' || r.adviser === filterAdviser;
    const matchStatus = filterStatus === 'All Statuses' || r.status === filterStatus;
    const matchCategory = filterCategory === 'All Categories' || r.category === filterCategory;
    return matchSearch && matchYear && matchAdviser && matchStatus && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex h-screen w-full bg-[#fcfbfa] overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage={activePage} />

        <main className="flex-1 overflow-y-auto p-8 bg-[#fbf9f6]">

          {/* ===== PAGE TITLE ===== */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">Research Records</h1>
              <p className="text-xs text-stone-400 mt-1 font-medium">
                All uploaded research within the College of IT &nbsp;·&nbsp; {ALL_RECORDS.length} total records
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50 transition-colors">
              <span>📤</span> Export CSV
            </button>
          </div>

          {/* ===== TABLE CARD ===== */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">

            {/* ---- Filter Bar ---- */}
            <div className="p-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center text-stone-400 text-xs pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search title, group, adviser..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#7a1f3d] focus:border-[#7a1f3d]"
                  />
                </div>

                {/* Filters */}
                {[
                  { value: filterCategory, setter: setFilterCategory, options: ALL_CATEGORIES },
                  { value: filterYear, setter: setFilterYear, options: ALL_YEARS },
                  { value: filterAdviser, setter: setFilterAdviser, options: ALL_ADVISERS },
                  { value: filterStatus, setter: setFilterStatus, options: ALL_STATUSES },
                ].map(({ value, setter, options }) => (
                  <div key={options[0]} className="relative">
                    <select
                      value={value}
                      onChange={handleFilterChange(setter)}
                      className="appearance-none bg-white border border-stone-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 outline-none focus:ring-1 focus:ring-[#7a1f3d] focus:border-[#7a1f3d] cursor-pointer"
                    >
                      {options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] pointer-events-none">▼</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Table ---- */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Adviser</th>
                    <th className="py-3 px-4 text-center">Category</th>
                    <th className="py-3 px-4 text-center">Year</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-stone-400 text-sm font-medium">
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((record) => (
                      <tr
                        key={record.id}
                        className={`transition-colors hover:bg-stone-50/80 ${record.adviserSelf ? 'border-l-2 border-l-[#f8d070]' : ''}`}
                      >
                        {/* # */}
                        <td className="py-3.5 px-4 text-stone-400 font-bold">{record.id}</td>

                        {/* Title */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-stone-900 text-[13px]">{record.title}</span>
                        </td>

                        {/* Group */}
                        <td className="py-3.5 px-4 text-stone-500 font-medium">{record.group}</td>

                        {/* Adviser */}
                        <td className="py-3.5 px-4">
                          <span className={record.adviserSelf ? 'font-bold text-[#7a1f3d]' : 'text-stone-600 font-medium'}>
                            {record.adviser}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${CATEGORY_COLORS[record.category] || 'bg-stone-100 text-stone-600'}`}>
                            {record.category}
                          </span>
                        </td>

                        {/* Year */}
                        <td className="py-3.5 px-4 text-center text-stone-500 font-medium">{record.year}</td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[record.status] || 'bg-stone-100 text-stone-600'}`}>
                            {record.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-sm ${ACTION_STYLES[record.action] || ACTION_STYLES.View}`}>
                            {record.action}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ---- Pagination Footer ---- */}
            <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50/30">
              <p className="text-[11px] text-stone-400 font-medium">
                Showing {paginated.length} of {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 text-xs font-bold hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors
                      ${currentPage === page
                        ? 'bg-[#7a1f3d] text-white shadow-sm'
                        : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 text-stone-500 text-xs font-bold hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}