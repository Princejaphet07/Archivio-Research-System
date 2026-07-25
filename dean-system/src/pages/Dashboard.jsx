import React from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function Dashboard({ activePage, onNavigate }) {
  const { deanData, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Extract name from displayName
  const deanName = deanData?.displayName || 'Dean';
  const firstName = deanName.split(' ')[0]; // Get first name for greeting

  return (
    <div className="flex h-screen w-full bg-[#fcfbfa] overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Right Core Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header activePage={activePage} />

        {/* Main Workspace Panel */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#fbf9f6]">

          {/* ================= WELCOME HEADER SECTION ================= */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Good morning, {firstName} 👋
              </h1>
              <p className="text-xs font-medium text-stone-500 mt-1 uppercase tracking-wider">
                {deanData?.department || 'Department'} • S.Y. 2026–2027, 2nd Semester
              </p>
            </div>
            <div className="flex gap-2.5">
              <button className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50 transition-colors flex items-center gap-1.5">
                <span>📤</span> Export
              </button>
              <button
                onClick={() => onNavigate('publish-queue')}
                className="px-4 py-2 bg-[#7a1f3d] text-white rounded-lg text-xs font-bold shadow-md hover:bg-[#5a162d] transition-all flex items-center gap-2"
              >
                <span>📋</span> Publish Queue <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">8</span>
              </button>
            </div>
          </div>

          {/* ================= KPI STATS HIGHLIGHT GRID ================= */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <KpiCard title="TOTAL GROUP" value="16" trend="↑ 8%" trendSub="vs last year" icon="📁" />
            <KpiCard title="APPROVED" value="28" trend="↑ 6%" trendSub="vs last year" icon="✅" highlight />
            <KpiCard title="PUBLISHED" value="21" trend="↑ 11%" trendSub="this year" icon="🌐" />
            <KpiCard title="PENDING REVIEW" value="8" trend="+2 new" trendSub="this week" icon="⏳" warning />
            <KpiCard title="TOTAL ADVISERS" value="3" subtext="2 active + you" icon="👥" />
            <KpiCard title="COMPLETION RATE" value="72.5%" trend="↑ 3.2%" trendSub="from last sem" icon="📈" />
          </div>

          {/* ================= CHARTS AND SUMMARIES GRID (ROW 2) ================= */}
          <div className="grid grid-cols-3 gap-6 mb-6">

            {/* Research Upload Trend Line Chart */}
            <div className="col-span-2 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight">Research Upload Trend</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Dynamic — adjust filters below</p>
                </div>
                <div className="flex bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-[11px] font-bold">
                  <button className="bg-[#7a1f3d] text-white px-3 py-1 rounded-md shadow-sm">By Year</button>
                  <button className="text-stone-500 px-3 py-1 hover:text-stone-800">Custom</button>
                </div>
              </div>

              <div className="relative h-44 w-full mt-2 flex items-end">
                <svg className="w-full h-32 overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#e7e5e4" strokeWidth="1" />
                  <line x1="0" y1="66" x2="400" y2="66" stroke="#f5f5f4" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="33" x2="400" y2="33" stroke="#f5f5f4" strokeWidth="1" strokeDasharray="4" />
                  <path d="M 10 75 L 130 60 L 260 35 L 390 20" fill="none" stroke="#7a1f3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <g className="cursor-pointer">
                    <circle cx="10" cy="75" r="4" fill="white" stroke="#7a1f3d" strokeWidth="2" />
                    <text x="10" y="60" textAnchor="middle" className="text-[10px] font-bold fill-stone-700">37</text>
                  </g>
                  <g className="cursor-pointer">
                    <circle cx="130" cy="60" r="4" fill="white" stroke="#7a1f3d" strokeWidth="2" />
                    <text x="130" y="45" textAnchor="middle" className="text-[10px] font-bold fill-stone-700">42</text>
                  </g>
                  <g className="cursor-pointer">
                    <circle cx="260" cy="35" r="4" fill="white" stroke="#7a1f3d" strokeWidth="2" />
                    <text x="260" y="20" textAnchor="middle" className="text-[10px] font-bold fill-stone-700">55</text>
                  </g>
                  <g className="cursor-pointer">
                    <circle cx="390" cy="20" r="4" fill="white" stroke="#7a1f3d" strokeWidth="2" />
                    <text x="390" y="5" textAnchor="middle" className="text-[10px] font-bold fill-stone-700">61</text>
                  </g>
                </svg>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-stone-400 px-2 mt-2">
                <span>2023</span>
                <span>2024</span>
                <span>2025</span>
                <span>2026</span>
              </div>
            </div>

            {/* Yearly Summary */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">Yearly Summary</h3>
                <p className="text-xs text-stone-400 mt-0.5">Click a year to view its records</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 flex-1 justify-center content-center">
                <YearMetricBox year="2023" count="8" badge="Baseline" />
                <YearMetricBox year="2024" count="11" growth="↑ 38%" textGreen />
                <YearMetricBox year="2025" count="14" growth="↑ 27%" textGreen active />
                <YearMetricBox year="2026" count="15" growth="↑ 7%" textGreen />
              </div>
            </div>
          </div>

          {/* ================= CATEGORIES AND LEADERBOARD (ROW 3) ================= */}
          <div className="grid grid-cols-3 gap-6 mb-6">

            {/* Top Research Categories */}
            <div className="col-span-2 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 tracking-tight">Top Research Categories</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Uploads grouped by field of study</p>
                </div>
                <div className="flex gap-2 text-stone-500">
                  <select className="text-xs bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1 font-semibold outline-none focus:ring-1 focus:ring-[#7a1f3d]">
                    <option>2026</option>
                  </select>
                  <button className="p-1 border border-stone-200 rounded-md hover:bg-stone-50 text-xs">📊</button>
                </div>
              </div>
              <div className="space-y-3.5">
                <CategoryProgressBar label="Machine Learning" count={42} max={45} barColor="bg-[#7a1f3d]" dotColor="bg-[#7a1f3d]" />
                <CategoryProgressBar label="IoT & Embedded" count={31} max={45} barColor="bg-blue-600" dotColor="bg-blue-600" />
                <CategoryProgressBar label="Web Systems" count={28} max={45} barColor="bg-emerald-600" dotColor="bg-emerald-600" />
                <CategoryProgressBar label="Mobile Apps" count={22} max={45} barColor="bg-amber-500" dotColor="bg-amber-500" />
                <CategoryProgressBar label="Data Analytics" count={11} max={45} barColor="bg-teal-600" dotColor="bg-teal-600" />
                <CategoryProgressBar label="Cybersecurity" count={14} max={45} barColor="bg-red-600" dotColor="bg-red-600" />
                <CategoryProgressBar label="Blockchain" count={5} max={45} barColor="bg-purple-600" dotColor="bg-purple-600" />
              </div>
            </div>

            {/* Top Research Papers */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">Top Research Papers</h3>
                <div className="flex bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-[10px] font-bold">
                  <button className="bg-white text-stone-800 px-2.5 py-1 rounded-md shadow-sm">👍 Liked</button>
                  <button className="text-stone-400 px-2.5 py-1 hover:text-stone-700">👁️ Viewed</button>
                </div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <PaperRow rank={1} title="Smart Irrigation System Using IoT" author="Group Innovatech - Ira Pongasi" count={32} />
                <PaperRow rank={2} title="Predictive Analytics for Student Dropout" author="Group DataMinds - A. Ilustrisimo" count={28} />
                <PaperRow rank={3} title="ML-Based Health Monitor" author="Group HealthAI - Dr. Cendana (You)" count={24} highlight />
                <PaperRow rank={4} title="Blockchain-Based Credential System" author="Group ChainSec - J. Reyes" count={19} />
                <PaperRow rank={5} title="AI-Driven Crop Yield Prediction" author="Group AgroTech - D. Cendana" count={16} />
              </div>
            </div>
          </div>

          {/* ================= ADVISER UPLOAD STATISTICS ================= */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">Adviser Upload Statistics</h3>
                <p className="text-xs text-amber-600 font-medium mt-0.5">★ Your row is highlighted — you are also an Adviser</p>
              </div>
              <div className="flex gap-2">
                <select className="text-xs bg-white border border-stone-200 rounded-md px-2.5 py-1 font-semibold text-stone-600 outline-none">
                  <option>2026-2027</option>
                </select>
                <button className="p-1.5 bg-white border border-stone-200 rounded-md text-xs hover:bg-stone-50">🔄</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200">
                    <th className="py-3 px-5">Adviser</th>
                    <th className="py-3 px-4 text-center">Uploads</th>
                    <th className="py-3 px-4 text-center">Approved</th>
                    <th className="py-3 px-4 text-center">Published</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-5 w-44">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  <tr className="bg-amber-50/40 hover:bg-amber-50/60 transition-colors">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-800 font-bold flex items-center justify-center text-[11px]">DC</div>
                      <div>
                        <span className="font-bold text-stone-900">Dr. Desiree Cendana</span>
                        <span className="ml-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase">You</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">6</td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">4</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">3</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">1</span></td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#7a1f3d] h-full" style={{ width: '67%' }}></div>
                        </div>
                        <span className="text-[11px] font-bold text-stone-500 w-8 text-right">67%</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[11px]">IP</div>
                      <span className="font-bold text-stone-900">Ira Pongasi</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">18</td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">14</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">12</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">2</span></td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#7a1f3d] h-full" style={{ width: '78%' }}></div>
                        </div>
                        <span className="text-[11px] font-bold text-stone-500 w-8 text-right">78%</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">AI</div>
                      <span className="font-bold text-stone-900">Almie Ilustrisimo</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">12</td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">10</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">9</span></td>
                    <td className="py-3.5 px-4 text-center"><span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">1</span></td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#7a1f3d] h-full" style={{ width: '83%' }}></div>
                        </div>
                        <span className="text-[11px] font-bold text-stone-500 w-8 text-right">83%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

// ================= PRIVATE COMPONENT MACROS =================

function KpiCard({ title, value, trend, trendSub, subtext, icon, highlight, warning }) {
  return (
    <div className={`p-4 bg-white rounded-xl border transition-all hover:shadow-md ${highlight ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200/80'} flex flex-col justify-between`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">{title}</span>
        <span className="text-xs opacity-70">{icon}</span>
      </div>
      <h4 className="text-2xl font-serif font-extrabold text-stone-900 leading-none mb-1.5">{value}</h4>
      {trend && (
        <div className="flex items-center gap-1 text-[9px] font-bold">
          <span className={`px-1.5 py-0.5 rounded ${warning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {trend}
          </span>
          <span className="text-stone-400 font-medium">{trendSub}</span>
        </div>
      )}
      {subtext && <p className="text-[10px] text-stone-400 font-medium">{subtext}</p>}
    </div>
  );
}

function YearMetricBox({ year, count, badge, growth, textGreen, active }) {
  return (
    <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${active ? 'border-[#7a1f3d] bg-[#7a1f3d]/5 ring-1 ring-[#7a1f3d]' : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'}`}>
      <span className="text-xs font-bold text-stone-800">{year}</span>
      <span className="text-lg font-serif font-bold text-stone-900 my-0.5">{count} <span className="text-[10px] font-sans font-medium text-stone-400">uploads</span></span>
      {badge && <span className="text-[9px] text-stone-400 font-bold tracking-tight uppercase">{badge}</span>}
      {growth && <span className={`text-[10px] font-extrabold ${textGreen ? 'text-emerald-600' : 'text-stone-500'}`}>{growth}</span>}
    </div>
  );
}

function CategoryProgressBar({ label, count, max, barColor, dotColor }) {
  const percentage = (count / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold text-stone-700">
        <span className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
          {label}
        </span>
        <span className="text-stone-900">{count}</span>
      </div>
      <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200/20">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function PaperRow({ rank, title, author, count, highlight }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${highlight ? 'border-[#7a1f3d]/40 bg-[#7a1f3d]/5' : 'border-stone-100 bg-stone-50/30 hover:bg-stone-50'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ${rank === 1 ? 'bg-amber-100 text-amber-700' : rank === 2 ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-500'}`}>
          {rank}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-stone-800 truncate">{title}</h4>
          <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">{author}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 font-bold text-stone-600 text-xs shrink-0 bg-white px-2 py-1 rounded-md border border-stone-100 shadow-sm">
        <span>👍</span> {count}
      </div>
    </div>
  );
}