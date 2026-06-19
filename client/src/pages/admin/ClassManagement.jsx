import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, UserCheck, GraduationCap, Users, Plus } from 'lucide-react';

export default function ClassManagement() {
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'students', 'staff'

  const breadcrumbs = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Class Management" }
  ];

  // Tab configurations
  const tabs = [
    { id: 'classes', label: 'Active Classes', icon: BookOpen },
    { id: 'students', label: 'Student Assignment', icon: GraduationCap },
    { id: 'staff', label: 'Faculty Assignment', icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Class & Course Management" 
        description="Design course timetables, create class segments, and allocate student batches and faculty modules."
        breadcrumbs={breadcrumbs}
        actions={
          activeTab === 'classes' && (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-not-allowed select-none opacity-80"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          )
        }
      />

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-slate-200">
        <div className="flex gap-1.5 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 border-b-2 font-semibold text-xs tracking-wide transition-all duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white/50'
                    : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* TAB 1: Classes Registry */}
        {activeTab === 'classes' && (
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Class Name</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Batch Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="3" className="py-8 px-6">
                      <EmptyState 
                        title="No Classes Available"
                        description="No academic classes have been created yet. Create a class from the header action button."
                        icon={BookOpen}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Student Assignment */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left: Class Selection Dropdown widget */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Target Assignment Class</h3>
                <p className="text-xs text-slate-400 font-medium">Select a class section to batch assign students.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Academic Class</label>
                <select 
                  disabled 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  <option>-- Select Course Section --</option>
                </select>
              </div>
              
              <button
                disabled
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/10 cursor-not-allowed select-none opacity-80"
              >
                Assign Selected Students
              </button>
            </div>

            {/* Right: Student Selection Table Placeholder */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/20">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Unassigned Student Pool</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/10">
                <EmptyState 
                  title="No Student Pool Found"
                  description="Choose a target class section first from the options pane to populate the registry pool."
                  icon={GraduationCap}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Staff Assignment */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Left: Class Selection Dropdown widget */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Target Assignment Class</h3>
                <p className="text-xs text-slate-400 font-medium">Select a class section to allocate a faculty lead.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Academic Class</label>
                <select 
                  disabled 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  <option>-- Select Course Section --</option>
                </select>
              </div>
              
              <button
                disabled
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/10 cursor-not-allowed select-none opacity-80"
              >
                Assign Faculty Member
              </button>
            </div>

            {/* Right: Staff Selection Table Placeholder */}
            <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/20">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Unassigned Staff Pool</h3>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/10">
                <EmptyState 
                  title="No Staff Pool Found"
                  description="Choose a target class section first from the options pane to populate the registry pool."
                  icon={Users}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
