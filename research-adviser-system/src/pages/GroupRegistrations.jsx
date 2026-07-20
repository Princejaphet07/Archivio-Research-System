import React from 'react';
import Layout from '../components/Layout';

function GroupRegistrations() {
  return (
    <Layout title="Group Registrations" breadcrumb="ARCHIVIO › Group Registrations" showSearch={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Group Registrations</h1>
          <p className="text-sm text-gray-500">Approve or decline student group registration requests</p>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#fff7ed] border border-[#fed7aa] p-4 rounded-lg flex gap-3 text-sm text-[#9a3412]">
          <span className="text-blue-500 text-lg">ℹ️</span>
          <p><strong>Important:</strong> Approve only the Group Leader's registration. Once approved, the system automatically sends a link to the leader's email so they can complete group setup and invite their members.</p>
        </div>

        {/* Pending Requests */}
        <div className="space-y-4">
          {[
            { group: 'Group SmartFarm', title: 'Smart Farm IoT Monitoring System', leader: 'Carlo Mendoza', applied: 'Feb 11, 2027', program: 'BSIT Program', members: 'Carlo Mendoza (Leader), Maria Ramos, Jose Santos, Ana Lim (4 total)' },
            { group: 'Group AquaNet', title: 'Underwater Drone Navigation System', leader: 'Diana Cruz', applied: 'Feb 9, 2027', program: 'BSIT Program', members: 'Diana Cruz (Leader), Rene Gomez, Lea Pascual (3 total)' },
          ].map((req, i) => (
            <div key={i} className="bg-white border border-[#fed7aa] rounded-xl p-5 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#fff7ed] rounded-lg border border-[#fed7aa] flex items-center justify-center text-xl">📋</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {req.group} <span className="bg-[#fff7ed] text-[#c2410c] text-[10px] px-2 py-0.5 rounded-full border border-[#fed7aa] uppercase tracking-wider font-bold">• Pending Approval</span>
                  </h3>
                  <p className="text-sm text-gray-800 mt-1">Research Title: <strong>{req.title}</strong></p>
                  <p className="text-xs text-gray-500 mt-0.5">Submitted by: {req.leader} (Group Leader) · Applied {req.applied} · {req.program}</p>
                  <div className="mt-3 bg-gray-50 text-xs text-gray-600 p-2 rounded-md border border-gray-100 flex items-center gap-2">
                    👥 Members: {req.members}
                  </div>
                </div>
              </div>
              <div className="flex lg:flex-col gap-2 w-full lg:w-32">
                <button className="flex-1 lg:flex-none bg-green-600 text-white font-semibold text-sm py-2 px-4 rounded-lg hover:bg-green-700 flex justify-center items-center gap-1">
                  ✓ Approve
                </button>
                <button className="flex-1 lg:flex-none bg-red-700 text-white font-semibold text-sm py-2 px-4 rounded-lg hover:bg-red-800 flex justify-center items-center gap-1">
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">Registration History</h3>
            <p className="text-xs text-gray-500">Previously processed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf5f6] text-[#7a2e46] text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-5">Group</th>
                  <th className="py-3 px-5">Leader</th>
                  <th className="py-3 px-5">Research Title</th>
                  <th className="py-3 px-5">Program</th>
                  <th className="py-3 px-5">Decision</th>
                  <th className="py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { group: 'Group Innovatech', leader: 'Juan dela Cruz', title: 'AI-Driven Health Monitor', program: 'BSIT', decision: 'Approved', decColor: 'text-green-700 bg-green-50', date: 'Jan 5, 2027' },
                  { group: 'Group DataWave', leader: 'Reyna Cruz', title: 'Predictive Water Quality', program: 'BSIT', decision: 'Approved', decColor: 'text-green-700 bg-green-50', date: 'Jan 8, 2027' },
                  { group: 'Group VoidTeam', leader: 'Mark Torres', title: 'VR Campus Tour', program: 'BSIT', decision: 'Declined', decColor: 'text-red-700 bg-red-50', date: 'Jan 12, 2027' },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-5 font-bold text-gray-900">{item.group}</td>
                    <td className="py-3 px-5 text-gray-600">{item.leader}</td>
                    <td className="py-3 px-5 text-gray-600">{item.title}</td>
                    <td className="py-3 px-5 text-gray-600">{item.program}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${item.decColor}`}>• {item.decision}</span>
                    </td>
                    <td className="py-3 px-5 text-gray-500">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default GroupRegistrations;