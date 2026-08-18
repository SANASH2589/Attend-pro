import { request } from './base';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

export interface OverviewReportParams {
  date_from?: string;
  date_to?: string;
}

export interface ClassReportParams {
  date_from?: string;
  date_to?: string;
}

export interface StudentReportParams {
  class_id?: string;
  date_from?: string;
  date_to?: string;
}

export const reportsApi = {
  /**
   * Get admin overview report
   */
  async getOverviewReport(params: OverviewReportParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/super-admin/reports/overview${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Get class report
   */
  async getClassReport(classId: string, params: ClassReportParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/super-admin/reports/class/${classId}${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Get student report
   */
  async getStudentReport(studentId: string, params: StudentReportParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/super-admin/reports/student/${studentId}${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Download class report as Excel
   */
  async downloadClassExcel(classId: string, params: ClassReportParams = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/super-admin/reports/export/class/${classId}/excel${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    triggerDownload(blob, filename);
  },

  /**
   * Download class report as PDF
   */
  async downloadClassPDF(classId: string, params: ClassReportParams = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/super-admin/reports/export/class/${classId}/pdf${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;

    triggerDownload(blob, filename);
  },

  /**
   * Download student report as Excel
   */
  async downloadStudentExcel(studentId: string, params: StudentReportParams = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/super-admin/reports/export/student/${studentId}/excel${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `student-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    triggerDownload(blob, filename);
  },

  /**
   * Download student report as PDF
   */
  async downloadStudentPDF(studentId: string, params: StudentReportParams = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/super-admin/reports/export/student/${studentId}/pdf${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(data.message || 'Download failed');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `student-report-${new Date().toISOString().split('T')[0]}.pdf`;

    triggerDownload(blob, filename);
  }
};

/**
 * Helper: Create temporary anchor element, trigger browser download, revoke URL
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default reportsApi;
