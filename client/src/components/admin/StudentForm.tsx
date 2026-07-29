import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AlertCircle } from 'lucide-react';
import { Student } from '../../types/student';

export interface StudentFormProps {
  student?: Student | null;
  onSave: (payload: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Student Profile Creation and Editing Form component.
 */
export default function StudentForm({
  student = null, // If provided, we are editing
  onSave,
  onCancel,
  loading = false
}: StudentFormProps) {
  const isEditing = !!student;
  const [formData, setFormData] = useState({
    roll_number: '',
    full_name: '',
    department: '',
    section: '',
    parent_phone: '',
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [apiError, setApiError] = useState<string>('');

  // Pre-fill form when editing
  useEffect(() => {
    if (student) {
      setFormData({
        roll_number: student.roll_number || '',
        full_name: student.full_name || '',
        department: student.department || '',
        section: student.section || '',
        parent_phone: student.parent_phone || '',
        email: student.email || ''
      });
    } else {
      setFormData({
        roll_number: '',
        full_name: '',
        department: '',
        section: '',
        parent_phone: '',
        email: ''
      });
    }
    setErrors({});
    setApiError('');
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear field error
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.roll_number.trim()) {
      newErrors.roll_number = 'Roll number is required';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.parent_phone.trim()) {
      newErrors.parent_phone = 'Parent phone number is required';
    } else if (formData.parent_phone.trim().length < 10 || formData.parent_phone.trim().length > 15) {
      newErrors.parent_phone = 'Parent Phone Number must be between 10 and 15 digits';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    try {
      await onSave(formData);
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while saving student details.');
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
        label="Roll Number"
        id="roll_number"
        value={formData.roll_number}
        onChange={handleChange}
        placeholder="e.g. ITA2361"
        error={errors.roll_number}
        required
        disabled={loading}
        autoComplete="off"
      />

      <Input
        label="Student Name"
        id="full_name"
        value={formData.full_name}
        onChange={handleChange}
        placeholder="e.g. Sanjai S"
        error={errors.full_name}
        required
        disabled={loading}
        autoComplete="name"
      />

      <Input
        label="Department"
        id="department"
        value={formData.department}
        onChange={handleChange}
        placeholder="e.g. Information Technology"
        error={errors.department}
        disabled={loading}
        autoComplete="off"
      />

      <Input
        label="Section"
        id="section"
        value={formData.section}
        onChange={handleChange}
        placeholder="e.g. A"
        error={errors.section}
        disabled={loading}
        autoComplete="off"
      />

      <Input
        label="Parent Phone Number"
        id="parent_phone"
        type="tel"
        value={formData.parent_phone}
        onChange={handleChange}
        placeholder="e.g. 9876543210"
        error={errors.parent_phone}
        required
        disabled={loading}
        autoComplete="tel"
        helpText="SMS notifications sent to this number"
      />

      <Input
        label="Email Address"
        id="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="e.g. student@college.edu"
        error={errors.email}
        disabled={loading}
        autoComplete="email"
      />

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
          {isEditing ? 'Save Changes' : 'Enroll Student'}
        </Button>
      </div>
    </form>
  );
}
