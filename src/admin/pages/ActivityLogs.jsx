import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Card, SectionTitle, PremiumButton } from '../../components/ui/Card';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Download } from 'lucide-react';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const ROWS_PER_PAGE = 10;

const roleColors = {
  'System Admin': 'bg-[#801e38]/10 text-[#801e38] border border-[#801e38]/20',
  'Super Admin':  'bg-red-100 text-red-700 border border-red-200',
  'Dean':         'bg-pink-100 text-pink-700 border border-pink-200',
  'Adviser':      'bg-amber-100 text-amber-700 border border-amber-200',
  'Student':      'bg-blue-100 text-blue-700 border border-blue-200',
  '—':            'bg-stone-100 dark:bg-stone-800 text-stone-400',
};

const statusColors = {
  Success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Failed:  'bg-red-100 text-red-700 border border-red-200',
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
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
  const { selectedYear, filterByAcademicYear } = useAcademicYear();

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
      const matchRole    = roleFilter   === 'all' || l.role   === roleFilter;
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
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#801e38] text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Action Performed</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
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
                      <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-[#2a2a2a] dark:bg-[#252525]/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-stone-800 dark:text-stone-100 font-semibold text-xs">{formatTime(log.timestamp)}</div>
                          <div className="text-stone-400 text-[10px]">{formatDate(log.timestamp)}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-stone-800 dark:text-stone-100 whitespace-nowrap">{log.user}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleColors[log.role] || 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'}`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-700 dark:text-stone-200 max-w-[220px]">{log.action}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[log.status] || 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-400 whitespace-nowrap text-xs font-mono">{log.ip}</td>
                        <td className="px-6 py-4 text-stone-400 whitespace-nowrap text-xs">{log.details}</td>
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

        </div>
      </main>
    </div>
  );
}
