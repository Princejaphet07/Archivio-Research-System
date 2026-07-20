import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import

// MOCK DATA PARA SA MGA CARDS
const initialDepartments = [
  { id: 1, name: 'College of IT & Engineering', status: 'Active', programsCount: 1, deansCount: 1, tags: ['BSIT'], statusColor: 'bg-emerald-600', borderColor: 'border-emerald-500' },
  { id: 2, name: 'College of Dentistry', status: 'Active', programsCount: 1, deansCount: 1, tags: ['DDM'], statusColor: 'bg-emerald-600', borderColor: 'border-emerald-500' },
  { id: 3, name: 'Business School (B-School)', status: 'Active', programsCount: 3, deansCount: 1, tags: ['BSBA', 'BSA', 'BSHRM'], statusColor: 'bg-emerald-600', borderColor: 'border-emerald-500' },
  { id: 4, name: 'School of Health & Allied Health Sciences', status: 'Pending', programsCount: 1, deansCount: 0, tags: ['BSN'], statusColor: 'bg-[#801e38]', borderColor: 'border-[#801e38]' },
  { id: 5, name: 'College of Pre-Medicine', status: 'Pending', programsCount: 2, deansCount: 0, tags: ['BS Pysch', 'BS Bio'], statusColor: 'bg-[#801e38]', borderColor: 'border-[#801e38]' },
  { id: 6, name: 'School of Design + Communication', status: 'Upcoming', programsCount: 0, deansCount: 0, tags: [], statusColor: 'bg-stone-200 text-stone-600', borderColor: 'border-stone-200' },
  { id: 7, name: 'College of Veterinary Medicine', status: 'Upcoming', programsCount: 0, deansCount: 0, tags: [], statusColor: 'bg-stone-200 text-stone-600', borderColor: 'border-stone-200' },
  { id: 8, name: 'College of Rehabilitative Sciences', status: 'Upcoming', programsCount: 0, deansCount: 0, tags: [], statusColor: 'bg-stone-200 text-stone-600', borderColor: 'border-stone-200' },
];

export default function DepartmentsPrograms() {
  const [departments] = useState(initialDepartments);

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
      
      <Sidebar />

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Component */}
        <Header title="Departments & Programs" breadcrumbs={['CMS']} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-3xl font-serif font-bold text-stone-900 mb-1">Departments & Programs</h3>
              <p className="text-sm text-stone-500">Auto-populated when Dean accounts are created. Click any card to view and edit details.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-[#801e38] hover:bg-[#601328] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                <span>+</span> Add School / College
              </button>
              <button className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                <span>📥</span> Export
              </button>
            </div>
          </div>

          {/* GRID CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map((dept) => (
              <div 
                key={dept.id} 
                className={`bg-white rounded-xl shadow-sm border border-stone-200 border-t-4 ${dept.borderColor} flex flex-col p-5 hover:shadow-md transition-shadow cursor-pointer group`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-stone-800 leading-tight pr-2">{dept.name}</h4>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${dept.statusColor} ${dept.status === 'Active' ? 'text-white' : (dept.status === 'Pending' ? 'text-white' : '')}`}>
                    {dept.status}
                  </span>
                </div>
                
                <p className="text-xs text-stone-500 mb-4">
                  {dept.programsCount} program{dept.programsCount !== 1 ? 's' : ''} {dept.deansCount > 0 ? ` · ${dept.deansCount} Dean` : ''}
                </p>

                <div className="flex-1">
                  {dept.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dept.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-[#801e38]/10 text-[#801e38]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic mt-2">
                      No Dean account created yet — go to Dean Onboarding to get started.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100">
                  <span className="text-xs font-bold text-[#801e38] group-hover:text-[#601328] transition-colors flex items-center gap-1">
                    Click to view details <span className="text-lg leading-none transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}