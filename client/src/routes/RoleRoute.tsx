import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { UserRole } from '../types/auth';

interface RoleRouteProps {
  allowedRoles?: UserRole[];
}

export default function RoleRoute({ allowedRoles = [] }: RoleRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // If user is not logged in, ProtectedRoute (if wrapping this) handles it,
  // but if we directly hit this, redirect to staff login as default.
  if (!user) {
    return <Navigate to="/staff/login" replace />;
  }

  // If the user's role is not allowed, redirect to their own login page
  // to prevent cross-access between super admin and staff
  if (!role || !allowedRoles.includes(role)) {
    if (role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (role === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
