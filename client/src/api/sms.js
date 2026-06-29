import { request } from './base';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const smsApi = {
  /**
   * Get paginated SMS logs with filters
   */
  async getSmsLogs(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.session_id) queryParams.append('session_id', params.session_id);
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const queryString = queryParams.toString();
    const url = `/api/v1/sms/logs${queryString ? `?${queryString}` : ''}`;

    return request(url, { method: 'GET' });
  },

  /**
   * Get all SMS logs for a specific session
   */
  async getSessionSmsLogs(sessionId) {
    return request(`/api/v1/sms/logs/${sessionId}`, { method: 'GET' });
  },

  /**
   * Retry failed SMS for a session
   */
  async retrySessionSms(sessionId) {
    return request(`/api/v1/sms/retry/${sessionId}`, { method: 'POST' });
  }
};

export default smsApi;
