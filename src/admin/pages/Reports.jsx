import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAcademicYear } from '../context/AcademicYearContext';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Building2, Trash2, Printer, Download, FileText, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { Card, SectionTitle, PremiumButton, StatCard } from '../../components/ui/Card';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';

const reportTypes = [
  {
    id: 'published',
    icon: '📄',
    title: 'Published Papers',
    desc: 'Papers published to the archive by year, department, and type. Track research output trends.',
  },
  {
    id: 'users',
    icon: '👥',
    title: 'User Accounts',
    desc: 'All users breakdown by role, department, and status. Active vs pending analysis.',
  },
  {
    id: 'dept',
    icon: <Building2 className="w-5 h-5" />,
    title: 'Department Performance',
    desc: 'Number of papers published, endorsed, and pending approval per department.',
  },
];

const formatDepartment = (deptStr) => {
  if (!deptStr) return 'N/A';
  if (deptStr.toLowerCase().includes('information tech')) return 'College of Information Technology';
  if (deptStr.toLowerCase().includes('business') || deptStr.toLowerCase().includes('accountancy')) return 'College of Business and Accountancy';
  if (deptStr.toLowerCase().includes('education')) return 'College of Education';
  if (deptStr.toLowerCase().includes('arts') || deptStr.toLowerCase().includes('sciences')) return 'College of Arts and Sciences';
  if (deptStr.toLowerCase().includes('criminology')) return 'College of Criminology';
  if (deptStr.toLowerCase().includes('engineering')) return 'College of Engineering';
  if (deptStr.toLowerCase().includes('nursing')) return 'College of Nursing';
  if (deptStr.toLowerCase().includes('maritime')) return 'College of Maritime Education';
  return deptStr;
};

