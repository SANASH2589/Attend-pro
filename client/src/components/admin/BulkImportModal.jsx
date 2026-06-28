import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ImportResultBanner from './ImportResultBanner';
import studentsApi from '../../api/students';
import { Upload, File, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Bulk Student Import Modal supporting CSV/Excel file uploads,
 * drag-and-drop actions, import feedback summaries, and error logs.
 */
export default function BulkImportModal({
  isOpen,
  onClose,
  onImportSuccess
}) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setDragActive(false);
    setLoading(false);
    setApiError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setApiError('');
    setImportResult(null);
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(extension)) {
      setApiError('Unsupported file type. Please upload a CSV (.csv) or Excel (.xls/.xlsx) spreadsheet.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const triggerFileSelection = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setApiError('');
    setImportResult(null);

    try {
      const result = await studentsApi.importBulk(file);
      
      if (result.success) {
        showToast(`Successfully imported ${result.summary.valid} student records!`, 'success');
        onImportSuccess();
        handleClose();
      } else {
        // Validation errors returned
        setImportResult(result);
        showToast('Bulk import validation failed. Please check log details.', 'error');
      }
    } catch (err) {
      setApiError(err.message || 'An error occurred while uploading file. Please verify network.');
    } finally {
      setLoading(false);
    }
  };

  const isUploadAllowed = file && !loading && (!importResult || importResult.success);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Student Roster"
      footer={
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="text-[10px] text-slate-400 font-medium">
            Supported columns: Roll Number, Name, Parent Phone, Email
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
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
      </div>
    </Modal>
  );
}
