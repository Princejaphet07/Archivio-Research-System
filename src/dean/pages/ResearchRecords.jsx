import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { Download, Search, Eye, Sparkles, FolderArchive, Printer, X, Globe, ExternalLink } from 'lucide-react';

const CATEGORY_COLORS = {
  ML: 'bg-purple-100 text-purple-700',
  IoT: 'bg-teal-100 text-teal-700',
  Security: 'bg-amber-100 text-amber-700',
  Mobile: 'bg-blue-100 text-blue-700',
  Web: 'bg-emerald-100 text-emerald-700',
  Data: 'bg-orange-100 text-orange-700',
};

const RECORDS_PER_PAGE = 10;

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-blue-50 text-blue-700 border border-blue-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const ACTION_STYLES = {
  View: 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700',
  Publish: 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#590000] text-white hover:bg-[#590000] dark:hover:bg-[#b09230]',
  Review: 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#590000] text-white hover:bg-[#590000] dark:hover:bg-[#b09230]',
};

const formatStatus = (status) => {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'in progress':
    case 'pending':
      return 'In Progress';
    case 'dean_revision':
    case 'revision':
      return 'Revision';
    case 'reviewed':
      return 'Under Review';
    case 'approved':
    case 'endorsed':
      return 'Endorsed';
    case 'published':
      return 'Published';
    default:
      return 'In Progress';
  }
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

