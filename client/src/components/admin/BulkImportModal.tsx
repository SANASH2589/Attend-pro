import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ImportResultBanner, { ValidationErrorRow, ImportSummary } from './ImportResultBanner';
import studentsApi from '../../api/students';
import { Upload, File, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface StudentImportResult {
  success: boolean;
  summary: ImportSummary;
  errors?: ValidationErrorRow[];
}

/**
 * Bulk Student Import Modal supporting CSV/Excel file uploads,
 * drag-and-drop actions, import feedback summaries, and error logs.
 */
export default function BulkImportModal({
  isOpen,
  onClose,
  onImportSuccess
}: BulkImportModalProps) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>('');
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setDragActive(false);
    setLoading(false);
    setSaving(false);
    setApiError('');
    setImportResult(null);
    setPreviewRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setApiError('');
    setImportResult(null);
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xls', 'xlsx'].includes(extension)) {
      setApiError('Unsupported file type. Please upload a CSV (.csv) or Excel (.xls/.xlsx) spreadsheet.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const triggerFileSelection = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setApiError('');
    setImportResult(null);
    setPreviewRows([]);

    try {
      const result = await studentsApi.importPreview(file);
      
      if (result.success) {
        setImportResult(result as any);
        setPreviewRows(result.previewRows || []);
        showToast(`Roster verified successfully! Ready to save ${result.previewRows?.length} students.`, 'success');
      } else {
        // Validation errors returned
        setImportResult(result as any);
        setPreviewRows([]);
        showToast('Bulk import validation failed. Please check log details.', 'error');
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while uploading file. Please verify network.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImport = async () => {
    if (previewRows.length === 0) return;
    setSaving(true);
    setApiError('');

    try {
      const result = await studentsApi.importSave(previewRows);
      if (result.success) {
        showToast(`Successfully saved ${result.importedCount} student records to database!`, 'success');
        onImportSuccess();
        handleClose();
      }
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while saving student records.');
    } finally {
      setSaving(false);
    }
  };

  const isUploadAllowed = file && !loading && !saving && (!importResult || importResult.success);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Student Roster"
      footer={
        <div className="flex items-center gap-3 w-full justify-between select-none">
          <div className="text-[10px] text-slate-400 font-medium">
            Supported columns: Roll Number, Name, Parent Phone, Email
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading || saving}
            >
              Close
            </Button>
            {importResult && !importResult.success ? (
              <Button
                variant="primary"
                onClick={resetState}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Upload New File
              </Button>
            ) : importResult && importResult.success && previewRows.length > 0 ? (
              <Button
                variant="primary"
                onClick={handleSaveImport}
                loading={saving}
                disabled={saving}
              >
                Save Students
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!isUploadAllowed}
                loading={loading}
              >
                Start Verification
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in select-none">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{apiError}</span>
          </div>
        )}

        {/* Upload Zone */}
        {!importResult && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelection}
            className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
              dragActive
                ? 'border-blue-500 bg-blue-50/40'
                : file
                ? 'border-emerald-300 bg-emerald-50/10'
                : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xls,.xlsx"
              className="hidden"
            />
            {file ? (
              <>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-2xl flex items-center justify-center mb-3">
                  <File className="w-5 h-5 shrink-0" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">{file.name}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-[10px] text-blue-500 font-semibold mt-3">Click or drop to replace file</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-50 text-blue-500 border border-blue-100 rounded-2xl flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 shrink-0" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">Choose CSV or Excel sheet</h4>
                <p className="text-[10px] text-slate-400 mt-1.5 max-w-[240px] leading-relaxed">
                  Drag and drop your roster file here or click to browse files from local machine.
                </p>
              </>
            )}
          </div>
        )}

        {/* Results Banner display */}
        {importResult && (
          <ImportResultBanner
            summary={importResult.summary}
            errors={importResult.errors}
          />
        )}

        {/* Roster Preview for valid rows before saving */}
        {importResult && importResult.success && previewRows.length > 0 && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5 select-none">Roster Preview (First 5 students)</h4>
            <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase select-none tracking-wider text-[9px]">
                    <th className="px-3.5 py-2">Roll No</th>
                    <th className="px-3.5 py-2">Full Name</th>
                    <th className="px-3.5 py-2">Parent Phone</th>
                    <th className="px-3.5 py-2">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {previewRows.slice(0, 5).map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="px-3.5 py-2 font-mono text-slate-500">{row.roll_number}</td>
                      <td className="px-3.5 py-2 font-semibold text-slate-700">{row.full_name}</td>
                      <td className="px-3.5 py-2">{row.parent_phone}</td>
                      <td className="px-3.5 py-2">{row.email || <span className="text-slate-300 italic">N/A</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 5 && (
                <div className="p-2 text-center bg-slate-50/50 border-t border-slate-100 text-[10px] font-semibold text-slate-400 select-none">
                  And {previewRows.length - 5} more students...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
