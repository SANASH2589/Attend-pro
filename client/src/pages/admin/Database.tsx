import React, { useState, useEffect } from 'react'; // Database Module
import DatabaseFilters from '../../components/admin/database/DatabaseFilters';
import DatabaseToolbar from '../../components/admin/database/DatabaseToolbar';
import DatabaseTable from '../../components/admin/database/DatabaseTable';
import DatabasePagination from '../../components/admin/database/DatabasePagination';
import DatabaseDrawer from '../../components/admin/database/DatabaseDrawer';
import DatabaseEditModal from '../../components/admin/database/DatabaseEditModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import databaseApi from '../../api/database';
import classesApi from '../../api/classes';
import studentsApi from '../../api/students';
import staffApi from '../../api/staff';
import { useToast } from '../../context/ToastContext';

export default function Database() {
  const { showToast } = useToast();
  
  // Tabs & Views
  const [viewType, setViewType] = useState<'students' | 'staff'>('students');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  
  // Classes list for filter
  const [classes, setClasses] = useState<any[]>([]);
  
  // Query parameters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('roll_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filters state
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // Checkbox selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Drawers and Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any>(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounced search query trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch classes once on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await classesApi.getAll();
        setClasses(classesData);
      } catch (err: any) {
        showToast('Failed to load class selections.', 'error');
      }
    };
    fetchClasses();
  }, []);

  // Set default sorting key on tab switch
  useEffect(() => {
    setSortBy(viewType === 'students' ? 'roll_number' : 'full_name');
    setSortOrder('asc');
    setPage(1);
    setSelectedIds([]);
    setFilters({});
  }, [viewType]);

  // Re-fetch records when dependencies change
  useEffect(() => {
    fetchRecords();
  }, [viewType, page, pageSize, sortBy, sortOrder, filters]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        search: searchQuery,
        sortBy,
        sortOrder,
        ...filters
      };
      
      const res = viewType === 'students'
        ? await databaseApi.getStudents(params)
        : await databaseApi.getStaff(params);

      setRecords(res.records || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Failed to retrieve database logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filters handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Sorting handler
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Selections handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allOnPage = records.map(r => r.id);
    const areAllSelected = allOnPage.every(id => selectedIds.includes(id));
    
    if (areAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allOnPage.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        allOnPage.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  // Action column handlers
  const handleView = (record: any) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  };

  const handleEdit = (record: any) => {
    setRecordToEdit(record);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (formData: any) => {
    try {
      if (viewType === 'students') {
        await studentsApi.update(recordToEdit.id, formData);
        showToast('Student details updated successfully.', 'success');
      } else {
        await staffApi.update(recordToEdit.id, formData);
        showToast('Staff details updated successfully.', 'success');
      }
      fetchRecords();
    } catch (err: any) {
      showToast(err.message || 'Failed to update record.', 'error');
      throw err;
    }
  };

  const handleDeletePrompt = (record: any) => {
    setRecordToDelete(record);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setActionLoading(true);
    try {
      if (viewType === 'students') {
        await studentsApi.deactivate(recordToDelete.id);
        showToast(`Student record for "${recordToDelete.full_name}" deactivated successfully.`, 'success');
      } else {
        await staffApi.deactivate(recordToDelete.id);
        showToast(`Staff profile for "${recordToDelete.full_name}" deactivated successfully.`, 'success');
      }
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
      fetchRecords();
    } catch (err: any) {
      showToast(err.message || 'Deactivation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk operation handlers
  const handleBulkStatusUpdate = async (status: 'Active' | 'Inactive') => {
    setActionLoading(true);
    try {
      if (viewType === 'students') {
        await databaseApi.bulkStatusStudents(selectedIds, status);
      } else {
        await databaseApi.bulkStatusStaff(selectedIds, status);
      }
      showToast(`Bulk updated ${selectedIds.length} records to ${status}.`, 'success');
      setSelectedIds([]);
      fetchRecords();
    } catch (err: any) {
      showToast(err.message || 'Bulk status update failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      if (viewType === 'students') {
        await databaseApi.bulkDeleteStudents(selectedIds);
      } else {
        await databaseApi.bulkDeleteStaff(selectedIds);
      }
      showToast(`Bulk deactivated ${selectedIds.length} records.`, 'success');
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      fetchRecords();
    } catch (err: any) {
      showToast(err.message || 'Bulk deletion failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Common export utility
  const handleExport = (format: 'csv' | 'excel' | 'pdf', dataset: any[]) => {
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '—';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      } catch (_err) {
        return dateStr;
      }
    };

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const title = `${viewType === 'students' ? 'Students' : 'Staff'} Database Export`;
      const headers = viewType === 'students' 
        ? ['Roll Number', 'Name', 'Department', 'Section', 'Email', 'Parent Phone', 'Assigned Class', 'Status', 'Created', 'Updated']
        : ['Staff ID', 'Name', 'Department', 'Designation', 'Email', 'Mobile', 'Assigned Classes', 'Status'];

      const rowsHtml = dataset.map(row => {
        const cols = viewType === 'students'
          ? [row.roll_number, row.full_name, row.department || '—', row.section || '—', row.email || '—', row.parent_phone, row.assigned_class, row.status, formatDate(row.created_at), formatDate(row.last_updated)]
          : [row.staff_id, row.full_name, row.department, row.designation, row.email, row.phone || 'N/A', row.assigned_classes, row.status];
        return `<tr>${cols.map(c => `<td style="padding: 8px; border: 1px solid #ddd;">${c}</td>`).join('')}</tr>`;
      }).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
              th { background-color: #f1f5f9; padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: left; }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }

    const headers = viewType === 'students'
      ? ['Roll Number', 'Name', 'Dept', 'Sec', 'Parent Phone', 'Email', 'Assigned Class', 'Status', 'Created', 'Updated']
      : ['Staff ID', 'Staff Name', 'Department', 'Designation', 'Email', 'Mobile Number', 'Assigned Classes', 'Role', 'Status', 'Created Date', 'Last Updated'];

    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    dataset.forEach(row => {
      const values = viewType === 'students'
        ? [row.roll_number, row.full_name, row.department || '', row.section || '', row.parent_phone, row.email || '', row.assigned_class, row.status, formatDate(row.created_at), formatDate(row.last_updated)]
        : [row.staff_id, row.full_name, row.department, row.designation, row.email, row.phone || '', row.assigned_classes, row.role, row.status, row.created_at, row.last_updated];

      csvRows.push(values.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${viewType}_database_export_${new Date().getTime()}.${format === 'excel' ? 'xls' : 'csv'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkExport = (format: 'csv' | 'excel' | 'pdf') => {
    const selectedRecords = records.filter(r => selectedIds.includes(r.id));
    handleExport(format, selectedRecords);
    showToast(`Successfully exported ${selectedRecords.length} records.`, 'success');
  };

  const handleGeneralExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const params = {
        page: 1,
        pageSize: 100000, // retrieve all records matching criteria
        search: searchQuery,
        sortBy,
        sortOrder,
        ...filters
      };
      const res = viewType === 'students'
        ? await databaseApi.getStudents(params)
        : await databaseApi.getStaff(params);

      handleExport(format, res.records);
      showToast('Filtered records exported successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-700 animate-fade-in select-none">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Database Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Search, filter, export, and manage all student and staff registries in bulk.
          </p>
        </div>
      </div>

      {/* Main Form Toolbar: toggle tab and search */}
      <DatabaseToolbar
        viewType={viewType}
        onViewTypeChange={setViewType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedIds.length}
        onBulkDelete={() => setBulkDeleteConfirmOpen(true)}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkExport={handleBulkExport}
        onGeneralExport={handleGeneralExport}
      />

      {/* Advanced Filters */}
      <DatabaseFilters
        viewType={viewType}
        classes={classes}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Data Table */}
      <DatabaseTable
        viewType={viewType}
        data={records}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDeletePrompt}
      />

      {/* Pagination */}
      {records.length > 0 && !loading && (
        <DatabasePagination
          page={page}
          pageSize={pageSize}
          total={total}
          viewType={viewType}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Side Profile Details Drawer */}
      <DatabaseDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        viewType={viewType}
      />

      {/* Edit Record Modal */}
      <DatabaseEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setRecordToEdit(null);
        }}
        record={recordToEdit}
        viewType={viewType}
        onSave={handleSaveEdit}
      />

      {/* Single Record Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRecordToDelete(null);
        }}
        title="Confirm Record Deactivation"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            Are you sure you want to deactivate the registry record for{' '}
            <strong className="text-slate-800">{recordToDelete?.full_name}</strong>?
            This will set their status to Inactive but will preserve historical attendance data.
          </p>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setRecordToDelete(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deactivating...' : 'Confirm Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title="Confirm Bulk Deactivation"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            Are you sure you want to deactivate <strong className="text-slate-800">{selectedIds.length}</strong> selected record(s)?
            This operation will update all selected registry profiles to Inactive.
          </p>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm Bulk Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
