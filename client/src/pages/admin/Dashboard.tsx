import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/cards/StatCard';
import DashboardCard from '../../components/cards/DashboardCard';
import Badge from '../../components/ui/Badge';
import { request } from '../../api/base';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Plus, 
  Calendar, 
  ClipboardCheck, 
  Activity,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface StatsState {
  students: number;
  staff: number;
  classes: number;
}

interface RecentSession {
  id: string;
  session_date: string;
  session_type: 'morning' | 'evening';
  is_locked: boolean;
  total_students: number;
  total_absent: number;
  classes?: {
    name: string;
  };
}

/**
 * Admin Dashboard Page.
 * Displays aggregate college statistics, recent attendance sessions, and quick navigation.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsState>({
    students: 0,
    staff: 0,
    classes: 0
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch dashboard stats through secure backend API
      const data = await request('/api/super-admin/dashboard/stats', { method: 'GET' });

      setStats(data.stats || { students: 0, staff: 0, classes: 0 });
      setRecentSessions(data.recentSessions || []);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err.message);
      setError(err.message || 'Failed to sync live dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quickActions = [
    { 
      label: "Enroll Student", 
      icon: Plus, 
      color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100", 
      onClick: () => navigate('/super-admin/students') 
    },
    { 
      label: "Register Faculty", 
      icon: Users, 
      color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100", 
      onClick: () => navigate('/super-admin/staff') 
    },
    { 
      label: "Configure Classes", 
      icon: BookOpen, 
      color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100", 
      onClick: () => navigate('/super-admin/classes') 
    },
    { 
      label: "Manage Assignments", 
      icon: Calendar, 
      color: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100", 
      onClick: () => navigate('/super-admin/assignments') 
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin shrink-0" />
        <span className="text-xs font-semibold select-none">Syncing dashboard statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Overview Dashboard</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time summaries of college directories, schedules, and logs.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Dashboard Sync Error</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={fetchDashboardData} className="text-xs font-bold text-red-700 underline hover:text-red-800 ml-4 shrink-0">
            Refresh
          </button>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Enrolled Students"
          value={String(stats.students)}
          icon={GraduationCap}
          description="Active student records"
          trend={{ type: "primary", text: "Live database" }}
        />
        <StatCard
          title="Faculty Roster"
          value={String(stats.staff)}
          icon={Users}
          description="Registered staff members"
          trend={{ type: "success", text: "Live database" }}
        />
        <StatCard
          title="Class Configurations"
          value={String(stats.classes)}
          icon={BookOpen}
          description="Active sections scheduled"
          trend={{ type: "primary", text: "Live database" }}
        />
      </div>

      {/* Middle Section: Attendance Overview + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <DashboardCard 
          title="Live Attendance Logs" 
          subtitle="Latest attendance checks received from staff"
          className="lg:col-span-2 min-h-[340px]"
        >
          {recentSessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center mb-3">
                <ClipboardCheck className="w-6 h-6 shrink-0" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700 tracking-tight mb-1">
                No Attendance Sheets Logged
              </h4>
              <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
                Attendance tracking history is empty. Once classroom faculty registers morning or evening check-ins, summaries will list here.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto border border-slate-200/50 rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold select-none uppercase tracking-wider text-[9px]">
                    <th className="px-4 py-2.5">Class Section</th>
                    <th className="px-4 py-2.5">Session Date</th>
                    <th className="px-4 py-2.5">Batch</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Roster (Abs/Tot)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {recentSessions.map((session) => {
                    const present = (session.total_students || 0) - (session.total_absent || 0);
                    const rate = session.total_students ? Math.round((present / session.total_students) * 100) : 0;
                    
                    return (
                      <tr key={session.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{session.classes?.name || 'Unknown Class'}</td>
                        <td className="px-4 py-3 font-medium text-slate-500">{session.session_date}</td>
                        <td className="px-4 py-3 select-none">
                          <Badge variant={session.session_type === 'morning' ? 'warning' : 'neutral'}>
                            {session.session_type === 'morning' ? 'Morning' : 'Evening'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center select-none">
                          <Badge variant={session.is_locked ? 'success' : 'neutral'}>
                            {session.is_locked ? 'Locked' : 'Open'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-800">{present} / {session.total_students}</span>
                            <span className={`text-[9px] font-bold mt-0.5 ${rate >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{rate}% Present</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Quick Actions Panel */}
        <DashboardCard 
          title="Quick Actions" 
          subtitle="Frequently accessed administrative operations"
          className="h-full"
        >
          <div className="flex-1 flex flex-col justify-center gap-3.5 select-none">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:shadow-md hover:border-transparent text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${action.color}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              );
            })}
          </div>
        </DashboardCard>
      </div>

      {/* Bottom Section: System Event Logs */}
      <DashboardCard 
        title="Admin Event Logs" 
        subtitle="Recent administrative actions and registry modifications"
      >
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 shrink-0" />
          </div>
          <h4 className="text-xs font-semibold text-slate-700 tracking-tight mb-1">
            System Event Tracking Active
          </h4>
          <p className="text-[10px] text-slate-400 text-center max-w-xs leading-relaxed">
            Attendance sessions, roster edits, and faculty modifications are synchronizing securely to your Supabase PostgreSQL instance.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}
