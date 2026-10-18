import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ComposedChart, Line, Bar, BarChart, YAxis, CartesianGrid, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { db } from '../firebase/config';

import { useNavigate } from 'react-router-dom';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { 
  Download, 
  Inbox, 
  FolderKanban, 
  CheckCircle2, 
  Globe, 
  Clock, 
  Users, 
  TrendingUp, 
  ThumbsUp, 
  Eye, 
  ArrowUpDown,
  X,
  FileText,
  Calendar,
  User,
  GraduationCap,
  Tag,
  ExternalLink,
  BookOpen,
  Sparkles
} from 'lucide-react';

const parseDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

export default function Dashboard({ activePage }) {
  const { deanData, deanSettings } = useUser();
  const navigate = useNavigate();
  const isDualRole = deanData?.role === 'dean+adviser' || (typeof deanData?.role === 'string' && deanData.role.includes('dean') && deanData.role.includes('adviser'));
  
  const activeSY = deanSettings?.schoolYears?.find(s => s.status === 'Active')?.label || deanSettings?.schoolYear || '2026-2027';
  const displaySY = activeSY.includes('S.Y.') || activeSY.includes('SY') ? activeSY.replace(/^SY\s*/, 'S.Y. ') : `S.Y. ${activeSY}`;
  
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
  const [allRequirements, setAllRequirements] = useState([]);
  const [groupReqFilter, setGroupReqFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [yearlyStats, setYearlyStats] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [topPapersSort, setTopPapersSort] = useState('views'); // 'views' | 'likes'
  const [chartFilter, setChartFilter] = useState('year'); // 'year' | 'month'
  const [adviserTableYear, setAdviserTableYear] = useState('All');
  const [adviserSortOrder, setAdviserSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPaperForModal, setSelectedPaperForModal] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('liked'); // 'liked' | 'viewed'
  const [usersMap, setUsersMap] = useState({});

  // Derive available years from data
  const availableYears = [
    'All',
    ...Array.from(
      new Set(
        allPapers
          .map(p => {
            const d = parseDate(p.createdAt);
            return d ? d.getFullYear().toString() : new Date().getFullYear().toString();
          })
          .filter(Boolean)
      )
    )
  ].sort().reverse();

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
    }, (err) => {
      console.warn("Submissions listener notice:", err.message);
    });

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const deptGroups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(matchesDept);
      setStats(prev => ({ ...prev, totalGroups: deptGroups.length }));
      setAllGroups(deptGroups);
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching groups:", error.message);
      setLoading(false);
    });

    const unsubAdvisers = onSnapshot(collection(db, 'advisers'), (snapshot) => {
       const deptAdvisers = snapshot.docs.filter(d => {
         const dept = d.data().department || '';
         const deptLower = deanDept.toLowerCase();
         return dept.toLowerCase().includes(deptLower) || deptLower.includes(dept.toLowerCase());
       });
       setStats(prev => ({ ...prev, totalAdvisers: deptAdvisers.length }));
    }, (err) => {
       console.warn("Advisers listener notice:", err.message);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const uid = data.uid || d.id;
        const email = data.email?.toLowerCase().trim();
        const name = data.name || data.displayName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : '') || 'Archivio User';
        const role = data.role || 'user';
        const department = data.department || '';
        const userObj = { uid, email, name, role, department };
        if (uid) map[uid] = userObj;
        if (email) map[email] = userObj;
      });
      setUsersMap(prev => ({ ...prev, ...map }));
    }, (err) => {
      console.warn("Users listener notice:", err.message);
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const uid = data.uid || d.id;
        const email = data.email?.toLowerCase().trim();
        const name = data.name || data.studentName || data.displayName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : '') || 'Student';
        const role = 'student';
        const department = data.department || data.program || '';
        const userObj = { uid, email, name, role, department };
        if (uid) map[uid] = userObj;
        if (email) map[email] = userObj;
      });
      setUsersMap(prev => ({ ...prev, ...map }));
    }, (err) => {
      console.warn("Students listener notice:", err.message);
    });

    const unsubRequirements = onSnapshot(collection(db, 'requirements'), (snapshot) => {
      const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeReqs = reqs.filter(r => r.status === 'approved' || !r.status);
      setAllRequirements(activeReqs);
    }, (err) => {
      console.warn("Requirements listener notice:", err.message);
    });

    return () => { 
      unsubSubmissions(); 
      unsubGroups(); 
      unsubAdvisers(); 
      unsubUsers(); 
      unsubStudents(); 
      unsubRequirements();
    };
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
    const monthMap = {};

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
      
      const dateObj = parseDate(data.createdAt) || parseDate(group.createdAt) || new Date();
      const yKey = dateObj.getFullYear().toString();
      const mKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;

      if (!yearMap[yKey]) yearMap[yKey] = { count: 0, approved: 0, published: 0 };
      yearMap[yKey].count++;
      if (status === 'approved' || status === 'endorsed' || status === 'published') yearMap[yKey].approved++;
      if (status === 'published') yearMap[yKey].published++;

      if (!monthMap[mKey]) monthMap[mKey] = { count: 0, approved: 0, published: 0 };
      monthMap[mKey].count++;
      if (status === 'approved' || status === 'endorsed' || status === 'published') monthMap[mKey].approved++;
      if (status === 'published') monthMap[mKey].published++;
      
      const adviserUid = group.adviserUid || data.adviserUid;
      if (adviserUid) {
        const pubDate = parseDate(data.createdAt) || parseDate(group.createdAt) || new Date();
        const pubYear = pubDate.getFullYear().toString();
        
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
    advArray.sort((a, b) => adviserSortOrder === 'desc' ? b.uploads - a.uploads : a.uploads - b.uploads);
    setAdviserStats(advArray);
    
    setAllPapers(papers);
    
    const catArray = Object.keys(categoriesMap).map(key => ({ name: key, count: categoriesMap[key] }));
    catArray.sort((a, b) => b.count - a.count);
    setTopCategories(catArray.slice(0, 7));
    
    // Generate clean timeline chart data
    const currentYear = new Date().getFullYear();
    if (chartFilter === 'year') {
      // Last 4 consecutive years, guaranteed valid integers
      const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
      const yearArray = years.map(y => {
        const yStr = y.toString();
        const stat = yearMap[yStr] || { count: 0, approved: 0, published: 0 };
        return { label: yStr, ...stat };
      });
      setYearlyStats(yearArray);
    } else {
      // Last 6 consecutive months leading to current month
      const now = new Date();
      const monthArray = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleString('en-US', { month: 'short' });
        const stat = monthMap[mKey] || { count: 0, approved: 0, published: 0 };
        monthArray.push({ label, ...stat });
      }
      setYearlyStats(monthArray);
    }

  }, [allRawSubmissions, allGroups, chartFilter, adviserTableYear, adviserSortOrder]);

  // Accurate group requirements progress computation (Approved vs Pending per research group)
  // Must remain before if (loading) return to obey React Rules of Hooks
  const groupRequirementsData = useMemo(() => {
    return allGroups.map((group, index) => {
      const sub = allRawSubmissions.find(s => 
        (s.groupId && (s.groupId === group.id || s.groupId === group.groupId)) ||
        (s.studentUid && s.studentUid === group.leaderUid && (s.groupName === group.groupName || (s.title || s.researchTitle) === group.researchTitle)) ||
        (group.groupName && s.groupName === group.groupName)
      ) || {};

      // Applicable requirements: global + adviser-scoped
      const applicableReqs = allRequirements.filter(r => 
        r.scope === 'global' || 
        (r.scope === 'adviser' && r.adviserUid === group.adviserUid)
      );

      // Total requirements: if no requirements configured in db yet, standard is at least 1 (Final Manuscript)
      const totalReqs = applicableReqs.length > 0 ? applicableReqs.length : 1;
      
      const approvals = sub.documentApprovals || {};
      const isPublished = sub.reviewStatus === 'published';
      const isApproved = sub.reviewStatus === 'approved';

      let approvedCount = 0;
      if (isPublished || isApproved) {
        approvedCount = totalReqs;
      } else if (applicableReqs.length > 0) {
        approvedCount = applicableReqs.filter(req => {
          return Boolean(
            approvals[req.id] || 
            approvals[req.title] ||
            (req.title && Object.keys(approvals).some(k => k.toLowerCase() === req.title.toLowerCase() && approvals[k]))
          );
        }).length;
      } else {
        approvedCount = (sub.manuscriptUrl || sub.fileUrl) && sub.reviewStatus === 'approved' ? 1 : 0;
      }

      approvedCount = Math.min(approvedCount, totalReqs);
      const pendingCount = Math.max(0, totalReqs - approvedCount);
      const completionRate = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;

      const rawName = group.groupName || `Group ${index + 1}`;
      const shortName = rawName.length > 14 ? rawName.slice(0, 12) + '…' : rawName;

      return {
        id: group.id || `group-${index}`,
        groupName: rawName,
        shortName,
        researchTitle: group.researchTitle || sub.researchTitle || sub.title || 'Untitled Research',
        adviserName: group.adviserName || sub.adviserName || 'Not Assigned',
        approved: approvedCount,
        pending: pendingCount,
        total: totalReqs,
        completionRate,
        isCompleted: pendingCount === 0 && approvedCount > 0,
        status: sub.reviewStatus || 'in_progress'
      };
    });
  }, [allGroups, allRawSubmissions, allRequirements]);

  const filteredGroupChartData = useMemo(() => {
    let list = groupRequirementsData;
    if (groupReqFilter === 'pending') {
      list = list.filter(g => g.pending > 0);
    } else if (groupReqFilter === 'completed') {
      list = list.filter(g => g.isCompleted);
    }
    return list;
  }, [groupRequirementsData, groupReqFilter]);

  const handleSortFlip = () => {
    setIsRefreshing(true);
    setAdviserSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setTimeout(() => setIsRefreshing(false), 400);
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
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
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

  const rawDeanName = deanData?.displayName || (deanData?.firstName ? `${deanData.firstName} ${deanData.lastName || ''}`.trim() : '') || 'Dean';
  const cleanDeanName = rawDeanName
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/^(Dr\.|Prof\.|Engr\.|Atty\.|Mr\.|Ms\.|Mrs\.|Dean|Adviser)\s+/i, '')
    .trim();
  const firstName = deanData?.firstName || cleanDeanName.split(' ')[0] || 'Dean';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  const chartData = yearlyStats;
  const maxCount = Math.max(...chartData.map(d => d.count || 0), 10);

  // Color palette for charts
  const COLORS = ['#590000', '#770000', '#059669', '#d97706', '#0d9488', '#dc2626', '#7c3aed'];
  const BRAND_COLORS = ['#590000', '#770000', '#9e2752', '#d4af37', '#f8d070', '#8a7a7a', '#d6cfc7'];

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
      const pDate = parseDate(paper.createdAt);
      const date = pDate ? pDate.toLocaleDateString() : 'N/A';
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
              <h1 className="text-3xl font-serif font-bold text-[#590000] dark:text-[#f8d070] tracking-tight flex items-center gap-2">
                {getGreeting()}, {firstName} <span className="animate-wave inline-block text-2xl select-none" role="img" aria-label="wave">👋</span>
              </h1>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wider">
                {deanData?.department || 'Department'} • {displaySY}, 2nd Semester
              </p>
            </div>
            <div className="flex gap-2.5">
              <PremiumButton 
                onClick={handleExportCSV}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                <span>Export</span>
              </PremiumButton>
              <PremiumButton
                onClick={() => navigate('/dean/publish-queue')}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Inbox className="w-4 h-4" />
                <span>Publish Queue</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">{stats.approved}</span>
              </PremiumButton>
            </div>
          </div>

          {/* ================= ACTION-REQUIRED EXECUTIVE BANNER (#1 User-Centric Design) ================= */}
          {stats.approved > 0 && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#590000]/15 via-amber-500/10 to-transparent border border-[#590000]/30 dark:border-[#590000]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#590000] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Inbox className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    Action Required: {stats.approved} Research Manuscript{stats.approved > 1 ? 's' : ''} Awaiting Final Release
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#770000] text-white">
                      Action Needed
                    </span>
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Research Advisers have endorsed these papers with 100% requirements complete. Evaluate and release them to the Public Archive.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dean/publish-queue')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#770000] hover:bg-[#590000] active:scale-95 shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
              >
                <span>Review & Publish</span>
                <span>➔</span>
              </button>
            </div>
          )}

          {/* ================= KPI STATS HIGHLIGHT GRID ================= */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <KpiCard 
                  title="TOTAL GROUP" 
                  value={stats.totalGroups} 
                  trend="Total registered" 
                  icon={<FolderKanban className="w-5 h-5 text-[#590000] dark:text-[#f8d070]" />} 
                />
                <KpiCard 
                  title="IN PROGRESS" 
                  value={stats.pending} 
                  trend="Ongoing research" 
                  icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />} 
                  warning 
                />
                <KpiCard 
                  title="FOR COMPLETION" 
                  value={stats.approved} 
                  trend="Awaiting publish" 
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} 
                  highlight 
                />
                <KpiCard 
                  title="PUBLISHED" 
                  value={stats.published} 
                  trend="Live in archive" 
                  icon={<Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />} 
                />
                <KpiCard 
                  title="TOTAL ADVISERS" 
                  value={stats.totalAdvisers} 
                  subtext="Registered advisers" 
                  icon={<Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />} 
                />
              </>
            )}
          </div>

          {/* ================= CHARTS AND SUMMARIES GRID (ROW 2) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Group Requirements Progress Bar Chart */}
            <Card glass={true} className="lg:col-span-2 p-6 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    Group Requirements Progress
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Approved vs. pending requirements per research group
                  </p>
                </div>
                <div className="flex flex-wrap bg-stone-100 dark:bg-stone-800/80 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[11px] font-bold">
                  <button 
                    type="button"
                    onClick={() => setGroupReqFilter('all')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      groupReqFilter === 'all' 
                        ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-sm' 
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    All Groups ({groupRequirementsData.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGroupReqFilter('pending')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      groupReqFilter === 'pending' 
                        ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-sm' 
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    With Pending ({groupRequirementsData.filter(g => g.pending > 0).length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGroupReqFilter('completed')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      groupReqFilter === 'completed' 
                        ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-sm' 
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    Completed ({groupRequirementsData.filter(g => g.isCompleted).length})
                  </button>
                </div>
              </div>

              <div className="relative h-60 w-full mt-2 overflow-x-auto custom-scrollbar">
                {filteredGroupChartData.length > 0 ? (
                  <div style={{ minWidth: filteredGroupChartData.length > 8 ? `${filteredGroupChartData.length * 75}px` : '100%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredGroupChartData}
                        margin={{ top: 22, right: 16, left: -20, bottom: 24 }}
                        barCategoryGap="20%"
                        barGap={6}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.15)" />
                        <XAxis 
                          dataKey="shortName" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
                          interval={0}
                          dy={6}
                        />
                        <YAxis 
                          allowDecimals={false} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 600 }} 
                          domain={[0, (dataMax) => Math.max(dataMax + 2, 6)]}
                        />
                        <Tooltip content={<GroupRequirementsTooltip />} cursor={{ fill: 'rgba(120, 113, 108, 0.08)' }} />
                        <Legend 
                          iconType="circle" 
                          iconSize={8} 
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} 
                        />
                        <Bar 
                          dataKey="approved" 
                          name="Approved Requirements" 
                          fill="#059669" 
                          radius={[4, 4, 0, 0]} 
                          barSize={24}
                          minPointSize={6}
                          animationDuration={800} 
                        >
                          <LabelList 
                            dataKey="approved" 
                            position="top" 
                            fill="#059669" 
                            fontSize={10} 
                            fontWeight={700}
                            offset={6}
                          />
                        </Bar>
                        <Bar 
                          dataKey="pending" 
                          name="Pending Requirements" 
                          fill="#d97706" 
                          radius={[4, 4, 0, 0]} 
                          barSize={24}
                          minPointSize={6}
                          animationDuration={800} 
                        >
                          <LabelList 
                            dataKey="pending" 
                            position="top" 
                            fill="#d97706" 
                            fontSize={10} 
                            fontWeight={700}
                            offset={6}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs">
                    <FolderKanban className="w-8 h-8 mb-2 opacity-40 text-stone-400" />
                    <span>No research groups found for this filter</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Requirements Overview Summary Card */}
            <Card glass={true} className="p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  Requirements Overview
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Department submission status</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 flex-1 justify-center content-center">
                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Total Groups</span>
                  <p className="text-xl font-serif font-bold text-[#590000] dark:text-[#f8d070] my-0.5">{allGroups.length}</p>
                  <span className="text-[10px] text-stone-400 font-medium">Monitored teams</span>
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-sm">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">100% Completed</span>
                  <p className="text-xl font-serif font-bold text-emerald-700 dark:text-emerald-300 my-0.5">
                    {groupRequirementsData.filter(g => g.isCompleted).length}
                  </p>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">All reqs approved</span>
                </div>
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur-sm">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-400">With Pending</span>
                  <p className="text-xl font-serif font-bold text-amber-700 dark:text-amber-300 my-0.5">
                    {groupRequirementsData.filter(g => g.pending > 0).length}
                  </p>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium">Awaiting action</span>
                </div>
                <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Avg Progress</span>
                  <p className="text-xl font-serif font-bold text-[#770000] dark:text-[#f8d070] my-0.5">
                    {groupRequirementsData.length > 0
                      ? Math.round(groupRequirementsData.reduce((acc, g) => acc + g.completionRate, 0) / groupRequirementsData.length)
                      : 0}%
                  </p>
                  <span className="text-[10px] text-stone-400 font-medium">Department completion</span>
                </div>
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
                      <span className="text-3xl font-serif font-extrabold text-[#590000] dark:text-[#f8d070] leading-none mt-1">
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
                        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
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
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Top Research Papers</h3>
                  <p className="text-[10px] text-stone-400 font-medium mt-0.5">Click any study to view reader & liker info</p>
                </div>
                <div className="flex bg-stone-100 dark:bg-stone-800/80 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[10px] font-bold">
                  <button 
                    onClick={() => setTopPapersSort('likes')}
                    className={`${topPapersSort === 'likes' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 hover:text-stone-700 dark:text-stone-300'} px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5`}
                  >
                    <ThumbsUp className="w-3 h-3 text-[#590000] dark:text-[#f8d070]" />
                    <span>Liked</span>
                  </button>
                  <button 
                    onClick={() => setTopPapersSort('views')}
                    className={`${topPapersSort === 'views' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 hover:text-stone-700 dark:text-stone-300'} px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5`}
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Viewed</span>
                  </button>
                </div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {sortedTopPapers.length > 0 ? sortedTopPapers.map((paper, i) => {
                  const score = topPapersSort === 'likes' ? (paper.likes?.length || 0) : (paper.views || 0);
                  const icon = topPapersSort === 'likes' ? (
                    <ThumbsUp className="w-3 h-3 text-[#590000] dark:text-[#f8d070]" />
                  ) : (
                    <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  );
                  const highlight = isDualRole && (paper.adviserUid === deanData?.uid || (paper.adviserEmail && paper.adviserEmail === deanData?.email));
                  
                  const group = allGroups.find(g => g.leaderUid === paper.studentUid && (g.groupName === paper.groupName || g.researchTitle === (paper.researchTitle || paper.title)));
                  const displayTitle = group?.researchTitle || paper.researchTitle || paper.title || 'Untitled';
                  const displayAuthor = group?.groupName || paper.groupName || paper.studentName || 'Unknown Author';
                  const displayAdviser = group?.adviserName || paper.adviserName || 'Unknown Adviser';
                  
                  return (
                    <PaperRow 
                      key={paper.id || `paper-${i}`} 
                      rank={i + 1} 
                      title={displayTitle} 
                      author={`${displayAuthor} - ${displayAdviser}`} 
                      count={score} 
                      icon={icon} 
                      highlight={highlight} 
                      onClick={() => {
                        setSelectedPaperForModal({
                          ...paper,
                          group,
                          displayTitle,
                          displayAuthor,
                          displayAdviser
                        });
                        setModalActiveTab(topPapersSort === 'likes' ? 'liked' : 'viewed');
                      }}
                    />
                  );
                }) : (
                  <p className="text-xs text-stone-400 text-center py-4">No published papers yet.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ================= ADVISER UPLOAD STATISTICS ================= */}
          <Card glass={true} className="overflow-hidden">
            <div className="p-5 border-b border-stone-100 dark:border-stone-700/80 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">Adviser Upload Statistics</h3>
                {isDualRole ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">★ Your row is highlighted — you are also an Adviser</p>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">Showing all Research Advisers under your department</p>
                )}
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
                  onClick={handleSortFlip}
                  title={adviserSortOrder === 'desc' ? "Flip to ascending order" : "Flip to descending order"}
                  className={`p-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition-all text-stone-600 dark:text-stone-400 flex items-center justify-center ${isRefreshing ? 'opacity-50' : ''}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/50 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <th className="py-3 px-5">Adviser</th>
                    <th className="py-3 px-4 text-left">Uploads <span className="text-[9px] inline-block ml-1 opacity-60">{adviserSortOrder === 'desc' ? '↓' : '↑'}</span></th>
                    <th className="py-3 px-4 text-left">Approved</th>
                    <th className="py-3 px-4 text-left">Published</th>
                    <th className="py-3 px-4 text-left">Pending</th>
                    <th className="py-3 px-5 w-44">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700/60 font-medium text-stone-700 dark:text-stone-300">
                  {adviserStats.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-stone-400 text-sm">
                        No adviser statistics available yet. Wait for students to create submissions.
                      </td>
                    </tr>
                  ) : (
                    adviserStats.map((adv) => {
                      const isYou = isDualRole && (adv.uid === deanData?.uid || (adv.email && adv.email === deanData?.email));
                      const initials = adv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                      return (
                        <tr key={adv.uid} className={`${isYou ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/60 dark:hover:bg-amber-950/30' : 'hover:bg-stone-50 dark:hover:bg-stone-700'} transition-colors`}>
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
                                <div className="bg-[#590000] dark:bg-[#d4af37] dark:text-[#590000] h-full" style={{ width: `${adv.rate}%` }}></div>
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

      {/* Research Paper Engagement Modal */}
      {selectedPaperForModal && (
        <PaperEngagementModal
          paper={selectedPaperForModal}
          activeTab={modalActiveTab}
          onTabChange={setModalActiveTab}
          onClose={() => setSelectedPaperForModal(null)}
          usersMap={usersMap}
        />
      )}
    </div>
  );
}

// ================= PRIVATE COMPONENT MACROS =================

function KpiCard({ title, value, trend, trendSub, subtext, icon, highlight, warning }) {
  return (
    <Card glass={true} className={`p-4 transition-all hover:-translate-y-[2px] ${highlight ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/20' : ''} flex flex-col justify-between`}>
      <div className="flex justify-between items-center mb-2 gap-1.5">
        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{title}</span>
        <span className="flex items-center justify-center opacity-90 shrink-0 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
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
    <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:-translate-y-[2px] shadow-sm ${active ? 'border-[#590000] dark:border-[#f8d070]/50 bg-[#590000]/10 dark:bg-[#f8d070]/10 ring-1 ring-[#590000]/50 dark:ring-[#f8d070]/30' : 'border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm hover:bg-stone-50/80 dark:hover:bg-stone-800/80'}`}>
      <span className={`text-xs font-bold ${active ? 'text-[#590000] dark:text-[#f8d070]' : 'text-stone-800 dark:text-stone-200'}`}>{year}</span>
      <span className={`text-lg font-serif font-bold ${active ? 'text-[#590000] dark:text-[#f8d070]' : 'text-stone-900 dark:text-stone-100'} my-0.5`}>{count} <span className="text-[10px] font-sans font-medium text-stone-400">uploads</span></span>
      {badge && <span className="text-[9px] text-stone-400 font-bold tracking-tight uppercase">{badge}</span>}
      {growth && <span className={`text-[10px] font-extrabold ${textGreen ? 'text-emerald-600' : 'text-stone-500 dark:text-stone-400'}`}>{growth}</span>}
    </div>
  );
}

function PaperRow({ rank, title, author, count, icon, highlight, onClick }) {
  return (
    <div 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all hover:-translate-y-[2px] hover:shadow-md cursor-pointer select-none group ${highlight ? 'border-[#590000]/40 bg-[#590000]/10 dark:bg-[#d4af37]/10 hover:border-[#590000]' : 'border-stone-200/50 dark:border-stone-700/50 bg-white/40 dark:bg-stone-800/40 backdrop-blur-sm hover:bg-white dark:hover:bg-stone-800 hover:border-[#770000]/30 dark:hover:border-[#f8d070]/30'}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ${rank === 1 ? 'bg-amber-100 text-amber-700' : rank === 2 ? 'bg-stone-200 text-stone-700 dark:text-stone-300' : 'bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400'}`}>
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate group-hover:text-[#590000] dark:group-hover:text-[#f8d070] transition-colors">{title}</h4>
          <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">{author}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-400 text-xs shrink-0 bg-white dark:bg-stone-800 px-2 py-1 rounded-md border border-stone-100 dark:border-stone-700/80 shadow-sm">
          <span className="flex items-center justify-center">{icon}</span>
          <span>{count}</span>
        </div>
        <span className="text-[10px] text-stone-300 dark:text-stone-600 group-hover:text-[#590000] dark:group-hover:text-[#f8d070] group-hover:translate-x-0.5 transition-all">
          ➔
        </span>
      </div>
    </div>
  );
}

function PaperEngagementModal({ paper, activeTab, onTabChange, onClose, usersMap }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!paper) return null;

  const group = paper.group;
  const title = paper.displayTitle || paper.title || paper.researchTitle || 'Untitled Research Study';
  const groupName = group?.groupName || paper.groupName || 'Unknown Group';
  const leaderName = group?.leaderName || paper.studentName || 'Unknown Leader';
  const members = Array.isArray(group?.members) ? group.members : [];
  const adviser = paper.displayAdviser || group?.adviserName || paper.adviserName || 'Not Assigned';
  const department = group?.department || paper.department || 'College of Information Technology';
  const program = group?.program || paper.program || 'BSIT';
  const category = group?.category || paper.category || (Array.isArray(paper.tags) && paper.tags[0]) || 'General Research';
  const abstractText = paper.abstract || group?.abstract || 'No abstract text available for this research study.';
  
  // Publication Year
  const pubDate = parseDate(paper.createdAt) || parseDate(group?.createdAt) || parseDate(paper.submittedDate);
  const publishYear = pubDate ? pubDate.getFullYear().toString() : '2026';

  // Resolve Liked Users
  const resolveLikedUsers = () => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(paper.likedUsers)) {
      paper.likedUsers.forEach(u => {
        if (!u) return;
        const key = u.uid || u.email?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          const mapped = usersMap[u.uid] || usersMap[u.email?.toLowerCase()];
          list.push({
            uid: u.uid || key,
            name: mapped?.name || u.name || u.displayName || u.email?.split('@')[0] || 'User',
            email: mapped?.email || u.email || '',
            role: mapped?.role || 'User',
            department: mapped?.department || ''
          });
        }
      });
    }

    if (Array.isArray(paper.likes)) {
      paper.likes.forEach(uid => {
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        const mapped = usersMap[uid];
        list.push({
          uid,
          name: mapped?.name || 'Archivio User',
          email: mapped?.email || '',
          role: mapped?.role || 'User',
          department: mapped?.department || ''
        });
      });
    }

    return list;
  };

  // Resolve Viewed Users
  const resolveViewedUsers = () => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(paper.viewedUsers)) {
      paper.viewedUsers.forEach(u => {
        if (!u) return;
        const key = u.uid || u.email?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          const mapped = usersMap[u.uid] || usersMap[u.email?.toLowerCase()];
          list.push({
            uid: u.uid || key,
            name: mapped?.name || u.name || u.displayName || u.email?.split('@')[0] || 'User',
            email: mapped?.email || u.email || '',
            role: mapped?.role || 'User',
            department: mapped?.department || '',
            viewedAt: u.viewedAt || null
          });
        }
      });
    }

    if (Array.isArray(paper.viewedBy)) {
      paper.viewedBy.forEach(uid => {
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        const mapped = usersMap[uid];
        list.push({
          uid,
          name: mapped?.name || 'Archivio User',
          email: mapped?.email || '',
          role: mapped?.role || 'User',
          department: mapped?.department || ''
        });
      });
    }

    return list;
  };

  const likedUsers = resolveLikedUsers();
  const viewedUsers = resolveViewedUsers();
  const totalLikesCount = paper.likes?.length || likedUsers.length || 0;
  const totalViewsCount = paper.views || viewedUsers.length || 0;

  const manuscriptUrl = paper.documents?.['Final Manuscript']?.url || paper.manuscriptUrl;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] my-auto relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Line */}
        <div className="h-2 w-full bg-gradient-to-r from-[#590000] via-[#8c1c38] to-[#d4af37]"></div>

        {/* Header Bar */}
        <div className="p-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-[#590000] dark:text-[#f8d070] border border-stone-200/80 dark:border-stone-700">
                <Tag className="w-3 h-3" />
                {category}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Published
              </span>
              <span className="text-xs font-semibold text-stone-400">
                • Published {publishYear}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Proponents Card */}
            <div className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/60">
              <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                <Users className="w-3.5 h-3.5 text-[#590000] dark:text-[#f8d070]" />
                <span>Authors & Group</span>
              </div>
              <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                {groupName}
              </p>
              <div className="mt-1 text-xs text-stone-600 dark:text-stone-300 space-y-0.5">
                <p><span className="font-semibold text-stone-400">Leader:</span> {leaderName}</p>
                {members.length > 0 && (
                  <p>
                    <span className="font-semibold text-stone-400">Members:</span>{' '}
                    {members.map(m => typeof m === 'object' ? (m.name || m.email) : m).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Adviser Card */}
            <div className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/60">
              <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Research Adviser</span>
              </div>
              <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                {adviser}
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {department} {program ? `(${program})` : ''}
              </p>
            </div>
          </div>

          {/* Abstract Section */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-bold text-xs uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4 text-[#590000] dark:text-[#f8d070]" />
              <span>Abstract</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-light leading-relaxed max-h-36 overflow-y-auto pr-2 whitespace-pre-line">
              {abstractText}
            </p>
          </div>

          {/* User Engagement Analytics (Likes & Views List) */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-stone-200 dark:border-stone-700 pb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                  <span>User Engagement Log</span>
                  <span className="text-[10px] font-normal text-stone-400">Accounts recorded interacting with this paper</span>
                </h4>
              </div>

              {/* Engagement Tab Switcher */}
              <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 border border-stone-200 dark:border-stone-700 text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onTabChange('liked')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'liked'
                      ? 'bg-white dark:bg-stone-700 text-[#590000] dark:text-[#f8d070] shadow-sm'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Liked By</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#590000]/10 dark:bg-[#f8d070]/20 text-[#590000] dark:text-[#f8d070]">
                    {likedUsers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onTabChange('viewed')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'viewed'
                      ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Viewed By</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {viewedUsers.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Total count sub-banner */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-3 px-1">
              <span>
                {activeTab === 'liked' ? (
                  <>Total Likes on Paper: <strong className="text-stone-800 dark:text-stone-200">{totalLikesCount}</strong></>
                ) : (
                  <>Total Archive Reads: <strong className="text-stone-800 dark:text-stone-200">{totalViewsCount}</strong> (including guests)</>
                )}
              </span>
              <span className="text-[11px] text-stone-400">
                {activeTab === 'liked' ? `${likedUsers.length} logged-in users` : `${viewedUsers.length} logged-in readers`}
              </span>
            </div>

            {/* User List Panel */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {activeTab === 'liked' ? (
                likedUsers.length > 0 ? (
                  likedUsers.map((u, idx) => (
                    <UserEngagementRow key={u.uid || `like-${idx}`} user={u} type="like" />
                  ))
                ) : (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/20">
                    <ThumbsUp className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">No users have liked this study yet.</p>
                  </div>
                )
              ) : (
                viewedUsers.length > 0 ? (
                  viewedUsers.map((u, idx) => (
                    <UserEngagementRow key={u.uid || `view-${idx}`} user={u} type="view" />
                  ))
                ) : (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/20">
                    <Eye className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                      No logged-in user views recorded yet.
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      (Total general views count: {totalViewsCount})
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-400">
            Dean Management System • Top Research Analytics
          </div>
          <div className="flex items-center gap-2">
            {manuscriptUrl && (
              <a
                href={manuscriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#590000] hover:bg-[#770000] active:scale-95 shadow-sm transition-all"
              >
                <span>Read Manuscript</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function UserEngagementRow({ user, type }) {
  const initials = (user.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel = (user.role || 'User').toUpperCase();
  const isStudent = roleLabel.includes('STUDENT');
  const isAdviser = roleLabel.includes('ADVISER');
  const isDean = roleLabel.includes('DEAN');

  const roleBadgeStyle = isDean
    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
    : isAdviser
    ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
    : isStudent
    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-600';

  return (
    <div className="p-3 rounded-xl border border-stone-200/70 dark:border-stone-700/60 bg-white dark:bg-stone-800/70 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
          type === 'like' ? 'bg-[#590000]/10 text-[#590000] dark:bg-[#f8d070]/20 dark:text-[#f8d070]' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        }`}>
          {initials || 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
            {user.name}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate font-mono">
            {user.email || 'No email attached'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user.department && (
          <span className="hidden sm:inline-block text-[10px] text-stone-400 font-medium truncate max-w-[120px]">
            {user.department}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${roleBadgeStyle}`}>
          {roleLabel}
        </span>
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

function GroupRequirementsTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-700 p-3.5 rounded-xl shadow-xl max-w-xs font-sans pointer-events-none z-50">
        <div className="border-b border-stone-200 dark:border-stone-700 pb-2 mb-2">
          <p className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">{data.groupName}</p>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5" title={data.researchTitle}>
            "{data.researchTitle}"
          </p>
          <p className="text-[10px] text-stone-400 font-medium mt-1">
            Adviser: <span className="text-stone-700 dark:text-stone-300 font-semibold">{data.adviserName}</span>
          </p>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>Approved Requirements:
            </span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono">
              {data.approved} / {data.total}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>Pending Requirements:
            </span>
            <span className="font-bold text-amber-800 dark:text-amber-300 font-mono">
              {data.pending} / {data.total}
            </span>
          </div>
          <div className="pt-2 mt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 dark:text-stone-400 font-medium">Completion Rate:</span>
            <span className={`font-extrabold ${data.completionRate === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#770000] dark:text-[#f8d070]'}`}>
              {data.completionRate}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

