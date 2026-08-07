import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Reports({ activePage, onNavigate }) {
  const reportTypes = [
    { title: 'Research by Year', desc: 'Uploads by academic year', icon: '📅' },
    { title: 'Adviser Performance', desc: 'Per adviser breakdown', icon: '🧑‍🏫' },
    { title: 'Completion Status', desc: 'Requirements per group', icon: '✅', active: true },
    { title: 'Approved vs Pending', desc: 'Status comparison', icon: '⚖️' },
    { title: 'Published Archive', desc: 'All published research', icon: '🌐' },
    { title: 'Category Report', desc: 'By field of study', icon: '🏷️' },
  ];

  return (
    <div className="flex h-screen bg-[#fcfbfa] overflow-hidden font-sans antialiased">
      <Sidebar activePage="reports" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage="reports" />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Generate Reports</h1>
            <p className="text-xs text-stone-500 mt-0.5">Select a report type, apply filters, and export</p>
          </div>

          {/* Container Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-stone-800 mb-4">Report Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((type, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${type.active ? 'border-emerald-500 bg-emerald-50/10 shadow-sm ring-1 ring-emerald-500/20' : 'border-stone-200/70 hover:bg-stone-50'}`}>
                    <div className="flex items-start justify-between">
                      <span className="text-xl bg-stone-50 p-1.5 rounded-lg border border-stone-100">{type.icon}</span>
                      {type.active && <span className="text-emerald-600 bg-emerald-100/60 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>}
                    </div>
                    <h4 className="font-bold text-stone-800 text-xs mt-3">{type.title}</h4>
                    <p className="text-[10px] text-stone-400 mt-0.5">{type.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Filters Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-stone-800">Filters & Export</h3>
                <div className="flex items-center gap-2 font-bold text-[11px]">
                  <button className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-xl shadow-sm text-stone-600 flex items-center gap-1.5">🖨️ Print</button>
                  <button className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded-xl shadow-sm text-stone-600 flex items-center gap-1.5">📊 Excel</button>
                  <button className="px-4 py-1.5 bg-[#4a1024] hover:bg-[#6b1834] text-white rounded-xl shadow-sm flex items-center gap-1.5">📄 PDF</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Department</label>
                  <select className="w-full text-xs p-2 border border-stone-200/80 rounded-xl bg-stone-50 outline-none text-stone-700 font-medium">
                    <option>Information Technology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">School Year</label>
                  <select className="w-full text-xs p-2 border border-stone-200/80 rounded-xl bg-stone-50 outline-none text-stone-700 font-medium">
                    <option>2026–2027</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Adviser</label>
                  <select className="w-full text-xs p-2 border border-stone-200/80 rounded-xl bg-stone-50 outline-none text-stone-700 font-medium">
                    <option>All Advisers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Document Preview Placeholder */}
            <div className="border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 p-12 text-center flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">📊</span>
              <h4 className="font-bold text-stone-700 text-xs">Report Preview</h4>
              <p className="text-[10px] text-stone-400 max-w-xs mt-1">Apply filters and click Export to generate your document report visualization.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}