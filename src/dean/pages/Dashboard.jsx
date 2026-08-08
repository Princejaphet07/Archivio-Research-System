import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ComposedChart, Line, Bar, CartesianGrid, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { db } from '../firebase/config';

import { useNavigate } from 'react-router-dom';

export default function Dashboard({ activePage }) {
  const { deanData, loading } = useUser();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalGroups: 0,
    approved: 0,
    published: 0,
    pending: 0,
    totalAdvisers: 0
  });
  
  const [adviserStats, setAdviserStats] = useState([]);
  const [allPapers, setAllPapers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [topPapersSort, setTopPapersSort] = useState('likes');
  const [topCategories, setTopCategories] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [allRawSubmissions, setAllRawSubmissions] = useState([]);

  useEffect(() => {
    // Wait for deanData to load so we know the Dean's department
    if (!deanData?.department) return;
    const deanDept = deanData.department;

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      setAllRawSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    let cleanupGroups = () => {};
    
    // Fetch advisers first to get their UIDs, which is a robust way to link groups to the department
    import('firebase/firestore').then(({ getDocs, where }) => {
       const advQuery = query(collection(db, 'advisers'), where('department', '==', deanDept));
       getDocs(advQuery).then(advSnap => {
         const advUids = new Set(advSnap.docs.map(d => d.data().userId));
         
         const unsub = onSnapshot(collection(db, 'groups'), (snapshot) => {
            // DEPARTMENT FILTER: Only count groups belonging to this Dean's department
            const deptGroups = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(g => {
                 if (g.department === deanDept) return true;
                 if (advUids.has(g.adviserUid)) return true;
                 // Fallbacks
                 if (deanDept.includes('IT') && g.program && g.program.includes('Information Technology')) return true;
                 return false;
              });
            setStats(prev => ({ ...prev, totalGroups: deptGroups.length }));
            setAllGroups(deptGroups);
         });
         cleanupGroups = unsub;
       });
    });
    
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
       // DEPARTMENT FILTER: Only count advisers belonging to this Dean's department
       const deptAdvisers = snapshot.docs.filter(d => d.data().department === deanDept);
       setStats(prev => ({ ...prev, totalAdvisers: deptAdvisers.length }));
    });
    
    return () => { unsubSubmissions(); cleanupGroups(); unsubAdvisers(); }
  }, [deanData]);

  // Process stats safely once both groups and submissions are loaded
  useEffect(() => {
    if (allGroups.length === 0 && allRawSubmissions.length === 0) return;

    let approvedCount = 0;
    let publishedCount = 0;
    let pendingCount = 0;
    const advMap = {};
    const papers = [];
    const categoriesMap = {};
    const yearMap = {};

    allRawSubmissions.forEach(data => {
      // Join submission to group to securely verify department
      const group = allGroups.find(g => g.leaderUid === data.studentUid && (g.groupName === data.groupName || g.researchTitle === (data.title || data.researchTitle)));
      if (!group) return; // Skip if it doesn't belong to a group in this Dean's department

      const status = data.reviewStatus || 'pending';
      
      if (status === 'approved') approvedCount++;
      if (status === 'published') {
        publishedCount++;
        papers.push(data);
        
        const tags = data.tags || [];
        if (tags.length > 0) {
          tags.forEach(tag => { categoriesMap[tag] = (categoriesMap[tag] || 0) + 1; });
        } else {
           // Group by Department instead of Program for consistency
           const dept = group.department || data.department || 'Unknown Department';
           categoriesMap[dept] = (categoriesMap[dept] || 0) + 1;
        }
      }
      if (status === 'pending' || status === 'revision') pendingCount++;
      
      const year = new Date(data.createdAt || Date.now()).getFullYear().toString();
      if (!yearMap[year]) yearMap[year] = { count: 0, published: 0 };
      yearMap[year].count++;
      if (status === 'published') yearMap[year].published++;
      
      const adviserUid = group.adviserUid || data.adviserUid;
      if (adviserUid) {
        const advName = group.adviserName || data.adviserName || 'Unknown Adviser';
        if (!advMap[adviserUid]) {
          advMap[adviserUid] = { uid: adviserUid, name: advName, uploads: 0, approved: 0, published: 0, pending: 0 };
        }
        advMap[adviserUid].uploads++;
        if (status === 'approved') advMap[adviserUid].approved++;
        if (status === 'published') advMap[adviserUid].published++;
        if (status === 'pending' || status === 'revision') advMap[adviserUid].pending++;
      }
    });

    setStats(prev => ({ ...prev, approved: approvedCount, published: publishedCount, pending: pendingCount }));
    
    const advArray = Object.values(advMap).map(adv => {
       const rate = adv.uploads > 0 ? Math.round((adv.published / adv.uploads) * 100) : 0;
       return { ...adv, rate };
    });
    advArray.sort((a, b) => b.uploads - a.uploads);
    setAdviserStats(advArray);
    
    setAllPapers(papers);
    
    const catArray = Object.keys(categoriesMap).map(key => ({ name: key, count: categoriesMap[key] }));
    catArray.sort((a, b) => b.count - a.count);
    setTopCategories(catArray.slice(0, 7));
    
    const yearArray = Object.keys(yearMap).map(y => ({ year: y, count: yearMap[y].count, published: yearMap[y].published }));
    yearArray.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    setYearlyStats(yearArray);

  }, [allRawSubmissions, allGroups]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-[#fcfbfa]">
        <div className="w-12 h-12 border-4 border-[#7a1f3d]/20 border-t-[#7a1f3d] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-[#7a1f3d] tracking-widest uppercase">Loading Dashboard</p>
      </div>
    );
  }

  const deanName = deanData?.displayName || 'Dean';
  const firstName = deanName.split(' ')[0];
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  const currentYear = new Date().getFullYear();
  let chartData = [...yearlyStats].slice(-4);
  if (chartData.length < 4) {
    const padCount = 4 - chartData.length;
    const startYear = chartData.length > 0 ? parseInt(chartData[0].year) - padCount : currentYear - 3;
    const padding = Array.from({length: padCount}, (_, i) => ({ year: (startYear + i).toString(), count: 0, published: 0 }));
    chartData = [...padding, ...chartData];
  }
  const maxCount = Math.max(...chartData.map(d => d.count), 10);
  
  // Color palette for charts
  const COLORS = ['#7a1f3d', '#2563eb', '#059669', '#d97706', '#0d9488', '#dc2626', '#7c3aed'];

  const sortedTopPapers = [...allPapers].sort((a, b) => {
    const aScore = topPapersSort === 'likes' ? (a.likes?.length || 0) : (a.views || 0);
    const bScore = topPapersSort === 'likes' ? (b.likes?.length || 0) : (b.views || 0);
    return bScore - aScore;
  }).slice(0, 5); // Get first name for greeting

  return (
    <div className="flex h-screen w-full bg-[#fcfbfa] overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Right Core Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header activePage="dashboard" />

        {/* Main Workspace Panel */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#fbf9f6]">

          {/* ================= WELCOME HEADER SECTION ================= */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
                {getGreeting()}, {firstName} 👋
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
                onClick={() => navigate('/dean/publish-queue')}
                className="px-4 py-2 bg-[#7a1f3d] text-white rounded-lg text-xs font-bold shadow-md hover:bg-[#5a162d] transition-all flex items-center gap-2"
              >
                <span>📋</span> Publish Queue <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">{stats.approved}</span>
              </button>
            </div>
          </div>

          {/* ================= KPI STATS HIGHLIGHT GRID ================= */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <KpiCard title="TOTAL GROUP" value={stats.totalGroups} trend="Total registered" icon="📁" />
            <KpiCard title="APPROVED" value={stats.approved} trend="Awaiting publish" icon="✅" highlight />
            <KpiCard title="PUBLISHED" value={stats.published} trend="Live in archive" icon="🌐" />
            <KpiCard title="PENDING REVIEW" value={stats.pending} trend="Needs attention" icon="⏳" warning />
            <KpiCard title="TOTAL ADVISERS" value={stats.totalAdvisers} subtext="Registered advisers" icon="👥" />
            <KpiCard title="COMPLETION RATE" value={`${stats.totalGroups > 0 ? Math.round((stats.published / stats.totalGroups) * 100) : 0}%`} trend="Published / Total" icon="📈" />
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
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f3f3" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 'bold'}} dy={10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#1c1917' }}
                      cursor={{ fill: '#f5f5f4' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="count" name="Total Uploads" fill="#7a1f3d" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1500} />
                    <Line 
                      type="monotone" 
                      dataKey="published" 
                      name="Published Papers"
                      stroke="#d97706" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Yearly Summary */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">Yearly Summary</h3>
                <p className="text-xs text-stone-400 mt-0.5">Click a year to view its records</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 flex-1 justify-center content-center">
                {chartData.map((d, i) => {
                  const prev = i > 0 ? chartData[i - 1].count : 0;
                  const growth = prev > 0 ? Math.round(((d.count - prev) / prev) * 100) : 0;
                  let badge = undefined;
                  let growthText = undefined;
                  let textGreen = false;
                  
                  if (i === 0) badge = "Baseline";
                  else if (growth > 0) { growthText = `↑ ${growth}%`; textGreen = true; }
                  else if (growth < 0) { growthText = `↓ ${Math.abs(growth)}%`; }
                  else { growthText = "0%"; }
                  
                  return (
                    <YearMetricBox key={d.year} year={d.year} count={d.count} badge={badge} growth={growthText} textGreen={textGreen} active={d.year === currentYear.toString()} />
                  );
                })}
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
                  <p className="text-xs text-stone-400 mt-0.5">Distribution by field of study</p>
                </div>
              </div>
              <div className="h-64 mt-4 flex items-center justify-center">
                {topCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="name"
                      >
                        {topCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-stone-400 text-center">No categories data available yet.</p>
                )}
              </div>
            </div>

            {/* Top Research Papers */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">Top Research Papers</h3>
                <div className="flex bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-[10px] font-bold">
                  <button 
                    onClick={() => setTopPapersSort('likes')}
                    className={`${topPapersSort === 'likes' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-700'} px-2.5 py-1 rounded-md transition-all`}
                  >👍 Liked</button>
                  <button 
                    onClick={() => setTopPapersSort('views')}
                    className={`${topPapersSort === 'views' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-700'} px-2.5 py-1 rounded-md transition-all`}
                  >👁️ Viewed</button>
                </div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {sortedTopPapers.length > 0 ? sortedTopPapers.map((paper, i) => {
                  const score = topPapersSort === 'likes' ? (paper.likes?.length || 0) : (paper.views || 0);
                  const icon = topPapersSort === 'likes' ? '👍' : '👁️';
                  const highlight = paper.adviserUid === deanData?.uid;
                  
                  const group = allGroups.find(g => g.leaderUid === paper.studentUid && (g.groupName === paper.groupName || g.researchTitle === (paper.researchTitle || paper.title)));
                  const displayTitle = group?.researchTitle || paper.researchTitle || paper.title || 'Untitled';
                  const displayAuthor = group?.groupName || paper.groupName || paper.studentName || 'Unknown Author';
                  const displayAdviser = group?.adviserName || paper.adviserName || 'Unknown Adviser';
                  
                  return (
                    <PaperRow key={paper.id} rank={i + 1} title={displayTitle} author={`${displayAuthor} - ${displayAdviser}`} count={score} icon={icon} highlight={highlight} />
                  );
                }) : (
                  <p className="text-xs text-stone-400 text-center py-4">No published papers yet.</p>
                )}
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
                    <th className="py-3 px-4 text-left">Uploads <span className="text-[9px] inline-block ml-1 opacity-60">↓</span></th>
                    <th className="py-3 px-4 text-left">Approved</th>
                    <th className="py-3 px-4 text-left">Published</th>
                    <th className="py-3 px-4 text-left">Pending</th>
                    <th className="py-3 px-5 w-44">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {adviserStats.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-stone-400 text-sm">
                        No adviser statistics available yet. Wait for students to create submissions.
                      </td>
                    </tr>
                  ) : (
                    adviserStats.map((adv) => {
                      const isYou = adv.uid === deanData?.uid;
                      const initials = adv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                      return (
                        <tr key={adv.uid} className={`${isYou ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-stone-50/80'} transition-colors`}>
                          <td className="py-3.5 px-5 flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full ${isYou ? 'bg-amber-500/20 text-amber-800' : 'bg-purple-100 text-purple-700'} font-bold flex items-center justify-center text-[11px]`}>{initials}</div>
                            <div>
                              <span className="font-bold text-stone-900">{adv.name}</span>
                              {isYou && <span className="ml-2 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase">You</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-left font-bold">{adv.uploads}</td>
                          <td className="py-3.5 px-4 text-left"><span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">{adv.approved}</span></td>
                          <td className="py-3.5 px-4 text-left"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">{adv.published}</span></td>
                          <td className="py-3.5 px-4 text-left"><span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">{adv.pending}</span></td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-stone-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-[#7a1f3d] h-full" style={{ width: `${adv.rate}%` }}></div>
                              </div>
                              <span className="text-[11px] font-bold text-stone-500 w-8 text-right">{adv.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
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



function PaperRow({ rank, title, author, count, icon, highlight }) {
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
        <span>{icon || '👍'}</span> {count}
      </div>
    </div>
  );
}
