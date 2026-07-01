import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AdminLayout, StaffLayout } from '../layouts';

// Routes Guard Wrapper Components
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Login Pages (separate endpoints)
import SuperAdminLogin from '../pages/SuperAdminLogin';
import StaffLogin from '../pages/StaffLogin';

// Error Pages
import NotFound from '../pages/NotFound';
import Unauthorized from '../pages/auth/Unauthorized';

// Super Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import Staff from '../pages/admin/Staff';
import Students from '../pages/admin/Students';
import Classes from '../pages/admin/Classes';
import Assignments from '../pages/admin/Assignments';
import AdminReports from '../pages/admin/Reports';
import SmsLogs from '../pages/admin/SmsLogs';

// Staff Pages
import StaffDashboard from '../pages/staff/Dashboard';
import StaffAttendance from '../pages/staff/Attendance';
import StaffHistory from '../pages/staff/History';

export default function AppRoutes() {
  return (
    <Routes>
      {/* ============================================================ */}
      {/* PUBLIC ROUTES — Separate Login Endpoints                     */}
      {/* ============================================================ */}
      
      {/* Root path: Redirect to staff login (most common user) */}
      <Route path="/" element={<Navigate to="/staff/login" replace />} />

      {/* Super Admin Login */}
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      
      {/* Staff Login */}
      <Route path="/staff/login" element={<StaffLogin />} />

      {/* Legacy /login redirect — send to staff login */}
      <Route path="/login" element={<Navigate to="/staff/login" replace />} />

      {/* ============================================================ */}
      {/* PROTECTED SUPER ADMIN ROUTES — /super-admin/*                */}
      {/* Super Admin can ONLY access: Staff, Classes, Students,       */}
      {/* Assignments, Reports, SMS Logs, Dashboard                    */}
      {/* ============================================================ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['super_admin']} />}>
          <Route path="/super-admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            
            <Route path="staff" element={<Staff />} />
            <Route path="students" element={<Students />} />
            <Route path="classes" element={<Classes />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="sms-logs" element={<SmsLogs />} />

            {/* NO attendance page for super admin */}
          </Route>
        </Route>
      </Route>

      {/* ============================================================ */}
      {/* PROTECTED STAFF ROUTES — /staff/*                            */}
      {/* Staff can ONLY access: Dashboard, Assigned Classes,          */}
      {/* Attendance, Attendance History                                */}
      {/* ============================================================ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['staff']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            
            <Route path="attendance/:classId" element={<StaffAttendance />} />
            <Route path="attendance" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="history" element={<StaffHistory />} />

            {/* NO reports page for staff */}
            {/* NO staff creation, CSV import, class creation, student management */}
          </Route>
        </Route>
      </Route>

      {/* ============================================================ */}
      {/* ERROR ROUTES                                                 */}
      {/* ============================================================ */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/not-found" element={<NotFound />} />
      
      {/* Legacy /admin/* redirect to /super-admin/* */}
      <Route path="/admin/*" element={<Navigate to="/super-admin/dashboard" replace />} />
      
      {/* Catch all fallback */}
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
