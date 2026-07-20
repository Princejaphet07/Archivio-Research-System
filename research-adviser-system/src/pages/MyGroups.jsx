import React from 'react';
import Layout from '../components/Layout';

function MyGroups() {
  const groupsData = [
    { no: '01', name: 'Group Innovatech', members: 4, date: 'May 14, 2026', status: 'Pending Requirements', color: 'bg-orange-500' },
    { no: '02', name: 'Group DataWave', members: 3, date: 'May 10, 2026', status: 'Pending Requirements', color: 'bg-orange-500' },
    { no: '03', name: 'Group SmartSys', members: 4, date: 'May 05, 2026', status: 'Pending Requirements', color: 'bg-orange-500' },
    { no: '04', name: 'Group CTRL + Z', members: 4, date: 'May 01, 2026', status: 'Pending Requirements', color: 'bg-orange-500' },
    { no: '05', name: 'Group HealthAI', members: 3, date: 'April 25, 2026', status: 'Approved to Publish', color: 'bg-purple-500' },
    { no: '06', name: 'Group ChainSec', members: 4, date: 'April 22, 2026', status: 'Approved to Publish', color: 'bg-purple-500' },
    { no: '07', name: 'Group DataMinds', members: 3, date: 'April 18, 2026', status: 'Completed Requirements', color: 'bg-green-500' },
  ];

  return (
    <Layout title="My Groups" breadcrumb="ARCHIVIO › My Groups" showSearch={false}>
      <div className="max-w-6xl mx-auto">
        
        {/* Page Header Area */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">My Groups</h1>
            <p className="text-sm text-gray-500">Research groups assigned under your advisory this semester</p>
          </div>
          
          {/* Inner Search Bar */}
          <div className="w-full md:w-80 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search groups, students, research titles..." 
              className="w-full bg-white pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#7a2e46] shadow-sm" 
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#7a2e46] text-white text-[10px] uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold w-16">No.</th>
                  <th className="py-4 px-6 font-semibold">Group Name</th>
                  <th className="py-4 px-6 font-semibold">Members</th>
                  <th className="py-4 px-6 font-semibold cursor-pointer hover:text-gray-200 transition">Date Registered ▾</th>
                  <th className="py-4 px-6 font-semibold cursor-pointer hover:text-gray-200 transition">Status ▾</th>
                  <th className="py-4 px-6 font-semibold text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {groupsData.map((group, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 px-6 text-gray-400 font-medium">{group.no}</td>
                    <td className="py-4 px-6 font-bold text-gray-900">{group.name}</td>
                    <td className="py-4 px-6 text-gray-500">{group.members} members</td>
                    <td className="py-4 px-6 text-gray-500">{group.date}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${group.color}`}></span>
                        {group.status}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button className="border border-[#7a2e46] text-[#7a2e46] font-semibold text-xs px-4 py-1.5 rounded hover:bg-[#7a2e46] hover:text-white transition">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <p className="text-xs text-gray-500 font-medium">Showing 1–7 of 9 groups</p>
          <div className="flex gap-1.5">
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition bg-white shadow-sm font-bold">‹</button>
            <button className="w-8 h-8 flex items-center justify-center border border-transparent bg-[#7a2e46] rounded text-white font-bold shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition bg-white shadow-sm font-bold">2</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition bg-white shadow-sm font-bold">›</button>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default MyGroups;