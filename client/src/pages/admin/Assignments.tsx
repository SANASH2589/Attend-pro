import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import classesApi from '../../api/classes';
import assignmentsApi from '../../api/assignments';
import { useToast } from '../../context/ToastContext';
import { 
  Users, 
  GraduationCap, 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  FolderOpen
} from 'lucide-react';
import { Class as ClassType } from '../../types/class';

interface AssignmentItem {
  id: string;
  full_name: string;
  roll_number?: string;
  email?: string;
}

/**
 * Class Assignments Panel Page.
 * Handles dual-panel transfers for students and faculty sections, saving changes reactively.
 */
export default function Assignments() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [mode, setMode] = useState<'students' | 'staff'>('students');
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingLists, setLoadingLists] = useState<boolean>(false);
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Lists data
  const [assignedList, setAssignedList] = useState<AssignmentItem[]>([]);
  const [unassignedList, setUnassignedList] = useState<AssignmentItem[]>([]);
  
  // Search state
  const [searchLeft, setSearchLeft] = useState<string>('');
  const [searchRight, setSearchRight] = useState<string>('');
  
  // Error state
  const [error, setError] = useState<string>('');

  // Unassign inline confirmation ID
  const [confirmingUnassignId, setConfirmingUnassignId] = useState<string | null>(null);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    setError('');
    try {
      const data = await classesApi.getAll();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load class sections.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedClassId) return;
    setLoadingLists(true);
    setError('');
    setConfirmingUnassignId(null);
    try {
      let data;
      if (mode === 'students') {
        data = await assignmentsApi.getStudentsForClass(selectedClassId);
      } else {
        data = await assignmentsApi.getStaffForClass(selectedClassId);
      }
      setAssignedList(data.assigned || []);
      setUnassignedList(data.unassigned || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment rosters.');
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedClassId, mode]);

  const handleAssign = async (itemId: string) => {
    setActionId(itemId);
    try {
      if (mode === 'students') {
        await assignmentsApi.assignStudent(itemId, selectedClassId);
        showToast('Student successfully assigned to section.', 'success');
      } else {
        await assignmentsApi.assignStaff(itemId, selectedClassId);
        showToast('Faculty member successfully assigned to section.', 'success');
      }
      fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Failed to save assignment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleUnassign = async (itemId: string) => {
    setActionId(itemId);
    try {
      if (mode === 'students') {
        await assignmentsApi.unassignStudent(itemId, selectedClassId);
        showToast('Student successfully unassigned from section.', 'success');
      } else {
        await assignmentsApi.unassignStaff(itemId, selectedClassId);
        showToast('Faculty member successfully unassigned from section.', 'success');
      }
      setConfirmingUnassignId(null);
      fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove assignment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkAssign = async () => {
    if (filteredUnassigned.length === 0) return;
    setActionId('bulk-assign');
    try {
      if (mode === 'students') {
        await Promise.all(
          filteredUnassigned.map(item => assignmentsApi.assignStudent(item.id, selectedClassId))
        );
        showToast(`Successfully assigned ${filteredUnassigned.length} students.`, 'success');
      } else {
        await Promise.all(
          filteredUnassigned.map(item => assignmentsApi.assignStaff(item.id, selectedClassId))
        );
        showToast(`Successfully assigned ${filteredUnassigned.length} faculty members.`, 'success');
      }
      fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Failed bulk assignment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkUnassign = async () => {
    if (filteredAssigned.length === 0) return;
    setActionId('bulk-unassign');
    try {
      if (mode === 'students') {
        await Promise.all(
          filteredAssigned.map(item => assignmentsApi.unassignStudent(item.id, selectedClassId))
        );
        showToast(`Successfully unassigned ${filteredAssigned.length} students.`, 'success');
      } else {
        await Promise.all(
          filteredAssigned.map(item => assignmentsApi.unassignStaff(item.id, selectedClassId))
        );
        showToast(`Successfully unassigned ${filteredAssigned.length} faculty members.`, 'success');
      }
      fetchAssignments();
    } catch (err: any) {
      showToast(err.message || 'Failed bulk unassignment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  // Filter unassigned list
  const filteredUnassigned = unassignedList.filter(item => {
    const term = searchLeft.toLowerCase();
    const nameMatch = (item.full_name || '').toLowerCase().includes(term);
    const identifierMatch = mode === 'students' 
      ? (item.roll_number || '').toLowerCase().includes(term)
      : (item.email || '').toLowerCase().includes(term);
    return nameMatch || identifierMatch;
  });

  // Filter assigned list
  const filteredAssigned = assignedList.filter(item => {
    const term = searchRight.toLowerCase();
    const nameMatch = (item.full_name || '').toLowerCase().includes(term);
    const identifierMatch = mode === 'students' 
      ? (item.roll_number || '').toLowerCase().includes(term)
      : (item.email || '').toLowerCase().includes(term);
    return nameMatch || identifierMatch;
  });

  const getClassName = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? cls.name : '';
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Roster Assignments</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Map students and assign teaching staff to class sections reactively.</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Database Error</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchAssignments} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Control Configuration Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full select-none">
        <div className="flex flex-wrap items-center gap-4.5">
          {/* Class Select Dropdown */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500">Target Section:</span>
            {loadingClasses ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-0.5">
            <button
              onClick={() => setMode('students')}
              className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'students'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              Students Assign
            </button>
            <button
              onClick={() => setMode('staff')}
              className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'staff'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              Faculty Mapping
            </button>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold select-none">
          Class: <span className="text-slate-700 font-bold">{getClassName() || 'None'}</span>
        </div>
      </div>

      {classes.length === 0 && !loadingClasses ? (
        <EmptyState
          icon={FolderOpen}
          title="No Class Sections Registered"
          description="Register a class section from the timetable editor before allocating students or faculty mapping."
        />
      ) : (
        /* Dual List Panel Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Left panel: Unassigned list */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between select-none">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Unassigned {mode === 'students' ? 'Students' : 'Faculty'}
              </h3>
              <div className="flex items-center gap-3">
                {filteredUnassigned.length > 0 && (
                  <button
                    onClick={handleBulkAssign}
                    disabled={actionId !== null}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    Assign All
                  </button>
                )}
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 select-none">
                  {filteredUnassigned.length} items
                </span>
              </div>
            </div>
            
            <div className="p-4 border-b border-slate-100/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={`Search available ${mode === 'students' ? 'students by name, roll...' : 'faculty...'}`}
                  value={searchLeft}
                  onChange={(e) => setSearchLeft(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 bg-slate-50 hover:bg-slate-100/30 border border-slate-200/40 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto min-h-[300px]">
              {loadingLists ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs font-semibold">Syncing lists...</span>
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
                  <span className="text-xs font-medium">No available items.</span>
                </div>
              ) : (
                filteredUnassigned.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {mode === 'students' ? `Roll: ${item.roll_number}` : item.email}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleAssign(item.id)}
                      disabled={actionId !== null}
                      className="p-1.5 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 text-blue-600 transition-all focus:outline-none cursor-pointer shrink-0 disabled:opacity-50"
                      title="Assign to Section"
                    >
                      {actionId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Assigned list */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between select-none">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned to {getClassName() || 'Section'}
              </h3>
              <div className="flex items-center gap-3">
                {filteredAssigned.length > 0 && (
                  <button
                    onClick={handleBulkUnassign}
                    disabled={actionId !== null}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                  >
                    Unassign All
                  </button>
                )}
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 select-none">
                  {filteredAssigned.length} items
                </span>
              </div>
            </div>
            
            <div className="p-4 border-b border-slate-100/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={`Search assigned ${mode === 'students' ? 'students...' : 'faculty...'}`}
                  value={searchRight}
                  onChange={(e) => setSearchRight(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 bg-slate-50 hover:bg-slate-100/30 border border-slate-200/40 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto min-h-[300px]">
              {loadingLists ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs font-semibold">Syncing lists...</span>
                </div>
              ) : filteredAssigned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
                  <span className="text-xs font-medium">Roster currently empty.</span>
                </div>
              ) : (
                filteredAssigned.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {mode === 'students' ? `Roll: ${item.roll_number}` : item.email}
                      </span>
                    </div>

                    {/* Inline Confirmation for Unassign */}
                    {confirmingUnassignId === item.id ? (
                      <div className="flex items-center gap-1 shrink-0 animate-fade-in">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleUnassign(item.id)}
                          disabled={actionId !== null}
                          className="py-1 px-2.5 text-[10px]"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmingUnassignId(null)}
                          disabled={actionId !== null}
                          className="py-1 px-2.5 text-[10px] bg-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingUnassignId(item.id)}
                        disabled={actionId !== null}
                        className="p-1.5 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 text-red-600 transition-all focus:outline-none cursor-pointer shrink-0 disabled:opacity-50"
                        title="Unassign from Section"
                      >
                        {actionId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowLeft className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
