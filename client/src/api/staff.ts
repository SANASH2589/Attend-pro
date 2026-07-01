import { request } from './base';
import { Staff } from '../types/staff';

export const staffApi = {
  async getAll(): Promise<Staff[]> {
    return request('/api/super-admin/staff', {
      method: 'GET'
    });
  },

  async create(staffData: Partial<Staff>): Promise<Staff> {
    return request('/api/super-admin/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  },

  async update(id: string, staffData: Partial<Staff>): Promise<Staff> {
    return request(`/api/super-admin/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData)
    });
  },

  async deactivate(id: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/staff/${id}`, {
      method: 'DELETE'
    });
  },

  async resetPassword(id: string, password: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/staff/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }
};

export default staffApi;
