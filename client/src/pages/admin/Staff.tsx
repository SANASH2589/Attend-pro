import React, { useState, useEffect } from 'react';
import Table, { TableColumn } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import StaffForm from '../../components/admin/StaffForm';
import staffApi from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { Search, UserPlus, AlertCircle, ShieldAlert, Key } from 'lucide-react';
import { Staff as StaffType } from '../../types/staff';
import Input from '../../components/ui/Input';

interface ExtendedStaff extends StaffType {
  is_active?: boolean;
}

/**
 * Staff Registry Management Page.
 * Allows searching, creating, editing, and inline deactivating staff accounts.
 */
export default function Staff() {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState<ExtendedStaff[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<ExtendedStaff | null>(null);

  // Destructive actions state (inline confirmation ID)
  const [confirmingDeactivateId, setConfirmingDeactivateId] = useState<string | null>(null);

  // Reset password state
  const [resettingStaff, setResettingStaff] = useState<ExtendedStaff | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetError, setResetError] = useState<string>('');

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffApi.getAll();
      setStaffList(data as ExtendedStaff[]);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve staff records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateOrUpdate = async (formData: any) => {
    setActionLoading(true);
    try {
      if (editingStaff) {
        // Edit flow
        const updated = await staffApi.update(editingStaff.id, formData);
        showToast(`Staff member "${updated.full_name}" updated successfully.`, 'success');
      } else {
        // Create flow
        const created = await staffApi.create(formData);
        showToast(`Staff member "${created.full_name}" registered successfully.`, 'success');
      }
      setIsModalOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      throw err; // Form catches this to show error banner inside modal
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resettingStaff) return;
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    setActionLoading(true);
    setResetError('');
    try {
      await staffApi.resetPassword(resettingStaff.id, newPassword);
      showToast(`Password for "${resettingStaff.full_name}" has been reset.`, 'success');
      setResettingStaff(null);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    setActionLoading(true);
    try {
      await staffApi.deactivate(id);
      showToast(`Account for "${name}" has been deactivated.`, 'success');
      setConfirmingDeactivateId(null);
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'Deactivation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStaff = staffList.filter((item) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (item.full_name || '').toLowerCase().includes(query);
    const emailMatch = (item.email || '').toLowerCase().includes(query);
    const phoneMatch = (item.phone || '').toLowerCase().includes(query);
    return nameMatch || emailMatch || phoneMatch;
  });

  const columns: TableColumn<ExtendedStaff>[] = [
    {
      label: 'Staff Member Name',
      key: 'full_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.full_name}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {row.id.slice(0, 8)}...</span>
        </div>
      )
    },
    {
      label: 'Email Address',
      key: 'email',
      render: (row) => (
        <span className="font-medium text-slate-600">{row.email}</span>
      )
    },
    {
      label: 'Phone Contact',
      key: 'phone',
      render: (row) => (
        <span className="text-slate-500 font-medium">{row.phone || <span className="text-slate-300 italic">No number</span>}</span>
      )
    },
    {
      label: 'Account Status',
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
                setEditingStaff(row);
                setIsModalOpen(true);
              }}
              className="py-1 px-2.5 text-[11px]"
            >
              Edit Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResettingStaff(row);
                setNewPassword('');
                setResetError('');
              }}
              className="py-1 px-2.5 text-[11px] text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              Reset PW
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Staff Directories</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Create, edit, and deactivate college faculty credentials.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingStaff(null);
            setIsModalOpen(true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2 shrink-0" />
          Register Staff
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fade-in select-none">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <h4 className="font-bold">Failed to load registry</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchStaff} className="shrink-0 border-red-200 text-red-700 hover:bg-red-100/50">
            Retry
          </Button>
        </div>
      )}

      {/* Control panel (Search & Filter) */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between w-full">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search staff by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/40 border border-slate-200/50 focus:border-blue-500/80 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/5"
          />
        </div>
        <div className="text-[10px] text-slate-400 font-semibold select-none">
          Total: {filteredStaff.length} of {staffList.length} staff records
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full">
        <Table
          columns={columns}
          data={filteredStaff}
          loading={loading}
          emptyMessage="No staff records matched your query."
        />
      </div>

      {/* Modal Dialog for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        title={editingStaff ? `Edit Profile: ${editingStaff.full_name}` : 'Register Faculty Member'}
      >
        <StaffForm
          staff={editingStaff}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingStaff(null);
          }}
          loading={actionLoading}
        />
      </Modal>

      {/* Modal for Reset Password */}
      <Modal
        isOpen={!!resettingStaff}
        onClose={() => {
          setResettingStaff(null);
          setNewPassword('');
          setResetError('');
        }}
        title={`Reset Password: ${resettingStaff?.full_name}`}
      >
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          {resetError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{resetError}</span>
            </div>
          )}
          <Input
            label="New Password"
            id="new_password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setResetError('');
            }}
            placeholder="Enter at least 6 characters"
            required
            disabled={actionLoading}
          />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => {
                setResettingStaff(null);
                setNewPassword('');
                setResetError('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
            >
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