export default function Reports() {
  const [selected, setSelected] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [submissions, setSubmissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeUsersTab, setActiveUsersTab] = useState(0);

  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  useEffect(() => {
    const unsubSub = onSnapshot(collection(db, 'submissions'), (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubGroup = onSnapshot(collection(db, 'groups'), (snap) => {
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    let deansData = [];
    let advisersData = [];
    let studentsData = [];

    const updateUsers = () => {
      setAllUsers([...deansData, ...advisersData, ...studentsData]);
    };

    const formatDate = (dateVal) => {
      if (!dateVal) return 'N/A';
      if (dateVal.toDate) return dateVal.toDate().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      return new Date(dateVal).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
    };

    const unsubDeans = onSnapshot(collection(db, 'deans'), (snap) => {
      deansData = snap.docs.map(d => ({
        id: d.id, name: d.data().displayName || `${d.data().firstName || ''} ${d.data().lastName || ''}`.trim(),
        role: 'Dean', dept: formatDepartment(d.data().department || 'N/A'), prog: 'Faculty / Head', date: formatDate(d.data().createdAt), login: formatDate(d.data().lastLogin), status: d.data().status || 'Active',
        createdAt: d.data().createdAt
      }));
      updateUsers();
    });

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snap) => {
      advisersData = snap.docs.map(d => ({
        id: d.id, name: d.data().displayName || `${d.data().firstName || ''} ${d.data().lastName || ''}`.trim(),
        role: 'Advisor', dept: formatDepartment(d.data().department || 'N/A'), prog: 'Faculty', date: formatDate(d.data().createdAt), login: formatDate(d.data().lastLogin), status: d.data().status || 'Active',
        createdAt: d.data().createdAt
      }));
      updateUsers();
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      studentsData = snap.docs.map(d => ({
        id: d.id, name: d.data().displayName || `${d.data().firstName || ''} ${d.data().lastName || ''}`.trim(),
        role: 'Student', dept: formatDepartment(d.data().course || 'N/A'), prog: d.data().yearLevel || 'N/A', date: formatDate(d.data().createdAt), login: formatDate(d.data().lastLogin), status: d.data().status || 'Active',
        createdAt: d.data().createdAt
      }));
      updateUsers();
    });

    return () => {
      unsubSub(); unsubGroup(); unsubDeans(); unsubAdvisers(); unsubStudents();
    };
  }, []);

  const publishedData = useMemo(() => {
    const filteredSubs = filterByAcademicYear(submissions, 'createdAt');
    return filteredSubs
      .filter(s => s.reviewStatus === 'published')
      .map((s, index) => {
        const group = groups.find(g => g.leaderUid === s.studentUid && (g.groupName === s.groupName || g.researchTitle === (s.researchTitle || s.title)));
        const dDate = new Date(s.createdAt);
        return {
          docId: s.id,
          id: (index + 1).toString().padStart(2, '0'),
          title: group?.researchTitle || s.researchTitle || s.title || 'Untitled',
          dept: formatDepartment(group?.program || s.program || group?.department || 'Unknown'),
          cat: group?.category || s.category || 'Uncategorized',
          sy: s.schoolYear || '2025-2026',
          date: dDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [submissions, groups, selectedYear, filterByAcademicYear]);

  const usersData = useMemo(() => {
    let u = filterByAcademicYear(allUsers, 'createdAt');
    if (activeUsersTab === 1) u = u.filter(user => user.role === 'Dean');
    else if (activeUsersTab === 2) u = u.filter(user => user.role === 'Advisor');
    else if (activeUsersTab === 3) u = u.filter(user => user.role === 'Student');
    
    return u.sort((a, b) => a.name.localeCompare(b.name)).map((u, i) => ({ ...u, id: (i + 1).toString().padStart(2, '0') }));
  }, [allUsers, activeUsersTab, selectedYear, filterByAcademicYear]);

  const deptData = useMemo(() => {
    const filteredSubs = filterByAcademicYear(submissions, 'createdAt');
    const deptsMap = {};
    filteredSubs.forEach(s => {
      const group = groups.find(g => g.leaderUid === s.studentUid && (g.groupName === s.groupName || g.researchTitle === (s.researchTitle || s.title)));
      const deptName = formatDepartment(group?.department || s.program || group?.program || 'Uncategorized');
      if (!deptsMap[deptName]) deptsMap[deptName] = { sub: 0, pub: 0, end: 0, pend: 0 };
      
      deptsMap[deptName].sub += 1;
      if (s.reviewStatus === 'published') deptsMap[deptName].pub += 1;
      if (s.reviewStatus === 'endorsed' || s.adviserStatus === 'approved') deptsMap[deptName].end += 1;
      if (s.reviewStatus === 'pending') deptsMap[deptName].pend += 1;
    });

    return Object.entries(deptsMap).map(([dept, stats]) => {
      const rate = stats.sub > 0 ? ((stats.pub / stats.sub) * 100).toFixed(1) + '%' : '—';
      return { dept, ...stats, rate, status: stats.sub > 0 ? 'On Track' : 'Pending Setup' };
    });
  }, [submissions, groups, selectedYear, filterByAcademicYear]);

  // Analytics Data Preparation
  const COLORS = ['#7B1F35', '#D97706', '#1E8E3E', '#2563EB', '#8B5CF6', '#EC4899', '#059669'];

  const analyticsData = useMemo(() => {
    const publishedPapers = submissions.filter(s => s.reviewStatus === 'published');
    
    // 1. Papers per Year
    const yearlyMap = {};
    publishedPapers.forEach(paper => {
      let year = 'Unknown Year';
      if (paper.publishedAt) {
        year = new Date(paper.publishedAt).getFullYear().toString();
      } else if (paper.createdAt) {
        year = new Date(paper.createdAt).getFullYear().toString();
      } else if (paper.schoolYear) {
        year = paper.schoolYear.split('-')[0]; // Extract 2026 from 2026-2027
      }
      
      yearlyMap[year] = (yearlyMap[year] || 0) + 1;
    });
    const yearlyData = Object.keys(yearlyMap).map(year => ({
      name: year,
      Papers: yearlyMap[year]
    })).sort((a, b) => a.name.localeCompare(b.name));

    // 2. Top Departments
    const deptMap = {};
    publishedPapers.forEach(paper => {
      const dept = formatDepartment(paper.department || paper.program);
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const deptData = Object.keys(deptMap).map(dept => ({
      name: dept.replace('College of ', ''), // Shorten for chart
      value: deptMap[dept]
    })).sort((a, b) => b.value - a.value);

    return { yearlyData, deptData };
  }, [submissions]);

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteResearch = async (docId, title) => {
    const result = await Swal.fire({
      title: 'Delete Research Permanently?',
      text: `You are about to permanently delete "${title}". This action CANNOT be undone!`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'DELETE PERMANENTLY'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'submissions', docId));
        Swal.fire('Deleted!', 'The research has been permanently deleted.', 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to delete research.', 'error');
      }
    }
  };

  const handleExportCSV = () => {
    if (!selected) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selected === 'published') {
      csvContent += "ID,Research Title,Department,Category,School Year,Date Published\n";
      publishedData.forEach(row => {
        const cleanTitle = (row.title || '').replace(/,/g, '');
        csvContent += `${row.id},${cleanTitle},${row.dept},${row.cat},${row.sy},${row.date}\n`;
      });
    } else if (selected === 'users') {
      csvContent += "ID,Name,Role,Department,Program,Date Registered,Status\n";
      usersData.forEach(row => {
        const cleanName = (row.name || '').replace(/,/g, '');
        csvContent += `${row.id},${cleanName},${row.role},${row.dept},${row.prog},${row.date},${row.status}\n`;
      });
    } else if (selected === 'dept') {
      csvContent += "Department,Total Submissions,Published,Endorsed to Dean,Pending Approval,Publication Rate,Status\n";
      deptData.forEach(row => {
        const cleanDept = (row.dept || '').replace(/,/g, '');
        csvContent += `${cleanDept},${row.sub},${row.pub},${row.end},${row.pend},${row.rate},${row.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `archivio_report_${selected}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reusable Pill Components
  const DeptPill = ({ text }) => (
    <span className="px-3 py-1 bg-[#f3e6ea] text-[#801e38] rounded-full text-[11px] font-bold whitespace-nowrap">{text}</span>
  );
  
  const RolePill = ({ role }) => {
    const colors = {
      Advisor: 'bg-amber-50 text-amber-600',
      Student: 'bg-blue-50 text-blue-600',
      Dean: 'bg-red-50 text-red-600',
    };
    return <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${colors[role] || 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'}`}>{role}</span>;
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Component */}
        <Header title="Reports" breadcrumbs={['Reports']} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <SectionTitle sub="Generate, view, and export reports across the ARCHIVIO system.">
            System Reports
          </SectionTitle>

          {/* GRAPHICAL ANALYTICS DASHBOARD */}
          {!selected && (
            <div className="mb-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Papers per Year Chart */}
                <Card className="p-6 relative overflow-hidden group border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#7B1F35]/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#7B1F35]" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Research Output per Year</h3>
                  </div>
                  <div className="h-64">
                    {analyticsData.yearlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.yearlyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="colorPapers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7B1F35" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#7B1F35" stopOpacity={0.4}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(123, 31, 53, 0.05)' }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                              backdropFilter: 'blur(12px)',
                              borderRadius: '12px', 
                              border: '1px solid rgba(0,0,0,0.05)', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              color: '#1f2937',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}
                            itemStyle={{ color: '#7B1F35' }}
                          />
                          <Bar dataKey="Papers" fill="url(#colorPapers)" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-stone-400 italic text-sm">No published papers yet.</div>
                    )}
                  </div>
                </Card>

                {/* Top Departments Pie Chart */}
                <Card className="p-6 relative overflow-hidden group border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <PieChartIcon className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Published Papers by Department</h3>
                  </div>
                  <div className="h-64">
                    {analyticsData.deptData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.deptData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                            animationDuration={1500}
                            stroke="none"
                          >
                            {analyticsData.deptData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                              backdropFilter: 'blur(12px)',
                              borderRadius: '12px', 
                              border: '1px solid rgba(0,0,0,0.05)', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              color: '#1f2937',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={40} 
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-stone-400 italic text-sm">No published papers yet.</div>
                    )}
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* REPORT TYPE SELECTOR */}
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-4">SELECT REPORT TYPE</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {reportTypes.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelected(r.id); setCurrentPage(1); }}
                className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  selected === r.id
                    ? 'border-[#801e38] bg-white dark:bg-[#1e1e1e] shadow-md'
                    : 'border-transparent bg-white dark:bg-[#1e1e1e] shadow-sm hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected === r.id ? 'border-[#801e38]' : 'border-stone-300'}`}>
                    {selected === r.id && <div className="w-2 h-2 rounded-full bg-[#801e38]"></div>}
                  </div>
                </div>
                <h4 className="font-bold text-stone-900 dark:text-stone-50 mb-1">{r.title}</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* DYNAMIC REPORT CONTENT */}
          {selected && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 mb-1">
                    {selected === 'published' && 'Published Papers Report'}
                    {selected === 'users' && 'System Users per School Year'}
                    {selected === 'dept' && 'Department Performance Report'}
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {selected === 'published' && `All research papers published to the ARCHIVIO archive (${selectedYear})`}
                    {selected === 'users' && `Registered participants by role, department, and program - sorted alphabetically (${selectedYear})`}
                    {selected === 'dept' && `${selectedYear} • All Departments • Showing: Published, Endorsed, and Pending Approval`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <PremiumButton onClick={handlePrint} variant="ghost" icon={<Printer className="w-4 h-4" />}>
                    Print
                  </PremiumButton>
                  <PremiumButton onClick={handlePrint} variant="primary" icon={<FileText className="w-4 h-4" />}>
                    Export PDF
                  </PremiumButton>
                  <PremiumButton onClick={handleExportCSV} variant="primary" icon={<Download className="w-4 h-4" />}>
                    Export CSV
                  </PremiumButton>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {selected === 'published' && (
                  <>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All SY</option></select>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All Departments</option></select>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All Categories</option></select>
                  </>
                )}
                {selected === 'users' && (
                  <>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-[#801e38] rounded-lg text-sm text-[#801e38] font-bold outline-none"><option>SY 2025-2026</option></select>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All Roles</option></select>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All Status</option></select>
                  </>
                )}
                {selected === 'dept' && (
                  <>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All SY</option></select>
                    <select className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none"><option>All Departments</option></select>
                  </>
                )}
                <button className="px-4 py-2 text-sm font-semibold text-stone-600 dark:text-stone-300 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525]">
                  Reset Filters
                </button>
              </div>

              {/* Stats Cards */}
              <div className={`grid gap-4 mb-8 ${selected === 'published' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                {selected === 'published' && (
                  <>
                    <StatCard icon={<FileText className="w-5 h-5"/>} label="Total Published" value={publishedData.length} sub="All time • all departments" color="maroon" />
                    <StatCard icon={<FileText className="w-5 h-5"/>} label="Published This SY" value={publishedData.filter(p => p.sy.includes('2025')).length} sub="SY 2025-2026 in progress" color="blue" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Research Categories" value={new Set(publishedData.map(p => p.cat)).size} sub="Across all published papers" color="amber" />
                  </>
                )}
                {selected === 'users' && (
                  <>
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Total Users" value={usersData.length} color="maroon" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Deans" value={usersData.filter(u => u.role === 'Dean').length} color="blue" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Research Advisers" value={usersData.filter(u => u.role === 'Advisor').length} color="amber" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Students" value={usersData.filter(u => u.role === 'Student').length} color="green" />
                  </>
                )}
                {selected === 'dept' && (
                  <>
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Total Submissions" value={deptData.reduce((acc, curr) => acc + curr.sub, 0)} color="maroon" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Published" value={deptData.reduce((acc, curr) => acc + curr.pub, 0)} color="green" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Endorsed to Dean" value={deptData.reduce((acc, curr) => acc + curr.end, 0)} color="blue" />
                    <StatCard icon={<Building2 className="w-5 h-5"/>} label="Pending Approval" value={deptData.reduce((acc, curr) => acc + curr.pend, 0)} color="red" />
                  </>
                )}
              </div>

              {/* Data Table */}
              <Card className="mb-6 flex flex-col overflow-hidden">
                
                {/* Custom Card Headers based on report */}
                {selected === 'published' && (
                  <div className="p-5 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1e1e1e]">
                    <h4 className="font-bold text-stone-900 dark:text-stone-50 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Published Papers
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 ml-3">All published research • sorted by most recently published</p>
                  </div>
                )}
                {selected === 'users' && (
                  <div className="p-5 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1e1e1e]">
                    <h4 className="font-bold text-stone-900 dark:text-stone-50 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Registered Users • SY 2025–2026
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 ml-3">Sorted alphabetically by first name • all roles included</p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#801e38] text-white text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        {selected === 'published' && (
                          <>
                            <th className="py-3 px-5">#</th>
                            <th className="py-3 px-5">Research Title</th>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Category</th>
                            <th className="py-3 px-5">School Year</th>
                            <th className="py-3 px-5">Date Published</th>
                            <th className="py-3 px-5 text-center">Actions</th>
                          </>
                        )}
                        {selected === 'users' && (
                          <>
                            <th className="py-3 px-5">#</th>
                            <th className="py-3 px-5">Name ↑</th>
                            <th className="py-3 px-5">Role</th>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Program</th>
                            <th className="py-3 px-5">Date Registered</th>
                            <th className="py-3 px-5">Status</th>
                          </>
                        )}
                        {selected === 'dept' && (
                          <>
                            <th className="py-3 px-5">Department</th>
                            <th className="py-3 px-5">Total Submissions</th>
                            <th className="py-3 px-5">Published</th>
                            <th className="py-3 px-5">Endorsed to Dean</th>
                            <th className="py-3 px-5">Pending Approval</th>
                            <th className="py-3 px-5">Publication Rate</th>
                            <th className="py-3 px-5">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-sm text-stone-700 dark:text-stone-200 divide-y divide-stone-100">
                      {/* Render rows based on selected */}
                      {(() => {
                        const currentData = selected === 'published' ? publishedData : selected === 'users' ? usersData : selected === 'dept' ? deptData : [];
                        const itemsPerPage = 10;
                        const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                        
                        return (
                          <>
                            {selected === 'published' && paginatedData.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors">
                          <td className="py-4 px-5 text-stone-400">{row.id}</td>
                          <td className="py-4 px-5 font-semibold text-stone-900 dark:text-stone-50">{row.title}</td>
                          <td className="py-4 px-5"><DeptPill text={row.dept} /></td>
                          <td className="py-4 px-5">{row.cat}</td>
                          <td className="py-4 px-5">{row.sy}</td>
                          <td className="py-4 px-5 font-bold text-[#801e38] text-xs">{row.date}</td>
                          <td className="py-4 px-5 text-center">
                            <button 
                              onClick={() => handleDeleteResearch(row.docId, row.title)} 
                              title="Delete Permanently" 
                              className="w-8 h-8 rounded border border-red-200 text-red-500 hover:bg-red-50 inline-flex items-center justify-center bg-white dark:bg-[#1e1e1e] shadow-sm transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {selected === 'users' && paginatedData.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors">
                          <td className="py-4 px-5 text-stone-400">{row.id}</td>
                          <td className="py-4 px-5 font-semibold text-stone-900 dark:text-stone-50">{row.name}</td>
                          <td className="py-4 px-5"><RolePill role={row.role} /></td>
                          <td className="py-4 px-5 text-xs">{row.dept}</td>
                          <td className="py-4 px-5 text-xs text-stone-500 dark:text-stone-400">{row.prog}</td>
                          <td className="py-4 px-5 text-xs">{row.date}</td>
                          <td className={`py-4 px-5 font-semibold text-xs ${row.status.toLowerCase() === 'active' ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {row.status}
                          </td>
                        </tr>
                      ))}

                      {selected === 'dept' && paginatedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors">
                          <td className="py-4 px-5 font-semibold text-stone-900 dark:text-stone-50">{row.dept}</td>
                          <td className="py-4 px-5">{row.sub}</td>
                          <td className="py-4 px-5 font-bold text-emerald-600">{row.pub}</td>
                          <td className="py-4 px-5 font-bold text-blue-600">{row.end}</td>
                          <td className="py-4 px-5">
                            {row.pend > 0 ? (
                              <span className="bg-red-50 text-[#801e38] px-3 py-1 rounded-full text-[11px] font-bold">{row.pend}</span>
                            ) : 0}
                          </td>
                          <td className="py-4 px-5">
                            {row.rate !== '—' ? (
                              <span className="border border-emerald-200 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold">{row.rate}</span>
                            ) : '—'}
                          </td>
                          <td className="py-4 px-5">
                            {row.status === 'On Track' ? (
                              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold">On Track</span>
                            ) : (
                              <span className="text-stone-400 text-xs italic">Pending Setup</span>
                            )}
                          </td>
                        </tr>
                            ))}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination / Footer */}
                {(() => {
                  const currentData = selected === 'published' ? publishedData : selected === 'users' ? usersData : selected === 'dept' ? deptData : [];
                  const itemsPerPage = 10;
                  const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage));
                  
                  return (selected === 'published' || selected === 'users' || selected === 'dept') && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1e1e1e] border-t border-stone-100 dark:border-stone-800/50">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Showing {currentData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, currentData.length)} of {currentData.length} records
                      </p>
                      <div className="flex gap-1 items-center">
                        <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-stone-200 dark:border-stone-700 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] disabled:opacity-50 transition-colors"
                        >‹</button>
                        <button className="px-3 py-1 text-sm bg-[#801e38] text-white rounded font-bold">{currentPage}</button>
                        <span className="px-2 py-1 text-stone-400 text-xs">of {totalPages}</span>
                        <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-stone-200 dark:border-stone-700 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] disabled:opacity-50 transition-colors"
                        >›</button>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* Department Performance - Bar Chart Section */}
              {selected === 'dept' && (
                <div className="bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-xl p-6 shadow-sm mb-6">
                   <div className="mb-6">
                    <h4 className="font-bold text-stone-900 dark:text-stone-50 text-lg flex items-center gap-2">
                      <span className="w-1 h-5 bg-[#801e38] rounded-full inline-block"></span>
                      Published, Endorsed & Pending — Department Breakdown
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 ml-3">Clustered bars per department • each bar represents one metric • SY 2025–2026</p>
                  </div>

                  <div className="relative pl-32 py-4 border-l border-b border-stone-200 dark:border-stone-700">
                    {/* Grid lines */}
                    <div className="absolute inset-0 left-32 flex justify-between pointer-events-none">
                      {[0,10,20,30,40,50].map((v, i) => (
                         <div key={i} className="h-full border-r border-stone-100 dark:border-stone-800/50 flex-1 relative">
                            <span className="absolute -top-6 -right-2 text-[10px] text-stone-400">{v === 0 ? '0' : v}</span>
                         </div>
                      ))}
                    </div>

                    {/* Chart Rows */}
                    <div className="space-y-6 relative z-10 pt-2 pb-6">
                      {deptData.length === 0 ? (
                         <div className="text-center text-sm text-stone-400 italic">No department data available</div>
                      ) : (
                        deptData.map((deptRow, i) => {
                          const maxMetric = Math.max(...deptData.map(d => Math.max(d.pub, d.end, d.pend, 1))); // Find global max for scale
                          const getWidth = (val) => `${(val / maxMetric) * 100}%`;
                          
                          return (
                            <div key={i} className="relative">
                              <span className="absolute -left-32 top-3 text-xs font-bold text-stone-700 dark:text-stone-200 w-28 text-right truncate" title={deptRow.dept}>{deptRow.dept}</span>
                              <div className="space-y-1">
                                <div className="h-3 bg-[#16a34a] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold min-w-[20px]" style={{ width: getWidth(deptRow.pub) }}>{deptRow.pub}</div>
                                <div className="h-3 bg-[#2563eb] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold min-w-[20px]" style={{ width: getWidth(deptRow.end) }}>{deptRow.end}</div>
                                <div className="h-3 bg-[#801e38] rounded-r-md flex items-center justify-end pr-2 text-[10px] text-white font-bold min-w-[20px]" style={{ width: getWidth(deptRow.pend) }}>{deptRow.pend}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex gap-6 mt-6">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#16a34a] rounded-sm"></span><span className="text-xs text-stone-600 dark:text-stone-300">Published</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#2563eb] rounded-sm"></span><span className="text-xs text-stone-600 dark:text-stone-300">Endorsed to Dean</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#801e38] rounded-sm"></span><span className="text-xs text-stone-600 dark:text-stone-300">Pending Approval</span></div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* EMPTY STATE */}
          {!selected && (
            <div className="bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl min-h-[340px] flex flex-col items-center justify-center p-10 mt-6 relative">
              <div className="text-center">
                <div className="flex items-end justify-center gap-2 mb-6 h-20">
                  <div className="w-6 bg-[#d6a0b0] rounded-t-md" style={{ height: '40%' }}></div>
                  <div className="w-6 bg-[#801e38] rounded-t-md" style={{ height: '80%' }}></div>
                  <div className="w-6 bg-[#d6a0b0] rounded-t-md" style={{ height: '55%' }}></div>
                </div>
                <h4 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-100 mb-2">No Report Selected</h4>
                <p className="text-sm text-stone-400">Select a report type above to generate and view data.</p>
              </div>
              <p className="absolute bottom-10 text-[11px] text-stone-400 italic">
                Tip: Use the filters above to narrow down results by school year, department, or role once a report is selected.
              </p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}
