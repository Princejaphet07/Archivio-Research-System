import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ComposedChart, Line, Bar, BarChart, YAxis, CartesianGrid, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { db } from '../firebase/config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

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
  TrendingDown,
  Minus,
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
  Sparkles,
  Filter,
  Search,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  UserCheck,
  Archive,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  FileDown,
  Table,
  ChevronDown
} from 'lucide-react';

const parseDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const formatActionDate = (val) => {
  const d = parseDate(val);
  if (!d) return 'No action recorded';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatSYLabel = (raw) => {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^S\.?Y\.?\s*/i.test(str)) {
    return str.replace(/^S\.?Y\.?\s*/i, 'S.Y. ');
  }
  if (/^\d{4}\s*[-–/]\s*\d{4}$/.test(str)) {
    return `S.Y. ${str}`;
  }
  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    return `S.Y. ${y}-${y + 1}`;
  }
  return `S.Y. ${str}`;
};

const extractSYClean = (raw) => {
  if (!raw) return '';
  const str = String(raw).trim();
  const match = str.match(/(\d{4})\s*[-–/]\s*(\d{4})/);
  if (match) return `${match[1]}-${match[2]}`;
  const single = str.match(/(\d{4})/);
  if (single) {
    const y = parseInt(single[1], 10);
    return `${y}-${y + 1}`;
  }
  return str.replace(/^S\.?Y\.?\s*/i, '').trim();
};

