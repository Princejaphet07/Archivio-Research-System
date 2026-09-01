import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ComposedChart, Line, Bar, CartesianGrid, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { db } from '../firebase/config';

import { useNavigate } from 'react-router-dom';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';

export default function Dashboard({ activePage }) {
  const { deanData } = useUser();
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
  const [allRawSubmissions, setAllRawSubmissions] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [topPapersSort, setTopPapersSort] = useState('views'); // 'views' | 'likes'
  const [chartFilter, setChartFilter] = useState('year'); // 'year' | 'month'
  const [adviserTableYear, setAdviserTableYear] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Derive available years from data
  const availableYears = ['All', ...Array.from(new Set(allPapers.map(p => new Date(p.createdAt || Date.now()).getFullYear().toString())))].sort().reverse();

  useEffect(() => {
    // Wait for deanData to load
    if (!deanData) return;
    const deanDept = deanData.department || '';

    // Robust department matcher — handles partial matches, college prefix, and program codes
    const matchesDept = (g) => {
      if (!deanDept) return false;
      const deptLower = deanDept.toLowerCase();
      // Direct match on group's department field
      if (g.department && g.department.toLowerCase().includes(deptLower)) return true;
      if (g.department && deptLower.includes(g.department.toLowerCase())) return true;
      // Match via program field (e.g. BSIT → Information Technology)
      if (g.program && g.program.toLowerCase().includes(deptLower)) return true;
      if (deptLower && g.program && deptLower.includes(g.program.toLowerCase())) return true;
      return false;
    };

    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      setAllRawSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const deptGroups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(matchesDept);
      setStats(prev => ({ ...prev, totalGroups: deptGroups.length }));
      setAllGroups(deptGroups);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      setLoading(false);
    });

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
       const deptAdvisers = snapshot.docs.filter(d => {
         const dept = d.data().department || '';
         const deptLower = deanDept.toLowerCase();
         return dept.toLowerCase().includes(deptLower) || deptLower.includes(dept.toLowerCase());
       });
       setStats(prev => ({ ...prev, totalAdvisers: deptAdvisers.length }));
    });

    return () => { unsubSubmissions(); unsubGroups(); unsubAdvisers(); }
  }, [deanData]);

  // Process stats safely once both groups and submissions are loaded
  useEffect(() => {

    let approvedCount = 0;
    let publishedCount = 0;
    let pendingCount = 0;
    const advMap = {};
    const papers = [];
    const categoriesMap = {};
    const yearMap = {};

    allGroups.forEach(group => {
      // Find submission strictly matching the group
      const data = allRawSubmissions.find(s => s.studentUid === group.leaderUid && (s.groupName === group.groupName || (s.title || s.researchTitle) === group.researchTitle)) || {};
      
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
      
      const dateObj = new Date(data.createdAt || Date.now());
      
      let label = '';
      if (chartFilter === 'year') {
        label = dateObj.getFullYear().toString();
      } else {
        // By month: 'Jan', 'Feb', etc for the current year, or just format
        const currentYear = new Date().getFullYear();
        if (dateObj.getFullYear() === currentYear) {
          label = dateObj.toLocaleString('default', { month: 'short' });
        } else {
          // If past year, maybe 'Jan 2025'
          label = `${dateObj.toLocaleString('default', { month: 'short' })} '${dateObj.getFullYear().toString().slice(2)}`;
        }
      }

      if (!yearMap[label]) yearMap[label] = { count: 0, approved: 0, published: 0 };
      yearMap[label].count++;
      if (status === 'approved' || status === 'endorsed' || status === 'published') yearMap[label].approved++;
      if (status === 'published') yearMap[label].published++;
      
      const adviserUid = group.adviserUid || data.adviserUid;
      if (adviserUid) {
        const pubYear = new Date(data.createdAt || Date.now()).getFullYear().toString();
        
        if (adviserTableYear === 'All' || pubYear === adviserTableYear) {
          const advName = group.adviserName || data.adviserName || 'Unknown Adviser';
          if (!advMap[adviserUid]) {
            advMap[adviserUid] = { uid: adviserUid, name: advName, uploads: 0, approved: 0, published: 0, pending: 0 };
          }
          advMap[adviserUid].uploads++;
          if (status === 'approved') advMap[adviserUid].approved++;
          if (status === 'published') advMap[adviserUid].published++;
          if (status === 'pending' || status === 'revision') advMap[adviserUid].pending++;
        }
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
    
    const yearArray = Object.keys(yearMap).map(l => ({ label: l, count: yearMap[l].count, approved: yearMap[l].approved, published: yearMap[l].published }));
    if (chartFilter === 'year') {
      yearArray.sort((a, b) => parseInt(a.label) - parseInt(b.label));
    } else {
      // Month sorting is tricky if we mix years, but if it's mostly chronological we rely on it, or sort by parsed date.
      // Easiest is to parse back or assume chronological if we just map. But for now, rely on chronological map keys or sort by parsed string.
      // Let's sort by Date parsed from label
      yearArray.sort((a, b) => new Date(a.label + (a.label.includes("'") ? "" : ` ${new Date().getFullYear()}`)) - new Date(b.label + (b.label.includes("'") ? "" : ` ${new Date().getFullYear()}`)));
    }
    setYearlyStats(yearArray);

  }, [allRawSubmissions, allGroups, chartFilter, adviserTableYear]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
        <Sidebar activePage="dashboard" />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header activePage="dashboard" />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-6 gap-4 mb-6">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-2">
                 <div className="h-64 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 animate-pulse">
                   <div className="h-5 w-40 bg-stone-200 dark:bg-stone-700 rounded mb-4"></div>
                   <div className="h-44 bg-stone-100 dark:bg-stone-900 rounded"></div>
                 </div>
              </div>
              <div>
                <ListSkeleton items={4} />
              </div>
            </div>
          </main>
        </div>
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
  
  if (chartFilter === 'year' && chartData.length < 4) {
    const padCount = 4 - chartData.length;
    const startYear = chartData.length > 0 ? parseInt(chartData[0].label) - padCount : currentYear - 3;
    const padding = Array.from({length: padCount}, (_, i) => ({ label: (startYear + i).toString(), count: 0, approved: 0, published: 0 }));
    chartData = [...padding, ...chartData];
  } else if (chartFilter === 'month' && chartData.length === 0) {
    // If no data for month, pad with generic months
    chartData = [
      { label: 'Jan', count: 0, approved: 0, published: 0 },
      { label: 'Feb', count: 0, approved: 0, published: 0 },
      { label: 'Mar', count: 0, approved: 0, published: 0 },
      { label: 'Apr', count: 0, approved: 0, published: 0 }
    ];
  }
  const maxCount = Math.max(...chartData.map(d => d.count), 10);
  
  // Color palette for charts
  const COLORS = ['#7a1f3d', '#2563eb', '#059669', '#d97706', '#0d9488', '#dc2626', '#7c3aed'];
  const BRAND_COLORS = ['#4a1024', '#7a1f3d', '#9e2752', '#d4af37', '#f8d070', '#8a7a7a', '#d6cfc7'];

  const sortedTopPapers = [...allPapers].sort((a, b) => {
    const aScore = topPapersSort === 'likes' ? (a.likes?.length || 0) : (a.views || 0);
    const bScore = topPapersSort === 'likes' ? (b.likes?.length || 0) : (b.views || 0);
    return bScore - aScore;
  }).slice(0, 5);

  const handleExportCSV = () => {
    if (!allPapers || allPapers.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Title", "Adviser", "Department", "Status", "Date Submitted"];
    const rows = allPapers.map(paper => {
      const date = paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : 'N/A';
      return [
        `"${(paper.title || '').replace(/"/g, '""')}"`,
        `"${(paper.adviserName || '').replace(/"/g, '""')}"`,
        `"${(paper.department || '').replace(/"/g, '""')}"`,
        `"${(paper.status || '').replace(/"/g, '""')}"`,
        date
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dean_Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Right Core Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header activePage="dashboard" />

        {/* Main Workspace Panel */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f0e6] dark:bg-stone-900 transition-colors">

          {/* ================= WELCOME HEADER SECTION ================= */}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[#4a1024] dark:text-[#9e2752] tracking-tight flex items-center gap-2">
                {getGreeting()}, {firstName} <span className="animate-wave origin-bottom-right inline-block">👋</span>
              </h1>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wider">
                {deanData?.department || 'Department'} • S.Y. 2026–2027, 2nd Semester
              </p>
            </div>
            <div className="flex gap-2.5">
              <PremiumButton 
                onClick={handleExportCSV}
                variant="ghost"
                className="flex items-center gap-1.5"
              >
                <span>📤</span> Export
              </PremiumButton>
              <PremiumButton
                onClick={() => navigate('/dean/publish-queue')}
                variant="primary"
                className="flex items-center gap-2"
              >
                <span>📋</span> Publish Queue <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">{stats.approved}</span>
              </PremiumButton>
            </div>
          </div>

          {/* ================= KPI STATS HIGHLIGHT GRID ================= */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            {loading ? (
              <>
                <div className="col-span-2"><CardSkeleton borderTopColor="#3b82f6" /></div>
                <div className="col-span-1"><CardSkeleton borderTopColor="#22c55e" /></div>
                <div className="col-span-1"><CardSkeleton borderTopColor="#eab308" /></div>
                <div className="col-span-1"><CardSkeleton borderTopColor="#ef4444" /></div>
                <div className="col-span-1"><CardSkeleton borderTopColor="#64748b" /></div>
              </>
            ) : (
              <>
                <KpiCard title="TOTAL GROUP" value={stats.totalGroups} trend="Total registered" icon="📁" />
                <KpiCard title="APPROVED" value={stats.approved} trend="Awaiting publish" icon="✅" highlight />
                <KpiCard title="PUBLISHED" value={stats.published} trend="Live in archive" icon="🌐" />
                <KpiCard title="PENDING REVIEW" value={stats.pending} trend="Needs attention" icon="⏳" warning />
                <KpiCard title="TOTAL ADVISERS" value={stats.totalAdvisers} subtext="Registered advisers" icon="👥" />
                <KpiCard title="COMPLETION RATE" value={`${stats.totalGroups > 0 ? Math.round((stats.published / stats.totalGroups) * 100) : 0}%`} trend="Published / Total" icon="📈" />
              </>
            )}
          </div>

          {/* ================= CHARTS AND SUMMARIES GRID (ROW 2) ================= */}
          <div className="grid grid-cols-3 gap-6 mb-6">

            {/* Research Upload Trend Line Chart */}
            <Card glass={true} className="col-span-2 p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Research Upload Trend</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Dynamic — adjust filters below</p>
                </div>
                <div className="flex bg-stone-100 dark:bg-stone-800/80 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[11px] font-bold">
                  <button 
                    onClick={() => setChartFilter('year')}
                    className={`px-3 py-1 rounded-md shadow-sm transition-all ${chartFilter === 'year' ? 'bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200'}`}
                  >
                    By Year
                  </button>
                  <button 
                    onClick={() => setChartFilter('month')}
                    className={`px-3 py-1 rounded-md shadow-sm transition-all ${chartFilter === 'month' ? 'bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-200'}`}
                  >
                    By Month
                  </button>
                </div>
              </div>

              <div className="relative h-44 w-full mt-2 flex items-end">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7a1f3d" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7a1f3d" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 'bold'}} dy={10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(150, 150, 150, 0.3)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="count" name="Total Uploads" stroke="#7a1f3d" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" animationDuration={1500} />
                    <Area type="monotone" dataKey="approved" name="Approved Papers" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorApproved)" animationDuration={1500} />
                    <Area type="monotone" dataKey="published" name="Published Papers" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorPublished)" animationDuration={1500} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Yearly Summary */}
            <Card glass={true} className="p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Yearly Summary</h3>
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
                    <YearMetricBox key={d.label || i} year={d.label} count={d.count} badge={badge} growth={growthText} textGreen={textGreen} active={false} />
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ================= CATEGORIES AND LEADERBOARD (ROW 3) ================= */}
          <div className="grid grid-cols-3 gap-6 mb-6">

            {/* Top Research Categories */}
            <Card glass={true} className="col-span-2 p-6">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Top Research Categories</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Distribution by field of study</p>
                </div>
              </div>
              <div className="h-64 mt-4 relative flex items-center justify-center">
                {topCategories.length > 0 ? (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest max-w-[120px] text-center truncate">
                        {activeIndex >= 0 ? topCategories[activeIndex].name : 'Total Papers'}
                      </span>
                      <span className="text-3xl font-serif font-extrabold text-[#7a1f3d] dark:text-[#f8d070] leading-none mt-1">
                        {activeIndex >= 0 ? topCategories[activeIndex].count : topCategories.reduce((acc, curr) => acc + curr.count, 0)}
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="name"
                          stroke="none"
                          onMouseEnter={(_, index) => setActiveIndex(index)}
                          onMouseLeave={() => setActiveIndex(-1)}
                        >
                          {topCategories.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={BRAND_COLORS[index % BRAND_COLORS.length]} 
                              opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.25}
                              className="transition-all duration-300 outline-none"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <p className="text-xs text-stone-400 text-center">No categories data available yet.</p>
                )}
              </div>
            </Card>

            {/* Top Research Papers */}
            <Card glass={true} className="p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Top Research Papers</h3>
                <div className="flex bg-stone-100 dark:bg-stone-800/80 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[10px] font-bold">
                  <button 
                    onClick={() => setTopPapersSort('likes')}
                    className={`${topPapersSort === 'likes' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 hover:text-stone-700 dark:text-stone-300'} px-2.5 py-1 rounded-md transition-all`}
                  >👍 Liked</button>
                  <button 
                    onClick={() => setTopPapersSort('views')}
                    className={`${topPapersSort === 'views' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 hover:text-stone-700 dark:text-stone-300'} px-2.5 py-1 rounded-md transition-all`}
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
            </Card>
          </div>

          {/* ================= ADVISER UPLOAD STATISTICS ================= */}
          <Card glass={true} className="overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Adviser Upload Statistics</h3>
                <p className="text-xs text-amber-600 font-medium mt-0.5">★ Your row is highlighted — you are also an Adviser</p>
              </div>
              <div className="flex gap-2">
                <select 
                  value={adviserTableYear}
                  onChange={(e) => setAdviserTableYear(e.target.value)}
                  className="text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md px-2.5 py-1 font-semibold text-stone-600 dark:text-stone-400 outline-none"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr === 'All' ? 'All Time' : yr}</option>
                  ))}
                </select>
                <button 
                  onClick={handleRefresh}
                  className={`p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <th className="py-3 px-5">Adviser</th>
                    <th className="py-3 px-4 text-left">Uploads <span className="text-[9px] inline-block ml-1 opacity-60">↓</span></th>
                    <th className="py-3 px-4 text-left">Approved</th>
                    <th className="py-3 px-4 text-left">Published</th>
                    <th className="py-3 px-4 text-left">Pending</th>
                    <th className="py-3 px-5 w-44">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700 dark:text-stone-300">
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
                        <tr key={adv.uid} className={`${isYou ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-stone-50 dark:hover:bg-stone-700'} transition-colors`}>
                          <td className="py-3.5 px-5 flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full ${isYou ? 'bg-amber-500/20 text-amber-800' : 'bg-purple-100 text-purple-700'} font-bold flex items-center justify-center text-[11px]`}>{initials}</div>
                            <div>
                              <span className="font-bold text-stone-900 dark:text-stone-100">{adv.name}</span>
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
                                <div className="bg-[#7a1f3d] dark:bg-[#d4af37] dark:text-[#4a1024] h-full" style={{ width: `${adv.rate}%` }}></div>
                              </div>
                              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 w-8 text-right">{adv.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </main>
      </div>
    </div>
  );
}

// ================= PRIVATE COMPONENT MACROS =================

function KpiCard({ title, value, trend, trendSub, subtext, icon, highlight, warning }) {
  return (
    <Card glass={true} className={`p-4 transition-all hover:-translate-y-[2px] ${highlight ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/20' : ''} flex flex-col justify-between`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-wider">{title}</span>
        <span className="text-xs opacity-70">{icon}</span>
      </div>
      <h4 className="text-2xl font-serif font-extrabold text-stone-900 dark:text-stone-100 leading-none mb-1.5">{value}</h4>
      {trend && (
        <div className="flex items-center gap-1 text-[9px] font-bold">
          <span className={`px-1.5 py-0.5 rounded ${warning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {trend}
          </span>
          <span className="text-stone-400 font-medium">{trendSub}</span>
        </div>
      )}
      {subtext && <p className="text-[10px] text-stone-400 font-medium">{subtext}</p>}
    </Card>
  );
}

function YearMetricBox({ year, count, badge, growth, textGreen, active }) {
  return (
    <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:-translate-y-[2px] shadow-sm ${active ? 'border-[#7a1f3d] dark:border-[#f8d070]/50 bg-[#7a1f3d]/10 dark:bg-[#f8d070]/10 ring-1 ring-[#7a1f3d]/50 dark:ring-[#f8d070]/30' : 'border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm hover:bg-stone-50/80 dark:hover:bg-stone-800/80'}`}>
      <span className={`text-xs font-bold ${active ? 'text-[#7a1f3d] dark:text-[#f8d070]' : 'text-stone-800 dark:text-stone-200'}`}>{year}</span>
      <span className={`text-lg font-serif font-bold ${active ? 'text-[#7a1f3d] dark:text-[#f8d070]' : 'text-stone-900 dark:text-stone-100'} my-0.5`}>{count} <span className="text-[10px] font-sans font-medium text-stone-400">uploads</span></span>
      {badge && <span className="text-[9px] text-stone-400 font-bold tracking-tight uppercase">{badge}</span>}
      {growth && <span className={`text-[10px] font-extrabold ${textGreen ? 'text-emerald-600' : 'text-stone-500 dark:text-stone-400'}`}>{growth}</span>}
    </div>
  );
}



function PaperRow({ rank, title, author, count, icon, highlight }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:-translate-y-[1px] shadow-sm ${highlight ? 'border-[#7a1f3d]/40 bg-[#7a1f3d]/10 dark:bg-[#d4af37]/10' : 'border-stone-200/50 dark:border-stone-700/50 bg-white/40 dark:bg-stone-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-stone-800/60'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ${rank === 1 ? 'bg-amber-100 text-amber-700' : rank === 2 ? 'bg-stone-200 text-stone-700 dark:text-stone-300' : 'bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400'}`}>
          {rank}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{title}</h4>
          <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">{author}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 font-bold text-stone-600 dark:text-stone-400 text-xs shrink-0 bg-white dark:bg-stone-800 px-2 py-1 rounded-md border border-stone-100 shadow-sm">
        <span>{icon || '👍'}</span> {count}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-700 p-4 rounded-xl shadow-xl">
        <p className="font-bold text-stone-900 dark:text-stone-100 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs font-medium mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill || '#d4af37' }}></div>
            <span className="text-stone-600 dark:text-stone-400 capitalize">{entry.name}:</span>
            <span className="text-stone-900 dark:text-stone-100 font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
