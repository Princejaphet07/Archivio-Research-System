import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function UserManagement({ activePage, onNavigate }) {
  const stats = [
    { label: 'Total Advisers (incl. you)', value: '3', color: 'border-stone-200' },
    { label: 'Active Accounts', value: '3', color: 'border-emerald-500' },
    { label: 'Groups Supervised', value: '30', color: 'border-amber-500' },
  ];

  const advisers = [
    { name: 'Dr. Desiree Cendana', email: 'desiree.cendana@swu.phinma.edu', groups: 2, published: 6, status: 'Active', tags: ['DEAN', 'ADVISER', 'YOU'], avatarColor: 'bg-amber-100 text-amber-800' },
    { name: 'Ira Pongasi', email: 'ira.pongasi@swu.phinma.edu', groups: 18, published: 12, status: 'Active', tags: ['ADVISER'], avatarColor: 'bg-purple-100 text-purple-800' },
    { name: 'Almie Ilustrisimo', email: 'almie.ilustrisimo@swu.phinma.edu', groups: 12, published: 9, status: 'Active', tags: ['ADVISER'], avatarColor: 'bg-pink-100 text-pink-800' },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Users / Advisers</h1>
              <p className="text-xs text-stone-500 mt-0.5">Manage research adviser accounts under your supervision</p>
            </div>
            <button onClick={() => onNavigate('invitations')} className="bg-[#4a1024] hover:bg-[#6b1834] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
              ✉️ Invite New Adviser
            </button>
          </div>

          {/* Cards metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((card, i) => (
              <div key={i} className={`bg-white border-t-2 ${card.color} rounded-xl shadow-sm p-4`}>
                <p className="text-2xl font-bold text-stone-800">{card.value}</p>
                <p className="text-[11px] font-medium text-stone-400 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Table Container Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
            {/* View Switching Tabs */}
            <div className="bg-stone-50/60 border-b border-stone-100 px-4 flex gap-6 text-xs font-bold text-stone-400">
              <button className="py-3 border-b-2 border-[#4a1024] text-[#4a1024] flex items-center gap-1.5">
                🧑‍🏫 Research Advisers <span className="bg-[#4a1024]/10 text-[#4a1024] text-[10px] px-1.5 py-0.5 rounded-full">3</span>
              </button>
              <button className="py-3 border-b-2 border-transparent hover:text-stone-600 flex items-center gap-1.5">
                🎓 Students <span className="bg-stone-200 text-stone-500 text-[10px] px-1.5 py-0.5 rounded-full">24</span>
              </button>
            </div>

            {/* Advisers Listing */}
            <div className="p-4">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide mb-3">All Research Advisers</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-medium">
                  <thead>
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                      <th className="pb-3">Adviser</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3 text-center">Groups</th>
                      <th className="pb-3 text-center">Published</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 text-stone-700">
                    {advisers.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-4 flex items-center gap-3">
                          <div className={`w-9 h-9 ${row.avatarColor} rounded-full flex items-center justify-center font-bold text-xs border shadow-inner`}>
                            {row.name.split(' ').filter(n=>!n.includes('.')).map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800">{row.name}</p>
                            <div className="flex gap-1 mt-1">
                              {row.tags.map((tag) => (
                                <span key={tag} className={`text-[8px] font-bold px-1 py-0.5 rounded tracking-wide uppercase ${tag === 'YOU' ? 'bg-amber-500 text-white' : tag === 'DEAN' ? 'bg-stone-100 text-stone-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-stone-500 font-normal">{row.email}</td>
                        <td className="py-4 text-center font-bold text-stone-800">{row.groups}</td>
                        <td className="py-4 text-center">
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            {row.published}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {row.status}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button className="px-3 py-1 border border-stone-200 text-stone-600 font-bold rounded-lg text-[11px] bg-white hover:bg-stone-50 shadow-sm">
                            👁️ View
                          </button>
                          {!row.tags.includes('YOU') && (
                            <button className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-[11px] hover:bg-red-700 shadow-sm transition-colors">
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}