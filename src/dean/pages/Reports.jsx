import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import Swal from 'sweetalert2';

const REPORT_TYPES = [
  { id: 'research-by-year', title: 'Research by Year', desc: 'Uploads by academic year', icon: '📅' },
  { id: 'adviser-performance', title: 'Adviser Performance', desc: 'Per adviser breakdown', icon: '🧑‍🏫' },
  { id: 'completion-status', title: 'Completion Status', desc: 'Requirements per group', icon: '✅' },
  { id: 'approved-vs-pending', title: 'Approved vs Pending', desc: 'Status comparison', icon: '⚖️' },
  { id: 'published-archive', title: 'Published Archive', desc: 'All published research', icon: '🌐' },
  { id: 'category-report', title: 'Category Report', desc: 'By field of study', icon: '🏷️' },
];

export default function Reports() {
  const { deanData } = useUser();
  const [selectedReport, setSelectedReport] = useState('completion-status');
  const [records, setRecords] = useState([]);
  
  // Filters
  const [filterSY, setFilterSY] = useState('All');
  const [filterAdviser, setFilterAdviser] = useState('All');
  
  // Filter Options
  const [allYears, setAllYears] = useState([]);
  const [allAdvisers, setAllAdvisers] = useState([]);
  
  useEffect(() => {
    if (!deanData) return;
    const deanDept = deanData.department || '';

    const groupsQuery = query(collection(db, 'groups'), where('status', '==', 'approved'));
    const unsubGroups = onSnapshot(groupsQuery, (groupsSnapshot) => {
      const groupsData = groupsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(g => g.department === deanDept);
      
      const unsubSubs = onSnapshot(collection(db, 'submissions'), (subsSnapshot) => {
        const subsData = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const unsubReqs = onSnapshot(collection(db, 'requirements'), (reqsSnapshot) => {
          const reqsData = reqsSnapshot.docs
             .map(d => ({ id: d.id, ...d.data() }))
             .filter(r => r.status === 'approved');
             
          const merged = groupsData.map((g) => {
            const sub = subsData.find(s => s.studentUid === g.leaderUid && (s.groupName === g.groupName || (s.title || s.researchTitle) === g.researchTitle)) || {};
            const status = sub.reviewStatus || 'pending';
            const submittedDate = sub.submittedDate || sub.createdAt || g.createdAt || '';
            const year = submittedDate ? new Date(submittedDate).getFullYear().toString() : new Date().getFullYear().toString();
            const category = g.category || sub.category || 'Uncategorized';
            
            const applicableReqs = reqsData.filter(r => r.scope === 'global' || (r.scope === 'adviser' && r.adviserUid === g.adviserUid));
            const requiredCount = applicableReqs.length;
            const uploadedCount = sub.uploadedDocs?.length || 0;
            const completionPercent = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;
            
            return {
              id: sub.id || g.id,
              title: g.researchTitle || sub.title || 'Untitled',
              groupName: g.groupName || 'Unknown Group',
              adviser: g.adviserName || g.adviserUid || 'Unknown',
              category,
              academicYear: g.academicYear || year,
              status,
              completionPercent,
              requiredCount,
              uploadedCount
            };
          });
          
          setRecords(merged);
          
          const years = [...new Set(merged.map(r => r.academicYear))].filter(Boolean).sort().reverse();
          setAllYears(years);
          const advisers = [...new Set(merged.map(r => r.adviser))].filter(Boolean).sort();
          setAllAdvisers(advisers);
        });
        return () => unsubReqs();
      });
      return () => unsubSubs();
    });
    return () => unsubGroups();
  }, [deanData]);

  const filteredRecords = records.filter(r => {
    if (filterSY !== 'All' && r.academicYear !== filterSY) return false;
    if (filterAdviser !== 'All' && r.adviser !== filterAdviser) return false;
    return true;
  });

  const getReportData = () => {
    switch (selectedReport) {
      case 'research-by-year': {
        const yearMap = {};
        filteredRecords.forEach(r => {
          yearMap[r.academicYear] = (yearMap[r.academicYear] || 0) + 1;
        });
        return Object.entries(yearMap).map(([year, count]) => ({ 'Academic Year': year, 'Total Researches': count })).sort((a, b) => b['Academic Year'].localeCompare(a['Academic Year']));
      }
      case 'adviser-performance': {
        const advMap = {};
        filteredRecords.forEach(r => {
          if (!advMap[r.adviser]) advMap[r.adviser] = { 'Adviser': r.adviser, 'Total Groups': 0, 'Pending': 0, 'Approved': 0, 'Published': 0 };
          advMap[r.adviser]['Total Groups']++;
          if (r.status === 'pending') advMap[r.adviser]['Pending']++;
          if (r.status === 'approved' || r.status === 'reviewed') advMap[r.adviser]['Approved']++;
          if (r.status === 'published') advMap[r.adviser]['Published']++;
        });
        return Object.values(advMap).sort((a, b) => b['Total Groups'] - a['Total Groups']);
      }
      case 'completion-status': {
        return filteredRecords.map(r => ({
          'Group Name': r.groupName,
          'Research Title': r.title,
          'Adviser': r.adviser,
          'Completion (%)': `${r.completionPercent}% (${r.uploadedCount}/${r.requiredCount})`
        }));
      }
      case 'approved-vs-pending': {
        return filteredRecords.map(r => ({
          'Group Name': r.groupName,
          'Research Title': r.title,
          'Status': r.status.toUpperCase()
        })).sort((a, b) => a.Status.localeCompare(b.Status));
      }
      case 'published-archive': {
        return filteredRecords.filter(r => r.status === 'published').map(r => ({
          'Research Title': r.title,
          'Group Name': r.groupName,
          'Adviser': r.adviser,
          'Category': r.category,
          'Academic Year': r.academicYear
        }));
      }
      case 'category-report': {
        const catMap = {};
        filteredRecords.forEach(r => {
          catMap[r.category] = (catMap[r.category] || 0) + 1;
        });
        return Object.entries(catMap).map(([cat, count]) => ({ 'Category': cat, 'Total Researches': count })).sort((a, b) => b['Total Researches'] - a['Total Researches']);
      }
      default:
        return [];
    }
  };

  const reportData = getReportData();

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      Swal.fire('Empty Report', 'There is no data to export.', 'info');
      return;
    }
    const headers = Object.keys(reportData[0]);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    
    reportData.forEach(row => {
      const rowString = headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(",");
      csvContent += rowString + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentReportObj = REPORT_TYPES.find(r => r.id === selectedReport);

  return (
    <div className="flex h-screen bg-[#f5f0e6] dark:bg-stone-900 transition-colors overflow-hidden font-sans antialiased">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; }
            .print-container { width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; overflow: visible !important; }
            .print-header { margin-bottom: 20px; text-align: center; }
            .print-table { width: 100%; border-collapse: collapse; }
            .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .print-table th { background-color: #f8f9fa; }
          }
        `}
      </style>
      <div className="no-print h-full shrink-0">
        <Sidebar activePage="reports" />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print-container">
        <div className="no-print">
          <Header activePage="reports" />
        </div>
        
        <main className="flex-1 overflow-y-auto p-6 max-w-[1400px] w-full mx-auto space-y-6 print-container">
          
          <div className="hidden print-only print-header">
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a1024' }}>ARCHIVIO</h1>
            <p>Dean's Report: {currentReportObj?.title}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>Generated on: {new Date().toLocaleDateString()}</p>
            <hr style={{ margin: '15px 0' }} />
          </div>

          <div className="no-print">
            <h1 className="text-2xl font-serif font-bold text-[#4a1024]">Generate Reports</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Select a report type, apply filters, and export</p>
          </div>

          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700/60 dark:border-stone-700 p-6 space-y-6 print-container">
            <div className="no-print">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-4">Report Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_TYPES.map((type) => {
                  const isActive = selectedReport === type.id;
                  return (
                    <div 
                      key={type.id} 
                      onClick={() => setSelectedReport(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${isActive ? 'border-emerald-500 bg-emerald-50/10 shadow-sm ring-1 ring-emerald-500/20' : 'border-stone-200 dark:border-stone-700/70 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xl bg-stone-50 dark:bg-stone-800/50 p-1.5 rounded-lg border border-stone-100">{type.icon}</span>
                        {isActive && <span className="text-emerald-600 bg-emerald-100/60 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>}
                      </div>
                      <h4 className="font-bold text-stone-800 dark:text-stone-200 text-xs mt-3">{type.title}</h4>
                      <p className="text-[10px] text-stone-400 mt-0.5">{type.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-stone-100 no-print" />

            <div className="space-y-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Filters & Export</h3>
                <div className="flex items-center gap-2 font-bold text-[11px]">
                  <button onClick={() => window.print()} className="px-4 py-2 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl shadow-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">🖨️ Print / PDF</button>
                  <button onClick={handleExportCSV} className="px-5 py-2 bg-[#4a1024] dark:bg-stone-950 hover:bg-[#6b1834] text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">📊 Export Excel (CSV)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">School Year</label>
                  <select value={filterSY} onChange={(e) => setFilterSY(e.target.value)} className="w-full text-xs p-2 border border-stone-200 dark:border-stone-700/80 rounded-xl bg-stone-50 dark:bg-stone-800/50 outline-none text-stone-700 dark:text-stone-300 font-medium">
                    <option value="All">All Years</option>
                    {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Adviser</label>
                  <select value={filterAdviser} onChange={(e) => setFilterAdviser(e.target.value)} className="w-full text-xs p-2 border border-stone-200 dark:border-stone-700/80 rounded-xl bg-stone-50 dark:bg-stone-800/50 outline-none text-stone-700 dark:text-stone-300 font-medium">
                    <option value="All">All Advisers</option>
                    {allAdvisers.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="font-bold text-stone-700 dark:text-stone-300 text-sm mb-4 no-print">Report Preview: {currentReportObj?.title}</h4>
              
              {reportData.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700 print-container">
                  <table className="w-full text-left border-collapse text-xs print-table">
                    <thead>
                      <tr className="bg-[#4a1024] dark:bg-stone-950 text-white font-bold uppercase tracking-wider text-[10px]">
                        {Object.keys(reportData[0]).map((header, idx) => (
                          <th key={idx} className="py-3 px-4">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white dark:bg-stone-800">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-700">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="py-2.5 px-4 text-stone-700 dark:text-stone-300 font-medium">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-stone-50 dark:bg-stone-800/50 p-12 text-center flex flex-col items-center justify-center no-print">
                  <span className="text-3xl mb-2">📄</span>
                  <h4 className="font-bold text-stone-700 dark:text-stone-300 text-xs">No Data Found</h4>
                  <p className="text-[10px] text-stone-400 max-w-xs mt-1">Try adjusting your filters or select a different report type.</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
