import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import attendanceApi from '../../api/attendance';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Table, { TableColumn } from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import { 
  Clock,
  CheckCircle,
  AlertCircle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Search,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  ArrowRight,
  School,
  Sparkles,
  ClipboardCheck,
  Users,
  CalendarDays
} from 'lucide-react';
import { Class as ClassType } from '../../types/class';
import { Student as StudentType } from '../../types/student';
import { ClassSessionStatus, SessionStatus } from '../../types/attendance';

interface StaffAttendanceClass extends ClassType {
  sessions: {
    morning: SessionStatus;
    evening: SessionStatus;
  };
}

/**
 * Attendance-taking Page for staff members.
 * Handles the attendance hub, class roster workspace, confirmation lock, and session state gating.
 */
export default function Attendance() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const requestedSessionType = searchParams.get('session');
  const [activeSessionType, setActiveSessionType] = useState<'morning' | 'evening'>(requestedSessionType === 'evening' ? 'evening' : 'morning');
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data states
  const [assignedClasses, setAssignedClasses] = useState<StaffAttendanceClass[]>([]);
  const [classDetail, setClassDetail] = useState<ClassType | null>(null);
  const [sessionStatus, setSessionStatus] = useState<ClassSessionStatus | null>(null);
  const [students, setStudents] = useState<StudentType[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Countdown/Time state
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // diff in ms
  const [timeToOpen, setTimeToOpen] = useState<number>(0); // diff in ms
  
  // Modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Tracks if the user has interacted/taken attendance
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const countdownIntervalRef = useRef<any>(null);

  const currentClass = useMemo(
    () => assignedClasses.find((item) => item.id === classId) ?? classDetail,
    [assignedClasses, classDetail, classId]
  );
  const effectiveSessionType = activeSessionType;
  const currentSessionInfo = sessionStatus ? sessionStatus[activeSessionType] : null;
  const status = currentSessionInfo?.status;
  const isLockedView = hasSubmitted || currentSessionInfo?.status === 'locked' || currentSessionInfo?.is_submitted;
  const canEditRoster = Boolean(classId && currentSessionInfo?.status === 'open' && !isLockedView);

  // Browser-native beforeunload warning handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !hasSubmitted) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance. Leave anyway?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasSubmitted, isDirty]);

  const loadData = async () => {
    setHasSubmitted(false);
    setLoading(true);
    setError('');
    try {
      const classesData = (await attendanceApi.getMyClasses()) as StaffAttendanceClass[];
      setAssignedClasses(classesData || []);

      if (!classId) {
        setClassDetail(null);
        setSessionStatus(null);
        setStudents([]);
        setAbsentIds([]);
        setSearchQuery('');
        return;
      }

      const selectedClass = (classesData || []).find((item) => item.id === classId);
      if (!selectedClass) {
        throw new Error('Class section not found in your assigned workspace.');
      }

      setClassDetail(selectedClass);

      const statusData = await attendanceApi.getSessionStatus(classId);
      const sessionToLoad: 'morning' | 'evening' = (() => {
        if (requestedSessionType === 'morning' || requestedSessionType === 'evening') {
          const requestedStatus = statusData[requestedSessionType];

          if (requestedStatus.status === 'open') {
            return requestedSessionType;
          }
        }

        if (selectedClass.batch_type === 'morning') return 'morning';
        if (selectedClass.batch_type === 'evening') return 'evening';

        if (statusData.evening.status === 'open') return 'evening';
        if (statusData.morning.status === 'open') return 'morning';
        if (requestedSessionType === 'evening' || requestedSessionType === 'morning') return requestedSessionType as 'morning' | 'evening';
        return 'morning';
      })();

      setActiveSessionType(sessionToLoad);
      setSessionStatus(statusData);

      const studentsData = await attendanceApi.getClassStudents(classId);
      setStudents(studentsData || []);
      setAbsentIds([]);
      setSearchQuery('');
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId, requestedSessionType]);

  // Timers and countdown management
  useEffect(() => {
    if (!currentSessionInfo || loading) return;

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
  }, [currentSessionInfo, loading]);

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

  const formatTimeString = (timeStr?: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${m} ${suffix}`;
  };

  const handleSubmit = async () => {
    if (!classId) return;
    setSubmitting(true);
    try {
      const result = await attendanceApi.submitAttendance({
        class_id: classId,
        session_type: effectiveSessionType,
        absent_student_ids: absentIds
      });

      showToast(`Attendance submitted for ${result.total_students} students successfully!`, 'success');
      setIsDirty(false); // Clear dirty lock
      setIsVerifyModalOpen(false);
      setHasSubmitted(true);
      setSessionStatus((prev) => prev ? ({
        ...prev,
        [effectiveSessionType]: {
          ...prev[effectiveSessionType],
          status: 'locked',
          is_submitted: true,
          is_locked: true,
          submitted_at: new Date().toISOString()
        }
      }) : prev);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit attendance sheet.', 'error');
    } finally {
      setSubmitting(false);
    }
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

  const renderStatusBadge = (status?: SessionStatus['status']) => {
    if (status === 'open') return <Badge variant="success">Open</Badge>;
    if (status === 'locked') return <Badge variant="neutral">Locked</Badge>;
    if (status === 'closed') return <Badge variant="danger">Closed</Badge>;
    if (status === 'not_yet_open') return <Badge variant="warning">Upcoming</Badge>;
    return <Badge variant="neutral">Idle</Badge>;
  };

  const renderLandingView = () => {
    const allSessionStates = assignedClasses.flatMap((item) => [item.sessions.morning, item.sessions.evening]);
    const activeCount = allSessionStates.filter((session) => session.status === 'open').length;
    const upcomingCount = allSessionStates.filter((session) => session.status === 'not_yet_open').length;
    const completedCount = allSessionStates.filter((session) => session.status === 'locked' || session.status === 'closed').length;

    const hubColumns: TableColumn<StaffAttendanceClass>[] = [
      {
        label: 'Class Section',
        key: 'name',
        render: (row) => (
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-400">Batch: {row.batch_type === 'both' ? 'Morning + Evening' : row.batch_type === 'morning' ? 'Morning' : 'Evening'}</div>
          </div>
        )
      },
      {
        label: 'Morning',
        key: 'sessions',
        render: (row) => {
          const morning = row.sessions.morning;
          if (row.batch_type === 'evening') return <Badge variant="neutral">Not offered</Badge>;
          return <Badge variant={morning.status === 'open' ? 'success' : morning.status === 'not_yet_open' ? 'warning' : morning.status === 'locked' ? 'neutral' : 'danger'}>{morning.status === 'open' ? 'Open' : morning.status === 'not_yet_open' ? 'Upcoming' : morning.status === 'locked' ? 'Locked' : 'Closed'}</Badge>;
        }
      },
      {
        label: 'Evening',
        key: 'sessions',
        render: (row) => {
          const evening = row.sessions.evening;
          if (row.batch_type === 'morning') return <Badge variant="neutral">Not offered</Badge>;
          return <Badge variant={evening.status === 'open' ? 'success' : evening.status === 'not_yet_open' ? 'warning' : evening.status === 'locked' ? 'neutral' : 'danger'}>{evening.status === 'open' ? 'Open' : evening.status === 'not_yet_open' ? 'Upcoming' : evening.status === 'locked' ? 'Locked' : 'Closed'}</Badge>;
        }
      },
      {
        label: 'Action',
        key: 'action',
        render: (row) => {
          const morning = row.sessions.morning;
          const evening = row.sessions.evening;
          const morningOpen = row.batch_type !== 'evening' && morning.status === 'open';
          const eveningOpen = row.batch_type !== 'morning' && evening.status === 'open';

          return (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={morningOpen ? 'primary' : 'secondary'}
                size="sm"
                disabled={!morningOpen}
                onClick={() => navigate(`/staff/attendance/${row.id}?session=morning`)}
              >
                Morning
              </Button>
              <Button
                variant={eveningOpen ? 'primary' : 'secondary'}
                size="sm"
                disabled={!eveningOpen}
                onClick={() => navigate(`/staff/attendance/${row.id}?session=evening`)}
              >
                Evening
              </Button>
            </div>
          );
        }
      }
    ];

    return (
      <div className="space-y-6 pb-8">
        <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-blue-50/60 p-6 md:p-8 shadow-sm overflow-hidden relative">
          <div className="absolute inset-y-0 right-0 w-72 bg-linear-to-l from-blue-100/50 to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Attendance hub
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  Choose a class, then take attendance in one clean flow.
                </h1>
                <p className="mt-2 max-w-2xl text-sm md:text-[15px] text-slate-500 leading-relaxed">
                  Open attendance from here or from the dashboard. Active sessions show the student roster with present as the default state and absent as the only toggle.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/staff/dashboard')} className="md:self-start">
              Back to dashboard
            </Button>
          </div>

          <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <Users className="h-4 w-4" />
                Open now
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{activeCount}</div>
              <div className="text-xs text-slate-500 mt-1">Classes ready for attendance.</div>
            </div>
            <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <CalendarDays className="h-4 w-4" />
                Upcoming
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{upcomingCount}</div>
              <div className="text-xs text-slate-500 mt-1">Sessions scheduled later today.</div>
            </div>
            <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                Locked / closed
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{completedCount}</div>
              <div className="text-xs text-slate-500 mt-1">Already submitted or closed.</div>
            </div>
          </div>
        </div>

        {assignedClasses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
              <School className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">No assigned classes</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
              There are no class mappings linked to your staff account yet. Ask administration to assign your sections before taking attendance.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Your attendance sessions</h2>
              <span className="text-xs font-semibold text-slate-400">{assignedClasses.length} class sections</span>
            </div>

            <Table
              columns={hubColumns}
              data={assignedClasses}
              emptyMessage="No assigned attendance sessions found."
            />
          </div>
        )}
      </div>
    );
  };

  const renderRosterWorkspace = () => {
    if (!classId) return null;

    if (isLockedView) {
      const submittedAt = currentSessionInfo?.submitted_at
        ? new Date(currentSessionInfo.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A';

      return (
        <div className="mx-auto flex min-h-130 max-w-2xl flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Attendance locked</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            This session is already submitted and locked. Submitted at {submittedAt}. No further changes are allowed.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/staff/attendance')}>
              Back to attendance hub
            </Button>
            <Button variant="primary" onClick={() => navigate('/staff/history')}>
              View history
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'not_yet_open') {
      return (
        <div className="mx-auto flex min-h-130 max-w-2xl flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Session not yet open</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            The {effectiveSessionType} session for {currentClass?.name || 'this class'} opens at {formatTimeString(currentSessionInfo?.opens_at)}.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
            Opens in {formatCountdown(timeToOpen)}
          </div>
          <Button variant="secondary" onClick={() => navigate('/staff/attendance')} className="mt-6">
            Back to attendance hub
          </Button>
        </div>
      );
    }

    if (status === 'closed') {
      return (
        <div className="mx-auto flex min-h-130 max-w-2xl flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Session window closed</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            The {effectiveSessionType} window for {currentClass?.name || 'this class'} has closed at {formatTimeString(currentSessionInfo?.locks_at)}.
          </p>
          <Button variant="secondary" onClick={() => navigate('/staff/attendance')} className="mt-6">
            Back to attendance hub
          </Button>
        </div>
      );
    }

    if (!currentSessionInfo) {
      return (
        <div className="mx-auto flex min-h-130 max-w-2xl flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Session not configured</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            This class does not support the selected session type. Return to the hub and choose a valid session.
          </p>
          <Button variant="secondary" onClick={() => navigate('/staff/attendance')} className="mt-6">
            Back to attendance hub
          </Button>
        </div>
      );
    }

    const presentCount = students.length - absentIds.length;
    const filteredStudents = students.filter(s => {
      const query = searchQuery.toLowerCase();
      return s.full_name.toLowerCase().includes(query) || s.roll_number.toLowerCase().includes(query);
    });

    const rosterColumns: TableColumn<StudentType>[] = [
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
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  !isAbsent ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => setStudentPresence(row.id, false)}
                disabled={!canEditRoster}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  isAbsent ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Absent
              </button>
            </div>
          );
        }
      }
    ];

    return (
      <div className="space-y-5 pb-28">
        <div className="rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-blue-50/60 p-6 md:p-7 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <button 
                onClick={() => {
                  if (isDirty && !hasSubmitted) {
                    if (window.confirm('You have unsaved changes. Leave this roster?')) {
                      navigate('/staff/attendance');
                    }
                  } else {
                    navigate('/staff/attendance');
                  }
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to attendance hub
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{currentClass?.name || 'Attendance workspace'}</h1>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-2xl">
                  Toggle a student to absent, keep the rest present by default, then confirm once. After submission, the session is locked and cannot be changed.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <Badge variant={effectiveSessionType === 'morning' ? 'warning' : 'neutral'}>
                {effectiveSessionType === 'morning' ? 'Morning session' : 'Evening session'}
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

        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
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
                onClick={() => navigate('/staff/attendance')}
                disabled={submitting || hasSubmitted}
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
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-125 flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider select-none">
          Loading attendance workspace...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-red-500 shrink-0" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">Configuration error</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{error}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/staff/attendance')}>
            Back to attendance hub
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/staff/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {classId ? renderRosterWorkspace() : renderLandingView()}
    </div>
  );
}
