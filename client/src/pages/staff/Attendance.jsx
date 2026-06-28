import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import attendanceApi from '../../api/attendance';
import classesApi from '../../api/classes';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Search, 
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Calendar
} from 'lucide-react';

/**
 * Attendance-taking Page for staff members.
 * Implements schedule gating, CSS grid selection states, navigation warning locks, and VerifyModal checks.
 */
export default function Attendance() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionType = searchParams.get('session') || 'morning'; // 'morning' or 'evening'
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data states
  const [classDetail, setClassDetail] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [students, setStudents] = useState([]);
  const [absentIds, setAbsentIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Countdown/Time state
  const [timeRemaining, setTimeRemaining] = useState(0); // diff in ms
  const [timeToOpen, setTimeToOpen] = useState(0); // diff in ms
  
  // Modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Tracks if the user has interacted/taken attendance
  const [isDirty, setIsDirty] = useState(false);

  const countdownIntervalRef = useRef(null);

  // Browser-native beforeunload warning handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved attendance. Leave anyway?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch class details
      const classesData = await classesApi.getAll();
      const currentClass = classesData.find(c => c.id === classId);
      if (!currentClass) {
        throw new Error('Class section not found.');
      }
      setClassDetail(currentClass);

      // 2. Fetch session status
      const statusData = await attendanceApi.getSessionStatus(classId);
      const currentStatus = statusData[sessionType];
      setSessionStatus(currentStatus);

      // 3. Fetch students
      const studentsData = await attendanceApi.getClassStudents(classId);
      setStudents(studentsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load attendance configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId, sessionType]);

  // Timers and countdown management
  useEffect(() => {
    if (!sessionStatus || loading) return;

    const calculateTimes = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (sessionStatus.status === 'not_yet_open' && sessionStatus.opens_at) {
        const opensAtDate = new Date(`${todayStr}T${sessionStatus.opens_at}:00`);
        const diff = opensAtDate.getTime() - now.getTime();
        setTimeToOpen(Math.max(0, diff));
      } else if (sessionStatus.status === 'open' && sessionStatus.locks_at) {
        const locksAtDate = new Date(`${todayStr}T${sessionStatus.locks_at}:00`);
        const diff = locksAtDate.getTime() - now.getTime();
        setTimeRemaining(Math.max(0, diff));
      }
    };

    calculateTimes();
    countdownIntervalRef.current = setInterval(calculateTimes, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [sessionStatus, loading]);

  const formatCountdown = (diffMs) => {
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

  const handleStudentClick = (studentId) => {
    setIsDirty(true);
    setAbsentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const formatTimeString = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${m} ${suffix}`;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await attendanceApi.submitAttendance({
        class_id: classId,
        session_type: sessionType,
        absent_student_ids: absentIds
      });

      showToast(`Attendance submitted for ${result.total_students} students successfully!`, 'success');
      setIsDirty(false); // Clear dirty lock
      setIsVerifyModalOpen(false);
      navigate('/staff/history');
    } catch (err) {
      showToast(err.message || 'Failed to submit attendance sheet.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getAbsentStudentsList = () => {
    return students.filter(s => absentIds.includes(s.id));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold select-none">Retrieving session rosters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md mx-auto text-center flex flex-col items-center select-none shadow-sm mt-8 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 shrink-0" />
        <h3 className="text-base font-bold text-slate-800 tracking-tight">Configuration Error</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="mt-6">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { status, opens_at, locks_at, is_submitted, submitted_at } = sessionStatus || {};

  // ============================================================
  // GATING STATES RENDERS
  // ============================================================

  if (status === 'not_yet_open') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 select-none">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-sm animate-scale-in">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 border border-amber-100 rounded-2xl flex items-center justify-center mb-5 shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Session Not Yet Open</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The {sessionType} session window opens at <span className="font-semibold text-slate-700">{formatTimeString(opens_at)}</span>.
          </p>
          <div className="mt-6 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-amber-700">
            Opens in: {formatCountdown(timeToOpen)}
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="mt-8">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'locked' || is_submitted) {
    const formattedSubmittedTime = submitted_at 
      ? new Date(submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : 'N/A';

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 select-none">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-sm animate-scale-in">
          <div className="w-14 h-14 bg-blue-50 text-blue-500 border border-blue-100 rounded-2xl flex items-center justify-center mb-5 shrink-0">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Attendance Already Submitted</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Rosters for this session were submitted at <span className="font-semibold text-slate-700">{formattedSubmittedTime}</span> today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Button variant="secondary" size="sm" onClick={() => navigate('/staff/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/staff/history')}>
              View History logs &rarr;
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'closed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 select-none">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-sm animate-scale-in">
          <div className="w-14 h-14 bg-red-50 text-red-500 border border-red-100 rounded-2xl flex items-center justify-center mb-5 shrink-0">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Session Window Has Closed</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The {sessionType} session window closed at <span className="font-semibold text-slate-700">{formatTimeString(locks_at)}</span>. 
            Contact your administration if you need to submit late attendance logs.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="mt-8">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE GRID VIEW (status === 'open')
  // ============================================================

  const presentCount = students.length - absentIds.length;
  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    return s.full_name.toLowerCase().includes(query) || s.roll_number.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-5 pb-24 relative select-none">
      {/* Top Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => {
            if (isDirty) {
              if (window.confirm("You have unsaved changes. Leave anyway?")) {
                navigate('/staff/dashboard');
              }
            } else {
              navigate('/staff/dashboard');
            }
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          Dashboard console
        </button>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Attendance Workspace
        </span>
      </div>

      {/* Info Bar */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            {classDetail?.name}
            <Badge variant="warning">{sessionType === 'morning' ? 'Morning' : 'Evening'}</Badge>
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            Window Timings: {formatTimeString(opens_at)} &ndash; {formatTimeString(locks_at)}
          </p>
        </div>
        
        <div className="flex items-center gap-5 sm:justify-end shrink-0">
          <div className="text-xs font-semibold flex items-center gap-2">
            <span className="text-slate-400">Roster state:</span>
            <span className="text-emerald-600 font-bold">{presentCount} Present</span>
            <span className="text-slate-200 font-medium">&bull;</span>
            <span className={`${absentIds.length > 0 ? 'text-red-600 font-extrabold' : 'text-slate-400 font-bold'}`}>
              {absentIds.length} Absent
            </span>
          </div>

          <div className="w-px h-5 bg-slate-100" />

          <div className="text-xs font-bold text-amber-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Closes in: {formatCountdown(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Blue Informational Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3.5 rounded-r-xl flex gap-3 text-xs leading-relaxed text-blue-800 animate-fade-in select-none">
        <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          All <span className="font-bold">{students.length}</span> students are marked <span className="font-bold">present</span> by default. 
          Tap on a student's card to toggle and mark them <span className="font-bold text-red-600">absent</span>.
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search student by name or roll number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-700 transition-all placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5"
        />
      </div>

      {/* Grid container with scrolling bounds */}
      <div className="w-full overflow-y-auto max-h-[60vh] pr-1">
        {filteredStudents.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
            No students found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {filteredStudents.map((s) => {
              const isAbsent = absentIds.includes(s.id);
              
              return (
                <div
                  key={s.id}
                  onClick={() => handleStudentClick(s.id)}
                  className={`p-3 rounded-lg border flex flex-col justify-between h-20 transition-all cursor-pointer select-none ${
                    isAbsent
                      ? 'bg-red-50/70 border-red-200 ring-2 ring-red-500/5'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-bold font-mono tracking-tight ${isAbsent ? 'text-red-500' : 'text-slate-400'}`}>
                      {s.roll_number}
                    </span>
                    {isAbsent ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  
                  {/* Student Name */}
                  <span className={`text-xs font-semibold truncate mt-2 ${isAbsent ? 'text-red-600' : 'text-slate-700'}`}>
                    {s.full_name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-slate-200 px-6 py-4.5 flex items-center justify-between z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] select-none">
        <div className="text-xs font-semibold">
          <span className={absentIds.length > 0 ? 'text-red-600 font-extrabold' : 'text-slate-400'}>
            {absentIds.length} students
          </span>
          <span className="text-slate-400"> marked absent</span>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsVerifyModalOpen(true)}
          disabled={status !== 'open'}
        >
          Review & Confirm
        </Button>
      </div>

      {/* VerifyModal Dialog */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Confirm Attendance Submission"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400 font-medium leading-relaxed select-none">
            Please review the attendance summary metrics below before submitting. This operation is locked and cannot be undone.
          </p>

          {/* Ratios stats cards */}
          <div className="grid grid-cols-2 gap-3.5 select-none">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-emerald-600">{presentCount}</span>
              <span className="text-xs font-semibold text-emerald-600 mt-0.5">Present</span>
            </div>
            <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-red-600">{absentIds.length}</span>
              <span className="text-xs font-semibold text-red-600 mt-0.5">Absent</span>
            </div>
          </div>

          {/* Absent list */}
          {absentIds.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider select-none">Absent Student List</h4>
              <div className="border border-slate-100 rounded-xl max-h-[160px] overflow-y-auto divide-y divide-slate-50">
                {getAbsentStudentsList().map((s) => (
                  <div key={s.id} className="px-3.5 py-2 flex items-center justify-between text-xs">
                    <div className="flex gap-2">
                      <span className="font-mono text-slate-400 font-bold">{s.roll_number}</span>
                      <span className="font-semibold text-slate-700">{s.full_name}</span>
                    </div>
                    <Badge variant="danger" className="py-0.5 px-2">Absent</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Warning Box */}
          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex gap-2.5 text-xs text-amber-800 select-none">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Important Notice:</span> Once submitted, this session will be locked and automated SMS notifications will be dispatched to the parents of absent students.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2 select-none">
            <Button
              variant="secondary"
              onClick={() => setIsVerifyModalOpen(false)}
              disabled={submitting}
            >
              Go Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg border-transparent"
            >
              Submit Attendance
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
