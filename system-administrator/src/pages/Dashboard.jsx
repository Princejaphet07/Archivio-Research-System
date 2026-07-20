import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; // Added Header Import

function Dashboard() {
  // Data para sa Department Statistics Table
  const deptStats = [
    { name: 'IT & Engineering', advisers: '3', students: '40', uploaded: '38', approved: '36', published: '35', pending: false },
    { name: 'Dentistry', advisers: '16', students: '100', uploaded: '48', approved: '46', published: '45', pending: false },
    { name: 'Business Admin', advisers: '3', students: '37', uploaded: '30', approved: '29', published: '28', pending: false },
    { name: 'Nursing', advisers: '—', students: '—', uploaded: '—', approved: '—', published: '—', pending: true },
  ];

  // Data para sa Research Categories list
  const categories = [
    { name: 'AI & Machine Learning', count: 18, percentage: '16.7%', color: 'bg-[#801e38]' },
    { name: 'Healthcare', count: 16, percentage: '14.8%', color: 'bg-blue-500' },
    { name: 'Business & Management', count: 14, percentage: '13.0%', color: 'bg-amber-500' },
    { name: 'Nursing', count: 12, percentage: '11.1%', color: 'bg-emerald-500' },
    { name: 'Web Development', count: 11, percentage: '10.2%', color: 'bg-[#9c6e3b]' },
    { name: 'Data Science & Analytics', count: 10, percentage: '9.3%', color: 'bg-indigo-500' },
    { name: 'Education & Learning', count: 9, percentage: '8.3%', color: 'bg-purple-500' },
    { name: 'Psychology', count: 8, percentage: '7.4%', color: 'bg-stone-400' },
    { name: 'Public Health & Epidemiology', count: 6, percentage: '5.6%', color: 'bg-teal-600' },
    { name: 'Cybersecurity', count: 4, percentage: '3.7%', color: 'bg-green-400' },
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#faf9f6] font-sans overflow-hidden">
      
      <Sidebar />

      {/* ================== MAIN CONTENT CONTAINER ================== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Component */}
        <Header title="Dashboard" breadcrumbs={['Dashboard']} />

        {/* Dashboard Content Panel */}
        <div className="p-6 space-y-6">
          
          {/* Row 1: Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {deptStats.map((_, i) => (
              <div key={i} className={`bg-white rounded-2xl p-5 border border-stone-150 shadow-sm relative overflow-hidden ${i===3?'opacity-60':''}`}>
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${['bg-purple-500','bg-blue-500','bg-emerald-500','bg-[#801e38]','bg-amber-500'][i]}`}></div>
                <h4 className={`text-3xl font-serif font-bold ${i===3?'text-[#801e38]':'text-stone-900'}`}>{['4','12','196','1','108'][i]}</h4>
                <p className="text-xs font-bold text-stone-800 mt-1">{['Total Departments','Total Programs','Registered Users','Pending Invitation','Published Research'][i]}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{['Active','Across all departments','Advisers + Students','Nursing — Dean not yet activate','Across all departments'][i]}</p>
              </div>
            ))}
          </div>

          {/* Row 2: Yearly Research Upload Trend */}
          <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Yearly Research Upload Trend</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Total submissions recorded per academic school year</p>
              </div>
            </div>
            <div className="w-full h-48 relative">
              <svg className="w-full h-full" viewBox="0 0 1000 180" preserveAspectRatio="none">
                <line x1="0" y1="140" x2="1000" y2="140" stroke="#f3f3f3" strokeWidth="1" />
                <line x1="0" y1="95" x2="1000" y2="95" stroke="#f3f3f3" strokeWidth="1" />
                <line x1="0" y1="50" x2="1000" y2="50" stroke="#f3f3f3" strokeWidth="1" strokeDasharray="4 4" />
                <path d="M 100 140 L 325 110 L 550 75 L 775 40 L 910 115" fill="none" stroke="#801e38" strokeWidth="4" strokeLinecap="round"/>
                <path d="M 100 140 L 325 110 L 550 75 L 775 40 L 910 115 L 910 170 L 100 170 Z" fill="url(#trendGrad)" opacity="0.05"/>
                <defs><linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#801e38" /><stop offset="100%" stopColor="#801e38" stopOpacity="0" /></linearGradient></defs>
                <circle cx="100" cy="140" r="6" fill="#3b1220" stroke="#ffffff" strokeWidth="2" />
                <text x="100" y="125" textAnchor="middle" className="text-[11px] font-bold fill-stone-950">18</text>
                <circle cx="325" cy="110" r="6" fill="#3b1220" stroke="#ffffff" strokeWidth="2" />
                <text x="325" y="95" textAnchor="middle" className="text-[11px] font-bold fill-stone-950">24</text>
                <circle cx="550" cy="75" r="6" fill="#3b1220" stroke="#ffffff" strokeWidth="2" />
                <text x="550" y="60" textAnchor="middle" className="text-[11px] font-bold fill-stone-950">31</text>
                <circle cx="775" cy="40" r="6" fill="#3b1220" stroke="#ffffff" strokeWidth="2" />
                <text x="775" y="25" textAnchor="middle" className="text-[11px] font-bold fill-stone-950">38</text>
                <circle cx="910" cy="115" r="6" fill="#3b1220" stroke="#ffffff" strokeWidth="2" />
                <text x="910" y="100" textAnchor="middle" className="text-[11px] font-bold fill-stone-950">9</text>
              </svg>
              <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider px-6">
                <span>SY 21-22</span><span>SY 22-23</span><span>SY 23-24</span><span>SY 24-25</span>
                <span className="relative">SY 25-26<span className="absolute -top-7 right-0 whitespace-nowrap bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm">in progress</span></span>
              </div>
            </div>
          </div>

          {/* Row 3: Research Status per Department Horizontal Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Research Status per Department</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Uploaded vs Approved vs Published per department</p>
              </div>
            </div>
            <div className="space-y-6">
              {[deptStats[0],deptStats[1],deptStats[2]].map((dept, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-800 w-32 shrink-0">{dept.name}</span>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2"><div className="bg-[#e2d5de] h-3 rounded-full" style={{ width: `${dept.uploaded*2}%` }}></div><span className="text-[10px] font-bold text-stone-400">{dept.uploaded}</span></div>
                    <div className="flex items-center gap-2"><div className="bg-[#64b494] h-3 rounded-full" style={{ width: `${dept.approved*2}%` }}></div><span className="text-[10px] font-bold text-stone-400">{dept.approved}</span></div>
                    <div className="flex items-center gap-2"><div className="bg-[#9c6e3b] h-3 rounded-full" style={{ width: `${dept.published*2}%` }}></div><span className="text-[10px] font-bold text-stone-400">{dept.published}</span></div>
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-800 w-32 shrink-0">Nursing</span>
                <div className="flex-1 flex items-center h-16 bg-amber-50/40 border border-dashed border-amber-200 rounded-xl px-4"><span className="text-xs text-amber-800 font-bold">Pending — Invitation has sent</span></div>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-stone-100 justify-end text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#e2d5de] rounded"></span><span>Uploaded</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#64b494] rounded"></span><span>Approved</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#9c6e3b] rounded"></span><span>Published</span></div>
            </div>
          </div>

          {/* Row 4: Department Stats Table & Category Donut Pie Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm lg:col-span-2 overflow-x-auto">
              <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Department Statistics</h3><p className="text-[10px] text-stone-400 mt-0.5">Research papers status per department</p></div></div>
              <div className="overflow-x-auto min-w-[500px]">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#3b1220] text-white uppercase text-[9px] font-bold tracking-wider"><th className="p-3 rounded-l-lg">Department</th><th className="p-3">Advisers</th><th className="p-3">Students</th><th className="p-3">Uploaded</th><th className="p-3">Approved</th><th className="p-3 rounded-r-lg">Published</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {deptStats.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3.5 font-bold text-stone-800 flex items-center gap-2">{row.name}{row.pending && <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded font-bold">Pending</span>}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.advisers}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.students}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.uploaded}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.approved}</td>
                        <td className={`p-3.5 font-bold ${row.pending ? 'text-stone-300' : 'text-[#801e38]'}`}>{row.published}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone-50 font-bold border-t-2 border-stone-200"><td className="p-3.5 uppercase tracking-wider text-stone-900">Total</td><td className="p-3.5 text-[#801e38]">22</td><td className="p-3.5 text-[#801e38]">177</td><td className="p-3.5 text-[#801e38]">116</td><td className="p-3.5 text-[#801e38]">111</td><td className="p-3.5 text-[#801e38]">108</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm">
              <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Top Papers by Research Category</h3><p className="text-[10px] text-stone-400 mt-0.5">Distribution of published works</p></div></div>
              <div className="flex justify-center mb-6"><div className="relative w-32 h-32 flex items-center justify-center"><svg className="w-full h-full transform -rotate-90"><circle cx="64" cy="64" r="50" fill="transparent" stroke="#f5f5f5" strokeWidth="12" /><circle cx="64" cy="64" r="50" fill="transparent" stroke="#801e38" strokeWidth="12" strokeDasharray="314.16" strokeDashoffset="75" /></svg><div className="absolute flex flex-col items-center"><span className="text-2xl font-serif font-bold text-[#801e38]">108</span><span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Total</span></div></div></div>
              <div className="space-y-2 text-[10px] max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {categories.map((cat, i) => (<div key={i} className="flex items-center justify-between font-bold"><div className="flex items-center gap-2 text-stone-600"><span className={`w-2 h-2 rounded-full ${cat.color}`}></span><span>{cat.name}</span></div><span className="text-stone-900">{cat.count} <span className="text-stone-400 text-[8px] font-normal">{cat.percentage}</span></span></div>))}
              </div>
            </div>
          </div>

          {/* Row 5: Storage Usage Overview */}
          <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Storage Usage Overview</h3></div></div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"><div className="flex items-center gap-6 w-full md:w-2/3"><h2 className="text-5xl font-serif font-bold text-[#801e38]">68%</h2><div className="flex-1"><div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"><span className="text-[#801e38]">68% Used</span><span className="text-emerald-600">32% Free</span></div><div className="w-full bg-stone-100 h-4 rounded-full overflow-hidden border border-stone-150"><div className="bg-[#801e38] h-full rounded-full" style={{ width: '68%' }}></div></div></div></div><div className="w-full md:w-1/3 text-xs border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-6 space-y-2"><div className="flex justify-between font-bold text-stone-600"><span>Total Files Uploaded</span><span className="text-stone-900 font-bold">536 files</span></div><div className="flex justify-between font-bold text-stone-600"><span>Published Papers</span><span className="text-stone-900 font-bold">108 files</span></div><div className="flex justify-between font-bold text-stone-600"><span>Supporting Documents</span><span className="text-stone-900 font-bold">292 files</span></div><div className="flex justify-between font-bold text-stone-600"><span>Other Assets</span><span className="text-stone-900 font-bold">136 files</span></div></div></div>
            <div className="bg-[#801e38]/5 border border-[#801e38]/10 rounded-xl px-4 py-3 mt-5 flex items-center gap-2 text-xs font-bold text-[#801e38]"><span>⚠️</span><span>Storage above 60% — consider archiving old records.</span></div>
          </div>

        </div>
      </main>

    </div>
  );
}

export default Dashboard;