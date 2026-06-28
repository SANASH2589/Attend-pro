import React, { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import StudentForm from '../../components/admin/StudentForm';
import BulkImportModal from '../../components/admin/BulkImportModal';
import studentsApi from '../../api/students';
import classesApi from '../../api/classes';
import { useToast } from '../../context/ToastContext';
import { Search, UserPlus, FileUp, Filter, AlertCircle } from 'lucide-react';

/**
 * Student Registry Management Page.
 * Handles enrollments, search filters, section mappings, and roster spreadsheet imports.
 */
export default function Students() {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Inline deactivation confirmations
  const [confirmingDeactivateId, setConfirmingDeactivateId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch classes first for dropdown filter
      const classesData = await classesApi.getAll();
      setClasses(classesData);

      // Fetch students with current filters
      const studentsData = await studentsApi.getAll({
        search: searchQuery,
        class_id: selectedClassId
      });
      setStudents(studentsData);
    } catch (err) {
      setError(err.message || 'Failed to retrieve database registries.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters change (debounced or on trigger)
  // To keep it responsive and fast, we can trigger fetch on selectedClassId or search change
  useEffect(() => {
    fetchData();
  }, [selectedClassId]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchData();
    }
  };

  const handleSearchTrigger = () => {
    fetchData();
  };

  const handleCreateOrUpdate = async (formData) => {
    setActionLoading(true);
    try {
      if (editingStudent) {
        const updated = await studentsApi.update(editingStudent.id, formData);
        showToast(`Student profile "${updated.full_name}" updated successfully.`, 'success');
      } else {
        const created = await studentsApi.create(formData);
        showToast(`Student profile "${created.full_name}" registered successfully.`, 'success');
      }
      setIsFormModalOpen(false);
      setEditingStudent(null);
      fetchData();
    } catch (err) {
      throw err; // propagates to form apiError banner
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    setActionLoading(true);
    try {
      await studentsApi.deactivate(id);
      showToast(`Student record for "${name}" has been deactivated.`, 'success');
      setConfirmingDeactivateId(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Deactivation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      label: 'Roll Number',
      key: 'roll_number',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 tracking-tight">{row.roll_number}</span>
      )
    },
    {
      label: 'Student Name',
      key: 'full_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.full_name}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">UUID: {row.id.slice(0, 8)}...</span>
        </div>
      )
    },
    {
      label: 'Parent Contact No',
      key: 'parent_phone',
      render: (row) => (
        <span className="font-medium text-slate-600">{row.parent_phone}</span>
      )
    },
    {
      label: 'Email ID',
      key: 'email',
      render: (row) => (
        <span className="font-medium text-slate-500">{row.email || <span className="text-slate-300 italic">No email</span>}</span>
      )
    },
    {
      label: 'Status',
      key: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Active' : 'Deactivated'}
        </Badge>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => {
        if (!row.is_active) return <span className="text-[11px] text-slate-300 font-semibold italic">No actions</span>;

        if (confirmingDeactivateId === row.id) {
          return (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeactivate(row.id, row.full_name)}
                disabled={actionLoading}
                className="py-1 px-2.5 text-[11px]"
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDeactivateId(null)}
                disabled={actionLoading}
                className="py-1 px-2.5 text-[11px]"
              >
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingStudent(row);
                setIsFormModalOpen(true);
              }}
              className="py-1 px-2.5 text-[11px]"
            >
              Edit Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDeactivateId(row.id)}
              className="py-1 px-2.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Deactivate
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Student Registry</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Manage enrollment rosters, contact files, and upload spreadsheets.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
          >
            <FileUp className="w-4 h-4 mr-2 shrink-0 text-slate-500" />
            Bulk Import CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingStudent(null);
              setIsFormModalOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2 shrink-0" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Error display banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load registry</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Control panel (Search & Filter) */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full select-none">
        <div className="flex items-center gap-3 w-full max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by name or roll number... (Press Enter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/40 border border-slate-200/50 focus:border-blue-500/80 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/5"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSearchTrigger}
            className="py-2 px-3 border border-slate-200 bg-white"
          >
            Search
          </Button>
          
          <div className="w-px h-6 bg-slate-200 shrink-0" />

          {/* Class Filter */}
          <div className="relative flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200/50 hover:border-slate-300 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
            >
              <option value="">All Class Sections</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total: {students.length} student records displayed
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full">
        <Table
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage="No student records matched your current filters."
        />
      </div>

      {/* Enroll/Edit Student Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent ? `Update Profile: ${editingStudent.full_name}` : 'Enroll New Student'}
      >
        <StudentForm
          student={editingStudent}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingStudent(null);
          }}
          loading={actionLoading}
        />
      </Modal>

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchData}
      />
    </div>
  );
}
