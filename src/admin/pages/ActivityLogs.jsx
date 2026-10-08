import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Download, Eye, X, Activity, Clock, Shield, Globe, User, Copy, Check } from 'lucide-react';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import StatusBadge from '../components/common/StatusBadge';

const ROWS_PER_PAGE = 10;

const roleColors = {
  'System Admin':     'bg-[#801e38]/10 text-[#801e38] border border-[#801e38]/20 dark:bg-[#801e38]/20 dark:text-[#ff8ca3] dark:border-[#801e38]/40',
  'Super Admin':      'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40',
  'Dean':             'bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-800/40',
  'Adviser':          'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
  'Research Adviser': 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
  'Dean + Adviser':   'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40',
  'Student':          'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  '—':                'bg-stone-100 dark:bg-stone-800 text-stone-400',
};

const getRoleBadgeClass = (role) => {
  if (!role) return roleColors['—'];
  if (roleColors[role]) return roleColors[role];
  const lower = role.toLowerCase();
  if (lower.includes('super')) return roleColors['Super Admin'];
  if (lower.includes('admin')) return roleColors['System Admin'];
  if (lower.includes('dean') && lower.includes('adviser')) return roleColors['Dean + Adviser'];
  if (lower.includes('dean')) return roleColors['Dean'];
  if (lower.includes('adviser')) return roleColors['Adviser'];
  if (lower.includes('student')) return roleColors['Student'];
  return 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700';
};

const statusColors = {
  Success: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  Failed:  'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
};

const parseDate = (val) => {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  return new Date(val);
};

