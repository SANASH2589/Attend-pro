import { request } from './base';
import { Student, StudentQueryParams } from '../types/student';

export interface BulkImportResponse {
  success: boolean;
  inserted: number;
  updated: number;
  errors?: string[];
}

export const studentsApi = {
  async getAll(params: StudentQueryParams = {}): Promise<Student[]> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.class_id) queryParams.append('class_id', params.class_id);
    
    const queryString = queryParams.toString();
    const url = `/api/super-admin/students${queryString ? `?${queryString}` : ''}`;
    
    return request(url, {
      method: 'GET'
    });
  },

  async create(studentData: Partial<Student>): Promise<Student> {
    return request('/api/super-admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  async update(id: string, studentData: Partial<Student>): Promise<Student> {
    return request(`/api/super-admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  },

  async deactivate(id: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/students/${id}`, {
      method: 'DELETE'
    });
  },

  async importBulk(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return request('/api/super-admin/students/import', {
      method: 'POST',
      body: formData
    });
  },

  async importPreview(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return request('/api/super-admin/students/import-preview', {
      method: 'POST',
      body: formData
    });
  },

  async importSave(students: any[]): Promise<any> {
    return request('/api/super-admin/students/import-save', {
      method: 'POST',
      body: JSON.stringify({ students })
    });
  }
};

export default studentsApi;
