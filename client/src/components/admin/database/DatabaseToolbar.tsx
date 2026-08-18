import React from 'react';
import { Search, Trash2, FileOutput, CheckSquare, Square, ShieldAlert } from 'lucide-react';
import Button from '../../ui/Button';

export interface DatabaseToolbarProps {
  viewType: 'students' | 'staff';
  onViewTypeChange: (type: 'students' | 'staff') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkStatusUpdate: (status: 'Active' | 'Inactive') => void;
  onBulkExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onGeneralExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

export default function DatabaseToolbar({
  viewType,
  onViewTypeChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkExport,
  onGeneralExport
}: DatabaseToolbarProps) {
  return (
    <div className="flex flex-col gap-4 select-none">
      {/* 1. Switcher Tabs */}
      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center self-start border border-slate-200/20">
        <button
          onClick={() => onViewTypeChange('students')}
          className={`py-1.5 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewType === 'students'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Students
        </button>
        <button
          onClick={() => onViewTypeChange('staff')}
          className={`py-1.5 px-5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewType === 'staff'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff
        </button>
      </div>

      {/* 2. Main Search and Export Actions */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={`Search ${viewType === 'students' ? 'students' : 'staff'} by name, email, roll, class...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10.5 pr-4 py-2 bg-slate-50 hover:bg-slate-100/30 border border-slate-200/40 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
          />
        </div>

        {/* General Export Actions */}
        {selectedCount === 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Export filtered:</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGeneralExport('csv')}
              className="py-1.5 px-3 text-[11px]"
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGeneralExport('excel')}
              className="py-1.5 px-3 text-[11px]"
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onGeneralExport('pdf')}
              className="py-1.5 px-3 text-[11px]"
            >
              PDF
            </Button>
          </div>
        )}

        {/* 3. Bulk Actions Toolbar (Visible when count > 0) */}
        {selectedCount > 0 && (
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-bold text-blue-700">
                {selectedCount} {viewType === 'students' ? 'students' : 'records'} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onBulkStatusUpdate('Active')}
                className="py-1 px-2.5 text-[10px] bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700"
              >
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onBulkStatusUpdate('Inactive')}
                className="py-1 px-2.5 text-[10px] text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
              >
                Deactivate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onBulkExport('csv')}
                className="py-1 px-2.5 text-[10px] text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
              >
                Export Selected
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onBulkDelete}
                className="py-1 px-2.5 text-[10px] flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