const getSYStartYear = (raw) => {
  if (!raw) return 0;
  const str = String(raw);
  const match = str.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

const resolvePaperSY = (group, sub, defaultSY) => {
  const rawSY = group?.schoolYear || sub?.schoolYear || group?.academicYear || sub?.academicYear;
  if (rawSY) return formatSYLabel(rawSY);
  const submittedDate = sub?.submittedDate || sub?.createdAt || group?.createdAt;
  if (submittedDate) {
    const d = parseDate(submittedDate);
    if (d) {
      const startYear = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
      return `S.Y. ${startYear}-${startYear + 1}`;
    }
  }
  return formatSYLabel(defaultSY || '2026-2027');
};

const resolvePaperOfficialStatus = (sub) => {
  const isPublished = sub?.reviewStatus === 'published' || sub?.status === 'published' || Boolean(sub?.publishedAt);
  if (isPublished) return 'Published';

  const isForCompletion = sub?.reviewStatus === 'approved' || sub?.reviewStatus === 'endorsed' || sub?.adviserEndorsed === true;
  if (isForCompletion) return 'For Completion';

  return 'In Progress';
};

const resolveGroupSection = (group, sub, usersMap) => {
  if (group?.section && String(group.section).trim()) return String(group.section).trim();
  if (sub?.section && String(sub.section).trim()) return String(sub.section).trim();
  if (group?.studentSection && String(group.studentSection).trim()) return String(group.studentSection).trim();
  if (sub?.studentSection && String(sub.studentSection).trim()) return String(sub.studentSection).trim();
  if (group?.yearAndSection && String(group.yearAndSection).trim()) return String(group.yearAndSection).trim();
  if (sub?.yearAndSection && String(sub.yearAndSection).trim()) return String(sub.yearAndSection).trim();
  if (group?.groupSection && String(group.groupSection).trim()) return String(group.groupSection).trim();
  if (sub?.groupSection && String(sub.groupSection).trim()) return String(sub.groupSection).trim();

  const leaderUid = group?.leaderUid || sub?.studentUid;
  if (leaderUid && usersMap && usersMap[leaderUid]?.section && String(usersMap[leaderUid].section).trim()) {
    return String(usersMap[leaderUid].section).trim();
  }
  const leaderEmail = (group?.leaderEmail || sub?.studentEmail)?.toLowerCase().trim();
  if (leaderEmail && usersMap && usersMap[leaderEmail]?.section && String(usersMap[leaderEmail].section).trim()) {
    return String(usersMap[leaderEmail].section).trim();
  }

  if (Array.isArray(group?.members) && group.members.length > 0) {
    for (const m of group.members) {
      if (m && typeof m === 'object' && m.section && String(m.section).trim()) {
        return String(m.section).trim();
      }
      const mEmail = (typeof m === 'object' ? m.email : m)?.toLowerCase()?.trim();
      if (mEmail && usersMap && usersMap[mEmail]?.section && String(usersMap[mEmail].section).trim()) {
        return String(usersMap[mEmail].section).trim();
      }
    }
  }

  if (group?.program && String(group.program).trim()) return String(group.program).trim();
  if (sub?.program && String(sub.program).trim()) return String(sub.program).trim();
  if (group?.department && String(group.department).trim()) return String(group.department).trim();

  return 'IT';
};

const resolveGroupCategory = (group, sub, usersMap) => {
  const gCat = (group?.category || '').trim();
  if (gCat && gCat !== 'Uncategorized' && gCat.toLowerCase() !== 'it' && gCat.toLowerCase() !== 'n/a') {
    return gCat;
  }
  const sCat = (sub?.category || '').trim();
  if (sCat && sCat !== 'Uncategorized' && sCat.toLowerCase() !== 'it' && sCat.toLowerCase() !== 'n/a') {
    return sCat;
  }
  const leaderUid = group?.leaderUid || sub?.studentUid;
  const userCat = (leaderUid && usersMap && usersMap[leaderUid]?.category ? usersMap[leaderUid].category : '').trim();
  if (userCat && userCat !== 'Uncategorized' && userCat.toLowerCase() !== 'it' && userCat.toLowerCase() !== 'n/a') {
    return userCat;
  }
  const gResCat = (group?.researchCategory || '').trim();
  if (gResCat && gResCat !== 'Uncategorized' && gResCat.toLowerCase() !== 'it' && gResCat.toLowerCase() !== 'n/a') {
    return gResCat;
  }
  const sResCat = (sub?.researchCategory || '').trim();
  if (sResCat && sResCat !== 'Uncategorized' && sResCat.toLowerCase() !== 'it' && sResCat.toLowerCase() !== 'n/a') {
    return sResCat;
  }
  if (Array.isArray(sub?.tags) && sub.tags.length > 0) {
    const tag = String(sub.tags[0]).trim();
    if (tag && tag.toLowerCase() !== 'it' && tag.toLowerCase() !== 'n/a' && tag !== 'Uncategorized') {
      return tag;
    }
  }
  return 'General Research';
};

const getAdviserShortName = (fullName, isYou) => {
  if (!fullName) return isYou ? 'You' : 'Adviser';
  const clean = fullName.replace(/^(Dr\.|Prof\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  const lastName = parts.length > 0 ? parts[parts.length - 1] : fullName;
  return isYou ? `${lastName} (You)` : lastName;
};

const findGroupSubmission = (group, submissions) => {
  if (!group || !submissions || submissions.length === 0) return {};
  return submissions.find(s =>
    (s.groupId && (s.groupId === group.id || s.groupId === group.groupId)) ||
    (group.groupName && s.groupName && s.groupName.trim().toLowerCase() === group.groupName.trim().toLowerCase()) ||
    (s.studentUid && s.studentUid === group.leaderUid && (s.groupName === group.groupName || (s.title || s.researchTitle) === group.researchTitle)) ||
    (s.studentUid && group.leaderUid && s.studentUid === group.leaderUid) ||
    (group.leaderEmail && s.studentEmail && group.leaderEmail.toLowerCase().trim() === s.studentEmail.toLowerCase().trim())
  ) || {};
};

const checkManuscript = (group, sub) => {
  const hasUrl = Boolean(sub.manuscriptUrl || sub.fileUrl || group.manuscriptUrl || group.fileUrl);
  const hasDoc = Boolean(sub.documents && (sub.documents['Final Manuscript'] || sub.documents['final_manuscript'] || sub.documents['manuscript']));
  const isApprovedOrPublished = sub.reviewStatus === 'approved' || sub.reviewStatus === 'published';
  const isUploaded = hasUrl || hasDoc || isApprovedOrPublished;

  let statusText = 'Pending Upload';
  if (isApprovedOrPublished) {
    statusText = 'Approved & Uploaded';
  } else if (isUploaded) {
    statusText = 'Uploaded';
  }

  const dateVal = parseDate(sub.updatedAt) || parseDate(sub.createdAt) || parseDate(group.updatedAt) || parseDate(group.createdAt);

  return {
    passed: isUploaded,
    statusText,
    dateVal
  };
};

const checkOriginality = (group, sub) => {
  const hasManuscript = Boolean(sub.manuscriptUrl || sub.fileUrl || group.manuscriptUrl || (sub.documents && sub.documents['Final Manuscript']));
  const simScore = sub.similarityScore ?? sub.turnitinScore ?? (sub.similarityResult ? sub.similarityResult.score : null);
  const numScore = typeof simScore === 'number' ? simScore : (simScore ? parseFloat(simScore) : null);

  const hasReport = Boolean(
    sub.documents?.['Turnitin Report'] ||
    sub.documentApprovals?.['Turnitin Report'] ||
    sub.turnitinUrl ||
    sub.turnitinFileUrl ||
    sub.plagiarismReportUrl
  );

  const isApprovedOrPublished = sub.reviewStatus === 'approved' || sub.reviewStatus === 'published';
  const explicitPassed = sub.turnitinPassed === true || sub.similarityCleared === true;

  const passed = explicitPassed || (numScore !== null && !isNaN(numScore) && numScore < 75) || hasReport || isApprovedOrPublished;

  let statusText = 'Pending Clearance';
  if (!hasManuscript && !isApprovedOrPublished) {
    statusText = 'Pending Upload';
  } else if (numScore !== null && !isNaN(numScore)) {
    statusText = passed ? `Cleared (${numScore}%)` : `Flagged (${numScore}%)`;
  } else if (hasReport) {
    statusText = 'Cleared';
  } else if (isApprovedOrPublished) {
    statusText = 'Cleared';
  }

  const dateVal = parseDate(sub.turnitinDate) || parseDate(sub.similarityCheckedAt) || parseDate(sub.updatedAt) || parseDate(sub.createdAt);

  return {
    passed,
    statusText,
    dateVal
  };
};

const checkAdviserApproval = (group, sub) => {
  const explicitApproved = Boolean(
    sub.adviserApproved === true ||
    sub.adviserEndorsed === true ||
    group.adviserApproved === true ||
    sub.reviewStatus === 'approved' ||
    sub.reviewStatus === 'endorsed' ||
    sub.reviewStatus === 'published'
  );

  const passed = explicitApproved;

  const adviserLabel = group.adviserName || sub.adviserName || 'Adviser';
  let statusText = 'Pending Review';
  if (sub.reviewStatus === 'published') {
    statusText = 'Approved & Published';
  } else if (passed) {
    statusText = `Approved by ${adviserLabel}`;
  } else if (sub.reviewStatus === 'reviewed') {
    statusText = `Under Review by ${adviserLabel}`;
  } else if (sub.reviewStatus === 'revision') {
    statusText = 'Revision Requested';
  } else if (!sub.manuscriptUrl && !sub.fileUrl && !sub.documents) {
    statusText = 'Pending Submission';
  }

  const dateVal = parseDate(sub.endorsedAt) || parseDate(sub.adviserApprovedAt) || parseDate(sub.reviewedAt) || parseDate(sub.updatedAt);

  return {
    passed,
    statusText,
    dateVal
  };
};

const checkPublicArchive = (group, sub, mRes, oRes, aRes) => {
  const isPublished = sub.reviewStatus === 'published' || group.isArchived === true;
  const isApproved = sub.reviewStatus === 'approved' || sub.reviewStatus === 'endorsed' || sub.adviserEndorsed === true;

  // Ready for Public Archive requires adviser endorsement
  const passed = isPublished || isApproved;

  let statusText = 'Pending Steps';
  if (isPublished) {
    statusText = 'Archived in Repository';
  } else if (passed) {
    statusText = 'Ready for Public Archive';
  } else if (sub.reviewStatus === 'reviewed') {
    statusText = 'Awaiting Adviser Endorsement';
  } else if (mRes.passed && !aRes.passed) {
    statusText = 'Awaiting Adviser Approval';
  }

  const dateVal = parseDate(sub.publishedAt) || parseDate(sub.endorsedAt) || parseDate(sub.approvedAt) || parseDate(sub.updatedAt);

  return {
    passed,
    statusText,
    dateVal
  };
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
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All Sections');
  const [selectedAdviserFilter, setSelectedAdviserFilter] = useState('All Advisers');
  const [selectedRequirementDetail, setSelectedRequirementDetail] = useState(null);
  const [selectedYearForModal, setSelectedYearForModal] = useState(null);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [categoryViewMode, setCategoryViewMode] = useState('donut'); // 'donut' | 'bar'
  const [selectedCategoryYear, setSelectedCategoryYear] = useState(() => extractSYClean(activeSY) || '2026-2027');
  const [topPapersSort, setTopPapersSort] = useState('views'); // 'views' | 'likes'
  const [chartFilter, setChartFilter] = useState('year'); // 'year' | 'month'
  const [adviserViewMode, setAdviserViewMode] = useState('table'); // 'table' | 'graph'
  const [adviserTableYear, setAdviserTableYear] = useState(() => extractSYClean(activeSY) || '2026-2027');
  const [adviserSortOrder, setAdviserSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPaperForModal, setSelectedPaperForModal] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('liked'); // 'liked' | 'viewed'
  const [usersMap, setUsersMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
        const section = data.section || data.studentSection || data.yearAndSection || '';
        const category = data.category || data.researchCategory || '';
        const userObj = { uid, email, name, role, department, section, category };
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
        const section = data.section || data.studentSection || data.yearAndSection || '';
        const category = data.category || data.researchCategory || '';
        const userObj = { uid, email, name, role, department, section, category };
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
      // Find submission matching the group
      const data = findGroupSubmission(group, allRawSubmissions);

      const status = data.reviewStatus || 'pending';

      if (status === 'approved') approvedCount++;
      if (status === 'published') {
        publishedCount++;
        const cat = resolveGroupCategory(group, data, usersMap);
        const sec = resolveGroupSection(group, data, usersMap);
        const resolvedTitle = group.researchTitle || group.title || data.title || data.researchTitle || 'Untitled Research';
        const resolvedGroupName = group.groupName || data.groupName || (group.groupId ? `Group ${group.groupId}` : '—');
        const resolvedAdviserName = group.adviserName || data.adviserName || usersMap[group.adviserUid]?.name || usersMap[data.adviserUid]?.name || 'Not Assigned';
        const resolvedSection = (sec && sec !== 'Unassigned Section' && sec !== '—') ? sec : (group.section || data.section || group.studentSection || group.program || 'IT');
        const resolvedCategory = (cat && cat !== 'Uncategorized' && cat !== 'N/A') ? cat : (group.category || data.category || 'General Research');

        papers.push({
          ...data,
          id: data.id || group.id,
          groupId: group.id || data.groupId,
          studentUid: group.leaderUid || data.studentUid,
          title: resolvedTitle,
          researchTitle: resolvedTitle,
          groupName: resolvedGroupName,
          section: resolvedSection,
          category: resolvedCategory,
          adviserName: resolvedAdviserName,
          views: Number(data.views || group.views || 0),
          likes: Array.isArray(data.likes) ? data.likes : (Array.isArray(group.likes) ? group.likes : [])
        });

        categoriesMap[resolvedCategory] = (categoriesMap[resolvedCategory] || 0) + 1;
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

    // Also include any published submissions not captured by allGroups
    allRawSubmissions.forEach(sub => {
      if (sub.reviewStatus !== 'published') return;
      const alreadyIncluded = papers.some(p => (p.id && p.id === sub.id) || (sub.studentUid && p.studentUid === sub.studentUid && (p.title === (sub.title || sub.researchTitle))));
      if (alreadyIncluded) return;

      const cat = resolveGroupCategory(null, sub, usersMap);
      const sec = resolveGroupSection(null, sub, usersMap);
      const resolvedTitle = sub.title || sub.researchTitle || 'Untitled Research';
      const resolvedGroupName = sub.groupName || (sub.groupId ? `Group ${sub.groupId}` : '—');
      const resolvedAdviserName = sub.adviserName || usersMap[sub.adviserUid]?.name || 'Not Assigned';
      const resolvedSection = (sec && sec !== 'Unassigned Section' && sec !== '—') ? sec : (sub.section || sub.studentSection || 'IT');
      const resolvedCategory = (cat && cat !== 'Uncategorized' && cat !== 'N/A') ? cat : (sub.category || 'General Research');

      publishedCount++;
      papers.push({
        ...sub,
        id: sub.id,
        title: resolvedTitle,
        researchTitle: resolvedTitle,
        groupName: resolvedGroupName,
        section: resolvedSection,
        category: resolvedCategory,
        adviserName: resolvedAdviserName,
        views: Number(sub.views || 0),
        likes: Array.isArray(sub.likes) ? sub.likes : []
      });

      categoriesMap[resolvedCategory] = (categoriesMap[resolvedCategory] || 0) + 1;
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

  }, [allRawSubmissions, allGroups, chartFilter, adviserTableYear, adviserSortOrder, usersMap]);

  // Accurate group requirements progress computation (Approved vs Pending per research group)
  // Must remain before if (loading) return to obey React Rules of Hooks
  const groupRequirementsData = useMemo(() => {
    return allGroups.map((group, index) => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const section = resolveGroupSection(group, sub, usersMap);
      const adviserName = group.adviserName || sub.adviserName || usersMap[group.adviserUid]?.name || 'Not Assigned';

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
        adviserName,
        section,
        approved: approvedCount,
        pending: pendingCount,
        total: totalReqs,
        completionRate,
        isCompleted: pendingCount === 0 && approvedCount > 0,
        status: sub.reviewStatus || 'in_progress',
        sub
      };
    });
  }, [allGroups, allRawSubmissions, allRequirements, usersMap]);

  // Dynamic lists of unique sections and registered advisers present in active groups
  const availableSections = useMemo(() => {
    const set = new Set();
    groupRequirementsData.forEach(g => {
      if (g.section && g.section.trim()) {
        set.add(g.section.trim());
      }
    });
    return ['All Sections', ...Array.from(set).sort()];
  }, [groupRequirementsData]);

  const availableAdvisers = useMemo(() => {
    const set = new Set();
    groupRequirementsData.forEach(g => {
      if (g.adviserName && g.adviserName !== 'Not Assigned') {
        set.add(g.adviserName.trim());
      }
    });
    return ['All Advisers', ...Array.from(set).sort()];
  }, [groupRequirementsData]);

  // Groups filtered by Section & Adviser dropdowns (used for status button counts and base dataset)
  const sectionAdviserFilteredGroups = useMemo(() => {
    return groupRequirementsData.filter(g => {
      if (selectedSectionFilter !== 'All Sections' && g.section !== selectedSectionFilter) {
        return false;
      }
      if (selectedAdviserFilter !== 'All Advisers' && g.adviserName !== selectedAdviserFilter) {
        return false;
      }
      return true;
    });
  }, [groupRequirementsData, selectedSectionFilter, selectedAdviserFilter]);

  // Chart data strictly filtered by Section, Adviser, and Status
  const filteredGroupChartData = useMemo(() => {
    let list = sectionAdviserFilteredGroups;
    if (groupReqFilter === 'pending') {
      list = list.filter(g => g.pending > 0);
    } else if (groupReqFilter === 'completed') {
      list = list.filter(g => g.isCompleted);
    }
    return list;
  }, [sectionAdviserFilteredGroups, groupReqFilter]);

  // 4-Row Requirement Breakdown Calculation for Active Semester / Academic Year
  const requirementsBreakdown = useMemo(() => {
    const totalGroups = allGroups.length;

    const mList = [];
    const oList = [];
    const aList = [];
    const pList = [];

    allGroups.forEach((group, index) => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const section = resolveGroupSection(group, sub, usersMap);
      const adviserName = group.adviserName || sub.adviserName || usersMap[group.adviserUid]?.name || 'Not Assigned';
      const groupName = group.groupName || `Group ${index + 1}`;
      const researchTitle = group.researchTitle || sub.researchTitle || sub.title || 'Untitled Research';

      const m = checkManuscript(group, sub);
      const o = checkOriginality(group, sub);
      const a = checkAdviserApproval(group, sub);
      const p = checkPublicArchive(group, sub, m, o, a);

      const baseInfo = {
        id: group.id || `group-${index}`,
        groupName,
        researchTitle,
        section,
        adviserName
      };

      mList.push({
        ...baseInfo,
        isPassed: m.passed,
        formattedStatus: `${groupName}: ${m.statusText}`,
        rawStatus: m.statusText,
        lastActionDate: formatActionDate(m.dateVal)
      });

      oList.push({
        ...baseInfo,
        isPassed: o.passed,
        formattedStatus: `${groupName}: ${o.statusText}`,
        rawStatus: o.statusText,
        lastActionDate: formatActionDate(o.dateVal)
      });

      aList.push({
        ...baseInfo,
        isPassed: a.passed,
        formattedStatus: `${groupName}: ${a.statusText}`,
        rawStatus: a.statusText,
        lastActionDate: formatActionDate(a.dateVal)
      });

      pList.push({
        ...baseInfo,
        isPassed: p.passed,
        formattedStatus: `${groupName}: ${p.statusText}`,
        rawStatus: p.statusText,
        lastActionDate: formatActionDate(p.dateVal)
      });
    });

    const mCount = mList.filter(g => g.isPassed).length;
    const oCount = oList.filter(g => g.isPassed).length;
    const aCount = aList.filter(g => g.isPassed).length;
    const pCount = pList.filter(g => g.isPassed).length;

    return [
      {
        id: 'final_manuscript',
        stepNumber: 1,
        title: 'Final Manuscript Uploads',
        subtitle: 'Post-defense manuscript PDF uploaded',
        count: mCount,
        total: totalGroups,
        percentage: totalGroups > 0 ? Math.round((mCount / totalGroups) * 100) : 0,
        groups: mList,
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        barColor: 'bg-blue-600 dark:bg-blue-500'
      },
      {
        id: 'originality_check',
        stepNumber: 2,
        title: 'Originality Check',
        subtitle: 'Passed Turnitin & similarity clearance',
        count: oCount,
        total: totalGroups,
        percentage: totalGroups > 0 ? Math.round((oCount / totalGroups) * 100) : 0,
        groups: oList,
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        barColor: 'bg-amber-500 dark:bg-amber-400'
      },
      {
        id: 'adviser_approvals',
        stepNumber: 3,
        title: 'Adviser Approvals',
        subtitle: 'Signed off & approved by assigned adviser',
        count: aCount,
        total: totalGroups,
        percentage: totalGroups > 0 ? Math.round((aCount / totalGroups) * 100) : 0,
        groups: aList,
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        barColor: 'bg-emerald-600 dark:bg-emerald-500'
      },
      {
        id: 'public_archive',
        stepNumber: 4,
        title: 'Ready for Public Archive',
        subtitle: 'All clearance requirements completed for release',
        count: pCount,
        total: totalGroups,
        percentage: totalGroups > 0 ? Math.round((pCount / totalGroups) * 100) : 0,
        groups: pList,
        badgeColor: 'bg-[#770000]/10 text-[#770000] dark:bg-[#d4af37]/20 dark:text-[#f8d070]',
        barColor: 'bg-[#770000] dark:bg-[#d4af37]'
      }
    ];
  }, [allGroups, allRawSubmissions, usersMap]);

  // Dynamic Yearly Summary with Growth vs Prior Year and Active School Year Highlight
  const yearlySummaryList = useMemo(() => {
    const yearsMap = {};

    // 1. Seed years strictly from Dean Settings (School Year Management)
    if (deanSettings?.schoolYears && Array.isArray(deanSettings.schoolYears)) {
      deanSettings.schoolYears.forEach(sy => {
        const raw = sy?.label || sy?.year || sy?.name || (typeof sy === 'string' ? sy : null);
        if (raw) {
          const formatted = formatSYLabel(raw);
          const isArchive = sy?.status === 'Archive' || sy?.status === 'archive';
          if (!yearsMap[formatted]) {
            yearsMap[formatted] = {
              year: formatted,
              clean: extractSYClean(formatted),
              startYear: getSYStartYear(formatted),
              isArchive,
              papers: []
            };
          } else if (isArchive) {
            yearsMap[formatted].isArchive = true;
          }
        }
      });
    }
    if (deanSettings?.schoolYear) {
      const formatted = formatSYLabel(deanSettings.schoolYear);
      if (!yearsMap[formatted]) {
        yearsMap[formatted] = {
          year: formatted,
          clean: extractSYClean(formatted),
          startYear: getSYStartYear(formatted),
          isArchive: false,
          papers: []
        };
      }
    }

    // Always ensure activeSY is present
    const activeFormatted = formatSYLabel(activeSY);
    if (!yearsMap[activeFormatted]) {
      yearsMap[activeFormatted] = {
        year: activeFormatted,
        clean: extractSYClean(activeFormatted),
        startYear: getSYStartYear(activeFormatted),
        isArchive: false,
        papers: []
      };
    }

    // 2. Pair each group with its live submission and assign to School Year
    allGroups.forEach((group, index) => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const sy = resolvePaperSY(group, sub, activeSY);

      if (!yearsMap[sy]) {
        yearsMap[sy] = {
          year: sy,
          clean: extractSYClean(sy),
          startYear: getSYStartYear(sy),
          isArchive: false,
          papers: []
        };
      }

      const officialStatus = resolvePaperOfficialStatus(sub);
      const groupCode = group.groupId || group.groupCode || group.groupNumber || group.groupName || `Group ${index + 1}`;
      const title = sub.title || sub.researchTitle || group.researchTitle || group.title || 'Untitled Research Study';
      const adviser = group.adviserName || sub.adviserName || usersMap[group.adviserUid]?.name || 'Not Assigned';
      const section = resolveGroupSection(group, sub, usersMap);

      yearsMap[sy].papers.push({
        id: group.id || sub.id || `REC-${index + 1}`,
        groupDocId: group.id,
        subDocId: sub.id,
        title,
        group: groupCode,
        groupName: group.groupName || groupCode,
        adviser,
        section,
        status: officialStatus,
        sub,
        groupData: group
      });
    });

    // 3. Sort chronologically ascending to calculate year-over-year comparison & growth
    const sortedAsc = Object.values(yearsMap).sort((a, b) => a.startYear - b.startYear);
    const activeClean = extractSYClean(activeSY);

    for (let i = 0; i < sortedAsc.length; i++) {
      const current = sortedAsc[i];
      const count = current.papers.length;
      const publishedCount = current.papers.filter(p => p.status === 'Published').length;
      const forCompletionCount = current.papers.filter(p => p.status === 'For Completion').length;
      const inProgressCount = current.papers.filter(p => p.status === 'In Progress').length;

      current.totalCount = count;
      current.publishedCount = publishedCount;
      current.forCompletionCount = forCompletionCount;
      current.inProgressCount = inProgressCount;
      current.pendingReviewCount = inProgressCount + forCompletionCount;
      current.isActive = current.clean === activeClean || current.year === activeFormatted;
      if (current.isActive) {
        current.isArchive = false;
      }

      if (i === 0) {
        current.growth = count > 0 ? 'Baseline' : '—';
        current.growthPercent = null;
        current.growthType = 'neutral';
      } else {
        const priorCount = sortedAsc[i - 1].papers.length;
        if (priorCount === 0 && count > 0) {
          current.growth = '+100%';
          current.growthPercent = 100;
          current.growthType = 'positive';
        } else if (priorCount === 0 && count === 0) {
          current.growth = '0%';
          current.growthPercent = 0;
          current.growthType = 'neutral';
        } else {
          const diff = count - priorCount;
          const pct = Math.round((diff / priorCount) * 100);
          if (pct > 0) {
            current.growth = `+${pct}%`;
            current.growthPercent = pct;
            current.growthType = 'positive';
          } else if (pct < 0) {
            current.growth = `${pct}%`;
            current.growthPercent = pct;
            current.growthType = 'negative';
          } else {
            current.growth = '0%';
            current.growthPercent = 0;
            current.growthType = 'neutral';
          }
        }
      }
    }

    // 5. Return sorted descending by year (newest school years first for the UI)
    return [...sortedAsc].sort((a, b) => b.startYear - a.startYear);
  }, [allGroups, allRawSubmissions, deanSettings, activeSY, usersMap]);

  // Available school years for Category Distribution filter (only available configured/active years)
  const availableCategoryYears = useMemo(() => {
    const yearsSet = new Set();

    // 1. Seed years strictly from Dean Settings (School Year Management)
    if (deanSettings?.schoolYears && Array.isArray(deanSettings.schoolYears)) {
      deanSettings.schoolYears.forEach(sy => {
        const raw = sy?.label || sy?.year || sy?.name || (typeof sy === 'string' ? sy : null);
        if (raw) yearsSet.add(extractSYClean(raw));
      });
    }
    if (deanSettings?.schoolYear) {
      yearsSet.add(extractSYClean(deanSettings.schoolYear));
    }
    if (activeSY) {
      yearsSet.add(extractSYClean(activeSY));
    }

    // 2. Add school years from all department groups
    allGroups.forEach(group => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const sy = resolvePaperSY(group, sub, activeSY);
      if (sy) yearsSet.add(extractSYClean(sy));
    });

    const list = Array.from(yearsSet).filter(Boolean).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    if (list.length === 0) list.push('2026-2027');
    return list;
  }, [deanSettings, activeSY, allGroups, allRawSubmissions]);

  // Keep selectedCategoryYear valid
  useEffect(() => {
    if (availableCategoryYears.length > 0) {
      if (selectedCategoryYear !== 'All Years' && !availableCategoryYears.includes(selectedCategoryYear)) {
        const activeClean = extractSYClean(activeSY);
        if (availableCategoryYears.includes(activeClean)) {
          setSelectedCategoryYear(activeClean);
        } else {
          setSelectedCategoryYear(availableCategoryYears[0]);
        }
      }
    }
  }, [availableCategoryYears, activeSY, selectedCategoryYear]);

  // Dynamic Category Distribution based on adviser-assigned categories and year filter
  const categoryDistributionData = useMemo(() => {
    const counts = {};

    allGroups.forEach(group => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const groupSY = resolvePaperSY(group, sub, activeSY);
      const cleanSY = extractSYClean(groupSY);

      // Filter by selected year if not 'All Years'
      if (selectedCategoryYear && selectedCategoryYear !== 'All Years') {
        if (cleanSY !== selectedCategoryYear && groupSY !== selectedCategoryYear) {
          return;
        }
      }

      const cat = resolveGroupCategory(group, sub, usersMap);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    const CATEGORY_COLORS = {
      'Machine Learning': '#7A1F35',
      'IoT & Embedded': '#1D4ED8',
      'Web Systems': '#15803D',
      'Web Development': '#15803D',
      'Mobile Apps': '#D97706',
      'Data Analytics': '#0F766E',
      'Cybersecurity': '#B91C1C',
      'Security': '#B91C1C',
      'Blockchain': '#6D28D9',
      'Artificial Intelligence': '#7A1F35',
      'Cloud Computing': '#0284C7',
      'Software Engineering': '#059669',
      'Network & Security': '#B91C1C',
    };
    const PALETTE = [
      '#7A1F35', '#1D4ED8', '#15803D', '#D97706', '#0F766E',
      '#B91C1C', '#6D28D9', '#0284C7', '#C026D3', '#EA580C', '#475569'
    ];

    const items = Object.entries(counts)
      .map(([name, count], index) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const color = CATEGORY_COLORS[name] || PALETTE[index % PALETTE.length];
        return {
          name,
          count,
          percentage,
          color
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      items,
      total,
      maxCount: Math.max(...items.map(i => i.count), 1)
    };
  }, [allGroups, allRawSubmissions, usersMap, selectedCategoryYear, activeSY]);

  // Keep adviserTableYear valid
  useEffect(() => {
    if (availableCategoryYears.length > 0) {
      if (adviserTableYear !== 'All' && adviserTableYear !== 'All Years' && !availableCategoryYears.includes(adviserTableYear)) {
        const activeClean = extractSYClean(activeSY);
        if (availableCategoryYears.includes(activeClean)) {
          setAdviserTableYear(activeClean);
        } else {
          setAdviserTableYear(availableCategoryYears[0]);
        }
      }
    }
  }, [availableCategoryYears, activeSY, adviserTableYear]);

  // Dynamic Adviser Group Statistics based on groups and school year
  const adviserStatsList = useMemo(() => {
    const advMap = {};

    const deanUid = deanData?.uid || '';
    const deanEmail = (deanData?.email || '').toLowerCase().trim();
    const deanRawName = deanData?.displayName || (deanData?.firstName ? `${deanData.firstName} ${deanData.lastName || ''}`.trim() : '');
    const deanCleanName = deanRawName.replace(/^(Dr\.|Prof\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').toLowerCase().trim();

    allGroups.forEach(group => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const groupSY = resolvePaperSY(group, sub, activeSY);
      const cleanSY = extractSYClean(groupSY);

      // School Year filter
      if (adviserTableYear && adviserTableYear !== 'All' && adviserTableYear !== 'All Years') {
        if (cleanSY !== adviserTableYear && groupSY !== adviserTableYear) {
          return;
        }
      }

      const advUid = group.adviserUid || sub.adviserUid || '';
      const advName = group.adviserName || sub.adviserName || 'Not Assigned';
      const advEmail = (group.adviserEmail || sub.adviserEmail || '').toLowerCase().trim();

      if (!advUid && advName === 'Not Assigned') return;

      const cleanAdvName = advName.replace(/^(Dr\.|Prof\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').toLowerCase().trim();

      // Check if this adviser is the logged-in Dean (dual role)
      const isDeanMatch = Boolean(
        (advUid && deanUid && advUid === deanUid) ||
        (advEmail && deanEmail && advEmail === deanEmail) ||
        (deanCleanName && cleanAdvName && (cleanAdvName === deanCleanName || cleanAdvName.includes(deanCleanName) || deanCleanName.includes(cleanAdvName)))
      );

      // Group all entries for the same adviser under a single unique key
      const key = isDeanMatch
        ? (deanUid || deanCleanName || 'dean_you')
        : (advUid || cleanAdvName);

      if (!advMap[key]) {
        advMap[key] = {
          uid: key,
          name: isDeanMatch && deanRawName ? deanRawName : advName,
          email: advEmail,
          isYou: isDeanMatch,
          uploads: 0,
          approved: 0,
          published: 0,
          inProgress: 0,
        };
      }

      advMap[key].uploads++;

      const isPublished = sub?.reviewStatus === 'published' || sub?.status === 'published' || group?.isArchived === true;
      const isApprovedOnly = sub?.reviewStatus === 'approved' || sub?.reviewStatus === 'endorsed' || sub?.adviserEndorsed === true;
      const isApproved = isPublished || isApprovedOnly;

      if (isPublished) {
        advMap[key].published++;
      }
      if (isApproved) {
        advMap[key].approved++;
      } else {
        advMap[key].inProgress++;
      }
    });

    const list = Object.values(advMap).map(adv => {
      const isYou = Boolean(adv.isYou);
      const rate = adv.uploads > 0 ? Math.round((adv.approved / adv.uploads) * 100) : 0;
      const shortName = getAdviserShortName(adv.name, isYou);

      return {
        ...adv,
        isYou,
        shortName,
        rate
      };
    });

    // Sort: If isYou, keep at top, then sort by uploads
    list.sort((a, b) => {
      if (a.isYou && !b.isYou) return -1;
      if (!a.isYou && b.isYou) return 1;
      return adviserSortOrder === 'desc' ? b.uploads - a.uploads : a.uploads - b.uploads;
    });

    return list;
  }, [allGroups, allRawSubmissions, adviserTableYear, adviserSortOrder, activeSY, deanData, isDualRole]);

  // Chart data sorted by total uploads descending matching Screenshot 2
  const chartAdviserData = useMemo(() => {
    return [...adviserStatsList].sort((a, b) => b.uploads - a.uploads);
  }, [adviserStatsList]);

  // Dynamic Y-axis ticks and domain for Adviser Performance Overview (default 0, 3, 6, 9)
  const adviserChartTicks = useMemo(() => {
    const maxVal = Math.max(
      ...chartAdviserData.map(d => Math.max(d.approved || 0, d.published || 0, d.inProgress || 0)),
      0
    );
    if (maxVal <= 9) return [0, 3, 6, 9];
    const top = Math.ceil(maxVal / 3) * 3;
    const ticks = [];
    for (let i = 0; i <= top; i += 3) ticks.push(i);
    return ticks;
  }, [chartAdviserData]);

  const adviserChartDomain = useMemo(() => {
    const top = adviserChartTicks[adviserChartTicks.length - 1] || 9;
    return [0, top];
  }, [adviserChartTicks]);

  const isDeanAnAdviser = Boolean(
    isDualRole ||
    adviserStatsList.some(a => a.isYou)
  );

  // Unified searchable pool across department groups and submissions
  const searchableDeanItems = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. All department groups
    allGroups.forEach(group => {
      const sub = findGroupSubmission(group, allRawSubmissions);
      const title = group.researchTitle || group.title || sub.title || sub.researchTitle || 'Untitled Research';
      const groupName = group.groupName || sub.groupName || (group.groupId ? `Group ${group.groupId}` : 'Unassigned Group');
      const section = resolveGroupSection(group, sub, usersMap);
      const category = resolveGroupCategory(group, sub, usersMap);
      const leaderName = group.leaderName || sub.studentName || usersMap[group.leaderUid]?.name || 'Student Leader';
      const adviserName = group.adviserName || sub.adviserName || usersMap[group.adviserUid]?.name || 'Adviser';
      const members = Array.isArray(group.members) ? group.members : [];
      const status = resolvePaperOfficialStatus(sub);

      const key = `${group.id || ''}_${groupName}_${title}`;
      seen.add(key);

      list.push({
        id: group.id || sub.id,
        group,
        sub,
        title,
        groupName,
        section,
        category,
        leaderName,
        adviserName,
        members,
        status,
        department: group.department || deanData?.department || ''
      });
    });

    // 2. Add any submissions not already captured by allGroups
    allRawSubmissions.forEach(sub => {
      const title = sub.title || sub.researchTitle || 'Untitled Research';
      const groupName = sub.groupName || (sub.groupId ? `Group ${sub.groupId}` : 'Unassigned Group');
      const key = `${sub.id || ''}_${groupName}_${title}`;
      if (seen.has(key)) return;
      seen.add(key);

      const section = resolveGroupSection(null, sub, usersMap);
      const category = resolveGroupCategory(null, sub, usersMap);
      const leaderName = sub.studentName || sub.leaderName || usersMap[sub.studentUid]?.name || 'Student Leader';
      const adviserName = sub.adviserName || usersMap[sub.adviserUid]?.name || 'Adviser';
      const status = resolvePaperOfficialStatus(sub);

      list.push({
        id: sub.id,
        group: null,
        sub,
        title,
        groupName,
        section,
        category,
        leaderName,
        adviserName,
        members: sub.members || [],
        status,
        department: sub.department || deanData?.department || ''
      });
    });

    return list;
  }, [allGroups, allRawSubmissions, usersMap, deanData?.department]);

  // Search filter across: Names, Research Title, Group, Categories, Sections
  const dashboardSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);

    return searchableDeanItems.map(item => {
      // 1. Names: leader name, adviser name, group members, student name
      const namesText = [
        item.leaderName,
        item.adviserName,
        ...(item.members || []).map(m => typeof m === 'object' ? (m.name || m.email || '') : String(m)),
        item.sub?.studentName,
        item.sub?.adviserName
      ].filter(Boolean).join(' ').toLowerCase();

      // 2. Research Title
      const titleText = (item.title || '').toLowerCase();

      // 3. Group: group name, code, ID
      const groupText = [item.groupName, item.group?.groupCode, item.group?.groupId].filter(Boolean).join(' ').toLowerCase();

      // 4. Categories: research category, assigned adviser category, tags
      const categoryText = [
        item.category,
        item.group?.researchCategory,
        item.sub?.researchCategory,
        item.group?.category,
        item.sub?.category,
        ...(Array.isArray(item.sub?.tags) ? item.sub.tags : [])
      ].filter(Boolean).join(' ').toLowerCase();

      // 5. Sections: section name, program
      const sectionText = [
        item.section,
        item.group?.program,
        item.sub?.program,
        item.group?.yearAndSection,
        item.group?.studentSection,
        item.sub?.studentSection
      ].filter(Boolean).join(' ').toLowerCase();

      // Must match all entered tokens
      const matchesAllTokens = tokens.every(token =>
        namesText.includes(token) ||
        titleText.includes(token) ||
        groupText.includes(token) ||
        categoryText.includes(token) ||
        sectionText.includes(token)
      );

      if (!matchesAllTokens) return null;

      // Identify matched categories for helpful badges
      const matchedFieldList = [];
      if (tokens.some(t => namesText.includes(t))) matchedFieldList.push('Names');
      if (tokens.some(t => titleText.includes(t))) matchedFieldList.push('Title');
      if (tokens.some(t => groupText.includes(t))) matchedFieldList.push('Group');
      if (tokens.some(t => categoryText.includes(t))) matchedFieldList.push('Category');
      if (tokens.some(t => sectionText.includes(t))) matchedFieldList.push('Section');

      return {
        ...item,
        matchedField: matchedFieldList.join(', ')
      };
    }).filter(Boolean);
  }, [searchableDeanItems, searchQuery]);

  // Current dashboard records (dynamically filtered by active search if present)
  const currentExportRecords = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return dashboardSearchResults;
    }
    return searchableDeanItems;
  }, [searchQuery, dashboardSearchResults, searchableDeanItems]);

  const handleSelectSearchResult = (item) => {
    const rawPaper = item.sub || {};
    const modalPaper = {
      ...rawPaper,
      displayTitle: item.title,
      title: item.title,
      researchTitle: item.title,
      groupName: item.groupName,
      studentName: item.leaderName,
      displayAdviser: item.adviserName,
      adviserName: item.adviserName,
      category: item.category,
      section: item.section,
      group: item.group || {
        groupName: item.groupName,
        leaderName: item.leaderName,
        members: item.members,
        adviserName: item.adviserName,
        category: item.category,
        section: item.section,
        researchTitle: item.title,
        department: item.department
      }
    };
    setSelectedPaperForModal(modalPaper);
  };

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
          <Header
            activePage="dashboard"
            showSearch={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
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

  const sortedTopPapers = [...allPapers]
    .filter(paper => {
      const likesCount = Array.isArray(paper.likes) ? paper.likes.length : (Number(paper.likes) || 0);
      const viewsCount = Number(paper.views) || 0;
      return topPapersSort === 'likes' ? likesCount > 0 : viewsCount > 0;
    })
    .sort((a, b) => {
      const aScore = topPapersSort === 'likes'
        ? (Array.isArray(a.likes) ? a.likes.length : (Number(a.likes) || 0))
        : (Number(a.views) || 0);
      const bScore = topPapersSort === 'likes'
        ? (Array.isArray(b.likes) ? b.likes.length : (Number(b.likes) || 0))
        : (Number(b.views) || 0);
      return bScore - aScore;
    })
    .slice(0, 5);

  const getDeanInfo = () => {
    const rawDeanName = deanData?.displayName || (deanData?.firstName ? `${deanData.firstName} ${deanData.lastName || ''}`.trim() : '') || 'Dean';
    const deanTitle = deanData?.title ? `${deanData.title} ` : '';
    const fullName = `${deanTitle}${rawDeanName}`.trim();
    const department = deanData?.department || 'College of Information Technology';
    const dateFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return { fullName, department, dateFormatted };
  };

  const formatPaperStatus = (status) => {
    if (!status) return 'In Progress';
    const s = String(status).toLowerCase();
    if (s === 'published') return 'Published';
    if (s === 'approved' || s === 'endorsed') return 'Approved';
    if (s === 'revision') return 'For Revision';
    if (s === 'pending') return 'Pending Review';
    return 'In Progress';
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handleExportPDF = (recordsToExport, scopeType = 'papers') => {
    if (!recordsToExport || recordsToExport.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no records matching your current dashboard filter.',
        confirmButtonColor: '#15803d'
      });
      return;
    }

    const { fullName, department, dateFormatted } = getDeanInfo();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Top Brand Accent Header Band
    doc.setFillColor(89, 0, 0); // #590000
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Brand Title & Institution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(89, 0, 0);
    doc.text('ARCHIVIO', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text('RESEARCH REPOSITORY & ARCHIVING SYSTEM', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(41, 37, 36);
    doc.text(department, 14, 23.5);

    // Right-aligned report header metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(89, 0, 0);
    doc.text(scopeType === 'advisers' ? 'ADVISER PERFORMANCE OVERVIEW' : 'DEAN DASHBOARD REPORT', pageWidth - 14, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`Academic Year: ${displaySY}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Date Generated: ${dateFormatted}`, pageWidth - 14, 22.5, { align: 'right' });
    if (searchQuery.trim() && scopeType !== 'advisers') {
      doc.text(`Search Filter: "${searchQuery.trim()}" (${recordsToExport.length} matches)`, pageWidth - 14, 26.5, { align: 'right' });
    }

    // Divider Line
    doc.setDrawColor(231, 224, 216);
    doc.setLineWidth(0.4);
    const dividerY = searchQuery.trim() && scopeType !== 'advisers' ? 29 : 26;
    doc.line(14, dividerY, pageWidth - 14, dividerY);

    const startY = dividerY + 4;

    if (scopeType === 'advisers') {
      // Adviser Performance Table
      const head = [['No.', 'Adviser Name', 'Total Uploads', 'Approved', 'Published', 'In Progress', 'Completion Rate']];
      const body = recordsToExport.map((adv, idx) => [
        String(idx + 1).padStart(2, '0'),
        adv.isYou ? `${adv.name} (YOU)` : adv.name,
        String(adv.uploads || 0),
        String(adv.approved || 0),
        String(adv.published || 0),
        String(adv.inProgress || 0),
        `${adv.rate || 0}%`
      ]);

      autoTable(doc, {
        startY: startY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
          fillColor: [89, 0, 0],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          textColor: [28, 25, 23],
          lineColor: [231, 229, 228],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { cellWidth: 90 },
          2: { halign: 'center', cellWidth: 32 },
          3: { halign: 'center', cellWidth: 32 },
          4: { halign: 'center', cellWidth: 32 },
          5: { halign: 'center', cellWidth: 32 },
          6: { halign: 'center', cellWidth: 36 }
        },
        alternateRowStyles: {
          fillColor: [252, 251, 249]
        },
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Dean Dashboard Report | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(str, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });
    } else {
      // Summary Metrics Banner for Papers
      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 10, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);

      const totalRecs = recordsToExport.length;
      const publishedRecs = recordsToExport.filter(r => (r.status || '').toLowerCase() === 'published').length;
      const approvedRecs = recordsToExport.filter(r => ['approved', 'endorsed'].includes((r.status || '').toLowerCase())).length;
      const inProgressRecs = Math.max(0, totalRecs - publishedRecs - approvedRecs);

      doc.text(
        `Total Submissions: ${totalRecs}   |   Published: ${publishedRecs}   |   Approved: ${approvedRecs}   |   In Progress: ${inProgressRecs}`,
        18,
        startY + 6.5
      );

      const head = [['No.', 'Research Title', 'Group Name', 'Section', 'Adviser', 'Category', 'Status', 'Date']];
      const body = recordsToExport.map((r, idx) => {
        const pDate = parseDate(r.sub?.createdAt || r.group?.createdAt || r.createdAt);
        const dateStr = pDate ? pDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—';
        return [
          String(idx + 1).padStart(2, '0'),
          r.title || 'Untitled Research',
          r.groupName || '—',
          r.section || '—',
          r.adviserName || 'Not Assigned',
          r.category || 'N/A',
          formatPaperStatus(r.status),
          dateStr
        ];
      });

      autoTable(doc, {
        startY: startY + 13,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: {
          fillColor: [89, 0, 0],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          textColor: [28, 25, 23],
          lineColor: [231, 229, 228],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 80 },
          2: { cellWidth: 32 },
          3: { halign: 'center', cellWidth: 24 },
          4: { cellWidth: 42 },
          5: { cellWidth: 36 },
          6: { halign: 'center', cellWidth: 24 },
          7: { halign: 'center', cellWidth: 20 }
        },
        alternateRowStyles: {
          fillColor: [252, 251, 249]
        },
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Dean Dashboard Report | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(str, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });
    }

    // Signature Block on final page
    const finalY = doc.lastAutoTable?.finalY || 150;
    let sigY = finalY + 12;
    if (sigY + 24 > pageHeight - 10) {
      doc.addPage();
      sigY = 25;
    }

    const sigX = pageWidth - 75;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text('Prepared by:', sigX, sigY);

    doc.setDrawColor(28, 25, 23);
    doc.setLineWidth(0.35);
    doc.line(sigX, sigY + 9, sigX + 60, sigY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(fullName, sigX, sigY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    doc.text(`Dean, ${department}`, sigX, sigY + 17);

    const dateSlug = new Date().toISOString().split('T')[0];
    const deptSlug = department.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`Archivio_Dean_Dashboard_Report_${deptSlug}_${dateSlug}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'PDF Export Complete',
      text: `Successfully downloaded PDF report with ${recordsToExport.length} record(s).`,
      timer: 2200,
      showConfirmButton: false
    });
  };

  const handleExportExcel = (recordsToExport, formatType = 'xlsx', scopeType = 'papers') => {
    if (!recordsToExport || recordsToExport.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no records matching your current dashboard filter.',
        confirmButtonColor: '#15803d'
      });
      return;
    }

    const { fullName, department, dateFormatted } = getDeanInfo();
    const dateSlug = new Date().toISOString().split('T')[0];
    const deptSlug = department.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const wb = XLSX.utils.book_new();

    if (scopeType === 'advisers') {
      const advRows = [
        ['ARCHIVIO RESEARCH REPOSITORY & ARCHIVING SYSTEM'],
        ['ADVISER PERFORMANCE OVERVIEW REPORT'],
        ['Department / College:', department],
        ['Academic Year:', adviserTableYear || displaySY],
        ['Date Generated:', dateFormatted],
        ['Prepared By:', `${fullName} (Dean)`],
        ['Total Advisers:', recordsToExport.length],
        [],
        ['No.', 'Adviser Name', 'Uploads Supervised', 'Approved', 'Published', 'In Progress', 'Completion Rate (%)']
      ];

      recordsToExport.forEach((adv, idx) => {
        advRows.push([
          idx + 1,
          adv.isYou ? `${adv.name} (YOU)` : adv.name,
          adv.uploads || 0,
          adv.approved || 0,
          adv.published || 0,
          adv.inProgress || 0,
          `${adv.rate || 0}%`
        ]);
      });

      advRows.push(
        [],
        ['Prepared by:', fullName],
        ['Designation:', `Dean, ${department}`],
        ['Date:', dateFormatted]
      );

      const wsAdv = XLSX.utils.aoa_to_sheet(advRows);
      wsAdv['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 }
      ];

      if (formatType === 'csv') {
        const csvData = XLSX.utils.sheet_to_csv(wsAdv);
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Archivio_Adviser_Performance_${deptSlug}_${dateSlug}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        XLSX.utils.book_append_sheet(wb, wsAdv, 'Adviser Performance');
        XLSX.writeFile(wb, `Archivio_Adviser_Performance_${deptSlug}_${dateSlug}.xlsx`);
      }
    } else {
      // 1. Research Submissions Sheet
      const subRows = [
        ['ARCHIVIO RESEARCH REPOSITORY & ARCHIVING SYSTEM'],
        ['OFFICIAL DEAN DASHBOARD INVENTORY REPORT'],
        ['Department / College:', department],
        ['Academic Year:', displaySY],
        ['Date Generated:', dateFormatted],
        ['Prepared By:', `${fullName} (Dean)`],
        ['Search Filter:', searchQuery.trim() || 'All Dashboard Records'],
        ['Total Records:', recordsToExport.length],
        [],
        ['No.', 'Research Title', 'Group Name', 'Section / Program', 'Adviser', 'Category', 'Status', 'Date Submitted']
      ];

      recordsToExport.forEach((r, idx) => {
        const pDate = parseDate(r.sub?.createdAt || r.group?.createdAt || r.createdAt);
        const dateStr = pDate ? pDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
        subRows.push([
          idx + 1,
          r.title || 'Untitled Research',
          r.groupName || '—',
          r.section || '—',
          r.adviserName || 'Not Assigned',
          r.category || 'N/A',
          formatPaperStatus(r.status),
          dateStr
        ]);
      });

      subRows.push(
        [],
        ['Prepared by:', fullName],
        ['Designation:', `Dean, ${department}`],
        ['Date:', dateFormatted]
      );

      const wsSubs = XLSX.utils.aoa_to_sheet(subRows);
      wsSubs['!cols'] = [
        { wch: 6 },
        { wch: 48 },
        { wch: 22 },
        { wch: 18 },
        { wch: 26 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 }
      ];

      if (formatType === 'csv') {
        const csvData = XLSX.utils.sheet_to_csv(wsSubs);
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Archivio_Dean_Dashboard_Report_${deptSlug}_${dateSlug}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        XLSX.utils.book_append_sheet(wb, wsSubs, 'Research Submissions');

        // Include Adviser Performance sheet in the XLSX workbook as Tab 2
        if (adviserStatsList && adviserStatsList.length > 0) {
          const advRows = [
            ['ADVISER PERFORMANCE OVERVIEW'],
            ['Department:', department],
            ['Academic Year:', adviserTableYear || displaySY],
            ['Total Advisers:', adviserStatsList.length],
            [],
            ['No.', 'Adviser Name', 'Uploads Supervised', 'Approved', 'Published', 'In Progress', 'Completion Rate (%)']
          ];

          adviserStatsList.forEach((adv, idx) => {
            advRows.push([
              idx + 1,
              adv.isYou ? `${adv.name} (YOU)` : adv.name,
              adv.uploads || 0,
              adv.approved || 0,
              adv.published || 0,
              adv.inProgress || 0,
              `${adv.rate || 0}%`
            ]);
          });

          const wsAdv = XLSX.utils.aoa_to_sheet(advRows);
          wsAdv['!cols'] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 18 },
            { wch: 14 },
            { wch: 14 },
            { wch: 14 },
            { wch: 20 }
          ];
          XLSX.utils.book_append_sheet(wb, wsAdv, 'Adviser Overview');
        }

        XLSX.writeFile(wb, `Archivio_Dean_Dashboard_Report_${deptSlug}_${dateSlug}.xlsx`);
      }
    }

    Swal.fire({
      icon: 'success',
      title: `${formatType.toUpperCase()} Export Complete`,
      text: `Successfully downloaded ${formatType.toUpperCase()} spreadsheet with ${recordsToExport.length} record(s).`,
      timer: 2200,
      showConfirmButton: false
    });
  };

  const handleExportPrintable = (recordsToExport, scopeType = 'papers') => {
    if (!recordsToExport || recordsToExport.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no records matching your current dashboard filter.',
        confirmButtonColor: '#15803d'
      });
      return;
    }

    const { fullName, department, dateFormatted } = getDeanInfo();

    const now = new Date();
    const dateTimeFormatted = now.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Pop-up Blocked', 'Please allow pop-ups for this site to generate and print the dashboard report.', 'warning');
      return;
    }

    const totalRecs = recordsToExport.length;
    const publishedRecs = recordsToExport.filter(r => (r.status || '').toLowerCase() === 'published').length;
    const approvedRecs = recordsToExport.filter(r => ['approved', 'endorsed'].includes((r.status || '').toLowerCase())).length;
    const inProgressRecs = Math.max(0, totalRecs - publishedRecs - approvedRecs);

    const rowsHtml = recordsToExport.map((r, index) => {
      const statusLabel = formatPaperStatus(r.status);
      const bg = index % 2 === 0 ? '#ffffff' : '#fcfbf9';
      const statusColor = statusLabel === 'Published' ? '#047857' : statusLabel === 'Approved' ? '#1d4ed8' : '#b45309';
      const pDate = parseDate(r.sub?.createdAt || r.group?.createdAt || r.createdAt);
      const dateStr = pDate ? pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      return `
        <tr style="background-color: ${bg};">
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #78716c;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10.5px; font-weight: 700; color: #1c1917; line-height: 1.3;">${escapeHtml(r.title || 'Untitled Research')}</td>
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #44403c;">${escapeHtml(r.groupName || '—')}</td>
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #590000;">${escapeHtml(r.section || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10px; color: #44403c;">${escapeHtml(r.adviserName || 'Not Assigned')}</td>
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; font-size: 9.5px; text-align: center; color: #44403c; font-weight: 600;">${escapeHtml(r.category || 'N/A')}</td>
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; font-size: 9.5px; text-align: center; font-weight: 700; color: ${statusColor};">${escapeHtml(statusLabel)}</td>
          <td style="padding: 7px 6px; border: 1px solid #e7e5e4; font-size: 9.5px; text-align: center; color: #78716c;">${dateStr}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Archivio - Dean Dashboard Executive Report</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm 10mm 15mm 10mm;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "${dateTimeFormatted}";
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8pt;
              color: #78716c;
            }
            @bottom-center {
              content: "Archivio - Dean Dashboard Executive Summary";
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8pt;
              color: #78716c;
            }
            @bottom-right {
              content: counter(page) "/" counter(pages);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8pt;
              color: #78716c;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1c1917;
            background: #ffffff;
            margin: 0;
            padding: 10px 14px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #590000;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            color: #590000;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 10px;
            font-weight: 600;
            color: #78716c;
            margin: 2px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .dept-title {
            font-size: 13px;
            font-weight: 700;
            color: #292524;
            margin: 4px 0 0 0;
          }
          .report-badge-container {
            text-align: right;
          }
          .report-tag {
            display: inline-block;
            background: #590000;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            padding: 4px 9px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .report-date {
            font-size: 10px;
            color: #78716c;
            margin-top: 4px;
            font-weight: 500;
          }
          .kpi-row {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
          }
          .kpi-card {
            flex: 1;
            background: #faf8f5;
            border: 1px solid #e7e0d8;
            border-radius: 6px;
            padding: 8px 12px;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            color: #78716c;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .kpi-value {
            font-size: 18px;
            font-weight: 800;
            color: #1c1917;
            margin-top: 2px;
          }
          .meta-box {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 20px;
            background: #faf8f5;
            border: 1px solid #e7e0d8;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 10px;
          }
          .meta-item {
            color: #57534e;
          }
          .meta-item strong {
            color: #1c1917;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #590000;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 7px 6px;
            border: 1px solid #590000;
          }
          .signatures-container {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 250px;
            text-align: left;
          }
          .sig-label {
            font-size: 10px;
            font-weight: 600;
            color: #57534e;
            margin-bottom: 38px;
          }
          .sig-line {
            border-bottom: 1.5px solid #1c1917;
            margin-bottom: 5px;
          }
          .sig-name {
            font-size: 12px;
            font-weight: 700;
            color: #1c1917;
            margin: 0;
          }
          .sig-role {
            font-size: 10px;
            font-weight: 600;
            color: #44403c;
            margin: 2px 0 0 0;
          }
          .sig-date {
            font-size: 9.5px;
            color: #78716c;
            margin: 2px 0 0 0;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div>
            <h1 class="brand-title">ARCHIVIO</h1>
            <p class="brand-subtitle">Research Repository & Archiving System</p>
            <p class="dept-title">${escapeHtml(department)}</p>
          </div>
          <div class="report-badge-container">
            <span class="report-tag">Dean Dashboard Report</span>
            <div class="report-date">Date Generated: ${dateFormatted}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Submissions</div>
            <div class="kpi-value">${totalRecs}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Published Papers</div>
            <div class="kpi-value" style="color: #047857;">${publishedRecs}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Approved / Endorsed</div>
            <div class="kpi-value" style="color: #1d4ed8;">${approvedRecs}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">In Progress</div>
            <div class="kpi-value" style="color: #b45309;">${inProgressRecs}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-item"><strong>Academic Year:</strong> ${escapeHtml(displaySY)}</div>
          <div class="meta-item"><strong>Department:</strong> ${escapeHtml(department)}</div>
          <div class="meta-item"><strong>Search Filter:</strong> ${escapeHtml(searchQuery.trim() || 'None (All Records)')}</div>
          <div class="meta-item"><strong>Total Listed:</strong> ${totalRecs}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No.</th>
              <th style="text-align: left;">Research Title</th>
              <th style="text-align: center; width: 85px;">Group</th>
              <th style="text-align: center; width: 65px;">Section</th>
              <th style="text-align: left; width: 110px;">Adviser</th>
              <th style="width: 90px; text-align: center;">Category</th>
              <th style="width: 70px; text-align: center;">Status</th>
              <th style="width: 70px; text-align: center;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures-container">
          <div class="sig-box">
            <div class="sig-label">Prepared by:</div>
            <div class="sig-line"></div>
            <div class="sig-name">${escapeHtml(fullName)}</div>
            <div class="sig-role">Dean, ${escapeHtml(department)}</div>
            <div class="sig-date">Date: ${dateFormatted}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Right Core Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activePage="dashboard"
          showSearch={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={dashboardSearchResults}
          onSelectSearchResult={handleSelectSearchResult}
          searchPlaceholder="Search names, research title, group, categories, sections..."
        />

        {/* Main Workspace Panel */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f0e6] dark:bg-stone-900 transition-colors">

          {/* ================= ACTIVE SEARCH FILTER BANNER ================= */}
          {searchQuery.trim().length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-stone-800 border border-[#770000]/30 dark:border-[#f8d070]/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#770000]/10 dark:bg-[#f8d070]/20 flex items-center justify-center text-[#770000] dark:text-[#f8d070] shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Active Search Filter:</span>
                    <span className="text-[#770000] dark:text-[#f8d070]">"{searchQuery}"</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-mono font-semibold">
                      {dashboardSearchResults.length} match{dashboardSearchResults.length !== 1 ? 'es' : ''}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Searching across student & adviser names, research titles, groups, categories, and sections.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/dean/research-records?q=${encodeURIComponent(searchQuery)}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#770000] dark:text-[#f8d070] hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Open in Research Records</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600 transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

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
                onClick={() => setIsExportModalOpen(true)}
                variant="ghost"
                className="flex items-center gap-2"
                title="Export dashboard data (PDF, Excel, CSV, or Printable Summary Report)"
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

            {/* Department Research Progress Bar Chart */}
            <Card glass={true} className="lg:col-span-2 p-6 flex flex-col justify-between">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                      <span>Department Research Progress</span>
                      {(selectedSectionFilter !== 'All Sections' || selectedAdviserFilter !== 'All Advisers' || groupReqFilter !== 'all') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Filtered ({filteredGroupChartData.length} groups)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Requirement submission and approval status across sections
                    </p>
                  </div>

                  {/* Reset Filters button if any filter applied */}
                  {(selectedSectionFilter !== 'All Sections' || selectedAdviserFilter !== 'All Advisers' || groupReqFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSectionFilter('All Sections');
                        setSelectedAdviserFilter('All Advisers');
                        setGroupReqFilter('all');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors w-fit cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Section Filter Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-stone-400 text-[11px] font-medium flex items-center gap-1">
                        <Filter className="w-3 h-3 text-stone-400" />
                        Section:
                      </span>
                      <select
                        value={selectedSectionFilter}
                        onChange={(e) => setSelectedSectionFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#d4af37] max-w-[150px] truncate cursor-pointer"
                      >
                        {availableSections.map(sec => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>

                    {/* Adviser Filter Dropdown */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-stone-400 text-[11px] font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-400" />
                        Adviser:
                      </span>
                      <select
                        value={selectedAdviserFilter}
                        onChange={(e) => setSelectedAdviserFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#d4af37] max-w-[160px] truncate cursor-pointer"
                      >
                        {availableAdvisers.map(adv => (
                          <option key={adv} value={adv}>{adv}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status Filter Buttons */}
                  <div className="flex flex-wrap bg-stone-100 dark:bg-stone-800/80 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setGroupReqFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${groupReqFilter === 'all'
                          ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-xs'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                    >
                      All Groups ({sectionAdviserFilteredGroups.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupReqFilter('pending')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${groupReqFilter === 'pending'
                          ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-xs'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                    >
                      With Pending ({sectionAdviserFilteredGroups.filter(g => g.pending > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupReqFilter('completed')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${groupReqFilter === 'completed'
                          ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#770000] text-white shadow-xs'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                    >
                      Completed ({sectionAdviserFilteredGroups.filter(g => g.isCompleted).length})
                    </button>
                  </div>
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
                    <span>No research groups match the selected filter criteria</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Yearly Summary: Dynamic Academic Year Row Layout */}
            <Card glass={true} className="p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                    <span>Yearly Summary</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                      Live Data
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">Click a year to view its records</p>
                </div>
              </div>

              {/* Top-aligned scrollable list container */}
              <div className="flex flex-col gap-2.5 flex-1 justify-start overflow-y-auto max-h-[360px] pr-1.5 scrollbar-thin">
                {yearlySummaryList.map((item) => (
                  <div
                    key={item.year}
                    onClick={() => setSelectedYearForModal(item)}
                    className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${item.isActive
                        ? 'border-[#770000]/40 dark:border-[#f8d070]/50 bg-[#770000]/5 dark:bg-[#f8d070]/10 ring-1 ring-[#770000]/30 dark:ring-[#f8d070]/30'
                        : 'border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    title={`Click to view all ${item.totalCount} research records for ${item.year}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.isActive
                            ? 'bg-[#770000] text-white dark:bg-[#f8d070] dark:text-[#590000] shadow-xs'
                            : 'bg-stone-200/80 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
                          }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-xs font-bold truncate group-hover:text-[#770000] dark:group-hover:text-[#f8d070] transition-colors ${item.isActive ? 'text-[#770000] dark:text-[#f8d070]' : 'text-stone-600 dark:text-stone-300'
                              }`}>
                              {item.year}
                            </h4>
                            {item.isArchive && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400 uppercase tracking-wider shrink-0">
                                Archive
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                            {item.totalCount === 1 ? '1 uploaded paper' : `${item.totalCount} uploaded papers`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right">
                          <span className={`font-mono font-bold text-xs ${item.isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'
                            }`}>
                            {item.totalCount}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium"> papers</span>
                        </div>

                        {/* Growth / Comparison Indicator vs prior year */}
                        {item.growthType === 'positive' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{item.growth}</span>
                          </span>
                        ) : item.growthType === 'negative' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>{item.growth}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                            <span>{item.growth}</span>
                          </span>
                        )}

                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                <span>School Years: <strong className="text-stone-700 dark:text-stone-300 font-semibold">{yearlySummaryList.length}</strong></span>
                <span className="text-stone-400 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Database
                </span>
              </div>
            </Card>
          </div>

          {/* ================= CATEGORIES AND LEADERBOARD (ROW 3) ================= */}
          <div className="grid grid-cols-3 gap-6 mb-6">

            {/* Top Research Categories / Category Distribution */}
            <Card glass={true} className="col-span-2 p-6 flex flex-col justify-between">
              {/* Header with Title and Controls */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                    {categoryViewMode === 'donut' ? 'Category Distribution' : 'Top Research Categories'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {categoryViewMode === 'donut' ? 'Proportion by category' : 'Uploads grouped by field of study'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Available Year Filter */}
                  <select
                    value={selectedCategoryYear}
                    onChange={(e) => setSelectedCategoryYear(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#770000] cursor-pointer shadow-2xs"
                    title="Filter categories by available school year"
                  >
                    {availableCategoryYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                    {availableCategoryYears.length > 1 && (
                      <option value="All Years">All Years</option>
                    )}
                  </select>

                  {/* Switch button (matching encircled icon) */}
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode(prev => prev === 'donut' ? 'bar' : 'donut')}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                    title={categoryViewMode === 'donut' ? 'Switch to Stacked Bar View' : 'Switch to Donut View'}
                  >
                    <svg className="w-4 h-4 text-stone-700 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="3" width="12" height="9" rx="2" />
                      <rect x="3" y="12" width="12" height="9" rx="2" />
                      <path d="M6 9V7a2 2 0 0 1 2-2h1" />
                      <path d="M18 15v2a2 2 0 0 1-2 2h-1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chart Content Area */}
              <div className="h-64 relative flex items-center justify-center">
                {categoryDistributionData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-stone-400 py-8">
                    <span className="text-2xl mb-1">🏷️</span>
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">No categories found for {selectedCategoryYear}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Advisers assign research categories to groups during registration.</p>
                  </div>
                ) : categoryViewMode === 'donut' ? (
                  /* Donut Chart View (Screenshot 2) */
                  <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Donut with total count in center */}
                    <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-serif font-extrabold text-stone-900 dark:text-stone-100 leading-none">
                          {categoryDistributionData.total}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                          TOTAL
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDistributionData.items}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={92}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="name"
                            stroke="none"
                          >
                            {categoryDistributionData.items.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CategoryDonutTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 2-Column Legend matching Screenshot 2 */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 pl-2 sm:pl-4 overflow-y-auto max-h-56 pr-2">
                      {categoryDistributionData.items.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center gap-2 text-xs min-w-0"
                          title={`${entry.name}: ${entry.count} (${entry.percentage}%)`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="font-medium text-stone-700 dark:text-stone-300 truncate">
                            {entry.name}
                          </span>
                          <span className="text-stone-400 shrink-0">·</span>
                          <span className="font-bold text-stone-900 dark:text-stone-100 shrink-0">
                            {entry.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Stacked Horizontal Bar Chart View (Screenshot 3) */
                  <div className="w-full h-full overflow-y-auto pr-2 space-y-3.5 flex flex-col justify-center">
                    {categoryDistributionData.items.map((entry) => {
                      const percentageOfMax = Math.round((entry.count / categoryDistributionData.maxCount) * 100);
                      return (
                        <div key={entry.name} className="flex items-center gap-3 sm:gap-4 text-xs">
                          {/* Left: Colored Dot + Category Name */}
                          <div className="w-36 sm:w-44 flex items-center gap-2.5 shrink-0 min-w-0" title={entry.name}>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              {entry.name}
                            </span>
                          </div>

                          {/* Middle: Horizontal Bar Track */}
                          <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(percentageOfMax, 4)}%`,
                                backgroundColor: entry.color
                              }}
                            />
                          </div>

                          {/* Right: Count */}
                          <div className="w-8 text-right font-bold text-stone-900 dark:text-stone-100 shrink-0">
                            {entry.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  <div className="text-center py-8 px-4">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
                      {topPapersSort === 'likes' ? <ThumbsUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {allPapers.length === 0
                        ? 'No published papers yet'
                        : (topPapersSort === 'likes' ? 'No liked research papers yet' : 'No viewed research papers yet')}
                    </p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                      {allPapers.length === 0
                        ? 'Papers will appear once approved and published.'
                        : (topPapersSort === 'likes'
                          ? 'Papers will appear here once they receive endorsement likes.'
                          : 'Papers will appear here once they receive reader views.')}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ================= ADVISER GROUP STATISTICS ================= */}
          <Card glass={true} className="overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-stone-900/50">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  {adviserViewMode === 'graph' ? 'Adviser Performance Overview' : 'Adviser Group Statistics'}
                </h3>
                {adviserViewMode === 'graph' ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                    Stacked: Published · Approved · In Progress
                  </p>
                ) : isDeanAnAdviser ? (
                  <p className="text-xs text-[#b88628] dark:text-[#d4af37] font-medium mt-0.5 flex items-center gap-1">
                    <span>★</span> Your row is highlighted — you are also an Adviser
                  </p>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                    Showing all Research Advisers under your department
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Available School Year Filter */}
                <select
                  value={adviserTableYear}
                  onChange={(e) => setAdviserTableYear(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#770000] cursor-pointer shadow-2xs"
                  title="Filter statistics by school year"
                >
                  {availableCategoryYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                  {availableCategoryYears.length > 1 && (
                    <option value="All Years">All Years</option>
                  )}
                </select>

                {/* Switch button (Table <-> Graph) */}
                <button
                  type="button"
                  onClick={() => setAdviserViewMode(prev => prev === 'table' ? 'graph' : 'table')}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                  title={adviserViewMode === 'table' ? 'Switch to Bar Graph View' : 'Switch to Table View'}
                >
                  <svg className="w-4 h-4 text-stone-700 dark:text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="3" width="12" height="9" rx="2" />
                    <rect x="3" y="12" width="12" height="9" rx="2" />
                    <path d="M6 9V7a2 2 0 0 1 2-2h1" />
                    <path d="M18 15v2a2 2 0 0 1-2 2h-1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content: Switchable between Table (default) and Bar Graph */}
            {adviserViewMode === 'table' ? (
              /* TABLE VIEW (Screenshot 1) */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf7] dark:bg-stone-800/40 text-stone-400 text-[10px] font-bold uppercase tracking-wider border-b border-stone-200/70 dark:border-stone-800">
                      <th className="py-3.5 px-6 text-left">ADVISER</th>
                      <th className="py-3.5 px-4 text-left">UPLOADS</th>
                      <th className="py-3.5 px-4 text-left">APPROVED</th>
                      <th className="py-3.5 px-4 text-left">PUBLISHED</th>
                      <th className="py-3.5 px-4 text-left">IN PROGRESS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium text-stone-700 dark:text-stone-300">
                    {adviserStatsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-stone-400 text-xs">
                          No adviser statistics available for {adviserTableYear}. Wait for students to create submissions.
                        </td>
                      </tr>
                    ) : (
                      adviserStatsList.map((adv) => {
                        const initials = (adv.name || 'Adviser')
                          .replace(/^(Dr\.|Prof\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '')
                          .split(' ')
                          .filter(Boolean)
                          .map(n => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();

                        return (
                          <tr
                            key={adv.uid || adv.name}
                            className={`${adv.isYou
                              ? 'bg-[#fefcf8] dark:bg-amber-950/20 border-l-4 border-[#b88628] hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                              : 'hover:bg-stone-50/70 dark:hover:bg-stone-800/40 border-l-4 border-transparent'
                              } transition-colors`}
                          >
                            {/* ADVISER Column */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                {adv.isYou ? (
                                  <div
                                    className="w-7 h-7 rounded-full bg-[#c08b34] text-white font-bold flex items-center justify-center text-[11px] shrink-0 shadow-2xs"
                                    title="You (Dean & Adviser)"
                                  >
                                    {initials}
                                  </div>
                                ) : (
                                  <div
                                    className="w-7 h-7 rounded-full bg-[#fbf4f6] text-[#7a1f35] border border-rose-200/80 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 font-bold flex items-center justify-center text-[11px] shrink-0"
                                  >
                                    {initials}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => navigate('/dean/research-records', { state: { highlightAdviser: adv.name } })}
                                    className={`text-sm text-left hover:underline transition-colors cursor-pointer ${adv.isYou
                                        ? 'font-bold text-stone-900 dark:text-stone-100 hover:text-[#b88628]'
                                        : 'font-medium text-stone-800 dark:text-stone-200 hover:text-[#590000] dark:hover:text-[#d4af37]'
                                      }`}
                                    title={`Click to view research records and highlight ${adv.name}'s rows`}
                                  >
                                    {adv.name}
                                  </button>
                                  {adv.isYou && (
                                    <span className="text-[10px] bg-[#b88628] text-white px-2 py-0.5 rounded font-extrabold tracking-wider uppercase shrink-0 shadow-2xs">
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* UPLOADS */}
                            <td className="py-3.5 px-4 text-left font-bold text-stone-900 dark:text-stone-100 text-sm">
                              {adv.uploads}
                            </td>

                            {/* APPROVED */}
                            <td className="py-3.5 px-4 text-left">
                              <span className="bg-[#e6f4ea] text-[#137333] dark:bg-emerald-950/40 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded text-xs inline-block min-w-[28px] text-center">
                                {adv.approved}
                              </span>
                            </td>

                            {/* PUBLISHED */}
                            <td className="py-3.5 px-4 text-left">
                              <span className="bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/40 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded text-xs inline-block min-w-[28px] text-center">
                                {adv.published}
                              </span>
                            </td>

                            {/* IN PROGRESS */}
                            <td className="py-3.5 px-4 text-left">
                              <span className="bg-[#fef7e0] text-[#b06000] dark:bg-amber-950/40 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded text-xs inline-block min-w-[28px] text-center">
                                {adv.inProgress}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* BAR GRAPH VIEW (Screenshot 2) */
              <div className="p-6">
                {/* Top Center Legend */}
                <div className="flex items-center justify-center gap-6 mb-4 text-xs font-medium text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8]" />
                    <span>Published</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#15803D]" />
                    <span>Approved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#B45309]" />
                    <span>In Progress</span>
                  </div>
                </div>

                {chartAdviserData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-stone-400 py-12">
                    <Users className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">No adviser activity found for {adviserTableYear}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Adviser statistics will appear when student submissions are linked to advisers.</p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartAdviserData}
                        margin={{ top: 10, right: 30, left: -10, bottom: 10 }}
                        barGap={4}
                      >
                        <CartesianGrid vertical={false} stroke="#f0ede9" strokeDasharray="0" />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#a8a29e' }}
                          allowDecimals={false}
                          ticks={adviserChartTicks}
                          domain={adviserChartDomain}
                        />
                        <XAxis
                          dataKey="shortName"
                          tick={<AdviserCustomTick />}
                          axisLine={{ stroke: '#f0ede9' }}
                          tickLine={false}
                          interval={0}
                        />
                        <Tooltip content={<AdviserBarTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                        <Bar
                          dataKey="approved"
                          name="Approved"
                          fill="#15803D"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="published"
                          name="Published"
                          fill="#1D4ED8"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="inProgress"
                          name="In Progress"
                          fill="#B45309"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
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

      {/* Research Records – Selected Year Modal */}
      {selectedYearForModal && (
        <ResearchRecordsYearModal
          yearData={selectedYearForModal}
          activeSY={displaySY}
          onClose={() => setSelectedYearForModal(null)}
          onViewPaper={(paper) => {
            if (paper?.sub) {
              setSelectedPaperForModal(paper.sub);
            }
          }}
        />
      )}

      {/* Requirement Breakdown Interactive Modal */}
      {selectedRequirementDetail && (
        <RequirementBreakdownModal
          requirement={selectedRequirementDetail}
          activeSY={displaySY}
          onClose={() => setSelectedRequirementDetail(null)}
        />
      )}

      {/* Format Selection Export Modal */}
      {isExportModalOpen && (
        <ExportFormatModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          records={currentExportRecords}
          searchQuery={searchQuery}
          stats={stats}
          adviserStatsList={adviserStatsList}
          groupRequirementsData={groupRequirementsData}
          yearlySummaryList={yearlySummaryList}
          categoryDistributionData={categoryDistributionData}
          topCategories={topCategories}
          sortedTopPapers={sortedTopPapers}
          allPapers={allPapers}
          displaySY={displaySY}
          deanData={deanData}
          getDeanInfo={getDeanInfo}
          allGroups={allGroups}
          allRawSubmissions={allRawSubmissions}
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
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'liked'
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
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'viewed'
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
        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${type === 'like' ? 'bg-[#590000]/10 text-[#590000] dark:bg-[#f8d070]/20 dark:text-[#f8d070]' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
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

function CategoryDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-700 p-3 rounded-xl shadow-xl text-xs font-sans pointer-events-none z-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
          <span className="font-bold text-stone-900 dark:text-stone-100">{data.name}</span>
        </div>
        <p className="text-stone-500 dark:text-stone-400 text-[11px]">
          <strong className="text-stone-800 dark:text-stone-200 font-semibold">{data.count}</strong> paper{data.count !== 1 ? 's' : ''} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

const AdviserCustomTick = ({ x, y, payload }) => {
  const value = String(payload?.value || '');
  const isYou = value.includes('(You)');
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill={isYou ? '#B68428' : '#78716c'}
        fontWeight={isYou ? '700' : '500'}
        fontSize={11}
      >
        {value}
      </text>
    </g>
  );
};

function AdviserBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-700 p-3 rounded-xl shadow-xl text-xs font-sans pointer-events-none z-50 min-w-[140px]">
        <p className="font-bold text-stone-900 dark:text-stone-100 mb-2 border-b border-stone-100 dark:border-stone-800 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-stone-600 dark:text-stone-400 capitalize">{entry.name}:</span>
            </div>
            <span className="font-bold text-stone-900 dark:text-stone-100">{entry.value}</span>
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
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">{data.groupName}</p>
            {data.section && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                {data.section}
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5" title={data.researchTitle}>
            "{data.researchTitle}"
          </p>
          <p className="text-[10px] text-stone-400 font-medium mt-1.5 flex items-center gap-1">
            <span>Adviser:</span>
            <span className="text-stone-700 dark:text-stone-300 font-semibold truncate">{data.adviserName}</span>
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

function RequirementBreakdownModal({ requirement, activeSY, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Completed' | 'Pending'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!requirement) return null;

  const sections = ['All', ...Array.from(new Set(requirement.groups.map(g => g.section).filter(Boolean))).sort()];

  const filteredGroups = requirement.groups.filter(g => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = g.groupName?.toLowerCase().includes(q);
      const matchTitle = g.researchTitle?.toLowerCase().includes(q);
      const matchAdviser = g.adviserName?.toLowerCase().includes(q);
      const matchSection = g.section?.toLowerCase().includes(q);
      const matchStatus = g.formattedStatus?.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchAdviser && !matchSection && !matchStatus) return false;
    }
    if (filterSection !== 'All' && g.section !== filterSection) return false;
    if (filterStatus === 'Completed' && !g.isPassed) return false;
    if (filterStatus === 'Pending' && g.isPassed) return false;
    return true;
  });

  const completedInReq = requirement.groups.filter(g => g.isPassed).length;
  const pendingInReq = requirement.groups.length - completedInReq;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${requirement.badgeColor}`}>
              {requirement.stepNumber}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {requirement.title}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {activeSY}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {requirement.percentage}% Complete
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {requirement.subtitle} • <strong className="text-stone-800 dark:text-stone-200 font-semibold">{requirement.count} of {requirement.total}</strong> active groups cleared
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Search and Filters Bar */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search group code (e.g. SWU 008), title, or adviser..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#d4af37]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Section Filter Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400 text-[11px] font-medium flex items-center gap-1">
                <Filter className="w-3 h-3 text-stone-400" />
                Section:
              </span>
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#d4af37] max-w-[150px] truncate cursor-pointer"
              >
                {sections.map(sec => (
                  <option key={sec} value={sec}>{sec === 'All' ? 'All Sections' : sec}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Pill Buttons */}
            <div className="flex bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5 border border-stone-200 dark:border-stone-700 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus('All')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${filterStatus === 'All'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
              >
                All ({requirement.groups.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Completed')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${filterStatus === 'Completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
              >
                Completed ({completedInReq})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Pending')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${filterStatus === 'Pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
              >
                Pending ({pendingInReq})
              </button>
            </div>
          </div>
        </div>

        {/* Modal Group List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5 custom-scrollbar max-h-[58vh]">
          {filteredGroups.length === 0 ? (
            <div className="py-14 text-center text-stone-400 text-xs">
              <FolderKanban className="w-10 h-10 mx-auto mb-2.5 opacity-30 text-stone-400" />
              <p className="font-semibold text-stone-600 dark:text-stone-300 text-sm">No research groups found</p>
              <p className="mt-1 text-stone-400 text-[11px]">Try adjusting your search query, section filter, or status filter.</p>
            </div>
          ) : (
            filteredGroups.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-3.5 rounded-xl border transition-all ${item.isPassed
                    ? 'border-emerald-200/90 dark:border-emerald-900/50 bg-emerald-50/25 dark:bg-emerald-950/15'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850'
                  } hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100 font-mono tracking-tight">
                      {item.groupName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {item.section}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      • Adviser: <strong className="text-stone-700 dark:text-stone-300 font-semibold">{item.adviserName}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-1" title={item.researchTitle}>
                    {item.researchTitle}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 dark:border-stone-800">
                  {item.isPassed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{item.formattedStatus}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{item.formattedStatus}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-stone-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>{item.lastActionDate}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-center justify-between text-xs text-stone-500">
          <span>
            Displaying <strong>{filteredGroups.length}</strong> of <strong>{requirement.groups.length}</strong> active groups
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchRecordsYearModal({ yearData, activeSY, onClose, onViewPaper }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Published' | 'For Completion' | 'In Progress'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!yearData) return null;

  const papers = Array.isArray(yearData.papers) ? yearData.papers : [];

  const filteredPapers = papers.filter(p => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchGroup = (p.group || p.groupName)?.toLowerCase().includes(q);
      const matchAdviser = p.adviser?.toLowerCase().includes(q);
      const matchSection = p.section?.toLowerCase().includes(q);
      const matchStatus = p.status?.toLowerCase().includes(q);
      if (!matchTitle && !matchGroup && !matchAdviser && !matchSection && !matchStatus) return false;
    }
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const totalCount = yearData.totalCount ?? papers.length;
  const publishedCount = yearData.publishedCount ?? papers.filter(p => p.status === 'Published').length;
  const forCompletionCount = yearData.forCompletionCount ?? papers.filter(p => p.status === 'For Completion').length;
  const inProgressCount = yearData.inProgressCount ?? papers.filter(p => p.status === 'In Progress').length;
  const pendingTotal = inProgressCount + forCompletionCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 bg-stone-50/70 dark:bg-stone-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#770000]/10 dark:bg-[#f8d070]/20 flex items-center justify-center shrink-0 text-[#770000] dark:text-[#f8d070]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  Research Records – {yearData.year}
                </h3>
                {yearData.isActive && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 uppercase tracking-wider">
                    Active S.Y.
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Live database research papers registered for academic year {yearData.year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Metric Cards: TOTAL, PUBLISHED, IN PROGRESS / PENDING */}
        <div className="p-4 sm:p-5 bg-[#faf8f5] dark:bg-stone-900/40 border-b border-stone-200 dark:border-stone-800">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* TOTAL */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Total Papers
                </span>
                <span className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {totalCount}
                </span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">All registered for {yearData.year}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-700/60 flex items-center justify-center text-stone-600 dark:text-stone-300">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* PUBLISHED */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Published
                </span>
                <span className="text-2xl font-serif font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 block">
                  {publishedCount}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Live in institutional archive</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* IN PROGRESS / PENDING */}
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  In Progress / Pending
                </span>
                <span className="text-2xl font-serif font-bold text-amber-800 dark:text-amber-200 mt-0.5 block">
                  {pendingTotal}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  {inProgressCount} in progress • {forCompletionCount} for completion
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3.5 px-4 sm:px-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search title, group, adviser..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'All', label: `All (${papers.length})` },
              { id: 'Published', label: `Published (${publishedCount})` },
              { id: 'For Completion', label: `For Completion (${forCompletionCount})` },
              { id: 'In Progress', label: `In Progress (${inProgressCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${statusFilter === tab.id
                    ? 'bg-[#770000] text-white dark:bg-[#f8d070] dark:text-[#590000]'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Live Research Papers */}
        <div className="flex-1 overflow-y-auto">
          {filteredPapers.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs">
              <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30 text-stone-400" />
              <p className="font-semibold text-stone-700 dark:text-stone-300">No research records found</p>
              <p className="text-[11px] text-stone-400 mt-1">Try clearing your search query or switching status filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '46%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#590000] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                  <th className="py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-3 text-left">Title</th>
                  <th className="py-2.5 px-3 text-center">Group</th>
                  <th className="py-2.5 px-3 text-left">Adviser</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70 text-xs">
                {filteredPapers.map((paper, idx) => (
                  <tr
                    key={paper.id || idx}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                  >
                    {/* # (Index) */}
                    <td className="py-3 px-3 text-center text-stone-400 font-mono text-[11px] align-middle">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* TITLE (Clamped to max 2 lines with ellipsis, hover tooltip for full title) */}
                    <td className="py-3 px-3 text-left align-middle">
                      <div
                        className="font-bold text-stone-900 dark:text-stone-100 text-xs leading-snug cursor-default"
                        title={paper.title}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {paper.title}
                      </div>
                      {paper.section && (
                        <span className="text-[10px] text-stone-400 mt-0.5 block truncate">
                          Section: {paper.section}
                        </span>
                      )}
                    </td>

                    {/* GROUP (Group ID/Code, e.g. SWU 008) */}
                    <td className="py-3 px-3 text-center align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700/80 truncate max-w-full" title={paper.group || paper.groupName}>
                        {paper.group || paper.groupName}
                      </span>
                    </td>

                    {/* ADVISER (Assigned Adviser name) */}
                    <td className="py-3 px-3 text-left text-stone-700 dark:text-stone-300 align-middle">
                      <div className="flex items-center gap-1.5 min-w-0" title={paper.adviser}>
                        <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[9px] font-bold shrink-0 text-stone-600 dark:text-stone-300">
                          {(paper.adviser || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate text-xs font-medium">
                          {paper.adviser}
                        </span>
                      </div>
                    </td>

                    {/* STATUS (Official Dean Portal statuses: "In Progress", "For Completion", "Published") */}
                    <td className="py-3 px-3 text-center align-middle">
                      {paper.status === 'Published' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/60 dark:text-emerald-400">
                          <span className="shrink-0">✓</span>
                          <span>Published</span>
                        </span>
                      ) : paper.status === 'For Completion' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/60 dark:text-blue-400">
                          <span className="shrink-0">✦</span>
                          <span>For Completion</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/60 dark:text-amber-400">
                          <span className="shrink-0">•</span>
                          <span>In Progress</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 px-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex items-center justify-between text-xs text-stone-500">
          <span>
            Displaying <strong>{filteredPapers.length}</strong> of <strong>{papers.length}</strong> recorded papers
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= EXPORT FORMAT MODAL COMPONENT =================

function ExportFormatModal({
  isOpen,
  onClose,
  records = [],
  searchQuery = '',
  stats = {},
  adviserStatsList = [],
  groupRequirementsData = [],
  yearlySummaryList = [],
  categoryDistributionData = {},
  topCategories = [],
  sortedTopPapers = [],
  allPapers = [],
  displaySY = '',
  deanData = {},
  getDeanInfo = () => ({}),
  allGroups = [],
  allRawSubmissions = [],
  usersMap = {}
}) {
  const [selectedDataset, setSelectedDataset] = useState('progress');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);

  // Fallback helpers to guarantee 100% accurate Section and Category
  const getPaperSection = (p) => {
    if (p?.section && p.section !== '—' && p.section !== 'Unassigned Section' && p.section !== 'N/A') {
      return p.section;
    }
    const matchedGroup = (allGroups || []).find(g =>
      (g.id && (g.id === p?.id || g.id === p?.groupId)) ||
      (g.groupName && p?.groupName && g.groupName.trim().toLowerCase() === p.groupName.trim().toLowerCase()) ||
      (g.researchTitle && (p?.title || p?.researchTitle) && g.researchTitle.trim().toLowerCase() === (p.title || p.researchTitle).trim().toLowerCase()) ||
      (g.leaderUid && p?.studentUid && g.leaderUid === p.studentUid)
    );
    const sec = resolveGroupSection(matchedGroup, p, usersMap);
    if (sec && sec !== 'Unassigned Section' && sec !== '—' && sec !== 'N/A') return sec;
    return matchedGroup?.section || matchedGroup?.studentSection || matchedGroup?.program || p?.section || deanData?.department || 'IT';
  };

  const getPaperCategory = (p) => {
    if (p?.category && p.category !== 'N/A' && p.category !== 'Uncategorized') {
      return p.category;
    }
    const matchedGroup = (allGroups || []).find(g =>
      (g.id && (g.id === p?.id || g.id === p?.groupId)) ||
      (g.groupName && p?.groupName && g.groupName.trim().toLowerCase() === p.groupName.trim().toLowerCase()) ||
      (g.researchTitle && (p?.title || p?.researchTitle) && g.researchTitle.trim().toLowerCase() === (p.title || p.researchTitle).trim().toLowerCase()) ||
      (g.leaderUid && p?.studentUid && g.leaderUid === p.studentUid)
    );
    const cat = resolveGroupCategory(matchedGroup, p, usersMap);
    if (cat && cat !== 'Uncategorized' && cat !== 'N/A') return cat;
    return matchedGroup?.category || p?.category || 'General Research';
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const DATASET_OPTIONS = [
    {
      id: 'progress',
      label: 'Department Research Progress',
      shortLabel: 'Research Progress',
      description: 'Requirement clearance, document approvals, and completion rates for all active departmental research groups.',
      columns: 'Group Name • Research Title • Section • Adviser • Approved Req. • Pending Req. • Completion % • Status',
      icon: FolderKanban,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50'
    },
    {
      id: 'yearly',
      label: 'Yearly Summary',
      shortLabel: 'Yearly Summary',
      description: 'Multi-year research volume trends, total submissions, published studies, and year-over-year percentage growth comparisons.',
      columns: 'Academic Year • Total Submissions • Published Studies • In Progress • YoY Growth • Status',
      icon: Calendar,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
    },
    {
      id: 'category',
      label: 'Category Distribution / Top Research Categories',
      shortLabel: 'Category Distribution',
      description: 'Distribution and volume of research studies classified across institutional specializations and research topics.',
      columns: 'Research Category • Total Studies • Distribution Share (%) • Category Rank',
      icon: Tag,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
    },
    {
      id: 'top_papers',
      label: 'Top Research Papers',
      shortLabel: 'Top Research Papers',
      description: 'Highest-ranked departmental research publications based on student readership, views, and peer engagement.',
      columns: 'Rank • Research Title • Group Name • Section • Adviser • Category • Views • Likes',
      icon: BookOpen,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50'
    },
    {
      id: 'advisers',
      label: 'Adviser Group Statistics / Adviser Performance Overview',
      shortLabel: 'Adviser Performance Overview',
      description: 'Faculty supervision statistics, group mentorship counts, submission approvals, and student completion metrics.',
      columns: 'Adviser Name • Groups Supervised • Approved Studies • Published Studies • In Progress',
      icon: UserCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50'
    }
  ];

  const FORMAT_OPTIONS = [
    {
      id: 'pdf',
      label: 'PDF Document (.pdf)',
      extension: '.pdf',
      description: 'Official formatted PDF report with institutional branding, summary statistics, and Dean signature block.',
      icon: FileText
    },
    {
      id: 'xlsx',
      label: 'Excel Spreadsheet (.xlsx)',
      extension: '.xlsx',
      description: 'Formatted Microsoft Excel workbook with data tables, auto-sized columns, and summary metrics.',
      icon: FileSpreadsheet
    },
    {
      id: 'csv',
      label: 'CSV Comma-Separated (.csv)',
      extension: '.csv',
      description: 'Universal comma-separated text file with UTF-8 BOM encoding for external systems.',
      icon: Table
    },
    {
      id: 'summary',
      label: 'Printable Summary Report',
      extension: 'Print / HTML',
      description: 'Executive print-optimized layout with KPI cards, data tables, and formal signature line.',
      icon: Printer
    }
  ];

  const currentDatasetOption = DATASET_OPTIONS.find(d => d.id === selectedDataset) || DATASET_OPTIONS[0];
  const currentFormatOption = FORMAT_OPTIONS.find(f => f.id === selectedFormat) || FORMAT_OPTIONS[0];
  const DatasetIcon = currentDatasetOption.icon;

  // Active dataset items calculation
  const activeData = useMemo(() => {
    switch (selectedDataset) {
      case 'progress': {
        const items = groupRequirementsData || [];
        return { items, unit: 'groups', count: items.length };
      }
      case 'yearly': {
        const items = yearlySummaryList || [];
        return { items, unit: 'school years', count: items.length };
      }
      case 'category': {
        const cats = (categoryDistributionData?.items && categoryDistributionData.items.length > 0)
          ? categoryDistributionData.items
          : (topCategories || []);
        return { items: cats, unit: 'categories', count: cats.length };
      }
      case 'top_papers': {
        const papers = (allPapers && allPapers.length > 0)
          ? [...allPapers]
            .filter(p => (Number(p.views) || 0) > 0 || (Array.isArray(p.likes) ? p.likes.length : (Number(p.likes) || 0)) > 0)
            .sort((a, b) => {
              const aEng = (a.views || 0) + (Array.isArray(a.likes) ? a.likes.length : (a.likes || 0));
              const bEng = (b.views || 0) + (Array.isArray(b.likes) ? b.likes.length : (b.likes || 0));
              if (bEng !== aEng) return bEng - aEng;
              return (b.views || 0) - (a.views || 0);
            })
          : (sortedTopPapers || []);
        return { items: papers, unit: 'research papers', count: papers.length };
      }
      case 'advisers': {
        const items = adviserStatsList || [];
        return { items, unit: 'advisers', count: items.length };
      }
      default:
        return { items: [], unit: 'records', count: 0 };
    }
  }, [selectedDataset, groupRequirementsData, yearlySummaryList, categoryDistributionData, topCategories, sortedTopPapers, allPapers, adviserStatsList]);

  // Escape HTML helper for printable summary
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // PDF Export Engine
  const generatePDFExport = () => {
    const { fullName, department, dateFormatted } = getDeanInfo();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const dateSlug = new Date().toISOString().split('T')[0];
    const deptSlug = (department || 'dean_report').toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Top Brand Accent Header Band (#590000)
    doc.setFillColor(89, 0, 0);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Brand Title & Institution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(89, 0, 0);
    doc.text('ARCHIVIO', 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text('RESEARCH REPOSITORY & ARCHIVING SYSTEM', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(41, 37, 36);
    doc.text(department, 14, 23.5);

    // Right-aligned report header metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(89, 0, 0);

    let reportTitle = '';
    let filenameSuffix = '';
    if (selectedDataset === 'progress') {
      reportTitle = 'DEPARTMENT RESEARCH PROGRESS REPORT';
      filenameSuffix = 'Department_Research_Progress';
    } else if (selectedDataset === 'yearly') {
      reportTitle = 'YEARLY RESEARCH SUMMARY REPORT';
      filenameSuffix = 'Yearly_Research_Summary';
    } else if (selectedDataset === 'category') {
      reportTitle = 'RESEARCH CATEGORY DISTRIBUTION REPORT';
      filenameSuffix = 'Category_Distribution';
    } else if (selectedDataset === 'top_papers') {
      reportTitle = 'TOP RESEARCH PAPERS REPORT';
      filenameSuffix = 'Top_Research_Papers';
    } else {
      reportTitle = 'ADVISER PERFORMANCE OVERVIEW REPORT';
      filenameSuffix = 'Adviser_Performance_Overview';
    }

    doc.text(reportTitle, pageWidth - 14, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`Academic Year: ${displaySY}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Date Generated: ${dateFormatted}`, pageWidth - 14, 22.5, { align: 'right' });

    // Divider Line
    doc.setDrawColor(231, 224, 216);
    doc.setLineWidth(0.4);
    doc.line(14, 26, pageWidth - 14, 26);

    const startY = 30;

    // Render Table based on selected dataset
    if (selectedDataset === 'progress') {
      const list = groupRequirementsData || [];
      const totalGroups = list.length;
      const completedGroups = list.filter(g => g.isCompleted).length;
      const inProgressGroups = totalGroups - completedGroups;
      const avgRate = totalGroups > 0 ? Math.round(list.reduce((acc, g) => acc + (g.completionRate || 0), 0) / totalGroups) : 0;

      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);
      doc.text(
        `Total Research Groups: ${totalGroups}   |   Completed Reqs: ${completedGroups}   |   In Progress: ${inProgressGroups}   |   Average Completion: ${avgRate}%`,
        18,
        startY + 6
      );

      const head = [['No.', 'Group Name', 'Research Title', 'Section', 'Adviser', 'Approved', 'Pending', 'Completion', 'Status']];
      const body = list.map((g, idx) => [
        String(idx + 1).padStart(2, '0'),
        g.groupName || `Group ${idx + 1}`,
        g.researchTitle || 'Untitled Research',
        g.section || '—',
        g.adviserName || 'Not Assigned',
        `${g.approved || 0}/${g.total || 0}`,
        String(g.pending || 0),
        `${g.completionRate || 0}%`,
        g.isCompleted ? 'Completed' : 'In Progress'
      ]);

      autoTable(doc, {
        startY: startY + 12,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [89, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [28, 25, 23], lineColor: [231, 229, 228], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 35 },
          2: { cellWidth: 80 },
          3: { halign: 'center', cellWidth: 24 },
          4: { cellWidth: 40 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'center', cellWidth: 22 },
          8: { halign: 'center', cellWidth: 24 }
        },
        alternateRowStyles: { fillColor: [252, 251, 249] },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Department Research Progress | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });

    } else if (selectedDataset === 'yearly') {
      const list = yearlySummaryList || [];
      const sumTotal = list.reduce((acc, y) => acc + (y.totalCount || 0), 0);
      const sumPublished = list.reduce((acc, y) => acc + (y.publishedCount || 0), 0);

      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);
      doc.text(
        `Academic Years Tracked: ${list.length}   |   Lifetime Submissions: ${sumTotal}   |   Total Published Studies: ${sumPublished}`,
        18,
        startY + 6
      );

      const head = [['No.', 'School Year (S.Y.)', 'Total Submissions', 'Published Studies', 'In Progress', 'Pending Review', 'YoY Growth', 'Status']];
      const body = list.map((y, idx) => [
        String(idx + 1).padStart(2, '0'),
        y.year || y.clean || '—',
        String(y.totalCount || 0),
        String(y.publishedCount || 0),
        String(y.inProgressCount || 0),
        String(y.pendingReviewCount || 0),
        y.growth || '—',
        y.isActive ? 'Active S.Y.' : (y.isArchive ? 'Archived' : 'Historical')
      ]);

      autoTable(doc, {
        startY: startY + 12,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [89, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 8, cellPadding: 2.8, textColor: [28, 25, 23], lineColor: [231, 229, 228], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { cellWidth: 50 },
          2: { halign: 'center', cellWidth: 36 },
          3: { halign: 'center', cellWidth: 36 },
          4: { halign: 'center', cellWidth: 34 },
          5: { halign: 'center', cellWidth: 34 },
          6: { halign: 'center', cellWidth: 30 },
          7: { halign: 'center', cellWidth: 34 }
        },
        alternateRowStyles: { fillColor: [252, 251, 249] },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Yearly Research Summary | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });

    } else if (selectedDataset === 'category') {
      const list = (categoryDistributionData?.items && categoryDistributionData.items.length > 0)
        ? categoryDistributionData.items
        : (topCategories || []);
      const sumCount = list.reduce((acc, c) => acc + (c.count || 0), 0);

      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);
      doc.text(
        `Total Research Categories: ${list.length}   |   Total Categorized Studies: ${sumCount}`,
        18,
        startY + 6
      );

      const head = [['Rank', 'Research Category', 'Total Studies', 'Distribution Share (%)', 'Category Classification']];
      const body = list.map((c, idx) => [
        `#${idx + 1}`,
        c.name || 'Uncategorized',
        String(c.count || 0),
        `${c.percentage || 0}%`,
        idx === 0 ? 'Top Leading Focus Area' : idx < 3 ? 'Core Specialization' : 'Active Research Field'
      ]);

      autoTable(doc, {
        startY: startY + 12,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [89, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 8, cellPadding: 2.8, textColor: [28, 25, 23], lineColor: [231, 229, 228], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { cellWidth: 90 },
          2: { halign: 'center', cellWidth: 40 },
          3: { halign: 'center', cellWidth: 50 },
          4: { halign: 'center', cellWidth: 65 }
        },
        alternateRowStyles: { fillColor: [252, 251, 249] },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Category Distribution | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });

    } else if (selectedDataset === 'top_papers') {
      const list = (allPapers && allPapers.length > 0)
        ? [...allPapers]
          .filter(p => (Number(p.views) || 0) > 0 || (Array.isArray(p.likes) ? p.likes.length : (Number(p.likes) || 0)) > 0)
          .sort((a, b) => {
            const aEng = (a.views || 0) + (Array.isArray(a.likes) ? a.likes.length : (a.likes || 0));
            const bEng = (b.views || 0) + (Array.isArray(b.likes) ? b.likes.length : (b.likes || 0));
            if (bEng !== aEng) return bEng - aEng;
            return (b.views || 0) - (a.views || 0);
          })
        : (sortedTopPapers || []);
      const sumViews = list.reduce((acc, p) => acc + (p.views || 0), 0);
      const sumLikes = list.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)), 0);

      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);
      doc.text(
        `Ranked Top Research Studies: ${list.length}   |   Total Reader Views: ${sumViews}   |   Total Endorsement Likes: ${sumLikes}`,
        18,
        startY + 6
      );

      const head = [['Rank', 'Research Title', 'Group Name', 'Section', 'Adviser', 'Category', 'Views', 'Likes']];
      const body = list.map((p, idx) => [
        `#${idx + 1}`,
        p.title || p.researchTitle || 'Untitled Research',
        p.groupName || '—',
        getPaperSection(p),
        p.adviserName || 'Not Assigned',
        getPaperCategory(p),
        String(p.views || 0),
        String(Array.isArray(p.likes) ? p.likes.length : (p.likes || 0))
      ]);

      autoTable(doc, {
        startY: startY + 12,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [89, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [28, 25, 23], lineColor: [231, 229, 228], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { cellWidth: 92 },
          2: { cellWidth: 34 },
          3: { halign: 'center', cellWidth: 24 },
          4: { cellWidth: 44 },
          5: { cellWidth: 36 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 18 }
        },
        alternateRowStyles: { fillColor: [252, 251, 249] },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Top Research Papers | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });

    } else {
      // advisers
      const list = adviserStatsList || [];
      const sumUploads = list.reduce((acc, a) => acc + (a.uploads || 0), 0);
      const sumPublished = list.reduce((acc, a) => acc + (a.published || 0), 0);

      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(87, 83, 78);
      doc.text(
        `Total Advisers: ${list.length}   |   Total Groups Supervised: ${sumUploads}   |   Published Studies: ${sumPublished}`,
        18,
        startY + 6
      );

      const head = [['No.', 'Adviser Name', 'Uploads Supervised', 'Approved', 'Published', 'In Progress']];
      const body = list.map((adv, idx) => [
        String(idx + 1).padStart(2, '0'),
        adv.isYou ? `${adv.name} (YOU)` : adv.name,
        String(adv.uploads || 0),
        String(adv.approved || 0),
        String(adv.published || 0),
        String(adv.inProgress || 0)
      ]);

      autoTable(doc, {
        startY: startY + 12,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [89, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 8, cellPadding: 2.8, textColor: [28, 25, 23], lineColor: [231, 229, 228], lineWidth: 0.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 16 },
          1: { cellWidth: 104 },
          2: { halign: 'center', cellWidth: 38 },
          3: { halign: 'center', cellWidth: 38 },
          4: { halign: 'center', cellWidth: 38 },
          5: { halign: 'center', cellWidth: 38 }
        },
        alternateRowStyles: { fillColor: [252, 251, 249] },
        didDrawPage: () => {
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(`Archivio - Adviser Performance Overview | Generated on ${dateFormatted}`, 14, pageHeight - 6);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        }
      });
    }

    // Signature Block on final page
    const finalY = doc.lastAutoTable?.finalY || 150;
    let sigY = finalY + 12;
    if (sigY + 24 > pageHeight - 10) {
      doc.addPage();
      sigY = 25;
    }

    const sigX = pageWidth - 75;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text('Prepared by:', sigX, sigY);

    doc.setDrawColor(28, 25, 23);
    doc.setLineWidth(0.35);
    doc.line(sigX, sigY + 9, sigX + 60, sigY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(fullName, sigX, sigY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(68, 64, 60);
    doc.text(`Dean, ${department}`, sigX, sigY + 17);

    doc.save(`Archivio_${filenameSuffix}_${deptSlug}_${dateSlug}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'PDF Export Complete',
      text: `Successfully downloaded PDF report with ${activeData.count} ${activeData.unit}.`,
      timer: 2200,
      showConfirmButton: false
    });
  };

  // Spreadsheet (XLSX / CSV) Export Engine
  const generateSpreadsheetExport = (formatType = 'xlsx') => {
    const { fullName, department, dateFormatted } = getDeanInfo();
    const dateSlug = new Date().toISOString().split('T')[0];
    const deptSlug = (department || 'dean_report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const wb = XLSX.utils.book_new();

    let reportTitle = '';
    let sheetName = '';
    let filenameSuffix = '';
    let headers = [];
    let dataRows = [];
    let colWidths = [];

    if (selectedDataset === 'progress') {
      reportTitle = 'DEPARTMENT RESEARCH PROGRESS REPORT';
      sheetName = 'Research Progress';
      filenameSuffix = 'Department_Research_Progress';
      headers = ['No.', 'Group Name', 'Research Title', 'Section', 'Adviser', 'Approved Reqs', 'Pending Reqs', 'Total Reqs', 'Completion Rate (%)', 'Status'];
      colWidths = [{ wch: 6 }, { wch: 22 }, { wch: 45 }, { wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 16 }];
      dataRows = (groupRequirementsData || []).map((g, idx) => [
        idx + 1,
        g.groupName || `Group ${idx + 1}`,
        g.researchTitle || 'Untitled Research',
        g.section || '—',
        g.adviserName || 'Not Assigned',
        g.approved || 0,
        g.pending || 0,
        g.total || 0,
        `${g.completionRate || 0}%`,
        g.isCompleted ? 'Completed' : 'In Progress'
      ]);
    } else if (selectedDataset === 'yearly') {
      reportTitle = 'YEARLY RESEARCH SUMMARY REPORT';
      sheetName = 'Yearly Summary';
      filenameSuffix = 'Yearly_Research_Summary';
      headers = ['No.', 'School Year (S.Y.)', 'Total Submissions', 'Published Studies', 'In Progress', 'Pending Review', 'YoY Growth', 'Status'];
      colWidths = [{ wch: 6 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
      dataRows = (yearlySummaryList || []).map((y, idx) => [
        idx + 1,
        y.year || y.clean || '—',
        y.totalCount || 0,
        y.publishedCount || 0,
        y.inProgressCount || 0,
        y.pendingReviewCount || 0,
        y.growth || '—',
        y.isActive ? 'Active S.Y.' : (y.isArchive ? 'Archived' : 'Historical')
      ]);
    } else if (selectedDataset === 'category') {
      reportTitle = 'RESEARCH CATEGORY DISTRIBUTION REPORT';
      sheetName = 'Category Distribution';
      filenameSuffix = 'Category_Distribution';
      headers = ['Rank', 'Research Category', 'Total Studies', 'Distribution Share (%)', 'Classification'];
      colWidths = [{ wch: 8 }, { wch: 32 }, { wch: 16 }, { wch: 24 }, { wch: 28 }];
      const cats = (categoryDistributionData?.items && categoryDistributionData.items.length > 0)
        ? categoryDistributionData.items
        : (topCategories || []);
      dataRows = cats.map((c, idx) => [
        idx + 1,
        c.name || 'Uncategorized',
        c.count || 0,
        `${c.percentage || 0}%`,
        idx === 0 ? 'Top Leading Category' : (idx < 3 ? 'Core Specialization' : 'Active Field')
      ]);
    } else if (selectedDataset === 'top_papers') {
      reportTitle = 'TOP RESEARCH PAPERS REPORT';
      sheetName = 'Top Research Papers';
      filenameSuffix = 'Top_Research_Papers';
      headers = ['Rank', 'Research Title', 'Group Name', 'Section', 'Adviser', 'Category', 'Views', 'Likes'];
      colWidths = [{ wch: 8 }, { wch: 48 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 12 }];
      const papers = (allPapers && allPapers.length > 0)
        ? [...allPapers]
          .filter(p => (Number(p.views) || 0) > 0 || (Array.isArray(p.likes) ? p.likes.length : (Number(p.likes) || 0)) > 0)
          .sort((a, b) => {
            const aEng = (a.views || 0) + (Array.isArray(a.likes) ? a.likes.length : (a.likes || 0));
            const bEng = (b.views || 0) + (Array.isArray(b.likes) ? b.likes.length : (b.likes || 0));
            if (bEng !== aEng) return bEng - aEng;
            return (b.views || 0) - (a.views || 0);
          })
        : (sortedTopPapers || []);
      dataRows = papers.map((p, idx) => [
        idx + 1,
        p.title || p.researchTitle || 'Untitled Research',
        p.groupName || '—',
        getPaperSection(p),
        p.adviserName || 'Not Assigned',
        getPaperCategory(p),
        p.views || 0,
        Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)
      ]);
    } else {
      reportTitle = 'ADVISER PERFORMANCE OVERVIEW REPORT';
      sheetName = 'Adviser Performance';
      filenameSuffix = 'Adviser_Performance_Overview';
      headers = ['No.', 'Adviser Name', 'Uploads Supervised', 'Approved', 'Published', 'In Progress'];
      colWidths = [{ wch: 6 }, { wch: 34 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      dataRows = (adviserStatsList || []).map((adv, idx) => [
        idx + 1,
        adv.isYou ? `${adv.name} (YOU)` : adv.name,
        adv.uploads || 0,
        adv.approved || 0,
        adv.published || 0,
        adv.inProgress || 0
      ]);
    }

    const sheetRows = [
      ['ARCHIVIO RESEARCH REPOSITORY & ARCHIVING SYSTEM'],
      [reportTitle],
      ['Department / College:', department],
      ['Academic Year:', displaySY],
      ['Date Generated:', dateFormatted],
      ['Prepared By:', `${fullName} (Dean)`],
      ['Total Records:', dataRows.length],
      [],
      headers,
      ...dataRows,
      [],
      ['Prepared by:', fullName],
      ['Designation:', `Dean, ${department}`],
      ['Date:', dateFormatted]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws['!cols'] = colWidths;

    if (formatType === 'csv') {
      const csvData = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Archivio_${filenameSuffix}_${deptSlug}_${dateSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `Archivio_${filenameSuffix}_${deptSlug}_${dateSlug}.xlsx`);
    }

    Swal.fire({
      icon: 'success',
      title: `${formatType.toUpperCase()} Export Complete`,
      text: `Successfully downloaded ${formatType.toUpperCase()} file with ${dataRows.length} record(s).`,
      timer: 2200,
      showConfirmButton: false
    });
  };

  // Printable Summary Report Engine
  const generatePrintableSummary = () => {
    const { fullName, department, dateFormatted } = getDeanInfo();

    const now = new Date();
    const dateTimeFormatted = now.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Pop-up Blocked', 'Please allow pop-ups for this site to generate and print the report.', 'warning');
      return;
    }

    let reportTitle = '';
    let thHeaders = [];
    let trRowsHtml = '';
    let kpiHtml = '';

    if (selectedDataset === 'progress') {
      reportTitle = 'Department Research Progress Report';
      const list = groupRequirementsData || [];
      const total = list.length;
      const completed = list.filter(g => g.isCompleted).length;
      const inProgress = total - completed;
      const avgRate = total > 0 ? Math.round(list.reduce((acc, g) => acc + (g.completionRate || 0), 0) / total) : 0;

      kpiHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 12px; background: #faf8f5; border: 1px solid #e7e5e4; border-radius: 8px;">
            <div style="font-size: 10px; color: #78716c; font-weight: 700; text-transform: uppercase;">Total Groups</div>
            <div style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 2px;">${total}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <div style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase;">Completed All Reqs</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46; margin-top: 2px;">${completed}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <div style="font-size: 10px; color: #b45309; font-weight: 700; text-transform: uppercase;">In Progress</div>
            <div style="font-size: 20px; font-weight: 800; color: #92400e; margin-top: 2px;">${inProgress}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;">
            <div style="font-size: 10px; color: #4338ca; font-weight: 700; text-transform: uppercase;">Average Completion</div>
            <div style="font-size: 20px; font-weight: 800; color: #3730a3; margin-top: 2px;">${avgRate}%</div>
          </div>
        </div>
      `;

      thHeaders = ['No.', 'Group Name', 'Research Title', 'Section', 'Adviser', 'Approved', 'Pending', 'Completion Rate', 'Status'];
      trRowsHtml = list.map((g, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfbf9'};">
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #78716c;">${String(idx + 1).padStart(2, '0')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10.5px; font-weight: 700; color: #1c1917;">${escapeHtml(g.groupName || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10.5px; color: #1c1917;">${escapeHtml(g.researchTitle || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #590000;">${escapeHtml(g.section || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10px; color: #44403c;">${escapeHtml(g.adviserName || 'Not Assigned')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #047857;">${g.approved || 0}/${g.total || 0}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #b45309; font-weight: 700;">${g.pending || 0}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 800; color: #1c1917;">${g.completionRate || 0}%</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 9.5px; font-weight: 700; color: ${g.isCompleted ? '#047857' : '#b45309'};">${g.isCompleted ? 'Completed' : 'In Progress'}</td>
        </tr>
      `).join('');

    } else if (selectedDataset === 'yearly') {
      reportTitle = 'Yearly Research Summary Report';
      const list = yearlySummaryList || [];
      const sumTotal = list.reduce((acc, y) => acc + (y.totalCount || 0), 0);
      const sumPublished = list.reduce((acc, y) => acc + (y.publishedCount || 0), 0);

      kpiHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 12px; background: #faf8f5; border: 1px solid #e7e5e4; border-radius: 8px;">
            <div style="font-size: 10px; color: #78716c; font-weight: 700; text-transform: uppercase;">School Years Tracked</div>
            <div style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 2px;">${list.length}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <div style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase;">Published Studies</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46; margin-top: 2px;">${sumPublished}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;">
            <div style="font-size: 10px; color: #4338ca; font-weight: 700; text-transform: uppercase;">Total Lifetime Submissions</div>
            <div style="font-size: 20px; font-weight: 800; color: #3730a3; margin-top: 2px;">${sumTotal}</div>
          </div>
        </div>
      `;

      thHeaders = ['No.', 'School Year (S.Y.)', 'Total Submissions', 'Published Studies', 'In Progress', 'Pending Review', 'YoY Growth', 'Status'];
      trRowsHtml = list.map((y, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfbf9'};">
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #78716c;">${String(idx + 1).padStart(2, '0')}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; font-size: 11px; font-weight: 700; color: #1c1917;">${escapeHtml(y.year || y.clean || '—')}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #1c1917;">${y.totalCount || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #047857;">${y.publishedCount || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; color: #b45309;">${y.inProgressCount || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; color: #6b7280;">${y.pendingReviewCount || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #15803d;">${escapeHtml(y.growth || '—')}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #44403c;">${y.isActive ? 'Active S.Y.' : (y.isArchive ? 'Archived' : 'Historical')}</td>
        </tr>
      `).join('');

    } else if (selectedDataset === 'category') {
      reportTitle = 'Research Category Distribution Report';
      const list = (categoryDistributionData?.items && categoryDistributionData.items.length > 0)
        ? categoryDistributionData.items
        : (topCategories || []);
      const sumCount = list.reduce((acc, c) => acc + (c.count || 0), 0);

      kpiHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 12px; background: #faf8f5; border: 1px solid #e7e5e4; border-radius: 8px;">
            <div style="font-size: 10px; color: #78716c; font-weight: 700; text-transform: uppercase;">Total Categories</div>
            <div style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 2px;">${list.length}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <div style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase;">Total Categorized Studies</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46; margin-top: 2px;">${sumCount}</div>
          </div>
        </div>
      `;

      thHeaders = ['Rank', 'Research Category', 'Total Studies', 'Distribution Share (%)', 'Classification'];
      trRowsHtml = list.map((c, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfbf9'};">
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #78716c;">#${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; font-size: 11px; font-weight: 700; color: #1c1917;">${escapeHtml(c.name || 'Uncategorized')}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #1c1917;">${c.count || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 800; color: #590000;">${c.percentage || 0}%</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; font-size: 10px; color: #44403c;">${idx === 0 ? 'Top Leading Focus Area' : idx < 3 ? 'Core Specialization' : 'Active Field'}</td>
        </tr>
      `).join('');

    } else if (selectedDataset === 'top_papers') {
      reportTitle = 'Top Research Papers Report';
      const list = (allPapers && allPapers.length > 0)
        ? [...allPapers]
          .filter(p => (Number(p.views) || 0) > 0 || (Array.isArray(p.likes) ? p.likes.length : (Number(p.likes) || 0)) > 0)
          .sort((a, b) => {
            const aEng = (a.views || 0) + (Array.isArray(a.likes) ? a.likes.length : (a.likes || 0));
            const bEng = (b.views || 0) + (Array.isArray(b.likes) ? b.likes.length : (b.likes || 0));
            if (bEng !== aEng) return bEng - aEng;
            return (b.views || 0) - (a.views || 0);
          })
        : (sortedTopPapers || []);
      const sumViews = list.reduce((acc, p) => acc + (p.views || 0), 0);
      const sumLikes = list.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)), 0);

      kpiHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 12px; background: #faf8f5; border: 1px solid #e7e5e4; border-radius: 8px;">
            <div style="font-size: 10px; color: #78716c; font-weight: 700; text-transform: uppercase;">Top Ranked Studies</div>
            <div style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 2px;">${list.length}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <div style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase;">Total Reader Views</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46; margin-top: 2px;">${sumViews}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px;">
            <div style="font-size: 10px; color: #be123c; font-weight: 700; text-transform: uppercase;">Total Endorsements (Likes)</div>
            <div style="font-size: 20px; font-weight: 800; color: #9f1239; margin-top: 2px;">${sumLikes}</div>
          </div>
        </div>
      `;

      thHeaders = ['Rank', 'Research Title', 'Group Name', 'Section', 'Adviser', 'Category', 'Views', 'Likes'];
      trRowsHtml = list.map((p, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfbf9'};">
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #78716c;">#${idx + 1}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10.5px; font-weight: 700; color: #1c1917;">${escapeHtml(p.title || p.researchTitle || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #44403c;">${escapeHtml(p.groupName || '—')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #590000;">${escapeHtml(getPaperSection(p))}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10px; color: #44403c;">${escapeHtml(p.adviserName || 'Not Assigned')}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; font-size: 10px; color: #44403c;">${escapeHtml(getPaperCategory(p))}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #047857;">${p.views || 0}</td>
          <td style="padding: 7px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; font-weight: 700; color: #be123c;">${Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)}</td>
        </tr>
      `).join('');

    } else {
      // advisers
      reportTitle = 'Adviser Performance Overview Report';
      const list = adviserStatsList || [];
      const sumUploads = list.reduce((acc, a) => acc + (a.uploads || 0), 0);
      const sumPublished = list.reduce((acc, a) => acc + (a.published || 0), 0);

      kpiHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 12px; background: #faf8f5; border: 1px solid #e7e5e4; border-radius: 8px;">
            <div style="font-size: 10px; color: #78716c; font-weight: 700; text-transform: uppercase;">Total Advisers</div>
            <div style="font-size: 20px; font-weight: 800; color: #1c1917; margin-top: 2px;">${list.length}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
            <div style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase;">Published Studies</div>
            <div style="font-size: 20px; font-weight: 800; color: #065f46; margin-top: 2px;">${sumPublished}</div>
          </div>
          <div style="flex: 1; padding: 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;">
            <div style="font-size: 10px; color: #4338ca; font-weight: 700; text-transform: uppercase;">Groups Supervised</div>
            <div style="font-size: 20px; font-weight: 800; color: #3730a3; margin-top: 2px;">${sumUploads}</div>
          </div>
        </div>
      `;

      thHeaders = ['No.', 'Adviser Name', 'Uploads Supervised', 'Approved', 'Published', 'In Progress'];
      trRowsHtml = list.map((adv, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fcfbf9'};">
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #78716c;">${String(idx + 1).padStart(2, '0')}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; font-size: 11px; font-weight: 700; color: #1c1917;">${escapeHtml(adv.isYou ? `${adv.name} (YOU)` : adv.name)}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #1c1917;">${adv.uploads || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #047857;">${adv.approved || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; font-weight: 700; color: #065f46;">${adv.published || 0}</td>
          <td style="padding: 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 10.5px; color: #b45309;">${adv.inProgress || 0}</td>
        </tr>
      `).join('');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Archivio - ${escapeHtml(reportTitle)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm 10mm 15mm 10mm;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left {
              content: "${dateTimeFormatted}";
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8.5pt;
              color: #78716c;
            }
            @bottom-center {
              content: "Archivio - ${escapeHtml(reportTitle)}";
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8.5pt;
              color: #78716c;
            }
            @bottom-right {
              content: counter(page) "/" counter(pages);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 8.5pt;
              color: #78716c;
            }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1c1917; margin: 0; padding: 10px 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header-bar { border-top: 4px solid #590000; padding-top: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { font-size: 20px; font-weight: 900; color: #590000; letter-spacing: -0.5px; }
          .sub-brand { font-size: 9px; color: #78716c; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }
          .dept { font-size: 13px; font-weight: 700; color: #292524; margin-top: 4px; }
          .meta-box { text-align: right; }
          .report-name { font-size: 14px; font-weight: 800; color: #590000; text-transform: uppercase; }
          .meta-line { font-size: 10px; color: #78716c; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #590000; color: #ffffff; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; padding: 8px 6px; text-align: left; border: 1px solid #590000; }
          .signature-section { margin-top: 35px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
          .signature-box { width: 220px; text-align: left; }
          .sig-line { border-bottom: 1px solid #292524; margin-top: 30px; margin-bottom: 6px; }
          .sig-name { font-size: 11px; font-weight: 800; color: #1c1917; }
          .sig-title { font-size: 9.5px; color: #57534e; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div>
            <div class="brand">ARCHIVIO</div>
            <div class="sub-brand">Research Repository & Archiving System</div>
            <div class="dept">${escapeHtml(department)}</div>
          </div>
          <div class="meta-box">
            <div class="report-name">${escapeHtml(reportTitle)}</div>
            <div class="meta-line">Academic Year: <strong>${escapeHtml(displaySY)}</strong></div>
            <div class="meta-line">Date Generated: <strong>${escapeHtml(dateFormatted)}</strong></div>
          </div>
        </div>

        ${kpiHtml}

        <table>
          <thead>
            <tr>
              ${thHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${trRowsHtml}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <div style="font-size: 10px; color: #78716c;">Prepared by:</div>
            <div class="sig-line"></div>
            <div class="sig-name">${escapeHtml(fullName)}</div>
            <div class="sig-title">Dean, ${escapeHtml(department)}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      if (activeData.count === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Data to Export',
          text: `There are currently no records available in ${currentDatasetOption.label}.`,
          confirmButtonColor: '#15803d'
        });
        setIsExporting(false);
        return;
      }

      if (selectedFormat === 'pdf') {
        generatePDFExport();
      } else if (selectedFormat === 'xlsx') {
        generateSpreadsheetExport('xlsx');
      } else if (selectedFormat === 'csv') {
        generateSpreadsheetExport('csv');
      } else if (selectedFormat === 'summary') {
        generatePrintableSummary();
      }

      onClose();
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire('Export Error', err.message || 'Failed to export dashboard data.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#590000]/10 dark:bg-[#f8d070]/20 flex items-center justify-center text-[#590000] dark:text-[#f8d070] shrink-0 border border-[#590000]/20">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight">
                Export Dashboard Report
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {deanData?.department || 'College of Information Technology'} • {displaySY}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* 1. SELECT DATA TO EXPORT DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wider">
              1. Select Data to Export
            </label>
            <div className="relative">
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#590000] dark:focus:ring-[#f8d070] cursor-pointer shadow-2xs transition"
              >
                {DATASET_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-1.5">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-stone-500 dark:text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. CHOOSE EXPORT FORMAT DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase tracking-wider">
              2. Choose Export Format
            </label>
            <div className="relative">
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#590000] dark:focus:ring-[#f8d070] cursor-pointer shadow-2xs transition"
              >
                {FORMAT_OPTIONS.map((fmt) => (
                  <option key={fmt.id} value={fmt.id} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-1.5">
                    {fmt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-stone-500 dark:text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Dynamic Scope & Data Preview Card */}
          <div className="p-4 rounded-xl bg-[#faf8f5] dark:bg-stone-800/60 border border-stone-200/90 dark:border-stone-700/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${currentDatasetOption.iconBg}`}>
                  <DatasetIcon className={`w-4 h-4 ${currentDatasetOption.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    {currentDatasetOption.label}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                    {currentDatasetOption.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 shadow-2xs">
                <span className="text-xs font-bold text-[#590000] dark:text-[#f8d070]">
                  {activeData.count}
                </span>
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  {activeData.unit}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200/70 dark:border-stone-700/60 flex items-center justify-between text-[11px] gap-2">
              <div className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5 truncate">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Columns:</span>
                <span className="truncate">{currentDatasetOption.columns}</span>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-200/80 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                {currentFormatOption.extension}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Exporting <strong className="text-stone-800 dark:text-stone-200">{activeData.count}</strong> {activeData.unit}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting || activeData.count === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : selectedFormat === 'summary' ? (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Open Printable Summary</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {selectedFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