const formatTime = (iso) => {
  const d = parseDate(iso);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (iso) => {
  const d = parseDate(iso);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatRelativeActivityTime = (val) => {
  const d = parseDate(val);
  if (!d || isNaN(d.getTime())) return 'Recently';
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const matchesPeriod = (isoDate, period) => {
  const d = parseDate(isoDate);
  if (!d || isNaN(d.getTime())) return false;
  
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'week')  { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
};

export default function ActivityLogs() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);

  const [search,       setSearch] = useState('');
  const [period,       setPeriod] = useState('today');
  const [statusFilter, setStatus] = useState('all');
  const [roleFilter,   setRole]   = useState('all');
  const [page,         setPage]   = useState(1);
  const [selectedLog,  setSelectedLog] = useState(null);
  const [copied,       setCopied] = useState(false);
  const { selectedYear, filterByAcademicYear } = useAcademicYear();

  // Reset copied state on modal open/close
  useEffect(() => {
    setCopied(false);
  }, [selectedLog]);

  const copyLogDetails = () => {
    if (!selectedLog) return;
    const text = [
      `ARCHIVIO AUDIT TRAIL ENTRY`,
      `---------------------------------------`,
      `Action:    ${selectedLog.action || 'Unknown'}`,
      `Status:    ${selectedLog.status || 'Success'}`,
      `User:      ${selectedLog.user || 'Unknown'}`,
      `Role:      ${selectedLog.role || '—'}`,
      `Timestamp: ${formatDate(selectedLog.timestamp)} at ${formatTime(selectedLog.timestamp)}`,
      `IP:        ${selectedLog.ip || 'N/A'}`,
      `Details:   ${selectedLog.details || 'None'}`,
      `Record ID: ${selectedLog.id || 'N/A'}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Fetch from Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        return;
      }
      
      setLoading(true);
      const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(500));
      
      unsubscribeSnapshot = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => {
        console.warn('Could not fetch activity logs:', err);
        setLogs([]);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = filterByAcademicYear(logs, 'timestamp');
    return list.filter(l => {
      const q = search.toLowerCase();
      const matchSearch  = l.user?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.role?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q);
      const matchPeriod  = matchesPeriod(l.timestamp, period);
      const matchStatus  = statusFilter === 'all' || l.status === statusFilter;
      const matchRole    = roleFilter   === 'all' || l.role   === roleFilter || (roleFilter === 'Adviser' && (l.role || '').toLowerCase().includes('adviser'));
      return matchSearch && matchPeriod && matchStatus && matchRole;
    });
  }, [logs, search, period, statusFilter, roleFilter, selectedYear, filterByAcademicYear]);

  // reset page on filter change
  useEffect(() => setPage(1), [search, period, statusFilter, roleFilter]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const todayCount = logs.filter(l => matchesPeriod(l.timestamp, 'today')).length;

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action Performed', 'Status', 'IP Address', 'Details'];
    const rows    = filtered.map(l => [
      `${formatDate(l.timestamp)} ${formatTime(l.timestamp)}`,
      l.user, l.role, l.action, l.status, l.ip, l.details,
    ]);
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `activity_logs_${new Date().toISOString().split('T')[0]}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters  = () => { setSearch(''); setPeriod('today'); setStatus('all'); setRole('all'); };
  const hasFilter     = search || period !== 'today' || statusFilter !== 'all' || roleFilter !== 'all';

  // page number array with ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc; }, []);

  return (
    <div className="flex h-screen w-full bg-[#f5f0e6] dark:bg-[#121212] font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title="Activity Logs" breadcrumbs={['Monitoring', 'Activity Logs']} />

        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">

          <SectionTitle 
            sub="Track and audit all user activities across the system"
            action={
              <span className="bg-[#801e38] text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
                {todayCount} {todayCount === 1 ? 'entry' : 'entries'} today
              </span>
            }
          >
            Activity Logs
          </SectionTitle>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm text-stone-500 dark:text-stone-400">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by user, role, or action..."
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:border-[#801e38] focus:ring-1 focus:ring-[#801e38] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 dark:text-stone-200 cursor-pointer">✕</button>
              )}
            </div>

            {/* Period */}
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 font-medium outline-none cursor-pointer hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] focus:border-[#801e38] transition-all">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>

            {/* Status */}
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 font-medium outline-none cursor-pointer hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] focus:border-[#801e38] transition-all">
              <option value="all">All Status</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Role */}
            <select value={roleFilter} onChange={e => setRole(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 font-medium outline-none cursor-pointer hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] focus:border-[#801e38] transition-all">
              <option value="all">All Roles</option>
              <option value="System Admin">System Admin</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Dean">Dean</option>
              <option value="Adviser">Adviser</option>
              <option value="Student">Student</option>
            </select>

            {/* Clear */}
            {hasFilter && (
              <button onClick={clearFilters}
                className="px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-sm font-medium rounded-lg transition-all cursor-pointer">
                Clear
              </button>
            )}

            {/* Export CSV */}
            <div className="ml-auto">
              <PremiumButton onClick={handleExportCSV} variant="primary" icon={<Download className="w-4 h-4" />}>
                Export CSV
              </PremiumButton>
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <Card className="flex flex-col overflow-hidden mb-6">
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#801e38] text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-5 py-4 w-[130px] whitespace-nowrap">Timestamp</th>
                    <th className="px-5 py-4 min-w-[180px]">User</th>
                    <th className="px-4 py-4 text-center w-[130px] whitespace-nowrap">Role</th>
                    <th className="px-5 py-4 min-w-[200px]">Action Performed</th>
                    <th className="px-4 py-4 text-center w-[110px] whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-center w-[110px] whitespace-nowrap">IP Address</th>
                    <th className="px-5 py-4 text-right w-[110px] whitespace-nowrap">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-8 px-4">
                        <TableSkeleton rows={6} columns={7} />
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center text-stone-400">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">📋</span>
                          <p className="font-medium text-stone-500 dark:text-stone-400">
                            {logs.length === 0 ? 'No activity logs yet' : 'No logs match your filters'}
                          </p>
                          <p className="text-xs text-stone-400 max-w-xs text-center">
                            {logs.length === 0
                              ? 'Logs are recorded automatically when admins log in, create users, or perform actions in the system.'
                              : 'Try adjusting your search or filter settings.'}
                          </p>
                          {hasFilter && (
                            <button onClick={clearFilters} className="mt-2 text-xs text-[#801e38] underline cursor-pointer">
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50/80 dark:hover:bg-[#2a2a2a]/60 dark:bg-[#1e1e1e] transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-stone-800 dark:text-stone-100 font-semibold text-xs">{formatTime(log.timestamp)}</div>
                          <div className="text-stone-400 text-[10px]">{formatDate(log.timestamp)}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-stone-800 dark:text-stone-100 text-xs block max-w-[200px] truncate" title={log.user}>
                            {log.user || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getRoleBadgeClass(log.role)}`}>
                            {log.role || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-stone-700 dark:text-stone-200 text-xs font-medium block max-w-[260px] truncate" title={log.action}>
                            {log.action || 'Unknown action'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <StatusBadge status={log.status || 'success'} size="sm" />
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap text-xs font-mono text-stone-400 dark:text-stone-500">
                          {log.ip || 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-[#801e38] hover:text-white dark:bg-stone-800 dark:hover:bg-[#801e38] dark:hover:text-white text-stone-700 dark:text-stone-200 transition-all cursor-pointer shadow-xs border border-stone-200/70 dark:border-stone-700 hover:border-transparent"
                            title="View full log details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 dark:border-stone-800/50">
              <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                {filtered.length === 0
                  ? 'No entries'
                  : `Showing ${(page-1)*ROWS_PER_PAGE+1}–${Math.min(page*ROWS_PER_PAGE, filtered.length)} of ${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`
                }
              </span>
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >‹</button>

                {/* Page numbers */}
                {pageNumbers.map((p, idx) =>
                  p === '...' ? (
                    <span key={`e${idx}`} className="w-8 h-8 flex items-center justify-center text-stone-400 text-sm">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded font-bold shadow-sm cursor-pointer transition-all text-sm ${
                        page === p ? 'bg-[#801e38] text-white' : 'bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525]'
                      }`}
                    >{p}</button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525] shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >›</button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Activity Log Details Modal ─────────────────────────────── */}
        {selectedLog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setSelectedLog(null)}
          >
            <div 
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 px-6 bg-stone-50 dark:bg-[#252525] border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#801e38]/10 text-[#801e38] flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white leading-tight">
                      Activity Log Details
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {formatDate(selectedLog.timestamp)} at {formatTime(selectedLog.timestamp)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Action Banner */}
                <div className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 block mb-1">
                      Action Performed
                    </span>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white leading-snug">
                      {selectedLog.action || 'Unknown action'}
                    </h4>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 block">
                      {formatRelativeActivityTime(selectedLog.timestamp)}
                    </span>
                  </div>
                  <StatusBadge status={selectedLog.status || 'success'} />
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900/20 border border-stone-200/70 dark:border-stone-800">
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider block mb-1">
                      User / Actor
                    </span>
                    <span className="font-bold text-stone-800 dark:text-stone-200 block truncate" title={selectedLog.user}>
                      {selectedLog.user || 'Unknown'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900/20 border border-stone-200/70 dark:border-stone-800">
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider block mb-1">
                      Assigned Role
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getRoleBadgeClass(selectedLog.role)}`}>
                      {selectedLog.role || '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900/20 border border-stone-200/70 dark:border-stone-800">
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider block mb-1">
                      Date & Time
                    </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                      {formatDate(selectedLog.timestamp)} {formatTime(selectedLog.timestamp)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900/20 border border-stone-200/70 dark:border-stone-800">
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider block mb-1">
                      IP Address
                    </span>
                    <span className="font-mono text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                      {selectedLog.ip || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Details & Metadata Section */}
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                    Event Details & Context
                  </h5>
                  {selectedLog.details ? (
                    <div className="space-y-2">
                      {selectedLog.details.includes('|') ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedLog.details.split('|').map((part, idx) => {
                            const colonIdx = part.indexOf(':');
                            if (colonIdx !== -1) {
                              const label = part.slice(0, colonIdx).trim();
                              const val = part.slice(colonIdx + 1).trim();
                              return (
                                <div key={idx} className="bg-stone-50 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800">
                                  <span className="block text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">{label}</span>
                                  <span className="block text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1 break-all">{val}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={idx} className="bg-stone-50 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 font-medium">
                                {part.trim()}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed break-all">
                          {selectedLog.details}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-dashed border-stone-200 dark:border-stone-800 text-center">
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">No additional details recorded for this activity.</p>
                    </div>
                  )}
                </div>

                {/* Document ID */}
                {selectedLog.id && (
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                    <span>Record ID</span>
                    <span className="font-mono text-[10px]">{selectedLog.id}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 bg-stone-50 dark:bg-[#252525] border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={copyLogDetails}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" aria-hidden="true" />
                      <span>Copy Audit Details</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#801e38] hover:bg-[#601328] transition shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
