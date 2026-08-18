import React, { useEffect } from 'react';
import { X, User, GraduationCap, Phone, Shield, ClipboardCheck, Calendar } from 'lucide-react';
import Badge from '../../ui/Badge';

export interface DatabaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  viewType: 'students' | 'staff';
}

export default function DatabaseDrawer({
  isOpen,
  onClose,
  record,
  viewType
}: DatabaseDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_err) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Sliding Panel Window */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-slide-in">
        {/* Header Title Bar */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100 font-bold shrink-0">
              {viewType === 'students' ? <GraduationCap className="w-4 h-4 shrink-0" /> : <User className="w-4 h-4 shrink-0" />}
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              {viewType === 'students' ? 'Student Registry Profile' : 'Staff Registry Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close details drawer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-xs text-slate-600">
          {/* Top summary card */}
          <div className="bg-slate-50 border border-slate-200/40 p-4.5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 font-extrabold flex items-center justify-center text-sm select-none">
              {record.full_name ? record.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">{record.full_name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{viewType === 'students' ? `Roll: ${record.roll_number}` : `ID: ${record.staff_id}`}</p>
              <div className="mt-2.5">
                <Badge variant={record.status === 'Active' ? 'success' : 'danger'}>
                  {record.status}
                </Badge>
              </div>
            </div>
          </div>

          {viewType === 'students' ? (
            <>
              {/* Student Details */}
              {/* 1. Academic Information */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Academic Information
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Department</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.department || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Section</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.section || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Assigned Class</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.assigned_class || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Contact Information */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <Phone className="w-3.5 h-3.5" />
                  Contact Information
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Parent Phone</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block select-text">{record.parent_phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Email</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block truncate select-text">{record.email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Record Information */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <Calendar className="w-3.5 h-3.5" />
                  Record Information
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Created</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block leading-relaxed">{formatDate(record.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Updated</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block leading-relaxed">{formatDate(record.last_updated)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Staff Details */}
              {/* 1. Professional Information */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <Shield className="w-3.5 h-3.5" />
                  Professional Profile
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Department</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Designation</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.designation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">System Role</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">Staff Instructor</span>
                  </div>
                </div>
              </div>

              {/* 2. Contact Information */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <Phone className="w-3.5 h-3.5" />
                  Contact Information
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Email Address</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block truncate">{record.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Mobile Number</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{record.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Assigned Classes */}
              <div className="flex flex-col gap-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Assigned Class Timetables
                </h5>
                <div className="flex flex-wrap gap-2">
                  {record.assigned_classes_list && record.assigned_classes_list.length > 0 ? (
                    record.assigned_classes_list.map((cls: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200/40">
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No classes assigned yet.</span>
                  )}
                </div>
              </div>

              {/* 4. Audit logs dates */}
              <div className="flex flex-col gap-3 mt-2">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5 select-none">
                  <Calendar className="w-3.5 h-3.5" />
                  Audit Log Details
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Created Date</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block leading-relaxed">{formatDate(record.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Last Updated</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block leading-relaxed">{formatDate(record.last_updated)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
