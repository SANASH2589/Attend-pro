import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/cards/StatCard';
import DashboardCard from '../../components/cards/DashboardCard';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Plus, 
  Calendar, 
  ClipboardCheck, 
  Activity, 
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const breadcrumbs = [
    { label: "Dashboard" }
  ];

  const quickActions = [
    { label: "New Student Enrollment", icon: Plus, color: "bg-blue-50 text-blue-600 hover:bg-blue-100/80" },
    { label: "Register Faculty / Staff", icon: Users, color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80" },
    { label: "Define New Class Section", icon: BookOpen, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80" },
    { label: "Schedule Calendar Session", icon: Calendar, color: "bg-amber-50 text-amber-600 hover:bg-amber-100/80" }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Dashboard" 
        description="Administrative overview of college attendance metrics, academic units, and registry status."
        breadcrumbs={breadcrumbs}
      />

      {/* Top Section: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Students"
          value="0"
          icon={GraduationCap}
          description="Registered Students"
          trend={{ type: "neutral", text: "Inactive Session" }}
        />
        <StatCard
          title="Total Staff"
          value="0"
          icon={Users}
          description="Active Faculty & Staff"
          trend={{ type: "neutral", text: "Inactive Session" }}
        />
        <StatCard
          title="Total Classes"
          value="0"
          icon={BookOpen}
          description="Academic Allocations"
          trend={{ type: "neutral", text: "Inactive Session" }}
        />
      </div>

      {/* Middle Section: Attendance Overview + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Overview Placeholder */}
        <DashboardCard 
          title="Attendance Overview" 
          subtitle="Real-time check-in logs and institutional percentages"
          className="lg:col-span-2 min-h-[320px]"
        >
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center mb-3">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 tracking-tight mb-1">
              No Active Logs
            </h4>
            <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
              Attendance tracking charts will populate here once active semesters are initialized and attendance records are registered.
            </p>
          </div>
        </DashboardCard>

        {/* Quick Actions Panel */}
        <DashboardCard 
          title="Quick Actions" 
          subtitle="Frequently accessed admin operations"
          className="h-full"
        >
          <div className="flex-1 flex flex-col justify-center gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  disabled
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border border-transparent text-xs font-semibold tracking-wide transition-all duration-200 cursor-not-allowed select-none ${action.color}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 opacity-50" />
                </button>
              );
            })}
          </div>
        </DashboardCard>
      </div>

      {/* Bottom Section: Recent Activities */}
      <DashboardCard 
        title="System Event Logs" 
        subtitle="Recent administrative actions and registry modifications"
      >
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-700 tracking-tight mb-1">
            No Event History
          </h4>
          <p className="text-[11px] text-slate-400 text-center max-w-xs leading-relaxed">
            All system logs and faculty registration events will be tracked and displayed here once operations begin.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}
