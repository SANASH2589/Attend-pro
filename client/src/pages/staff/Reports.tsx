import React, { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import reportsApi from '../../api/reports';
import attendanceApi from '../../api/attendance';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  FileSpreadsheet,
  Loader2,
  BarChart3
} from 'lucide-react';
import { Class as ClassType } from '../../types/class';

/**
 * Staff Reports page — class reports scoped to staff's assigned classes.
 * No parent phone, no admin overview, no individual student contact details.
 */
export default function StaffReports() {
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
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);

  // Fetch staff's assigned classes via attendance/my-classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await attendanceApi.getMyClasses();
        setClasses(data || []);
      } catch (err: any) {
        console.warn('Failed to load assigned classes:', err.message);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const fetchReport = async () => {
    if (!selectedClassId) {
      showToast('Please select a class.', 'error');
      return;
    }
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
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Reports</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Attendance reports for your assigned class sections.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          disabled={loadingClasses}
          className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-[200px] disabled:opacity-50"
        >
          <option value="">{loadingClasses ? 'Loading classes...' : 'Select a class'}</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
          <span className="text-xs font-bold text-slate-500">To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer" />
        </div>
        <Button variant="primary" size="sm" onClick={fetchReport} loading={loading} disabled={!selectedClassId}>
          Generate
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold">Generating class report...</span>
        </div>
      )}

      {/* Empty state when no class selected */}
      {!loading && !report && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center mb-3">
            <BarChart3 className="w-6 h-6 shrink-0" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 tracking-tight mb-1">Select a class to generate report</h4>
          <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
            Choose one of your assigned class sections and a date range, then click "Generate" to view the attendance report.
          </p>
        </div>
      )}

      {/* Report content */}
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
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">No student data for selected period.</td></tr>
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
