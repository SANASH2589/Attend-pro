import React, { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import attendanceApi from '../../api/attendance';
import classesApi from '../../api/classes';
import { useToast } from '../../context/ToastContext';
import { 
  History as HistoryIcon,
  X, 
  Calendar, 
  User, 
  Lock, 
  Unlock,
  Loader2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

/**
 * Staff Attendance History review logs.
 * Lists historical check-ins with filters and slide-out detail drawers.
 */
export default function History() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Get current year and month in YYYY-MM format
  const getCurrentMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Slide-over drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSessionId, setDrawerSessionId] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchFiltersAndSessions = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch assigned classes
      const myClasses = await attendanceApi.getMyClasses();
      setClasses(myClasses || []);

      // 2. Fetch all sessions (filtered client-side or backend depending on params)
      const data = await attendanceApi.getAllSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndSessions();
  }, []);

  // Fetch drawer details
  const openDetailDrawer = async (sessionId) => {
    setDrawerSessionId(sessionId);
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

  const closeDetailDrawer = () => {
    setDrawerOpen(false);
    setDrawerSessionId(null);
    setDrawerData(null);
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

  // Client-side filtering by class and month (since stats are loaded locally)
  const filteredSessions = sessions.filter(s => {
    // Class filter
    const matchesClass = selectedClassId ? s.class_id === selectedClassId : true;
    
    // Month filter (s.session_date is YYYY-MM-DD, selectedMonth is YYYY-MM)
    const matchesMonth = selectedMonth ? s.session_date.startsWith(selectedMonth) : true;

    return matchesClass && matchesMonth;
  });

  const columns = [
    {
      label: 'Session Date',
      key: 'session_date',
      render: (row) => (
        <span className="font-semibold text-slate-700">{formatDate(row.session_date)}</span>
      )
    },
    {
      label: 'Class Section',
      key: 'class_name',
      render: (row) => (
        <span className="font-bold text-slate-800">{row.classes?.name || 'Unknown'}</span>
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
      label: 'Present Count',
      key: 'present',
      render: (row) => {
        const present = (row.total_students || 0) - (row.total_absent || 0);
        return <span className="font-bold text-emerald-600">{present}</span>;
      }
    },
    {
      label: 'Absent Count',
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
      label: 'Status State',
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
      render: (row) => (
        <button
          onClick={() => openDetailDrawer(row.id)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer select-none"
        >
          View Details
        </button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full relative">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Logs</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Review history reports and student status registers.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load history logs</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchFiltersAndSessions} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Control Filter row */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full select-none">
        <div className="flex items-center flex-wrap gap-4.5">
          {/* Class selection dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Section:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Assigned Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-200" />

          {/* Month Pick */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Timeline Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold">
          Count: {filteredSessions.length} sessions logged
        </div>
      </div>

      {/* Sessions Table */}
      <div className="w-full">
        <Table
          columns={columns}
          data={filteredSessions}
          loading={loading}
          emptyMessage="No historical check-in sessions matched your filter criteria."
        />
      </div>

      {/* ============================================================
          SLIDE-OVER DETAIL DRAWER
         ============================================================ */}
      <div className={`fixed inset-0 z-50 overflow-hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop Overlay */}
        <div
          onClick={closeDetailDrawer}
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
            {/* Drawer Header */}
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
                onClick={closeDetailDrawer}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 overflow-y-auto p-5">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <span className="text-xs font-semibold">Retrieving session records...</span>
                </div>
              ) : drawerData ? (
                <div className="space-y-6">
                  {/* Metric Box Stats */}
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

                  {/* Student list status */}
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

            {/* Drawer Footer details */}
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
