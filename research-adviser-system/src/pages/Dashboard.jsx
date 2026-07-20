import React from 'react';
import Layout from '../components/Layout';

function Dashboard() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#5a1831] to-[#802a46] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 w-64 h-full bg-white/5 rounded-l-full blur-3xl transform translate-x-20"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold tracking-widest text-gray-300 uppercase mb-2">Research Adviser Portal</p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Good morning, Prof. Pongasi 👋</h1>
            <p className="text-sm text-gray-200">3 active groups under your advisory · 5 submissions pending your review</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-gray-300">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">My Groups <span>🎓</span></p>
            <h3 className="text-3xl font-serif font-bold text-gray-800">9</h3>
            <p className="text-xs text-gray-500 mt-1">Active this semester</p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-yellow-400">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Pending Review <span>⏳</span></p>
            <h3 className="text-3xl font-serif font-bold text-gray-800">5</h3>
            <p className="text-xs text-yellow-600 font-medium bg-yellow-50 inline-block px-2 py-0.5 rounded mt-1">+2 today</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-blue-500">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Approved Papers <span>📄</span></p>
            <h3 className="text-3xl font-serif font-bold text-gray-800">12</h3>
            <p className="text-xs text-green-600 font-medium bg-green-50 inline-block px-2 py-0.5 rounded mt-1">↑ 3 this month</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-t-4 border-t-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">Avg Completion <span>📈</span></p>
            <h3 className="text-3xl font-serif font-bold text-gray-800">81%</h3>
            <p className="text-xs text-gray-500 mt-1">Across all groups</p>
          </div>
        </div>

        {/* Bottom Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: My Submissions */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">My Submissions Dashboard</h3>
                <p className="text-xs text-gray-500">Recent activity from your groups</p>
              </div>
              <button className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
                Review All →
              </button>
            </div>

            <div className="space-y-6">
              {/* Submission Item 1 */}
              <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                <div className="w-14 h-14 rounded-full border-4 border-yellow-400 flex items-center justify-center font-bold text-gray-700 text-sm">84%</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">Group Innovatech <span className="bg-yellow-100 text-yellow-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">• Pending Review</span></h4>
                      <p className="text-xs text-gray-500 mt-0.5">AI-Driven Health Monitor · 4 members</p>
                    </div>
                    <button className="border border-gray-200 text-xs font-semibold text-gray-600 px-3 py-1 rounded hover:bg-gray-50">Details</button>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 mb-1 flex justify-between">
                    <span>Missing: Video Pitch</span>
                    <span className="font-bold text-yellow-600">5 of 6</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-yellow-400 h-1.5 rounded-full w-[84%]"></div></div>
                </div>
              </div>

              {/* Submission Item 2 */}
              <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
                <div className="w-14 h-14 rounded-full border-4 border-blue-400 flex items-center justify-center font-bold text-gray-700 text-sm">60%</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">Group DataWave <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">• 3 Missing</span></h4>
                      <p className="text-xs text-gray-500 mt-0.5">Predictive Water Quality · 3 members</p>
                    </div>
                    <button className="border border-gray-200 text-xs font-semibold text-gray-600 px-3 py-1 rounded hover:bg-gray-50">Details</button>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 mb-1 flex justify-between">
                    <span>Missing: Dataset, Video, Manual</span>
                    <span className="font-bold text-blue-600">3 of 5</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-blue-500 h-1.5 rounded-full w-[60%]"></div></div>
                </div>
              </div>

              {/* Submission Item 3 */}
              <div className="flex items-center gap-4 pb-1">
                <div className="w-14 h-14 rounded-full border-4 border-[#5a1831] flex items-center justify-center font-bold text-[#5a1831] text-sm">100%</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">Group SmartSys <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">• Complete ✓</span></h4>
                      <p className="text-xs text-gray-500 mt-0.5">Smart Building Automation · 3 members</p>
                    </div>
                    <button className="border border-gray-200 text-xs font-semibold text-gray-600 px-3 py-1 rounded hover:bg-gray-50">Details</button>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 mb-1 flex justify-between">
                    <span>✓ All requirements complete</span>
                    <span className="font-bold text-[#5a1831]">Published</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full"><div className="bg-[#5a1831] h-1.5 rounded-full w-full"></div></div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Pending Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-sm text-gray-900">Pending Actions</h3>
                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">• 5 reviews</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">AI-Driven Health Monitor</h4>
                    <p className="text-[10px] text-gray-500">Group AgroTech · Feb 12</p>
                  </div>
                  <span className="bg-yellow-50 text-yellow-600 text-[9px] font-bold border border-yellow-200 px-2 py-1 rounded">• Review</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Predictive Water Quality</h4>
                    <p className="text-[10px] text-gray-500">Group HealthAI · Feb 13</p>
                  </div>
                  <span className="bg-yellow-50 text-yellow-600 text-[9px] font-bold border border-yellow-200 px-2 py-1 rounded">• Review</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">2 group registrations</h4>
                    <p className="text-[10px] text-gray-500">SmartFarm, AquaNet</p>
                  </div>
                  <span className="bg-purple-50 text-purple-600 text-[9px] font-bold border border-purple-200 px-2 py-1 rounded">• Pending</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-[#6b253e] hover:bg-[#541b2f] text-white text-xs font-semibold py-2.5 rounded-lg transition">
                View All Pending →
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-transparent">
              <h3 className="font-bold text-sm text-gray-900 mb-3 ml-1">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-green-500 text-lg">✅</span>
                  <span className="text-[10px] font-bold text-gray-600">Approve Registrations</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-blue-500 text-lg">📩</span>
                  <span className="text-[10px] font-bold text-gray-600">Send Invite Link</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-yellow-500 text-lg">📁</span>
                  <span className="text-[10px] font-bold text-gray-600">Manage Categories</span>
                </button>
                <button className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md transition text-center gap-1.5">
                  <span className="text-purple-500 text-lg">⚙️</span>
                  <span className="text-[10px] font-bold text-gray-600">My Requirements</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;