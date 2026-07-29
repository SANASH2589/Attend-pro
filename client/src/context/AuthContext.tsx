import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/auth';
import { User, UserRole, AuthContextType } from '../types/auth';
import { supabase } from '../lib/supabaseClient';

export const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if session token exists on component mount
  useEffect(() => {
    async function restoreSession() {
      try {
        // 1. Get current Supabase session first to ensure we have the latest token
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem('token', session.access_token);
        }

        const token = localStorage.getItem('token');
        if (!token) {
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        const profile = await authApi.me();
        setUser(profile);
        setRole(profile.role);
      } catch (err: any) {
        console.warn('Authentication session restore failed:', err.message);
        localStorage.removeItem('token');
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          localStorage.setItem('token', session.access_token);
        } else {
          localStorage.removeItem('token');
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          try {
            const profile = await authApi.me();
            setUser(profile);
            setRole(profile.role);
          } catch (err: any) {
            console.error('Failed to restore profile on token refresh:', err.message);
          }
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          window.location.href = '/login';
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Log in user and set context state.
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setRole(data.role);
      return { success: true, user: data.user, role: data.role };
    } catch (err: any) {
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
    } catch (err: any) {
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
