import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import attendanceApi from '../../api/attendance';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Table, { TableColumn } from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { 
  Clock, 
  CheckCircle2, 
  Lock, 
  AlertCircle, 
  Play, 
  Loader2,
  Calendar,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  School,
  Users2,
  CheckCircle,
  Info,
  XCircle,
  Search,
  ChevronLeft,
  Users,
  CalendarDays
} from 'lucide-react';

interface SessionInfo {
  status: 'open' | 'locked' | 'not_yet_open' | 'closed';
  is_locked: boolean;
  opens_at?: string;
  locks_at?: string;
}

interface DashboardClass {
  id: string;
  name: string;
  batch_type: 'morning' | 'evening' | 'both';
  morning_start?: string;
  morning_lock?: string;
  evening_start?: string;
  evening_lock?: string;
  sessions: {
    morning: SessionInfo;
    evening: SessionInfo;
  };
}

/**
 * Faculty Academic Workspace Console Dashboard.
 * Displays classes assigned to staff with polling indicators and navigation links.
 */
export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Attendance Workspace state
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [activeSessionType, setActiveSessionType] = useState<'morning' | 'evening'>('morning');
  const [sessionStatus, setSessionStatus] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Loading & error states
  const [workspaceLoading, setWorkspaceLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [workspaceError, setWorkspaceError] = useState<string>('');
  
  // Countdown/Time state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeToOpen, setTimeToOpen] = useState<number>(0);
  
  // Modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  
  const countdownIntervalRef = useRef<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return sessionStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleToggle = () => {
      setSidebarCollapsed(sessionStorage.getItem('sidebar-collapsed') === 'true');
    };
    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  const fetchStaffDashboard = async () => {
    setError('');
    try {
      const data = await attendanceApi.getMyClasses();
      setClasses(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve assigned class structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffDashboard();
    
    // Poll session status every 60 seconds
    const interval = setInterval(() => {
      fetchStaffDashboard();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Browser-native beforeunload warning handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance. Leave anyway?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const currentClass = useMemo(
    () => classes.find((item) => item.id === selectedClass) ?? null,
    [classes, selectedClass]
  );
  const currentSessionInfo = sessionStatus ? sessionStatus[activeSessionType] : null;
  const status = currentSessionInfo?.status;
  const isLockedView = currentSessionInfo?.status === 'locked' || currentSessionInfo?.is_submitted;
  const canEditRoster = Boolean(selectedClass && currentSessionInfo?.status === 'open' && !isLockedView);

  // Timers and countdown management
  useEffect(() => {
    if (!currentSessionInfo || workspaceLoading) return;

    const calculateTimes = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (currentSessionInfo.status === 'not_yet_open' && currentSessionInfo.opens_at) {
        const opensAtDate = new Date(`${todayStr}T${currentSessionInfo.opens_at}:00`);
        const diff = opensAtDate.getTime() - now.getTime();
        setTimeToOpen(Math.max(0, diff));
      } else if (currentSessionInfo.status === 'open' && currentSessionInfo.locks_at) {
        const locksAtDate = new Date(`${todayStr}T${currentSessionInfo.locks_at}:00`);
        const diff = locksAtDate.getTime() - now.getTime();
        setTimeRemaining(Math.max(0, diff));
      }
    };

    calculateTimes();
    countdownIntervalRef.current = setInterval(calculateTimes, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentSessionInfo, workspaceLoading]);

  const formatCountdown = (diffMs: number) => {
    if (diffMs <= 0) return '0s';
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  const loadWorkspaceData = async (classId: string, sessionType: 'morning' | 'evening') => {
    setWorkspaceLoading(true);
    setWorkspaceError('');
    setAbsentIds([]);
    setSearchQuery('');
    setIsDirty(false);
    try {
      const statusData = await attendanceApi.getSessionStatus(classId);
      setSessionStatus(statusData);

      const studentsData = await attendanceApi.getClassStudents(classId);
      setStudents(studentsData || []);
    } catch (err: any) {
      setWorkspaceError(err.message || 'Failed to load attendance configurations.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    if (!canEditRoster) return;
    setIsDirty(true);
    setAbsentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const setStudentPresence = (studentId: string, isPresent: boolean) => {
    if (!canEditRoster) return;
    setIsDirty(true);
    setAbsentIds((prev) => {
      const isAbsent = prev.includes(studentId);
      if (isPresent && isAbsent) {
        return prev.filter((id) => id !== studentId);
      }
      if (!isPresent && !isAbsent) {
        return [...prev, studentId];
      }
      return prev;
    });
  };

  const getAbsentStudentsList = () => {
    return students.filter(s => absentIds.includes(s.id));
  };

  const handleSubmit = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      const result = await attendanceApi.submitAttendance({
        class_id: selectedClass,
        session_type: activeSessionType,
        absent_student_ids: absentIds
      });

      showToast(`Attendance submitted for ${result.total_students} students successfully!`, 'success');
      setIsDirty(false);
      setIsVerifyModalOpen(false);
      setSelectedClass(null);
      fetchStaffDashboard();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit attendance sheet.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeAttendance = (classId: string, sessionType: 'morning' | 'evening') => {
    setSelectedClass(classId);
    setActiveSessionType(sessionType);
    loadWorkspaceData(classId, sessionType);
    
    setTimeout(() => {
      document.getElementById('attendance-workspace-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const presentCount = students.length - absentIds.length;
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      return s.full_name.toLowerCase().includes(query) || s.roll_number.toLowerCase().includes(query);
    });
  }, [students, searchQuery]);

  const rosterColumns: TableColumn<any>[] = useMemo(() => [
    {
      label: 'Roll No',
      key: 'roll_number',
      render: (row) => <span className="font-mono font-bold text-slate-500">{row.roll_number}</span>
    },
    {
      label: 'Student',
      key: 'full_name',
      render: (row) => <span className="font-semibold text-slate-900">{row.full_name}</span>
    },
    {
      label: 'Attendance',
      key: 'status',
      render: (row) => {
        const isAbsent = absentIds.includes(row.id);
        return (
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setStudentPresence(row.id, true)}
              disabled={!canEditRoster}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                !isAbsent ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Present
            </button>
            <button
              type="button"
              onClick={() => setStudentPresence(row.id, false)}
              disabled={!canEditRoster}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                isAbsent ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Absent
            </button>
          </div>
        );
      }
    }
  ], [absentIds, canEditRoster]);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodayDateString = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  };

  const summary = useMemo(() => {
    const sessionValues = classes.flatMap((cls) => [cls.sessions.morning, cls.sessions.evening]);
    return {
      open: sessionValues.filter((session) => session.status === 'open').length,
      upcoming: sessionValues.filter((session) => session.status === 'not_yet_open').length,
      locked: sessionValues.filter((session) => session.status === 'locked' || session.status === 'closed').length,
      totalClasses: classes.length
    };
  }, [classes]);

  const formatTimeString = (timeStr?: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${m} ${suffix}`;
  };

  const getStatusBadge = (sessionInfo: SessionInfo) => {
    const { status, is_locked, opens_at } = sessionInfo;
    
    if (status === 'open') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 select-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Open
        </span>
      );
    }
    if (status === 'locked') {
      if (is_locked) {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 select-none">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Locked
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 select-none">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Submitted
        </span>
      );
    }
    if (status === 'not_yet_open') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 select-none">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Opens at {formatTimeString(opens_at)}
        </span>
      );
    }
    if (status === 'closed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 select-none">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Closed
        </span>
      );
    }
    return <span className="text-slate-300 select-none">&mdash;</span>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider select-none">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-6 md:p-8 shadow-sm overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-blue-100/50 to-transparent pointer-events-none" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Staff dashboard
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                {getGreeting()}, {user?.name || 'Faculty Member'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm md:text-[15px] text-slate-500 leading-relaxed">
                Review today’s classes, check the active attendance windows, and jump straight into the roster when a session is open.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200 px-3 py-1 shadow-sm">
                <Calendar className="h-3.5 w-3.5" />
                {getTodayDateString()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-slate-200 px-3 py-1 shadow-sm">
                <School className="h-3.5 w-3.5" />
                {summary.totalClasses} assigned classes
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => {
              document.getElementById('assigned-classes-header')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              View today's classes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => navigate('/staff/history')}>
              View history
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <Play className="h-4 w-4 text-emerald-500" />
              Open sessions
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.open}</div>
            <div className="text-xs text-slate-500 mt-1">Ready to collect attendance now.</div>
          </div>
          <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <Clock className="h-4 w-4 text-amber-500" />
              Upcoming sessions
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.upcoming}</div>
            <div className="text-xs text-slate-500 mt-1">Scheduled later today.</div>
          </div>
          <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-slate-500" />
              Locked or closed
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.locked}</div>
            <div className="text-xs text-slate-500 mt-1">Already submitted or unavailable.</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load classes</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={fetchStaffDashboard} className="text-xs font-bold text-red-700 underline hover:text-red-800 ml-4 shrink-0">
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3" id="assigned-classes-header">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 select-none">
          Your classes today
        </h2>
        <span className="text-xs font-semibold text-slate-400 select-none">
          Tap an open session to begin
        </span>
      </div>

        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-slate-200 rounded-[28px] bg-white select-none shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 shrink-0" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 tracking-tight mb-1">
              No Assigned Class Mappings
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
              You are not assigned to instruct any active class sections today. Please contact administration for curriculum assignments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {classes.map((c) => {
              const showMorningAction = c.sessions.morning.status === 'open';
              const showEveningAction = c.sessions.evening.status === 'open';

              return (
                <div 
                  key={c.id} 
                  className="relative overflow-hidden bg-white border border-slate-200/70 hover:border-slate-300 rounded-[24px] p-5 shadow-sm flex flex-col justify-between transition-all min-h-[220px] hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />
                  <div>
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight">{c.name}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5" />
                          {c.batch_type === 'both' ? 'Dual session class' : c.batch_type === 'morning' ? 'Morning session class' : 'Evening session class'}
                        </p>
                      </div>
                      <Badge variant={c.batch_type === 'both' ? 'success' : c.batch_type === 'morning' ? 'warning' : 'neutral'}>
                        {c.batch_type === 'both' ? 'Double' : c.batch_type === 'morning' ? 'Morning' : 'Evening'}
                      </Badge>
                    </div>

                    {/* Middle Section: Session Indicators */}
                    <div className="mt-5 space-y-3">
                      {/* Morning Session Info */}
                      {(c.batch_type === 'morning' || c.batch_type === 'both') && (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 select-none">
                            Morning &bull; {formatTimeString(c.morning_start)} &ndash; {formatTimeString(c.morning_lock)}
                          </span>
                          {getStatusBadge(c.sessions.morning)}
                        </div>
                      )}

                      {/* Evening Session Info */}
                      {(c.batch_type === 'evening' || c.batch_type === 'both') && (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 select-none">
                            Evening &bull; {formatTimeString(c.evening_start)} &ndash; {formatTimeString(c.evening_lock)}
                          </span>
                          {getStatusBadge(c.sessions.evening)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action trigger links */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    {showMorningAction && (
                      <button
                        onClick={() => handleTakeAttendance(c.id, 'morning')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition-colors w-fit select-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-blue-600 shrink-0" />
                        Take Morning Attendance &rarr;
                      </button>
                    )}
                    {showEveningAction && (
                      <button
                        onClick={() => handleTakeAttendance(c.id, 'evening')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition-colors w-fit select-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-blue-600 shrink-0" />
                        Take Evening Attendance &rarr;
                      </button>
                    )}
                    {!showMorningAction && !showEveningAction && (
                      <span className="text-[10px] font-semibold text-slate-400 italic select-none">
                        No active attendance windows open right now.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Inline Attendance Take Workspace */}
      {selectedClass && (
        <div id="attendance-workspace-section" className="mt-8 border-t border-slate-200 pt-8 space-y-6">
          {workspaceLoading ? (
            <div className="flex min-h-125 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider select-none">
                Loading attendance workspace...
              </span>
            </div>
          ) : workspaceError ? (
            <div className="mx-auto flex max-w-md flex-col items-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-500 shrink-0" />
              <h3 className="mt-4 text-lg font-bold text-slate-900">Configuration error</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{workspaceError}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                    setSelectedClass(null);
                    setIsDirty(false);
                  }}
                >
                  Close Workspace
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-28">
              <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-blue-50/60 p-6 md:p-7 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        if (isDirty) {
                          if (window.confirm('You have unsaved changes. Leave this roster?')) {
                            setSelectedClass(null);
                            setIsDirty(false);
                          }
                        } else {
                          setSelectedClass(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      &larr; Back to classes
                    </button>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{currentClass?.name || 'Attendance workspace'}</h1>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-2xl">
                        Toggle a student to absent, keep the rest present by default, then confirm once. After submission, the session is locked and cannot be changed.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                    <Badge variant={activeSessionType === 'morning' ? 'warning' : 'neutral'}>
                      {activeSessionType === 'morning' ? 'Morning session' : 'Evening session'}
                    </Badge>
                    <Badge variant="neutral">{students.length} students</Badge>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Present</div>
                    <div className="mt-2 text-3xl font-bold text-emerald-600">{presentCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Absent</div>
                    <div className="mt-2 text-3xl font-bold text-red-600">{absentIds.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Window</div>
                    <div className="mt-2 text-sm font-semibold text-slate-700 leading-relaxed">
                      Closes in {formatCountdown(timeRemaining)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-relaxed text-blue-800 shadow-sm">
                <Info className="mr-2 inline-block h-4 w-4 align-[-2px] text-blue-600" />
                Students are marked <strong>present</strong> by default. Use the Present / Absent toggle in the table to change status.
              </div>

              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Student roster</h2>
                    <p className="mt-1 text-xs text-slate-500">Use the toggle buttons to mark absence, then submit once to lock the session.</p>
                  </div>
                  <Badge variant="neutral">{filteredStudents.length} visible</Badge>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="py-20 text-center text-sm text-slate-400">
                    No students found for your search.
                  </div>
                ) : (
                  <Table columns={rosterColumns} data={filteredStudents} emptyMessage="No students found for your search." />
                )}
              </div>

              <div 
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300"
                style={{
                  left: typeof window !== 'undefined' && window.innerWidth >= 1024 
                    ? (sidebarCollapsed ? '88px' : '256px') 
                    : '0px'
                }}
              >
                <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-medium text-slate-600">
                    <span className={absentIds.length > 0 ? 'font-bold text-red-600' : 'font-bold text-slate-500'}>
                      {absentIds.length} absent
                    </span>
                    <span className="text-slate-400"> and </span>
                    <span className="font-bold text-emerald-600">{presentCount} present</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (isDirty) {
                          if (window.confirm('You have unsaved changes. Leave this roster?')) {
                            setSelectedClass(null);
                            setIsDirty(false);
                          }
                        } else {
                          setSelectedClass(null);
                        }
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setIsVerifyModalOpen(true)}
                      disabled={!canEditRoster || students.length === 0}
                    >
                      Review & confirm
                    </Button>
                  </div>
                </div>
              </div>

              <Modal
                isOpen={isVerifyModalOpen}
                onClose={() => setIsVerifyModalOpen(false)}
                title="Confirm attendance submission"
              >
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-500">
                    Review the attendance summary before you submit. If nobody is absent, the absent list will show as empty and you can still confirm immediately.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-emerald-600">{presentCount}</div>
                      <div className="mt-1 text-xs font-semibold text-emerald-700">Present</div>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-red-600">{absentIds.length}</div>
                      <div className="mt-1 text-xs font-semibold text-red-700">Absent</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Absent students</h4>
                    {absentIds.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 shadow-sm">
                        {getAbsentStudentsList().map((student) => (
                          <div key={student.id} className="flex items-center justify-between px-4 py-3 text-sm gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-slate-800 truncate">{student.full_name}</div>
                              <div className="text-xs font-semibold text-slate-400">{student.roll_number}</div>
                            </div>
                            <Badge variant="danger" className="shrink-0">Absent</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
                        No absent students selected. Everyone is currently marked present.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                    <AlertTriangle className="mr-2 inline-block h-4 w-4 align-[-2px] text-amber-500" />
                    Submission is final. After confirmation, the session is locked and no reverting is allowed.
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => setIsVerifyModalOpen(false)} disabled={submitting}>
                      Go back
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleSubmit}
                      loading={submitting}
                    >
                      Submit and lock
                    </Button>
                  </div>
                </div>
              </Modal>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