export default function ResearchRecords() {
  const navigate = useNavigate();
  const location = useLocation();
  const { deanData, deanSettings } = useUser();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('q') || searchParams.get('search') || location.state?.searchQuery || '';
  const [search, setSearch] = useState(initialSearch);
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterSection, setFilterSection] = useState('All Sections');
  const [filterAdviser, setFilterAdviser] = useState('All Advisers');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Highlighted adviser from navigation (e.g. Dashboard)
  const initialAdviser = location.state?.highlightAdviser || 
                         location.state?.selectedAdviser || 
                         searchParams.get('adviser') || 
                         searchParams.get('highlight') || 
                         null;
  const [highlightAdviser, setHighlightAdviser] = useState(initialAdviser);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incAdv = location.state?.highlightAdviser || 
                   location.state?.selectedAdviser || 
                   params.get('adviser') || 
                   params.get('highlight');
    if (incAdv) {
      setHighlightAdviser(incAdv);
    }
    const incSearch = params.get('q') || params.get('search') || location.state?.searchQuery;
    if (incSearch !== null && incSearch !== undefined && incSearch !== '') {
      setSearch(incSearch);
    }
  }, [location.state, location.search]);
  
  const [records, setRecords] = useState([]);
  const [requirements, setRequirements] = useState([]);

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [viewerState, setViewerState] = useState({
    isOpen: false,
    url: '',
    title: ''
  });

  // Unique filter options based on dynamic data
  const [allYears, setAllYears] = useState(['All Years']);
  const [allSections, setAllSections] = useState(['All Sections']);
  const [allAdvisers, setAllAdvisers] = useState(['All Advisers']);
  const [allStatuses, setAllStatuses] = useState(['All Statuses']);
  const [allCategories, setAllCategories] = useState(['All Categories']);

  useEffect(() => {
    if (!deanData) return;
    const deanDept = deanData.department || '';

    // Listen to groups — filter by department (robust partial match)
    const groupsQuery = query(collection(db, 'groups'), where('status', '==', 'approved'));
    const unsubGroups = onSnapshot(groupsQuery, (groupsSnapshot) => {
      const allGroupsData = groupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const deptLower = (deanDept || '').toLowerCase().trim();
      // DEPARTMENT FILTER: flexible match to support new deans on same department
      const groupsData = allGroupsData.filter(g => {
        if (!deptLower) return false;
        const gDept = (g.department || '').toLowerCase().trim();
        const gProg = (g.program || '').toLowerCase().trim();
        return (gDept && (gDept.includes(deptLower) || deptLower.includes(gDept))) ||
               (gProg && (gProg.includes(deptLower) || deptLower.includes(gProg)));
      });
      
      // Listen to submissions
      const unsubSubs = onSnapshot(collection(db, 'submissions'), (subsSnapshot) => {
        const subsData = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Listen to requirements
        const unsubReqs = onSnapshot(collection(db, 'requirements'), (reqsSnapshot) => {
          const allReqs = reqsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const activeReqs = allReqs.filter(r => r.status === 'approved');
          setRequirements(activeReqs);

          // Merge them
          const mergedRecords = groupsData.map((g, index) => {
            const sub = subsData.find(s => s.studentUid === g.leaderUid && (s.groupName === g.groupName || (s.title || s.researchTitle) === g.researchTitle)) || {};
            const status = sub.reviewStatus || 'pending';
            
            // School Year resolution: prefer explicit SY, fallback to submitted date, fallback to active Dean SY
            const rawSY = g.schoolYear || sub.schoolYear || g.academicYear || sub.academicYear;
            let recordSY = '';
            if (rawSY) {
              recordSY = formatSYLabel(rawSY);
            } else {
              const submittedDate = sub.submittedDate || sub.createdAt || g.createdAt || '';
              if (submittedDate) {
                const d = new Date(submittedDate);
                if (!isNaN(d.getTime())) {
                  const startYear = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
                  recordSY = `S.Y. ${startYear}-${startYear + 1}`;
                }
              }
            }
            if (!recordSY) {
              const activeSY = deanSettings?.schoolYears?.find(s => s.status === 'Active')?.label || deanSettings?.schoolYear || '2026-2027';
              recordSY = formatSYLabel(activeSY);
            }

            const category = g.category || sub.category || 'Uncategorized';
            const action = 'View';
            const section = g.section || sub.section || g.studentSection || sub.studentSection || g.yearAndSection || '';

            // Calculate progress based on requirements
            const uploadedCount = (sub.documents || []).length;
            const totalCount = activeReqs.length;
            const progress = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

            return {
              id: g.id || `REC-${index + 1}`,
              groupDocId: g.id,
              subDocId: sub.id,
              title: sub.title || sub.researchTitle || g.researchTitle || 'Untitled Research',
              group: g.groupName || 'Unknown Group',
              section,
              department: g.department || deanDept,
              adviser: g.adviserName || 'Not Assigned',
              year: recordSY,
              schoolYear: recordSY,
              category,
              status,
              progress,
              action,
              manuscriptUrl: sub.manuscriptUrl || null,
              documents: sub.documents || [],
              panelists: g.panelists || [],
              plagiarismScore: sub.plagiarismScore || null,
              grammarScore: sub.grammarScore || null,
              originalSub: sub,
              originalGroup: g,
              applicableReqs: activeReqs.filter(r => 
                r.scope === 'global' || 
                (r.scope === 'adviser' && r.adviserUid === g.adviserUid)
              )
            };
          });

          setRecords(mergedRecords);

          const sections = [...new Set(mergedRecords.map(r => r.section).filter(Boolean))].sort();
          setAllSections(['All Sections', ...sections]);
          
          const advisers = [...new Set(mergedRecords.map(r => r.adviser))].filter(Boolean).sort();
          setAllAdvisers(['All Advisers', ...advisers]);
          
          const STATUS_ORDER = ['In Progress', 'Under Review', 'Endorsed', 'Revision', 'Published'];
          const presentStatuses = new Set(mergedRecords.map(r => formatStatus(r.status)).filter(Boolean));
          const availableStatuses = STATUS_ORDER.filter(st => presentStatuses.has(st));
          const otherStatuses = [...presentStatuses].filter(st => !STATUS_ORDER.includes(st)).sort();
          setAllStatuses(['All Statuses', ...availableStatuses, ...otherStatuses]);

          const categories = [...new Set(mergedRecords.map(r => r.category))].filter(Boolean).sort();
          setAllCategories(['All Categories', ...categories]);

          setLoading(false);
        }, (err) => {
          console.warn('Requirements listener notice:', err.message);
          setLoading(false);
        });
        
        return () => unsubReqs();
      }, (err) => {
        console.warn('Submissions listener notice:', err.message);
      });

      return () => unsubSubs();
    }, (err) => {
      console.warn('Groups listener notice:', err.message);
      setLoading(false);
    });

    return () => unsubGroups();
  }, [deanData, deanSettings]);

  // Dynamically compute school years from Dean Settings + database records
  useEffect(() => {
    const yearsSet = new Set();

    // 1. Configured school years from Dean Settings (dynamically updates when Dean adds/modifies in Settings)
    if (deanSettings?.schoolYears && Array.isArray(deanSettings.schoolYears)) {
      deanSettings.schoolYears.forEach((sy) => {
        if (sy?.label) {
          yearsSet.add(formatSYLabel(sy.label));
        }
      });
    }
    if (deanSettings?.schoolYear) {
      yearsSet.add(formatSYLabel(deanSettings.schoolYear));
    }

    // 2. Add school years from records
    records.forEach((r) => {
      if (r.schoolYear) yearsSet.add(formatSYLabel(r.schoolYear));
      else if (r.year) yearsSet.add(formatSYLabel(r.year));
    });

    // 3. Fallback default if nothing configured yet
    if (yearsSet.size === 0) {
      yearsSet.add('S.Y. 2026-2027');
    }

    // Sort descending by start year
    const sortedYears = Array.from(yearsSet).sort((a, b) => {
      const cleanA = extractSYClean(a);
      const cleanB = extractSYClean(b);
      return cleanB.localeCompare(cleanA, undefined, { numeric: true });
    });

    setAllYears(['All Years', ...sortedYears]);
  }, [deanSettings?.schoolYears, deanSettings?.schoolYear, records]);

  // ---- Filter logic ----
  const filtered = records.filter((r) => {
    const sTerm = search.toLowerCase().trim();
    const matchSearch =
      sTerm === '' ||
      r.title.toLowerCase().includes(sTerm) ||
      r.group.toLowerCase().includes(sTerm) ||
      r.adviser.toLowerCase().includes(sTerm) ||
      (r.category && r.category.toLowerCase().includes(sTerm)) ||
      (r.section && r.section.toLowerCase().includes(sTerm));

    const matchYear =
      filterYear === 'All Years' ||
      filterYear === 'All School Years' ||
      extractSYClean(r.schoolYear) === extractSYClean(filterYear) ||
      extractSYClean(r.year) === extractSYClean(filterYear) ||
      r.schoolYear === filterYear ||
      r.year === filterYear ||
      formatSYLabel(r.schoolYear) === filterYear ||
      formatSYLabel(r.year) === filterYear;

    const matchSection = filterSection === 'All Sections' || r.section === filterSection;
    const matchAdviser = filterAdviser === 'All Advisers' || r.adviser === filterAdviser;
    const matchStatus = filterStatus === 'All Statuses' || formatStatus(r.status) === filterStatus;
    const matchCategory = filterCategory === 'All Categories' || r.category === filterCategory;
    return matchSearch && matchYear && matchSection && matchAdviser && matchStatus && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (filterYear !== 'All Years' && allYears.length > 1) {
      const isPresent = allYears.some(y => 
        y === filterYear || extractSYClean(y) === extractSYClean(filterYear)
      );
      if (!isPresent) {
        setFilterYear('All Years');
      }
    }
  }, [allYears, filterYear]);

  useEffect(() => {
    if (filterStatus !== 'All Statuses' && !allStatuses.includes(filterStatus)) {
      setFilterStatus('All Statuses');
    }
  }, [allStatuses, filterStatus]);

  // When highlightAdviser is present, automatically navigate to the page containing that adviser's record
  useEffect(() => {
    if (highlightAdviser && filtered.length > 0) {
      const hNorm = highlightAdviser.toLowerCase().trim();
      const targetIdx = filtered.findIndex(r => {
        if (!r.adviser) return false;
        const aNorm = r.adviser.toLowerCase().trim();
        return aNorm === hNorm || aNorm.includes(hNorm) || hNorm.includes(aNorm);
      });
      if (targetIdx !== -1) {
        const targetPage = Math.floor(targetIdx / itemsPerPage) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [highlightAdviser, filtered.length, itemsPerPage]);

  // Auto-scroll to highlighted record
  useEffect(() => {
    if (highlightAdviser && !loading && paginated.length > 0) {
      const timer = setTimeout(() => {
        const el = document.querySelector('[data-highlighted="true"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightAdviser, loading, currentPage]);

  const handleView = (record) => {
    const sub = record.originalSub || {};
    const group = record.originalGroup || {};
    const requiredCount = (record.applicableReqs || []).length;
    const uploadedDocsList = sub.uploadedDocs || (sub.documents ? Object.keys(sub.documents) : []);
    const uploadedCount = uploadedDocsList.length;
    const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : (record.progress || 0);

    setSelectedSubmission({
      ...sub,
      id: sub.id || record.subDocId || record.id,
      subDocId: sub.id || record.subDocId || record.id,
      groupId: record.groupDocId || group.id,
      groupName: record.group,
      section: record.section || group.section || '',
      researchTitle: record.title,
      leaderName: group.leaderName || sub.leaderName || 'Group Leader',
      members: group.members || sub.members || [],
      uploadedCount,
      requiredCount,
      completionPercent,
      applicableReqs: record.applicableReqs || [],
      category: record.category || sub.category || 'General',
      adviser: record.adviser,
      year: record.year || record.schoolYear,
      status: record.status || 'in_progress',
      abstract: sub.abstract || record.abstract || '',
      pageCount: sub.pageCount || record.pageCount || '—',
      documents: sub.documents || {}
    });
    setShowReviewModal(true);
  };

  const handleOpenPublicWebsite = async (sub) => {
    if (!sub) return;
    const studyId = sub.id || sub.subDocId || sub.groupId || '';
    const title = sub.researchTitle || sub.title || '';
    const params = new URLSearchParams();
    if (studyId) params.set('highlight', studyId);
    if (title) params.set('title', title);

    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (import.meta.env.VITE_PUBLIC_ARCHIVE_URL) {
      const url = `${import.meta.env.VITE_PUBLIC_ARCHIVE_URL.replace(/\/$/, '')}/browse?${params.toString()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isLocal) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600);
        await fetch('http://localhost:5174', { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeoutId);
        window.open(`http://localhost:5174/browse?${params.toString()}`, '_blank', 'noopener,noreferrer');
        return;
      } catch {
        // Fallback to live public website
        window.open(`https://archivio-public.web.app/browse?${params.toString()}`, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    window.open(`https://archivio-public.web.app/browse?${params.toString()}`, '_blank', 'noopener,noreferrer');
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

  const getDeanInfo = () => {
    const rawDeanName = deanData?.displayName || (deanData?.firstName ? `${deanData.firstName} ${deanData.lastName || ''}`.trim() : '') || 'Dean';
    const deanTitle = deanData?.title ? `${deanData.title} ` : '';
    const fullName = `${deanTitle}${rawDeanName}`.trim();
    const department = deanData?.department || 'College of Information Technology';
    const dateFormatted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return { fullName, department, dateFormatted };
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      Swal.fire('No Data', 'There are no research records to export with the current filter.', 'info');
      return;
    }

    const { fullName, department, dateFormatted } = getDeanInfo();

    // 1. Institutional Header Metadata
    const metaHeader = [
      ['ARCHIVIO RESEARCH ARCHIVE SYSTEM'],
      ['OFFICIAL RESEARCH RECORDS INVENTORY REPORT'],
      ['Department / College:', department],
      ['Date Generated:', dateFormatted],
      ['Active Filters:', `Year: ${filterYear} | Category: ${filterCategory} | Section: ${filterSection} | Adviser: ${filterAdviser} | Status: ${filterStatus} | Search: ${search || 'None'}`],
      ['Total Records:', `${filtered.length}`],
      [] // Blank separator
    ];

    // 2. Table Headers & Rows
    const tableHeaders = ['No.', 'Record ID', 'Research Title', 'Group Name', 'Section', 'Adviser', 'Category', 'Year', 'Status', 'Progress (%)'];
    const tableRows = filtered.map((r, index) => [
      index + 1,
      r.id || '',
      r.title || '',
      r.group || '',
      r.section || '',
      r.adviser || '',
      r.category || '',
      r.year || '',
      formatStatus(r.status),
      `${r.progress || 0}%`
    ]);

    // 3. Official Prepared By Signature Block
    const metaFooter = [
      [],
      ['Prepared by:', fullName],
      ['Designation:', `Dean, ${department}`],
      ['Date:', dateFormatted]
    ];

    const allRows = [...metaHeader, tableHeaders, ...tableRows, ...metaFooter];
    const csvContent = allRows
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const deptSlug = department.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `archivio_research_records_${deptSlug}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'CSV Export Complete',
      text: `Successfully exported ${filtered.length} research record(s) to CSV with header and prepared by block.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) {
      Swal.fire('No Data', 'There are no research records to export with the current filter.', 'info');
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
      Swal.fire('Pop-up Blocked', 'Please allow pop-ups for this site to generate and print/export the PDF report.', 'warning');
      return;
    }

    const rowsHtml = filtered.map((r, index) => {
      const statusLabel = formatStatus(r.status);
      const bg = index % 2 === 0 ? '#ffffff' : '#fcfbf9';
      const statusColor = statusLabel === 'Published' ? '#047857' : statusLabel === 'Approved' ? '#1d4ed8' : '#b45309';
      return `
        <tr style="background-color: ${bg};">
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 11px; color: #78716c;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 8px 10px; border: 1px solid #e7e5e4; font-size: 11px; font-weight: 700; color: #1c1917; line-height: 1.35;">${escapeHtml(r.title || '')}</td>
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 11px; color: #44403c;">${escapeHtml(r.group || '')}</td>
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; text-align: center; font-size: 11px; font-weight: 700; color: #590000;">${escapeHtml(r.section || '—')}</td>
          <td style="padding: 8px 8px; border: 1px solid #e7e5e4; font-size: 11px; color: #44403c;">${escapeHtml(r.adviser || '')}</td>
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; font-size: 10px; text-align: center; color: #44403c; font-weight: 600;">${escapeHtml(r.category || 'N/A')}</td>
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; font-size: 11px; text-align: center; color: #44403c; font-weight: 600;">${escapeHtml(r.year || '')}</td>
          <td style="padding: 8px 6px; border: 1px solid #e7e5e4; font-size: 10px; text-align: center; font-weight: 700; color: ${statusColor};">${escapeHtml(statusLabel)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Archivio - Research Records Report</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
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
              content: "Archivio - Research Records Report";
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
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 900;
            color: #590000;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #78716c;
            margin: 2px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .dept-title {
            font-size: 14px;
            font-weight: 700;
            color: #292524;
            margin: 5px 0 0 0;
          }
          .report-badge-container {
            text-align: right;
          }
          .report-tag {
            display: inline-block;
            background: #590000;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .report-date {
            font-size: 11px;
            color: #78716c;
            margin-top: 5px;
            font-weight: 500;
          }
          .meta-box {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            background: #faf8f5;
            border: 1px solid #e7e0d8;
            border-radius: 6px;
            padding: 9px 14px;
            margin-bottom: 14px;
            font-size: 11px;
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
            margin-bottom: 24px;
          }
          th {
            background-color: #590000;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 8px;
            border: 1px solid #590000;
          }
          .signatures-container {
            margin-top: 36px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 280px;
            text-align: left;
          }
          .sig-label {
            font-size: 11px;
            font-weight: 600;
            color: #57534e;
            margin-bottom: 45px;
          }
          .sig-line {
            border-bottom: 1.5px solid #1c1917;
            margin-bottom: 6px;
          }
          .sig-name {
            font-size: 13px;
            font-weight: 700;
            color: #1c1917;
            margin: 0;
          }
          .sig-role {
            font-size: 11px;
            font-weight: 600;
            color: #44403c;
            margin: 2px 0 0 0;
          }
          .sig-date {
            font-size: 10px;
            color: #78716c;
            margin: 3px 0 0 0;
          }
          @media print {
            .no-print {
              display: none !important;
            }
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
            <span class="report-tag">Research Records Report</span>
            <div class="report-date">Date Generated: ${dateFormatted}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-item"><strong>Academic Year:</strong> ${escapeHtml(filterYear)}</div>
          <div class="meta-item"><strong>Category:</strong> ${escapeHtml(filterCategory)}</div>
          <div class="meta-item"><strong>Section:</strong> ${escapeHtml(filterSection)}</div>
          <div class="meta-item"><strong>Adviser:</strong> ${escapeHtml(filterAdviser)}</div>
          <div class="meta-item"><strong>Status:</strong> ${escapeHtml(filterStatus)}</div>
          <div class="meta-item"><strong>Total Records:</strong> ${filtered.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No.</th>
              <th style="text-align: left;">Research Title</th>
              <th style="text-align: center; width: 80px;">Group</th>
              <th style="text-align: center; width: 60px;">Section</th>
              <th style="text-align: left; width: 110px;">Adviser</th>
              <th style="width: 70px; text-align: center;">Category</th>
              <th style="width: 45px; text-align: center;">Year</th>
              <th style="width: 70px; text-align: center;">Status</th>
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

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar activePage="research-records" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header activePage="research-records" onMenuClick={() => {}} />

        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f0e6] dark:bg-stone-900 transition-colors">

          {/* ===== PAGE TITLE ===== */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <SectionTitle sub={`All uploaded research within ${deanData?.department || 'the College'} · ${records.length} total records`}>
              Research Records
            </SectionTitle>
            <div className="flex items-center gap-2 shrink-0">
              <PremiumButton 
                variant="ghost" 
                className="flex items-center gap-2"
                onClick={handleExportCSV}
                title="Export filtered research records to CSV with institutional header and signature"
              >
                <Download className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                <span>Export CSV</span>
              </PremiumButton>
              <PremiumButton 
                variant="primary" 
                className="flex items-center gap-2 bg-[#590000] hover:bg-[#770000] text-white dark:bg-[#d4af37] dark:text-[#590000] dark:hover:bg-[#b09230]"
                onClick={handleExportPDF}
                title="Print or export filtered research records to PDF with header, table, and prepared by signature"
              >
                <Printer className="w-4 h-4" />
                <span>Export PDF</span>
              </PremiumButton>
            </div>
          </div>

          {/* ===== TABLE CARD ===== */}
          <Card glass={true} className="overflow-hidden">

            {/* ---- Filter Bar ---- */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-700/80 bg-stone-50 dark:bg-stone-800/50">
              <div className="flex flex-wrap gap-2.5 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search title, group, adviser..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-400 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] focus:border-[#770000] dark:focus:border-[#f8d070]"
                  />
                </div>

                {/* Filters */}
                {[
                  { value: filterCategory, setter: setFilterCategory, options: allCategories },
                  { value: filterYear, setter: setFilterYear, options: allYears },
                  { value: filterSection, setter: setFilterSection, options: allSections },
                  { value: filterAdviser, setter: setFilterAdviser, options: allAdvisers },
                  { value: filterStatus, setter: setFilterStatus, options: allStatuses },
                ].map(({ value, setter, options }, idx) => (
                  <div key={idx} className="relative">
                    <select
                      value={value}
                      onChange={handleFilterChange(setter)}
                      className="appearance-none bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 outline-none focus:ring-1 focus:ring-[#770000] dark:focus:ring-[#f8d070] focus:border-[#770000] dark:focus:border-[#f8d070] cursor-pointer"
                    >
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] pointer-events-none">▼</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Highlight Banner */}
            {highlightAdviser && (
              <div className="mx-4 mt-3 mb-1 px-3.5 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span>
                    Highlighting research records for adviser: <strong className="font-extrabold underline decoration-amber-500 decoration-2">{highlightAdviser}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHighlightAdviser(null)}
                  className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300 hover:text-[#590000] dark:hover:text-white cursor-pointer px-2 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  title="Clear highlight"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Highlight</span>
                </button>
              </div>
            )}

            {/* ---- Table ---- */}
            <div className="w-full overflow-hidden">
              {loading ? (
                <div className="mt-2 p-4">
                  <TableSkeleton rows={5} />
                </div>
              ) : (
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#590000] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px]">
                    <th style={{ width: '5%' }} className="py-3 px-2 text-center truncate">No.</th>
                    <th style={{ width: '30%' }} className="py-3 px-2.5 text-left truncate">Research Title</th>
                    <th style={{ width: '8%' }} className="py-3 px-2 text-center truncate">Group</th>
                    <th style={{ width: '8%' }} className="py-3 px-2 text-center truncate">Section</th>
                    <th style={{ width: '14%' }} className="py-3 px-2.5 text-left truncate">Adviser</th>
                    <th style={{ width: '12%' }} className="py-3 px-2 text-center truncate">Category</th>
                    <th style={{ width: '12%' }} className="py-3 px-2 text-center truncate">Status</th>
                    <th style={{ width: '11%' }} className="py-3 px-2 text-center truncate">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700/60 font-medium">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-24">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4">
                            <FolderArchive className="w-7 h-7 text-stone-400" />
                          </div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">No research records found</h3>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-xs">Try adjusting your search filters or selecting a different academic year or section to find what you're looking for.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((record, index) => {
                      const hNorm = highlightAdviser ? highlightAdviser.toLowerCase().trim() : '';
                      const aNorm = record.adviser ? record.adviser.toLowerCase().trim() : '';
                      const isHighlighted = Boolean(
                        hNorm &&
                        aNorm &&
                        (aNorm === hNorm || aNorm.includes(hNorm) || hNorm.includes(aNorm))
                      );
                      return (
                      <tr
                        key={record.id}
                        data-highlighted={isHighlighted ? 'true' : undefined}
                        className={`transition-all duration-300 ${
                          isHighlighted
                            ? 'bg-amber-100/75 dark:bg-amber-950/50 border-l-4 border-l-[#590000] dark:border-l-[#d4af37] ring-1 ring-inset ring-amber-300 dark:ring-amber-600/50 shadow-xs'
                            : record.adviserSelf
                              ? 'bg-amber-50/30 dark:bg-amber-900/10 hover:bg-stone-50 dark:hover:bg-stone-700'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-700'
                        }`}
                      >
                        {/* No. (5% - center) */}
                        <td style={{ width: '5%' }} className="py-3 px-2 text-center text-stone-400 font-mono text-[11px] truncate align-middle">
                          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                        </td>

                        {/* Title (30% - left, full read with auto-adjusting row height) */}
                        <td style={{ width: '30%' }} className="py-3 px-2.5 text-left font-bold text-stone-800 dark:text-stone-200 align-middle">
                          <div 
                            className="leading-snug break-words whitespace-normal text-xs text-stone-900 dark:text-stone-100 font-semibold"
                            title={record.title}
                          >
                            {record.title}
                          </div>
                        </td>

                        {/* Group (8% - center, group code ONLY) */}
                        <td style={{ width: '8%' }} className="py-3 px-2 text-center text-stone-600 dark:text-stone-300 font-semibold truncate text-[11px] align-middle">
                          <span title={record.group} className="truncate block font-mono">
                            {record.group}
                          </span>
                        </td>

                        {/* Section (8% - center, section badge/text ONLY) */}
                        <td style={{ width: '8%' }} className="py-3 px-2 text-center truncate align-middle">
                          {record.section ? (
                            <span 
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#590000]/10 text-[#590000] dark:bg-[#f8d070]/15 dark:text-[#f8d070] border border-[#590000]/20 dark:border-[#f8d070]/20 truncate max-w-full font-mono"
                              title={`Section: ${record.section}`}
                            >
                              {record.section}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Adviser (14% - left) */}
                        <td style={{ width: '14%' }} className="py-3 px-2.5 text-left truncate text-stone-700 dark:text-stone-300 align-middle">
                          <div className="flex items-center gap-1.5 min-w-0" title={record.adviser}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              isHighlighted
                                ? 'bg-[#590000] text-white dark:bg-[#d4af37] dark:text-[#590000] ring-2 ring-amber-400 shadow-2xs'
                                : record.adviserSelf 
                                  ? 'bg-[#590000] text-white dark:bg-[#f8d070] dark:text-[#590000]' 
                                  : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                            }`}>
                              {record.adviser.charAt(0).toUpperCase()}
                            </div>
                            <span className={`truncate text-xs ${isHighlighted || record.adviserSelf ? 'font-bold text-[#590000] dark:text-[#f8d070]' : 'text-stone-700 dark:text-stone-300 font-medium'}`}>
                              {record.adviser}
                            </span>
                            {isHighlighted && (
                              <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 py-0.2 rounded uppercase tracking-wider shadow-xs animate-pulse shrink-0">
                                Highlighted
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category (12% - center) */}
                        <td style={{ width: '12%' }} className="py-3 px-2 text-center truncate align-middle">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-full ${
                            record.category === 'ML' ? 'bg-purple-50/50 text-purple-700 border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30' :
                            record.category === 'IoT' ? 'bg-teal-50/50 text-teal-700 border-teal-200/50 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30' :
                            record.category === 'Security' ? 'bg-amber-50/50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30' :
                            record.category === 'Mobile' ? 'bg-blue-50/50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30' :
                            record.category === 'Web' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30' :
                            'bg-stone-50/50 text-stone-600 border-stone-200/50 dark:bg-stone-800/40 dark:text-stone-400 dark:border-stone-700/30'
                          }`} title={record.category}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              record.category === 'ML' ? 'bg-purple-500' :
                              record.category === 'IoT' ? 'bg-teal-500' :
                              record.category === 'Security' ? 'bg-amber-500' :
                              record.category === 'Mobile' ? 'bg-blue-500' :
                              record.category === 'Web' ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}></span>
                            <span className="truncate">{record.category}</span>
                          </span>
                        </td>

                        {/* Status (12% - center) */}
                        <td style={{ width: '12%' }} className="py-3 px-2 text-center truncate align-middle">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-full ${
                            record.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' :
                            (record.status === 'approved' || record.status === 'endorsed') ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' :
                            record.status === 'reviewed' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400'
                          }`} title={formatStatus(record.status)}>
                            <span className="shrink-0">{record.status === 'published' ? '✓' : (record.status === 'approved' || record.status === 'endorsed') ? '✦' : '•'}</span>
                            <span className="truncate">{formatStatus(record.status)}</span>
                          </span>
                        </td>

                        {/* Action (11% - center) */}
                        <td style={{ width: '11%' }} className="py-3 px-2 text-center truncate align-middle">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(record);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-2xs inline-flex items-center justify-center gap-1.5 mx-auto cursor-pointer bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-[#770000] dark:hover:border-[#f8d070] hover:text-[#770000] dark:hover:text-[#f8d070] hover:bg-stone-50 dark:hover:bg-stone-700 hover:-translate-y-0.5"
                            title="View Information & Public Link"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#590000] dark:text-[#f8d070]" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* ---- Pagination Footer ---- */}
            <div className="px-5 py-3.5 border-t border-stone-100 dark:border-stone-700/80 flex items-center justify-between bg-stone-50 dark:bg-stone-800/30">
              <div className="flex items-center gap-4">
                <p className="text-[11px] text-stone-400 font-medium">
                  Showing {paginated.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 font-medium">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#770000]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors
                      ${currentPage === page
                        ? 'bg-[#770000] dark:bg-[#d4af37] dark:text-[#590000] text-white shadow-sm'
                        : 'border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-700 dark:bg-stone-800/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* ─── FULL REVIEW MODAL ─────────────────────────────────────────── */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#590000] dark:bg-stone-950 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition text-sm cursor-pointer"
                title="Close modal"
              >
                ✕
              </button>
              
              <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
                <div className="flex items-center gap-2">
                  <p className="text-white/70 text-xs tracking-widest uppercase font-bold">Dean Inspection</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedSubmission.status === 'published' 
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' 
                      : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  }`}>
                    {selectedSubmission.status === 'published' ? '✓ Published in Archive' : `• Status: ${formatStatus(selectedSubmission.status)}`}
                  </span>
                </div>

                {/* View in Public Website (Header Action) */}
                <button
                  type="button"
                  onClick={() => handleOpenPublicWebsite(selectedSubmission)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f8d070] hover:from-[#b09230] hover:to-[#e6c15c] text-[#590000] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
                  title="Directly view this study on the public website with highlighted card edges"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>View in Public Website</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-bold mt-3 leading-snug">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1">
                Group: <span className="font-semibold text-white">{selectedSubmission.groupName}</span> {selectedSubmission.section ? `· Section: ${selectedSubmission.section}` : ''} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#590000]/10 dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.uploadedCount}/{selectedSubmission.requiredCount}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Documents</p>
                </div>
                <div className="bg-[#590000]/10 dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.completionPercent}%</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Complete</p>
                </div>
                <div className="bg-[#590000]/10 dark:bg-[#f8d070]/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#590000] dark:text-[#f8d070]">{selectedSubmission.pageCount || '—'}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Pages</p>
                </div>
              </div>

              {selectedSubmission.abstract && (
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2">Abstract</h4>
                  <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed bg-stone-50 dark:bg-stone-800/50 rounded-lg p-4 border border-stone-100 dark:border-stone-700/80">
                    {selectedSubmission.abstract}
                  </p>
                </div>
              )}

              {/* Group Members */}
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2">Group Members</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#590000] dark:bg-[#f8d070] text-white dark:text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full">
                    👤 {selectedSubmission.leaderName || 'Leader'} (Leader)
                  </span>
                  {selectedSubmission.members?.map((m, i) => {
                    const name = typeof m === 'object'
                      ? (m.name || (m.email?.includes('@') ? m.email.split('@')[0] : m.email) || `Member ${i + 2}`)
                      : (typeof m === 'string' && m.includes('@') ? m.split('@')[0] : (m || `Member ${i + 2}`));
                    return (
                      <span key={i} className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
                        👤 {name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {selectedSubmission.applicableReqs?.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id) || Boolean(docMeta);

                    return (
                      <div
                        key={req.id}
                        className={`flex items-center justify-between rounded-lg p-3 border transition ${
                          isUploaded
                            ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{req.icon}</span>
                          <div>
                            <p className={`text-sm font-bold ${isUploaded ? 'text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-400'}`}>{req.title}</p>
                            {isUploaded && docMeta ? (
                              <p className="text-xs text-stone-500 dark:text-stone-400">{docMeta.name} · {docMeta.size || 'Verified'}</p>
                            ) : (
                              <p className="text-xs text-red-500 font-medium">Missing Document</p>
                            )}
                          </div>
                        </div>
                        {isUploaded && docMeta?.url && docMeta.url !== '#' && (
                          <button
                            onClick={() => setViewerState({
                              isOpen: true,
                              url: docMeta.url,
                              title: docMeta.name || req.title
                            })}
                            className="text-xs font-bold text-[#590000] dark:text-[#f8d070] bg-white dark:bg-stone-800 border border-[#590000]/20 dark:border-[#f8d070]/30 px-3 py-1.5 rounded-lg hover:bg-[#590000] dark:hover:bg-[#f8d070] hover:text-white dark:hover:text-stone-900 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View File
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer with Close and View in Public Website */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 rounded-b-2xl flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
                Record ID: <span className="font-mono font-bold text-stone-700 dark:text-stone-300">{selectedSubmission.id || 'N/A'}</span>
              </p>
              <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPublicWebsite(selectedSubmission)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#590000] dark:bg-[#d4af37] text-white dark:text-[#590000] hover:bg-[#770000] dark:hover:bg-[#b09230] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>View in Public Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentViewerModal
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ isOpen: false, url: '', title: '' })}
        documentUrl={viewerState.url}
        documentTitle={viewerState.title}
      />

    </div>
  );
}
