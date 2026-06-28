import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AlertCircle } from 'lucide-react';

/**
 * Staff Creation and Editing Form component.
 */
export default function StaffForm({
  staff = null, // If provided, we are editing
  onSave,
  onCancel,
  loading = false
}) {
  const isEditing = !!staff;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (staff) {
      setFormData({
        email: staff.email || '',
        password: '', // We don't edit password here
        full_name: staff.full_name || '',
        phone: staff.phone || ''
      });
    } else {
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: ''
      });
    }
    setErrors({});
    setApiError('');
  }, [staff]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear field-level error
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!isEditing && !formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isEditing && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.full_name) {
      newErrors.full_name = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    try {
      // Create request payload
      const payload = isEditing
        ? { full_name: formData.full_name, phone: formData.phone }
        : formData;

      await onSave(payload);
    } catch (err) {
      setApiError(err.message || 'An error occurred while saving staff details.');
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
        label="Full Name"
        id="full_name"
        value={formData.full_name}
        onChange={handleChange}
        placeholder="e.g. Dr. Sarah Jenkins"
        error={errors.full_name}
        required
        disabled={loading}
      />

      <Input
        label="Email Address"
        id="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="e.g. sarah.j@college.edu"
        error={errors.email}
        required={!isEditing}
        disabled={isEditing || loading}
        helpText={isEditing ? 'Email address cannot be changed' : null}
      />

      {!isEditing && (
        <Input
          label="Password"
          id="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Min. 6 characters"
          error={errors.password}
          required
          disabled={loading}
        />
      )}

      <Input
        label="Phone Number"
        id="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        placeholder="e.g. +1 (555) 019-2834"
        error={errors.phone}
        disabled={loading}
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
          {isEditing ? 'Save Changes' : 'Create Staff Member'}
        </Button>
      </div>
    </form>
  );
}
