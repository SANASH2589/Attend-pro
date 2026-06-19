import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { Plus, GraduationCap } from 'lucide-react';

export default function StudentManagement() {
  const breadcrumbs = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Student Management" }
  ];

  // Mock header action button
  const headerActions = (
    <button
      disabled
      className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-not-allowed select-none opacity-80"
    >
      <Plus className="w-4 h-4" />
      <span>Add Student</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Student Management" 
        description="Enroll new students, search profiles, view registrations, and manage department allocations."
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      {/* Filter / Search Bar Section */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SearchBar placeholder="Search student by name, roll number, or department..." />
        
        {/* Mock Filter Selection UI */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            disabled 
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
          >
            <option>All Departments</option>
          </select>
          <select 
            disabled 
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
          >
            <option>All Years</option>
          </select>
        </div>
      </div>

      {/* Table Container with Empty State inside */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Roll Number</th>
                <th className="py-4 px-6">Student Name</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Year</th>
                <th className="py-4 px-6">Section</th>
                <th className="py-4 px-6">Class</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6" className="py-8 px-6">
                  <EmptyState 
                    title="No Students Registered"
                    description="No student profiles are enrolled in the system database. Enroll a new student to view registry logs."
                    icon={GraduationCap}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Mock Table Footer (Pagination) */}
        <div className="bg-white px-6 py-4.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
          <span>Showing 0 to 0 of 0 entries</span>
          <div className="flex items-center gap-1.5">
            <button disabled className="px-3 py-1.5 border border-slate-200 rounded-lg cursor-not-allowed bg-slate-50/50">Previous</button>
            <button disabled className="px-3 py-1.5 border border-slate-200 rounded-lg cursor-not-allowed bg-slate-50/50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
