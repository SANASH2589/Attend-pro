import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DatabasePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  viewType: 'students' | 'staff';
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function DatabasePagination({
  page,
  pageSize,
  total,
  viewType,
  onPageChange,
  onPageSizeChange
}: DatabasePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  const fromIndex = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const toIndex = Math.min(page * pageSize, total);

  const handlePrevPage = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      {/* 1. Showing range */}
      <div className="text-xs font-semibold text-slate-500">
        Showing <span className="text-slate-800 font-bold">{fromIndex}–{toIndex}</span> of <span className="text-slate-800 font-bold">{total}</span> {viewType === 'students' ? 'Students' : 'Staff'}
      </div>

      <div className="flex items-center gap-6">
        {/* 2. Rows per page selector */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(parseInt(e.target.value, 10));
              onPageChange(1); // Reset to first page
            }}
            className="bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* 3. Page navigation arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="p-1.5 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
          </button>
          
          <div className="text-xs font-bold text-slate-700">
            Page {page} of {totalPages}
          </div>

          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="p-1.5 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
