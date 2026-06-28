import { request } from './base';

export const attendanceApi = {
  /**
   * Get all classes assigned to the active logged-in staff member today
   */
  async getMyClasses() {
    return request('/api/v1/attendance/my-classes', {
      method: 'GET'
    });
  },

  /**
   * Get morning/evening session status gates for a class
   */
  async getSessionStatus(classId) {
    return request(`/api/v1/attendance/session-status/${classId}`, {
      method: 'GET'
    });
  },

  /**
   * Get student roster for a class section (optionally filters by session_id for statuses)
   */
  async getClassStudents(classId, sessionId = '') {
    const url = `/api/v1/attendance/students/${classId}${sessionId ? `?session_id=${sessionId}` : ''}`;
    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Atomically submits attendance sheet for a class section
   */
  async submitAttendance({ class_id, session_type, absent_student_ids }) {
    return request('/api/v1/attendance/submit', {
      method: 'POST',
      body: JSON.stringify({ class_id, session_type, absent_student_ids })
    });
  },

  /**
   * Returns paginated sessions history list for administration dashboards
   */
  async getAllSessions(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const queryString = queryParams.toString();
    const url = `/api/v1/attendance/all-sessions${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Returns full session details and active student records
   */
  async getSessionDetail(sessionId) {
    return request(`/api/v1/attendance/session/${sessionId}`, {
      method: 'GET'
    });
  },

  /**
   * Manually locks a session (admin only)
   */
  async lockSession(sessionId) {
    return request(`/api/v1/attendance/session/${sessionId}/lock`, {
      method: 'PUT'
    });
  },

  /**
   * Manually unlocks a session (admin only)
   */
  async unlockSession(sessionId) {
    return request(`/api/v1/attendance/session/${sessionId}/unlock`, {
      method: 'PUT'
    });
  },

  /**
   * Retrieves student stats metrics
   */
  async getStudentStats(studentId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    const url = `/api/v1/attendance/stats/student/${studentId}${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Retrieves class stats metrics
   */
  async getClassStats(classId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    const url = `/api/v1/attendance/stats/class/${classId}${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  }
};

export default attendanceApi;
