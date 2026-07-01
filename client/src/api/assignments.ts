import { request } from './base';

export interface AssignStudentResponse {
  success: boolean;
  message?: string;
}

export interface AssignStaffResponse {
  success: boolean;
  message?: string;
}

export const assignmentsApi = {
  // Students Assignments
  async getStudentsForClass(classId: string): Promise<any> {
    return request(`/api/super-admin/assignments/students/${classId}`, {
      method: 'GET'
    });
  },

  async assignStudent(studentId: string, classId: string): Promise<AssignStudentResponse> {
    return request('/api/super-admin/assignments/students', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, class_id: classId })
    });
  },

  async unassignStudent(studentId: string, classId: string): Promise<AssignStudentResponse> {
    return request('/api/super-admin/assignments/students', {
      method: 'DELETE',
      body: JSON.stringify({ student_id: studentId, class_id: classId })
    });
  },

  // Staff Assignments
  async getStaffForClass(classId: string): Promise<any> {
    return request(`/api/super-admin/assignments/staff/${classId}`, {
      method: 'GET'
    });
  },

  async assignStaff(staffId: string, classId: string): Promise<AssignStaffResponse> {
    return request('/api/super-admin/assignments/staff', {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId, class_id: classId })
    });
  },

  async unassignStaff(staffId: string, classId: string): Promise<AssignStaffResponse> {
    return request('/api/super-admin/assignments/staff', {
      method: 'DELETE',
      body: JSON.stringify({ staff_id: staffId, class_id: classId })
    });
  }
};

export default assignmentsApi;
