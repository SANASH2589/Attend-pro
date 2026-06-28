import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { AdminLayout, StaffLayout } from '../layouts';

// Routes Guard Wrapper Components
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Pages
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import Unauthorized from '../pages/auth/Unauthorized';
import AdminDashboard from '../pages/admin/Dashboard';
import StaffDashboard from '../pages/staff/Dashboard';
import Staff from '../pages/admin/Staff';
import Students from '../pages/admin/Students';
import Classes from '../pages/admin/Classes';
import Assignments from '../pages/admin/Assignments';
import StaffAttendance from '../pages/staff/Attendance';
import StaffHistory from '../pages/staff/History';
import AdminAttendance from '../pages/admin/Attendance';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root path: Redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['super_admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            
            <Route path="staff" element={<Staff />} />
            <Route path="students" element={<Students />} />
            <Route path="classes" element={<Classes />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="reports" element={<div className="bg-white p-6 rounded-2xl border border-slate-200"><h2 className="text-lg font-bold text-slate-800">Reports Center</h2><p className="text-sm text-slate-400 mt-1">Analytical spreadsheets and visual charts coming in Phase 4.</p></div>} />
            <Route path="sms-logs" element={<div className="bg-white p-6 rounded-2xl border border-slate-200"><h2 className="text-lg font-bold text-slate-800">SMS Outbox Logs</h2><p className="text-sm text-slate-400 mt-1">Parent notification status registry coming in Phase 4.</p></div>} />
          </Route>
        </Route>
      </Route>

      {/* Protected Staff Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['staff']} />}>
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            
            <Route path="attendance/:classId" element={<StaffAttendance />} />
            <Route path="attendance" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="history" element={<StaffHistory />} />
            <Route path="reports" element={<div className="bg-white p-6 rounded-2xl border border-slate-200"><h2 className="text-lg font-bold text-slate-800">Faculty Reports</h2><p className="text-sm text-slate-400 mt-1">Classroom metric summaries coming in Phase 4.</p></div>} />
          </Route>
        </Route>
      </Route>

      {/* Error state routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/not-found" element={<NotFound />} />
      
      {/* Catch all fallback */}
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
