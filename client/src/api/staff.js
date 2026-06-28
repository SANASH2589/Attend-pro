import { request } from './base';

export const staffApi = {
  async getAll() {
    return request('/api/v1/staff', {
      method: 'GET'
    });
  },

  async create(staffData) {
    return request('/api/v1/staff', {
      method: 'POST',
      body: JSON.stringify(staffData)
    });
  },

  async update(id, staffData) {
    return request(`/api/v1/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData)
    });
  },

  async deactivate(id) {
    return request(`/api/v1/staff/${id}`, {
      method: 'DELETE'
    });
  }
};

export default staffApi;
