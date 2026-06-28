import React, { useState, useEffect } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ClassForm from '../../components/admin/ClassForm';
import classesApi from '../../api/classes';
import { useToast } from '../../context/ToastContext';
import { Plus, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

/**
 * Class Configuration Timetable Editor page.
 * Creates, edits schedules, and safely deletes sections subject to attendance guards.
 */
export default function Classes() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConflictError, setDeleteConflictError] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  // Inline delete confirmation
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    setDeleteConflictError('');
    try {
      const data = await classesApi.getAll();
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve class configuration lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    setActionLoading(true);
    setDeleteConflictError('');
    try {
      if (editingClass) {
        const updated = await classesApi.update(editingClass.id, formData);
        showToast(`Class "${updated.name}" updated successfully.`, 'success');
      } else {
        const created = await classesApi.create(formData);
        showToast(`Class "${created.name}" created successfully.`, 'success');
      }
      setIsModalOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      throw err; // propagates to ClassForm apiError banner
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    setActionLoading(true);
    setDeleteConflictError('');
    try {
      await classesApi.delete(id);
      showToast(`Class configuration "${name}" deleted.`, 'success');
      setConfirmingDeleteId(null);
      fetchClasses();
    } catch (err) {
      // Catching 409 and other server error codes
      setDeleteConflictError(err.message || 'Failed to delete class configuration.');
      showToast(err.message || 'Deletion conflict occurred.', 'error');
      setConfirmingDeleteId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const formatWindow = (start, lock) => {
    if (!start || !lock) return <span className="text-slate-300 italic select-none">Disabled</span>;
    return (
      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{start.slice(0, 5)}</span>
        <span className="text-slate-300 font-medium font-sans">→</span>
        <span className="text-slate-400 font-medium">{lock.slice(0, 5)}</span>
      </div>
    );
  };

  const columns = [
    {
      label: 'Class Section Name',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.name}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {row.id.slice(0, 8)}...</span>
        </div>
      )
    },
    {
      label: 'Batch Type',
      key: 'batch_type',
      render: (row) => {
        const types = {
          morning: { label: 'Morning Only', variant: 'warning' },
          evening: { label: 'Evening Only', variant: 'neutral' },
          both: { label: 'Double Batch', variant: 'success' }
        };
        const config = types[row.batch_type] || { label: row.batch_type, variant: 'neutral' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    {
      label: 'Morning Window',
      key: 'morning_start',
      render: (row) => formatWindow(row.morning_start, row.morning_lock)
    },
    {
      label: 'Evening Window',
      key: 'evening_start',
      render: (row) => formatWindow(row.evening_start, row.evening_lock)
    },
    {
      label: 'Assigned Metrics',
      key: 'metrics',
      render: (row) => (
        <div className="flex items-center gap-2 select-none">
          <div className="px-2.5 py-1 bg-blue-50 border border-blue-100/50 rounded-lg text-xs flex gap-1 items-center">
            <span className="text-slate-400 font-medium">Stud:</span>
            <span className="font-bold text-blue-700">{row.student_count || 0}</span>
          </div>
          <div className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs flex gap-1 items-center">
            <span className="text-slate-400 font-medium">Staff:</span>
            <span className="font-bold text-slate-700">{row.staff_count || 0}</span>
          </div>
        </div>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => {
        if (confirmingDeleteId === row.id) {
          return (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(row.id, row.name)}
                disabled={actionLoading}
                className="py-1 px-2.5 text-[11px]"
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDeleteId(null)}
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
                setEditingClass(row);
                setIsModalOpen(true);
              }}
              className="py-1 px-2.5 text-[11px]"
            >
              Edit Timings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDeleteId(row.id)}
              className="py-1 px-2.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete Class
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Class Timetables</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Configure classroom rosters, start times, and late thresholds.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingClass(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4.5 h-4.5 mr-1.5 shrink-0" />
          Create Class
        </Button>
      </div>

      {/* Delete Conflict Error Display Banner */}
      {deleteConflictError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3.5 animate-fade-in select-none">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Delete Action Rejected</h4>
            <p className="mt-0.5">{deleteConflictError}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDeleteConflictError('')} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Dismiss
          </Button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load classes</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchClasses} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div className="w-full">
        <Table
          columns={columns}
          data={classes}
          loading={loading}
          emptyMessage="No class configurations are registered yet."
        />
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        title={editingClass ? `Edit Timings: ${editingClass.name}` : 'Configure Class Timetable'}
      >
        <ClassForm
          classData={editingClass}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingClass(null);
          }}
          loading={actionLoading}
        />
      </Modal>
    </div>
  );
}
