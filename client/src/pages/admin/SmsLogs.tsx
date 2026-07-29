import React, { useState, useEffect } from 'react';
import Table, { TableColumn } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { request } from '../../api/base';
import { Search, Filter, AlertCircle, MessageSquare } from 'lucide-react';

interface SmsLogRecord {
  id: string;
  phone_number: string;
  message_body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string;
  students?: {
    full_name: string;
    roll_number: string;
  };
}

/**
 * SMS Logs Page (Super Admin).
 * Displays a paginated directory of sent SMS notifications with delivery states.
 */
export default function SmsLogs() {
  const [logs, setLogs] = useState<SmsLogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await request(
        `/api/sms/logs?search=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(selectedStatus)}&page=${page}&limit=30`,
        { method: 'GET' }
      );
      setLogs(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to sync live SMS log registries.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when page or status dropdown filter changes
  useEffect(() => {
    fetchLogs();
  }, [selectedStatus, page]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setPage(1);
      fetchLogs();
    }
  };

  const handleSearchTrigger = () => {
    setPage(1);
    fetchLogs();
  };

  const formatSmsDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month} · ${time}`;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'sent' || s === 'delivered') {
      return <Badge variant="success">{s === 'sent' ? 'Sent' : 'Delivered'}</Badge>;
    }
    if (s === 'failed') {
      return <Badge variant="danger">Failed</Badge>;
    }
    if (s === 'pending') {
      return <Badge variant="warning">Pending</Badge>;
    }
    return <Badge variant="neutral">{status}</Badge>;
  };

  const columns: TableColumn<SmsLogRecord>[] = [
    {
      label: 'Student Name',
      key: 'students',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-[14px]">
            {row.students?.full_name || <span className="text-slate-300 italic">No Student Linked</span>}
          </span>
          {row.students?.roll_number && (
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Roll No: {row.students.roll_number}</span>
          )}
        </div>
      )
    },
    {
      label: 'Parent Phone',
      key: 'phone_number',
      render: (row) => (
        <span className="font-medium text-slate-500 text-[13px]">
          {row.phone_number}
        </span>
      )
    },
    {
      label: 'Message',
      key: 'message_body',
      render: (row) => {
        const body = row.message_body || '';
        const isTruncated = body.length > 60;
        const displayBody = isTruncated ? `${body.substring(0, 60)}...` : body;
        return (
          <span 
            className="text-slate-600 text-[13px]" 
            title={body}
          >
            {displayBody}
          </span>
        );
      }
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      label: 'Date & Time',
      key: 'sent_at',
      render: (row) => (
        <span className="font-medium text-slate-400 text-[13px]">
          {formatSmsDate(row.sent_at)}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">SMS Logs</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Review delivery status of text notifications dispatched to parent phone registries.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load SMS logs</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={fetchLogs} 
            className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full select-none">
        <div className="flex items-center gap-3 w-full max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by student name... (Press Enter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/40 border border-slate-200/50 focus:border-blue-500/80 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/5"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSearchTrigger}
            className="py-2 px-3 border border-slate-200 bg-white"
          >
            Search
          </Button>
          
          <div className="w-px h-6 bg-slate-200 shrink-0" />

          {/* Status Filter */}
          <div className="relative flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total: {total} log records matched
        </div>
      </div>

      {/* Data Table with custom empty state */}
      <div className="w-full">
        {loading ? (
          <Table
            columns={columns}
            data={[]}
            loading={true}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No SMS logs found"
            description="Logs appear after sessions are locked."
          />
        ) : (
          <div className="flex flex-col">
            <Table
              columns={columns}
              data={logs}
              loading={false}
            />
            {total > 30 && (
              <div className="flex justify-between items-center px-4 py-3 bg-white border border-t-0 border-slate-200/60 rounded-b-2xl shadow-sm">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                  className="px-3.5 py-1.5 text-xs font-semibold"
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-400 font-semibold">
                  Page {page} of {Math.ceil(total / 30)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= Math.ceil(total / 30)}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-3.5 py-1.5 text-xs font-semibold"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
