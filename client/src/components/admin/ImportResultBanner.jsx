import React from 'react';
import { AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Renders the results of a bulk CSV/Excel student upload,
 * summarizing counts and listing errors with CSV export.
 */
export default function ImportResultBanner({
  summary,
  errors = [],
  onDownloadErrorCsv
}) {
  if (!summary) return null;

  const { total, valid, invalid } = summary;

  const downloadErrorCsv = () => {
    if (errors.length === 0) return;
    
    // Construct CSV file headers and rows
    const csvContent = [
      ['Row Number', 'Student Name', 'Roll Number', 'Validation Errors'].join(','),
      ...errors.map((err) => [
        err.row,
        `"${err.studentName.replace(/"/g, '""')}"`,
        `"${err.rollNumber.replace(/"/g, '""')}"`,
        `"${err.reasons.join(' | ').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attend-pro-import-errors-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-3 gap-3.5 select-none">
        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rows</span>
          <span className="text-xl font-bold text-slate-700 mt-1">{total}</span>
        </div>
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Valid Rows</span>
          <span className="text-xl font-bold text-emerald-700 mt-1">{valid}</span>
        </div>
        <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Invalid Rows</span>
          <span className="text-xl font-bold text-red-700 mt-1">{invalid}</span>
        </div>
      </div>

      {/* Warnings & Errors List */}
      {invalid > 0 ? (
        <div className="border border-red-200/60 rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-red-800">Import Disallowed due to Errors</h4>
                <p className="text-[10px] text-red-600 mt-0.5">Please fix all row errors before uploading again.</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownloadErrorCsv || downloadErrorCsv}
              className="text-red-700 border-red-200 hover:bg-red-100/50 hover:border-red-300"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Download Log
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold select-none uppercase text-[9px] tracking-wider">
                  <th className="px-4 py-2">Row</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Roll No</th>
                  <th className="px-4 py-2">Validation Failure Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {errors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-400">{err.row}</td>
                    <td className="px-4 py-2.5 font-medium">{err.studentName}</td>
                    <td className="px-4 py-2.5 font-mono">{err.rollNumber}</td>
                    <td className="px-4 py-2.5">
                      <ul className="list-disc pl-4 flex flex-col gap-0.5 text-red-600 font-medium">
                        {err.reasons.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-800">All Rows Validated Successfully</h4>
            <p className="text-[10px] text-emerald-600 mt-0.5">Ready to insert {valid} student profile records into the database.</p>
          </div>
        </div>
      )}
    </div>
  );
}
