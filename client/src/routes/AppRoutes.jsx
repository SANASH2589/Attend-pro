import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AdminLayout, AuthLayout } from '../layouts';

// Routes Guard Wrapper Components
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Pages
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Unauthorized from '../pages/auth/Unauthorized';
import Dashboard from '../pages/admin/Dashboard';
import StudentManagement from '../pages/admin/StudentManagement';
import StaffManagement from '../pages/admin/StaffManagement';
import ClassManagement from '../pages/admin/ClassManagement';
import NotFound from '../pages/shared/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root path: Redirect to admin dashboard */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Auth Layout for authentication-related pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Protected and Role-restricted Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="student-management" element={<StudentManagement />} />
            <Route path="staff-management" element={<StaffManagement />} />
            <Route path="class-management" element={<ClassManagement />} />
          </Route>
        </Route>
      </Route>

      {/* Access Error States */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Global 404 handler */}
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
