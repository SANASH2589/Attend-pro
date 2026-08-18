import React, { useState, useEffect } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

export interface DatabaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  viewType: 'students' | 'staff';
  onSave: (formData: any) => Promise<void>;
}

export default function DatabaseEditModal({
  isOpen,
  onClose,
  record,
  viewType,
  onSave
}: DatabaseEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      if (viewType === 'students') {
        setFormData({
          full_name: record.full_name || '',
          roll_number: record.roll_number || '',
          department: record.department || '',
          section: record.section || '',
          email: record.email || '',
          parent_phone: record.parent_phone || '',
          is_active: record.status === 'Active'
        });
      } else {
        setFormData({
          full_name: record.full_name || '',
          phone: record.phone || '',
          is_active: record.status === 'Active'
        });
      }
      setErrors({});
    }
  }, [record, viewType, isOpen]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev: any) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const temp: Record<string, string> = {};
    if (!formData.full_name?.trim()) {
      temp.full_name = 'Name is required';
    }
    
    if (viewType === 'students') {
      if (!formData.roll_number?.trim()) {
        temp.roll_number = 'Roll Number is required';
      }
      if (!formData.parent_phone?.trim()) {
        temp.parent_phone = 'Parent Phone is required';
      } else if (formData.parent_phone.trim().length < 10 || formData.parent_phone.trim().length > 15) {
        temp.parent_phone = 'Parent Phone Number must be between 10 and 15 digits';
      }
      if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        temp.email = 'Invalid email address';
      }
    }

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setErrors({ api: err.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${viewType === 'students' ? 'Student' : 'Staff'} Details`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 select-none">
        {errors.api && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
            {errors.api}
          </div>
        )}

        {viewType === 'students' ? (
          <>
            {/* 1. Roll Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Roll Number</label>
              <input
                type="text"
                value={formData.roll_number}
                onChange={e => handleChange('roll_number', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all uppercase font-mono"
              />
              {errors.roll_number && <span className="text-[10px] text-red-500 font-medium">{errors.roll_number}</span>}
            </div>

            {/* 2. Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.full_name && <span className="text-[10px] text-red-500 font-medium">{errors.full_name}</span>}
            </div>

            {/* 3. Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleChange('department', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.department && <span className="text-[10px] text-red-500 font-medium">{errors.department}</span>}
            </div>

            {/* 4. Section */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Section</label>
              <input
                type="text"
                value={formData.section}
                onChange={e => handleChange('section', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.section && <span className="text-[10px] text-red-500 font-medium">{errors.section}</span>}
            </div>

            {/* 5. Parent Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Parent Phone Number</label>
              <input
                type="text"
                value={formData.parent_phone}
                onChange={e => handleChange('parent_phone', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.parent_phone && <span className="text-[10px] text-red-500 font-medium">{errors.parent_phone}</span>}
            </div>

            {/* 6. Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.email && <span className="text-[10px] text-red-500 font-medium">{errors.email}</span>}
            </div>
          </>
        ) : (
          <>
            {/* Staff - Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.full_name && <span className="text-[10px] text-red-500 font-medium">{errors.full_name}</span>}
            </div>

            {/* Staff - Mobile Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-blue-500 focus:bg-white py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
              />
              {errors.phone && <span className="text-[10px] text-red-500 font-medium">{errors.phone}</span>}
            </div>
          </>
        )}

        {/* Status Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-200/40">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700">Account Status</span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Toggle active or inactive state</span>
          </div>
          <button
            type="button"
            onClick={() => handleChange('is_active', !formData.is_active)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 outline-none cursor-pointer ${
              formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span 
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                formData.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
