import { request } from './base';

export const studentsApi = {
  async getAll(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.class_id) queryParams.append('class_id', params.class_id);
    
    const queryString = queryParams.toString();
    const url = `/api/v1/students${queryString ? `?${queryString}` : ''}`;
    
    return request(url, {
      method: 'GET'
    });
  },

  async create(studentData) {
    return request('/api/v1/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  async update(id, studentData) {
    return request(`/api/v1/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  },

  async deactivate(id) {
    return request(`/api/v1/students/${id}`, {
      method: 'DELETE'
    });
  },

  async importBulk(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return request('/api/v1/students/import', {
      method: 'POST',
      body: formData
    });
  }
};

export default studentsApi;
