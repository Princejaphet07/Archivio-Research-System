import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Dashboard({ activePage, onNavigate }) {
  const { deanData, loading } = useUser();
  
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

  useEffect(() => {
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      let approvedCount = 0;
      let publishedCount = 0;
      let pendingCount = 0;
      const advMap = {};
      const papers = [];
      const categoriesMap = {};
      const yearMap = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const status = data.reviewStatus || 'pending';
        
        if (status === 'approved') approvedCount++;
        if (status === 'published') {
          publishedCount++;
          papers.push({ id: doc.id, ...data });
          
          const tags = data.tags || [];
          if (tags.length > 0) {
            tags.forEach(tag => { categoriesMap[tag] = (categoriesMap[tag] || 0) + 1; });
          } else {
             const prog = data.program || 'General IT';
             categoriesMap[prog] = (categoriesMap[prog] || 0) + 1;
          }
        }
        if (status === 'pending' || status === 'revision') pendingCount++;
        
        const year = new Date(data.createdAt || Date.now()).getFullYear().toString();
        if (!yearMap[year]) yearMap[year] = 0;
        yearMap[year]++;
        
        if (data.adviserUid) {
          const advName = data.adviserName || 'Unknown Adviser';
          if (!advMap[data.adviserUid]) {
            advMap[data.adviserUid] = { uid: data.adviserUid, name: advName, uploads: 0, approved: 0, published: 0, pending: 0 };
          }
          advMap[data.adviserUid].uploads++;
          if (status === 'approved') advMap[data.adviserUid].approved++;
          if (status === 'published') advMap[data.adviserUid].published++;
          if (status === 'pending' || status === 'revision') advMap[data.adviserUid].pending++;
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
      
      const yearArray = Object.keys(yearMap).map(y => ({ year: y, count: yearMap[y] }));
      yearArray.sort((a, b) => parseInt(a.year) - parseInt(b.year));
      setYearlyStats(yearArray);
    });
    
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
       setStats(prev => ({ ...prev, totalGroups: snapshot.size }));
       const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setAllGroups(groups);
    });
    
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
       setStats(prev => ({ ...prev, totalAdvisers: snapshot.size }));
    });
    
    return () => { unsubSubmissions(); unsubGroups(); unsubAdvisers(); }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const deanName = deanData?.displayName || 'Dean';
  const firstName = deanName.split(' ')[0];
  
  const currentYear = new Date().getFullYear();
  let chartData = [...yearlyStats].slice(-4);
  if (chartData.length < 4) {
    const padCount = 4 - chartData.length;
    const startYear = chartData.length > 0 ? parseInt(chartData[0].year) - padCount : currentYear - 3;
    const padding = Array.from({length: padCount}, (_, i) => ({ year: (startYear + i).toString(), count: 0 }));
    chartData = [...padding, ...chartData];
  }
  const maxCount = Math.max(...chartData.map(d => d.count), 10);
  const xCoords = [10, 137, 263, 390];
  const chartPoints = chartData.map((d, i) => ({
    x: xCoords[i],
    y: 75 - (d.count / maxCount) * 55,
    count: d.count,
    year: d.year
  }));
  const pathData = `M ${chartPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;

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
                <svg className="w-full h-32 overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <line x1="0" y1="100" x2="400" y2="100" stroke="#e7e5e4" strokeWidth="1" />
                  <line x1="0" y1="66" x2="400" y2="66" stroke="#f5f5f4" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="33" x2="400" y2="33" stroke="#f5f5f4" strokeWidth="1" strokeDasharray="4" />
                  <path d={pathData} fill="none" stroke="#7a1f3d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPoints.map((p, i) => (
                    <g key={i} className="cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#7a1f3d" strokeWidth="2" />
                      <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-stone-700">{p.count}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-stone-400 px-2 mt-2">
                {chartPoints.map((p, i) => (
                  <span key={i}>{p.year}</span>
                ))}
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
                {topCategories.length > 0 ? topCategories.map((cat, i) => {
                  const colors = [
                    { bar: 'bg-[#7a1f3d]', dot: 'bg-[#7a1f3d]' },
                    { bar: 'bg-blue-600', dot: 'bg-blue-600' },
                    { bar: 'bg-emerald-600', dot: 'bg-emerald-600' },
                    { bar: 'bg-amber-500', dot: 'bg-amber-500' },
                    { bar: 'bg-teal-600', dot: 'bg-teal-600' },
                    { bar: 'bg-red-600', dot: 'bg-red-600' },
                    { bar: 'bg-purple-600', dot: 'bg-purple-600' }
                  ];
                  const color = colors[i % colors.length];
                  const maxCount = topCategories[0]?.count || 1;
                  return (
                    <CategoryProgressBar key={cat.name} label={cat.name} count={cat.count} max={maxCount} barColor={color.bar} dotColor={color.dot} />
                  );
                }) : (
                  <p className="text-xs text-stone-400 text-center py-4">No categories data available yet.</p>
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