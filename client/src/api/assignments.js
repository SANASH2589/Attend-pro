import { request } from './base';

export const assignmentsApi = {
  // Students Assignments
  async getStudentsForClass(classId) {
    return request(`/api/v1/assignments/students/${classId}`, {
      method: 'GET'
    });
  },

  async assignStudent(studentId, classId) {
    return request('/api/v1/assignments/students', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, class_id: classId })
    });
  },

  async unassignStudent(studentId, classId) {
    return request('/api/v1/assignments/students', {
      method: 'DELETE',
      body: JSON.stringify({ student_id: studentId, class_id: classId })
    });
  },

  // Staff Assignments
  async getStaffForClass(classId) {
    return request(`/api/v1/assignments/staff/${classId}`, {
      method: 'GET'
    });
  },

  async assignStaff(staffId, classId) {
    return request('/api/v1/assignments/staff', {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId, class_id: classId })
    });
  },

  async unassignStaff(staffId, classId) {
    return request('/api/v1/assignments/staff', {
      method: 'DELETE',
      body: JSON.stringify({ staff_id: staffId, class_id: classId })
    });
  }
};

export default assignmentsApi;
