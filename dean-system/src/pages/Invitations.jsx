import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Invitations({ activePage, onNavigate }) {
  const invites = [
    { name: 'Prof. Jose Reyes', initial: 'JR', email: 'jose.reyes@swu.phinma.edu', time: '2 days ago', status: 'Pending' },
    { name: 'Prof. Maria Cruz', initial: 'MC', email: 'maria.cruz@swu.phinma.edu', time: '5 days ago', status: 'Accepted' },
    { name: 'Dr. Roberto Lim', initial: 'RL', email: 'roberto.lim@swu.phinma.edu', time: '1 week ago', status: 'Pending' },
    { name: 'Prof. Andrea Diaz', initial: 'AD', email: 'andrea.diaz@swu.phinma.edu', time: '2 weeks ago', status: 'Accepted' },
    { name: 'Prof. Carlos Tan', initial: 'CT', email: 'carlos.tan@swu.phinma.edu', time: '3 weeks ago', status: 'Pending' },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header activePage={activePage} />
        
        <main className="p-6 max-w-[1400px] w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Send Invitations</h1>
            <p className="text-xs text-stone-500 mt-0.5">Send invitation links to Research Advisers for account creation</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Form Panel */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
              <div className="bg-[#4a1024] p-5 text-white relative">
                <span className="text-xl">✉️</span>
                <h3 className="font-serif text-base font-bold mt-2">Invite a Research Adviser</h3>
                <p className="text-[11px] text-stone-300">They'll receive a secure link to create their account</p>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wide">Adviser Name</label>
                  <input type="text" placeholder="e.g. Dr. Maria Reyes" className="w-full text-xs p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-[#4a1024]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1.5 tracking-wide">Email Address</label>
                  <input type="email" placeholder="adviser@swu.phinma.edu" className="w-full text-xs p-2.5 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-[#4a1024]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 flex justify-between tracking-wide">
                    <span>Invitation Message</span>
                    <span className="text-blue-600 lowercase font-normal cursor-pointer hover:underline text-[9px]">💡 Default message from Settings</span>
                  </label>
                  <textarea defaultValue={`Dear [Adviser Name],\n\nYou have been invited to join ARCHIVIO — the Web-Based Digital Research Archive Management System of Southwestern University PHINMA.\n\nAs a Research Adviser, you will be able to:\n• Manage your assigned student research groups...`} rows={5} className="w-full text-xs p-2.5 border border-stone-200 rounded-xl bg-stone-50/50 text-stone-600 leading-relaxed outline-none focus:ring-1 focus:ring-[#4a1024] resize-none" />
                  <p className="text-[10px] text-stone-400 mt-1">You can edit this message before sending. Changes here won't affect the template in Settings.</p>
                </div>
                
                <button className="w-full bg-[#4a1024] hover:bg-[#6b1834] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2">
                  <span>✉️</span> Send Invitation Link
                </button>
              </div>
            </div>

            {/* Right Column: Tracker Log Panel */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800">Sent Invitations</h3>
                  <p className="text-[11px] text-stone-400">Last 30 days · Track invitation status</p>
                </div>
                <select className="text-xs font-bold border border-stone-200 rounded-xl p-1.5 bg-stone-50 text-stone-600 outline-none">
                  <option>All Statuses</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                      <th className="pb-3 w-1/3">Recipient</th>
                      <th className="pb-3 w-1/4">Email</th>
                      <th className="pb-3">Sent</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 font-medium text-stone-700">
                    {invites.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-3.5 flex items-center gap-3">
                          <div className="w-7 h-7 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold border border-purple-100">{row.initial}</div>
                          <span className="font-bold text-stone-800">{row.name}</span>
                        </td>
                        <td className="py-3.5 text-stone-500 font-normal">{row.email}</td>
                        <td className="py-3.5 text-stone-500 font-normal">{row.time}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${row.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          {row.status === 'Pending' && (
                            <button className="px-2.5 py-1 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-1 mx-auto shadow-sm">
                              🔄 Resend
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