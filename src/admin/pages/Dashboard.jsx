import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAcademicYear } from '../context/AcademicYearContext';

function Dashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [deans, setDeans] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [students, setStudents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'submissions'), snap => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGroup = onSnapshot(collection(db, 'groups'), snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubDeans = onSnapshot(collection(db, 'deans'), snap => setDeans(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), snap => setAdvisers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubStudents = onSnapshot(collection(db, 'students'), snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc')), snap => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubSub(); unsubGroup(); unsubDeans(); unsubAdvisers(); unsubStudents(); unsubLogs(); };
  }, []);

  const filteredSubmissions = useMemo(() => filterByAcademicYear(submissions, 'createdAt'), [submissions, selectedYear]);
  const filteredGroups = useMemo(() => filterByAcademicYear(groups, 'createdAt'), [groups, selectedYear]);
  const filteredDeans = useMemo(() => filterByAcademicYear(deans, 'createdAt'), [deans, selectedYear]);
  const filteredAdvisers = useMemo(() => filterByAcademicYear(advisers, 'createdAt'), [advisers, selectedYear]);
  const filteredStudents = useMemo(() => filterByAcademicYear(students, 'createdAt'), [students, selectedYear]);
  const filteredLogs = useMemo(() => filterByAcademicYear(activityLogs, 'timestamp').slice(0, 5), [activityLogs, selectedYear]);

  const deptStats = useMemo(() => {
    const deptsMap = {};
    
    // Mapping of student courses to standard department names
    const courseToDeptMap = {
      'BS Information Technology': 'College of Information Technology',
      'Bachelor of Science in Information Technology': 'College of Information Technology',
      'BS Computer Science': 'College of Information Technology',
      'Bachelor of Science in Computer Science': 'College of Information Technology',
      'BS Computer Engineering': 'College of Information Technology',
      'Bachelor of Science in Computer Engineering': 'College of Information Technology',
      'BS Nursing': 'College of Nursing',
      'Bachelor of Science in Nursing': 'College of Nursing',
      'BS Accountancy': 'College of Business and Management',
      'Bachelor of Science in Accountancy': 'College of Business and Management',
      'BS Business Administration': 'College of Business and Management',
      'Bachelor of Science in Business Administration': 'College of Business and Management',
      'BS Civil Engineering': 'College of Engineering',
      'Bachelor of Science in Civil Engineering': 'College of Engineering',
      'BS Architecture': 'College of Architecture',
      'Bachelor of Science in Architecture': 'College of Architecture',
      'Doctor of Medicine': 'School of Medicine',
      'Doctor of Dental Medicine': 'School of Dentistry',
      'BS Psychology': 'College of Arts and Sciences',
      'Bachelor of Science in Psychology': 'College of Arts and Sciences',
    };
    
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
  }, [filteredSubmissions, filteredGroups, filteredDeans, filteredAdvisers, filteredStudents]);

  const categories = useMemo(() => {
    const cats = {};
    let totalPub = 0;
    
    // Use the same courseToDeptMap for consistency
    const courseToDeptMap = {
      'BS Information Technology': 'College of Information Technology',
      'Bachelor of Science in Information Technology': 'College of Information Technology',
      'BS Computer Science': 'College of Information Technology',
      'Bachelor of Science in Computer Science': 'College of Information Technology',
      'BS Computer Engineering': 'College of Information Technology',
      'Bachelor of Science in Computer Engineering': 'College of Information Technology',
      'BS Nursing': 'College of Nursing',
      'Bachelor of Science in Nursing': 'College of Nursing',
      'BS Accountancy': 'College of Business and Management',
      'Bachelor of Science in Accountancy': 'College of Business and Management',
      'BS Business Administration': 'College of Business and Management',
      'Bachelor of Science in Business Administration': 'College of Business and Management',
      'BS Civil Engineering': 'College of Engineering',
      'Bachelor of Science in Civil Engineering': 'College of Engineering',
      'BS Architecture': 'College of Architecture',
      'Bachelor of Science in Architecture': 'College of Architecture',
      'Doctor of Medicine': 'School of Medicine',
      'Doctor of Dental Medicine': 'School of Dentistry',
      'BS Psychology': 'College of Arts and Sciences',
      'Bachelor of Science in Psychology': 'College of Arts and Sciences',
    };

    filteredSubmissions.forEach(sub => {
      if (sub.reviewStatus === 'published') {
        const group = filteredGroups.find(g => g.leaderUid === sub.studentUid && (g.groupName === sub.groupName || g.researchTitle === (sub.title || sub.researchTitle)));
        const rawDName = group?.department || sub.program || group?.program || 'Unknown';
        const deptName = courseToDeptMap[rawDName] || rawDName;
        
        cats[deptName] = (cats[deptName] || 0) + 1;
        totalPub++;
      }
    });

    const colors = ['bg-[#801e38]', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-[#9c6e3b]', 'bg-indigo-500', 'bg-purple-500', 'bg-stone-400'];
    const strokeColors = ['#801e38', '#3b82f6', '#f59e0b', '#10b981', '#9c6e3b', '#6366f1', '#a855f7', '#a8a29e'];
    return Object.entries(cats)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count], index) => ({
        name, count,
        percentageVal: totalPub > 0 ? (count / totalPub) : 0,
        percentage: totalPub > 0 ? ((count / totalPub) * 100).toFixed(1) + '%' : '0%',
        color: colors[index % colors.length],
        strokeColor: strokeColors[index % strokeColors.length]
      }));
  }, [filteredSubmissions, filteredGroups]);

  const quickStats = useMemo(() => {
    const totalDepartments = new Set([...filteredDeans.map(d=>d.department), ...filteredAdvisers.map(a=>a.department)]).size;
    const totalPrograms = new Set(filteredStudents.map(s=>s.course)).size;
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
    syLabels.forEach(sy => counts[sy.full] = 0);
    
    filteredSubmissions.forEach(s => {
      const sy = s.schoolYear || syLabels[4].full;
      if(counts[sy] !== undefined) counts[sy]++;
    });
    
    return syLabels.map(sy => ({
      name: sy.short,
      uploads: counts[sy.full],
      isCurrent: sy.isCurrent
    }));
  }, [filteredSubmissions]);

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
            {quickStats.map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-stone-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                <div className={`absolute top-0 left-0 right-0 h-[4px] ${['bg-[#801e38]','bg-blue-500','bg-emerald-500','bg-[#801e38]','bg-[#9c6e3b]'][i]}`}></div>
                <h4 className={`text-4xl font-serif font-bold mb-1 ${['text-[#801e38]','text-blue-500','text-emerald-500','text-[#801e38]','text-[#9c6e3b]'][i]}`}>{stat}</h4>
                <div>
                  <p className="text-[11px] font-bold text-stone-800">{['Total Departments','Total Programs','Registered Users','Pending Invitations','Published Research'][i]}</p>
                  <p className="text-[9px] text-stone-400 mt-0.5 leading-tight">{['Active','Across all departments','Advisers + Students','Nursing — Dean not yet activate','Across all departments'][i]}</p>
                </div>
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
            <div className="w-full h-64 relative mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f3f3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#78716c' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1c1917', marginBottom: '4px' }}
                    cursor={{ stroke: '#801e38', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uploads" 
                    name="Total Submissions"
                    stroke="#801e38" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#801e38', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#801e38', stroke: '#ffffff', strokeWidth: 2 }}
                    animationDuration={1500}
                  >
                    <LabelList 
                      dataKey="uploads" 
                      position="top" 
                      offset={12} 
                      style={{ fill: '#801e38', fontSize: 11, fontWeight: 'bold' }} 
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute right-0 top-1/2 -mt-4 pointer-events-none" style={{ right: '5%' }}>
                <span className="bg-[#f5ebd9] text-[#801e38] text-[8px] px-2 py-0.5 rounded font-bold shadow-sm">
                  in progress
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Research Status per Department Horizontal Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Research Status per Department</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Uploaded vs Approved vs Published per department ({selectedYear})</p>
              </div>
            </div>
            <div className="space-y-6 pb-6 border-b border-stone-100">
              {deptStats.slice(0, 3).map((dept, i) => {
                const maxVal = Math.max(dept.uploaded, dept.approved, dept.published, 1);
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-stone-800 w-32 shrink-0">{dept.name}</span>
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
                  <span className="text-[11px] font-bold text-stone-800 w-32 shrink-0">{dept.name}</span>
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

            <div className="flex items-center gap-6 mt-6 justify-start text-[10px] font-bold uppercase tracking-wider text-stone-500">
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#e2d5de] rounded-sm"></span><span>Uploaded</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#64b494] rounded-sm"></span><span>Approved</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-[#9c6e3b] rounded-sm"></span><span>Published</span></div>
            </div>
          </div>

          {/* Row 4: Department Stats Table & Category Donut Pie Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm lg:col-span-2 overflow-x-auto">
              <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Department Statistics</h3><p className="text-[10px] text-stone-400 mt-0.5">Research papers status per department</p></div></div>
              <div className="overflow-x-auto min-w-[500px]">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#801e38] text-white uppercase text-[9px] font-bold tracking-wider"><th className="p-3 rounded-l-lg">Department</th><th className="p-3">Advisers</th><th className="p-3">Students</th><th className="p-3">Uploaded</th><th className="p-3">Approved</th><th className="p-3 rounded-r-lg">Published</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {deptStats.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3.5 font-bold text-stone-800 flex items-center gap-2">{row.name}{row.pending && <span className="bg-[#f4dee5] text-[#801e38] text-[8px] px-2 py-0.5 rounded-full font-bold">Pending</span>}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.advisers || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.students || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.uploaded || '—'}</td>
                        <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600'}`}>{row.approved || '—'}</td>
                        <td className={`p-3.5 font-bold ${row.pending ? 'text-stone-300' : 'text-[#801e38]'}`}>{row.published || '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone-50 font-bold border-t-2 border-stone-200">
                      <td className="p-3.5 uppercase tracking-wider text-stone-900">Total</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.advisers||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.students||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.uploaded||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.approved||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{deptStats.reduce((a,b)=>a+(b.published||0),0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-stone-150 shadow-sm">
              <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Recently Published Papers</h3><p className="text-[10px] text-stone-400 mt-0.5">Distribution of published works</p></div></div>
              <div className="flex justify-center mb-6"><div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="50" fill="transparent" stroke="#f5f5f5" strokeWidth="12" />
                  {(() => {
                    let cumulative = 0;
                    const circ = 314.159;
                    return categories.map((cat, i) => {
                      const arc = cat.percentageVal * circ;
                      const offset = -(cumulative * circ);
                      cumulative += cat.percentageVal;
                      return (
                        <circle key={i} cx="64" cy="64" r="50" fill="transparent" stroke={cat.strokeColor} strokeWidth="12" strokeDasharray={`${arc} ${circ}`} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute flex flex-col items-center"><span className="text-2xl font-serif font-bold text-[#801e38]">{quickStats[4]}</span><span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Total</span></div></div></div>
              <div className="space-y-2 text-[10px] max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {categories.map((cat, i) => (<div key={i} className="flex items-center justify-between font-bold"><div className="flex items-center gap-2 text-stone-600 truncate pr-2"><span className={`w-2 h-2 rounded-full shrink-0 ${cat.color}`}></span><span className="truncate text-[9px]">{cat.name}</span></div><span className="text-stone-900 shrink-0">{cat.count} <span className="text-stone-400 text-[8px] font-normal">{cat.percentage}</span></span></div>))}
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
