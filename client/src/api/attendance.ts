import { request } from './base';
import { Student } from '../types/student';
import { AttendanceSession, AttendanceRecord, ClassSessionStatus } from '../types/attendance';

export interface SubmitAttendanceParams {
  class_id: string;
  session_type: 'morning' | 'evening';
  absent_student_ids: string[];
}

export interface SubmitAttendanceResponse {
  success: boolean;
  total_students: number;
  absent_count: number;
  present_count: number;
}

export interface GetAllSessionsParams {
  class_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedSessionsResponse {
  sessions: AttendanceSession[];
  total: number;
  page: number;
  limit: number;
}

export interface SessionDetailResponse {
  session: AttendanceSession;
  records: AttendanceRecord[];
}

export interface StudentStatsResponse {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
}

export interface ClassStatsResponse {
  total_sessions: number;
  average_attendance_rate: number;
  highest_attendance_rate?: number;
  lowest_attendance_rate?: number;
}

export const attendanceApi = {
  /**
   * Get all classes assigned to the active logged-in staff member today
   */
  async getMyClasses(): Promise<any[]> {
    return request('/api/staff/attendance/my-classes', {
      method: 'GET'
    });
  },

  /**
   * Get morning/evening session status gates for a class
   */
  async getSessionStatus(classId: string): Promise<ClassSessionStatus> {
    return request(`/api/staff/attendance/session-status/${classId}`, {
      method: 'GET'
    });
  },

  /**
   * Get student roster for a class section (optionally filters by session_id for statuses)
   */
  async getClassStudents(classId: string, sessionId: string = ''): Promise<Student[]> {
    const url = `/api/staff/attendance/students/${classId}${sessionId ? `?session_id=${sessionId}` : ''}`;
    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Atomically submits attendance sheet for a class section
   */
  async submitAttendance({ class_id, session_type, absent_student_ids }: SubmitAttendanceParams): Promise<SubmitAttendanceResponse> {
    return request('/api/staff/attendance/submit', {
      method: 'POST',
      body: JSON.stringify({ class_id, session_type, absent_student_ids })
    });
  },

  /**
   * Returns paginated sessions history list for administration dashboards
   */
  async getAllSessions(params: GetAllSessionsParams = {}): Promise<PaginatedSessionsResponse> {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    const url = `/api/super-admin/attendance/all-sessions${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Returns full session details and active student records
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
    return request(`/api/super-admin/attendance/session/${sessionId}`, {
      method: 'GET'
    });
  },

  /**
   * Manually locks a session (admin only)
   */
  async lockSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/attendance/session/${sessionId}/lock`, {
      method: 'PUT'
    });
  },

  /**
   * Manually unlocks a session (admin only)
   */
  async unlockSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/super-admin/attendance/session/${sessionId}/unlock`, {
      method: 'PUT'
    });
  },

  /**
   * Retrieves student stats metrics
   */
  async getStudentStats(studentId: string, params: { class_id?: string; date_from?: string; date_to?: string } = {}): Promise<StudentStatsResponse> {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    const url = `/api/super-admin/attendance/stats/student/${studentId}${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  },

  /**
   * Retrieves class stats metrics
   */
  async getClassStats(classId: string, params: { date_from?: string; date_to?: string } = {}): Promise<ClassStatsResponse> {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    const url = `/api/super-admin/attendance/stats/class/${classId}${queryString ? `?${queryString}` : ''}`;

    return request(url, {
      method: 'GET'
    });
  }
};

export default attendanceApi;
