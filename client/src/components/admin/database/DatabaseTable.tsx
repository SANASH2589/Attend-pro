import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit3, Trash2, Loader2, CheckSquare, Square, Inbox } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';

export interface DatabaseTableProps {
  viewType: 'students' | 'staff';
  data: any[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function DatabaseTable({
  viewType,
  data = [],
  loading = false,
  sortBy,
  sortOrder,
  onSort,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete
}: DatabaseTableProps) {
  const allSelected = data.length > 0 && data.every(row => selectedIds.includes(row.id));
  const someSelected = data.length > 0 && data.some(row => selectedIds.includes(row.id)) && !allSelected;

  const renderSortIcon = (key: string) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-500" />
      : <ArrowDown className="w-3 h-3 text-blue-500" />;
  };

  const renderHeader = (label: string, sortKey?: string) => {
    if (!sortKey) {
      return (
        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </th>
      );
    }
    return (
      <th 
        onClick={() => onSort(sortKey)}
        className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 select-none">
          <span>{label}</span>
          {renderSortIcon(sortKey)}
        </div>
      </th>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (_err) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-slate-200/60 rounded-2xl bg-white shadow-sm overflow-hidden select-none">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-semibold text-slate-400 animate-pulse">Retrieving records from database...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No Records Found"
        description={`No ${viewType === 'students' ? 'student' : 'staff'} database entries match your active query filters.`}
      />
    );
  }

  return (
    <div className="w-full border border-slate-200/60 rounded-2xl bg-white shadow-sm overflow-x-auto select-none">
      <table className="w-full border-collapse text-left min-w-[1200px]">
        <thead>
          <tr className="border-b border-slate-200/60 bg-slate-50/60 text-slate-500 font-semibold">
            {/* Checkbox Header */}
            <th className="px-5 py-3.5 w-12 text-center">
              <button
                onClick={onToggleSelectAll}
                className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                aria-label="Select all rows"
              >
                {allSelected ? (
                  <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                ) : someSelected ? (
                  <div className="w-4.5 h-4.5 bg-blue-100 border border-blue-500 rounded flex items-center justify-center">
                    <div className="w-2.5 h-0.5 bg-blue-600 rounded-sm" />
                  </div>
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>
            </th>

            {viewType === 'students' ? (
              <>
                {renderHeader('Roll Number', 'roll_number')}
                {renderHeader('Name', 'full_name')}
                {renderHeader('Dept', 'department')}
                {renderHeader('Sec', 'section')}
                {renderHeader('Parent Phone', 'parent_phone')}
                {renderHeader('Email', 'email')}
                {renderHeader('Assigned Class', 'assigned_class')}
                {renderHeader('Status', 'status')}
                {renderHeader('Created', 'created_at')}
                {renderHeader('Updated', 'last_updated')}
              </>
            ) : (
              <>
                {renderHeader('Staff ID', 'staff_id')}
                {renderHeader('Staff Name', 'full_name')}
                {renderHeader('Dept', 'department')}
                {renderHeader('Designation', 'designation')}
                {renderHeader('Email Address', 'email')}
                {renderHeader('Mobile Number', 'phone')}
                {renderHeader('Assigned Classes', 'assigned_classes')}
                {renderHeader('Role', 'role')}
                {renderHeader('Status', 'status')}
                {renderHeader('Created', 'created_at')}
                {renderHeader('Updated', 'last_updated')}
              </>
            )}
            
            {/* Actions Header */}
            <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-50/60 shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.04)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
          {data.map((row) => {
            const isSelected = selectedIds.includes(row.id);
            return (
              <tr 
                key={row.id} 
                className={`hover:bg-slate-50/50 transition-colors ${
                  isSelected ? 'bg-blue-50/30 hover:bg-blue-50/40' : ''
                }`}
              >
                {/* Checkbox Column */}
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => onToggleSelect(row.id)}
                    className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                    aria-label="Select row"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>
                </td>

                {viewType === 'students' ? (
                  <>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{row.roll_number}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">{row.full_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-500">{row.department || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-500">{row.section || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{row.parent_phone}</td>
                    <td className="px-5 py-3.5 text-slate-500 truncate max-w-[150px]">{row.email || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        row.assigned_class === 'Unassigned'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {row.assigned_class}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(row.last_updated)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{row.staff_id}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">{row.full_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-500">{row.department}</td>
                    <td className="px-5 py-3.5 text-slate-500">{row.designation}</td>
                    <td className="px-5 py-3.5 text-slate-500 truncate max-w-[150px]">{row.email}</td>
                    <td className="px-5 py-3.5 text-slate-500">{row.phone || 'N/A'}</td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate" title={row.assigned_classes}>
                      {row.assigned_classes}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{row.role}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={row.status === 'Active' ? 'success' : 'danger'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(row.last_updated)}</td>
                  </>
                )}

                {/* Actions Column */}
                <td className="px-5 py-3.5 text-center sticky right-0 bg-white shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.04)] group-hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onView(row)}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer transition-all"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1 rounded-lg border border-blue-100 bg-blue-50/60 hover:bg-blue-100 hover:border-blue-200 text-blue-600 cursor-pointer transition-all"
                      title="Edit Record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(row)}
                      className="p-1 rounded-lg border border-red-100 bg-red-50/60 hover:bg-red-100 hover:border-red-200 text-red-600 cursor-pointer transition-all"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
