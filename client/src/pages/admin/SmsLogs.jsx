import React, { useState, useEffect, useCallback } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import smsApi from '../../api/sms';
import classesApi from '../../api/classes';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

/**
 * Admin SMS Logs page — shows all SMS notifications with filters and per-row retry.
 */
export default function SmsLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState('');

  // Stats
  const [sentToday, setSentToday] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalWeek, setTotalWeek] = useState(0);

  // Filters
  const getPastDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };
  const [dateFrom, setDateFrom] = useState(getPastDate(7));
  const [dateTo, setDateTo] = useState(getPastDate(0));
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 30;

  const fetchStats = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const weekAgo = getPastDate(7);

      const { data: todayLogs } = await supabase
        .from('sms_logs')
        .select('status')
        .gte('sent_at', `${todayStr}T00:00:00`);

      const { data: weekLogs } = await supabase
        .from('sms_logs')
        .select('status')
        .gte('sent_at', `${weekAgo}T00:00:00`);

      setSentToday((todayLogs || []).filter(l => l.status === 'sent' || l.status === 'delivered').length);
      setFailedCount((todayLogs || []).filter(l => l.status === 'failed').length);
      setTotalWeek((weekLogs || []).length);
    } catch (err) {
      console.warn('SMS stats fetch failed:', err.message);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await smsApi.getSmsLogs({
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: currentPage,
        limit
      });
      let filteredLogs = result.logs || [];

      // Client-side class filter (logs have session.classes.name)
      if (selectedClassId) {
        filteredLogs = filteredLogs.filter(l => {
          const className = l.session?.classes?.name || '';
          return className.toLowerCase().includes(selectedClassId.toLowerCase());
        });
      }

      // Client-side search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredLogs = filteredLogs.filter(l =>
          (l.student?.full_name || '').toLowerCase().includes(term) ||
          (l.student?.roll_number || '').toLowerCase().includes(term)
        );
      }

      setLogs(filteredLogs);
      setTotalLogs(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to retrieve SMS logs.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, currentPage, selectedClassId, searchTerm]);

  const fetchClasses = async () => {
    try {
      const data = await classesApi.getAll();
      setClasses(data || []);
    } catch (err) {
      console.warn('Failed to load classes:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, dateFrom, dateTo, currentPage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedClassId]);

  const handleRetryRow = async (log) => {
    if (!log.session_id) return;
    setRetryingId(log.id);
    try {
      await smsApi.retrySessionSms(log.session_id);
      showToast('SMS retry initiated successfully.', 'success');
      fetchLogs();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Retry failed.', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    // Collect unique session IDs from failed logs
    const sessionIds = [...new Set(logs.filter(l => l.status === 'failed').map(l => l.session_id).filter(Boolean))];
    if (sessionIds.length === 0) return;

    try {
      for (const sid of sessionIds) {
        await smsApi.retrySessionSms(sid);
      }
      showToast(`Retried ${sessionIds.length} session(s) with failed SMS.`, 'success');
      fetchLogs();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Retry failed.', 'error');
    }
  };

  const formatSentAt = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} · ${time}`;
  };

  const statusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-50 text-blue-600 border-blue-100',
      delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      failed: 'bg-red-50 text-red-600 border-red-100',
      pending: 'bg-amber-50 text-amber-600 border-amber-100'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none ${styles[status] || styles.pending}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </span>
    );
  };

  const columns = [
    {
      label: 'Sent at',
      key: 'sent_at',
      render: (row) => (
        <span className="text-[13px] text-slate-500 font-medium">{formatSentAt(row.sent_at)}</span>
      )
    },
    {
      label: 'Student',
      key: 'student',
      render: (row) => (
        <span className="text-sm font-medium text-slate-800">{row.student?.full_name || '—'}</span>
      )
    },
    {
      label: 'Roll no.',
      key: 'roll_number',
      render: (row) => (
        <span className="text-[13px] font-bold text-blue-600">{row.student?.roll_number || '—'}</span>
      )
    },
    {
      label: 'Class',
      key: 'class',
      render: (row) => (
        <span className="text-[13px] text-slate-500">{row.session?.classes?.name || '—'}</span>
      )
    },
    {
      label: 'Session',
      key: 'session_type',
      render: (row) => {
        const type = row.session?.session_type;
        return type ? (
          <Badge variant={type === 'morning' ? 'warning' : 'neutral'}>
            {type === 'morning' ? 'Morning' : 'Evening'}
          </Badge>
        ) : <span className="text-slate-300">—</span>;
      }
    },
    {
      label: 'Phone',
      key: 'phone_number',
      render: (row) => (
        <span className="text-[13px] text-slate-400 font-mono">{row.phone_number || '—'}</span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => statusBadge(row.status)
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => {
        if (row.status !== 'failed') return null;
        return (
          <button
            onClick={() => handleRetryRow(row)}
            disabled={retryingId === row.id}
            className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {retryingId === row.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RotateCcw className="w-3 h-3" />
            )}
            Retry
          </button>
        );
      }
    }
  ];

  const statusOptions = ['', 'sent', 'delivered', 'failed', 'pending'];
  const statusLabels = ['All', 'Sent', 'Delivered', 'Failed', 'Pending'];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">SMS Logs</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Track parent notification deliveries, retries, and failures.</p>
      </div>

      {/* Summary Pills */}
      <div className="flex items-center gap-3 w-full select-none flex-wrap">
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>{sentToday} sent today</span>
        </div>
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span>{failedCount} failed</span>
          {failedCount > 0 && (
            <button
              onClick={handleRetryAllFailed}
              className="text-[13px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer ml-1"
            >
              Retry all failed
            </button>
          )}
        </div>
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span>{totalWeek} total this week</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load SMS logs</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchLogs} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 w-full select-none">
        <div className="flex items-center flex-wrap gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[140px]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[140px]"
            />
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Status segmented control */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5">
            {statusOptions.map((val, i) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`py-1 px-3 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  statusFilter === val
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {statusLabels[i]}
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Class dropdown */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[180px]"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.name}>{cls.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 pl-8 pr-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none w-[240px] placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        {!loading && logs.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 shrink-0" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 tracking-tight mb-1">No SMS logs found</h4>
            <p className="text-xs text-slate-400 text-center max-w-sm">SMS notifications will appear here once sessions are locked and absentee alerts are dispatched.</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={logs}
            loading={loading}
            emptyMessage="No SMS logs matched your filters."
          />
        )}
      </div>
    </div>
  );
}
