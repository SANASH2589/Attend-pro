import React, { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock login function
  const login = (email, password) => {
    setLoading(true);
    
    // Simulate a brief delay to showcase loading spinner transitions
    return new Promise((resolve) => {
      setTimeout(() => {
        // Derive user role from email pattern
        const emailLower = email.toLowerCase();
        let assignedRole = 'STAFF';
        if (emailLower.includes('admin')) {
          assignedRole = 'SUPER_ADMIN';
        }

        const authenticatedUser = {
          name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email: email
        };

        setUser(authenticatedUser);
        setRole(assignedRole);
        setLoading(false);
        resolve({ success: true, user: authenticatedUser, role: assignedRole });
      }, 600);
    });
  };

  // Mock logout function
  const logout = () => {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setUser(null);
        setRole(null);
        setLoading(false);
        resolve({ success: true });
      }, 300);
    });
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
