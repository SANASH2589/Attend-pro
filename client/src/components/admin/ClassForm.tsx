import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AlertCircle } from 'lucide-react';
import { Class } from '../../types/class';

export interface ClassFormProps {
  classData?: Class | null;
  onSave: (payload: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormState {
  name: string;
  batch_type: 'morning' | 'evening' | 'both';
  morning_start: string;
  morning_lock: string;
  evening_start: string;
  evening_lock: string;
}

/**
 * Class Configuration Creation and Editing Form component.
 */
export default function ClassForm({
  classData = null, // If provided, we are editing
  onSave,
  onCancel,
  loading = false
}: ClassFormProps) {
  const isEditing = !!classData;
  const [formData, setFormData] = useState<FormState>({
    name: '',
    batch_type: 'morning',
    morning_start: '09:00',
    morning_lock: '09:15',
    evening_start: '14:00',
    evening_lock: '14:15'
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [apiError, setApiError] = useState<string>('');

  // Convert Time format HH:MM:SS to HH:MM if necessary
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5); // Take "HH:MM"
  };

  // Pre-fill form when editing
  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name || '',
        batch_type: classData.batch_type || 'morning',
        morning_start: formatTime(classData.morning_start) || '09:00',
        morning_lock: formatTime(classData.morning_lock) || '09:15',
        evening_start: formatTime(classData.evening_start) || '14:00',
        evening_lock: formatTime(classData.evening_lock) || '14:15'
      });
    } else {
      setFormData({
        name: '',
        batch_type: 'morning',
        morning_start: '09:00',
        morning_lock: '09:15',
        evening_start: '14:00',
        evening_lock: '14:15'
      });
    }
    setErrors({});
    setApiError('');
  }, [classData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear field-level error
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const timeToMinutes = (t?: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (formData.batch_type === 'morning' || formData.batch_type === 'both') {
      if (!formData.morning_start) {
        newErrors.morning_start = 'Morning start time is required';
      }
      if (!formData.morning_lock) {
        newErrors.morning_lock = 'Morning lock time is required';
      }
      if (formData.morning_start && formData.morning_lock) {
        if (timeToMinutes(formData.morning_lock) <= timeToMinutes(formData.morning_start)) {
          newErrors.morning_lock = 'Lock time must be after start time';
        }
      }
    }

    if (formData.batch_type === 'evening' || formData.batch_type === 'both') {
      if (!formData.evening_start) {
        newErrors.evening_start = 'Evening start time is required';
      }
      if (!formData.evening_lock) {
        newErrors.evening_lock = 'Evening lock time is required';
      }
      if (formData.evening_start && formData.evening_lock) {
        if (timeToMinutes(formData.evening_lock) <= timeToMinutes(formData.evening_start)) {
          newErrors.evening_lock = 'Lock time must be after start time';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    try {
      const payload = {
        name: formData.name,
        batch_type: formData.batch_type,
        morning_start: (formData.batch_type === 'morning' || formData.batch_type === 'both') ? formData.morning_start : null,
        morning_lock: (formData.batch_type === 'morning' || formData.batch_type === 'both') ? formData.morning_lock : null,
        evening_start: (formData.batch_type === 'evening' || formData.batch_type === 'both') ? formData.evening_start : null,
        evening_lock: (formData.batch_type === 'evening' || formData.batch_type === 'both') ? formData.evening_lock : null
      };

      await onSave(payload);
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while saving class details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in select-none">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span className="leading-relaxed">{apiError}</span>
        </div>
      )}

      <Input
        label="Class Section Name"
        id="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. CS - Year 3 - Sec A"
        error={errors.name}
        required
        disabled={loading}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-600 select-none">
          Schedule Batch Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['morning', 'evening', 'both'] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={loading}
              onClick={() => setFormData((prev) => ({ ...prev, batch_type: type }))}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                formData.batch_type === type
                  ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'both' ? 'Both Batches' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Morning timetable configuration */}
      {(formData.batch_type === 'morning' || formData.batch_type === 'both') && (
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3.5 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">Morning Attendance Window</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Session Start Time"
              id="morning_start"
              type="time"
              value={formData.morning_start}
              onChange={handleChange}
              error={errors.morning_start}
              required
              disabled={loading}
            />
            <Input
              label="Late Lock Threshold"
              id="morning_lock"
              type="time"
              value={formData.morning_lock}
              onChange={handleChange}
              error={errors.morning_lock}
              required
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Evening timetable configuration */}
      {(formData.batch_type === 'evening' || formData.batch_type === 'both') && (
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3.5 animate-fade-in">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">Evening Attendance Window</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Session Start Time"
              id="evening_start"
              type="time"
              value={formData.evening_start}
              onChange={handleChange}
              error={errors.evening_start}
              required
              disabled={loading}
            />
            <Input
              label="Late Lock Threshold"
              id="evening_lock"
              type="time"
              value={formData.evening_lock}
              onChange={handleChange}
              error={errors.evening_lock}
              required
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          {isEditing ? 'Save Changes' : 'Create Section'}
        </Button>
      </div>
    </form>
  );
}
