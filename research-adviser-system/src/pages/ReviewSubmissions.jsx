import React from 'react';
import Layout from '../components/Layout';

function ReviewSubmissions() {
  return (
    <Layout title="Review Submissions & Tracking" breadcrumb="ARCHIVIO › Review Submissions & Tracking" showSearch={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Review Submissions & Tracking</h1>
          <p className="text-sm text-gray-500">Review, approve, or decline your student groups' research submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Search by title or group..." className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7a2e46]" />
          </div>
          <select className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600">
            <option>All Year</option>
          </select>
          <select className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600">
            <option>All Groups</option>
          </select>
          <select className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none w-full md:w-48 text-gray-600">
            <option>All Categories</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-8">
          <button className="pb-3 border-b-2 border-[#7a2e46] text-[#7a2e46] font-bold text-sm flex items-center gap-2">
            ⏳ Pending Review <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">3</span>
          </button>
          <button className="pb-3 text-gray-500 font-medium text-sm hover:text-gray-700 flex items-center gap-2">
            ✅ Reviewed <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">5</span>
          </button>
          <button className="pb-3 text-gray-500 font-medium text-sm hover:text-gray-700 flex items-center gap-2">
            🎓 Approved <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">5</span>
          </button>
        </div>

        {/* Submission Cards */}
        <div className="space-y-4">
          {[
            { title: 'Smart Irrigation System Using IoT', group: 'AgroTech', leader: 'Rea Santos', date: 'Feb 01, 2026', complete: '100%' },
            { title: 'ML-Based Health Monitor for Elderly Care', group: 'HealthAI', leader: 'Mia Flores', date: 'Jan 25, 2026', complete: '72%' },
            { title: 'Gamification in K-12 STEM Education', group: 'EduForward', leader: 'Ara Lim', date: 'Jan 14, 2026', complete: '70%' },
          ].map((item, i) => (
            <div key={i} className="bg-white border-l-4 border-l-green-600 border-t border-b border-r border-gray-200 rounded-r-lg p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-16 h-16 bg-[#f8eff2] rounded-lg"></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">👥 Group {item.group}</span>
                    <span className="flex items-center gap-1">👤 {item.leader} (Leader)</span>
                    <span className="flex items-center gap-1">🕒 Submitted {item.date}</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-green-700 flex items-center gap-1">
                    📋 {item.complete} complete
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                <button className="flex-1 md:flex-none border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                  Full Review & Documents
                </button>
                <button className="flex-1 md:flex-none bg-[#7a2e46] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5f2135] transition">
                  Open for Moderations
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default ReviewSubmissions;