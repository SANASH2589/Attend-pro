import React, { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import attendanceApi from '../../api/attendance';
import classesApi from '../../api/classes';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Activity, 
  Eye, 
  Lock, 
  Unlock, 
  X, 
  Calendar, 
  User, 
  Search, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

/**
 * Administrative Attendance Monitoring Console page.
 * Displays stats summary pills, custom filters, check-in ledgers, and session locking managers.
 */
export default function AttendanceMonitoring() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Stats pills states
  const [stats, setStats] = useState({
    sessionsToday: 0,
    averageAttendance: 0,
    pendingLocks: 0
  });

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Default range: last 7 days
  const getPastDateString = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const [dateFrom, setDateFrom] = useState(getPastDateString(7));
  const [dateTo, setDateTo] = useState(getPastDateString(0));
  const [sessionSegment, setSessionSegment] = useState('all'); // 'all', 'morning', 'evening'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const limit = 10;

  // Slide-over drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Lock/Unlock confirmation ID state
  const [confirmingAction, setConfirmingAction] = useState(null); // { id, type: 'lock'|'unlock', name }

  const fetchStats = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // 1. Fetch today's session logs
      const { data: todaySessions } = await supabase
        .from('attendance_sessions')
        .select('id, total_students, total_absent, is_locked')
        .eq('session_date', todayStr);

      const sessionsTodayCount = (todaySessions || []).length;
      const pendingLocksCount = (todaySessions || []).filter(s => !s.is_locked).length;

      // 2. Fetch weekly statistics
      const weekAgoStr = getPastDateString(7);
      const { data: weeklySessions } = await supabase
        .from('attendance_sessions')
        .select('total_students, total_absent')
        .gte('session_date', weekAgoStr);

      let total = 0;
      let absent = 0;
      (weeklySessions || []).forEach(s => {
        total += s.total_students || 0;
        absent += s.total_absent || 0;
      });
      const present = Math.max(0, total - absent);
      const averageAttendanceVal = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({
        sessionsToday: sessionsTodayCount,
        averageAttendance: averageAttendanceVal,
        pendingLocks: pendingLocksCount
      });
    } catch (err) {
      console.warn('Dashboard stats aggregate warning:', err.message);
    }
  };

  const fetchClasses = async () => {
    try {
      const classesData = await classesApi.getAll();
      setClasses(classesData || []);
    } catch (err) {
      console.warn('Failed to load class filter registries:', err.message);
    }
  };

  const fetchSessionsList = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await attendanceApi.getAllSessions({
        class_id: selectedClassId,
        date_from: dateFrom,
        date_to: dateTo,
        page: currentPage,
        limit
      });

      // Client side filtering for segmented morning/evening types
      let sessionsData = result.sessions || [];
      if (sessionSegment !== 'all') {
        sessionsData = sessionsData.filter(s => s.session_type === sessionSegment);
      }

      setSessions(sessionsData);
      setTotalSessions(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to retrieve attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchSessionsList();
  }, [selectedClassId, dateFrom, dateTo, sessionSegment, currentPage]);

  const openDetailDrawer = async (sessionId) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const data = await attendanceApi.getSessionDetail(sessionId);
      setDrawerData(data);
    } catch (err) {
      showToast(err.message || 'Failed to load details.', 'error');
      setDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleLockSession = async (sessionId) => {
    setActionLoading(true);
    try {
      await attendanceApi.lockSession(sessionId);
      showToast('Attendance session manually locked.', 'success');
      setConfirmingAction(null);
      fetchSessionsList();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to lock session.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockSession = async (sessionId) => {
    setActionLoading(true);
    try {
      await attendanceApi.unlockSession(sessionId);
      showToast('Session unlocked. An audit log entry has been created.', 'warning');
      setConfirmingAction(null);
      fetchSessionsList();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to unlock session.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  const formatSubmittedTime = (timeStr) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    {
      label: 'Date',
      key: 'session_date',
      render: (row) => (
        <span className="font-semibold text-slate-700">{formatDate(row.session_date)}</span>
      )
    },
    {
      label: 'Class',
      key: 'class_name',
      render: (row) => (
        <span className="font-bold text-slate-800">{row.classes?.name || 'Unknown'}</span>
      )
    },
    {
      label: 'Staff Member',
      key: 'staff_name',
      render: (row) => (
        <span className="font-medium text-slate-600">{row.users?.full_name || 'Staff User'}</span>
      )
    },
    {
      label: 'Session',
      key: 'session_type',
      render: (row) => (
        <Badge variant={row.session_type === 'morning' ? 'warning' : 'neutral'}>
          {row.session_type === 'morning' ? 'Morning' : 'Evening'}
        </Badge>
      )
    },
    {
      label: 'Students',
      key: 'total_students',
      render: (row) => <span className="font-semibold text-slate-700">{row.total_students}</span>
    },
    {
      label: 'Present',
      key: 'present',
      render: (row) => {
        const present = (row.total_students || 0) - (row.total_absent || 0);
        return <span className="font-bold text-emerald-600">{present}</span>;
      }
    },
    {
      label: 'Absent',
      key: 'absent',
      render: (row) => {
        const absent = row.total_absent || 0;
        return absent > 0 ? (
          <span className="font-bold text-red-600">{absent}</span>
        ) : (
          <span className="text-slate-300 font-medium">&mdash;</span>
        );
      }
    },
    {
      label: '%',
      key: 'percentage',
      render: (row) => {
        const present = (row.total_students || 0) - (row.total_absent || 0);
        const rate = row.total_students ? Math.round((present / row.total_students) * 100) : 0;
        
        let colorClass = 'text-red-600';
        if (rate >= 75) colorClass = 'text-emerald-600';
        else if (rate >= 50) colorClass = 'text-amber-500';

        return <span className={`font-bold ${colorClass}`}>{rate}%</span>;
      }
    },
    {
      label: 'Status',
      key: 'is_locked',
      render: (row) => (
        <Badge variant={row.is_locked ? 'neutral' : 'success'}>
          {row.is_locked ? 'Locked' : 'Submitted'}
        </Badge>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => {
        const isConfirming = confirmingAction && confirmingAction.id === row.id;

        if (isConfirming) {
          return (
            <div className="flex items-center gap-1 animate-fade-in shrink-0">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirmingAction.type === 'lock') {
                    handleLockSession(row.id);
                  } else {
                    handleUnlockSession(row.id);
                  }
                }}
                disabled={actionLoading}
                className="py-1 px-2.5 text-[10px]"
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingAction(null)}
                disabled={actionLoading}
                className="py-1 px-2.5 text-[10px] bg-white"
              >
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={() => openDetailDrawer(row.id)}
              className="p-1 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer focus:outline-none"
              title="View Detail"
            >
              <Eye className="w-4 h-4 shrink-0" />
            </button>
            {row.is_locked ? (
              <button
                onClick={() => setConfirmingAction({ id: row.id, type: 'unlock', name: row.classes?.name })}
                className="p-1 rounded-lg hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors cursor-pointer focus:outline-none"
                title="Unlock Session"
              >
                <Unlock className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmingAction({ id: row.id, type: 'lock', name: row.classes?.name })}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus:outline-none"
                title="Lock Session"
              >
                <Lock className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Monitoring</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Track classroom ratios, lock timelines, and review check-in events.</p>
      </div>

      {/* Metrics pills row */}
      <div className="flex items-center gap-3 w-full select-none flex-wrap">
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Sessions today:</span>
          <span className="font-bold text-slate-800">{stats.sessionsToday}</span>
        </div>
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Weekly Avg Attendance:</span>
          <span className="font-bold text-emerald-600">{stats.averageAttendance}%</span>
        </div>
        <div className="px-3.5 py-1.5 bg-white border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-2 shadow-sm">
          <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Pending Lock:</span>
          <span className="font-bold text-amber-600">{stats.pendingLocks} sessions</span>
        </div>
      </div>

      {/* Error display banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load monitoring logs</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchSessionsList} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Filters row */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full select-none">
        <div className="flex items-center flex-wrap gap-4">
          {/* Class filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Section:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Class Sections</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-500">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Session type segment toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Batch:</span>
            <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5">
              {['all', 'morning', 'evening'].map(type => (
                <button
                  key={type}
                  onClick={() => setSessionSegment(type)}
                  className={`py-1 px-3.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    sessionSegment === type
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold shrink-0">
          Showing {sessions.length} of {totalSessions} records
        </div>
      </div>

      {/* Table display */}
      <div className="w-full">
        <Table
          columns={columns}
          data={sessions}
          loading={loading}
          emptyMessage="No attendance session logs matched your filters."
        />
      </div>

      {/* Slide-over details drawer */}
      <div className={`fixed inset-0 z-50 overflow-hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="absolute inset-y-0 right-0 max-w-md w-full flex pl-10">
          <div
            className={`w-full bg-white shadow-2xl relative flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-l border-slate-200/80 ${
              drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between select-none">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  {drawerLoading ? 'Syncing...' : drawerData?.session?.classes?.name}
                </h3>
                {!drawerLoading && drawerData?.session && (
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {formatDate(drawerData.session.session_date)} &bull; {drawerData.session.session_type === 'morning' ? 'Morning' : 'Evening'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <span className="text-xs font-semibold">Retrieving session records...</span>
                </div>
              ) : drawerData ? (
                <div className="space-y-6">
                  {/* Stats metric boxes */}
                  <div className="grid grid-cols-3 gap-2.5 select-none text-center">
                    <div className="bg-slate-50 border border-slate-100 py-3 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-slate-700">
                        {drawerData.session.total_students}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Total</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 py-3 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-emerald-600">
                        {drawerData.session.total_students - drawerData.session.total_absent}
                      </span>
                      <span className="text-[9px] text-emerald-500 uppercase tracking-wider mt-0.5 font-bold">Present</span>
                    </div>
                    <div className="bg-red-50/50 border border-red-100 py-3 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-red-600">
                        {drawerData.session.total_absent}
                      </span>
                      <span className="text-[9px] text-red-500 uppercase tracking-wider mt-0.5 font-bold">Absent</span>
                    </div>
                  </div>

                  {/* Student list */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      Roster Records Details
                    </h4>
                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden">
                      {drawerData.records.map((rec) => {
                        const isAbsent = rec.status === 'absent';
                        return (
                          <div key={rec.id} className="p-3 hover:bg-slate-50/20 flex items-center justify-between gap-3 transition-colors">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-slate-700 truncate">{rec.student?.full_name}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{rec.student?.roll_number}</span>
                            </div>
                            <Badge variant={isAbsent ? 'danger' : 'success'}>
                              {isAbsent ? 'Absent' : 'Present'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Session record logs could not be loaded.
                </div>
              )}
            </div>

            {!drawerLoading && drawerData?.session && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center select-none shrink-0 flex flex-col items-center justify-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Submitted by {drawerData.session.users?.full_name || 'Staff User'}
                </span>
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  Time: {formatSubmittedTime(drawerData.session.submitted_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
