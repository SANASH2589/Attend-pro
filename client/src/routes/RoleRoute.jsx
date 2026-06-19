import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function RoleRoute({ allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // If user is not logged in, ProtectedRoute (if wrapping this) handles it,
  // but if we directly hit this, redirect to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the user's role is not allowed, redirect to unauthorized page
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
