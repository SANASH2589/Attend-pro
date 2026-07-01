import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/cards/StatCard';
import reportsApi from '../../api/reports';
import classesApi from '../../api/classes';
import attendanceApi from '../../api/attendance';
import { useToast } from '../../context/ToastContext';
import {
  BarChart3,
  FileText,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { Class as ClassType } from '../../types/class';
import { Student as StudentType } from '../../types/student';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'class', label: 'By class' },
    { id: 'student', label: 'By student' }
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reports</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Comprehensive attendance analytics and exportable reports.</p>
      </div>

      {/* Tab bar */}
      <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 w-fit select-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-1.5 px-5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'class' && <ClassTab />}
      {activeTab === 'student' && <StudentTab />}
    </div>
  );
}

// ============================================================
// TAB 1 — OVERVIEW
// ============================================================
function OverviewTab() {
  const { showToast } = useToast();
  const getPastDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [dateFrom, setDateFrom] = useState<string>(getPastDate(30));
  const [dateTo, setDateTo] = useState<string>(getPastDate(0));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getOverviewReport({ date_from: dateFrom, date_to: dateTo });
      setReport(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load overview report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const pctColor = (val?: number | null) => {
    if (val === null || val === undefined) return 'text-slate-400';
    if (val >= 75) return 'text-emerald-600';
    if (val >= 50) return 'text-amber-500';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
          <span className="text-xs font-bold text-slate-500">To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        </div>
        <Button variant="primary" size="sm" onClick={fetchReport} loading={loading}>
          Generate report
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold">Generating overview report...</span>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Avg Attendance"
              value={report.overall.avg_attendance_pct !== null ? `${report.overall.avg_attendance_pct}%` : '—'}
              icon={Activity}
              description="Overall attendance rate"
              trend={{ type: report.overall.avg_attendance_pct >= 75 ? 'success' : report.overall.avg_attendance_pct >= 50 ? 'neutral' : 'danger', text: report.overall.avg_attendance_pct >= 75 ? 'Healthy' : 'Needs attention' }}
            />
            <StatCard title="Total Sessions" value={String(report.overall.total_sessions)} icon={BarChart3} description="In selected period" />
            <StatCard title="SMS Sent" value={String(report.overall.total_sms_sent)} icon={FileSpreadsheet} description="Notifications dispatched" />
            <StatCard
              title="SMS Failed"
              value={String(report.overall.total_sms_failed)}
              icon={AlertTriangle}
              description="Delivery failures"
            />
          </div>

          {/* By class table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Attendance by class</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Ordered by lowest attendance first — classes needing attention are at the top.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 font-semibold select-none">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Sessions</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Avg attendance %</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {(report.by_class || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">No class data for selected period.</td></tr>
                  ) : (
                    report.by_class.map((c: any, i: number) => (
                      <tr key={c.class_id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{c.class_name}</td>
                        <td className="px-6 py-4 text-slate-600">{c.total_sessions}</td>
                        <td className="px-6 py-4"><span className={`font-bold ${pctColor(c.avg_pct)}`}>{c.avg_pct !== null ? `${c.avg_pct}%` : '—'}</span></td>
                        <td className="px-6 py-4 text-slate-600">{c.total_students}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low attendance students */}
          <div>
            <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">
              Students below 75% attendance
            </h4>
            {(report.low_attendance_students || []).length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-emerald-700">No students below 75% — all attendance is healthy!</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 select-none">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Roll no.</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Class</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {report.low_attendance_students.map((s: any, i: number) => (
                        <tr key={s.student_id || i} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-blue-600 text-[13px]">{s.roll_number}</td>
                          <td className="px-6 py-4 font-medium text-slate-800">{s.full_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-[13px]">{s.class_name}</td>
                          <td className="px-6 py-4 font-bold text-red-600">{s.overall_pct !== null ? `${s.overall_pct}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// TAB 2 — BY CLASS
// ============================================================
function ClassTab() {
  const { showToast } = useToast();
  const getPastDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(getPastDate(30));
  const [dateTo, setDateTo] = useState<string>(getPastDate(0));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<string>('');

  useEffect(() => {
    classesApi.getAll().then(setClasses).catch(() => {});
  }, []);

  const fetchReport = async () => {
    if (!selectedClassId) { showToast('Please select a class.', 'error'); return; }
    setLoading(true);
    try {
      const data = await reportsApi.getClassReport(selectedClassId, { date_from: dateFrom, date_to: dateTo });
      setReport(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load class report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    if (!selectedClassId) return;
    setExporting(type);
    try {
      if (type === 'excel') {
        await reportsApi.downloadClassExcel(selectedClassId, { date_from: dateFrom, date_to: dateTo });
      } else {
        await reportsApi.downloadClassPDF(selectedClassId, { date_from: dateFrom, date_to: dateTo });
      }
      showToast(`${type.toUpperCase()} downloaded successfully.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed.', 'error');
    } finally {
      setExporting('');
    }
  };

  const pctColor = (val: number | null) => {
    if (val === null) return 'text-slate-400';
    if (val >= 75) return 'text-emerald-600';
    if (val >= 50) return 'text-amber-500';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[200px]">
          <option value="">Select a class</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        <Button variant="primary" size="sm" onClick={fetchReport} loading={loading}>Generate</Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold">Generating class report...</span>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Class summary card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{report.class?.name}</h3>
                <Badge variant={report.class?.batch_type === 'morning' ? 'warning' : report.class?.batch_type === 'evening' ? 'neutral' : 'success'} className="mt-1">
                  {report.class?.batch_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-500 flex-wrap">
              <span>{report.summary.total_sessions} sessions</span>
              <span>Avg <span className={`font-bold ${pctColor(report.summary.avg_attendance_pct)}`}>{report.summary.avg_attendance_pct !== null ? `${report.summary.avg_attendance_pct}%` : '—'}</span></span>
              {report.summary.best_day && <span>Best: {report.summary.best_day.date} ({report.summary.best_day.percentage}%)</span>}
              {report.summary.worst_day && <span>Worst: {report.summary.worst_day.date} ({report.summary.worst_day.percentage}%)</span>}
            </div>
          </div>

          {/* Student attendance table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">Student attendance</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 select-none">
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Roll no.</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Total sessions</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(report.students || []).length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">No student data.</td></tr>
                  ) : report.students.map((s: any, i: number) => (
                    <tr key={s.id || i} className={`hover:bg-slate-50/50 transition-colors ${s.percentage !== null && s.percentage < 75 ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-3.5 font-bold text-blue-600 text-[13px]">{s.roll_number}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{s.full_name}</td>
                      <td className="px-6 py-3.5 font-bold text-emerald-600">{s.present}</td>
                      <td className="px-6 py-3.5 font-bold text-red-600">{s.absent > 0 ? s.absent : <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-3.5 text-slate-600">{s.total_sessions}</td>
                      <td className="px-6 py-3.5"><span className={`font-bold ${pctColor(s.percentage)}`}>{s.percentage !== null ? `${s.percentage}%` : '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily sessions table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">Daily sessions</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 select-none">
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Session</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(report.daily || []).length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">No daily data.</td></tr>
                  ) : report.daily.map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-700">{d.session_date}</td>
                      <td className="px-6 py-3.5"><Badge variant={d.session_type === 'morning' ? 'warning' : 'neutral'}>{d.session_type === 'morning' ? 'Morning' : 'Evening'}</Badge></td>
                      <td className="px-6 py-3.5 font-bold text-emerald-600">{d.present}</td>
                      <td className="px-6 py-3.5 font-bold text-red-600">{d.absent > 0 ? d.absent : <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-3.5"><span className={`font-bold ${pctColor(d.percentage)}`}>{d.percentage !== null ? `${d.percentage}%` : '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} loading={exporting === 'pdf'}>
              <FileText className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('excel')} loading={exporting === 'excel'}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// TAB 3 — BY STUDENT
// ============================================================
function StudentTab() {
  const { showToast } = useToast();
  const getPastDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [students, setStudents] = useState<StudentType[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(getPastDate(30));
  const [dateTo, setDateTo] = useState<string>(getPastDate(0));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [exporting, setExporting] = useState<string>('');

  useEffect(() => {
    classesApi.getAll().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClassId) { setStudents([]); setSelectedStudentId(''); return; }
    setLoadingStudents(true);
    setSelectedStudentId('');
    attendanceApi.getClassStudents(selectedClassId)
      .then(data => setStudents(data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selectedClassId]);

  const fetchReport = async () => {
    if (!selectedStudentId) { showToast('Please select a student.', 'error'); return; }
    setLoading(true);
    try {
      const data = await reportsApi.getStudentReport(selectedStudentId, {
        class_id: selectedClassId,
        date_from: dateFrom,
        date_to: dateTo
      });
      setReport(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load student report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    if (!selectedStudentId) return;
    setExporting(type);
    try {
      const params = { class_id: selectedClassId, date_from: dateFrom, date_to: dateTo };
      if (type === 'excel') {
        await reportsApi.downloadStudentExcel(selectedStudentId, params);
      } else {
        await reportsApi.downloadStudentPDF(selectedStudentId, params);
      }
      showToast(`${type.toUpperCase()} downloaded successfully.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed.', 'error');
    } finally {
      setExporting('');
    }
  };

  const pctColor = (val: number | null) => {
    if (val === null) return 'text-slate-400';
    if (val >= 75) return 'text-emerald-600';
    if (val >= 50) return 'text-amber-500';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[200px]">
          <option value="">Select a class</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
          disabled={!selectedClassId || loadingStudents}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[240px] disabled:opacity-50">
          <option value="">{loadingStudents ? 'Loading students...' : 'Select a student'}</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.roll_number} — {s.full_name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        <Button variant="primary" size="sm" onClick={fetchReport} loading={loading} disabled={!selectedStudentId}>Generate</Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold">Generating student report...</span>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Student info card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">{report.student?.full_name}</h3>
              <span className="text-[13px] text-slate-400 font-medium">{report.student?.roll_number}</span>
            </div>
            <div className="flex items-center gap-6 text-xs font-semibold flex-wrap">
              <span>Present: <span className="font-bold text-emerald-600">{report.summary.present}</span></span>
              <span>Absent: <span className="font-bold text-red-600">{report.summary.absent}</span></span>
              <span>Attendance: <span className={`font-bold ${pctColor(report.summary.percentage)}`}>{report.summary.percentage !== null ? `${report.summary.percentage}%` : '—'}</span></span>
            </div>
          </div>

          {/* Absence streak warning */}
          {report.summary.consecutive_absences_max > 2 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold text-amber-800 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Longest consecutive absence: {report.summary.consecutive_absences_max} days (last on {report.summary.last_absent_date || 'N/A'})</span>
            </div>
          )}

          {/* Session history table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">Session history</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 select-none">
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Session</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(report.sessions || []).length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">No session data.</td></tr>
                  ) : report.sessions.map((s: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-700">{s.session_date}</td>
                      <td className="px-6 py-3.5 text-slate-500">{s.class_name}</td>
                      <td className="px-6 py-3.5"><Badge variant={s.session_type === 'morning' ? 'warning' : 'neutral'}>{s.session_type === 'morning' ? 'Morning' : 'Evening'}</Badge></td>
                      <td className="px-6 py-3.5">
                        {s.status === 'present' ? (
                          <Badge variant="success">Present</Badge>
                        ) : s.status === 'absent' ? (
                          <Badge variant="danger">Absent</Badge>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} loading={exporting === 'pdf'}>
              <FileText className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('excel')} loading={exporting === 'excel'}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
