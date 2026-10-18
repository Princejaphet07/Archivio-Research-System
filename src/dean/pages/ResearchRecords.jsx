import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { Download, Search, Eye, Sparkles, FolderArchive, Printer } from 'lucide-react';

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
    case 'approved':
      return 'Approved';
    case 'published':
      return 'Published';
    default:
      return 'In Progress';
  }
};

export default function ResearchRecords() {
  const navigate = useNavigate();
  const { deanData } = useUser();
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterAdviser, setFilterAdviser] = useState('All Advisers');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  
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
            const submittedDate = sub.submittedDate || sub.createdAt || g.createdAt || '';
            const year = submittedDate ? new Date(submittedDate).getFullYear().toString() : new Date().getFullYear().toString();
            const category = g.category || sub.category || 'Uncategorized';
            const action = status === 'reviewed' ? 'Publish' : 'View';

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
              section: g.section || sub.section || '',
              department: g.department || deanDept,
              adviser: g.adviserName || 'Not Assigned',
              year,
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
          
          // Update filter options
          const years = [...new Set(mergedRecords.map(r => r.year))].filter(Boolean).sort().reverse();
          setAllYears(['All Years', ...years]);
          
          const advisers = [...new Set(mergedRecords.map(r => r.adviser))].filter(Boolean).sort();
          setAllAdvisers(['All Advisers', ...advisers]);
          
          const ALLOWED_STATUSES = ['In Progress', 'Revision', 'Approved', 'Published'];
          const availableStatuses = ALLOWED_STATUSES.filter(st =>
            mergedRecords.some(r => formatStatus(r.status) === st)
          );
          setAllStatuses(['All Statuses', ...availableStatuses]);

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
  }, [deanData]);

  // ---- Filter logic ----
  const filtered = records.filter((r) => {
    const matchSearch =
      search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.group.toLowerCase().includes(search.toLowerCase()) ||
      r.adviser.toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 'All Years' || r.year === filterYear;
    const matchAdviser = filterAdviser === 'All Advisers' || r.adviser === filterAdviser;
    const matchStatus = filterStatus === 'All Statuses' || formatStatus(r.status) === filterStatus;
    const matchCategory = filterCategory === 'All Categories' || r.category === filterCategory;
    return matchSearch && matchYear && matchAdviser && matchStatus && matchCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };



  useEffect(() => {
    if (filterStatus !== 'All Statuses' && !allStatuses.includes(filterStatus)) {
      setFilterStatus('All Statuses');
    }
  }, [allStatuses, filterStatus]);

  const handleView = (record) => {
    if (record.originalSub && record.originalSub.id) {
      const requiredCount = record.applicableReqs.length;
      const uploadedCount = record.originalSub.uploadedDocs?.length || 0;
      const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

      setSelectedSubmission({
        ...record.originalSub,
        groupName: record.group,
        section: record.section || record.originalGroup?.section || '',
        researchTitle: record.title,
        leaderName: record.originalGroup.leaderName,
        members: record.originalGroup.members,
        uploadedCount,
        requiredCount,
        completionPercent,
        applicableReqs: record.applicableReqs
      });
      setShowReviewModal(true);
    } else {
      Swal.fire('No Submission', 'This group has not started their submission yet.', 'info');
    }
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
      ['Active Filters:', `Year: ${filterYear} | Category: ${filterCategory} | Adviser: ${filterAdviser} | Status: ${filterStatus} | Search: ${search || 'None'}`],
      ['Total Records:', `${filtered.length}`],
      [] // Blank separator
    ];

    // 2. Table Headers & Rows
    const tableHeaders = ['No.', 'Record ID', 'Research Title', 'Group Name', 'Adviser', 'Category', 'Year', 'Status', 'Progress (%)'];
    const tableRows = filtered.map((r, index) => [
      index + 1,
      r.id || '',
      r.title || '',
      r.group || '',
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
          <td style="padding: 8px 8px; border: 1px solid #e7e5e4; text-align: center; font-size: 11px; color: #78716c;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 8px 10px; border: 1px solid #e7e5e4; font-size: 11px; font-weight: 700; color: #1c1917; line-height: 1.35;">${escapeHtml(r.title || '')}</td>
          <td style="padding: 8px 8px; border: 1px solid #e7e5e4; font-size: 11px; color: #44403c;">${escapeHtml(r.group || '')}</td>
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
            margin: 12mm 10mm 14mm 10mm;
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
          <div class="meta-item"><strong>Adviser:</strong> ${escapeHtml(filterAdviser)}</div>
          <div class="meta-item"><strong>Status:</strong> ${escapeHtml(filterStatus)}</div>
          <div class="meta-item"><strong>Total Records:</strong> ${filtered.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">No.</th>
              <th style="text-align: left;">Research Title</th>
              <th style="text-align: left; width: 120px;">Group Name</th>
              <th style="text-align: left; width: 110px;">Adviser</th>
              <th style="width: 70px; text-align: center;">Category</th>
              <th style="width: 50px; text-align: center;">Year</th>
              <th style="width: 75px; text-align: center;">Status</th>
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

            {/* ---- Table ---- */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="mt-2 p-4">
                  <TableSkeleton rows={5} />
                </div>
              ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#590000] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 text-center w-12">No.</th>
                    <th className="py-3.5 px-4">Research Title</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Adviser</th>
                    <th className="py-3.5 px-4 text-center">Category</th>
                    <th className="py-3.5 px-4 text-center">Year</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
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
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-xs">Try adjusting your search filters or selecting a different academic year to find what you're looking for.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((record, index) => (
                      <tr
                        key={record.id}
                        className={`hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors ${
                          record.adviserSelf ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                        }`}
                      >
                        {/* No. */}
                        <td className="py-4 px-4 text-center text-stone-400 font-normal">
                          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                        </td>

                        {/* Title */}
                        <td className="py-4 px-4 font-bold text-stone-800 dark:text-stone-200">
                          {record.title}
                        </td>

                        {/* Group */}
                        <td className="py-4 px-4 text-stone-600 dark:text-stone-400 font-medium">
                          <div>{record.group}</div>
                          {record.section && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-[#590000] dark:text-[#f8d070] bg-[#590000]/10 dark:bg-[#f8d070]/10 px-1.5 py-0.5 rounded">
                              Sec: {record.section}
                            </span>
                          )}
                        </td>

                        {/* Adviser */}
                        <td className="py-4 px-4 text-stone-700 dark:text-stone-300">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${record.adviserSelf ? 'bg-[#590000] text-white dark:bg-[#f8d070] dark:text-[#590000]' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'}`}>
                              {record.adviser.charAt(0).toUpperCase()}
                            </div>
                            <span className={record.adviserSelf ? 'font-bold text-[#590000] dark:text-[#f8d070]' : 'text-stone-700 dark:text-stone-300 font-medium'}>
                              {record.adviser}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            record.category === 'ML' ? 'bg-purple-50/50 text-purple-700 border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30' :
                            record.category === 'IoT' ? 'bg-teal-50/50 text-teal-700 border-teal-200/50 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30' :
                            record.category === 'Security' ? 'bg-amber-50/50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/30' :
                            record.category === 'Mobile' ? 'bg-blue-50/50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30' :
                            record.category === 'Web' ? 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30' :
                            'bg-stone-50/50 text-stone-600 border-stone-200/50 dark:bg-stone-800/40 dark:text-stone-400 dark:border-stone-700/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              record.category === 'ML' ? 'bg-purple-500' :
                              record.category === 'IoT' ? 'bg-teal-500' :
                              record.category === 'Security' ? 'bg-amber-500' :
                              record.category === 'Mobile' ? 'bg-blue-500' :
                              record.category === 'Web' ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}></span>
                            {record.category}
                          </span>
                        </td>

                        {/* Year */}
                        <td className="py-4 px-4 text-center text-stone-500 dark:text-stone-400 font-bold">{record.year}</td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                            record.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' :
                            (record.status === 'approved' || record.status === 'reviewed') ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400'
                          }`}>
                            {record.status === 'published' ? '✓' : record.status === 'approved' || record.status === 'reviewed' ? '✦' : '•'} {formatStatus(record.status)}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 text-center">
                          <button 
                            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 shadow-sm inline-flex items-center gap-1.5 mx-auto ${
                              record.action === 'Publish' || record.action === 'Review'
                              ? 'bg-[#770000] dark:bg-[#d4af37] text-white dark:text-[#590000] hover:bg-[#590000] dark:hover:bg-[#f8d070] hover:shadow-md hover:-translate-y-0.5' 
                              : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-700 hover:-translate-y-0.5'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (record.action === 'Publish') {
                                navigate('/dean/publish-queue');
                              } else {
                                handleView(record);
                              }
                            }}
                          >
                            {record.action === 'Publish' || record.action === 'Review' ? (
                              <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-stone-500 dark:text-stone-300" />
                            )}
                            <span>{record.action}</span>
                          </button>
                        </td>
                      </tr>
                    ))
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
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#590000] dark:bg-stone-950 text-white p-6 rounded-t-2xl relative">
              <button
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 bg-white text-stone-800 dark:bg-stone-800/20 dark:text-white rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800/30 transition text-lg"
              >
                ✕
              </button>
              <p className="text-white/70 text-xs tracking-widest uppercase font-bold mb-1">Dean Inspection</p>
              <h2 className="text-2xl font-serif font-bold">{selectedSubmission.researchTitle}</h2>
              <p className="text-white/80 text-sm mt-1">
                Group: {selectedSubmission.groupName} {selectedSubmission.section ? `· Section: ${selectedSubmission.section}` : ''} · Leader: {selectedSubmission.leaderName}
              </p>
            </div>

            <div className="p-6 space-y-6">
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
                  {selectedSubmission.applicableReqs.map((req) => {
                    const docMeta = selectedSubmission.documents?.[req.id];
                    const isUploaded = selectedSubmission.uploadedDocs?.includes(req.id);

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
                              <p className="text-xs text-stone-500 dark:text-stone-400">{docMeta.name} · {docMeta.size}</p>
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
                            className="text-xs font-bold text-[#590000] dark:text-[#f8d070] bg-white dark:bg-stone-800 border border-[#590000]/20 dark:border-[#f8d070]/30 px-3 py-1.5 rounded-lg hover:bg-[#590000] dark:hover:bg-[#f8d070] hover:text-white dark:hover:text-stone-900 transition flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View File
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
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
