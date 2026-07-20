import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import

const logs = [
  { id: 1, time: '09:41 AM', user: 'admin@swu.phinma', role: 'System Admin', action: 'Created Dean account', status: 'Success', ip: '192.168.1.10', details: 'College of Nursing' },
  { id: 2, time: '09:35 AM', user: 'dean.cite@swu', role: 'Dean', action: 'Published research paper', status: 'Success', ip: '192.168.1.22', details: 'Group Innovatech' },
  { id: 3, time: '09:12 AM', user: 'i.pongasi@swu', role: 'Adviser', action: 'Marked submission as Reviewed', status: 'Success', ip: '192.168.1.45', details: 'Group DataWave' },
  { id: 4, time: '08:58 AM', user: 'unknown@external', role: '—', action: 'Failed login attempt', status: 'Failed', ip: '203.112.54.7', details: 'IP blocked after 3 tries' },
  { id: 5, time: '08:44 AM', user: 'dean.dent@swu', role: 'Dean', action: 'Added submission requirement', status: 'Success', ip: '192.168.1.30', details: 'Dental Research doc' },
  { id: 6, time: '08:31 AM', user: 'admin@swu.phinma', role: 'System Admin', action: 'Updated archive config settings', status: 'Success', ip: '192.168.1.10', details: 'Retention set to 5 yrs' },
  { id: 7, time: '08:20 AM', user: 'j.zamoras@swu', role: 'Student', action: 'Uploaded manuscript requirements', status: 'Success', ip: '192.168.1.88', details: 'Group Innovatech' },
  { id: 8, time: '08:05 AM', user: 'a.ilustrisimo@swu', role: 'Adviser', action: 'Approved & forwarded to Dean', status: 'Success', ip: '192.168.1.51', details: 'Group SmartSys' },
  { id: 9, time: '07:55 AM', user: 'admin@swu.phinma', role: 'System Admin', action: 'Generated analytics report', status: 'Success', ip: '192.168.1.10', details: 'PDF — 12 pages' },
  { id: 10, time: '07:40 AM', user: 'dean.bus@swu', role: 'Dean', action: 'Sent adviser invitation link', status: 'Pending', ip: '192.168.1.36', details: 'Dr. Cruz — Business' },
];

const roleColors = {
  'System Admin': 'bg-[#801e38]/10 text-[#801e38]',
  'Dean': 'bg-pink-100 text-pink-700',
  'Adviser': 'bg-amber-100 text-amber-700',
  'Student': 'bg-blue-100 text-blue-700',
  '—': 'bg-stone-100 text-stone-400',
};

const statusColors = {
  Success: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
};

export default function ActivityLogs() {
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#fbfaf8] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header Component */}
        <Header title="Activity Logs" breadcrumbs={['Activity Logs']} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8">

          {/* Title row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-7 bg-[#801e38] rounded-full"></div>
                <h3 className="text-2xl font-serif font-bold text-stone-900">Activity Logs</h3>
              </div>
              <p className="text-sm text-stone-500 ml-4">Track and audit all user activities across the system</p>
            </div>
            <span className="bg-[#801e38] text-white text-xs font-bold px-4 py-2 rounded-full">12 entries today</span>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by user, role, or action..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-[#801e38] transition-all"
              />
            </div>
            <select className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium outline-none cursor-pointer hover:bg-stone-50">
              <option>Today ▾</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
            <select className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium outline-none cursor-pointer hover:bg-stone-50">
              <option>All Status ▾</option>
              <option>Success</option>
              <option>Failed</option>
              <option>Pending</option>
            </select>
            <select className="px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium outline-none cursor-pointer hover:bg-stone-50">
              <option>All Roles ▾</option>
              <option>System Admin</option>
              <option>Dean</option>
              <option>Adviser</option>
              <option>Student</option>
            </select>
            <button className="ml-auto bg-[#3b1220] hover:bg-[#2b0d16] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer">
              📤 Export CSV
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#801e38] text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">TIMESTAMP</th>
                    <th className="px-6 py-4">USER</th>
                    <th className="px-6 py-4">ROLE</th>
                    <th className="px-6 py-4">ACTION PERFORMED</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">IP ADDRESS</th>
                    <th className="px-6 py-4">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map(log => (
                    <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4 text-stone-500 whitespace-nowrap text-xs">{log.time}</td>
                      <td className="px-6 py-4 font-bold text-stone-800 whitespace-nowrap">{log.user}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[log.role]}`}>{log.role}</span>
                      </td>
                      <td className="px-6 py-4 text-stone-700">{log.action}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[log.status]}`}>{log.status}</span>
                      </td>
                      <td className="px-6 py-4 text-stone-400 whitespace-nowrap text-xs">{log.ip}</td>
                      <td className="px-6 py-4 text-stone-400 whitespace-nowrap text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
              <span className="text-sm text-stone-500 font-medium">Showing 1–10 of 12 entries</span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 shadow-sm cursor-pointer">‹</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-[#801e38] text-white font-bold shadow-sm cursor-pointer">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 shadow-sm cursor-pointer">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 shadow-sm cursor-pointer">›</button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}