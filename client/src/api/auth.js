const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

import { request } from './base';

export const authApi = {
  /**
   * Log in user using email and password.
   * Returns { token, user: { id, email, role, name } }
   */
  async login(email, password) {
    const data = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  /**
   * Log out user and clear local token.
   */
  async logout() {
    try {
      await request('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Backend logout notification failed:', err);
    } finally {
      localStorage.removeItem('token');
    }
  },

  /**
   * Retrieve currently authenticated user profile details.
   */
  async me() {
    return await request('/api/v1/auth/me', {
      method: 'GET',
    });
  }
};

export default authApi;
