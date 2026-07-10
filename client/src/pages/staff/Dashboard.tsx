import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import attendanceApi from '../../api/attendance';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
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
  Users2
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
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

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
            <Button variant="primary" onClick={() => navigate('/staff/attendance')}>
              Open attendance hub
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

      <div className="flex items-center justify-between gap-3">
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
                        onClick={() => navigate(`/staff/attendance/${c.id}?session=morning`)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer transition-colors w-fit select-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-blue-600 shrink-0" />
                        Take Morning Attendance &rarr;
                      </button>
                    )}
                    {showEveningAction && (
                      <button
                        onClick={() => navigate(`/staff/attendance/${c.id}?session=evening`)}
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
    </div>
  );
}
