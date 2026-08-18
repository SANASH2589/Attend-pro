import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    // Redirect to the appropriate login page based on current path context
    const isSuperAdminPath = location.pathname.startsWith('/super-admin');
    const loginPath = isSuperAdminPath ? '/super-admin/login' : '/staff/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
