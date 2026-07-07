import { request } from './base';

export interface DatabaseParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

export interface PaginatedDatabaseResponse<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const databaseApi = {
  async getStudents(params: DatabaseParams): Promise<PaginatedDatabaseResponse<any>> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, String(params[key]));
      }
    });
    return request(`/api/super-admin/database/students?${queryParams.toString()}`, {
      method: 'GET'
    });
  },

  async getStaff(params: DatabaseParams): Promise<PaginatedDatabaseResponse<any>> {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, String(params[key]));
      }
    });
    return request(`/api/super-admin/database/staff?${queryParams.toString()}`, {
      method: 'GET'
    });
  },

  async bulkStatusStudents(ids: string[], status: 'Active' | 'Inactive'): Promise<any> {
    return request('/api/super-admin/database/students/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
  },

  async bulkDeleteStudents(ids: string[]): Promise<any> {
    return request('/api/super-admin/database/students/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  },

  async bulkStatusStaff(ids: string[], status: 'Active' | 'Inactive'): Promise<any> {
    return request('/api/super-admin/database/staff/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
  },

  async bulkDeleteStaff(ids: string[]): Promise<any> {
    return request('/api/super-admin/database/staff/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }
};

export default databaseApi;
