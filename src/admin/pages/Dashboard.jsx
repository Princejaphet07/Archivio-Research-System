import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell } from 'recharts';
import { Building2, GraduationCap, Users, UserPlus, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardBody, StatCard, SectionTitle } from '../../components/ui/Card';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { useAcademicYear } from '../context/AcademicYearContext';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import ListSkeleton from '../components/skeletons/ListSkeleton';

function Dashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [deans, setDeans] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [students, setStudents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  useEffect(() => {
    let loadedCount = 0;
    const totalSnapshots = 8;
    const markLoaded = () => { loadedCount++; if (loadedCount >= totalSnapshots) setLoading(false); };

    const unsubSub = onSnapshot(collection(db, 'submissions'), snap => { setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubGroup = onSnapshot(collection(db, 'groups'), snap => { setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubDeans = onSnapshot(collection(db, 'deans'), snap => { setDeans(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), snap => { setAdvisers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubStudents = onSnapshot(collection(db, 'students'), snap => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100)), snap => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded();
    });
    const unsubDepts = onSnapshot(collection(db, 'departments'), snap => { setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    const unsubProgs = onSnapshot(collection(db, 'programs'), snap => { setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() }))); markLoaded(); });
    return () => { unsubSub(); unsubGroup(); unsubDeans(); unsubAdvisers(); unsubStudents(); unsubLogs(); unsubDepts(); unsubProgs(); };
  }, []);

  const filteredSubmissions = useMemo(() => filterByAcademicYear(submissions, 'createdAt'), [submissions, selectedYear]);
  const filteredGroups = useMemo(() => filterByAcademicYear(groups, 'createdAt'), [groups, selectedYear]);
  const filteredDeans = useMemo(() => filterByAcademicYear(deans, 'createdAt'), [deans, selectedYear]);
  const filteredAdvisers = useMemo(() => filterByAcademicYear(advisers, 'createdAt'), [advisers, selectedYear]);
  const filteredStudents = useMemo(() => filterByAcademicYear(students, 'createdAt'), [students, selectedYear]);
  const filteredLogs = useMemo(() => filterByAcademicYear(activityLogs, 'timestamp').slice(0, 5), [activityLogs, selectedYear]);

  const deptStats = useMemo(() => {
    const deptsMap = {};
    
    // Initialize with active departments from DB
    departments.forEach(d => {
      if (d.name) {
        deptsMap[d.name] = { name: d.name, advisers: 0, students: 0, uploaded: 0, approved: 0, published: 0, pending: false };
      }
    });
    
    // Dynamic Mapping of student courses/programs to department names
    const courseToDeptMap = {};
    programs.forEach(p => {
      if (p.name && p.school) { courseToDeptMap[p.name] = p.school; if (p.name.startsWith('Bachelor of Science in ')) { courseToDeptMap[p.name.replace('Bachelor of Science in ', 'BS ')] = p.school; } }
      if (p.code && p.school) courseToDeptMap[p.code] = p.school;
    });
    
    filteredDeans.forEach(dean => {
      const dName = dean.department || 'Unknown';
      if (!deptsMap[dName]) deptsMap[dName] = { name: dName, advisers: 0, students: 0, uploaded: 0, approved: 0, published: 0, pending: false };
    });

    filteredAdvisers.forEach(adv => {
      const dName = adv.department || 'Unknown';
      if (!deptsMap[dName]) deptsMap[dName] = { name: dName, advisers: 0, students: 0, uploaded: 0, approved: 0, published: 0, pending: false };
      deptsMap[dName].advisers++;
    });

    filteredStudents.forEach(st => {
      const dName = courseToDeptMap[st.course] || st.course || 'Unknown';
      if (!deptsMap[dName]) deptsMap[dName] = { name: dName, advisers: 0, students: 0, uploaded: 0, approved: 0, published: 0, pending: false };
      deptsMap[dName].students++;
    });

    filteredSubmissions.forEach(sub => {
      const group = filteredGroups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
      const rawDName = group?.department || sub.program || group?.program || 'Unknown';
      const dName = courseToDeptMap[rawDName] || rawDName;
      if (!deptsMap[dName]) deptsMap[dName] = { name: dName, advisers: 0, students: 0, uploaded: 0, approved: 0, published: 0, pending: false };
      
      deptsMap[dName].uploaded++;
      if (sub.reviewStatus === 'endorsed' || sub.adviserStatus === 'approved') deptsMap[dName].approved++;
      if (sub.reviewStatus === 'published') deptsMap[dName].published++;
    });

    return Object.values(deptsMap).sort((a,b) => b.uploaded - a.uploaded);
  }, [filteredSubmissions, filteredGroups, filteredDeans, filteredAdvisers, filteredStudents, departments, programs]);

  const categories = useMemo(() => {
    // Initialize dynamically with active departments
    const cats = {};
    departments.forEach(d => {
      if (d.name) cats[d.name] = 0;
    });
    
    let totalPub = 0;
    
    // Dynamic Mapping of student courses/programs to department names
    const courseToDeptMap = {};
    programs.forEach(p => {
      if (p.name && p.school) { courseToDeptMap[p.name] = p.school; if (p.name.startsWith('Bachelor of Science in ')) { courseToDeptMap[p.name.replace('Bachelor of Science in ', 'BS ')] = p.school; } }
      if (p.code && p.school) courseToDeptMap[p.code] = p.school;
    });

    filteredSubmissions.forEach(sub => {
      if (sub.reviewStatus === 'published') {
        const group = filteredGroups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
        const rawDName = group?.department || sub.program || group?.program || 'Unknown';
        const deptName = courseToDeptMap[rawDName] || rawDName;
        
        if (cats.hasOwnProperty(deptName)) {
          cats[deptName] = (cats[deptName] || 0) + 1;
        } else {
          cats[deptName] = (cats[deptName] || 0) + 1;
        }
        totalPub++;
      }
    });

    const colors = ['bg-[#4a1024]', 'bg-[#7a1f3d]', 'bg-[#9e2752]', 'bg-[#d4af37]', 'bg-[#f8d070]', 'bg-[#8a7a7a]', 'bg-[#d6cfc7]', 'bg-[#1c1917]'];
    const strokeColors = ['#4a1024', '#7a1f3d', '#9e2752', '#d4af37', '#f8d070', '#8a7a7a', '#d6cfc7', '#1c1917'];
    
    return Object.entries(cats)
      // Only keep departments that exist in DB (or fallback for unknown ones with count > 0)
      .filter(([name, count]) => count > 0 || departments.some(d => d.name === name))
      .map(([name, count], index) => {
        // Use acronyms for chart axes to save space
        const acronym = name.split(' ').map(w => w[0]).join('').replace(/o/g, '').replace(/a/g, 'A'); 
        const shortName = name === 'College of Information Technology' ? 'CIT' :
                          name === 'College of Nursing' ? 'CON' :
                          name === 'College of Business and Management' ? 'CBM' :
                          name === 'College of Engineering' ? 'COE' :
                          name === 'College of Architecture' ? 'COA' :
                          name === 'School of Medicine' ? 'SOM' :
                          name === 'School of Dentistry' ? 'SOD' :
                          name === 'College of Arts and Sciences' ? 'CAS' : acronym;

        return {
          name: shortName,
          fullName: name, // Add full name for the legend/list below
          count,
          percentage: totalPub === 0 ? '0.0%' : ((count / totalPub) * 100).toFixed(1) + '%',
          percentageVal: totalPub === 0 ? 0 : (count / totalPub),
          color: colors[index % colors.length],
          strokeColor: strokeColors[index % strokeColors.length]
        };
      });
  }, [filteredSubmissions, filteredGroups, departments, programs]);

  const quickStats = useMemo(() => {
    const totalDepartments = departments.length;
    const totalPrograms = programs.length;
    const totalUsers = filteredDeans.length + filteredAdvisers.length + filteredStudents.length;
    
    // Dynamically calculate pending invitations
    const pendingDeans = filteredDeans.filter(d => d.status === 'pending' || d.accountStatus === 'pending_activation').length;
    const pendingAdvisers = filteredAdvisers.filter(a => a.status === 'pending' || a.accountStatus === 'pending_activation').length;
    const totalPending = pendingDeans + pendingAdvisers;
    
    const publishedCount = filteredSubmissions.filter(s => s.reviewStatus === 'published').length;
    return [totalDepartments, totalPrograms, totalUsers, totalPending, publishedCount];
  }, [filteredSubmissions, filteredDeans, filteredAdvisers, filteredStudents]);

  const yearlyChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const baseYear = currentMonth < 7 ? currentYear - 1 : currentYear;
    
    const syLabels = [];
    for (let i = 4; i >= 0; i--) {
      syLabels.push({
        full: `${baseYear - i}-${baseYear - i + 1}`,
        short: `SY ${String(baseYear - i).slice(2)}-${String(baseYear - i + 1).slice(2)}`,
        isCurrent: i === 0
      });
    }

    const counts = {};
    const publishedCounts = {};
    const approvedCounts = {};
    syLabels.forEach(sy => { counts[sy.full] = 0; publishedCounts[sy.full] = 0; approvedCounts[sy.full] = 0; });
    
    filteredSubmissions.forEach(s => {
      const sy = s.schoolYear || syLabels[4].full;
      if(counts[sy] !== undefined) {
        counts[sy]++;
        if (s.reviewStatus === 'endorsed' || s.adviserStatus === 'approved' || s.reviewStatus === 'published') {
          approvedCounts[sy]++;
        }
        if (s.reviewStatus === 'published') {
          publishedCounts[sy]++;
        }
      }
    });
    
    return syLabels.map(sy => ({
      name: sy.short,
      uploads: counts[sy.full],
      approved: approvedCounts[sy.full],
      published: publishedCounts[sy.full],
      isCurrent: sy.isCurrent
    }));
  }, [filteredSubmissions]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <Header title="Dashboard" breadcrumbs={['Dashboard']} />
          <div className="p-6 space-y-6">
            {/* Skeleton: Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} borderTopColor={['#7B1F35','#3b82f6','#22c55e','#f59e0b','#7B1F35'][i]} />)}
            </div>
            {/* Skeleton: Chart Card */}
            <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 animate-pulse">
              <div className="h-5 w-52 bg-stone-200 dark:bg-stone-700 rounded-full mb-4" />
              <div className="h-64 bg-stone-100 dark:bg-stone-900 rounded-xl" />
            </div>
            {/* Skeleton: Bar Chart Card */}
            <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 animate-pulse">
              <div className="h-5 w-60 bg-stone-200 dark:bg-stone-700 rounded-full mb-4" />
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4" style={{ opacity: 1 - i * 0.2 }}>
                    <div className="h-3 w-28 bg-stone-200 dark:bg-stone-700 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded-full" style={{ width: `${80 - i * 20}%` }} />
                      <div className="h-4 bg-stone-100 dark:bg-stone-700/50 rounded-full" style={{ width: `${60 - i * 15}%` }} />
                      <div className="h-4 bg-stone-100 dark:bg-stone-700/40 rounded-full" style={{ width: `${40 - i * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Skeleton: Table + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><TableSkeleton rows={4} /></div>
              <div><ListSkeleton items={4} /></div>
            </div>
            {/* Skeleton: Storage */}
            <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 animate-pulse">
              <div className="h-5 w-44 bg-stone-200 dark:bg-stone-700 rounded-full mb-4" />
              <div className="flex items-center gap-6">
                <div className="h-14 w-20 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                <div className="flex-1 h-4 bg-stone-100 dark:bg-stone-800 rounded-full"><div className="h-full w-2/3 bg-stone-200 dark:bg-stone-700 rounded-full" /></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
      
      <Sidebar />

      {/* ================== MAIN CONTENT CONTAINER ================== */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Component */}
        <Header title="Dashboard" breadcrumbs={['Dashboard']} />

        {/* Dashboard Content Panel */}
        <div className="p-6 space-y-6">
          
          {/* Row 1: Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={<Building2 />} label="Total Departments" value={quickStats[0]} sub="Active" color="maroon" />
            <StatCard icon={<GraduationCap />} label="Total Programs" value={quickStats[1]} sub="Across all departments" color="blue" />
            <StatCard icon={<Users />} label="Registered Users" value={quickStats[2]} sub="Advisers + Students" color="green" />
            <StatCard icon={<UserPlus />} label="Pending Invitations" value={quickStats[3]} sub="Needs activation" color="amber" />
            <StatCard icon={<BookOpen />} label="Published Research" value={quickStats[4]} sub="Across all departments" color="maroon" />
          </div>

          {/* Row 2: Yearly Research Upload Trend */}
          <Card className="mb-6 overflow-hidden border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardBody>
              <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[#7B1F35]/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#7B1F35]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Yearly Research Upload Trend</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Total submissions recorded per academic school year</p>
              </div>
            </div>
            <div className="w-full h-64 relative mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearlyChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7a1f3d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7a1f3d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4a1024" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4a1024" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(150, 150, 150, 0.3)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', paddingTop: '10px' }} />
                  
                  <Area type="monotone" dataKey="uploads" name="Total Uploads" stroke="#7a1f3d" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" animationDuration={1500} />
                  <Area type="monotone" dataKey="approved" name="Approved Papers" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorApproved)" animationDuration={1500} />
                  <Area type="monotone" dataKey="published" name="Published Papers" stroke="#4a1024" strokeWidth={3} fillOpacity={1} fill="url(#colorPublished)" animationDuration={1500} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            </CardBody>
          </Card>

          {/* Row 3: Research Status per Department Horizontal Bar Chart */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-center gap-2 mb-6">
              <div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Research Status per Department</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Uploaded vs Approved vs Published per department ({selectedYear})</p>
              </div>
            </div>
            <div className="space-y-6 pb-6 border-b border-stone-100 dark:border-stone-800/50">
              {deptStats.slice(0, 3).map((dept, i) => {
                const maxVal = Math.max(dept.uploaded, dept.approved, dept.published, 1);
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100 w-32 shrink-0">{dept.name}</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2"><div className="bg-[#e2d5de] h-4 rounded-r-md" style={{ width: `${(dept.uploaded/maxVal)*100}%` }}></div><span className="text-[10px] font-bold text-[#801e38]">{dept.uploaded}</span></div>
                      <div className="flex items-center gap-2"><div className="bg-[#64b494] h-4 rounded-r-md" style={{ width: `${(dept.approved/maxVal)*100}%` }}></div><span className="text-[10px] font-bold text-[#64b494]">{dept.approved}</span></div>
                      <div className="flex items-center gap-2"><div className="bg-[#9c6e3b] h-4 rounded-r-md" style={{ width: `${(dept.published/maxVal)*100}%` }}></div><span className="text-[10px] font-bold text-[#9c6e3b]">{dept.published}</span></div>
                    </div>
                  </div>
                );
              })}
              {deptStats.filter(d => d.pending).map((dept, i) => (
                <div key={`pend-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100 w-32 shrink-0">{dept.name}</span>
                  <div className="flex-1 flex items-center h-16 bg-[#f5ebd9]/30 border border-dashed border-[#801e38]/30 rounded-xl px-4"><span className="text-[10px] text-[#801e38] font-bold">Pending — Invitation has sent</span></div>
                </div>
              ))}
            </div>
            
            {/* X Axis */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex justify-between text-[9px] font-semibold text-stone-400 pl-36 pr-4">
                <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span>
              </div>
              <div className="text-center text-[9px] text-stone-400 font-semibold pl-32">Number of Papers</div>
            </div>

            <div className="flex items-center gap-6 mt-6 justify-start text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#e2d5de] rounded-sm"></span><span>Uploaded</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#64b494] rounded-sm"></span><span>Approved</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#9c6e3b] rounded-sm"></span><span>Published</span></div>
            </div>
            </CardBody>
          </Card>

          {/* Row 4: Department Stats Table & Category Donut Pie Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 overflow-x-auto border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
              <CardBody>
                <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Department Statistics</h3><p className="text-[10px] text-stone-400 mt-0.5">Research papers status per department</p></div></div>
                <div className="overflow-x-auto min-w-[500px]">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#801e38] text-white uppercase text-[9px] font-bold tracking-wider"><th className="p-3 rounded-l-lg">Department</th><th className="p-3">Advisers</th><th className="p-3">Students</th><th className="p-3">Uploaded</th><th className="p-3">Approved</th><th className="p-3 rounded-r-lg">Published</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {deptStats.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors">
                        <td className="p-3.5 font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">{row.name}{row.pending && <span className="bg-[#f4dee5] text-[#801e38] text-[8px] px-2 py-0.5 rounded-full font-bold">Pending</span>}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.advisers || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.students || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.uploaded || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.approved || '—'}</td>
                        <td className={`p-3.5 font-bold ${row.pending ? 'text-stone-300' : 'text-[#801e38]'}`}>{row.published || '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone-50 dark:bg-[#252525] font-bold border-t-2 border-stone-200 dark:border-stone-700">
                      <td className="p-3.5 uppercase tracking-wider text-stone-900 dark:text-stone-50">Total</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.advisers||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.students||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.uploaded||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.approved||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.published||0),0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </CardBody>
            </Card>
            <Card className="border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
                <CardBody>
                  <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Recently Published Papers</h3><p className="text-[10px] text-stone-400 mt-0.5">Distribution of published works</p></div></div>
                  <div className="flex justify-center mb-4">
                  <div className="relative w-full h-[220px]">
                    {categories.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest max-w-[120px] text-center truncate">
                          {activeIndex >= 0 ? categories[activeIndex].name : 'Total Papers'}
                        </span>
                        <span className="text-3xl font-serif font-extrabold text-[#7a1f3d] dark:text-[#f8d070] leading-none mt-1">
                          {activeIndex >= 0 ? categories[activeIndex].count : categories.reduce((acc, curr) => acc + curr.count, 0)}
                        </span>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="count"
                          nameKey="name"
                          animationDuration={1500}
                          stroke="none"
                          onMouseEnter={(_, index) => setActiveIndex(index)}
                          onMouseLeave={() => setActiveIndex(-1)}
                        >
                          {categories.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.strokeColor} 
                              opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.25}
                              className="transition-all duration-300 outline-none cursor-pointer" 
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>            </div>
              
              <div className="space-y-2 text-[10px] max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {categories.map((cat, i) => (<div key={i} className="flex items-center justify-between font-bold"><div className="flex items-center gap-2 text-stone-600 dark:text-stone-300 truncate pr-2"><span className={`w-2 h-2 rounded-full shrink-0 ${cat.color}`}></span><span className="truncate text-[9px]">{cat.fullName || cat.name}</span></div><span className="text-stone-900 dark:text-stone-50 shrink-0">{cat.count} <span className="text-stone-400 text-[8px] font-normal">{cat.percentage}</span></span></div>))}
              </div>
              </CardBody>
            </Card>
          </div>

          {/* Row 5: Storage Usage Overview */}
          <Card className="mb-6 border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardBody>
              <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Storage Usage Overview</h3></div></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"><div className="flex items-center gap-6 w-full md:w-2/3"><h2 className="text-5xl font-serif font-bold text-[#801e38]">68%</h2><div className="flex-1"><div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"><span className="text-[#801e38]">68% Used</span><span className="text-emerald-600">32% Free</span></div><div className="w-full bg-stone-100 dark:bg-stone-800 h-4 rounded-full overflow-hidden border border-stone-150"><div className="bg-[#801e38] h-full rounded-full" style={{ width: '68%' }}></div></div></div></div><div className="w-full md:w-1/3 text-xs border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-700 pt-4 md:pt-0 md:pl-6 space-y-2"><div className="flex justify-between font-bold text-stone-600 dark:text-stone-300"><span>Total Files Uploaded</span><span className="text-stone-900 dark:text-stone-50 font-bold">536 files</span></div><div className="flex justify-between font-bold text-stone-600 dark:text-stone-300"><span>Published Papers</span><span className="text-stone-900 dark:text-stone-50 font-bold">108 files</span></div><div className="flex justify-between font-bold text-stone-600 dark:text-stone-300"><span>Supporting Documents</span><span className="text-stone-900 dark:text-stone-50 font-bold">292 files</span></div><div className="flex justify-between font-bold text-stone-600 dark:text-stone-300"><span>Other Assets</span><span className="text-stone-900 dark:text-stone-50 font-bold">136 files</span></div></div></div>
            <div className="bg-[#801e38]/5 border border-[#801e38]/10 rounded-xl px-4 py-3 mt-5 flex items-center gap-2 text-xs font-bold text-[#801e38]"><span>⚠️</span><span>Storage above 60% — consider archiving old records.</span></div>
            </CardBody>
          </Card>

        </div>
      </main>

    </div>
  );
}

export default Dashboard;


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
