import React from 'react';
import { Filter, X } from 'lucide-react';

export interface DatabaseFiltersProps {
  viewType: 'students' | 'staff';
  classes: { id: string; name: string }[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export default function DatabaseFilters({
  viewType,
  classes = [],
  filters = {},
  onFilterChange,
  onClearFilters
}: DatabaseFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const departments = ['IT', 'CS', 'ME', 'EC'];
  const years = ['1', '2', '3', '4'];
  const sections = ['A', 'B', 'C'];
  const genders = ['Male', 'Female'];
  const statuses = ['Active', 'Inactive'];
  const lateralEntry = ['Yes', 'No'];
  const attendanceRanges = [
    { label: 'Under 50%', value: '<50' },
    { label: '50% - 75%', value: '50-75' },
    { label: 'Above 75%', value: '>75' }
  ];
  const designations = ['Assistant Professor', 'Associate Professor', 'Professor'];
  const roles = ['Staff', 'Super Admin'];

  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Advanced Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
        {viewType === 'students' ? (
          <>
            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Dept</label>
              <select
                value={filters.department || ''}
                onChange={e => onFilterChange('department', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
              <select
                value={filters.year || ''}
                onChange={e => onFilterChange('year', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Section</label>
              <select
                value={filters.section || ''}
                onChange={e => onFilterChange('section', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {sections.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Assigned Class */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Class</label>
              <select
                value={filters.assigned_class || ''}
                onChange={e => onFilterChange('assigned_class', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                <option value="Unassigned">Unassigned</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Gender</label>
              <select
                value={filters.gender || ''}
                onChange={e => onFilterChange('gender', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {genders.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
              <select
                value={filters.status || ''}
                onChange={e => onFilterChange('status', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Lateral Entry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Lateral</label>
              <select
                value={filters.lateral_entry || ''}
                onChange={e => onFilterChange('lateral_entry', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {lateralEntry.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Attendance % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Attendance %</label>
              <select
                value={filters.attendance_percentage || ''}
                onChange={e => onFilterChange('attendance_percentage', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {attendanceRanges.map(ar => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Staff - Department */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
              <select
                value={filters.department || ''}
                onChange={e => onFilterChange('department', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Staff - Role */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
              <select
                value={filters.role || ''}
                onChange={e => onFilterChange('role', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All Roles</option>
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Staff - Assigned Class */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Class</label>
              <select
                value={filters.assigned_class || ''}
                onChange={e => onFilterChange('assigned_class', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All Classes</option>
                <option value="None">None</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Staff - Status */}
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
              <select
                value={filters.status || ''}
                onChange={e => onFilterChange('status', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Staff - Designation */}
            <div className="flex flex-col gap-1.5 col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Designation</label>
              <select
                value={filters.designation || ''}
                onChange={e => onFilterChange('designation', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 py-1.5 px-2.5 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">All</option>
                {designations.map(ds => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
