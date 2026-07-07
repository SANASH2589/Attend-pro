import { request } from './base';
import { Class } from '../types/class';

export const classesApi = {
  async getAll(): Promise<Class[]> {
    return request('/api/super-admin/classes', {
      method: 'GET'
    });
  },

  async create(classData: Partial<Class>): Promise<Class> {
    return request('/api/super-admin/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  },

  async update(id: string, classData: Partial<Class>): Promise<Class> {
    return request(`/api/super-admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/classes/${id}`, {
      method: 'DELETE'
    });
  },

  async assignRange(id: string, ranges: string, preview: boolean = false): Promise<any> {
    return request(`/api/super-admin/classes/${id}/assign-range`, {
      method: 'POST',
      body: JSON.stringify({ ranges, preview })
    });
  }
};

export default classesApi;
