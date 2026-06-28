import { request } from './base';

export const classesApi = {
  async getAll() {
    return request('/api/v1/classes', {
      method: 'GET'
    });
  },

  async create(classData) {
    return request('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    });
  },

  async update(id, classData) {
    return request(`/api/v1/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData)
    });
  },

  async delete(id) {
    return request(`/api/v1/classes/${id}`, {
      method: 'DELETE'
    });
  }
};

export default classesApi;
