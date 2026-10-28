import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, PieChart, Pie, Cell } from 'recharts';
import { Building2, GraduationCap, Users, UserPlus, BookOpen, TrendingUp } from 'lucide-react';
import { Card, CardBody, StatCard, SectionTitle } from '../../components/ui/Card';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AdminQuickActions from '../components/dashboard/AdminQuickActions';
import StatusBadge from '../components/common/StatusBadge';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy, limit, doc } from 'firebase/firestore';
import { useAcademicYear } from '../context/AcademicYearContext';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import ListSkeleton from '../components/skeletons/ListSkeleton';

function Dashboard() {
  const navigate = useNavigate();
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
  const [storageQuotaGB, setStorageQuotaGB] = useState(25);
  const [storageStats, setStorageStats] = useState(null);
  const [dashboardSearch, setDashboardSearch] = useState('');

  const { selectedYear, filterByAcademicYear, availableYears } = useAcademicYear();

  useEffect(() => {
    let loadedCount = 0;
    const totalSnapshots = 10;
    const markLoaded = () => { loadedCount++; if (loadedCount >= totalSnapshots) setLoading(false); };
    const safetyTimer = setTimeout(() => setLoading(false), 2500);

    const safeSnap = (queryRef, setter) => {
      return onSnapshot(queryRef, snap => {
        setter(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => {
        console.warn('Dashboard snapshot notice:', err.message);
        markLoaded();
      });
    };

    const unsubSub = safeSnap(collection(db, 'submissions'), setSubmissions);
    const unsubGroup = safeSnap(collection(db, 'groups'), setGroups);
    const unsubDeans = safeSnap(collection(db, 'deans'), setDeans);
    const unsubAdvisers = safeSnap(collection(db, 'advisers'), setAdvisers);
    const unsubStudents = safeSnap(collection(db, 'students'), setStudents);
    const unsubLogs = safeSnap(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100)), setActivityLogs);
    const unsubDepts = safeSnap(collection(db, 'departments'), setDepartments);
    const unsubProgs = safeSnap(collection(db, 'programs'), setPrograms);

    const unsubQuota = onSnapshot(doc(db, 'settings', 'storage_quota'), snap => {
      if (snap.exists() && snap.data()?.quotaGB) {
        setStorageQuotaGB(Number(snap.data().quotaGB));
      }
      markLoaded();
    }, err => {
      console.warn('Dashboard quota notice:', err.message);
      markLoaded();
    });

    const unsubStats = onSnapshot(doc(db, 'settings', 'storage_stats'), snap => {
      if (snap.exists()) {
        setStorageStats(snap.data());
      }
      markLoaded();
    }, err => {
      console.warn('Dashboard storage stats notice:', err.message);
      markLoaded();
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubSub(); unsubGroup(); unsubDeans(); unsubAdvisers(); unsubStudents(); unsubLogs(); unsubDepts(); unsubProgs();
      unsubQuota(); unsubStats();
    };
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
      const dName = courseToDeptMap[st.course] || courseToDeptMap[st.program] || courseToDeptMap[st.programCode] || st.department || st.course || 'Unknown';
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

  const displayedDeptStats = useMemo(() => {
    if (!dashboardSearch?.trim()) return deptStats;
    const term = dashboardSearch.toLowerCase().trim();
    return deptStats.filter(d => (d.name || '').toLowerCase().includes(term));
  }, [deptStats, dashboardSearch]);

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

    // Helper to test if a user document record is pending activation
    const isPendingDoc = (u) => {
      const st = (u?.status || '').toLowerCase().trim();
      const ast = (u?.accountStatus || '').toLowerCase().trim();
      return st === 'pending' || st === 'pending_activation' || ast === 'pending' || ast === 'pending_activation';
    };

    // Helper to test if a user document record is fully active / activated
    const isActiveDoc = (u) => {
      const st = (u?.status || '').toLowerCase().trim();
      const ast = (u?.accountStatus || '').toLowerCase().trim();
      return (st === 'active' || ast === 'activated') && !isPendingDoc(u);
    };

    // Deduplicate unique user records across deans, advisers, and students by email (or UID)
    const userMap = new Map();

    (filteredDeans || []).forEach(d => {
      const key = (d.email || d.uid || d.id || '').toLowerCase().trim();
      if (!key) return;
      userMap.set(key, {
        key,
        isActive: isActiveDoc(d),
        isPending: isPendingDoc(d),
        role: d.role || 'dean',
        record: d
      });
    });

    (filteredAdvisers || []).forEach(a => {
      const key = (a.email || a.uid || a.id || '').toLowerCase().trim();
      if (!key) return;
      if (userMap.has(key)) {
        // Dual-role account (e.g., Dean + Adviser)
        const existing = userMap.get(key);
        // An account is active if active in ANY of its roles; pending only if pending in ALL roles
        const isUserActive = existing.isActive || isActiveDoc(a);
        const isUserPending = !isUserActive && (existing.isPending || isPendingDoc(a));
        userMap.set(key, {
          ...existing,
          isActive: isUserActive,
          isPending: isUserPending,
          hasDualRole: true
        });
      } else {
        userMap.set(key, {
          key,
          isActive: isActiveDoc(a),
          isPending: isPendingDoc(a),
          role: a.role || 'adviser',
          record: a
        });
      }
    });

    (filteredStudents || []).forEach(s => {
      const key = (s.email || s.uid || s.id || '').toLowerCase().trim();
      if (!key) return;
      if (!userMap.has(key)) {
        userMap.set(key, {
          key,
          isActive: isActiveDoc(s),
          isPending: isPendingDoc(s),
          role: 'student',
          record: s
        });
      }
    });

    // 1. Registered Users: exactly count unique registered accounts
    const totalUsers = userMap.size;

    // 2. Pending Invitations: count unique accounts that are still pending activation and not yet active
    let totalPending = 0;
    userMap.forEach(u => {
      if (u.isPending && !u.isActive) {
        totalPending++;
      }
    });

    const publishedCount = filteredSubmissions.filter(s => s.reviewStatus === 'published').length;
    return [totalDepartments, totalPrograms, totalUsers, totalPending, publishedCount];
  }, [filteredSubmissions, filteredDeans, filteredAdvisers, filteredStudents, departments, programs]);

  const yearlyChartData = useMemo(() => {
    // Generate labels strictly from existing academic years that actually exist in real data
    const activeYears = (availableYears && availableYears.length > 0)
      ? [...availableYears].reverse()
      : ['SY 2026-2027'];

    const syLabels = activeYears.map(syStr => {
      const match = syStr.match(/(\d{4})\s*[-–/]\s*(\d{4})/);
      const startYear = match ? parseInt(match[1]) : 2026;
      const endYear = match ? parseInt(match[2]) : 2027;
      const full = `${startYear}-${endYear}`;
      const short = `SY ${String(startYear).slice(2)}-${String(endYear).slice(2)}`;
      return {
        full,
        syStr,
        short,
        isCurrent: syStr === (availableYears?.[0] || 'SY 2026-2027')
      };
    });

    const counts = {};
    const publishedCounts = {};
    const approvedCounts = {};
    syLabels.forEach(sy => {
      counts[sy.full] = 0;
      publishedCounts[sy.full] = 0;
      approvedCounts[sy.full] = 0;
    });

    submissions.forEach(s => {
      let matchedFull = null;
      const rawSY = s.schoolYear || s.academicYear;
      if (rawSY && typeof rawSY === 'string') {
        const m = rawSY.match(/(\d{4})\s*[-–/]\s*(\d{4})/);
        if (m) matchedFull = `${m[1]}-${m[2]}`;
      }
      if (!matchedFull && s.createdAt) {
        const d = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth();
          const startYear = m >= 7 ? y : y - 1;
          matchedFull = `${startYear}-${startYear + 1}`;
        }
      }

      if (matchedFull && counts[matchedFull] !== undefined) {
        counts[matchedFull]++;
        if (s.reviewStatus === 'endorsed' || s.adviserStatus === 'approved' || s.reviewStatus === 'published') {
          approvedCounts[matchedFull]++;
        }
        if (s.reviewStatus === 'published') {
          publishedCounts[matchedFull]++;
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
  }, [availableYears, submissions]);

  // Helper to parse file size to MB
  const parseSizeToMB = (sizeVal) => {
    if (!sizeVal) return 0;
    if (typeof sizeVal === 'number') return sizeVal / (1024 * 1024);
    const str = String(sizeVal).toLowerCase().trim();
    if (str.includes('gb')) return parseFloat(str) * 1024;
    if (str.includes('mb')) return parseFloat(str);
    if (str.includes('kb')) return parseFloat(str) / 1024;
    if (str.includes('bytes') || /^\d+$/.test(str)) return parseFloat(str) / (1024 * 1024);
    return 0;
  };

  // Real Storage Usage & Capacity calculations
  const storageMetrics = useMemo(() => {
    let subPublishedPapers = 0;
    let subSupportingDocs = 0;
    let subOtherAssets = 0;
    let subTotalBytes = 0;

    // Evaluate live Firestore submissions
    (submissions || []).forEach(sub => {
      const isPublished = sub.reviewStatus === 'published' || 
                          sub.status === 'published' || 
                          sub.status === 'Published' || 
                          sub.published === true;
      
      const meta = sub.documents || sub.documentsMeta || {};
      const entries = Object.entries(meta);

      if (entries.length > 0) {
        entries.forEach(([key, docItem]) => {
          if (!docItem || docItem.archived) return;
          const keyLower = String(key || '').toLowerCase().trim();
          const nameLower = String(docItem.name || '').toLowerCase().trim();
          const sizeMB = parseSizeToMB(docItem.size);
          const bytes = sizeMB > 0 ? sizeMB * 1024 * 1024 : (1024 * 1024 * 1.5); // fallback ~1.5MB
          subTotalBytes += bytes;

          const isManuscript = keyLower.includes('manuscript') || nameLower.includes('manuscript') || key === 'finalManuscript';
          if (isManuscript) {
            if (isPublished) {
              subPublishedPapers++;
            } else {
              subOtherAssets++;
            }
          } else {
            subSupportingDocs++;
          }
        });
      } else {
        // Fallback if submission has direct fileUrl/pdfUrl or uploadedDocs
        const hasFile = sub.fileUrl || sub.manuscriptUrl || sub.pdfUrl || (Array.isArray(sub.uploadedDocs) && sub.uploadedDocs.length > 0);
        if (hasFile) {
          subTotalBytes += (1024 * 1024 * 2.5); // ~2.5 MB average manuscript
          if (isPublished) {
            subPublishedPapers++;
          } else {
            subOtherAssets++;
          }
        }
      }
    });

    const subTotalFiles = subPublishedPapers + subSupportingDocs + subOtherAssets;

    // Use live submissions if they contain files; otherwise fallback to cloud storage telemetry
    let totalFiles = subTotalFiles;
    let publishedPapers = subPublishedPapers;
    let supportingDocs = subSupportingDocs;
    let otherAssets = subOtherAssets;
    let totalBytes = subTotalBytes;

    if (totalFiles === 0 && storageStats) {
      totalFiles = storageStats.totalFiles || 0;
      publishedPapers = storageStats.publishedPapers || 0;
      supportingDocs = storageStats.supportingDocs || 0;
      otherAssets = storageStats.otherAssets || Math.max(0, totalFiles - publishedPapers - supportingDocs);
      totalBytes = storageStats.totalBytes || ((storageStats.totalMB || 0) * 1024 * 1024);
    } else if (storageStats && (storageStats.totalBytes || 0) > subTotalBytes && subTotalFiles <= (storageStats.totalFiles || 0)) {
      // If cloud bucket telemetry has wider physical footprint, merge physical file counts/storage
      totalFiles = Math.max(subTotalFiles, storageStats.totalFiles || 0);
      publishedPapers = Math.max(subPublishedPapers, storageStats.publishedPapers || 0);
      supportingDocs = Math.max(subSupportingDocs, storageStats.supportingDocs || 0);
      otherAssets = Math.max(0, totalFiles - publishedPapers - supportingDocs);
      totalBytes = Math.max(subTotalBytes, storageStats.totalBytes || 0);
    }

    const quotaGB = storageQuotaGB || 25;
    const quotaBytes = quotaGB * 1024 * 1024 * 1024;
    const usedGB = totalBytes / (1024 * 1024 * 1024);
    const usedMB = totalBytes / (1024 * 1024);
    const rawPercent = quotaBytes > 0 ? (totalBytes / quotaBytes) * 100 : 0;

    let percentDisplay = '0';
    let freePercentDisplay = '100';
    let barWidth = 0;

    if (totalFiles > 0) {
      if (rawPercent < 0.1) {
        percentDisplay = '< 0.1';
        freePercentDisplay = '> 99.9';
        barWidth = 1;
      } else if (rawPercent < 10) {
        percentDisplay = rawPercent.toFixed(1);
        freePercentDisplay = (100 - rawPercent).toFixed(1);
        barWidth = Math.max(2, rawPercent);
      } else {
        const rounded = Math.min(100, Math.round(rawPercent));
        percentDisplay = String(rounded);
        freePercentDisplay = String(100 - rounded);
        barWidth = rounded;
      }
    }

    const usedDisplay = usedMB >= 1024 ? `${usedGB.toFixed(2)} GB` : `${usedMB.toFixed(1)} MB`;
    const freeGB = Math.max(0, quotaGB - usedGB);
    const freeDisplay = `${freeGB.toFixed(2)} GB`;

    const isCritical = rawPercent >= 85;
    const isModerate = rawPercent >= 60 && rawPercent < 85;

    return {
      totalFiles,
      publishedPapers,
      supportingDocs,
      otherAssets,
      quotaGB,
      usedGB,
      usedMB,
      usedDisplay,
      freeDisplay,
      percentDisplay,
      freePercentDisplay,
      barWidth,
      isCritical,
      isModerate,
      rawPercent
    };
  }, [submissions, storageStats, storageQuotaGB]);

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
          
          {/* Admin Operational Command Bar */}
          <AdminQuickActions 
            systemHealth="Operational"
            searchQuery={dashboardSearch}
            onSearchChange={setDashboardSearch}
          />

          {/* Row 1: Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={<Building2 />} label="Total Departments" value={quickStats[0]} sub="Active" color="maroon" />
            <StatCard icon={<GraduationCap />} label="Total Programs" value={quickStats[1]} sub="Across all departments" color="blue" />
            <StatCard icon={<Users />} label="Registered Users" value={quickStats[2]} sub="Deans, Advisers & Students" color="green" />
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
                <p className="text-[11px] text-stone-400 mt-0.5">Total submissions recorded per academic school year</p>
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
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
                <p className="text-[11px] text-stone-400 mt-0.5">Uploaded vs Approved vs Published per department ({selectedYear})</p>
              </div>
            </div>
            <div className="space-y-6 pb-6 border-b border-stone-100 dark:border-stone-800/50">
              {deptStats.slice(0, 3).map((dept, i) => {
                const maxVal = Math.max(dept.uploaded, dept.approved, dept.published, 1);
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100 w-32 shrink-0">{dept.name}</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2"><div className="bg-[#e2d5de] h-4 rounded-r-md" style={{ width: `${(dept.uploaded/maxVal)*100}%` }}></div><span className="text-[11px] font-bold text-[#801e38]">{dept.uploaded}</span></div>
                      <div className="flex items-center gap-2"><div className="bg-[#64b494] h-4 rounded-r-md" style={{ width: `${(dept.approved/maxVal)*100}%` }}></div><span className="text-[11px] font-bold text-[#64b494]">{dept.approved}</span></div>
                      <div className="flex items-center gap-2"><div className="bg-[#9c6e3b] h-4 rounded-r-md" style={{ width: `${(dept.published/maxVal)*100}%` }}></div><span className="text-[11px] font-bold text-[#9c6e3b]">{dept.published}</span></div>
                    </div>
                  </div>
                );
              })}
              {deptStats.filter(d => d.pending).map((dept, i) => (
                <div key={`pend-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100 w-32 shrink-0">{dept.name}</span>
                  <div className="flex-1 flex items-center h-16 bg-[#f5ebd9]/30 border border-dashed border-[#801e38]/30 rounded-xl px-4"><span className="text-[11px] text-[#801e38] font-bold">Pending — Invitation has sent</span></div>
                </div>
              ))}
            </div>
            
            {/* X Axis */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex justify-between text-[11px] font-semibold text-stone-400 pl-36 pr-4">
                <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span>
              </div>
              <div className="text-center text-[11px] text-stone-400 font-semibold pl-32">Number of Papers</div>
            </div>

            <div className="flex items-center gap-6 mt-6 justify-start text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
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
                <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Department Statistics</h3><p className="text-[11px] text-stone-400 mt-0.5">Research papers status per department</p></div></div>
                <div className="overflow-x-auto min-w-[500px]">
                <table className="w-full text-left text-xs">
                  <thead><tr className="bg-[#801e38] text-white uppercase text-[11px] font-bold tracking-wider"><th className="p-3 rounded-l-lg">Department</th><th className="p-3">Advisers</th><th className="p-3">Students</th><th className="p-3">Uploaded</th><th className="p-3">Approved</th><th className="p-3 rounded-r-lg">Published</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {displayedDeptStats.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-stone-500 dark:text-stone-400">
                          No departments matching "{dashboardSearch}". Press <span className="font-semibold text-[#801e38] dark:text-[#ff8ca3]">Search ↵</span> to search all users across the system.
                        </td>
                      </tr>
                    ) : (
                      displayedDeptStats.map((row, i) => (
                        <tr key={i} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] transition-colors">
                          <td className="p-3.5 font-bold text-stone-800 dark:text-stone-100 flex items-center justify-between gap-2">
                            <span className="truncate">{row.name}</span>
                            <StatusBadge status={row.pending ? 'pending' : 'active'} size="sm" />
                          </td>
                          <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.advisers || '—'}</td>

                          <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.students || '—'}</td>
                          <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.uploaded || '—'}</td>
                          <td className={`p-3.5 font-semibold ${row.pending ? 'text-stone-300' : 'text-stone-600 dark:text-stone-300'}`}>{row.approved || '—'}</td>
                          <td className={`p-3.5 font-bold ${row.pending ? 'text-stone-300' : 'text-[#801e38]'}`}>{row.published || '—'}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-stone-50 dark:bg-[#252525] font-bold border-t-2 border-stone-200 dark:border-stone-700">
                      <td className="p-3.5 uppercase tracking-wider text-stone-900 dark:text-stone-50">Total</td>
                      <td className="p-3.5 text-[#801e38]">{displayedDeptStats.reduce((a,b)=>a+(b.advisers||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{displayedDeptStats.reduce((a,b)=>a+(b.students||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{displayedDeptStats.reduce((a,b)=>a+(b.uploaded||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{displayedDeptStats.reduce((a,b)=>a+(b.approved||0),0)}</td>
                      <td className="p-3.5 text-[#801e38]">{displayedDeptStats.reduce((a,b)=>a+(b.published||0),0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </CardBody>
            </Card>
            <Card className="border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
                <CardBody>
                  <div className="flex items-center gap-2 mb-6"><div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div><div><h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Recently Published Papers</h3><p className="text-[11px] text-stone-400 mt-0.5">Distribution of published works</p></div></div>
                  <div className="flex justify-center mb-4">
                  <div className="relative w-full h-[220px]">
                    {categories.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest max-w-[120px] text-center truncate">
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
              
              <div className="space-y-2 text-[11px] max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {categories.map((cat, i) => (<div key={i} className="flex items-center justify-between font-bold"><div className="flex items-center gap-2 text-stone-600 dark:text-stone-300 truncate pr-2"><span className={`w-2 h-2 rounded-full shrink-0 ${cat.color}`}></span><span className="truncate text-[11px]">{cat.fullName || cat.name}</span></div><span className="text-stone-900 dark:text-stone-50 shrink-0">{cat.count} <span className="text-stone-400 text-[11px] font-normal">{cat.percentage}</span></span></div>))}
              </div>
              </CardBody>
            </Card>
          </div>

          {/* Row 5: Storage Usage Overview */}
          <Card className="mb-6 border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
            <CardBody>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-[3px] h-4 bg-[#801e38] rounded-full"></div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-wider">Storage Usage Overview</h3>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="text-xs font-semibold text-[#801e38] dark:text-rose-400 hover:underline flex items-center gap-1 transition-colors"
                >
                  Adjust Quota ({storageMetrics.quotaGB} GB) &rarr;
                </button>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full md:w-2/3">
                  <div className="shrink-0 min-w-[100px]">
                    <h2 className={`text-5xl font-serif font-bold ${storageMetrics.isCritical ? 'text-red-600' : storageMetrics.isModerate ? 'text-amber-600' : 'text-[#801e38]'}`}>
                      {storageMetrics.percentDisplay}%
                    </h2>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      <span className={storageMetrics.isCritical ? 'text-red-600' : storageMetrics.isModerate ? 'text-amber-600' : 'text-[#801e38]'}>
                        {storageMetrics.percentDisplay}% Used ({storageMetrics.usedDisplay})
                      </span>
                      <span className="text-emerald-600">
                        {storageMetrics.freePercentDisplay}% Free ({storageMetrics.freeDisplay})
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-4 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          storageMetrics.isCritical
                            ? 'bg-red-600'
                            : storageMetrics.isModerate
                            ? 'bg-amber-500'
                            : 'bg-[#801e38]'
                        }`}
                        style={{ width: `${storageMetrics.barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-1/3 text-xs border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-700 pt-4 md:pt-0 md:pl-6 space-y-2">
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-300">
                    <span>Total Files Uploaded</span>
                    <span className="text-stone-900 dark:text-stone-50 font-bold">{storageMetrics.totalFiles} {storageMetrics.totalFiles === 1 ? 'file' : 'files'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-300">
                    <span>Published Papers</span>
                    <span className="text-stone-900 dark:text-stone-50 font-bold">{storageMetrics.publishedPapers} {storageMetrics.publishedPapers === 1 ? 'file' : 'files'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-300">
                    <span>Supporting Documents</span>
                    <span className="text-stone-900 dark:text-stone-50 font-bold">{storageMetrics.supportingDocs} {storageMetrics.supportingDocs === 1 ? 'file' : 'files'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-600 dark:text-stone-300">
                    <span>Other Assets</span>
                    <span className="text-stone-900 dark:text-stone-50 font-bold">{storageMetrics.otherAssets} {storageMetrics.otherAssets === 1 ? 'file' : 'files'}</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {storageMetrics.isCritical ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3 mt-5 flex items-center justify-between text-xs font-bold text-red-700 dark:text-red-400">
                  <div className="flex items-center gap-2">
                    <span>🚨</span>
                    <span>Critical storage capacity ({storageMetrics.usedDisplay} of {storageMetrics.quotaGB} GB used) — immediate archival recommended.</span>
                  </div>
                  <button onClick={() => navigate('/admin/settings')} className="underline hover:text-red-800 shrink-0 ml-2">
                    Archive Files
                  </button>
                </div>
              ) : storageMetrics.isModerate ? (
                <div className="bg-[#801e38]/5 border border-[#801e38]/10 rounded-xl px-4 py-3 mt-5 flex items-center justify-between text-xs font-bold text-[#801e38]">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Storage above 60% ({storageMetrics.usedDisplay} of {storageMetrics.quotaGB} GB used) — consider archiving old records.</span>
                  </div>
                  <button onClick={() => navigate('/admin/settings')} className="underline hover:text-[#5e1528] shrink-0 ml-2">
                    Archive Files
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl px-4 py-3 mt-5 flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Storage operating within normal limits — {storageMetrics.usedDisplay} of {storageMetrics.quotaGB} GB capacity allocated ({storageMetrics.freeDisplay} available).</span>
                  </div>
                  <button onClick={() => navigate('/admin/settings')} className="text-emerald-700 dark:text-emerald-400 font-bold underline hover:text-emerald-900 shrink-0 ml-2">
                    Storage Settings
                  </button>
                </div>
              )}
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
