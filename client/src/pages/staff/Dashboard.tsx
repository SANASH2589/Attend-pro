import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import attendanceApi from '../../api/attendance';
import Badge from '../../components/ui/Badge';
import { 
  Clock, 
  CheckCircle2, 
  Lock, 
  AlertCircle, 
  Play, 
  Loader2,
  Calendar,
  AlertTriangle
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
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2.5 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold select-none">Loading academic workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting and Header */}
      <div className="flex flex-col">
        <h1 className="text-[20px] font-semibold text-slate-800 tracking-tight">
          {getGreeting()}, {user?.name || 'Faculty Member'}
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-0.5 select-none">
          {getTodayDateString()}
        </p>
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

      {/* Main classes section */}
      <div className="space-y-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
          Your classes today
        </h2>

        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-slate-200 rounded-2xl bg-white select-none">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classes.map((c) => {
              const showMorningAction = c.sessions.morning.status === 'open';
              const showEveningAction = c.sessions.evening.status === 'open';

              return (
                <div 
                  key={c.id} 
                  className="bg-white border border-slate-200/60 hover:border-slate-300 rounded-[10px] p-4 shadow-sm flex flex-col justify-between transition-colors min-h-[180px]"
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight">{c.name}</h3>
                      <Badge variant={c.batch_type === 'both' ? 'success' : c.batch_type === 'morning' ? 'warning' : 'neutral'}>
                        {c.batch_type === 'both' ? 'Double' : c.batch_type === 'morning' ? 'Morning' : 'Evening'}
                      </Badge>
                    </div>

                    {/* Middle Section: Session Indicators */}
                    <div className="mt-4 space-y-2.5">
                      {/* Morning Session Info */}
                      {(c.batch_type === 'morning' || c.batch_type === 'both') && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 select-none">
                            Morning &bull; {formatTimeString(c.morning_start)} &ndash; {formatTimeString(c.morning_lock)}
                          </span>
                          {getStatusBadge(c.sessions.morning)}
                        </div>
                      )}

                      {/* Evening Session Info */}
                      {(c.batch_type === 'evening' || c.batch_type === 'both') && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 select-none">
                            Evening &bull; {formatTimeString(c.evening_start)} &ndash; {formatTimeString(c.evening_lock)}
                          </span>
                          {getStatusBadge(c.sessions.evening)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action trigger links */}
                  <div className="mt-4 pt-3.5 border-t border-slate-50 flex flex-col gap-2">
                    {showMorningAction && (
                      <button
                        onClick={() => navigate(`/staff/attendance/${c.id}?session=morning`)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors w-fit select-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-blue-600 shrink-0" />
                        Take Morning Attendance &rarr;
                      </button>
                    )}
                    {showEveningAction && (
                      <button
                        onClick={() => navigate(`/staff/attendance/${c.id}?session=evening`)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors w-fit select-none"
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
    </div>
  );
}
