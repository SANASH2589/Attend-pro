import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if session token exists on component mount
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authApi.me();
        setUser(profile);
        setRole(profile.role);
      } catch (err) {
        console.warn('Authentication session restore failed:', err.message);
        localStorage.removeItem('token');
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  /**
   * Log in user and set context state.
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setRole(data.role);
      return { success: true, user: data.user, role: data.role };
    } catch (err) {
      return { success: false, error: err.message || 'Login request failed.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out user, invalidate context state, and wipe local storage token.
   */
  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Auth server signout warning:', err.message);
    } finally {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
