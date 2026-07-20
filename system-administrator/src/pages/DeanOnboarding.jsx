import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import

// MOCK DATA: Pwede nimo ilisan ug data gikan sa imong API/Database puhon
const initialDeans = [
  { id: 1, name: 'Dr. Diseree Cendana', email: 'dean.cendana@swu.phinma.edu.ph', dept: 'College of IT', roles: ['Dean', 'Adviser'], status: 'Active', created: 'May 14, 2025' },
  { id: 2, name: 'Dr. Michelle Yu', email: 'dean.yu@swu.phinma.edu.ph', dept: 'College of Nursing', roles: ['Dean'], status: 'Pending', created: 'May 16, 2025' },
  { id: 3, name: 'Dr. Roberto Lim', email: 'dean.lim@swu.phinma.edu.ph', dept: 'College of Business Administration', roles: ['Dean'], status: 'Active', created: 'Apr 28, 2025' },
  { id: 4, name: 'Dr. Rodivick Docor', email: 'dean.docor@swu.phinma.edu.ph', dept: 'College of Dentistry', roles: ['Dean', 'Adviser'], status: 'Active', created: 'May 14, 2025' },
  { id: 5, name: 'Dr. Ana Gutierrez', email: 'dean.gutierrez@swu.phinma.edu.ph', dept: 'College of Pre-Medicine', roles: ['Dean', 'Adviser'], status: 'Pending', created: 'May 14, 2025' },
];

export default function DeanOnboarding() {
  const [deans] = useState(initialDeans);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
      
      <Sidebar />

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Component */}
        <Header title="Dean Onboarding" breadcrumbs={['Accounts', 'Dean']} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-3xl font-serif font-bold text-stone-900 mb-1">Dean Accounts</h3>
              <p className="text-sm text-stone-500">Create and manage Dean portal accounts. Deans create their own adviser accounts.</p>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Table Header Controls */}
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔍</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or department..." 
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
                />
              </div>
              <button className="w-full sm:w-auto bg-[#801e38] hover:bg-[#601328] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                <span>+</span> Create Dean Account
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">NAME ↕</th>
                    <th className="px-6 py-4">EMAIL</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">DEPARTMENT ↕</th>
                    <th className="px-6 py-4">ROLE</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">STATUS ↕</th>
                    <th className="px-6 py-4 cursor-pointer hover:text-stone-600">CREATED ↕</th>
                    <th className="px-6 py-4 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {deans.map((dean) => (
                    <tr key={dean.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-stone-800 whitespace-nowrap">{dean.name}</td>
                      <td className="px-6 py-4 text-stone-500 whitespace-nowrap">{dean.email}</td>
                      <td className="px-6 py-4 text-stone-700 font-medium whitespace-nowrap">{dean.dept}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {dean.roles.map(role => (
                            <span 
                              key={role} 
                              className={`text-[10px] font-bold px-2 py-1 rounded bg-${role === 'Dean' ? 'pink' : 'blue'}-100 text-${role === 'Dean' ? 'pink' : 'blue'}-700`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full text-white ${dean.status === 'Active' ? 'bg-emerald-600' : 'bg-[#801e38]'}`}>
                          {dean.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-400 whitespace-nowrap">{dean.created}</td>
                      <td className="px-6 py-4">
                        {dean.status === 'Pending' ? (
                          <div className="flex justify-center">
                            <button className="bg-[#801e38] hover:bg-[#601328] text-white text-[11px] font-bold px-4 py-1.5 rounded transition-colors cursor-pointer">
                              Resend
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button className="w-8 h-8 rounded border border-stone-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                              👁️
                            </button>
                            <button className="w-8 h-8 rounded border border-stone-200 text-amber-500 hover:bg-amber-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                              ✏️
                            </button>
                            <button className="w-8 h-8 rounded border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center bg-white shadow-sm transition-colors cursor-pointer">
                              ⛔
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between mt-6 px-1">
            <span className="text-sm text-stone-500 font-medium">Showing 1–5 of Deans</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer disabled:opacity-50">‹</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#801e38] text-white font-bold shadow-sm cursor-pointer">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors shadow-sm cursor-pointer">›</button>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}