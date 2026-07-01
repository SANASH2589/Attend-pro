import { request } from './base';

export interface SmsLogsParams {
  session_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number | string;
  limit?: number | string;
}

export interface SmsLog {
  id: string;
  session_id: string;
  student_id: string;
  phone_number: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sent_at?: string;
  error_message?: string;
  message_content?: string;
  student?: {
    full_name: string;
    roll_number: string;
  };
  session?: {
    session_date: string;
    session_type: 'morning' | 'evening';
    classes?: {
      name: string;
    };
  };
}

export interface SmsLogsResponse {
  logs: SmsLog[];
  total: number;
  page: number;
  limit: number;
}

export interface SmsStats {
  sentToday: number;
  failedToday: number;
  totalWeek: number;
}

export const smsApi = {
  /**
   * Get paginated SMS logs with filters
   */
  async getSmsLogs(params: SmsLogsParams = {}): Promise<SmsLogsResponse> {
    const queryParams = new URLSearchParams();
    if (params.session_id) queryParams.append('session_id', params.session_id);
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    const url = `/api/super-admin/sms/logs${queryString ? `?${queryString}` : ''}`;

    return request(url, { method: 'GET' });
  },

  /**
   * Get all SMS logs for a specific session
   */
  async getSessionSmsLogs(sessionId: string): Promise<SmsLog[]> {
    return request(`/api/super-admin/sms/logs/${sessionId}`, { method: 'GET' });
  },

  /**
   * Retry failed SMS for a session
   */
  async retrySessionSms(sessionId: string): Promise<{ success: boolean; retried_count: number }> {
    return request(`/api/super-admin/sms/retry/${sessionId}`, { method: 'POST' });
  },

  /**
   * Get SMS stats
   */
  async getSmsStats(): Promise<SmsStats> {
    return request('/api/super-admin/sms/stats', { method: 'GET' });
  }
};

export default smsApi;
