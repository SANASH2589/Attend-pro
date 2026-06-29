import { request } from './base';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const reportsApi = {
  /**
   * Get admin overview report
   */
  async getOverviewReport(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/v1/reports/overview${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Get class report
   */
  async getClassReport(classId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/v1/reports/class/${classId}${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Get student report
   */
  async getStudentReport(studentId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const queryString = queryParams.toString();
    return request(`/api/v1/reports/student/${studentId}${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  /**
   * Download class report as Excel
   */
  async downloadClassExcel(classId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/v1/reports/export/class/${classId}/excel${queryString ? `?${queryString}` : ''}`;

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
  async downloadClassPDF(classId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/v1/reports/export/class/${classId}/pdf${queryString ? `?${queryString}` : ''}`;

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
  async downloadStudentExcel(studentId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/v1/reports/export/student/${studentId}/excel${queryString ? `?${queryString}` : ''}`;

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
  async downloadStudentPDF(studentId, params = {}) {
    const queryParams = new URLSearchParams();
    if (params.class_id) queryParams.append('class_id', params.class_id);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const token = localStorage.getItem('token');
    const queryString = queryParams.toString();
    const url = `${API_URL}/api/v1/reports/export/student/${studentId}/pdf${queryString ? `?${queryString}` : ''}`;

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
function triggerDownload(blob, filename) {
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
