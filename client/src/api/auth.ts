import { request } from './base';
import { User } from '../types/auth';

export const authApi = {
  /**
   * Log in user using email and password.
   * Returns { token, user: { id, email, role, name } }
   */
  async login(email: string, password: string): Promise<{ token: string; user: User; role: 'super_admin' | 'staff' }> {
    const data = await request('/api/auth/login', {
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
  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', {
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
  async me(): Promise<User> {
    return await request('/api/auth/me', {
      method: 'GET',
    });
  }
};

export default authApi;
