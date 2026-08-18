import React from 'react';
import EmptyState from './EmptyState';
import { Database } from 'lucide-react';

export interface TableColumn<T> {
  label: string;
  key?: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * Reusable Data Table Component with loading skeletons and custom cell rendering.
 */
export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found"
}: TableProps<any>) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto border border-slate-200/60 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/60">
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-100 last:border-0">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-5">
                    <div className="h-4 bg-slate-100 rounded-md animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No Data Found"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-slate-200/60 rounded-2xl bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 font-semibold select-none">
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
          {data.map((row, rIdx) => (
            <tr key={row.id || rIdx} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="px-6 py-4.5 whitespace-nowrap text-slate-600">
                  {col.render ? col.render(row) : (col.key ? row[col.key] : null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
